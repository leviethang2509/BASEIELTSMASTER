import type { SectionExplanation } from '@lang/exam-core';
import { ExamSectionStatus } from '@lang/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { sqlDurationMinutes, sqlInList } from '../common/sql';
import { User } from '../users/user.entity';
import { Exam } from './exam.entity';

/**
 * Một section (tab editor, có timer) của một version đề. Lưu lại nội dung khi
 * version chưa có bài làm thì xoá rồi tạo lại, nên `created_at` là lúc lưu.
 */
@Entity('exam_sections')
@Index('IDX_exam_sections_exam_version', ['examId', 'version'])
@Check('CHK_exam_sections_status', sqlInList('status', ExamSectionStatus))
@Check('CHK_exam_sections_duration', sqlDurationMinutes('duration_minutes'))
@Check('CHK_exam_sections_version', '"version" >= 1')
export class ExamSection {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_exam_sections',
  })
  id: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId: string;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'exam_id',
    foreignKeyConstraintName: 'FK_exam_sections_exam_id',
  })
  exam?: Exam;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 16, default: ExamSectionStatus.ACTIVE })
  status: ExamSectionStatus;

  /** Module sinh ra section; chỉ tham khảo nên không có khoá ngoại. */
  @Column({ name: 'module_id', type: 'uuid', nullable: true })
  moduleId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  /** Nội dung Plate nguyên văn, có đáp án. */
  @Column({ name: 'raw_data', type: 'jsonb' })
  rawData: unknown[];

  /** Nội dung gửi người làm bài: đã bỏ đáp án (`stripAnswers`). */
  @Column({ name: 'content_public', type: 'jsonb' })
  contentPublic: unknown[];

  /**
   * Giải thích tách từ `raw_data` (`extractExplanations`): content_public chỉ
   * giữ indicator rỗng, học viên không nhận được nội dung này.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  explanations: SectionExplanation[];

  @Column({ name: 'question_count', type: 'int', default: 0 })
  questionCount: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_exam_sections_created_by',
  })
  creator?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
