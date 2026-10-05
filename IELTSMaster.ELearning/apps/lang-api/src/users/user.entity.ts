import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  Gender,
  SystemRole,
  UserStatus,
} from '@lang/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { sqlInList } from '../common/sql';

@Entity('users')
// Unique không phân biệt hoa thường, bỏ qua user đã xoá mềm. Index biểu thức
// không khai báo được bằng entity nên tạo trong migration và bỏ qua khi generate.
@Index('UQ_users_email', { synchronize: false })
@Check('CHK_users_email_lowercase', '"email" = lower("email")')
@Check('CHK_users_gender', `"gender" IS NULL OR ${sqlInList('gender', Gender)}`)
@Check('CHK_users_system_role', sqlInList('system_role', SystemRole))
@Check('CHK_users_status', sqlInList('status', UserStatus))
export class User {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_users' })
  id: string;

  /** Luôn lưu chữ thường (`normalizeEmail`). */
  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  /** TypeORM trả cột `date` về dạng chuỗi `YYYY-MM-DD`. */
  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: Gender | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 1024, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 10, default: DEFAULT_LOCALE })
  locale: string;

  @Column({ type: 'varchar', length: 64, default: DEFAULT_TIMEZONE })
  timezone: string;

  @Column({
    name: 'system_role',
    type: 'varchar',
    length: 32,
    default: SystemRole.REGISTERED_USER,
  })
  systemRole: SystemRole;

  @Column({ type: 'varchar', length: 16, default: UserStatus.ACTIVE })
  status: UserStatus;

  /** Account do admin tạo với mật khẩu tạm: bắt đổi mật khẩu khi đăng nhập. */
  @Column({ name: 'must_change_password', type: 'boolean', default: false })
  mustChangePassword: boolean;

  /** Tăng khi đổi mật khẩu để vô hiệu mọi access token đã phát (claim `tv`). */
  @Column({ name: 'token_version', type: 'integer', default: 0 })
  tokenVersion: number;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
