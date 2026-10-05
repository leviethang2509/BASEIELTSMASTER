import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../common/decorators/current-user.decorator';
import {
  ALLOW_PENDING_PASSWORD_CHANGE_KEY,
  IS_PUBLIC_KEY,
} from '../decorators';
import { IdentityProviderClient } from '../identity-provider.client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: IdentityProviderClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Ban chua dang nhap');
    }

    const auth = await this.identity.introspect(token, clientInfo(request));
    if (!auth.active || !auth.userId || !auth.email || !auth.systemRole) {
      throw new UnauthorizedException('Phien dang nhap khong con hieu luc');
    }

    if (
      auth.mustChangePassword &&
      !this.reflector.getAllAndOverride<boolean>(
        ALLOW_PENDING_PASSWORD_CHANGE_KEY,
        targets,
      )
    ) {
      throw new ForbiddenException('Ban can doi mat khau truoc khi tiep tuc');
    }

    request.accessToken = token;
    request.authContext = auth;
    request.user = {
      id: auth.userId,
      email: auth.email,
      systemRole: auth.systemRole,
    };
    return true;
  }
}

function readBearerToken(request: AuthenticatedRequest): string | null {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme === 'Bearer' && token ? token : null;
}

function clientInfo(request: AuthenticatedRequest) {
  const headers = request.headers ?? {};
  const forwarded = headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const userAgent = request.get?.('user-agent') ?? headers['user-agent'];
  return {
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : null,
    ip: (ip ?? request.ip)?.slice(0, 64) ?? null,
  };
}
