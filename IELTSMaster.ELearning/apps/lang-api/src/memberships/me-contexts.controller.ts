import { Controller, Get, Req } from '@nestjs/common';
import type { MeContexts } from '@lang/shared';
import type { Request } from 'express';
import { IdentityProviderClient } from '../auth/identity-provider.client';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';

@Controller('me')
export class MeContextsController {
  constructor(private readonly identity: IdentityProviderClient) {}

  /** Switcher va trang "Khong gian cua toi" dung ngu canh tu AuthService. */
  @Get('contexts')
  contexts(
    @CurrentUser() _user: RequestUser,
    @Req() request: Request & { accessToken?: string },
  ): Promise<MeContexts> {
    return this.identity.contexts(
      request.accessToken ?? '',
      clientInfo(request),
    );
  }
}

function clientInfo(request: Request) {
  const headers = request.headers ?? {};
  const forwarded = headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const userAgent = request.get?.('user-agent') ?? headers['user-agent'];
  return {
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : null,
    ip: (ip ?? request.ip)?.slice(0, 64) ?? null,
  };
}
