import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../common/sql';
import { ExamQuestion } from '../exams/exam-question.entity';
import { User } from '../users/user.entity';
import { ExamAttemptSection } from './exam-attempt-section.entity';
import { ExamAttempt } from './exam-attempt.entity';

/**
 * Câu trả lời từng câu (plan 4.5), sinh khi nộp section: chấm tay Writing /
 * Speaking (Step 14) và thống kê. Ghi âm Speaking tạo dòng sớm hơn, lúc tải lên.
 */
@Entity('exam_attempt_answers')
@Unique('UQ_exam_attempt_answers_attempt_question', ['attemptId', 'questionId'])
export class ExamAttemptAnswer {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_exam_attempt_answers',
  })
  id: string;

  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => ExamAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'attempt_id',
    foreignKeyConstraintName: 'FK_exam_attempt_answers_attempt_id',
  })
  attempt?: ExamAttempt;

  @Index('IDX_exam_attempt_answers_attempt_section_id')
  @Column({ name: 'attempt_section_id', type: 'uuid' })
  attemptSectionId: string;

  @ManyToOne(() => ExamAttemptSection, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'attempt_section_id',
    foreignKeyConstraintName: 'FK_exam_attempt_answers_attempt_section_id',
  })
  attemptSection?: ExamAttemptSection;

  @Index('IDX_exam_attempt_answers_question_id')
  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  // Câu hỏi của version đã có bài làm không bị xoá; NO ACTION như section.
  @ManyToOne(() => ExamQuestion, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'question_id',
    foreignKeyConstraintName: 'FK_exam_attempt_answers_question_id',
  })
  question?: ExamQuestion;

  /** Phần câu trả lời của câu này; `null` khi bỏ trống. */
  @Column({ type: 'jsonb', nullable: true })
  response: unknown;

  /** `null` với câu chấm tay. */
  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect: boolean | null;

  /** Tự động: `max_score` hoặc 0; chấm tay: 0–10, `null` khi chưa chấm. */
  @Column({
    type: 'numeric',
    precision: 4,
    scale: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  score: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  /** Key ghi âm trên bucket private. */
  @Column({
    name: 'recording_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recordingKey: string | null;

  @Column({ name: 'graded_by', type: 'uuid', nullable: true })
  gradedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'graded_by',
    foreignKeyConstraintName: 'FK_exam_attempt_answers_graded_by',
  })
  grader?: User | null;

  @Column({ name: 'graded_at', type: 'timestamptz', nullable: true })
  gradedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
