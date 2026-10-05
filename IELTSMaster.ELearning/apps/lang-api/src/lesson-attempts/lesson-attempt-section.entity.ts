import {
  LessonAttemptSectionStatus,
  type AttemptResponses,
} from '@lang/shared';
import {
  Check,
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
import { sqlInList } from '../common/sql';
import { LessonSection } from '../lessons/lesson-section.entity';
import { LessonAttempt } from './lesson-attempt.entity';

/** Ghi âm của lần đang làm, theo số câu: nộp thì chuyển sang câu trả lời. */
export type DraftRecordings = Record<
  string,
  { key: string; uploadedAt: string }
>;

/**
 * Một section (tab) trong lượt học (plan 4.3). Làm theo thứ tự tuỳ ý, không
 * tính giờ. `responses` là bản đang làm (autosave); lần nộp gần nhất nằm ở
 * `submitted_responses` + số liệu chấm + `lesson_attempt_answers`, giữ nguyên
 * khi "Làm lại" cho tới lần nộp mới.
 */
@Entity('lesson_attempt_sections')
@Unique('UQ_lesson_attempt_sections_attempt_order', ['attemptId', 'sortOrder'])
@Check(
  'CHK_lesson_attempt_sections_status',
  sqlInList('status', LessonAttemptSectionStatus),
)
export class LessonAttemptSection {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_lesson_attempt_sections',
  })
  id: string;

  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => LessonAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'attempt_id',
    foreignKeyConstraintName: 'FK_lesson_attempt_sections_attempt_id',
  })
  attempt?: LessonAttempt;

  // Section của version đã có lượt học không bị xoá; NO ACTION để xoá cứng
  // tenant vẫn chạy được.
  @Index('IDX_lesson_attempt_sections_section_id')
  @Column({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @ManyToOne(() => LessonSection, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'section_id',
    foreignKeyConstraintName: 'FK_lesson_attempt_sections_section_id',
  })
  section?: LessonSection;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({
    type: 'varchar',
    length: 16,
    default: LessonAttemptSectionStatus.OPEN,
  })
  status: LessonAttemptSectionStatus;

  /** Lần đầu mở tab (điều kiện học xong). */
  @Column({ name: 'viewed_at', type: 'timestamptz', nullable: true })
  viewedAt: Date | null;

  /** Câu trả lời đang làm; default viết đúng thứ tự khoá Postgres lưu jsonb. */
  @Column({
    type: 'jsonb',
    default: () => `'{"order": {}, "picks": {}, "value": {}}'`,
  })
  responses: AttemptResponses;

  /** Ghi âm của lần đang làm (bucket private). */
  @Column({ type: 'jsonb', default: () => `'{}'` })
  recordings: DraftRecordings;

  /** Seed xáo dòng ordering/polytomous riêng cho lượt học. */
  @Column({ name: 'order_seed', type: 'int' })
  orderSeed: number;

  /** Câu trả lời của lần nộp gần nhất. */
  @Column({ name: 'submitted_responses', type: 'jsonb', nullable: true })
  submittedResponses: AttemptResponses | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'submit_count', type: 'int', default: 0 })
  submitCount: number;

  /** Số câu chấm tự động đúng / tổng của lần nộp gần nhất. */
  @Column({ type: 'int', nullable: true })
  correct: number | null;

  @Column({ type: 'int', nullable: true })
  total: number | null;

  @Column({ name: 'manual_count', type: 'int', default: 0 })
  manualCount: number;

  @Column({ name: 'manual_graded_count', type: 'int', default: 0 })
  manualGradedCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
