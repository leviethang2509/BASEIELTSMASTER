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
import { LessonQuestion } from '../lessons/lesson-question.entity';
import { User } from '../users/user.entity';
import { LessonAttemptSection } from './lesson-attempt-section.entity';
import { LessonAttempt } from './lesson-attempt.entity';

/**
 * Câu trả lời từng câu của lần nộp gần nhất (plan 4.3): nộp lại thì xoá và tạo
 * lại, bản chấm tay cũ bỏ (R20.5).
 */
@Entity('lesson_attempt_answers')
@Unique('UQ_lesson_attempt_answers_section_question', [
  'attemptSectionId',
  'questionId',
])
export class LessonAttemptAnswer {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_lesson_attempt_answers',
  })
  id: string;

  @Index('IDX_lesson_attempt_answers_attempt_id')
  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => LessonAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'attempt_id',
    foreignKeyConstraintName: 'FK_lesson_attempt_answers_attempt_id',
  })
  attempt?: LessonAttempt;

  @Column({ name: 'attempt_section_id', type: 'uuid' })
  attemptSectionId: string;

  @ManyToOne(() => LessonAttemptSection, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'attempt_section_id',
    foreignKeyConstraintName: 'FK_lesson_attempt_answers_attempt_section_id',
  })
  attemptSection?: LessonAttemptSection;

  @Index('IDX_lesson_attempt_answers_question_id')
  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  // Câu hỏi của version đã có lượt học không bị xoá; NO ACTION như section.
  @ManyToOne(() => LessonQuestion, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'question_id',
    foreignKeyConstraintName: 'FK_lesson_attempt_answers_question_id',
  })
  question?: LessonQuestion;

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

  /** Key ghi âm Speaking trên bucket private. */
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
    foreignKeyConstraintName: 'FK_lesson_attempt_answers_graded_by',
  })
  grader?: User | null;

  @Column({ name: 'graded_at', type: 'timestamptz', nullable: true })
  gradedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
