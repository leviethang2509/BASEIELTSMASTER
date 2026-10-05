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

/**
 * Giáo trình tham khảo: thư viện độc lập của tenant, gắn vào nhiều khoá học
 * (R6). Chương ở `curriculum_groups`, mục ở `curriculum_items`; lưu cả danh
 * sách một lần, chống ghi đè bằng `revision`.
 */
@Entity('curricula')
@Check('CHK_curricula_revision', '"revision" >= 1')
export class Curriculum {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_curricula' })
  id: string;

  @Index('IDX_curricula_tenant_id')
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_curricula_tenant_id',
  })
  tenant?: Tenant;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Tăng mỗi lần lưu chương + mục (không tăng khi sửa tên/mô tả). */
  @Column({ type: 'int', default: 1 })
  revision: number;

  /** Giáo trình gốc khi nhân bản; bản gốc bị xoá thì thành `null`. */
  @Column({ name: 'cloned_from_id', type: 'uuid', nullable: true })
  clonedFromId: string | null;

  @ManyToOne(() => Curriculum, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'cloned_from_id',
    foreignKeyConstraintName: 'FK_curricula_cloned_from_id',
  })
  clonedFrom?: Curriculum | null;

  @Index('IDX_curricula_created_by')
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_curricula_created_by',
  })
  creator?: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'updated_by',
    foreignKeyConstraintName: 'FK_curricula_updated_by',
  })
  updater?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
