import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Classroom } from './classroom.entity';

/** Chương của giáo trình lớp (1 cấp); có ngày mở tuỳ chọn cho cả chương (R9). */
@Entity('class_groups')
export class ClassGroup {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_class_groups',
  })
  id: string;

  @Index('IDX_class_groups_classroom_id')
  @Column({ name: 'classroom_id', type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'classroom_id',
    foreignKeyConstraintName: 'FK_class_groups_classroom_id',
  })
  classroom?: Classroom;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({ name: 'opens_at', type: 'timestamptz', nullable: true })
  opensAt: Date | null;
}
