import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  REFRESH_TOKEN_COOKIE,
  type AuthResponse,
  type AuthUser,
} from '@lang/shared';
import type { CookieOptions, Request, Response } from 'express';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { durationToSeconds } from '../common/duration';
import type { EnvironmentVariables } from '../config/env.validation';
import { AuthService, type ClientInfo, type Session } from './auth.service';
import { AllowPendingPasswordChange, Public } from './decorators';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  SwitchTenantDto,
} from './dto/auth.dto';

function clientInfo(request: Request): ClientInfo {
  return {
    userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
    ip: request.ip?.slice(0, 64) ?? null,
  };
}

function readRefreshCookie(request: Request): string | undefined {
  const value: unknown = request.cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof value === 'string' && value ? value : undefined;
}

@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;
  private readonly cookieMaxAgeMs: number;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    // path=/ và SameSite=Lax để middleware của Next đọc được cookie.
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
    };
    this.cookieMaxAgeMs =
      durationToSeconds(config.get('REFRESH_EXPIRES_IN', { infer: true })) *
      1000;
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const session = await this.auth.register(dto, clientInfo(request));
    return this.setSession(response, session);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const session = await this.auth.login(dto, clientInfo(request));
    return this.setSession(response, session);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    try {
      const session = await this.auth.refresh(
        readRefreshCookie(request),
        clientInfo(request),
      );
      return this.setSession(response, session);
    } catch (error) {
      // Cookie hỏng/hết hạn: xoá để middleware không coi là còn phiên.
      if (error instanceof UnauthorizedException) this.clearCookie(response);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(readRefreshCookie(request), clientInfo(request));
    this.clearCookie(response);
  }

  @AllowPendingPasswordChange()
  @Get('me')
  me(
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
  ): Promise<AuthUser> {
    const authHeader = request.get('authorization') || '';
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
    return this.auth.getMe(user.id, accessToken, clientInfo(request));
  }

  @AllowPendingPasswordChange()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() _user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    // JwtAuthGuard đã kiểm tra token; chuyển nguyên token sang AuthService.
    const accessToken = request.headers.authorization?.split(' ')[1] ?? '';
    const session = await this.auth.changePassword(
      accessToken,
      dto,
      readRefreshCookie(request),
      clientInfo(request),
    );
    return this.setSession(response, session);
  }

  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  async switchTenant(
    @CurrentUser() _user: RequestUser,
    @Body() dto: SwitchTenantDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const accessToken = request.headers.authorization?.split(' ')[1] ?? '';
    const session = await this.auth.switchTenant(
      accessToken,
      dto,
      clientInfo(request),
    );
    return this.setSession(response, session);
  }

  private setSession(response: Response, session: Session): AuthResponse {
    response.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, {
      ...this.cookieOptions,
      maxAge: this.cookieMaxAgeMs,
    });
    return { accessToken: session.accessToken, user: session.user };
  }

  private clearCookie(response: Response) {
    response.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieOptions);
  }
}
