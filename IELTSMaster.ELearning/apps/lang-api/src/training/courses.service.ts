import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CourseStatus,
  type CourseDetail,
  type CourseListItem,
} from '@lang/shared';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';
import { isVisibleTo } from '../catalog/catalog-scope';
import { Classroom } from '../classrooms/classroom.entity';
import { toCategoryRef } from '../catalog/catalog.mapper';
import { Category } from '../catalog/category.entity';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../common/database-errors';
import { toSkipTake, type Paginated } from '../common/pagination';
import { escapeLike } from '../common/sql';
import type { TenantContext } from '../tenants/tenant-context';
import { CurriculaService, findCurriculum } from './curricula.service';
import { CourseCurriculum } from './course-curriculum.entity';
import { Course } from './course.entity';
import { Curriculum } from './curriculum.entity';
import type {
  CreateCourseDto,
  ListCoursesQueryDto,
  UpdateCourseDto,
} from './dto/course.dto';
import { toCourseListItem } from './training.mapper';

export const COURSE_NOT_FOUND = 'Không tìm thấy khoá học';
const CODE_TAKEN = 'Mã khoá học đã tồn tại';
const CATEGORY_NOT_FOUND = 'Không tìm thấy danh mục';
const CATEGORY_INACTIVE = 'Danh mục đã ngừng dùng';
const ALREADY_ATTACHED = 'Giáo trình đã được gắn vào khoá học này';
const NOT_ATTACHED = 'Giáo trình chưa được gắn vào khoá học này';
const HAS_CLASSES = 'Khoá học đã có lớp học, chỉ lưu trữ được, không xoá được';

