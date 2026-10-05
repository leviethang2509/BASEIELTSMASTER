import {
  AI_MONTHLY_QUOTA_OPTIONS,
  DEFAULT_LATE_WEIGHT,
  DEFAULT_WARNING_THRESHOLD,
  TenantStatus,
  type AiMonthlyQuota,
} from '@lang/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer, sqlInList } from '../common/sql';
import { ServicePlan } from '../plans/service-plan.entity';
import { User } from '../users/user.entity';

@Entity('tenants')
// Slug của tenant đã xoá mềm được dùng lại.
@Index('UQ_tenants_slug', ['slug'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Check('CHK_tenants_slug_format', `"slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)
@Check('CHK_tenants_status', sqlInList('status', TenantStatus))
@Check('CHK_tenants_late_weight', '"late_weight" >= 0 AND "late_weight" <= 1')
@Check(
  'CHK_tenants_warning_threshold',
  '"warning_threshold" >= 0 AND "warning_threshold" <= 100',
)
@Check(
  'CHK_tenants_ai_monthly_quota',
  `"ai_monthly_quota" IN (${AI_MONTHLY_QUOTA_OPTIONS.join(', ')})`,
)
export class Tenant {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_tenants' })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** Đường dẫn `/t/{slug}`, quy tắc trong `validateTenantSlug` (`@lang/shared`). */
  @Column({ type: 'varchar', length: 40 })
  slug: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 1024, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 16, default: TenantStatus.PENDING })
  status: TenantStatus;

  /** Lý do System Admin từ chối; xoá khi gửi lại. */
  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  rejectionReason: string | null;

  /** Lý do System Admin tạm khoá; xoá khi mở khoá. */
  @Column({
    name: 'suspension_reason',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  suspensionReason: string | null;

  @Index('IDX_tenants_plan_id')
  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => ServicePlan, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'plan_id',
    foreignKeyConstraintName: 'FK_tenants_plan_id',
  })
  plan?: ServicePlan;

  /** Người đăng ký, cũng là Tenant Owner duy nhất. */
  @Index('IDX_tenants_owner_user_id')
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'owner_user_id',
    foreignKeyConstraintName: 'FK_tenants_owner_user_id',
  })
  owner?: User;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'reviewed_by',
    foreignKeyConstraintName: 'FK_tenants_reviewed_by',
  })
  reviewer?: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  /** Hệ số nộp muộn k của chuyên cần (R11.1), lớp ghi đè được (Step 11). */
  @Column({
    name: 'late_weight',
    type: 'numeric',
    precision: 3,
    scale: 2,
    // Viết dạng biểu thức: số thường làm migration:generate luôn báo lệch.
    default: () => String(DEFAULT_LATE_WEIGHT),
    transformer: numericTransformer,
  })
  lateWeight: number;

  /** Ngưỡng cảnh báo chuyên cần X% (R11.2). */
  @Column({
    name: 'warning_threshold',
    type: 'int',
    default: DEFAULT_WARNING_THRESHOLD,
  })
  warningThreshold: number;

  /** System Owner/Admin bật định dạng đề bằng AI (req-5 plan 1.15). */
  @Column({ name: 'ai_enabled', type: 'boolean', default: false })
  aiEnabled: boolean;

  /** Lượt AI mỗi tháng; `null` = không giới hạn. */
  @Column({ name: 'ai_monthly_quota', type: 'int', nullable: true })
  aiMonthlyQuota: AiMonthlyQuota | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
