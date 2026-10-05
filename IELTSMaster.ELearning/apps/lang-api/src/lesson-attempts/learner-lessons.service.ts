import {
  LessonStatus,
  ContentVisibility,
  type LearnerExamFilterOption,
  type LearnerLessonDetail,
  type LearnerLessonItem,
  type LearnerLessonList,
  type LessonAttemptItem,
  type LessonListItem,
} from '@lang/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, type Repository } from 'typeorm';
import { toSkipTake } from '../common/pagination';
import { escapeLike } from '../common/sql';
import { LessonSection } from '../lessons/lesson-section.entity';
import { Lesson } from '../lessons/lesson.entity';
import {
  LESSON_NOT_FOUND,
  LessonsService,
  currentLessonSections,
} from '../lessons/lessons.service';
import type { TenantContext } from '../tenants/tenant-context';
import type { ListLearnerLessonsQueryDto } from './dto/lesson-attempt.dto';
import { LessonAttemptSection } from './lesson-attempt-section.entity';
import { LessonAttempt } from './lesson-attempt.entity';
import { canSubmitAttempt, isLessonOpen } from './lesson-attempts.service';

function toLearnerLessonItem(
  item: LessonListItem,
  attempt: LessonAttempt | undefined,
): LearnerLessonItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    blueprint: item.blueprint,
    sectionCount: item.sectionCount,
    questionCount: item.questionCount,
    publishedAt: item.publishedAt,
    myAttempt: attempt
      ? {
          attemptId: attempt.id,
          status: attempt.status,
          completedAt: attempt.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}

const byName = (a: LearnerExamFilterOption, b: LearnerExamFilterOption) =>
  a.name.localeCompare(b.name, 'vi');

/**
 * Bài học ở khu vực chính (req-3 Step 5): mọi thành viên tenant xem được bài
 * đang publish có hiển thị `tenant` và lượt học của chính mình. Bài không còn
 * mở chỉ xem được khi mình từng học.
 */
