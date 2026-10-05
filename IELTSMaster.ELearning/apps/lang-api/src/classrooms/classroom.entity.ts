import { ClassroomStatus } from '@lang/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CATALOG_CODE_CHECK } from '../catalog/catalog-scope';
import { numericTransformer, sqlInList } from '../common/sql';
import { Tenant } from '../tenants/tenant.entity';
import { Course } from '../training/course.entity';
import { Curriculum } from '../training/curriculum.entity';
import { User } from '../users/user.entity';

/**
 * Lớp học (req-3 Step 7, D1–D2, U1): tạo từ khoá học, chép giáo trình tham
 * khảo sang `class_groups`/`class_items`. Mã in hoa (CHECK) nên unique
 * `(tenant_id, code)` đã không phân biệt hoa thường. `end_date` = ngày buổi
 * thường cuối, tính lại cùng thời khoá biểu (`recomputeSchedule`, Step 8).
 */
@Entity('classrooms')
@Index('UQ_classrooms_tenant_code', ['tenantId', 'code'], { unique: true })
@Check('CHK_classrooms_code_format', CATALOG_CODE_CHECK)
@Check('CHK_classrooms_status', sqlInList('status', ClassroomStatus))
@Check('CHK_classrooms_planned_sessions', '"planned_sessions" >= 1')
@Check(
  'CHK_classrooms_max_students',
  '"max_students" IS NULL OR "max_students" >= 1',
)
@Check(
  'CHK_classrooms_late_weight',
  '"late_weight" IS NULL OR ("late_weight" >= 0 AND "late_weight" <= 1)',
)
@Check(
  'CHK_classrooms_warning_threshold',
  '"warning_threshold" IS NULL OR ("warning_threshold" >= 0 AND "warning_threshold" <= 100)',
)
export class Classroom {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_classrooms',
  })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_classrooms_tenant_id',
  })
  tenant?: Tenant;

  @Index('IDX_classrooms_course_id')
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  // NO ACTION: khoá học đã có lớp chỉ lưu trữ được (B3, service báo 409).
  @ManyToOne(() => Course, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'course_id',
    foreignKeyConstraintName: 'FK_classrooms_course_id',
  })
  course?: Course;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'planned_sessions', type: 'int' })
  plannedSessions: number;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  /** `null` = không giới hạn sĩ số (D8). */
  @Column({ name: 'max_students', type: 'int', nullable: true })
  maxStudents: number | null;

  /** Phòng học hoặc link học online. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 16, default: ClassroomStatus.UPCOMING })
  status: ClassroomStatus;

  /** Lịch lớp bỏ qua ngày nghỉ của trung tâm (U6). */
  @Column({ name: 'apply_tenant_holidays', type: 'boolean', default: true })
  applyTenantHolidays: boolean;

  /** Giáo trình tham khảo đã chép lúc tạo lớp; xoá giáo trình không ảnh hưởng lớp. */
  @Column({ name: 'source_curriculum_id', type: 'uuid', nullable: true })
  sourceCurriculumId: string | null;

  @ManyToOne(() => Curriculum, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'source_curriculum_id',
    foreignKeyConstraintName: 'FK_classrooms_source_curriculum_id',
  })
  sourceCurriculum?: Curriculum | null;

  /** Hệ số nộp muộn k của lớp; `null` = theo trung tâm (R11.1, Step 11). */
  @Column({
    name: 'late_weight',
    type: 'numeric',
    precision: 3,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  lateWeight: number | null;

  /** Ngưỡng cảnh báo chuyên cần của lớp; `null` = theo trung tâm (R11.2). */
  @Column({
    name: 'warning_threshold',
    type: 'int',
    nullable: true,
  })
  warningThreshold: number | null;

  /** Tăng mỗi lần lưu giáo trình lớp (`baseRevision`, E2). */
  @Column({ name: 'curriculum_revision', type: 'int', default: 1 })
  curriculumRevision: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_classrooms_created_by',
  })
  creator?: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'updated_by',
    foreignKeyConstraintName: 'FK_classrooms_updated_by',
  })
  updater?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
