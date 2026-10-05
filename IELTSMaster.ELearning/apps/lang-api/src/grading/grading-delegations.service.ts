import {
  GradingKind,
  GradingScopeType,
  NotificationType,
  TenantRole,
  type GradingDelegation as GradingDelegationView,
  type GradingDelegationBox,
  type GradingDelegationTarget,
} from '@lang/shared';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, type EntityManager } from 'typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ClassItem } from '../classrooms/class-item.entity';
import { loadContents } from '../classrooms/class-curriculum.service';
import { loadEligible } from '../classrooms/class-members.service';
import { Classroom } from '../classrooms/classroom.entity';
import { classContentIdOf } from '../classrooms/classroom.mapper';
import { Exam } from '../exams/exam.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { Lesson } from '../lessons/lesson.entity';
import { Membership } from '../memberships/membership.entity';
import { gradingListLink } from '../notifications/notification-targets';
import { NotificationsService } from '../notifications/notifications.service';
import { isUniqueViolation } from '../common/database-errors';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';
import type {
  CreateGradingDelegationDto,
  GradingDelegationQueryDto,
} from './dto/grading.dto';
import {
  attemptScopeOf,
  canDelegateScope,
  canGradeAttempt,
  contentScopeOf,
  loadGraderScope,
  type GradableAttemptRow,
} from './grading-access';
import { GradingDelegation } from './grading-delegation.entity';
import { NOT_MY_GRADING } from './grading.service';

const ATTEMPT_NOT_FOUND = 'Không tìm thấy bài làm';
const SCOPE_NOT_FOUND = 'Không tìm thấy phạm vi chuyển giao';
const DELEGATION_NOT_FOUND = 'Không tìm thấy lượt chuyển giao';
const NOT_MY_SCOPE =
  'Chỉ giáo viên của lớp, người soạn đề/bài học hoặc Chủ sở hữu/Quản trị mới chuyển giao được';
const TEACHER_LABEL = 'Giáo viên';

/** Thông tin một lượt làm/lượt học đủ để dựng phạm vi chuyển giao. */
interface AttemptScopeInfo {
  row: GradableAttemptRow;
  /** Tên đề thi / bài học. */
  contentTitle: string;
  studentName: string;
  classItemTitle: string;
  classroomCode: string;
}

/**
 * Chuyển giao chấm (req-3 Step 10, R20.1–2): người có quyền **gốc** trên một
 * phạm vi (giáo viên của lớp, người soạn đề/bài học, Owner/Admin) cho một
 * Teacher khác chấm đúng phạm vi đó. Người giao vẫn chấm được; người được giao
 * không giao tiếp cho ai (người dùng chốt Step 10).
 */
