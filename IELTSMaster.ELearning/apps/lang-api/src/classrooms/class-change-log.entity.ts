import type { ClassLogAction, ClassLogDetail } from '@lang/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Classroom } from './classroom.entity';

/** Nhật ký thay đổi của lớp (E2): ai, lúc nào, làm gì; chữ dựng ở client. */
@Entity('class_change_logs')
@Index('IDX_class_change_logs_classroom_created', ['classroomId', 'createdAt'])
export class ClassChangeLog {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_class_change_logs',
  })
  id: string;

  @Column({ name: 'classroom_id', type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'classroom_id',
    foreignKeyConstraintName: 'FK_class_change_logs_classroom_id',
  })
  classroom?: Classroom;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'actor_user_id',
    foreignKeyConstraintName: 'FK_class_change_logs_actor_user_id',
  })
  actor?: User | null;

  /** Không có CHECK: thêm loại nhật ký mới không cần migration. */
  @Column({ type: 'varchar', length: 32 })
  action: ClassLogAction;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  detail: ClassLogDetail;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
