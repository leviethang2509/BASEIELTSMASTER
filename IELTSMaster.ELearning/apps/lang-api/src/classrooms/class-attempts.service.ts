import {
  AttemptStatus,
  ClassAttemptState,
  ClassLogAction,
  CurriculumItemType,
  attemptScorePercent,
  type ClassItemAttemptRow,
  type VoidClassAttemptResult,
} from '@lang/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, IsNull, type EntityManager } from 'typeorm';
import { AttemptsService } from '../attempts/attempts.service';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { Membership } from '../memberships/membership.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';
import { manualScoresByAttempt } from './class-activity';
import { loadContents } from './class-curriculum.service';
import { ClassItem } from './class-item.entity';
import { writeClassLog } from './class-logs';
import { assertClassroomOpen, loadClassroomAccess } from './classroom-access';
import { classContentIdOf } from './classroom.mapper';

const ITEM_NOT_FOUND = 'Không tìm thấy mục này trong giáo trình lớp';
const NOT_EXAM_ITEM = 'Chỉ mục đề thi mới có lượt thi để cho làm lại';
const ATTEMPT_NOT_FOUND = 'Không tìm thấy lượt thi của mục này';
const ALREADY_VOIDED = 'Lượt thi này đã được cho làm lại';

/**
 * Lượt thi trong lớp dưới góc nhìn giáo viên (req-3 Step 9): xem lượt của từng
 * học viên trên một mục và "Cho làm lại" khi có sự cố (R10.5). Lượt cũ giữ
 * nguyên lịch sử, chỉ đánh dấu `voided` nên không tính điểm, chuyên cần hay
 * nhóm thi (giả định 8).
 */
@Injectable()
export class ClassAttemptsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly attempts: AttemptsService,
  ) {}

  /** Lượt thi của mọi học viên trên một mục đề thi, mới nhất trước. */
  async listForItem(
    ctx: TenantContext,
    classroomId: string,
    itemId: string,
  ): Promise<ClassItemAttemptRow[]> {
    const manager = this.dataSource.manager;
    await loadClassroomAccess(manager, ctx, classroomId);
    const item = await this.findExamItem(manager, classroomId, itemId);
    const attempts = await manager
      .getRepository(ExamAttempt)
      .findBy({ classItemId: itemId, tenantId: ctx.tenantId });
    if (attempts.length === 0) return [];
    const [people, manualScores] = await Promise.all([
      this.people(
        manager,
        attempts.map((row) => row.membershipId),
      ),
      manualScoresByAttempt(
        manager,
        attempts.map((row) => row.id),
      ),
    ]);
    return attempts
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .map((attempt) => {
        const state =
          attempt.status === AttemptStatus.IN_PROGRESS
            ? ClassAttemptState.IN_PROGRESS
            : attempt.status === AttemptStatus.GRADED
              ? ClassAttemptState.GRADED
              : ClassAttemptState.PENDING_GRADING;
        const percent =
          state === ClassAttemptState.GRADED
            ? attemptScorePercent({
                autoCorrect: attempt.autoCorrect,
                autoTotal: attempt.autoTotal,
                manualScore: manualScores.get(attempt.id) ?? 0,
                manualCount: attempt.manualCount,
              })
            : null;
        return {
          id: attempt.id,
          state,
          startedAt: attempt.startedAt.toISOString(),
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
          percent,
          passed: percent === null ? null : percent >= item.passThreshold,
          student: people.get(attempt.membershipId) ?? {
            membershipId: attempt.membershipId,
            userId: attempt.userId,
            fullName: '',
          },
          voidedAt: attempt.voidedAt?.toISOString() ?? null,
        };
      });
  }

  /**
   * "Cho làm lại": đánh dấu lượt cũ `voided` để học viên bắt đầu lượt mới cho
   * cùng mục. Lượt đang làm dở bị chốt trước (như hết giờ) để câu đã trả lời
   * vẫn được lưu lịch sử (người dùng chốt Step 9).
   */
  async voidAttempt(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    itemId: string,
    attemptId: string,
  ): Promise<VoidClassAttemptResult> {
    const now = new Date();
    return this.dataSource.transaction(async (manager) => {
      const { classroom } = await loadClassroomAccess(
        manager,
        ctx,
        classroomId,
        true,
      );
      assertClassroomOpen(classroom);
      const item = await this.findExamItem(manager, classroomId, itemId);
      const attempts = manager.getRepository(ExamAttempt);
      const attempt = await attempts.findOne({
        where: { id: attemptId, classItemId: itemId, tenantId: ctx.tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!attempt) throw new NotFoundException(ATTEMPT_NOT_FOUND);
      if (attempt.voidedAt) throw new ConflictException(ALREADY_VOIDED);
      if (attempt.status === AttemptStatus.IN_PROGRESS) {
        await this.attempts.finalizeAttempt(manager, attempt.id, now);
      }
      await attempts.update(
        { id: attempt.id, voidedAt: IsNull() },
        { voidedAt: now, voidedBy: actorId },
      );

      const [contents, people] = await Promise.all([
        loadContents(manager, [item]),
        this.people(manager, [attempt.membershipId]),
      ]);
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.ATTEMPT_VOIDED,
        {
          itemTitle:
            item.title ?? contents.get(classContentIdOf(item))?.title ?? '',
          studentName: people.get(attempt.membershipId)?.fullName ?? '',
        },
      );
      return { attemptId: attempt.id, voidedAt: now.toISOString() };
    });
  }

  private async findExamItem(
    manager: EntityManager,
    classroomId: string,
    itemId: string,
  ): Promise<ClassItem> {
    const item = await manager
      .getRepository(ClassItem)
      .findOneBy({ id: itemId, classroomId });
    if (!item) throw new NotFoundException(ITEM_NOT_FOUND);
    if (item.itemType !== CurriculumItemType.EXAM) {
      throw new BadRequestException(NOT_EXAM_ITEM);
    }
    return item;
  }

  /** Membership → họ tên (hiện trong danh sách lượt và nhật ký). */
  private async people(manager: EntityManager, membershipIds: string[]) {
    const ids = [...new Set(membershipIds)];
    if (ids.length === 0) {
      return new Map<
        string,
        { membershipId: string; userId: string; fullName: string }
      >();
    }
    const memberships = await manager
      .getRepository(Membership)
      .findBy({ id: In(ids) });
    const users = await manager
      .getRepository(User)
      .findBy({ id: In(memberships.map((row) => row.userId)) });
    const userById = new Map(users.map((row) => [row.id, row]));
    return new Map(
      memberships.map((membership) => [
        membership.id,
        {
          membershipId: membership.id,
          userId: membership.userId,
          fullName: userById.get(membership.userId)?.fullName ?? '',
        },
      ]),
    );
  }
}
