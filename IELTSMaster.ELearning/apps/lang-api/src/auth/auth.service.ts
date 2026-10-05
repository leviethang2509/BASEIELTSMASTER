import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type AuthUser } from '@lang/shared';
import type { Repository } from 'typeorm';
import { toAuthUser } from '../users/auth-user';
import { User } from '../users/user.entity';
import type {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  SwitchTenantDto,
} from './dto/auth.dto';
import {
  IdentityProviderClient,
  type IdentitySession,
} from './identity-provider.client';

export interface ClientInfo {
  userAgent: string | null;
  ip: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const INVALID_SESSION = 'Phien dang nhap da het han, vui long dang nhap lai';

/**
 * SSO: login/register/refresh/logout/change-password all go through AuthService.
 * Access token validity and role context are checked by AuthService introspection.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly identity: IdentityProviderClient,
  ) {}

  async register(dto: RegisterDto, client: ClientInfo): Promise<Session> {
    return this.toSession(
      await this.identity.register(
        {
          email: dto.email,
          password: dto.password,
          fullName: dto.fullName,
          dateOfBirth: dto.dateOfBirth,
        },
        client,
      ),
    );
  }

  async login(dto: LoginDto, client: ClientInfo): Promise<Session> {
    return this.toSession(
      await this.identity.login(
        { email: dto.email, password: dto.password },
        client,
      ),
    );
  }

  async refresh(
    rawToken: string | undefined,
    client: ClientInfo,
  ): Promise<Session> {
    if (!rawToken) throw new UnauthorizedException(INVALID_SESSION);
    return this.toSession(await this.identity.refresh(rawToken, client));
  }

  async logout(
    rawToken: string | undefined,
    client?: ClientInfo,
  ): Promise<void> {
    if (!rawToken) return;
    await this.identity.logout(
      rawToken,
      client ?? { userAgent: null, ip: null },
    );
  }

  async getMe(
    userId: string,
    accessToken?: string,
    client?: ClientInfo,
  ): Promise<AuthUser> {
    if (accessToken) {
      try {
        const authUser = await this.identity.me(
          accessToken,
          client ?? { userAgent: null, ip: null },
        );
        if (authUser && authUser.id) {
          return authUser;
        }
      } catch {
        // Fallback sang local DB neu AuthService tam thoi khong phan hoi
      }
    }

    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException(INVALID_SESSION);
    return toAuthUser(user);
  }

  async changePassword(
    accessToken: string,
    dto: ChangePasswordDto,
    rawToken: string | undefined,
    client: ClientInfo,
  ): Promise<Session> {
    return this.toSession(
      await this.identity.changePassword(
        { currentPassword: dto.currentPassword, newPassword: dto.newPassword },
        accessToken,
        rawToken,
        client,
      ),
    );
  }

  async switchTenant(
    accessToken: string,
    dto: SwitchTenantDto,
    client: ClientInfo,
  ): Promise<Session> {
    return this.toSession(
      await this.identity.switchTenant(
        { tenantSlug: dto.tenantSlug },
        accessToken,
        client,
      ),
    );
  }

  private toSession(session: IdentitySession | undefined): Session {
    if (!session?.accessToken || !session.user) {
      throw new UnauthorizedException(INVALID_SESSION);
    }
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    };
  }
}
