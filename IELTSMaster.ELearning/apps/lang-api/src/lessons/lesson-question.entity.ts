import { QuestionGrading, QuestionType } from '@lang/shared';
import type { AnswerKey, QuestionParams } from '@lang/exam-core';
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
import { numericTransformer, sqlInList } from '../common/sql';
import { LessonPart } from './lesson-part.entity';
import { LessonSection } from './lesson-section.entity';

/**
 * Một số câu trong section (đánh số từ 1) kèm đáp án, tách bằng
 * `extractStructure`. Dùng để chấm bài tập trong bài học (Step 5).
 */
@Entity('lesson_questions')
@Unique('UQ_lesson_questions_section_number', ['sectionId', 'number'])
@Check('CHK_lesson_questions_qtype', sqlInList('qtype', QuestionType))
@Check('CHK_lesson_questions_grading', sqlInList('grading', QuestionGrading))
@Check('CHK_lesson_questions_number', '"number" >= 1')
export class LessonQuestion {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_lesson_questions',
  })
  id: string;

  @Column({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @ManyToOne(() => LessonSection, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'section_id',
    foreignKeyConstraintName: 'FK_lesson_questions_section_id',
  })
  section?: LessonSection;

  /** Part/subpart gần nhất chứa câu hỏi. */
  @Index('IDX_lesson_questions_part_id')
  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  partId: string | null;

  @ManyToOne(() => LessonPart, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'part_id',
    foreignKeyConstraintName: 'FK_lesson_questions_part_id',
  })
  part?: LessonPart | null;

  @Column({ type: 'int' })
  number: number;

  /** Id của indicator câu hỏi trong `raw_data`. */
  @Column({ name: 'node_id', type: 'varchar', length: 64 })
  nodeId: string;

  /** Vị trí blank / cặp / lượt chọn trong indicator, từ 0. */
  @Column({ name: 'sub_index', type: 'int' })
  subIndex: number;

  @Column({ type: 'varchar', length: 16 })
  qtype: QuestionType;

  @Column({ type: 'varchar', length: 8 })
  grading: QuestionGrading;

  /** `null` với câu chấm tay. */
  @Column({ name: 'answer_key', type: 'jsonb', nullable: true })
  answerKey: AnswerKey;

  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  params: QuestionParams;

  @Column({
    name: 'max_score',
    type: 'numeric',
    precision: 4,
    scale: 1,
    transformer: numericTransformer,
  })
  maxScore: number;
}