/** Khoá học thuộc tenant; khoá dòng khi đọc trong transaction ghi. */
export async function findCourse(
  manager: EntityManager,
  tenantId: string,
  id: string,
  lock = false,
): Promise<Course> {
  const course = await manager.getRepository(Course).findOne({
    where: { id, tenantId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });
  if (!course) throw new NotFoundException(COURSE_NOT_FOUND);
  return course;
}

/**
 * Khoá học của tenant (req-3 Step 6, B1–B4). Quyền theo role ở controller:
 * Owner/Admin quản lý, gắn/bỏ giáo trình; Teacher chỉ xem.
 */
@Injectable()
export class CoursesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly curriculaService: CurriculaService,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseCurriculum)
    private readonly links: Repository<CourseCurriculum>,
    @InjectRepository(Curriculum)
    private readonly curricula: Repository<Curriculum>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async list(
    ctx: TenantContext,
    query: ListCoursesQueryDto,
  ): Promise<Paginated<CourseListItem>> {
    const { skip, take } = toSkipTake(query);
    const qb = this.courses
      .createQueryBuilder('course')
      .where('course.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .orderBy('course.status', 'ASC')
      .addOrderBy('course.name', 'ASC')
      .addOrderBy('course.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.q) {
      qb.andWhere('(course.name ILIKE :q OR course.code ILIKE :q)', {
        q: `%${escapeLike(query.q)}%`,
      });
    }
    if (query.status) {
      qb.andWhere('course.status = :status', { status: query.status });
    }
    if (query.categoryId) {
      qb.andWhere('course.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: await this.toListItems(rows),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getDetail(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<CourseDetail> {
    const course = await findCourse(this.dataSource.manager, ctx.tenantId, id);
    const links = await this.links.findBy({ courseId: id });
    const curricula =
      links.length > 0
        ? await this.curricula.findBy({
            id: In(links.map((link) => link.curriculumId)),
          })
        : [];
    const [[item], curriculumItems] = await Promise.all([
      this.toListItems([course], links),
      this.curriculaService.toListItems(
        ctx,
        actorId,
        curricula.sort((a, b) => a.name.localeCompare(b.name, 'vi')),
      ),
    ]);
    return { ...item, curricula: curriculumItems };
  }

  async create(
    ctx: TenantContext,
    actorId: string,
    dto: CreateCourseDto,
  ): Promise<CourseDetail> {
    if (dto.categoryId) await this.resolveCategory(ctx, dto.categoryId);
    await this.assertCodeAvailable(ctx, dto.code);
    const course = await this.saveOrConflict(
      this.courses.create({
        tenantId: ctx.tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        categoryId: dto.categoryId ?? null,
        coverUrl: dto.coverUrl ?? null,
        level: dto.level ?? null,
        plannedSessions: dto.plannedSessions ?? null,
        status: CourseStatus.ACTIVE,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
    return this.getDetail(ctx, actorId, course.id);
  }

  /** Sửa thông tin, lưu trữ (`archived`) / dùng lại (`active`). */
  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdateCourseDto,
  ): Promise<CourseDetail> {
    const course = await findCourse(this.dataSource.manager, ctx.tenantId, id);
    const changes: Partial<Course> = {};
    if (dto.code !== undefined && dto.code !== course.code) {
      await this.assertCodeAvailable(ctx, dto.code);
      changes.code = dto.code;
    }
    if (dto.categoryId !== undefined && dto.categoryId !== course.categoryId) {
      if (dto.categoryId) await this.resolveCategory(ctx, dto.categoryId);
      changes.categoryId = dto.categoryId;
    }
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.coverUrl !== undefined) changes.coverUrl = dto.coverUrl;
    if (dto.level !== undefined) changes.level = dto.level;
    if (dto.plannedSessions !== undefined) {
      changes.plannedSessions = dto.plannedSessions;
    }
    if (dto.status !== undefined) changes.status = dto.status;
    if (Object.keys(changes).length > 0) {
      try {
        await this.courses.update(id, { ...changes, updatedBy: actorId });
      } catch (error) {
        if (isUniqueViolation(error)) throw new ConflictException(CODE_TAKEN);
        throw error;
      }
    }
    return this.getDetail(ctx, actorId, id);
  }

  /**
   * Xoá hẳn, chỉ bỏ gắn giáo trình (giáo trình giữ trong thư viện). Khoá học
   * đã có lớp thì chỉ lưu trữ được (B3).
   */
  async remove(ctx: TenantContext, id: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await findCourse(manager, ctx.tenantId, id, true);
        if (await manager.getRepository(Classroom).existsBy({ courseId: id })) {
          throw new ConflictException(HAS_CLASSES);
        }
        await manager.getRepository(Course).delete({ id });
      });
    } catch (error) {
      // Lớp vừa được tạo ngay sau lúc kiểm tra (FK NO ACTION).
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(HAS_CLASSES);
      }
      throw error;
    }
  }

  /** Gắn giáo trình tham khảo (chỉ Owner/Admin, R6). */
  async attachCurriculum(
    ctx: TenantContext,
    actorId: string,
    id: string,
    curriculumId: string,
  ): Promise<CourseDetail> {
    const manager = this.dataSource.manager;
    await findCourse(manager, ctx.tenantId, id);
    await findCurriculum(manager, ctx.tenantId, curriculumId);
    if (await this.links.existsBy({ courseId: id, curriculumId })) {
      throw new ConflictException(ALREADY_ATTACHED);
    }
    try {
      await this.links.insert(
        this.links.create({ courseId: id, curriculumId, createdBy: actorId }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(ALREADY_ATTACHED);
      }
      // Khoá học/giáo trình vừa bị xoá sau lúc kiểm tra.
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException(COURSE_NOT_FOUND);
      }
      throw error;
    }
    return this.getDetail(ctx, actorId, id);
  }

  async detachCurriculum(
    ctx: TenantContext,
    id: string,
    curriculumId: string,
  ): Promise<void> {
    await findCourse(this.dataSource.manager, ctx.tenantId, id);
    const { affected } = await this.links.delete({
      courseId: id,
      curriculumId,
    });
    if (!affected) throw new NotFoundException(NOT_ATTACHED);
  }

  private async toListItems(
    courses: Course[],
    knownLinks?: CourseCurriculum[],
  ): Promise<CourseListItem[]> {
    if (courses.length === 0) return [];
    const categoryIds = [
      ...new Set(courses.flatMap((row) => row.categoryId ?? [])),
    ];
    const courseIds = courses.map((row) => row.id);
    const [categories, links, classrooms] = await Promise.all([
      categoryIds.length > 0
        ? this.categories.findBy({ id: In(categoryIds) })
        : Promise.resolve([]),
      knownLinks ?? this.links.findBy({ courseId: In(courseIds) }),
      this.dataSource.manager.getRepository(Classroom).find({
        select: { id: true, courseId: true },
        where: { courseId: In(courseIds) },
      }),
    ]);
    const categoryById = new Map(categories.map((row) => [row.id, row]));
    return courses.map((course) => {
      const category = course.categoryId
        ? categoryById.get(course.categoryId)
        : undefined;
      return toCourseListItem(course, {
        category: category ? toCategoryRef(category) : null,
        curriculumCount: links.filter((link) => link.courseId === course.id)
          .length,
        classCount: classrooms.filter((row) => row.courseId === course.id)
          .length,
      });
    });
  }

  /** Danh mục hệ thống hoặc của tenant, còn dùng được. */
  private async resolveCategory(
    ctx: TenantContext,
    categoryId: string,
  ): Promise<void> {
    const category = await this.categories.findOneBy({ id: categoryId });
    if (!category || !isVisibleTo(category, ctx.tenantId)) {
      throw new BadRequestException(CATEGORY_NOT_FOUND);
    }
    if (!category.isActive) throw new BadRequestException(CATEGORY_INACTIVE);
  }

  private async assertCodeAvailable(
    ctx: TenantContext,
    code: string,
  ): Promise<void> {
    const taken = await this.courses.existsBy({ tenantId: ctx.tenantId, code });
    if (taken) throw new ConflictException(CODE_TAKEN);
  }

  private async saveOrConflict(course: Course): Promise<Course> {
    try {
      return await this.courses.save(course);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(CODE_TAKEN);
      throw error;
    }
  }
}
