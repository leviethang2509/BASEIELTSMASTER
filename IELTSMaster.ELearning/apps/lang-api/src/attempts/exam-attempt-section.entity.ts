import { AttemptSectionStatus, type AttemptResponses } from '@lang/shared';
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
import { ExamSection } from '../exams/exam-section.entity';
import { ExamAttempt } from './exam-attempt.entity';

/**
 * Một section trong lượt làm (plan 4.5): timer, câu trả lời đang làm và số câu
 * đúng sau khi nộp. Làm lần lượt theo `sort_order`.
 */
@Entity('exam_attempt_sections')
@Unique('UQ_exam_attempt_sections_attempt_order', ['attemptId', 'sortOrder'])
// Cron tìm section quá hạn chưa nộp.
@Index('IDX_exam_attempt_sections_open_deadline', ['deadlineAt'], {
  where: `"status" = '${AttemptSectionStatus.IN_PROGRESS}'`,
})
@Check(
  'CHK_exam_attempt_sections_status',
  sqlInList('status', AttemptSectionStatus),
)
export class ExamAttemptSection {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_exam_attempt_sections',
  })
  id: string;

  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => ExamAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'attempt_id',
    foreignKeyConstraintName: 'FK_exam_attempt_sections_attempt_id',
  })
  attempt?: ExamAttempt;

  // Section của version đã có bài làm không bị xoá; NO ACTION để xoá cứng
  // tenant (CASCADE cả đề lẫn bài làm) vẫn chạy được.
  @Index('IDX_exam_attempt_sections_section_id')
  @Column({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @ManyToOne(() => ExamSection, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'section_id',
    foreignKeyConstraintName: 'FK_exam_attempt_sections_section_id',
  })
  section?: ExamSection;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({
    type: 'varchar',
    length: 16,
    default: AttemptSectionStatus.NOT_STARTED,
  })
  status: AttemptSectionStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true })
  deadlineAt: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  /** Chốt vì hết giờ (cron, lazy hoặc client gửi nộp sau `deadline_at`). */
  @Column({ name: 'auto_submitted', type: 'boolean', default: false })
  autoSubmitted: boolean;

  /**
   * Câu trả lời đang làm (`Responses` của exam-core), autosave ghi đè. Default
   * viết đúng thứ tự khoá Postgres lưu jsonb để migration:generate không báo lệch.
   */
  @Column({
    type: 'jsonb',
    default: () => `'{"order": {}, "picks": {}, "value": {}}'`,
  })
  responses: AttemptResponses;

  /** Seed xáo dòng ordering/polytomous riêng cho lượt làm (`shuffleOrdering`). */
  @Column({ name: 'order_seed', type: 'int' })
  orderSeed: number;

  /** Số câu chấm tự động đúng / tổng; có sau khi nộp. */
  @Column({ type: 'int', nullable: true })
  correct: number | null;

  @Column({ type: 'int', nullable: true })
  total: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
