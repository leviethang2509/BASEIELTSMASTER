import { CurriculumItemLabel, CurriculumItemType } from '@lang/shared';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { Exam } from '../exams/exam.entity';
import { Lesson } from '../lessons/lesson.entity';
import { CurriculumGroup } from './curriculum-group.entity';
import { Curriculum } from './curriculum.entity';

/**
 * Mục giáo trình: bài học hoặc đề thi (C3), không trùng trong một giáo trình
 * (C5). `group_id` NULL = chưa xếp chương (giả định 5). Thứ tự `sort_order`
 * tính trong chương. Bài/đề đang nằm trong giáo trình không xoá được (service
 * báo 409; FK NO ACTION vẫn cho xoá hẳn tenant).
 */
@Entity('curriculum_items')
@Unique('UQ_curriculum_items_lesson', ['curriculumId', 'lessonId'])
@Unique('UQ_curriculum_items_exam', ['curriculumId', 'examId'])
@Check(
  'CHK_curriculum_items_item_type',
  sqlInList('item_type', CurriculumItemType),
)
@Check('CHK_curriculum_items_label', sqlInList('label', CurriculumItemLabel))
@Check(
  'CHK_curriculum_items_content',
  `("item_type" = '${CurriculumItemType.LESSON}' AND "lesson_id" IS NOT NULL AND "exam_id" IS NULL) OR ("item_type" = '${CurriculumItemType.EXAM}' AND "exam_id" IS NOT NULL AND "lesson_id" IS NULL)`,
)
export class CurriculumItem {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_curriculum_items',
  })
  id: string;

  @Column({ name: 'curriculum_id', type: 'uuid' })
  curriculumId: string;

  @ManyToOne(() => Curriculum, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'curriculum_id',
    foreignKeyConstraintName: 'FK_curriculum_items_curriculum_id',
  })
  curriculum?: Curriculum;

  @Index('IDX_curriculum_items_group_id')
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne(() => CurriculumGroup, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'group_id',
    foreignKeyConstraintName: 'FK_curriculum_items_group_id',
  })
  group?: CurriculumGroup | null;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({ name: 'item_type', type: 'varchar', length: 16 })
  itemType: CurriculumItemType;

  @Index('IDX_curriculum_items_lesson_id')
  @Column({ name: 'lesson_id', type: 'uuid', nullable: true })
  lessonId: string | null;

  @ManyToOne(() => Lesson, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'lesson_id',
    foreignKeyConstraintName: 'FK_curriculum_items_lesson_id',
  })
  lesson?: Lesson | null;

  @Index('IDX_curriculum_items_exam_id')
  @Column({ name: 'exam_id', type: 'uuid', nullable: true })
  examId: string | null;

  @ManyToOne(() => Exam, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'exam_id',
    foreignKeyConstraintName: 'FK_curriculum_items_exam_id',
  })
  exam?: Exam | null;

  /** Tên hiển thị ghi đè; `null` = tên bài học/đề. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 16 })
  label: CurriculumItemLabel;

  /** Ghi chú cho giáo viên. */
  @Column({ type: 'text', nullable: true })
  note: string | null;
}
