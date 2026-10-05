import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  type CategoryItem,
} from '@lang/shared';
import { IsNull, type Repository } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../common/database-errors';
import {
  findOwned,
  findVisible,
  ownedBy,
  type CatalogOwner,
} from './catalog-scope';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { ExamBlueprint } from './exam-blueprint.entity';
import { compareCategories, toCategoryItem } from './catalog.mapper';
import { Category } from './category.entity';
import { LessonBlueprint } from './lesson-blueprint.entity';
import { Course } from '../training/course.entity';

const CATEGORY_NOT_FOUND = 'Không tìm thấy danh mục';
const CODE_TAKEN = 'Mã danh mục đã tồn tại';
const CATEGORY_IN_USE =
  'Danh mục đang có loại đề, mẫu bài học hoặc khoá học, chỉ có thể ngừng dùng thay vì xoá';

/** Loại đề và mẫu bài học: dòng có phạm vi thuộc một danh mục. */
interface CategorizedRow {
  id: string;
  tenantId: string | null;
  categoryId: string;
}

/**
 * Danh mục cho 2 phạm vi: hệ thống (`owner = null`, System Owner/Admin) và
 * tenant (Tenant Owner/Admin sửa, Teacher chỉ xem). Quyền theo role kiểm ở
 * controller; service kiểm phạm vi dữ liệu.
 */
@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(ExamBlueprint)
    private readonly examBlueprints: Repository<ExamBlueprint>,
    @InjectRepository(LessonBlueprint)
    private readonly lessonBlueprints: Repository<LessonBlueprint>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
  ) {}

  async list(owner: CatalogOwner): Promise<CategoryItem[]> {
    const categories = (await findVisible(this.categories, owner)).sort(
      compareCategories,
    );
    const [examCounts, lessonCounts, courseCounts] = await Promise.all([
      countByCategory(this.examBlueprints, owner),
      countByCategory(this.lessonBlueprints, owner),
      this.countCourses(owner),
    ]);
    return categories.map((category) =>
      toCategoryItem(category, {
        examBlueprintCount: examCounts.get(category.id) ?? 0,
        lessonBlueprintCount: lessonCounts.get(category.id) ?? 0,
        courseCount: courseCounts.get(category.id) ?? 0,
      }),
    );
  }

  async create(
    owner: CatalogOwner,
    actorId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryItem> {
    await this.assertCodeAvailable(owner, dto.code);
    const category = await this.saveOrConflict(
      this.categories.create({
        tenantId: owner,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        icon: dto.icon ?? DEFAULT_CATEGORY_ICON,
        color: dto.color ?? DEFAULT_CATEGORY_COLOR,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
    return toCategoryItem(category, {
      examBlueprintCount: 0,
      lessonBlueprintCount: 0,
      courseCount: 0,
    });
  }

  async update(
    owner: CatalogOwner,
    actorId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryItem> {
    const category = await findOwned(
      this.categories,
      owner,
      id,
      CATEGORY_NOT_FOUND,
    );
    const changes: Partial<Category> = {};
    if (dto.code !== undefined && dto.code !== category.code) {
      await this.assertCodeAvailable(owner, dto.code);
      changes.code = dto.code;
    }
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.icon !== undefined) changes.icon = dto.icon;
    if (dto.color !== undefined) changes.color = dto.color;
    if (dto.sortOrder !== undefined) changes.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) changes.isActive = dto.isActive;

    if (Object.keys(changes).length > 0) {
      try {
        await this.categories.update(id, { ...changes, updatedBy: actorId });
      } catch (error) {
        if (isUniqueViolation(error)) throw new ConflictException(CODE_TAKEN);
        throw error;
      }
    }
    const updated = await this.categories.findOneBy({ id });
    return toCategoryItem(updated ?? { ...category, ...changes }, {
      examBlueprintCount: await countInCategory(this.examBlueprints, owner, id),
      lessonBlueprintCount: await countInCategory(
        this.lessonBlueprints,
        owner,
        id,
      ),
      courseCount: (await this.countCourses(owner, id)).get(id) ?? 0,
    });
  }

  /**
   * Xoá cứng khi chưa loại đề, mẫu bài học hay khoá học nào (kể cả của tenant)
   * thuộc danh mục.
   */
  async remove(owner: CatalogOwner, id: string): Promise<void> {
    await findOwned(this.categories, owner, id, CATEGORY_NOT_FOUND);
    const [hasExam, hasLesson, hasCourse] = await Promise.all([
      this.examBlueprints.existsBy({ categoryId: id }),
      this.lessonBlueprints.existsBy({ categoryId: id }),
      this.courses.existsBy({ categoryId: id }),
    ]);
    if (hasExam || hasLesson || hasCourse) {
      throw new ConflictException(CATEGORY_IN_USE);
    }
    try {
      await this.categories.delete({ id });
    } catch (error) {
      // Loại đề/mẫu vừa được tạo trong danh mục ngay sau lúc kiểm tra (FK RESTRICT).
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(CATEGORY_IN_USE);
      }
      throw error;
    }
  }

  /**
   * Số khoá học theo danh mục: trang hệ thống đếm khoá học mọi tenant, tenant
   * đếm khoá học của mình.
   */
  private async countCourses(
    owner: CatalogOwner,
    categoryId?: string,
  ): Promise<Map<string, number>> {
    const rows = await this.courses.find({
      select: { id: true, categoryId: true },
      where: {
        ...(owner === null ? {} : { tenantId: owner }),
        ...(categoryId ? { categoryId } : {}),
      },
    });
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.categoryId) {
        counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
      }
    }
    return counts;
  }

  private async assertCodeAvailable(
    owner: CatalogOwner,
    code: string,
  ): Promise<void> {
    const taken = await this.categories.existsBy({
      tenantId: ownedBy(owner),
      code,
    });
    if (taken) throw new ConflictException(CODE_TAKEN);
  }

  private async saveOrConflict(category: Category): Promise<Category> {
    try {
      return await this.categories.save(category);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(CODE_TAKEN);
      throw error;
    }
  }
}

/**
 * Số dòng theo danh mục. Trang hệ thống đếm mọi dòng (kể cả của tenant: danh
 * mục đó không xoá được); tenant đếm dòng hệ thống + của mình.
 */
async function countByCategory(
  repository: Repository<CategorizedRow>,
  owner: CatalogOwner,
): Promise<Map<string, number>> {
  const rows =
    owner === null
      ? await repository.find()
      : await findVisible(repository, owner);
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
  }
  return counts;
}

/** Cùng cách đếm với `countByCategory`, cho 1 danh mục. */
async function countInCategory(
  repository: Repository<CategorizedRow>,
  owner: CatalogOwner,
  categoryId: string,
): Promise<number> {
  if (owner === null) return repository.countBy({ categoryId });
  const [system, own] = await Promise.all([
    repository.countBy({ categoryId, tenantId: IsNull() }),
    repository.countBy({ categoryId, tenantId: owner }),
  ]);
  return system + own;
}
