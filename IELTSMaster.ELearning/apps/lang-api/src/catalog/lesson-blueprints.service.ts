import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { LessonBlueprintItem } from '@lang/shared';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../common/database-errors';
import {
  compareText,
  findOwned,
  findVisible,
  isVisibleTo,
  ownedBy,
  type CatalogOwner,
} from './catalog-scope';
import { Lesson } from '../lessons/lesson.entity';
import { compareCategories, toLessonBlueprintItem } from './catalog.mapper';
import { Category } from './category.entity';
import type {
  CreateLessonBlueprintDto,
  LessonModuleInputDto,
  UpdateLessonBlueprintDto,
} from './dto/lesson-blueprint.dto';
import { LessonBlueprint } from './lesson-blueprint.entity';
import { LessonModule } from './lesson-module.entity';

const BLUEPRINT_NOT_FOUND = 'Không tìm thấy mẫu bài học';
const CODE_TAKEN = 'Mã mẫu bài học đã tồn tại';
const CATEGORY_NOT_FOUND = 'Danh mục không tồn tại';
const CATEGORY_INACTIVE = 'Danh mục đã ngừng dùng, hãy chọn danh mục khác';
const MODULE_NOT_FOUND = 'Phần không thuộc mẫu bài học này, hãy tải lại trang';
const BLUEPRINT_IN_USE =
  'Mẫu bài học đang có bài học sử dụng, chỉ có thể ngừng dùng thay vì xoá';
const BLUEPRINT_UNAVAILABLE = 'Mẫu bài học không tồn tại';
const BLUEPRINT_INACTIVE = 'Mẫu bài học đã ngừng dùng, hãy chọn mẫu khác';
const BLUEPRINT_CATEGORY_INACTIVE =
  'Danh mục của mẫu bài học đã ngừng dùng, hãy chọn mẫu khác';

/** Mẫu bài học chọn được cho bài học, kèm phần theo thứ tự. */
export interface UsableLessonBlueprint {
  blueprint: LessonBlueprint;
  category: Category;
  modules: LessonModule[];
}

/**
 * Mẫu bài học kèm phần (module) cho 2 phạm vi, chép từ `ExamBlueprintsService`
 * (bài học tách hẳn đề thi, req-3 A1) nhưng phần không có thời lượng. Mẫu hệ
 * thống chỉ thuộc danh mục hệ thống; mẫu tenant thuộc danh mục hệ thống hoặc
 * của chính tenant. Phần lưu cùng mẫu trong 1 transaction.
 */
