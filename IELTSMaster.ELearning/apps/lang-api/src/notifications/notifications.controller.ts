import type { NotificationList, NotificationUnreadCount } from '@lang/shared';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes';
import { ListNotificationsQueryDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

/**
 * Thông báo của chính người đang đăng nhập (plan mục 6.2). Gộp mọi trung tâm
 * nên không đi qua `TenantGuard`; mọi truy vấn lọc theo `user.id`.
 */
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationList> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  unreadCount(
    @CurrentUser() user: RequestUser,
  ): Promise<NotificationUnreadCount> {
    return this.notifications.unreadCount(user.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  readAll(@CurrentUser() user: RequestUser): Promise<NotificationUnreadCount> {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  read(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<NotificationUnreadCount> {
    return this.notifications.markRead(user.id, id);
  }
}
