import { CourseStatus } from '@lang/shared';
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
import { Category } from '../catalog/category.entity';
import { sqlInList } from '../common/sql';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

/**
 * Khoá học của tenant (req-3 Step 6, B1–B4): Owner/Admin quản lý, Teacher xem.
 * Mã in hoa (CHECK) nên unique `(tenant_id, code)` đã là không phân biệt hoa
 * thường. Giáo trình tham khảo gắn qua `course_curricula`.
 */
@Entity('courses')
@Index('UQ_courses_tenant_code', ['tenantId', 'code'], { unique: true })
@Check('CHK_courses_code_format', CATALOG_CODE_CHECK)
@Check('CHK_courses_status', sqlInList('status', CourseStatus))
@Check(
  'CHK_courses_planned_sessions',
  '"planned_sessions" IS NULL OR "planned_sessions" >= 1',
)
export class Course {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_courses' })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_courses_tenant_id',
  })
  tenant?: Tenant;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index('IDX_courses_category_id')
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  // NO ACTION: danh mục đang có khoá học không xoá được (service báo 409), nhưng
  // xoá hẳn tenant (CASCADE cả danh mục lẫn khoá học) vẫn chạy.
  @ManyToOne(() => Category, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'category_id',
    foreignKeyConstraintName: 'FK_courses_category_id',
  })
  category?: Category | null;

  /** Ảnh bìa: URL từ Thư viện media của tenant hoặc URL dán vào. */
  @Column({ name: 'cover_url', type: 'varchar', length: 1024, nullable: true })
  coverUrl: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  level: string | null;

  /** Số buổi dự kiến; lớp tạo từ khoá học lấy làm số buổi mặc định. */
  @Column({ name: 'planned_sessions', type: 'int', nullable: true })
  plannedSessions: number | null;

  @Column({ type: 'varchar', length: 16, default: CourseStatus.ACTIVE })
  status: CourseStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_courses_created_by',
  })
  creator?: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'updated_by',
    foreignKeyConstraintName: 'FK_courses_updated_by',
  })
  updater?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