@Injectable()
export class LessonBlueprintsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(LessonBlueprint)
    private readonly blueprints: Repository<LessonBlueprint>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(LessonModule)
    private readonly modules: Repository<LessonModule>,
    @InjectRepository(Lesson)
    private readonly lessons: Repository<Lesson>,
  ) {}

  /** Mục hệ thống trước; theo danh mục rồi tên mẫu. */
  async list(owner: CatalogOwner): Promise<LessonBlueprintItem[]> {
    const categories = new Map(
      (await findVisible(this.categories, owner)).map((category) => [
        category.id,
        category,
      ]),
    );
    const blueprints = (await findVisible(this.blueprints, owner))
      .filter((blueprint) => categories.has(blueprint.categoryId))
      .sort(
        (a, b) =>
          Number(a.tenantId !== null) - Number(b.tenantId !== null) ||
          compareCategories(
            categories.get(a.categoryId)!,
            categories.get(b.categoryId)!,
          ) ||
          compareText(a.name, b.name),
      );
    const ids = blueprints.map((blueprint) => blueprint.id);
    const modules =
      ids.length > 0 ? await this.modules.findBy({ blueprintId: In(ids) }) : [];
    const lessonCounts = await this.countLessons(owner, ids);
    return blueprints.map((blueprint) =>
      toLessonBlueprintItem(
        blueprint,
        categories.get(blueprint.categoryId)!,
        modules.filter((module) => module.blueprintId === blueprint.id),
        lessonCounts.get(blueprint.id) ?? 0,
      ),
    );
  }

  /**
   * Mẫu tenant chọn được khi tạo/đổi mẫu của bài học: nhìn thấy được, còn dùng
   * và danh mục còn dùng (400 nếu không).
   */
  async findUsable(
    tenantId: string,
    id: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<UsableLessonBlueprint> {
    const blueprint = await manager
      .getRepository(LessonBlueprint)
      .findOneBy({ id });
    if (!blueprint || !isVisibleTo(blueprint, tenantId)) {
      throw new BadRequestException(BLUEPRINT_UNAVAILABLE);
    }
    if (!blueprint.isActive) throw new BadRequestException(BLUEPRINT_INACTIVE);
    const category = await manager
      .getRepository(Category)
      .findOneBy({ id: blueprint.categoryId });
    if (!category) throw new BadRequestException(BLUEPRINT_UNAVAILABLE);
    if (!category.isActive) {
      throw new BadRequestException(BLUEPRINT_CATEGORY_INACTIVE);
    }
    const modules = await manager
      .getRepository(LessonModule)
      .findBy({ blueprintId: id });
    return {
      blueprint,
      category,
      modules: modules.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  async create(
    owner: CatalogOwner,
    actorId: string,
    dto: CreateLessonBlueprintDto,
  ): Promise<LessonBlueprintItem> {
    assertDistinctModuleCodes(dto.modules);
    if (dto.modules.some((module) => module.id !== undefined)) {
      throw new BadRequestException(MODULE_NOT_FOUND);
    }
    const id = await this.onCodeConflict(() =>
      this.dataSource.transaction(async (manager) => {
        await resolveCategory(manager, owner, dto.categoryId);
        await assertCodeAvailable(manager, owner, dto.code);
        const repository = manager.getRepository(LessonBlueprint);
        const blueprint = await repository.save(
          repository.create({
            tenantId: owner,
            categoryId: dto.categoryId,
            code: dto.code,
            name: dto.name,
            description: dto.description ?? null,
            isActive: dto.isActive ?? true,
            createdBy: actorId,
            updatedBy: actorId,
          }),
        );
        await saveModules(manager, blueprint.id, [], dto.modules);
        return blueprint.id;
      }),
    );
    return this.getItem(owner, id);
  }

  async update(
    owner: CatalogOwner,
    actorId: string,
    id: string,
    dto: UpdateLessonBlueprintDto,
  ): Promise<LessonBlueprintItem> {
    if (dto.modules) assertDistinctModuleCodes(dto.modules);
    await this.onCodeConflict(() =>
      this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(LessonBlueprint);
        const blueprint = await findOwned(
          repository,
          owner,
          id,
          BLUEPRINT_NOT_FOUND,
        );
        const changes: Partial<LessonBlueprint> = { updatedBy: actorId };
        // Danh mục cũ đã ngừng dùng vẫn giữ được; chỉ kiểm khi đổi danh mục.
        if (
          dto.categoryId !== undefined &&
          dto.categoryId !== blueprint.categoryId
        ) {
          await resolveCategory(manager, owner, dto.categoryId);
          changes.categoryId = dto.categoryId;
        }
        if (dto.code !== undefined && dto.code !== blueprint.code) {
          await assertCodeAvailable(manager, owner, dto.code);
          changes.code = dto.code;
        }
        if (dto.name !== undefined) changes.name = dto.name;
        if (dto.description !== undefined) {
          changes.description = dto.description;
        }
        if (dto.isActive !== undefined) changes.isActive = dto.isActive;

        if (dto.modules) {
          const current = await manager
            .getRepository(LessonModule)
            .findBy({ blueprintId: id });
          await saveModules(manager, id, current, dto.modules);
        }
        // Luôn ghi để `updated_by`/`updated_at` đổi cả khi chỉ sửa phần.
        await repository.update(id, changes);
      }),
    );
    return this.getItem(owner, id);
  }

  /** Xoá cứng kèm phần (CASCADE). Bài học tham chiếu mẫu chặn bằng khoá ngoại. */
  async remove(owner: CatalogOwner, id: string): Promise<void> {
    await findOwned(this.blueprints, owner, id, BLUEPRINT_NOT_FOUND);
    try {
      await this.blueprints.delete({ id });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(BLUEPRINT_IN_USE);
      }
      throw error;
    }
  }

  private async getItem(
    owner: CatalogOwner,
    id: string,
  ): Promise<LessonBlueprintItem> {
    const blueprint = await this.blueprints.findOneBy({ id });
    const category = blueprint
      ? await this.categories.findOneBy({ id: blueprint.categoryId })
      : null;
    if (!blueprint || !category || !isVisibleTo(blueprint, owner)) {
      throw new NotFoundException(BLUEPRINT_NOT_FOUND);
    }
    return toLessonBlueprintItem(
      blueprint,
      category,
      await this.modules.findBy({ blueprintId: id }),
      (await this.countLessons(owner, [id])).get(id) ?? 0,
    );
  }

  /** Số bài học theo mẫu, kể cả bài đã xoá mềm (vẫn chặn xoá mẫu bằng khoá ngoại). */
  private async countLessons(
    owner: CatalogOwner,
    blueprintIds: string[],
  ): Promise<Map<string, number>> {
    if (blueprintIds.length === 0) return new Map();
    const query = this.lessons
      .createQueryBuilder('lesson')
      .withDeleted()
      .select('lesson.blueprintId', 'blueprintId')
      .addSelect('COUNT(*)::int', 'count')
      .where('lesson.blueprintId IN (:...blueprintIds)', { blueprintIds })
      .groupBy('lesson.blueprintId');
    if (owner !== null) query.andWhere('lesson.tenantId = :owner', { owner });
    const rows = await query.getRawMany<{
      blueprintId: string;
      count: number;
    }>();
    return new Map(rows.map((row) => [row.blueprintId, row.count]));
  }

  private async onCodeConflict<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(CODE_TAKEN);
      throw error;
    }
  }
}

