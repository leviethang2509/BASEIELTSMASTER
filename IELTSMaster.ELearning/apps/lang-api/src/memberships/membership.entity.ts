import { MembershipStatus } from '@lang/shared';
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
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

@Entity('memberships')
// Một membership cho mỗi (tenant, user); xoá mềm rồi thêm lại tạo bản ghi mới.
@Index('UQ_memberships_tenant_user', ['tenantId', 'userId'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
// Đích của FK kép (membership, tenant) từ membership_roles và student_guardians,
// bảo đảm các bản ghi con cùng tenant với membership.
@Unique('UQ_memberships_id_tenant', ['id', 'tenantId'])
@Check('CHK_memberships_status', sqlInList('status', MembershipStatus))
export class Membership {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_memberships',
  })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_memberships_tenant_id',
  })
  tenant?: Tenant;

  @Index('IDX_memberships_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_memberships_user_id',
  })
  user?: User;

  /** Chỉ membership `active` được vào tenant và được tính vào giới hạn gói. */
  @Column({ type: 'varchar', length: 16, default: MembershipStatus.ACTIVE })
  status: MembershipStatus;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'now()' })
  joinedAt: Date;

  /** Lần gần nhất gọi API của tenant, `TenantGuard` cập nhật tối đa 1 lần/giờ. */
  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_memberships_created_by',
  })
  creator?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
