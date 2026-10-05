import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  NOTIFICATION_RETENTION_DAYS,
  type NotificationItem,
  type NotificationList,
  type NotificationParams,
  type NotificationType,
  type NotificationUnreadCount,
} from '@lang/shared';
import { IsNull, LessThan, Repository, type EntityManager } from 'typeorm';
import { toSkipTake, type PaginationQueryDto } from '../common/pagination';
import { Notification } from './notification.entity';

/** Một sự kiện gửi cho nhiều người trong cùng một trung tâm. */
export interface NotifyInput {
  /** Người nhận (user, không phải membership); trùng lặp được bỏ qua. */
  userIds: readonly string[];
  /** `null` khi thông báo không thuộc trung tâm nào. */
  tenantId: string | null;
  type: NotificationType;
  params?: NotificationParams;
  /** Đường dẫn trong ứng dụng, đã kèm `/t/{slug}`. */
  link?: string | null;
  /**
   * Khoá chống trùng (unique theo user): cron chạy lại hay lưu lại cùng một
   * thay đổi không tạo thêm thông báo.
   */
  dedupeKey?: string | null;
  /** Người gây ra sự kiện: không tự nhận thông báo của chính mình. */
  exceptUserId?: string | null;
}

export interface NotificationQuery extends PaginationQueryDto {
  unread?: boolean;
}

/**
 * Thông báo trong ứng dụng (R18). `notify` nhận `manager` để chạy trong
 * transaction của service gọi: sự kiện và thông báo cùng thành công hoặc cùng
 * huỷ. Chèn bằng `ON CONFLICT DO NOTHING` nên `dedupeKey` trùng thì bỏ qua,
 * không làm hỏng transaction.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  async notify(manager: EntityManager, input: NotifyInput): Promise<number> {
    const userIds = [...new Set(input.userIds)].filter(
      (userId) => userId !== input.exceptUserId,
    );
    if (userIds.length === 0) return 0;

    const { identifiers } = await manager
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values(
        userIds.map((userId) => ({
          userId,
          tenantId: input.tenantId,
          type: input.type,
          params: input.params ?? {},
          link: input.link ?? null,
          dedupeKey: input.dedupeKey ?? null,
          readAt: null,
        })),
      )
      .orIgnore()
      .execute();
    return identifiers.filter(Boolean).length;
  }

  async list(
    userId: string,
    query: NotificationQuery,
  ): Promise<NotificationList> {
    const where = {
      userId,
      ...(query.unread ? { readAt: IsNull() } : {}),
    };
    const [rows, total] = await this.notifications.findAndCount({
      where,
      relations: { tenant: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      ...toSkipTake(query),
    });
    return {
      items: rows.map(toItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
      unreadCount: await this.countUnread(userId),
    };
  }

  async unreadCount(userId: string): Promise<NotificationUnreadCount> {
    return { unreadCount: await this.countUnread(userId) };
  }

  async markRead(userId: string, id: string): Promise<NotificationUnreadCount> {
    const { affected } = await this.notifications.update(
      { id, userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    // Không có dòng nào đổi: đã đọc rồi thì thôi, không có thật mới báo lỗi.
    if (!affected && !(await this.notifications.existsBy({ id, userId }))) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }
    return this.unreadCount(userId);
  }

  async markAllRead(userId: string): Promise<NotificationUnreadCount> {
    await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { unreadCount: 0 };
  }

  /** Cron hằng ngày: xoá thông báo cũ hơn 90 ngày (R18.4). */
  async purgeOld(now = new Date()): Promise<number> {
    const limit = new Date(
      now.getTime() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const { affected } = await this.notifications.delete({
      createdAt: LessThan(limit),
    });
    return affected ?? 0;
  }

  private countUnread(userId: string): Promise<number> {
    return this.notifications.countBy({ userId, readAt: IsNull() });
  }
}

function toItem(row: Notification): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    params: row.params ?? {},
    link: row.link,
    tenantName: row.tenant?.name ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
