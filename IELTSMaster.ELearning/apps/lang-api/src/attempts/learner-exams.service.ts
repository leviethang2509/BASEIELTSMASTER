import {
  AttemptSectionStatus,
  AttemptStatus,
  ContentVisibility,
  ExamStatus,
  type ExamListItem,
  type LearnerAttemptItem,
  type LearnerExamDetail,
  type LearnerExamFilterOption,
  type LearnerExamItem,
  type LearnerExamList,
  type Paginated,
} from '@lang/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, type Repository } from 'typeorm';
import { toSkipTake } from '../common/pagination';
import { escapeLike } from '../common/sql';
import { Exam } from '../exams/exam.entity';
import {
  EXAM_NOT_FOUND,
  ExamsService,
  currentSections,
} from '../exams/exams.service';
import type { TenantContext } from '../tenants/tenant-context';
import type {
  ListLearnerExamsQueryDto,
  ListMyAttemptsQueryDto,
} from './dto/attempt.dto';
import { ExamAttemptSection } from './exam-attempt-section.entity';
import { ExamAttempt } from './exam-attempt.entity';

function toLearnerExamItem(item: ExamListItem): LearnerExamItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    blueprint: item.blueprint,
    sectionCount: item.sectionCount,
    questionCount: item.questionCount,
    totalDurationMinutes: item.totalDurationMinutes,
    publishedAt: item.publishedAt,
  };
}

const byName = (a: LearnerExamFilterOption, b: LearnerExamFilterOption) =>
  a.name.localeCompare(b.name, 'vi');

/**
 * Đề thi ở khu vực chính (Step 13): mọi thành viên tenant xem được đề đang
 * publish có hiển thị `tenant` và lịch sử lượt làm của chính mình. Đề đã lưu trữ/xoá chỉ còn xem
 * được khi mình từng làm.
 */
@Injectable()
export class LearnerExamsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly examsService: ExamsService,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptSection)
    private readonly attemptSections: Repository<ExamAttemptSection>,
  ) {}

  async list(
    ctx: TenantContext,
    userId: string,
    query: ListLearnerExamsQueryDto,
  ): Promise<LearnerExamList> {
    const { skip, take } = toSkipTake(query);
    const qb = this.publishedQuery(ctx)
      .orderBy('exam.publishedAt', 'DESC')
      .addOrderBy('exam.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.q) {
      qb.andWhere('exam.title ILIKE :q', { q: `%${escapeLike(query.q)}%` });
    }
    if (query.categoryId) {
      qb.andWhere('blueprint.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.blueprintId) {
      qb.andWhere('exam.blueprintId = :blueprintId', {
        blueprintId: query.blueprintId,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    const [items, filters] = await Promise.all([
      this.examsService.toListItems(ctx, userId, rows),
      this.filterOptions(ctx),
    ]);
    return {
      items: items.map(toLearnerExamItem),
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
  ): Promise<LearnerExamDetail> {
    const exam = await this.exams.findOne({
      where: { id, tenantId: ctx.tenantId },
      withDeleted: true,
    });
    if (!exam) throw new NotFoundException(EXAM_NOT_FOUND);
    const attempts = (
      await this.attempts.findBy({ tenantId: ctx.tenantId, examId: id, userId })
    ).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    // Đề `private` chỉ làm qua lớp; lượt làm tự do cũ vẫn xem lại được (R5).
    const isOpen =
      exam.status === ExamStatus.PUBLISHED &&
      exam.visibility === ContentVisibility.TENANT &&
      !exam.deletedAt;
    if (!isOpen && attempts.length === 0) {
      throw new NotFoundException(EXAM_NOT_FOUND);
    }

    const sections = await currentSections(this.dataSource.manager, exam);
    const [item] = await this.examsService.toListItems(
      ctx,
      userId,
      [exam],
      sections,
    );
    return {
      ...toLearnerExamItem(item),
      isOpen,
      sections: sections.map((section) => ({
        name: section.name,
        durationMinutes: section.durationMinutes,
        questionCount: section.questionCount,
      })),
      inProgressAttemptId:
        attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS)?.id ??
        null,
      attempts: await this.toAttemptItems(attempts, [exam]),
    };
  }

  /** Lượt làm của tôi trong tenant, mới nhất trước (trang trung tâm). */
  async myAttempts(
    ctx: TenantContext,
    userId: string,
    query: ListMyAttemptsQueryDto,
  ): Promise<Paginated<LearnerAttemptItem>> {
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await this.attempts.findAndCount({
      where: {
        tenantId: ctx.tenantId,
        userId,
        ...(query.status ? { status: query.status } : {}),
      },
      order: { startedAt: 'DESC', id: 'ASC' },
      skip,
      take,
    });
    const exams =
      rows.length > 0
        ? await this.exams.find({
            where: { id: In([...new Set(rows.map((row) => row.examId))]) },
            withDeleted: true,
          })
        : [];
    return {
      items: await this.toAttemptItems(rows, exams),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private publishedQuery(ctx: TenantContext) {
    // QueryBuilder tự bỏ đề đã xoá mềm.
    return this.exams
      .createQueryBuilder('exam')
      .innerJoin('exam.blueprint', 'blueprint')
      .where('exam.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('exam.status = :status', { status: ExamStatus.PUBLISHED })
      .andWhere('exam.visibility = :visibility', {
        visibility: ContentVisibility.TENANT,
      });
  }

  /** Danh mục / loại đề có ít nhất một đề đang publish. */
  private async filterOptions(
    ctx: TenantContext,
  ): Promise<Pick<LearnerExamList, 'categories' | 'blueprints'>> {
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
    attempts: readonly ExamAttempt[],
    exams: readonly Exam[],
  ): Promise<LearnerAttemptItem[]> {
    if (attempts.length === 0) return [];
    const sections = await this.attemptSections.find({
      select: { id: true, attemptId: true, status: true },
      where: { attemptId: In(attempts.map((attempt) => attempt.id)) },
    });
    const titles = new Map(exams.map((exam) => [exam.id, exam.title]));
    return attempts.map((attempt) => {
      const own = sections.filter((s) => s.attemptId === attempt.id);
      return {
        id: attempt.id,
        exam: { id: attempt.examId, title: titles.get(attempt.examId) ?? '' },
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        sectionCount: own.length,
        submittedSectionCount: own.filter(
          (s) => s.status === AttemptSectionStatus.SUBMITTED,
        ).length,
        autoCorrect: attempt.autoCorrect,
        autoTotal: attempt.autoTotal,
        manualCount: attempt.manualCount,
        manualGradedCount: attempt.manualGradedCount,
      };
    });
  }
}
