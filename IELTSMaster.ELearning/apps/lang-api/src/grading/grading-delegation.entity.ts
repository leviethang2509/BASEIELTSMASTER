import { GradingScopeType } from '@lang/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { Membership } from '../memberships/membership.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

/**
 * Chuyển giao chấm (plan mục 4.7, R20.1–2): cho một Teacher khác chấm đúng một
 * phạm vi (mục của giáo trình lớp, đề/bài học ở phần tự do, hoặc một lượt).
 * `scope_id` đa hình nên không có FK; dòng trỏ tới phạm vi đã xoá chỉ là rác,
 * không cấp thêm quyền cho ai.
 */
@Entity('grading_delegations')
@Index(
  'UQ_grading_delegations_scope',
  ['delegateMembershipId', 'scopeType', 'scopeId'],
  { unique: true },
)
@Index('IDX_grading_delegations_scope', ['tenantId', 'scopeType', 'scopeId'])
@Check(
  'CHK_grading_delegations_scope_type',
  sqlInList('scope_type', GradingScopeType),
)
export class GradingDelegation {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_grading_delegations',
  })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_grading_delegations_tenant_id',
  })
  tenant?: Tenant;

  /** Người được chấm thay (membership của tenant, vai trò Teacher). */
  @Index('IDX_grading_delegations_delegate')
  @Column({ name: 'delegate_membership_id', type: 'uuid' })
  delegateMembershipId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'delegate_membership_id',
    foreignKeyConstraintName: 'FK_grading_delegations_delegate_membership_id',
  })
  delegate?: Membership;

  @Column({ name: 'scope_type', type: 'varchar', length: 16 })
  scopeType: GradingScopeType;

  @Column({ name: 'scope_id', type: 'uuid' })
  scopeId: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_grading_delegations_created_by',
  })
  creator?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
