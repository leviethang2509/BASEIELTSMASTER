import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Classroom } from './classroom.entity';

const TIME_OF_DAY = `'^([01][0-9]|2[0-3]):[0-5][0-9]$'`;

/**
 * Ô lặp trong tuần của thời khoá biểu lớp (U1): thứ + giờ bắt đầu/kết thúc
 * (`HH:mm`, giờ Việt Nam). Buổi thường tính lại từ các ô này.
 */
@Entity('class_schedule_slots')
@Check('CHK_class_schedule_slots_weekday', '"weekday" BETWEEN 1 AND 7')
@Check(
  'CHK_class_schedule_slots_time',
  `"start_time" ~ ${TIME_OF_DAY} AND "end_time" ~ ${TIME_OF_DAY} AND "start_time" < "end_time"`,
)
export class ClassScheduleSlot {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_class_schedule_slots',
  })
  id: string;

  @Index('IDX_class_schedule_slots_classroom_id')
  @Column({ name: 'classroom_id', type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'classroom_id',
    foreignKeyConstraintName: 'FK_class_schedule_slots_classroom_id',
  })
  classroom?: Classroom;

  /** 1 = Thứ 2 … 7 = Chủ nhật. */
  @Column({ type: 'smallint' })
  weekday: number;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;
}
