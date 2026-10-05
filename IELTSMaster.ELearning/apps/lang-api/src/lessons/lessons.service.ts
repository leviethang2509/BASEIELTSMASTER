import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CLONE_TITLE_SUFFIX,
  ContentVisibility,
  LESSON_TITLE_MAX_LENGTH,
  LessonSectionStatus,
  LessonStatus,
  type ExamUserRef,
  type LessonDetail,
  type LessonListItem,
} from '@lang/shared';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';
import { Category } from '../catalog/category.entity';
import { LessonBlueprint } from '../catalog/lesson-blueprint.entity';
import { LessonBlueprintsService } from '../catalog/lesson-blueprints.service';
import { toSkipTake, type Paginated } from '../common/pagination';
import { escapeLike } from '../common/sql';
import { bySortOrder } from '../exams/exam.mapper';
import {
  emptySectionContent,
  hasContentErrors,
  sectionIssues,
} from '../exams/section-content';
import type { TenantContext } from '../tenants/tenant-context';
import { assertLessonNotInUse } from '../training/content-usage';
import { User } from '../users/user.entity';
import type {
  CreateLessonDto,
  ListLessonsQueryDto,
  UpdateLessonDto,
} from './dto/lesson.dto';
import { LessonAttemptLookup } from './lesson-attempt-lookup';
import {
  LESSON_VALIDATE_OPTIONS,
  insertPreparedLessonSections,
  prepareLessonSection,
} from './lesson-section-content';
import { LessonSection } from './lesson-section.entity';
import {
  canEditLesson,
  toLessonListItem,
  toLessonSectionItem,
  type LessonSectionStats,
} from './lesson.mapper';
import { Lesson } from './lesson.entity';

export const LESSON_NOT_FOUND = 'Không tìm thấy bài học';
const EDIT_FORBIDDEN = 'Bạn chỉ sửa được bài học do mình tạo';
const ALREADY_PUBLISHED = 'Bài học đã được publish';
const NOT_PUBLISHED = 'Chỉ lưu trữ được bài học đang publish';
const CLONE_FORBIDDEN =
  'Chỉ nhân bản được bài học đã publish hoặc bài học bạn có quyền sửa';
export const LESSON_CONTENT_HAS_ERRORS =
  'Bài học còn lỗi nội dung, hãy sửa hết lỗi trong bảng kiểm tra';

