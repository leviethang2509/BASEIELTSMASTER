import { ClassSessionKind, ClassSessionStatus } from '@lang/shared';
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
import { sqlInList } from '../common/sql';
import { User } from '../users/user.entity';
import { Classroom } from './classroom.entity';

/**
 * Buổi học (plan 4.6). Buổi thường (`regular`) là "Buổi thứ `seq`": ngày giờ
 * do `recomputeSchedule` tính lại, nội dung map/ghi chú/phòng/giáo viên đi
 * theo buổi (U2). Buổi bù (`makeup`) có ngày cố định, không đánh số, không
 * bao giờ bị dời (V1). Huỷ buổi giữ số, các buổi sau không dời.
 */
@Entity('class_sessions')
@Index('UQ_class_sessions_classroom_seq', ['classroomId', 'seq'], {
  unique: true,
})
@Index('IDX_class_sessions_starts_at', ['startsAt'])
@Check('CHK_class_sessions_kind', sqlInList('kind', ClassSessionKind))
@Check('CHK_class_sessions_status', sqlInList('status', ClassSessionStatus))
@Check(
  'CHK_class_sessions_seq',
  `("kind" = '${ClassSessionKind.REGULAR}' AND "seq" >= 1) OR ("kind" = '${ClassSessionKind.MAKEUP}' AND "seq" IS NULL)`,
)
@Check('CHK_class_sessions_time', '"ends_at" > "starts_at"')
export class ClassSession {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_class_sessions',
  })
  id: string;

  @Column({ name: 'classroom_id', type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'classroom_id',
    foreignKeyConstraintName: 'FK_class_sessions_classroom_id',
  })
  classroom?: Classroom;

  @Column({ type: 'varchar', length: 16 })
  kind: ClassSessionKind;

  /** Số buổi (buổi thường); buổi bù `null`. */
  @Column({ type: 'int', nullable: true })
  seq: number | null;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  /** Buổi thường có giờ sửa tay; bỏ khi buổi đổi ngày (U2). */
  @Column({ name: 'time_overridden', type: 'boolean', default: false })
  timeOverridden: boolean;

  /** Phòng/link riêng; `null` = theo lớp. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: ClassSessionStatus.SCHEDULED,
  })
  status: ClassSessionStatus;

  @Column({
    name: 'cancel_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  cancelReason: string | null;

  /** Buổi bù: buổi thường được bù ("Bù cho Buổi N"). */
  @Index('IDX_class_sessions_makeup_for_session_id')
  @Column({ name: 'makeup_for_session_id', type: 'uuid', nullable: true })
  makeupForSessionId: string | null;

  @ManyToOne(() => ClassSession, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'makeup_for_session_id',
    foreignKeyConstraintName: 'FK_class_sessions_makeup_for_session_id',
  })
  makeupFor?: ClassSession | null;

  /** `true`: giáo viên của buổi là `class_session_teachers`; `false`: mọi giáo viên của lớp. */
  @Column({ name: 'custom_teachers', type: 'boolean', default: false })
  customTeachers: boolean;

  /** Buổi bị dời khi có giáo viên riêng/giờ sửa tay: cần kiểm tra lại (U2). */
  @Column({ name: 'moved_warning', type: 'boolean', default: false })
  movedWarning: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_class_sessions_created_by',
  })
  creator?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
