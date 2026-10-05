import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Membership } from '../memberships/membership.entity';
import { ClassSession } from './class-session.entity';

/**
 * Giáo viên riêng của buổi (dạy thế, R14): chỉ dùng khi
 * `class_sessions.custom_teachers`; thành viên có role Teacher.
 */
@Entity('class_session_teachers')
export class ClassSessionTeacher {
  @PrimaryColumn({
    name: 'session_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_class_session_teachers',
  })
  sessionId: string;

  @ManyToOne(() => ClassSession, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'session_id',
    foreignKeyConstraintName: 'FK_class_session_teachers_session_id',
  })
  session?: ClassSession;

  @Index('IDX_class_session_teachers_membership_id')
  @PrimaryColumn({
    name: 'membership_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_class_session_teachers',
  })
  membershipId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'membership_id',
    foreignKeyConstraintName: 'FK_class_session_teachers_membership_id',
  })
  membership?: Membership;
}