@Injectable()
export class GradingDelegationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  /** Hộp "Chuyển giao chấm" của một bài làm: phạm vi giao được + đã giao. */
  async box(
    ctx: TenantContext,
    graderId: string,
    query: GradingDelegationQueryDto,
  ): Promise<GradingDelegationBox> {
    const manager = this.dataSource.manager;
    const [scope, info] = await Promise.all([
      loadGraderScope(manager, ctx, graderId),
      this.attemptInfo(manager, ctx, query.attemptId, query.kind),
    ]);
    if (!canGradeAttempt(scope, info.row, query.kind)) {
      throw new ForbiddenException(NOT_MY_GRADING);
    }
    const attemptScope = attemptScopeOf(query.kind);
    // Quyền giao của mọi phạm vi trên cùng một lượt là như nhau (quyền gốc).
    const allowed = await canDelegateScope(
      manager,
      ctx,
      graderId,
      attemptScope,
      query.attemptId,
    );
    if (!allowed) return { targets: [], delegations: [] };

    const kindLabel = query.kind === GradingKind.LESSON ? 'bài học' : 'đề thi';
    const targets: GradingDelegationTarget[] = [
      {
        scopeType: attemptScope,
        scopeId: query.attemptId,
        title: `Chỉ bài làm này của ${info.studentName}`,
      },
      info.row.classItemId
        ? {
            scopeType: GradingScopeType.CLASS_ITEM,
            scopeId: info.row.classItemId,
            title: `Mọi bài của mục “${info.classItemTitle}” – lớp ${info.classroomCode}`,
          }
        : {
            scopeType: contentScopeOf(query.kind),
            scopeId: info.row.contentId,
            title: `Mọi bài làm tự do của ${kindLabel} “${info.contentTitle}”`,
          },
    ];
    return { targets, delegations: await this.listFor(manager, ctx, targets) };
  }

  /** Giao một phạm vi cho các giáo viên được chọn (bỏ qua người đã được giao). */
  async create(
    ctx: TenantContext,
    actorId: string,
    dto: CreateGradingDelegationDto,
  ): Promise<GradingDelegationView[]> {
    const manager = this.dataSource.manager;
    const title = await this.scopeTitle(
      manager,
      ctx,
      dto.scopeType,
      dto.scopeId,
    );
    if (title === null) throw new NotFoundException(SCOPE_NOT_FOUND);
    const allowed = await canDelegateScope(
      manager,
      ctx,
      actorId,
      dto.scopeType,
      dto.scopeId,
    );
    if (!allowed) throw new ForbiddenException(NOT_MY_SCOPE);
    const members = await loadEligible(
      manager,
      ctx.tenantId,
      dto.delegateMembershipIds,
      TenantRole.TEACHER,
      TEACHER_LABEL,
    );
    const repository = manager.getRepository(GradingDelegation);
    const existing = await repository.findBy({
      tenantId: ctx.tenantId,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
    });
    const already = new Set(existing.map((row) => row.delegateMembershipId));
    const added = members.filter(
      (member) => !already.has(member.membership.id),
    );
    if (added.length > 0) {
      try {
        await repository.insert(
          added.map((member) => ({
            tenantId: ctx.tenantId,
            delegateMembershipId: member.membership.id,
            scopeType: dto.scopeType,
            scopeId: dto.scopeId,
            createdBy: actorId,
          })),
        );
      } catch (error) {
        // Hai người giao cùng lúc: unique index đã giữ đúng, đọc lại là đủ.
        if (!isUniqueViolation(error)) throw error;
      }
      const actor = await manager
        .getRepository(User)
        .findOneBy({ id: actorId });
      await this.notifications.notify(manager, {
        userIds: added.map((member) => member.membership.userId),
        tenantId: ctx.tenantId,
        type: NotificationType.GRADING_DELEGATED,
        params: { title, actorName: actor?.fullName ?? '' },
        link: gradingListLink(ctx.slug),
        exceptUserId: actorId,
      });
    }
    return this.listFor(manager, ctx, [
      { scopeType: dto.scopeType, scopeId: dto.scopeId, title },
    ]);
  }

  /** Gỡ một lượt chuyển giao (người có quyền gốc trên phạm vi đó). */
  async remove(ctx: TenantContext, actorId: string, id: string): Promise<void> {
    const manager = this.dataSource.manager;
    const row = await manager
      .getRepository(GradingDelegation)
      .findOneBy({ id, tenantId: ctx.tenantId });
    if (!row) throw new NotFoundException(DELEGATION_NOT_FOUND);
    const allowed = await canDelegateScope(
      manager,
      ctx,
      actorId,
      row.scopeType,
      row.scopeId,
    );
    if (!allowed) throw new ForbiddenException(NOT_MY_SCOPE);
    await manager.getRepository(GradingDelegation).delete({ id: row.id });
  }

  // --- Nội bộ ---------------------------------------------------------------

  private async listFor(
    manager: EntityManager,
    ctx: TenantContext,
    targets: readonly GradingDelegationTarget[],
  ): Promise<GradingDelegationView[]> {
    const repository = manager.getRepository(GradingDelegation);
    const rows = (
      await Promise.all(
        targets.map((target) =>
          repository.findBy({
            tenantId: ctx.tenantId,
            scopeType: target.scopeType,
            scopeId: target.scopeId,
          }),
        ),
      )
    )
      .flat()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (rows.length === 0) return [];
    const memberships = await manager.getRepository(Membership).find({
      where: { id: In(rows.map((row) => row.delegateMembershipId)) },
      withDeleted: true,
    });
    const users = await manager.getRepository(User).find({
      where: {
        id: In([
          ...memberships.map((row) => row.userId),
          ...rows.flatMap((row) => row.createdBy ?? []),
        ]),
      },
      withDeleted: true,
    });
    const userById = new Map(users.map((row) => [row.id, row]));
    const membershipById = new Map(memberships.map((row) => [row.id, row]));
    const titleOf = new Map(
      targets.map((target) => [
        `${target.scopeType}:${target.scopeId}`,
        target.title,
      ]),
    );
    return rows.flatMap((row): GradingDelegationView[] => {
      const membership = membershipById.get(row.delegateMembershipId);
      const user = membership ? userById.get(membership.userId) : undefined;
      if (!membership || !user) return [];
      const creator = row.createdBy ? userById.get(row.createdBy) : undefined;
      return [
        {
          id: row.id,
          scopeType: row.scopeType,
          scopeId: row.scopeId,
          scopeTitle: titleOf.get(`${row.scopeType}:${row.scopeId}`) ?? '',
          delegate: {
            membershipId: membership.id,
            userId: user.id,
            fullName: user.fullName,
            email: user.email,
          },
          createdBy: creator
            ? { id: creator.id, fullName: creator.fullName }
            : null,
          createdAt: row.createdAt.toISOString(),
        },
      ];
    });
  }

  /** Tên phạm vi; `null` khi phạm vi không thuộc trung tâm hoặc đã mất. */
  private async scopeTitle(
    manager: EntityManager,
    ctx: TenantContext,
    scopeType: GradingScopeType,
    scopeId: string,
  ): Promise<string | null> {
    switch (scopeType) {
      case GradingScopeType.CLASS_ITEM: {
        const item = await manager
          .getRepository(ClassItem)
          .findOneBy({ id: scopeId });
        if (!item) return null;
        const classroom = await manager
          .getRepository(Classroom)
          .findOneBy({ id: item.classroomId, tenantId: ctx.tenantId });
        if (!classroom) return null;
        const contents = await loadContents(manager, [item]);
        const title =
          item.title ?? contents.get(classContentIdOf(item))?.title ?? '';
        return `Mọi bài của mục “${title}” – lớp ${classroom.code}`;
      }
      case GradingScopeType.EXAM: {
        const exam = await this.examOf(manager, ctx, scopeId);
        return exam ? `Mọi bài làm tự do của đề thi “${exam.title}”` : null;
      }
      case GradingScopeType.LESSON: {
        const lesson = await this.lessonOf(manager, ctx, scopeId);
        return lesson
          ? `Mọi bài làm tự do của bài học “${lesson.title}”`
          : null;
      }
      case GradingScopeType.EXAM_ATTEMPT:
      case GradingScopeType.LESSON_ATTEMPT: {
        const kind =
          scopeType === GradingScopeType.LESSON_ATTEMPT
            ? GradingKind.LESSON
            : GradingKind.EXAM;
        const info = await this.findAttemptInfo(manager, ctx, scopeId, kind);
        return info ? `Chỉ bài làm này của ${info.studentName}` : null;
      }
    }
  }

  private async attemptInfo(
    manager: EntityManager,
    ctx: TenantContext,
    attemptId: string,
    kind: GradingKind,
  ): Promise<AttemptScopeInfo> {
    const info = await this.findAttemptInfo(manager, ctx, attemptId, kind);
    if (!info) throw new NotFoundException(ATTEMPT_NOT_FOUND);
    return info;
  }

  private async findAttemptInfo(
    manager: EntityManager,
    ctx: TenantContext,
    attemptId: string,
    kind: GradingKind,
  ): Promise<AttemptScopeInfo | null> {
    const attempt =
      kind === GradingKind.LESSON
        ? await manager
            .getRepository(LessonAttempt)
            .findOneBy({ id: attemptId, tenantId: ctx.tenantId })
        : await manager
            .getRepository(ExamAttempt)
            .findOneBy({ id: attemptId, tenantId: ctx.tenantId });
    if (!attempt) return null;
    const contentId =
      attempt instanceof LessonAttempt ? attempt.lessonId : attempt.examId;
    const [content, student, item] = await Promise.all([
      kind === GradingKind.LESSON
        ? this.lessonOf(manager, ctx, contentId)
        : this.examOf(manager, ctx, contentId),
      manager
        .getRepository(User)
        .findOne({ where: { id: attempt.userId }, withDeleted: true }),
      attempt.classItemId
        ? manager
            .getRepository(ClassItem)
            .findOneBy({ id: attempt.classItemId })
        : Promise.resolve(null),
    ]);
    const classroom = item
      ? await manager
          .getRepository(Classroom)
          .findOneBy({ id: item.classroomId })
      : null;
    const itemContents = item ? await loadContents(manager, [item]) : null;
    return {
      row: {
        id: attempt.id,
        userId: attempt.userId,
        voided:
          attempt instanceof ExamAttempt ? attempt.voidedAt !== null : false,
        classItemId: attempt.classItemId,
        classroomId: item?.classroomId ?? null,
        contentId,
        authorId: content?.createdBy ?? null,
      },
      contentTitle: content?.title ?? '',
      studentName: student?.fullName ?? '',
      classItemTitle:
        item?.title ??
        (item && itemContents
          ? (itemContents.get(classContentIdOf(item))?.title ?? '')
          : ''),
      classroomCode: classroom?.code ?? '',
    };
  }

  private examOf(manager: EntityManager, ctx: TenantContext, id: string) {
    return manager.getRepository(Exam).findOne({
      select: { id: true, title: true, createdBy: true },
      where: { id, tenantId: ctx.tenantId },
      withDeleted: true,
    });
  }

  private lessonOf(manager: EntityManager, ctx: TenantContext, id: string) {
    return manager.getRepository(Lesson).findOne({
      select: { id: true, title: true, createdBy: true },
      where: { id, tenantId: ctx.tenantId },
      withDeleted: true,
    });
  }
}
