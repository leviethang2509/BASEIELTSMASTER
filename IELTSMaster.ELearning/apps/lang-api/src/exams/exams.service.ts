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
  EXAM_TITLE_MAX_LENGTH,
  ExamSectionStatus,
  ExamStatus,
  type ExamDetail,
  type ExamListItem,
  type ExamUserRef,
} from '@lang/shared';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { toSkipTake, type Paginated } from '../common/pagination';
import { escapeLike } from '../common/sql';
import { ExamBlueprint } from '../catalog/exam-blueprint.entity';
import { ExamBlueprintsService } from '../catalog/exam-blueprints.service';
import { Category } from '../catalog/category.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { assertExamNotInUse } from '../training/content-usage';
import { User } from '../users/user.entity';
import type {
  CreateExamDto,
  ListExamsQueryDto,
  UpdateExamDto,
} from './dto/exam.dto';
import { ExamSection } from './exam-section.entity';
import {
  bySortOrder,
  canEditExam,
  toExamListItem,
  toExamSectionItem,
  type SectionStats,
} from './exam.mapper';
import { Exam } from './exam.entity';
import {
  emptySectionContent,
  hasContentErrors,
  insertPreparedSections,
  prepareSection,
  sectionIssues,
} from './section-content';

export const EXAM_NOT_FOUND = 'Không tìm thấy đề thi';
const EDIT_FORBIDDEN = 'Bạn chỉ sửa được đề do mình tạo';
const ALREADY_PUBLISHED = 'Đề đã được publish';
const NOT_PUBLISHED = 'Chỉ lưu trữ được đề đang publish';
const CLONE_FORBIDDEN =
  'Chỉ nhân bản được đề đã publish hoặc đề bạn có quyền sửa';
export const CONTENT_HAS_ERRORS =
  'Đề còn lỗi nội dung, hãy sửa hết lỗi trong bảng kiểm tra';

