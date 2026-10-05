import type { NotifyInput } from '../notifications/notifications.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * `NotificationsService` giả cho unit test service: ghi lại lời gọi `notify`
 * (repository trong bộ nhớ không mô phỏng `ON CONFLICT DO NOTHING`).
 */
export interface FakeNotifications {
  service: NotificationsService;
  sent: NotifyInput[];
  /** Lời gọi của một loại thông báo. */
  ofType(type: string): NotifyInput[];
}

export function fakeNotifications(): FakeNotifications {
  const sent: NotifyInput[] = [];
  const service = {
    notify: async (_manager: unknown, input: NotifyInput) => {
      sent.push(input);
      return input.userIds.length;
    },
  } as unknown as NotificationsService;
  return {
    service,
    sent,
    ofType: (type) => sent.filter((input) => input.type === type),
  };
}
