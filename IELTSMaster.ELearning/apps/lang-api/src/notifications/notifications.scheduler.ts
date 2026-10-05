import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { sweepClassItems } from './notification-sweep';
import { NotificationsService } from './notifications.service';

/**
 * Cron của thông báo (R18.4–5): 15 phút một lần sinh thông báo mục vừa mở, sắp
 * hết hạn và quá hạn; mỗi ngày xoá thông báo quá 90 ngày.
 */
@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);
  private sweeping = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 */15 * * * *')
  async sweep(): Promise<void> {
    // Lần trước chưa xong thì bỏ qua, không chạy chồng.
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const counts = await sweepClassItems(
        this.dataSource.manager,
        this.notifications,
      );
      const total = counts.opened + counts.deadlineSoon + counts.overdue;
      if (total > 0) {
        this.logger.log(
          `Đã gửi ${total} thông báo (mở ${counts.opened}, sắp hết hạn ${counts.deadlineSoon}, quá hạn ${counts.overdue})`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Quét mốc giáo trình lớp thất bại',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.sweeping = false;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purge(): Promise<void> {
    try {
      const removed = await this.notifications.purgeOld();
      if (removed > 0) this.logger.log(`Đã xoá ${removed} thông báo cũ`);
    } catch (error) {
      this.logger.error(
        'Xoá thông báo cũ thất bại',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
