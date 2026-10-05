import { ContentVisibility, ExamStatus } from '@lang/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { ExamBlueprint } from '../catalog/exam-blueprint.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

/**
 * Đề thi của tenant. Nội dung nằm ở `exam_sections` theo version; chỉ section
 * của `current_version` là `active`. Đề có bài làm thì xoá mềm.
 */
@Entity('exams')
@Check('CHK_exams_status', sqlInList('status', ExamStatus))
@Check('CHK_exams_current_version', '"current_version" >= 1')
@Check('CHK_exams_visibility', sqlInList('visibility', ContentVisibility))
export class Exam {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_exams' })
  id: string;

  @Index('IDX_exams_tenant_id')
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_exams_tenant_id',
  })
  tenant?: Tenant;

  @Index('IDX_exams_blueprint_id')
  @Column({ name: 'blueprint_id', type: 'uuid' })
  blueprintId: string;

  // NO ACTION (kiểm cuối câu lệnh): chặn xoá loại đề đang dùng như RESTRICT,
  // nhưng xoá cứng tenant (CASCADE cả loại đề lẫn đề) vẫn chạy được.
  @ManyToOne(() => ExamBlueprint, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'blueprint_id',
    foreignKeyConstraintName: 'FK_exams_blueprint_id',
  })
  blueprint?: ExamBlueprint;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 16, default: ExamStatus.DRAFT })
  status: ExamStatus;

  /** `tenant`: hiện ở danh sách của học viên; `private`: chỉ làm qua lớp. */
  @Column({
    type: 'varchar',
    length: 16,
    default: ContentVisibility.TENANT,
  })
  visibility: ContentVisibility;

  /** Đề gốc khi nhân bản; đề gốc bị xoá hẳn thì thành `null`. */
  @Column({ name: 'cloned_from_id', type: 'uuid', nullable: true })
  clonedFromId: string | null;

  @ManyToOne(() => Exam, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'cloned_from_id',
    foreignKeyConstraintName: 'FK_exams_cloned_from_id',
  })
  clonedFrom?: Exam | null;

  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;

  /**
   * Tăng mỗi lần lưu nội dung (kể cả khi không tạo version mới). Client gửi lại
   * giá trị đã đọc để không ghi đè lần lưu của người khác.
   */
  @Column({ name: 'content_revision', type: 'int', default: 1 })
  contentRevision: number;

  /** Lần publish gần nhất. */
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Index('IDX_exams_created_by')
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_exams_created_by',
  })
  creator?: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'updated_by',
    foreignKeyConstraintName: 'FK_exams_updated_by',
  })
  updater?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
