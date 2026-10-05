import { NotificationType, type NotificationParams } from '@lang/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

/**
 * Thông báo trong ứng dụng (plan mục 4.7, R18). Gửi theo **user** chứ không
 * theo membership: chuông gộp mọi trung tâm, `tenant_id` chỉ để hiện tên trung
 * tâm và dọn theo tenant. `dedupe_key` giữ cron 15 phút chạy lại không tạo
 * thông báo trùng (unique một phần theo user).
 */
@Entity('notifications')
@Index('IDX_notifications_user_created_at', ['userId', 'createdAt'])
@Index('IDX_notifications_created_at', ['createdAt'])
@Index('UQ_notifications_dedupe_key', ['userId', 'dedupeKey'], {
  unique: true,
  where: '"dedupe_key" IS NOT NULL',
})
@Check('CHK_notifications_type', sqlInList('type', NotificationType))
export class Notification {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_notifications',
  })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_notifications_user_id',
  })
  user?: User;

  /** `null` khi thông báo không thuộc trung tâm nào. */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_notifications_tenant_id',
  })
  tenant?: Tenant | null;

  @Column({ type: 'varchar', length: 32 })
  type: NotificationType;

  /** Dữ liệu dựng câu chữ ở client (giả định 11). */
  @Column({ type: 'jsonb', default: () => `'{}'` })
  params: NotificationParams;

  /** Đường dẫn trong ứng dụng, `null` nếu không có đích. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string | null;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 120, nullable: true })
  dedupeKey: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
