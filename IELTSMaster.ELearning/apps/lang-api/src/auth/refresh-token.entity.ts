import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Refresh token (cookie `ls_rt`). Mỗi lần refresh xoay sang token mới cùng
 * `family_id`; token cũ bị dùng lại quá thời gian ân hạn thì thu hồi cả family.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_refresh_tokens',
  })
  id: string;

  @Index('IDX_refresh_tokens_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_refresh_tokens_user_id',
  })
  user?: User;

  /** sha256 (hex) của token trong cookie; không lưu token gốc. */
  @Index('UQ_refresh_tokens_token_hash', { unique: true })
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash: string;

  /** Các token xoay từ cùng một lần đăng nhập. */
  @Index('IDX_refresh_tokens_family_id')
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /** Token thay thế khi xoay; `null` nếu bị thu hồi do đăng xuất/đổi mật khẩu. */
  @Column({ name: 'replaced_by_id', type: 'uuid', nullable: true })
  replacedById: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
