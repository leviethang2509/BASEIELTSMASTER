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
 * Ngày nghỉ của trung tâm (T4, U5): từ ngày – đến ngày, không lặp hằng năm.
 * Thêm/sửa/xoá thì tính lại lịch các lớp đang áp dụng ngày nghỉ.
 */
@Entity('tenant_holidays')
@Index('IDX_tenant_holidays_tenant_start', ['tenantId', 'startDate'])
@Check('CHK_tenant_holidays_range', '"end_date" >= "start_date"')
export class TenantHoliday {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_tenant_holidays',
  })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_tenant_holidays_tenant_id',
  })
  tenant?: Tenant;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_tenant_holidays_created_by',
  })
  creator?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