/** Đề thuộc tenant, chưa xoá; khoá dòng khi đọc trong transaction ghi. */
export async function findExam(
  manager: EntityManager,
  tenantId: string,
  id: string,
  lock = false,
): Promise<Exam> {
  const exam = await manager.getRepository(Exam).findOne({
    where: { id, tenantId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });
  if (!exam) throw new NotFoundException(EXAM_NOT_FOUND);
  return exam;
}

export function assertCanEditExam(
  ctx: TenantContext,
  actorId: string,
  exam: Exam,
): void {
  if (!canEditExam(ctx, actorId, exam)) {
    throw new ForbiddenException(EDIT_FORBIDDEN);
  }
}

/** Section của version hiện tại, theo thứ tự. */
export async function currentSections(
  manager: EntityManager,
  exam: Exam,
): Promise<ExamSection[]> {
  const sections = await manager.getRepository(ExamSection).findBy({
    examId: exam.id,
    version: exam.currentVersion,
    status: ExamSectionStatus.ACTIVE,
  });
  return sections.sort(bySortOrder);
}

/**
 * Đề thi của tenant (Step 12): danh sách, tạo từ loại đề, metadata, publish /
 * lưu trữ / xoá. Nội dung và version ở `ExamContentService`. Mọi thành viên
 * soạn đề (Owner/Admin/Teacher) xem được mọi đề; sửa theo `canEditExam`.
 */
@Injectable()
export class ExamsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly blueprintsService: ExamBlueprintsService,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(ExamSection)
    private readonly sections: Repository<ExamSection>,
    @InjectRepository(ExamBlueprint)
    private readonly blueprints: Repository<ExamBlueprint>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(
    ctx: TenantContext,
    actorId: string,
    query: ListExamsQueryDto,
  ): Promise<Paginated<ExamListItem>> {
    const { skip, take } = toSkipTake(query);
    const qb = this.exams
      .createQueryBuilder('exam')
      .innerJoin('exam.blueprint', 'blueprint')
      .where('exam.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .orderBy('exam.updatedAt', 'DESC')
      .addOrderBy('exam.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.q) {
      qb.andWhere('exam.title ILIKE :q', { q: `%${escapeLike(query.q)}%` });
    }
    if (query.status) {
      qb.andWhere('exam.status = :status', { status: query.status });
    }
    if (query.blueprintId) {
      qb.andWhere('exam.blueprintId = :blueprintId', {
        blueprintId: query.blueprintId,
      });
    }
    if (query.categoryId) {
      qb.andWhere('blueprint.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.createdBy) {
      qb.andWhere('exam.createdBy = :createdBy', {
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

  /** Người đã tạo đề trong tenant (bộ lọc "Người tạo"). */
  async creators(ctx: TenantContext): Promise<ExamUserRef[]> {
    const rows = await this.exams
      .createQueryBuilder('exam')
      .innerJoin('exam.creator', 'creator')
      .select('creator.id', 'id')
      .addSelect('creator.fullName', 'fullName')
      .where('exam.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .groupBy('creator.id')
      .addGroupBy('creator.fullName')
      .orderBy('creator.fullName', 'ASC')
      .getRawMany<ExamUserRef>();
    return rows;
  }

  /** Tạo đề nháp version 1, mỗi module của loại đề thành một section trống. */
  async create(
    ctx: TenantContext,
    actorId: string,
    dto: CreateExamDto,
  ): Promise<ExamDetail> {
    const id = await this.dataSource.transaction(async (manager) => {
      const { modules } = await this.blueprintsService.findUsable(
        ctx.tenantId,
        dto.blueprintId,
        manager,
      );
      const repository = manager.getRepository(Exam);
      const exam = await repository.save(
        repository.create({
          tenantId: ctx.tenantId,
          blueprintId: dto.blueprintId,
          title: dto.title,
          description: dto.description ?? null,
          status: ExamStatus.DRAFT,
          visibility: dto.visibility ?? ContentVisibility.TENANT,
          currentVersion: 1,
          contentRevision: 1,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const prepared = modules.map((module, sortOrder) =>
        prepareSection(
          {
            moduleId: module.id,
            name: module.name,
            durationMinutes: module.referenceDurationMinutes,
            rawData: emptySectionContent(),
          },
          { examId: exam.id, version: 1, sortOrder, createdBy: actorId },
        ),
      );
      await insertPreparedSections(manager, prepared);
      return exam.id;
    });
    return this.getDetail(ctx, actorId, id);
  }

  async getDetail(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<ExamDetail> {
    const manager = this.dataSource.manager;
    const exam = await findExam(manager, ctx.tenantId, id);
    const [sections, hasAttempts] = await Promise.all([
      currentSections(manager, exam),
      this.attempts.existsBy({
        examId: exam.id,
        examVersion: exam.currentVersion,
      }),
    ]);
    const [item] = await this.toListItems(ctx, actorId, [exam], sections);
    const savedAt = sections.reduce(
      (latest, section) =>
        section.createdAt > latest ? section.createdAt : latest,
      exam.createdAt,
    );
    return {
      ...item,
      contentRevision: exam.contentRevision,
      contentSavedAt: savedAt.toISOString(),
      hasAttempts,
      sections: sections.map(toExamSectionItem),
    };
  }

  /** Sửa tên, mô tả, loại đề. Section giữ nguyên, không tạo version. */
  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdateExamDto,
  ): Promise<ExamDetail> {
    await this.dataSource.transaction(async (manager) => {
      const exam = await findExam(manager, ctx.tenantId, id, true);
      assertCanEditExam(ctx, actorId, exam);
      const changes: Partial<Exam> = { updatedBy: actorId };
      if (
        dto.blueprintId !== undefined &&
        dto.blueprintId !== exam.blueprintId
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
      await manager.getRepository(Exam).update(id, changes);
    });
    return this.getDetail(ctx, actorId, id);
  }

  /**
   * Nhân bản đề (R4): đề đã publish, hoặc đề mình sửa được (kể cả nháp/lưu
   * trữ) → đề nháp mới của người nhân bản, version 1 chép nội dung version hiện
   * tại (media dùng chung URL), giữ loại đề và hiển thị; không chép bài làm,
   * lịch sử version.
   */
  async clone(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<ExamDetail> {
    const cloneId = await this.dataSource.transaction(async (manager) => {
      // Khoá chia sẻ: không chạy song song với lần lưu nội dung đề gốc.
      const source = await manager.getRepository(Exam).findOne({
        where: { id, tenantId: ctx.tenantId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!source) throw new NotFoundException(EXAM_NOT_FOUND);
      if (
        source.status !== ExamStatus.PUBLISHED &&
        !canEditExam(ctx, actorId, source)
      ) {
        throw new ForbiddenException(CLONE_FORBIDDEN);
      }
      const sections = await currentSections(manager, source);

      const repository = manager.getRepository(Exam);
      const exam = await repository.save(
        repository.create({
          tenantId: ctx.tenantId,
          blueprintId: source.blueprintId,
          title: cloneTitle(source.title),
          description: source.description,
          status: ExamStatus.DRAFT,
          visibility: source.visibility,
          clonedFromId: source.id,
          currentVersion: 1,
          contentRevision: 1,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      const prepared = sections.map((section, sortOrder) =>
        prepareSection(
          {
            moduleId: section.moduleId,
            name: section.name,
            durationMinutes: section.durationMinutes,
            rawData: section.rawData,
          },
          { examId: exam.id, version: 1, sortOrder, createdBy: actorId },
        ),
      );
      await insertPreparedSections(manager, prepared);
      return exam.id;
    });
    return this.getDetail(ctx, actorId, cloneId);
  }

  /** Nháp hoặc lưu trữ → publish, khi mọi section không còn lỗi (422). */
  async publish(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<ExamDetail> {
    await this.dataSource.transaction(async (manager) => {
      const exam = await findExam(manager, ctx.tenantId, id, true);
      assertCanEditExam(ctx, actorId, exam);
      if (exam.status === ExamStatus.PUBLISHED) {
        throw new ConflictException(ALREADY_PUBLISHED);
      }
      const issues = sectionIssues(await currentSections(manager, exam));
      if (hasContentErrors(issues)) {
        throw new UnprocessableEntityException({
          message: CONTENT_HAS_ERRORS,
          issues,
        });
      }
      await manager.getRepository(Exam).update(
        { id, status: exam.status },
        {
          status: ExamStatus.PUBLISHED,
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
  ): Promise<ExamDetail> {
    await this.dataSource.transaction(async (manager) => {
      const exam = await findExam(manager, ctx.tenantId, id, true);
      assertCanEditExam(ctx, actorId, exam);
      if (exam.status !== ExamStatus.PUBLISHED) {
        throw new ConflictException(NOT_PUBLISHED);
      }
      await manager
        .getRepository(Exam)
        .update(
          { id, status: ExamStatus.PUBLISHED },
          { status: ExamStatus.ARCHIVED, updatedBy: actorId },
        );
    });
    return this.getDetail(ctx, actorId, id);
  }

  /**
   * Đề đang nằm trong giáo trình → 409 (chỉ lưu trữ được). Đề đã có bài làm
   * (mọi version) thì xoá mềm, chưa có thì xoá hẳn.
   */
  async remove(ctx: TenantContext, actorId: string, id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const exam = await findExam(manager, ctx.tenantId, id, true);
      assertCanEditExam(ctx, actorId, exam);
      await assertExamNotInUse(manager, id);
      const repository = manager.getRepository(Exam);
      const hasAttempts = await manager
        .getRepository(ExamAttempt)
        .existsBy({ examId: id });
      if (hasAttempts) {
        await repository.update(id, { updatedBy: actorId });
        await repository.softDelete(id);
      } else {
        await repository.delete({ id });
      }
    });
  }

  /** Thông tin đề như dòng danh sách (không kèm nội dung). */
  async summarize(
    ctx: TenantContext,
    actorId: string,
    exam: Exam,
  ): Promise<ExamListItem> {
    const [item] = await this.toListItems(ctx, actorId, [exam]);
    return item;
  }

  /** Dòng danh sách của nhiều đề (tải loại đề, danh mục, số liệu section theo lô). */
  async toListItems(
    ctx: TenantContext,
    actorId: string,
    exams: Exam[],
    knownSections?: readonly SectionStats[],
  ): Promise<ExamListItem[]> {
    if (exams.length === 0) return [];
    const blueprintIds = [...new Set(exams.map((exam) => exam.blueprintId))];
    const creatorIds = [
      ...new Set(
        exams.flatMap((exam) => (exam.createdBy ? [exam.createdBy] : [])),
      ),
    ];
    const sourceIds = [
      ...new Set(
        exams.flatMap((exam) => (exam.clonedFromId ? [exam.clonedFromId] : [])),
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
              examId: true,
              version: true,
              status: true,
              durationMinutes: true,
              questionCount: true,
            },
            where: {
              examId: In(exams.map((exam) => exam.id)),
              status: ExamSectionStatus.ACTIVE,
            },
          }),
      sourceIds.length > 0
        ? this.exams.find({
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

    return exams.map((exam) => {
      const blueprint = blueprintById.get(exam.blueprintId)!;
      return toExamListItem(exam, {
        blueprint,
        category: categoryById.get(blueprint.categoryId)!,
        sections:
          knownSections ??
          (sections ?? []).filter(
            (section) =>
              section.examId === exam.id &&
              section.version === exam.currentVersion,
          ),
        creator: exam.createdBy ? userById.get(exam.createdBy) : undefined,
        clonedFrom: exam.clonedFromId
          ? sourceById.get(exam.clonedFromId)
          : undefined,
        canEdit: canEditExam(ctx, actorId, exam),
      });
    });
  }
}

/** Tên bản nhân bản: thêm hậu tố, cắt bớt tên gốc cho vừa độ dài tối đa. */
export function cloneTitle(title: string): string {
  const room = EXAM_TITLE_MAX_LENGTH - CLONE_TITLE_SUFFIX.length;
  return `${title.slice(0, room).trimEnd()}${CLONE_TITLE_SUFFIX}`;
}
