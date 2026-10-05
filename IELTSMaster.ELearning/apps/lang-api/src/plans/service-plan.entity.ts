import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Gói dịch vụ tenant: giới hạn số membership active. Thanh toán/thời hạn để sau. */
@Entity('service_plans')
@Check('CHK_service_plans_max_members', '"max_members" > 0')
@Check('CHK_service_plans_price', '"price" IS NULL OR "price" >= 0')
export class ServicePlan {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_service_plans',
  })
  id: string;

  @Index('UQ_service_plans_code', { unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'max_members', type: 'integer' })
  maxMembers: number;

  /** pg trả `numeric` về dạng chuỗi để không mất chính xác. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Gói ngừng bán: tenant đang dùng giữ nguyên, không chọn được khi đăng ký. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
