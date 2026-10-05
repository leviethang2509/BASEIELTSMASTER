import 'reflect-metadata';
import { NotificationType } from '@lang/shared';
import { NotFoundException } from '@nestjs/common';
import { Tenant } from '../tenants/tenant.entity';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';

const ME = 'user-me';
const OTHER = 'user-other';

function setup() {
  const notifications = new InMemoryRepository<Notification>();
  const service = new NotificationsService(notifications.asRepository());
  const add = (row: Partial<Notification>) => {
    const id = row.id ?? `n-${notifications.rows.length + 1}`;
    notifications.rows.push({
      id,
      userId: ME,
      tenantId: 'tenant-a',
      tenant: { name: 'Trung tâm A' } as Tenant,
      type: NotificationType.CLASS_STUDENT_ADDED,
      params: { className: 'N5-01' },
      link: '/t/a/classes/c1',
      dedupeKey: null,
      readAt: null,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      ...row,
    } as Notification);
    return id;
  };
  return { service, notifications, add };
}

describe('NotificationsService', () => {
  it('danh sách của mình, mới nhất trước, có tên trung tâm và số chưa đọc', async () => {
    const { service, add } = setup();
    add({ id: 'cu', createdAt: new Date('2026-09-01T00:00:00Z') });
    add({ id: 'moi', createdAt: new Date('2026-09-10T00:00:00Z') });
    add({ id: 'da-doc', readAt: new Date('2026-09-11T00:00:00Z') });
    add({ id: 'cua-nguoi-khac', userId: OTHER });

    const list = await service.list(ME, { page: 1, pageSize: 20 });
    expect(list.items.map((item) => item.id)).toEqual(['moi', 'da-doc', 'cu']);
    expect(list.total).toBe(3);
    expect(list.unreadCount).toBe(2);
    expect(list.items[0].tenantName).toBe('Trung tâm A');
    expect(list.items[0].params.className).toBe('N5-01');
  });

  it('lọc chưa đọc và phân trang', async () => {
    const { service, add } = setup();
    add({ id: 'a', createdAt: new Date('2026-09-01T00:00:00Z') });
    add({ id: 'b', createdAt: new Date('2026-09-02T00:00:00Z') });
    add({ id: 'c', readAt: new Date() });

    const unread = await service.list(ME, {
      page: 1,
      pageSize: 1,
      unread: true,
    });
    expect(unread.items.map((item) => item.id)).toEqual(['b']);
    expect(unread.total).toBe(2);
  });

  it('đánh dấu đã đọc từng cái và tất cả; thông báo của người khác → 404', async () => {
    const { service, notifications, add } = setup();
    add({ id: 'a' });
    add({ id: 'b' });
    add({ id: 'khac', userId: OTHER });

    expect(await service.markRead(ME, 'a')).toEqual({ unreadCount: 1 });
    // Đọc lại cái đã đọc không lỗi.
    expect(await service.markRead(ME, 'a')).toEqual({ unreadCount: 1 });
    await expect(service.markRead(ME, 'khac')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(await service.markAllRead(ME)).toEqual({ unreadCount: 0 });
    expect(
      notifications.rows.find((row) => row.id === 'khac')!.readAt,
    ).toBeNull();
  });

  it('cron dọn: xoá thông báo cũ hơn 90 ngày', async () => {
    const { service, notifications, add } = setup();
    add({ id: 'cu', createdAt: new Date('2026-06-01T00:00:00Z') });
    add({ id: 'moi', createdAt: new Date('2026-09-10T00:00:00Z') });

    expect(await service.purgeOld(new Date('2026-09-20T00:00:00Z'))).toBe(1);
    expect(notifications.rows.map((row) => row.id)).toEqual(['moi']);
  });
});
