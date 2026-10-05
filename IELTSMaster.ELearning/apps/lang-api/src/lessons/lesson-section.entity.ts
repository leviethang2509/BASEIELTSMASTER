import type { SectionExplanation } from '@lang/exam-core';
import { LessonSectionStatus } from '@lang/shared';
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
import { sqlInList } from '../common/sql';
import { User } from '../users/user.entity';
import { Lesson } from './lesson.entity';

/**
 * Một section (tab) của một version bài học; không có thời lượng. Lưu lại nội
 * dung khi version chưa có lượt học thì xoá rồi tạo lại, nên `created_at` là
 * lúc lưu.
 */
@Entity('lesson_sections')
@Index('IDX_lesson_sections_lesson_version', ['lessonId', 'version'])
@Check('CHK_lesson_sections_status', sqlInList('status', LessonSectionStatus))
@Check('CHK_lesson_sections_version', '"version" >= 1')
export class LessonSection {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_lesson_sections',
  })
  id: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'lesson_id',
    foreignKeyConstraintName: 'FK_lesson_sections_lesson_id',
  })
  lesson?: Lesson;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 16, default: LessonSectionStatus.ACTIVE })
  status: LessonSectionStatus;

  /** Phần của mẫu bài học sinh ra section; chỉ tham khảo nên không có khoá ngoại. */
  @Column({ name: 'module_id', type: 'uuid', nullable: true })
  moduleId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  /** Nội dung Plate nguyên văn, có đáp án và giải thích. */
  @Column({ name: 'raw_data', type: 'jsonb' })
  rawData: unknown[];

  /** Nội dung gửi học viên: đã bỏ đáp án và nội dung giải thích (`stripAnswers`). */
  @Column({ name: 'content_public', type: 'jsonb' })
  contentPublic: unknown[];

  /** Giải thích tách từ `raw_data`, chỉ trả học viên sau khi nộp section (Step 5). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  explanations: SectionExplanation[];

  @Column({ name: 'question_count', type: 'int', default: 0 })
  questionCount: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_lesson_sections_created_by',
  })
  creator?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
