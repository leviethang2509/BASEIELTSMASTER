import { ContentVisibility, LessonStatus } from '@lang/shared';
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
import { LessonBlueprint } from '../catalog/lesson-blueprint.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

/**
 * Bài học của tenant (req-3 Step 4), chép cấu trúc từ `Exam` nhưng tách bảng
 * (A1). Nội dung nằm ở `lesson_sections` theo version; chỉ section của
 * `current_version` là `active`. Bài học có lượt học thì xoá mềm.
 */
@Entity('lessons')
@Check('CHK_lessons_status', sqlInList('status', LessonStatus))
@Check('CHK_lessons_current_version', '"current_version" >= 1')
@Check('CHK_lessons_visibility', sqlInList('visibility', ContentVisibility))
export class Lesson {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_lessons' })
  id: string;

  @Index('IDX_lessons_tenant_id')
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_lessons_tenant_id',
  })
  tenant?: Tenant;

  @Index('IDX_lessons_blueprint_id')
  @Column({ name: 'blueprint_id', type: 'uuid' })
  blueprintId: string;

  // NO ACTION (kiểm cuối câu lệnh): chặn xoá mẫu đang dùng như RESTRICT, nhưng
  // xoá cứng tenant (CASCADE cả mẫu lẫn bài học) vẫn chạy được.
  @ManyToOne(() => LessonBlueprint, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'blueprint_id',
    foreignKeyConstraintName: 'FK_lessons_blueprint_id',
  })
  blueprint?: LessonBlueprint;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 16, default: LessonStatus.DRAFT })
  status: LessonStatus;

  /** `tenant`: hiện ở danh sách của học viên; `private`: chỉ học qua lớp. */
  @Column({
    type: 'varchar',
    length: 16,
    default: ContentVisibility.PRIVATE,
  })
  visibility: ContentVisibility;

  /** Bài gốc khi nhân bản; bài gốc bị xoá hẳn thì thành `null`. */
  @Column({ name: 'cloned_from_id', type: 'uuid', nullable: true })
  clonedFromId: string | null;

  @ManyToOne(() => Lesson, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'cloned_from_id',
    foreignKeyConstraintName: 'FK_lessons_cloned_from_id',
  })
  clonedFrom?: Lesson | null;

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

  @Index('IDX_lessons_created_by')
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_lessons_created_by',
  })
  creator?: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'updated_by',
    foreignKeyConstraintName: 'FK_lessons_updated_by',
  })
  updater?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
