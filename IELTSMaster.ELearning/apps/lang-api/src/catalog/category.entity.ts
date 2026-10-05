import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  CategoryColor,
  CategoryIconName,
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
  UpdateDateColumn,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { CATALOG_CODE_CHECK } from './catalog-scope';

/** Danh mục (Tiếng Anh, Tiếng Nhật…). `tenant_id` NULL là danh mục hệ thống. */
@Entity('categories')
@Index('UQ_categories_system_code', ['code'], {
  unique: true,
  where: '"tenant_id" IS NULL',
})
@Index('UQ_categories_tenant_code', ['tenantId', 'code'], {
  unique: true,
  where: '"tenant_id" IS NOT NULL',
})
@Check('CHK_categories_code_format', CATALOG_CODE_CHECK)
@Check('CHK_categories_icon', sqlInList('icon', CategoryIconName))
@Check('CHK_categories_color', sqlInList('color', CategoryColor))
export class Category {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_categories',
  })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_categories_tenant_id',
  })
  tenant?: Tenant | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 32, default: DEFAULT_CATEGORY_ICON })
  icon: CategoryIconName;

  @Column({ type: 'varchar', length: 16, default: DEFAULT_CATEGORY_COLOR })
  color: CategoryColor;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  /** Ngừng dùng: không chọn được khi tạo/đổi danh mục của loại đề, dữ liệu cũ giữ nguyên. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_categories_created_by',
  })
  creator?: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'updated_by',
    foreignKeyConstraintName: 'FK_categories_updated_by',
  })
  updater?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
