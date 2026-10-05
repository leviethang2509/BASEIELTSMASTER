import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Membership } from '../memberships/membership.entity';
import { User } from '../users/user.entity';
import { Classroom } from './classroom.entity';

/** Giáo viên của lớp: thành viên có role Teacher, quyền như nhau (D6). */
@Entity('classroom_teachers')
export class ClassroomTeacher {
  @PrimaryColumn({
    name: 'classroom_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_classroom_teachers',
  })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'classroom_id',
    foreignKeyConstraintName: 'FK_classroom_teachers_classroom_id',
  })
  classroom?: Classroom;

  @Index('IDX_classroom_teachers_membership_id')
  @PrimaryColumn({
    name: 'membership_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_classroom_teachers',
  })
  membershipId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'membership_id',
    foreignKeyConstraintName: 'FK_classroom_teachers_membership_id',
  })
  membership?: Membership;

  @Column({ name: 'added_by', type: 'uuid', nullable: true })
  addedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'added_by',
    foreignKeyConstraintName: 'FK_classroom_teachers_added_by',
  })
  adder?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
