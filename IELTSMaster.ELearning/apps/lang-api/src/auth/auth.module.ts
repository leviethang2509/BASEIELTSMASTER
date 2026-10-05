import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SystemRolesGuard } from './guards/system-roles.guard';
import { IdentityProviderClient } from './identity-provider.client';
import { RefreshToken } from './refresh-token.entity';

@Module({
  imports: [
    UsersModule,
    // SSO: bảng refresh_tokens cục bộ không còn dùng (phiên nằm ở auth.refresh_tokens),
    // giữ đăng ký entity để không phát sinh thay đổi schema; xoá ở phase sau.
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    IdentityProviderClient,
    // Thứ tự đăng ký = thứ tự chạy: xác thực trước, kiểm tra role sau.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: SystemRolesGuard },
  ],
})
export class AuthModule {}
