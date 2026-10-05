import { Module } from '@nestjs/common';
import { AdminUserManualController } from './admin-user-manual.controller';

/** Tài liệu nội bộ `/user-manual` (req-2): nội dung JSON tĩnh, không dùng DB. */
@Module({
  controllers: [AdminUserManualController],
})
export class UserManualModule {}