/** Danh mục chủ sở hữu nhìn thấy và còn dùng được. */
async function resolveCategory(
  manager: EntityManager,
  owner: CatalogOwner,
  categoryId: string,
): Promise<Category> {
  const category = await manager
    .getRepository(Category)
    .findOneBy({ id: categoryId });
  if (!category || !isVisibleTo(category, owner)) {
    throw new BadRequestException(CATEGORY_NOT_FOUND);
  }
  if (!category.isActive) throw new BadRequestException(CATEGORY_INACTIVE);
  return category;
}

async function assertCodeAvailable(
  manager: EntityManager,
  owner: CatalogOwner,
  code: string,
): Promise<void> {
  const taken = await manager
    .getRepository(LessonBlueprint)
    .existsBy({ tenantId: ownedBy(owner), code });
  if (taken) throw new ConflictException(CODE_TAKEN);
}

function assertDistinctModuleCodes(modules: LessonModuleInputDto[]): void {
  const seen = new Set<string>();
  for (const module of modules) {
    if (seen.has(module.code)) {
      throw new BadRequestException(`Mã phần bị trùng: ${module.code}`);
    }
    seen.add(module.code);
  }
}

/**
 * Thay danh sách phần: phần cũ không còn trong danh sách bị xoá, có `id` thì
 * sửa, không có thì thêm; `sort_order` theo vị trí. Unique (blueprint, code)
 * kiểm cuối transaction nên đổi chéo mã giữa các phần được.
 */
async function saveModules(
  manager: EntityManager,
  blueprintId: string,
  current: LessonModule[],
  inputs: LessonModuleInputDto[],
): Promise<void> {
  const repository = manager.getRepository(LessonModule);
  const currentIds = new Set(current.map((module) => module.id));
  const keptIds = new Set<string>();
  for (const input of inputs) {
    if (input.id === undefined) continue;
    if (!currentIds.has(input.id) || keptIds.has(input.id)) {
      throw new BadRequestException(MODULE_NOT_FOUND);
    }
    keptIds.add(input.id);
  }

  const removed = current
    .filter((module) => !keptIds.has(module.id))
    .map((module) => module.id);
  if (removed.length > 0) await repository.delete({ id: In(removed) });

  for (const [sortOrder, input] of inputs.entries()) {
    const values = {
      name: input.name,
      code: input.code,
      sortOrder,
      description: input.description ?? null,
    };
    if (input.id === undefined) {
      await repository.save(repository.create({ blueprintId, ...values }));
    } else {
      await repository.update(input.id, values);
    }
  }
}