/** Bài học thuộc tenant, chưa xoá; khoá dòng khi đọc trong transaction ghi. */
export async function findLesson(
  manager: EntityManager,
  tenantId: string,
  id: string,
  lock = false,
): Promise<Lesson> {
  const lesson = await manager.getRepository(Lesson).findOne({
    where: { id, tenantId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });
  if (!lesson) throw new NotFoundException(LESSON_NOT_FOUND);
  return lesson;
}

export function assertCanEditLesson(
  ctx: TenantContext,
  actorId: string,
  lesson: Lesson,
): void {
  if (!canEditLesson(ctx, actorId, lesson)) {
    throw new ForbiddenException(EDIT_FORBIDDEN);
  }
}

/** Section của version hiện tại, theo thứ tự. */
export async function currentLessonSections(
  manager: EntityManager,
  lesson: Lesson,
): Promise<LessonSection[]> {
  const sections = await manager.getRepository(LessonSection).findBy({
    lessonId: lesson.id,
    version: lesson.currentVersion,
    status: LessonSectionStatus.ACTIVE,
  });
  return sections.sort(bySortOrder);
}

/**
 * Bài học của tenant (req-3 Step 4), chép `ExamsService`: danh sách, tạo từ
 * mẫu bài học, metadata + hiển thị, nhân bản, publish / lưu trữ / xoá. Nội
 * dung và version ở `LessonContentService`. Owner/Admin/Teacher xem được mọi
 * bài; sửa theo `canEditLesson`.
 */
@Injectable()
export class LessonsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly blueprintsService: LessonBlueprintsService,
    private readonly attemptLookup: LessonAttemptLookup,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(LessonSection)
    private readonly sections: Repository<LessonSection>,
    @InjectRepository(LessonBlueprint)
    private readonly blueprints: Repository<LessonBlueprint>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(
    ctx: TenantContext,
    actorId: string,
    query: ListLessonsQueryDto,
  ): Promise<Paginated<LessonListItem>> {
    const { skip, take } = toSkipTake(query);
    const qb = this.lessons
      .createQueryBuilder('lesson')
      .innerJoin('lesson.blueprint', 'blueprint')
      .where('lesson.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .orderBy('lesson.updatedAt', 'DESC')
      .addOrderBy('lesson.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.q) {
      qb.andWhere('lesson.title ILIKE :q', { q: `%${escapeLike(query.q)}%` });
    }
    if (query.status) {
      qb.andWhere('lesson.status = :status', { status: query.status });
    }
    if (query.blueprintId) {
      qb.andWhere('lesson.blueprintId = :blueprintId', {
        blueprintId: query.blueprintId,
      });
    }
    if (query.categoryId) {
      qb.andWhere('blueprint.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.createdBy) {
      qb.andWhere('lesson.createdBy = :createdBy', {
        createdBy: query.createdBy,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: await this.toListItems(ctx, actorId, rows),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Người đã tạo bài học trong tenant (bộ lọc "Người tạo"). */
  async creators(ctx: TenantContext): Promise<ExamUserRef[]> {
    return this.lessons
      .createQueryBuilder('lesson')
      .innerJoin('lesson.creator', 'creator')
      .select('creator.id', 'id')
      .addSelect('creator.fullName', 'fullName')
      .where('lesson.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .groupBy('creator.id')
      .addGroupBy('creator.fullName')
      .orderBy('creator.fullName', 'ASC')
      .getRawMany<ExamUserRef>();
  }

  /** Tạo bài nháp version 1, mỗi phần của mẫu bài học thành một section trống. */
  async create(
    ctx: TenantContext,
    actorId: string,
    dto: CreateLessonDto,
  ): Promise<LessonDetail> {
    const id = await this.dataSource.transaction(async (manager) => {
      const { modules } = await this.blueprintsService.findUsable(
        ctx.tenantId,
        dto.blueprintId,
        manager,
      );
      const repository = manager.getRepository(Lesson);
      const lesson = await repository.save(
        repository.create({
          tenantId: ctx.tenantId,
          blueprintId: dto.blueprintId,
          title: dto.title,
          description: dto.description ?? null,
          status: LessonStatus.DRAFT,
          visibility: dto.visibility ?? ContentVisibility.PRIVATE,
          currentVersion: 1,
          contentRevision: 1,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const prepared = modules.map((module, sortOrder) =>
        prepareLessonSection(
          {
            moduleId: module.id,
            name: module.name,
            rawData: emptySectionContent(),
          },
          { lessonId: lesson.id, version: 1, sortOrder, createdBy: actorId },
        ),
      );
      await insertPreparedLessonSections(manager, prepared);
      return lesson.id;
    });
    return this.getDetail(ctx, actorId, id);
  }

  async getDetail(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<LessonDetail> {
    const manager = this.dataSource.manager;
    const lesson = await findLesson(manager, ctx.tenantId, id);
    const [sections, hasAttempts] = await Promise.all([
      currentLessonSections(manager, lesson),
      this.attemptLookup.hasAttempts(manager, lesson.id, lesson.currentVersion),
    ]);
    const [item] = await this.toListItems(ctx, actorId, [lesson], sections);
    const savedAt = sections.reduce(
      (latest, section) =>
        section.createdAt > latest ? section.createdAt : latest,
      lesson.createdAt,
    );
    return {
      ...item,
      contentRevision: lesson.contentRevision,
      contentSavedAt: savedAt.toISOString(),
      hasAttempts,
      sections: sections.map(toLessonSectionItem),
    };
  }

  /** Sửa tên, mô tả, mẫu bài học, hiển thị. Section giữ nguyên, không tạo version. */
  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdateLessonDto,
  ): Promise<LessonDetail> {
    await this.dataSource.transaction(async (manager) => {
      const lesson = await findLesson(manager, ctx.tenantId, id, true);
      assertCanEditLesson(ctx, actorId, lesson);
      const changes: Partial<Lesson> = { updatedBy: actorId };
      if (
        dto.blueprintId !== undefined &&
        dto.blueprintId !== lesson.blueprintId
      ) {
        await this.blueprintsService.findUsable(
          ctx.tenantId,
          dto.blueprintId,
          manager,
        );
        changes.blueprintId = dto.blueprintId;
      }
      if (dto.title !== undefined) changes.title = dto.title;
      if (dto.description !== undefined) changes.description = dto.description;
      if (dto.visibility !== undefined) changes.visibility = dto.visibility;
      await manager.getRepository(Lesson).update(id, changes);
    });
    return this.getDetail(ctx, actorId, id);
  }

  /**
   * Nhân bản (A11, R4): bài đã publish, hoặc bài mình sửa được (kể cả nháp/lưu
   * trữ) → bài nháp mới của người nhân bản, version 1 chép nội dung version
   * hiện tại (media dùng chung URL), giữ mẫu bài học và hiển thị; không chép
   * lượt học, lịch sử version.
   */
  async clone(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<LessonDetail> {
    const cloneId = await this.dataSource.transaction(async (manager) => {
      // Khoá chia sẻ: không chạy song song với lần lưu nội dung bài gốc.
      const source = await manager.getRepository(Lesson).findOne({
        where: { id, tenantId: ctx.tenantId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!source) throw new NotFoundException(LESSON_NOT_FOUND);
      if (
        source.status !== LessonStatus.PUBLISHED &&
        !canEditLesson(ctx, actorId, source)
      ) {
        throw new ForbiddenException(CLONE_FORBIDDEN);
      }
      const sections = await currentLessonSections(manager, source);

      const repository = manager.getRepository(Lesson);
      const lesson = await repository.save(
        repository.create({
          tenantId: ctx.tenantId,
          blueprintId: source.blueprintId,
          title: cloneLessonTitle(source.title),
          description: source.description,
          status: LessonStatus.DRAFT,
          visibility: source.visibility,
          clonedFromId: source.id,
          currentVersion: 1,
          contentRevision: 1,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const prepared = sections.map((section, sortOrder) =>
        prepareLessonSection(
          {
            moduleId: section.moduleId,
            name: section.name,
            rawData: section.rawData,
          },
          { lessonId: lesson.id, version: 1, sortOrder, createdBy: actorId },
        ),
      );
      await insertPreparedLessonSections(manager, prepared);
      return lesson.id;
    });
    return this.getDetail(ctx, actorId, cloneId);
  }

  /** Nháp hoặc lưu trữ → publish, khi mọi section không còn lỗi (422). */
  async publish(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<LessonDetail> {
    await this.dataSource.transaction(async (manager) => {
      const lesson = await findLesson(manager, ctx.tenantId, id, true);
      assertCanEditLesson(ctx, actorId, lesson);
      if (lesson.status === LessonStatus.PUBLISHED) {
        throw new ConflictException(ALREADY_PUBLISHED);
      }
      const issues = sectionIssues(
        await currentLessonSections(manager, lesson),
        LESSON_VALIDATE_OPTIONS,
      );
      if (hasContentErrors(issues)) {
        throw new UnprocessableEntityException({
          message: LESSON_CONTENT_HAS_ERRORS,
          issues,
        });
      }
      await manager.getRepository(Lesson).update(
        { id, status: lesson.status },
        {
          status: LessonStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedBy: actorId,
        },
      );
    });
    return this.getDetail(ctx, actorId, id);
  }

  async archive(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<LessonDetail> {
    await this.dataSource.transaction(async (manager) => {
      const lesson = await findLesson(manager, ctx.tenantId, id, true);
      assertCanEditLesson(ctx, actorId, lesson);
      if (lesson.status !== LessonStatus.PUBLISHED) {
        throw new ConflictException(NOT_PUBLISHED);
      }
      await manager
        .getRepository(Lesson)
        .update(
          { id, status: LessonStatus.PUBLISHED },
          { status: LessonStatus.ARCHIVED, updatedBy: actorId },
        );
    });
    return this.getDetail(ctx, actorId, id);
  }

  /**
   * Bài đang nằm trong giáo trình → 409 (chỉ lưu trữ được). Bài đã có lượt học
   * (mọi version) thì xoá mềm, chưa có thì xoá hẳn.
   */
  async remove(ctx: TenantContext, actorId: string, id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const lesson = await findLesson(manager, ctx.tenantId, id, true);
      assertCanEditLesson(ctx, actorId, lesson);
      await assertLessonNotInUse(manager, id);
      const repository = manager.getRepository(Lesson);
      if (await this.attemptLookup.hasAttempts(manager, id)) {
        await repository.update(id, { updatedBy: actorId });
        await repository.softDelete(id);
      } else {
        await repository.delete({ id });
      }
    });
  }

  /** Thông tin bài học như dòng danh sách (không kèm nội dung). */
  async summarize(
    ctx: TenantContext,
    actorId: string,
    lesson: Lesson,
  ): Promise<LessonListItem> {
    const [item] = await this.toListItems(ctx, actorId, [lesson]);
    return item;
  }

  /** Dòng danh sách của nhiều bài (tải mẫu, danh mục, số liệu section theo lô). */
  async toListItems(
    ctx: TenantContext,
    actorId: string,
    lessons: Lesson[],
    knownSections?: readonly LessonSectionStats[],
  ): Promise<LessonListItem[]> {
    if (lessons.length === 0) return [];
    const blueprintIds = [...new Set(lessons.map((row) => row.blueprintId))];
    const creatorIds = [
      ...new Set(
        lessons.flatMap((row) => (row.createdBy ? [row.createdBy] : [])),
      ),
    ];
    const sourceIds = [
      ...new Set(
        lessons.flatMap((row) => (row.clonedFromId ? [row.clonedFromId] : [])),
      ),
    ];
    const [blueprints, users, sections, sources] = await Promise.all([
      this.blueprints.findBy({ id: In(blueprintIds) }),
      creatorIds.length > 0
        ? this.users.findBy({ id: In(creatorIds) })
        : Promise.resolve([]),
      knownSections
        ? Promise.resolve(null)
        : this.sections.find({
            select: {
              id: true,
              lessonId: true,
              version: true,
              status: true,
              questionCount: true,
            },
            where: {
              lessonId: In(lessons.map((row) => row.id)),
              status: LessonSectionStatus.ACTIVE,
            },
          }),
      sourceIds.length > 0
        ? this.lessons.find({
            select: { id: true, title: true },
            where: { id: In(sourceIds) },
            withDeleted: true,
          })
        : Promise.resolve([]),
    ]);
    const sourceById = new Map(sources.map((row) => [row.id, row]));
    const categories = await this.categories.findBy({
      id: In([...new Set(blueprints.map((row) => row.categoryId))]),
    });
    const blueprintById = new Map(blueprints.map((row) => [row.id, row]));
    const categoryById = new Map(categories.map((row) => [row.id, row]));
    const userById = new Map(users.map((row) => [row.id, row]));

    return lessons.map((lesson) => {
      const blueprint = blueprintById.get(lesson.blueprintId)!;
      return toLessonListItem(lesson, {
        blueprint,
        category: categoryById.get(blueprint.categoryId)!,
        sections:
          knownSections ??
          (sections ?? []).filter(
            (section) =>
              section.lessonId === lesson.id &&
              section.version === lesson.currentVersion,
          ),
        creator: lesson.createdBy ? userById.get(lesson.createdBy) : undefined,
        clonedFrom: lesson.clonedFromId
          ? sourceById.get(lesson.clonedFromId)
          : undefined,
        canEdit: canEditLesson(ctx, actorId, lesson),
      });
    });
  }
}

/** Tên bản nhân bản: thêm hậu tố, cắt bớt tên gốc cho vừa độ dài tối đa. */
export function cloneLessonTitle(title: string): string {
  const room = LESSON_TITLE_MAX_LENGTH - CLONE_TITLE_SUFFIX.length;
  return `${title.slice(0, room).trimEnd()}${CLONE_TITLE_SUFFIX}`;
}
