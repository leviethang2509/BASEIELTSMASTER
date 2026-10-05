import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';

/**
 * Thông báo trong ứng dụng (req-3 Step 12). Module không import module nghiệp
 * vụ nào (đọc bảng của lớp học qua `DataSource`) để các module gửi thông báo
 * import được nó mà không thành vòng.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
