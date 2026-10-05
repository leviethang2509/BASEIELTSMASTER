import {
  CurriculumItemLabel,
  CurriculumItemType,
  DEFAULT_PASS_THRESHOLD,
} from '@lang/shared';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { Exam } from '../exams/exam.entity';
import { Lesson } from '../lessons/lesson.entity';
import { ClassGroup } from './class-group.entity';
import { Classroom } from './classroom.entity';

/**
 * Mục giáo trình lớp (E1–E5, R7–R10). Bài/đề trùng trong lớp chỉ khi là lần
 * thi lại (`retake_of_item_id`, service kiểm). Xoá mục đã có bài làm → ẩn
 * (`removed_at`), bài làm trỏ tới qua `class_item_id` nên FK từ lượt làm là
 * NO ACTION. `sort_order` tính trong chương.
 */
@Entity('class_items')
@Check('CHK_class_items_item_type', sqlInList('item_type', CurriculumItemType))
@Check('CHK_class_items_label', sqlInList('label', CurriculumItemLabel))
@Check(
  'CHK_class_items_content',
  `("item_type" = '${CurriculumItemType.LESSON}' AND "lesson_id" IS NOT NULL AND "exam_id" IS NULL) OR ("item_type" = '${CurriculumItemType.EXAM}' AND "exam_id" IS NOT NULL AND "lesson_id" IS NULL)`,
)
@Check(
  'CHK_class_items_pass_threshold',
  '"pass_threshold" >= 0 AND "pass_threshold" <= 100',
)
export class ClassItem {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_class_items',
  })
  id: string;

  @Index('IDX_class_items_classroom_id')
  @Column({ name: 'classroom_id', type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'classroom_id',
    foreignKeyConstraintName: 'FK_class_items_classroom_id',
  })
  classroom?: Classroom;

  @Index('IDX_class_items_group_id')
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne(() => ClassGroup, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'group_id',
    foreignKeyConstraintName: 'FK_class_items_group_id',
  })
  group?: ClassGroup | null;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({ name: 'item_type', type: 'varchar', length: 16 })
  itemType: CurriculumItemType;

  @Index('IDX_class_items_lesson_id')
  @Column({ name: 'lesson_id', type: 'uuid', nullable: true })
  lessonId: string | null;

  @ManyToOne(() => Lesson, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'lesson_id',
    foreignKeyConstraintName: 'FK_class_items_lesson_id',
  })
  lesson?: Lesson | null;

  @Index('IDX_class_items_exam_id')
  @Column({ name: 'exam_id', type: 'uuid', nullable: true })
  examId: string | null;

  @ManyToOne(() => Exam, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'exam_id',
    foreignKeyConstraintName: 'FK_class_items_exam_id',
  })
  exam?: Exam | null;

  /** Tên hiển thị ghi đè; `null` = tên bài học/đề. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 16 })
  label: CurriculumItemLabel;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'opens_at', type: 'timestamptz', nullable: true })
  opensAt: Date | null;

  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true })
  deadlineAt: Date | null;

  /** Đề thi: cho bắt đầu sau deadline (R10.1). */
  @Column({ name: 'accept_late', type: 'boolean', default: true })
  acceptLate: boolean;

  /** Đề thi: điểm % tối thiểu để đậu (R8). */
  @Column({
    name: 'pass_threshold',
    type: 'int',
    default: DEFAULT_PASS_THRESHOLD,
  })
  passThreshold: number;

  @Index('IDX_class_items_retake_of_item_id')
  @Column({ name: 'retake_of_item_id', type: 'uuid', nullable: true })
  retakeOfItemId: string | null;

  @ManyToOne(() => ClassItem, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'retake_of_item_id',
    foreignKeyConstraintName: 'FK_class_items_retake_of_item_id',
  })
  retakeOf?: ClassItem | null;

  @Column({ name: 'removed_at', type: 'timestamptz', nullable: true })
  removedAt: Date | null;
}
