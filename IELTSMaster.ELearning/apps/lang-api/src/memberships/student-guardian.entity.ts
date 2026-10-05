import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Membership } from './membership.entity';

/** Liên kết Phụ huynh ↔ Học viên (tuỳ chọn, nhiều–nhiều) trong cùng tenant. */
@Entity('student_guardians')
@Unique('UQ_student_guardians_student_parent', [
  'studentMembershipId',
  'parentMembershipId',
])
@Check(
  'CHK_student_guardians_distinct',
  '"student_membership_id" <> "parent_membership_id"',
)
export class StudentGuardian {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_student_guardians',
  })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'student_membership_id', type: 'uuid' })
  studentMembershipId: string;

  // FK kép qua tenant_id: hai membership bắt buộc cùng tenant với liên kết.
  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn([
    {
      name: 'student_membership_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_student_guardians_student',
    },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  student?: Membership;

  @Index('IDX_student_guardians_parent_membership_id')
  @Column({ name: 'parent_membership_id', type: 'uuid' })
  parentMembershipId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn([
    {
      name: 'parent_membership_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_student_guardians_parent',
    },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  parent?: Membership;

  /** Quan hệ tự do, vd. "Mẹ", "Bố". */
  @Column({ type: 'varchar', length: 50, nullable: true })
  relationship: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_student_guardians_created_by',
  })
  creator?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