@Injectable()
export class LearnerLessonsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly lessonsService: LessonsService,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(LessonAttempt)
    private readonly attempts: Repository<LessonAttempt>,
    @InjectRepository(LessonAttemptSection)
    private readonly attemptSections: Repository<LessonAttemptSection>,
  ) {}

  async list(
    ctx: TenantContext,
    userId: string,
    query: ListLearnerLessonsQueryDto,
  ): Promise<LearnerLessonList> {
    const { skip, take } = toSkipTake(query);
    const qb = this.publishedQuery(ctx)
      .orderBy('lesson.publishedAt', 'DESC')
      .addOrderBy('lesson.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.q) {
      qb.andWhere('lesson.title ILIKE :q', { q: `%${escapeLike(query.q)}%` });
    }
    if (query.categoryId) {
      qb.andWhere('blueprint.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.blueprintId) {
      qb.andWhere('lesson.blueprintId = :blueprintId', {
        blueprintId: query.blueprintId,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    const [items, filters, attempts] = await Promise.all([
      this.lessonsService.toListItems(ctx, userId, rows),
      this.filterOptions(ctx),
      rows.length > 0
        ? this.attempts.findBy({
            tenantId: ctx.tenantId,
            userId,
            classItemId: IsNull(),
            lessonId: In(rows.map((row) => row.id)),
          })
        : Promise.resolve([]),
    ]);
    const versionOf = new Map(rows.map((row) => [row.id, row.currentVersion]));
    return {
      items: items.map((item) =>
        toLearnerLessonItem(
          item,
          attempts.find(
            (attempt) =>
              attempt.lessonId === item.id &&
              attempt.lessonVersion === versionOf.get(item.id),
          ),
        ),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
      ...filters,
    };
  }

  async detail(
    ctx: TenantContext,
    userId: string,
    id: string,
  ): Promise<LearnerLessonDetail> {
    const lesson = await this.lessons.findOne({
      where: { id, tenantId: ctx.tenantId },
      withDeleted: true,
    });
    if (!lesson) throw new NotFoundException(LESSON_NOT_FOUND);
    const attempts = (
      await this.attempts.findBy({
        tenantId: ctx.tenantId,
        lessonId: id,
        userId,
        classItemId: IsNull(),
      })
    ).sort((a, b) => b.lessonVersion - a.lessonVersion);
    // Bài `private` chỉ học qua lớp; lượt học tự do cũ vẫn xem lại được (R5).
    const isOpen = isLessonOpen(lesson);
    if (!isOpen && attempts.length === 0) {
      throw new NotFoundException(LESSON_NOT_FOUND);
    }

    const sections = await currentLessonSections(
      this.dataSource.manager,
      lesson,
    );
    const [item] = await this.lessonsService.toListItems(
      ctx,
      userId,
      [lesson],
      sections,
    );
    return {
      ...toLearnerLessonItem(
        item,
        attempts.find((a) => a.lessonVersion === lesson.currentVersion),
      ),
      isOpen,
      sections: sections.map((section) => ({
        name: section.name,
        questionCount: section.questionCount,
      })),
      attempts: await this.toAttemptItems(attempts, lesson),
    };
  }

  private publishedQuery(ctx: TenantContext) {
    // QueryBuilder tự bỏ bài đã xoá mềm.
    return this.lessons
      .createQueryBuilder('lesson')
      .innerJoin('lesson.blueprint', 'blueprint')
      .where('lesson.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('lesson.status = :status', { status: LessonStatus.PUBLISHED })
      .andWhere('lesson.visibility = :visibility', {
        visibility: ContentVisibility.TENANT,
      });
  }

  /** Danh mục / mẫu bài học có ít nhất một bài đang publish. */
  private async filterOptions(
    ctx: TenantContext,
  ): Promise<Pick<LearnerLessonList, 'categories' | 'blueprints'>> {
    const rows = await this.publishedQuery(ctx)
      .innerJoin('blueprint.category', 'category')
      .select('blueprint.id', 'blueprintId')
      .addSelect('blueprint.name', 'blueprintName')
      .addSelect('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .distinct(true)
      .getRawMany<{
        blueprintId: string;
        blueprintName: string;
        categoryId: string;
        categoryName: string;
      }>();
    const categories = new Map<string, LearnerExamFilterOption>();
    for (const row of rows) {
      categories.set(row.categoryId, {
        id: row.categoryId,
        name: row.categoryName,
      });
    }
    return {
      categories: [...categories.values()].sort(byName),
      blueprints: rows
        .map((row) => ({
          id: row.blueprintId,
          name: row.blueprintName,
          categoryId: row.categoryId,
        }))
        .sort(byName),
    };
  }

  private async toAttemptItems(
    attempts: readonly LessonAttempt[],
    lesson: Lesson,
  ): Promise<LessonAttemptItem[]> {
    if (attempts.length === 0) return [];
    const sections = await this.attemptSections.find({
      select: {
        id: true,
        attemptId: true,
        sectionId: true,
        viewedAt: true,
        submitCount: true,
      },
      where: { attemptId: In(attempts.map((attempt) => attempt.id)) },
    });
    const lessonSections = await this.dataSource.manager
      .getRepository(LessonSection)
      .find({
        select: { id: true, questionCount: true },
        where: { id: In(sections.map((section) => section.sectionId)) },
      });
    const questionCount = new Map(
      lessonSections.map((section) => [section.id, section.questionCount]),
    );
    return attempts.map((attempt) => {
      const own = sections.filter((s) => s.attemptId === attempt.id);
      const withQuestions = own.filter(
        (s) => (questionCount.get(s.sectionId) ?? 0) > 0,
      );
      return {
        id: attempt.id,
        lessonVersion: attempt.lessonVersion,
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        completedAt: attempt.completedAt?.toISOString() ?? null,
        sectionCount: own.length,
        viewedSectionCount: own.filter((s) => s.viewedAt !== null).length,
        questionSectionCount: withQuestions.length,
        submittedSectionCount: withQuestions.filter((s) => s.submitCount > 0)
          .length,
        autoCorrect: attempt.autoCorrect,
        autoTotal: attempt.autoTotal,
        manualCount: attempt.manualCount,
        manualGradedCount: attempt.manualGradedCount,
        canSubmit: canSubmitAttempt(attempt, lesson),
      };
    });
  }
}
