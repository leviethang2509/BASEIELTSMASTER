import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ExamSectionStatus,
  ExamStatus,
  type ExamDetail,
  type ExamVersionDetail,
  type ExamVersionList,
} from '@lang/shared';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';
import type { RestoreExamVersionDto, SaveExamContentDto } from './dto/exam.dto';
import { ExamSection } from './exam-section.entity';
import { bySortOrder, sum, toExamSectionItem, toUserRef } from './exam.mapper';
import { Exam } from './exam.entity';
import {
  CONTENT_HAS_ERRORS,
  ExamsService,
  assertCanEditExam,
  findExam,
} from './exams.service';
import {
  assertSectionShapes,
  hasContentErrors,
  insertPreparedSections,
  prepareSection,
  sectionIssues,
  type SectionDraft,
} from './section-content';

const REVISION_CONFLICT =
  'Nội dung đề vừa được lưu ở nơi khác (tab khác hoặc người khác). Hãy tải lại trang để lấy bản mới nhất';
const VERSION_NOT_FOUND = 'Không tìm thấy version';
const ALREADY_CURRENT = 'Version này đang là version hiện tại';

/**
 * Lưu nội dung đề và version (plan mục 4.6). Version hiện tại đã có bài làm
 * (kể cả đang làm) thì giữ lại, section mới thành version kế tiếp; chưa có thì
 * xoá section cũ và tạo lại trong cùng version. Khôi phục version k = lưu lại
 * nội dung version k theo đúng quy tắc đó.
 */
@Injectable()
export class ExamContentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly examsService: ExamsService,
    @InjectRepository(ExamSection)
    private readonly sections: Repository<ExamSection>,
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async save(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: SaveExamContentDto,
  ): Promise<ExamDetail> {
    const drafts: SectionDraft[] = dto.sections.map((section) => ({
      moduleId: section.moduleId ?? null,
      name: section.name,
      durationMinutes: section.durationMinutes,
      rawData: section.rawData,
    }));
    assertSectionShapes(drafts);
    await this.dataSource.transaction(async (manager) => {
      const exam = await findExam(manager, ctx.tenantId, id, true);
      assertCanEditExam(ctx, actorId, exam);
      assertRevision(exam, dto.baseRevision);
      await replaceContent(manager, exam, actorId, drafts);
    });
    return this.examsService.getDetail(ctx, actorId, id);
  }

  async restore(
    ctx: TenantContext,
    actorId: string,
    id: string,
    version: number,
    dto: RestoreExamVersionDto,
  ): Promise<ExamDetail> {
    await this.dataSource.transaction(async (manager) => {
      const exam = await findExam(manager, ctx.tenantId, id, true);
      assertCanEditExam(ctx, actorId, exam);
      assertRevision(exam, dto.baseRevision);
      if (version === exam.currentVersion) {
        throw new BadRequestException(ALREADY_CURRENT);
      }
      const source = await manager
        .getRepository(ExamSection)
        .findBy({ examId: id, version });
      if (source.length === 0) throw new NotFoundException(VERSION_NOT_FOUND);
      await replaceContent(
        manager,
        exam,
        actorId,
        source.sort(bySortOrder).map((section) => ({
          moduleId: section.moduleId,
          name: section.name,
          durationMinutes: section.durationMinutes,
          rawData: section.rawData,
        })),
      );
    });
    return this.examsService.getDetail(ctx, actorId, id);
  }

  async listVersions(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<ExamVersionList> {
    const manager = this.dataSource.manager;
    const exam = await findExam(manager, ctx.tenantId, id);
    const [sections, attemptRows, summary] = await Promise.all([
      this.sections.find({
        select: {
          id: true,
          version: true,
          durationMinutes: true,
          questionCount: true,
          createdBy: true,
          createdAt: true,
        },
        where: { examId: id },
      }),
      this.attempts
        .createQueryBuilder('attempt')
        .select('attempt.examVersion', 'version')
        .addSelect('COUNT(*)::int', 'count')
        .where('attempt.examId = :id', { id })
        .groupBy('attempt.examVersion')
        .getRawMany<{ version: number; count: number }>(),
      this.examsService.summarize(ctx, actorId, exam),
    ]);

    const byVersion = new Map<number, ExamSection[]>();
    for (const section of sections) {
      byVersion.set(section.version, [
        ...(byVersion.get(section.version) ?? []),
        section,
      ]);
    }
    const creatorIds = [
      ...new Set(
        sections.flatMap((section) =>
          section.createdBy ? [section.createdBy] : [],
        ),
      ),
    ];
    const users = new Map(
      (creatorIds.length > 0
        ? await this.users.findBy({ id: In(creatorIds) })
        : []
      ).map((user) => [user.id, user]),
    );
    const attemptCounts = new Map(
      attemptRows.map((row) => [row.version, row.count]),
    );

    return {
      exam: summary,
      contentRevision: exam.contentRevision,
      hasAttempts: (attemptCounts.get(exam.currentVersion) ?? 0) > 0,
      items: [...byVersion.entries()]
        .sort(([a], [b]) => b - a)
        .map(([version, rows]) => {
          const savedAt = rows.reduce(
            (latest, row) => (row.createdAt > latest ? row.createdAt : latest),
            rows[0].createdAt,
          );
          const creatorId = rows.find((row) => row.createdBy)?.createdBy;
          return {
            version,
            isCurrent: version === exam.currentVersion,
            savedAt: savedAt.toISOString(),
            savedBy: toUserRef(creatorId ? users.get(creatorId) : undefined),
            sectionCount: rows.length,
            questionCount: sum(rows.map((row) => row.questionCount)),
            totalDurationMinutes: sum(rows.map((row) => row.durationMinutes)),
            attemptCount: attemptCounts.get(version) ?? 0,
          };
        }),
    };
  }

  async getVersion(
    ctx: TenantContext,
    id: string,
    version: number,
  ): Promise<ExamVersionDetail> {
    const exam = await findExam(this.dataSource.manager, ctx.tenantId, id);
    const sections = await this.sections.findBy({ examId: id, version });
    if (sections.length === 0) throw new NotFoundException(VERSION_NOT_FOUND);
    return {
      version,
      isCurrent: version === exam.currentVersion,
      sections: sections.sort(bySortOrder).map(toExamSectionItem),
    };
  }
}

