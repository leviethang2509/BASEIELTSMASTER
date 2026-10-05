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
import { ExamPart } from './exam-part.entity';
import { ExamSection } from './exam-section.entity';

/**
 * Một số câu trong section (đánh số từ 1) kèm đáp án, tách bằng
 * `extractStructure`. Dùng để chấm (`gradeResponses`) và thống kê.
 */
@Entity('exam_questions')
@Unique('UQ_exam_questions_section_number', ['sectionId', 'number'])
@Check('CHK_exam_questions_qtype', sqlInList('qtype', QuestionType))
@Check('CHK_exam_questions_grading', sqlInList('grading', QuestionGrading))
@Check('CHK_exam_questions_number', '"number" >= 1')
export class ExamQuestion {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_exam_questions',
  })
  id: string;

  @Column({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @ManyToOne(() => ExamSection, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'section_id',
    foreignKeyConstraintName: 'FK_exam_questions_section_id',
  })
  section?: ExamSection;

  /** Part/subpart gần nhất chứa câu hỏi. */
  @Index('IDX_exam_questions_part_id')
  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  partId: string | null;

  @ManyToOne(() => ExamPart, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'part_id',
    foreignKeyConstraintName: 'FK_exam_questions_part_id',
  })
  part?: ExamPart | null;

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
