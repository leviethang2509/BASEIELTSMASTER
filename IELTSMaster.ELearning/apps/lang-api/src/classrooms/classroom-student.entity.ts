import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Membership } from '../memberships/membership.entity';
import { User } from '../users/user.entity';
import { Classroom } from './classroom.entity';

/**
 * Học viên của lớp (D7–D9): xoá khỏi lớp là xoá mềm (`removed_at`), bài làm
 * giữ nguyên; thêm lại thì khôi phục dòng cũ. Nhận xét cuối khoá (Step 11, T5):
 * 1 nhận xét/học viên/lớp, giáo viên của lớp hoặc Owner/Admin viết khi lớp
 * `ongoing`/`finished`; học viên chỉ thấy khi lớp `finished`.
 */
@Entity('classroom_students')
@Unique('UQ_classroom_students_member', ['classroomId', 'membershipId'])
export class ClassroomStudent {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_classroom_students',
  })
  id: string;

  @Column({ name: 'classroom_id', type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'classroom_id',
    foreignKeyConstraintName: 'FK_classroom_students_classroom_id',
  })
  classroom?: Classroom;

  @Index('IDX_classroom_students_membership_id')
  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'membership_id',
    foreignKeyConstraintName: 'FK_classroom_students_membership_id',
  })
  membership?: Membership;

  /** Lần thêm gần nhất (thêm lại sau khi xoá thì đặt lại). */
  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'now()' })
  joinedAt: Date;

  @Column({ name: 'removed_at', type: 'timestamptz', nullable: true })
  removedAt: Date | null;

  @Column({ name: 'added_by', type: 'uuid', nullable: true })
  addedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'added_by',
    foreignKeyConstraintName: 'FK_classroom_students_added_by',
  })
  adder?: User | null;

  /** Nhận xét cuối khoá; `null` = chưa viết. */
  @Column({ name: 'final_comment', type: 'text', nullable: true })
  finalComment: string | null;

  @Column({ name: 'final_comment_by', type: 'uuid', nullable: true })
  finalCommentBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'final_comment_by',
    foreignKeyConstraintName: 'FK_classroom_students_final_comment_by',
  })
  finalCommenter?: User | null;

  @Column({ name: 'final_comment_at', type: 'timestamptz', nullable: true })
  finalCommentAt: Date | null;
}
