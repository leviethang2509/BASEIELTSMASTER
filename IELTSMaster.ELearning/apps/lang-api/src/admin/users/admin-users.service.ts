import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  canManageUser,
  SystemRole,
  UserStatus,
  type AdminUser,
  type AdminUserPasswordResult,
} from '@lang/shared';
import { DataSource, IsNull, type Repository } from 'typeorm';
import { generateTemporaryPassword, hashPassword } from '../../auth/password';
import { RefreshToken } from '../../auth/refresh-token.entity';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { isUniqueViolation } from '../../common/database-errors';
import { toSkipTake, type Paginated } from '../../common/pagination';
import { escapeLike } from '../../common/sql';
import { User } from '../../users/user.entity';
import { toAdminUser } from './admin-user.mapper';
import type {
  ChangeSystemRoleDto,
  CreateUserDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/admin-user.dto';

const USER_NOT_FOUND = 'Không tìm thấy người dùng';
const EMAIL_TAKEN = 'Email đã được sử dụng';

/** Quản lý người dùng trong `/admin` (System Owner/Admin). Req-1 không xoá user. */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  async list(query: ListUsersQueryDto): Promise<Paginated<AdminUser>> {
    const { skip, take } = toSkipTake(query);
    const qb = this.users
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC')
      .addOrderBy('u.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.q) {
      qb.andWhere('(u.fullName ILIKE :q OR u.email ILIKE :q)', {
        q: `%${escapeLike(query.q)}%`,
      });
    }
    if (query.systemRole) {
      qb.andWhere('u.systemRole = :systemRole', {
        systemRole: query.systemRole,
      });
    }
    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map(toAdminUser),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string): Promise<AdminUser> {
    return toAdminUser(await findUser(this.users, id));
  }

  /** Tạo Registered User với mật khẩu tạm, bắt đổi mật khẩu khi đăng nhập lần đầu. */
  async create(dto: CreateUserDto): Promise<AdminUserPasswordResult> {
    if (await this.users.existsBy({ email: dto.email })) {
      throw new ConflictException(EMAIL_TAKEN);
    }
    const password = dto.password ?? generateTemporaryPassword();
    const passwordHash = await hashPassword(password);
    const user = await onEmailConflict(() =>
      this.users.save(
        this.users.create({
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          dateOfBirth: dto.dateOfBirth,
          gender: dto.gender ?? null,
          phone: dto.phone ?? null,
          address: dto.address ?? null,
          systemRole: SystemRole.REGISTERED_USER,
          status: UserStatus.ACTIVE,
          mustChangePassword: true,
        }),
      ),
    );
    return {
      user: toAdminUser(user),
      temporaryPassword: dto.password ? null : password,
    };
  }

  async update(
    actor: RequestUser,
    id: string,
    dto: UpdateUserDto,
  ): Promise<AdminUser> {
    const user = await this.findManageable(actor, id);
    if (
      dto.email !== undefined &&
      dto.email !== user.email &&
      (await this.users.existsBy({ email: dto.email }))
    ) {
      throw new ConflictException(EMAIL_TAKEN);
    }

    const changes: Partial<
      Pick<
        User,
        'email' | 'fullName' | 'dateOfBirth' | 'gender' | 'phone' | 'address'
      >
    > = {};
    if (dto.email !== undefined) changes.email = dto.email;
    if (dto.fullName !== undefined) changes.fullName = dto.fullName;
    if (dto.dateOfBirth !== undefined) changes.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) changes.gender = dto.gender;
    if (dto.phone !== undefined) changes.phone = dto.phone;
    if (dto.address !== undefined) changes.address = dto.address;

    if (Object.keys(changes).length > 0) {
      await onEmailConflict(() => this.users.update(id, changes));
    }
    return toAdminUser({ ...user, ...changes });
  }

  /** Khoá có hiệu lực ngay (guard kiểm `status`) và thu hồi mọi refresh token. */
  async setStatus(
    actor: RequestUser,
    id: string,
    status: UserStatus,
  ): Promise<AdminUser> {
    // Kiểm "chính mình" trước để System Admin nhận đúng thông báo.
    if (id === actor.id) {
      throw new ForbiddenException(
        'Không thể tự khoá hoặc mở khoá tài khoản của mình',
      );
    }
    const user = await this.findManageable(actor, id);
    if (user.status !== status) {
      await this.users.update(id, { status });
      // Mở khoá không làm các phiên cũ sống lại.
      if (status === UserStatus.LOCKED) await this.revokeSessions(id);
    }
    return toAdminUser({ ...user, status });
  }

  /** Đặt mật khẩu tạm, đăng xuất mọi phiên và bắt đổi mật khẩu ở lần đăng nhập sau. */
  async resetPassword(
    actor: RequestUser,
    id: string,
    dto: ResetPasswordDto,
  ): Promise<AdminUserPasswordResult> {
    if (id === actor.id) {
      throw new BadRequestException(
        'Hãy đổi mật khẩu của bạn tại trang Tài khoản',
      );
    }
    const user = await this.findManageable(actor, id);
    const password = dto.password ?? generateTemporaryPassword();
    const changes = {
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      tokenVersion: user.tokenVersion + 1,
    };
    await this.users.update(id, changes);
    await this.revokeSessions(id);
    return {
      user: toAdminUser({ ...user, ...changes }),
      temporaryPassword: dto.password ? null : password,
    };
  }

  /**
   * Đổi vai trò hệ thống (chỉ System Owner, kiểm ở controller). Không cho hạ
   * quyền System Owner đang hoạt động cuối cùng, kể cả tự hạ.
   */
  changeSystemRole(id: string, dto: ChangeSystemRoleDto): Promise<AdminUser> {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      // Khoá các dòng Owner để hai lượt hạ quyền đồng thời không cùng lọt qua.
      const owners = await users.find({
        where: { systemRole: SystemRole.SYSTEM_OWNER },
        lock: { mode: 'pessimistic_write' },
      });
      const user = await findUser(users, id);
      if (user.systemRole === dto.systemRole) return toAdminUser(user);

      const hasOtherActiveOwner = owners.some(
        (owner) => owner.id !== user.id && owner.status === UserStatus.ACTIVE,
      );
      if (user.systemRole === SystemRole.SYSTEM_OWNER && !hasOtherActiveOwner) {
        throw new ConflictException(
          'Hệ thống cần ít nhất một System Owner đang hoạt động',
        );
      }
      await users.update(id, { systemRole: dto.systemRole });
      return toAdminUser({ ...user, systemRole: dto.systemRole });
    });
  }

  private async findManageable(actor: RequestUser, id: string): Promise<User> {
    const user = await findUser(this.users, id);
    if (!canManageUser(actor.systemRole, user.systemRole)) {
      throw new ForbiddenException(
        'Chỉ System Owner được thao tác trên tài khoản quản trị hệ thống',
      );
    }
    return user;
  }

  private async revokeSessions(userId: string): Promise<void> {
    await this.refreshTokens.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}

async function findUser(repository: Repository<User>, id: string) {
  const user = await repository.findOneBy({ id });
  if (!user) throw new NotFoundException(USER_NOT_FOUND);
  return user;
}

async function onEmailConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictException(EMAIL_TAKEN);
    throw error;
  }
}
