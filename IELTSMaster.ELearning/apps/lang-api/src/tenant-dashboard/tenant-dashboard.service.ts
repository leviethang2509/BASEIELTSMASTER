import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ExamStatus,
  MembershipStatus,
  TENANT_MANAGER_ROLES,
  TenantRole,
  hasAnyRole,
  type TenantDashboardStats,
} from '@lang/shared';
import { DataSource, type Repository } from 'typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { Exam } from '../exams/exam.entity';
import { countPendingGrading } from '../grading/grading-pending';
import { MembershipRole } from '../memberships/membership-role.entity';
import { Membership } from '../memberships/membership.entity';
import { MembershipsService } from '../memberships/memberships.service';
import type { TenantContext } from '../tenants/tenant-context';

@Injectable()
export class TenantDashboardService {
  constructor(
    @InjectRepository(MembershipRole)
    private readonly membershipRoles: Repository<MembershipRole>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
    private readonly memberships: MembershipsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tổng quan tenant. Teacher chỉ có bản rút gọn (học viên, đề, lượt làm, bài
   * chờ chấm); số liệu thành viên và gói chỉ cho Owner/Admin. Thẻ "Bài chờ
   * chấm" đếm đúng phạm vi chấm của người xem (`countPendingGrading`), gồm cả
   * lượt học, nên khớp số dòng "Chờ chấm" ở trang Chấm bài.
   */
  async getStats(
    ctx: TenantContext,
    graderId: string,
  ): Promise<TenantDashboardStats> {
    const rows = await this.membershipRoles
      .createQueryBuilder('r')
      .innerJoin(Membership, 'm', 'm.id = r.membershipId')
      .select('r.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('r.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('m.status = :status', { status: MembershipStatus.ACTIVE })
      .andWhere('m.deletedAt IS NULL')
      .groupBy('r.role')
      .getRawMany<{ role: TenantRole; count: string }>();
    const byRole = new Map(rows.map((row) => [row.role, Number(row.count)]));
    const count = (role: TenantRole) => byRole.get(role) ?? 0;

    // QueryBuilder tự bỏ đề đã xoá mềm.
    const [examRows, attempts, pendingGrading] = await Promise.all([
      this.exams
        .createQueryBuilder('exam')
        .select('exam.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('exam.tenantId = :tenantId', { tenantId: ctx.tenantId })
        .groupBy('exam.status')
        .getRawMany<{ status: ExamStatus; count: string }>(),
      this.attempts.countBy({ tenantId: ctx.tenantId }),
      countPendingGrading(this.dataSource.manager, ctx, graderId),
    ]);
    const examsByStatus = new Map(
      examRows.map((row) => [row.status, Number(row.count)]),
    );

    const isManager = hasAnyRole(ctx.roles, TENANT_MANAGER_ROLES);
    return {
      students: count(TenantRole.STUDENT),
      exams: Object.fromEntries(
        Object.values(ExamStatus).map((status) => [
          status,
          examsByStatus.get(status) ?? 0,
        ]),
      ) as Record<ExamStatus, number>,
      attempts,
      pendingGrading,
      management: isManager
        ? {
            teachers: count(TenantRole.TEACHER),
            parents: count(TenantRole.PARENT),
            quota: await this.memberships.getQuota(ctx),
          }
        : null,
    };
  }
}
