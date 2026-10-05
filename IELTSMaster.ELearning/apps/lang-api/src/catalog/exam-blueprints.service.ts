import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ExamBlueprintItem } from '@lang/shared';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../common/database-errors';
import { Exam } from '../exams/exam.entity';
import {
  compareText,
  findOwned,
  findVisible,
  isVisibleTo,
  ownedBy,
  type CatalogOwner,
} from './catalog-scope';
import type {
  CreateExamBlueprintDto,
  ExamModuleInputDto,
  UpdateExamBlueprintDto,
} from './dto/exam-blueprint.dto';
import { ExamBlueprint } from './exam-blueprint.entity';
import { compareCategories, toExamBlueprintItem } from './catalog.mapper';
import { Category } from './category.entity';
import { ExamModule } from './exam-module.entity';

const BLUEPRINT_NOT_FOUND = 'Không tìm thấy loại đề';
const CODE_TAKEN = 'Mã loại đề đã tồn tại';
const CATEGORY_NOT_FOUND = 'Danh mục không tồn tại';
const CATEGORY_INACTIVE = 'Danh mục đã ngừng dùng, hãy chọn danh mục khác';
const MODULE_NOT_FOUND = 'Module không thuộc loại đề này, hãy tải lại trang';
const BLUEPRINT_IN_USE =
  'Loại đề đang có đề thi sử dụng, chỉ có thể ngừng dùng thay vì xoá';
const BLUEPRINT_UNAVAILABLE = 'Loại đề không tồn tại';
const BLUEPRINT_INACTIVE = 'Loại đề đã ngừng dùng, hãy chọn loại đề khác';
const BLUEPRINT_CATEGORY_INACTIVE =
  'Danh mục của loại đề đã ngừng dùng, hãy chọn loại đề khác';

/** Loại đề chọn được cho đề thi, kèm module theo thứ tự. */
export interface UsableBlueprint {
  blueprint: ExamBlueprint;
  category: Category;
  modules: ExamModule[];
}

/**
 * Loại đề kèm module cho 2 phạm vi (xem `CategoriesService`). Loại đề hệ
 * thống chỉ thuộc danh mục hệ thống; loại đề tenant thuộc danh mục hệ thống
 * hoặc của chính tenant. Module lưu cùng loại đề trong 1 transaction.
 */
@Injectable()
export class ExamBlueprintsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ExamBlueprint)
    private readonly blueprints: Repository<ExamBlueprint>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(ExamModule)
    private readonly modules: Repository<ExamModule>,
    @InjectRepository(Exam)
    private readonly exams: Repository<Exam>,
  ) {}

  /** Mục hệ thống trước; theo danh mục rồi tên loại đề. */
  async list(owner: CatalogOwner): Promise<ExamBlueprintItem[]> {
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
    const examCounts = await this.countExams(owner, ids);
    return blueprints.map((blueprint) =>
      toExamBlueprintItem(
        blueprint,
        categories.get(blueprint.categoryId)!,
        modules.filter((module) => module.blueprintId === blueprint.id),
        examCounts.get(blueprint.id) ?? 0,
      ),
    );
  }

  /**
   * Loại đề tenant chọn được khi tạo/đổi loại đề của đề thi: nhìn thấy được,
   * còn dùng và danh mục còn dùng (400 nếu không).
   */
  async findUsable(
    tenantId: string,
    id: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<UsableBlueprint> {
    const blueprint = await manager
      .getRepository(ExamBlueprint)
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
      .getRepository(ExamModule)
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
    dto: CreateExamBlueprintDto,
  ): Promise<ExamBlueprintItem> {
    assertDistinctModuleCodes(dto.modules);
    if (dto.modules.some((module) => module.id !== undefined)) {
      throw new BadRequestException(MODULE_NOT_FOUND);
    }
    const id = await this.onCodeConflict(() =>
      this.dataSource.transaction(async (manager) => {
        await resolveCategory(manager, owner, dto.categoryId);
        await assertCodeAvailable(manager, owner, dto.code);
        const repository = manager.getRepository(ExamBlueprint);
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
    dto: UpdateExamBlueprintDto,
  ): Promise<ExamBlueprintItem> {
    if (dto.modules) assertDistinctModuleCodes(dto.modules);
    await this.onCodeConflict(() =>
      this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(ExamBlueprint);
        const blueprint = await findOwned(
          repository,
          owner,
          id,
          BLUEPRINT_NOT_FOUND,
        );
        const changes: Partial<ExamBlueprint> = { updatedBy: actorId };
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
            .getRepository(ExamModule)
            .findBy({ blueprintId: id });
          await saveModules(manager, id, current, dto.modules);
        }
        // Luôn ghi để `updated_by`/`updated_at` đổi cả khi chỉ sửa module.
        await repository.update(id, changes);
      }),
    );
    return this.getItem(owner, id);
  }

  /** Xoá cứng kèm module (CASCADE). Đề thi tham chiếu loại đề chặn bằng FK RESTRICT. */
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
  ): Promise<ExamBlueprintItem> {
    const blueprint = await this.blueprints.findOneBy({ id });
    const category = blueprint
      ? await this.categories.findOneBy({ id: blueprint.categoryId })
      : null;
    if (!blueprint || !category || !isVisibleTo(blueprint, owner)) {
      throw new NotFoundException(BLUEPRINT_NOT_FOUND);
    }
    return toExamBlueprintItem(
      blueprint,
      category,
      await this.modules.findBy({ blueprintId: id }),
      (await this.countExams(owner, [id])).get(id) ?? 0,
    );
  }

  /** Số đề theo loại đề, kể cả đề đã xoá mềm (vẫn chặn xoá bằng khoá ngoại). */
  private async countExams(
    owner: CatalogOwner,
    blueprintIds: string[],
  ): Promise<Map<string, number>> {
    if (blueprintIds.length === 0) return new Map();
    const query = this.exams
      .createQueryBuilder('exam')
      .withDeleted()
      .select('exam.blueprintId', 'blueprintId')
      .addSelect('COUNT(*)::int', 'count')
      .where('exam.blueprintId IN (:...blueprintIds)', { blueprintIds })
      .groupBy('exam.blueprintId');
    if (owner !== null) query.andWhere('exam.tenantId = :owner', { owner });
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
    .getRepository(ExamBlueprint)
    .existsBy({ tenantId: ownedBy(owner), code });
  if (taken) throw new ConflictException(CODE_TAKEN);
}

function assertDistinctModuleCodes(modules: ExamModuleInputDto[]): void {
  const seen = new Set<string>();
  for (const module of modules) {
    if (seen.has(module.code)) {
      throw new BadRequestException(`Mã module bị trùng: ${module.code}`);
    }
    seen.add(module.code);
  }
}

/**
 * Thay danh sách module: module cũ không còn trong danh sách bị xoá, có `id`
 * thì sửa, không có thì thêm; `sort_order` theo vị trí. Unique (blueprint, code)
 * kiểm cuối transaction nên đổi chéo mã giữa các module được.
 */
async function saveModules(
  manager: EntityManager,
  blueprintId: string,
  current: ExamModule[],
  inputs: ExamModuleInputDto[],
): Promise<void> {
  const repository = manager.getRepository(ExamModule);
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
      referenceDurationMinutes: input.referenceDurationMinutes,
      description: input.description ?? null,
    };
    if (input.id === undefined) {
      await repository.save(repository.create({ blueprintId, ...values }));
    } else {
      await repository.update(input.id, values);
    }
  }
}
