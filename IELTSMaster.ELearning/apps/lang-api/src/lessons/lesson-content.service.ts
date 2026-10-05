import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessonSectionStatus,
  LessonStatus,
  type LessonDetail,
  type LessonVersionDetail,
  type LessonVersionList,
} from '@lang/shared';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';
import { bySortOrder, sum, toUserRef } from '../exams/exam.mapper';
import {
  assertSectionShapes,
  hasContentErrors,
  sectionIssues,
} from '../exams/section-content';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';
import type {
  RestoreLessonVersionDto,
  SaveLessonContentDto,
} from './dto/lesson.dto';
import { LessonAttemptLookup } from './lesson-attempt-lookup';
import {
  LESSON_VALIDATE_OPTIONS,
  insertPreparedLessonSections,
  prepareLessonSection,
  type LessonSectionDraft,
} from './lesson-section-content';
import { LessonSection } from './lesson-section.entity';
import { toLessonSectionItem } from './lesson.mapper';
import { Lesson } from './lesson.entity';
import {
  LESSON_CONTENT_HAS_ERRORS,
  LessonsService,
  assertCanEditLesson,
  findLesson,
} from './lessons.service';

const REVISION_CONFLICT =
  'Nội dung bài học vừa được lưu ở nơi khác (tab khác hoặc người khác). Hãy tải lại trang để lấy bản mới nhất';
const VERSION_NOT_FOUND = 'Không tìm thấy version';
const ALREADY_CURRENT = 'Version này đang là version hiện tại';

/**
 * Lưu nội dung bài học và version, chép `ExamContentService`. Version hiện
 * tại đã có lượt học thì giữ lại, section mới thành version kế tiếp; chưa có
 * thì xoá section cũ và tạo lại trong cùng version. Khôi phục version k = lưu
 * lại nội dung version k theo đúng quy tắc đó.
 */
@Injectable()
export class LessonContentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly lessonsService: LessonsService,
    private readonly attemptLookup: LessonAttemptLookup,
    @InjectRepository(LessonSection)
    private readonly sections: Repository<LessonSection>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async save(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: SaveLessonContentDto,
  ): Promise<LessonDetail> {
    const drafts: LessonSectionDraft[] = dto.sections.map((section) => ({
      moduleId: section.moduleId ?? null,
      name: section.name,
      rawData: section.rawData,
    }));
    assertSectionShapes(drafts);
    await this.dataSource.transaction(async (manager) => {
      const lesson = await findLesson(manager, ctx.tenantId, id, true);
      assertCanEditLesson(ctx, actorId, lesson);
      assertRevision(lesson, dto.baseRevision);
      await this.replaceContent(manager, lesson, actorId, drafts);
    });
    return this.lessonsService.getDetail(ctx, actorId, id);
  }

  async restore(
    ctx: TenantContext,
    actorId: string,
    id: string,
    version: number,
    dto: RestoreLessonVersionDto,
  ): Promise<LessonDetail> {
    await this.dataSource.transaction(async (manager) => {
      const lesson = await findLesson(manager, ctx.tenantId, id, true);
      assertCanEditLesson(ctx, actorId, lesson);
      assertRevision(lesson, dto.baseRevision);
      if (version === lesson.currentVersion) {
        throw new BadRequestException(ALREADY_CURRENT);
      }
      const source = await manager
        .getRepository(LessonSection)
        .findBy({ lessonId: id, version });
      if (source.length === 0) throw new NotFoundException(VERSION_NOT_FOUND);
      await this.replaceContent(
        manager,
        lesson,
        actorId,
        source.sort(bySortOrder).map((section) => ({
          moduleId: section.moduleId,
          name: section.name,
          rawData: section.rawData,
        })),
      );
    });
    return this.lessonsService.getDetail(ctx, actorId, id);
  }

  async listVersions(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<LessonVersionList> {
    const lesson = await findLesson(this.dataSource.manager, ctx.tenantId, id);
    const [sections, attemptCounts, summary] = await Promise.all([
      this.sections.find({
        select: {
          id: true,
          version: true,
          questionCount: true,
          createdBy: true,
          createdAt: true,
        },
        where: { lessonId: id },
      }),
      this.attemptLookup.countByVersion(id),
      this.lessonsService.summarize(ctx, actorId, lesson),
    ]);

    const byVersion = new Map<number, LessonSection[]>();
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

    return {
      lesson: summary,
      contentRevision: lesson.contentRevision,
      hasAttempts: (attemptCounts.get(lesson.currentVersion) ?? 0) > 0,
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
            isCurrent: version === lesson.currentVersion,
            savedAt: savedAt.toISOString(),
            savedBy: toUserRef(creatorId ? users.get(creatorId) : undefined),
            sectionCount: rows.length,
            questionCount: sum(rows.map((row) => row.questionCount)),
            attemptCount: attemptCounts.get(version) ?? 0,
          };
        }),
    };
  }

  async getVersion(
    ctx: TenantContext,
    id: string,
    version: number,
  ): Promise<LessonVersionDetail> {
    const lesson = await findLesson(this.dataSource.manager, ctx.tenantId, id);
    const sections = await this.sections.findBy({ lessonId: id, version });
    if (sections.length === 0) throw new NotFoundException(VERSION_NOT_FOUND);
    return {
      version,
      isCurrent: version === lesson.currentVersion,
      sections: sections.sort(bySortOrder).map(toLessonSectionItem),
    };
  }

  /** Thuật toán Save như đề thi; `lesson` đã khoá trong transaction. */
  private async replaceContent(
    manager: EntityManager,
    lesson: Lesson,
    actorId: string,
    drafts: readonly LessonSectionDraft[],
  ): Promise<void> {
    // Bài học viên đang thấy (hoặc sẽ publish lại) không được lưu nội dung lỗi.
    if (lesson.status !== LessonStatus.DRAFT) {
      const issues = sectionIssues(drafts, LESSON_VALIDATE_OPTIONS);
      if (hasContentErrors(issues)) {
        throw new UnprocessableEntityException({
          message: LESSON_CONTENT_HAS_ERRORS,
          issues,
        });
      }
    }

    const sections = manager.getRepository(LessonSection);
    const current = { lessonId: lesson.id, version: lesson.currentVersion };
    let version = lesson.currentVersion;
    if (
      await this.attemptLookup.hasAttempts(
        manager,
        lesson.id,
        lesson.currentVersion,
      )
    ) {
      await sections.update(current, {
        status: LessonSectionStatus.DEACTIVATED,
      });
      version += 1;
    } else {
      // lesson_parts / lesson_questions xoá theo (ON DELETE CASCADE).
      await sections.delete(current);
    }

    const prepared = drafts.map((draft, sortOrder) =>
      prepareLessonSection(draft, {
        lessonId: lesson.id,
        version,
        sortOrder,
        createdBy: actorId,
      }),
    );
    await insertPreparedLessonSections(manager, prepared);
    await manager.getRepository(Lesson).update(lesson.id, {
      currentVersion: version,
      contentRevision: lesson.contentRevision + 1,
      updatedBy: actorId,
    });
  }
}

function assertRevision(lesson: Lesson, baseRevision: number): void {
  if (lesson.contentRevision !== baseRevision) {
    throw new ConflictException(REVISION_CONFLICT);
  }
}
