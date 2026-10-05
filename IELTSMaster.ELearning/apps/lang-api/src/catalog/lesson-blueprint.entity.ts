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
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { CATALOG_CODE_CHECK } from './catalog-scope';
import { Category } from './category.entity';

/**
 * Mẫu bài học (vd. "Minna no Nihongo – 1 bài") gồm các phần (module), dùng để
 * sinh section khi tạo bài học. Phạm vi và quy tắc danh mục như loại đề
 * (`ExamBlueprint`); tách bảng riêng vì bài học tách hẳn đề thi (req-3 A1).
 */
@Entity('lesson_blueprints')
@Index('UQ_lesson_blueprints_system_code', ['code'], {
  unique: true,
  where: '"tenant_id" IS NULL',
})
@Index('UQ_lesson_blueprints_tenant_code', ['tenantId', 'code'], {
  unique: true,
  where: '"tenant_id" IS NOT NULL',
})
@Check('CHK_lesson_blueprints_code_format', CATALOG_CODE_CHECK)
export class LessonBlueprint {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_lesson_blueprints',
  })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_lesson_blueprints_tenant_id',
  })
  tenant?: Tenant | null;

  @Index('IDX_lesson_blueprints_category_id')
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'category_id',
    foreignKeyConstraintName: 'FK_lesson_blueprints_category_id',
  })
  category?: Category;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Ngừng dùng: không chọn được khi tạo bài học mới, bài đã tạo giữ nguyên. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_lesson_blueprints_created_by',
  })
  creator?: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'updated_by',
    foreignKeyConstraintName: 'FK_lesson_blueprints_updated_by',
  })
  updater?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
