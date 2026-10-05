import { AiFormatRunStatus } from '@lang/shared';
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
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

/**
 * Mỗi lần bấm "Định dạng bằng AI" (req-5 plan 4.1): nhật ký và căn cứ đếm lượt
 * theo tháng (`countAiUsage`). `id` cũng là `jobId` của job nền.
 */
@Entity('ai_format_runs')
@Index('IDX_ai_format_runs_tenant_started_at', ['tenantId', 'startedAt'])
@Check('CHK_ai_format_runs_status', sqlInList('status', AiFormatRunStatus))
export class AiFormatRun {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_ai_format_runs',
  })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_ai_format_runs_tenant_id',
  })
  tenant?: Tenant;

  /** Người bấm; `null` khi tài khoản bị xoá hẳn (lượt vẫn tính vào hạn mức). */
  @Index('IDX_ai_format_runs_user_id')
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_ai_format_runs_user_id',
  })
  user?: User | null;

  @Index('IDX_ai_format_runs_exam_id')
  @Column({ name: 'exam_id', type: 'uuid', nullable: true })
  examId: string | null;

  @ManyToOne(() => Exam, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'exam_id',
    foreignKeyConstraintName: 'FK_ai_format_runs_exam_id',
  })
  exam?: Exam | null;

  /** Không FK: tab mới chưa lưu thì chưa có dòng `exam_sections`. */
  @Column({ name: 'section_id', type: 'uuid', nullable: true })
  sectionId: string | null;

  @Column({ type: 'varchar', length: 16, default: AiFormatRunStatus.RUNNING })
  status: AiFormatRunStatus;

  /** Số lần gọi AI đã xong. */
  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  /** Tính vào hạn mức (plan 1.16); lượt `running` luôn được đếm. */
  @Column({ type: 'boolean', default: false })
  counted: boolean;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens: number;

  @Column({ name: 'output_tokens', type: 'int', default: 0 })
  outputTokens: number;

  /** Số lỗi cấu trúc còn lại của kết quả được chọn. */
  @Column({ name: 'issue_count', type: 'int', nullable: true })
  issueCount: number | null;

  /** Lỗi hệ thống, không chứa nội dung đề. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}