function assertRevision(exam: Exam, baseRevision: number): void {
  if (exam.contentRevision !== baseRevision) {
    throw new ConflictException(REVISION_CONFLICT);
  }
}

/** Thuật toán Save (plan 4.6); `exam` đã khoá trong transaction. */
async function replaceContent(
  manager: EntityManager,
  exam: Exam,
  actorId: string,
  drafts: readonly SectionDraft[],
): Promise<void> {
  // Đề học viên đang thấy (hoặc sẽ publish lại) không được lưu nội dung lỗi.
  if (exam.status !== ExamStatus.DRAFT) {
    const issues = sectionIssues(drafts);
    if (hasContentErrors(issues)) {
      throw new UnprocessableEntityException({
        message: CONTENT_HAS_ERRORS,
        issues,
      });
    }
  }

  const sections = manager.getRepository(ExamSection);
  const current = { examId: exam.id, version: exam.currentVersion };
  const hasAttempts = await manager
    .getRepository(ExamAttempt)
    .existsBy({ examId: exam.id, examVersion: exam.currentVersion });
  let version = exam.currentVersion;
  if (hasAttempts) {
    await sections.update(current, { status: ExamSectionStatus.DEACTIVATED });
    version += 1;
  } else {
    // exam_parts / exam_questions xoá theo (ON DELETE CASCADE).
    await sections.delete(current);
  }

  const prepared = drafts.map((draft, sortOrder) =>
    prepareSection(draft, {
      examId: exam.id,
      version,
      sortOrder,
      createdBy: actorId,
    }),
  );
  await insertPreparedSections(manager, prepared);
  await manager.getRepository(Exam).update(exam.id, {
    currentVersion: version,
    contentRevision: exam.contentRevision + 1,
    updatedBy: actorId,
  });
}
