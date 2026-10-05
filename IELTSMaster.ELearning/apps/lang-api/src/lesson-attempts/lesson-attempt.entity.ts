import { LessonAttemptStatus } from '@lang/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClassItem } from '../classrooms/class-item.entity';
import { sqlInList } from '../common/sql';
import { Lesson } from '../lessons/lesson.entity';
import { Membership } from '../memberships/membership.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

/**
 * Lượt học bài học (plan 4.3): mỗi người một lượt cho mỗi version của bài (tự
 * do) hoặc mỗi (version, mục lớp) từ Step 9. Số liệu chấm là tổng lần nộp gần
 * nhất của các section, tính lại mỗi lần nộp/chấm (`recountAttempt`).
 */
@Entity('lesson_attempts')
@Index('UQ_lesson_attempts_free', ['lessonId', 'lessonVersion', 'userId'], {
  unique: true,
  where: '"class_item_id" IS NULL',
})
@Index(
  'UQ_lesson_attempts_class_item',
  ['lessonId', 'lessonVersion', 'userId', 'classItemId'],
  { unique: true, where: '"class_item_id" IS NOT NULL' },
)
@Check('CHK_lesson_attempts_status', sqlInList('status', LessonAttemptStatus))
export class LessonAttempt {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_lesson_attempts',
  })
  id: string;

  @Index('IDX_lesson_attempts_tenant_id')
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_lesson_attempts_tenant_id',
  })
  tenant?: Tenant;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  // Bài có lượt học chỉ xoá mềm; NO ACTION để xoá cứng tenant vẫn CASCADE được.
  @ManyToOne(() => Lesson, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'lesson_id',
    foreignKeyConstraintName: 'FK_lesson_attempts_lesson_id',
  })
  lesson?: Lesson;

  @Column({ name: 'lesson_version', type: 'int' })
  lessonVersion: number;

  @Index('IDX_lesson_attempts_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_lesson_attempts_user_id',
  })
  user?: User;

  @Index('IDX_lesson_attempts_membership_id')
  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'membership_id',
    foreignKeyConstraintName: 'FK_lesson_attempts_membership_id',
  })
  membership?: Membership;

  /** Mục giáo trình lớp (Step 9); `null` = học tự do. */
  @Index('IDX_lesson_attempts_class_item_id')
  @Column({ name: 'class_item_id', type: 'uuid', nullable: true })
  classItemId: string | null;

  // Mục đã có lượt học chỉ ẩn (E3), lớp đã có lượt học không xoá được (NO ACTION).
  @ManyToOne(() => ClassItem, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'class_item_id',
    foreignKeyConstraintName: 'FK_lesson_attempts_class_item_id',
  })
  classItem?: ClassItem | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: LessonAttemptStatus.IN_PROGRESS,
  })
  status: LessonAttemptStatus;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  /** Lần đầu đủ điều kiện học xong; làm lại không bỏ. */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /** Lần nộp section gần nhất (sắp xếp trang Chấm bài). */
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  /** Lúc mọi câu chấm tay của các lần nộp gần nhất đã có điểm. */
  @Column({ name: 'graded_at', type: 'timestamptz', nullable: true })
  gradedAt: Date | null;

  @Column({ name: 'auto_correct', type: 'int', default: 0 })
  autoCorrect: number;

  @Column({ name: 'auto_total', type: 'int', default: 0 })
  autoTotal: number;

  @Column({ name: 'manual_count', type: 'int', default: 0 })
  manualCount: number;

  @Column({ name: 'manual_graded_count', type: 'int', default: 0 })
  manualGradedCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
