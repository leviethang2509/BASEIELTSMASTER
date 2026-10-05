import { NotificationType, type NotificationItem } from '@lang/shared';
import { vi } from '@/i18n/vi';
import { formatDate, formatDateTime } from '@/lib/format';

const t = vi.notifications.types;

/**
 * Câu chữ của một thông báo dựng ở client từ `type` + `params` (giả định 11):
 * đổi câu chữ không cần migration. Loại lạ (bản cũ của client) hiện chuỗi rỗng
 * → `NotificationRow` bỏ qua dòng đó.
 */
export function notificationText(item: NotificationItem): string {
  const {
    className = '',
    title = '',
    actorName = '',
    count = 1,
    childName = '',
    percent = 0,
  } = item.params;
  const at = item.params.at;
  const session = vi.notifications.session(item.params.seq);
  switch (item.type) {
    case NotificationType.CLASS_STUDENT_ADDED:
      return t.class_student_added(className);
    case NotificationType.CLASS_TEACHER_ADDED:
      return t.class_teacher_added(className);
    case NotificationType.CLASS_ITEMS_ASSIGNED:
      return t.class_items_assigned(className, title, count);
    case NotificationType.RETAKE_ASSIGNED:
      return t.retake_assigned(className, title);
    case NotificationType.CLASS_ITEM_OPENED:
      return t.class_item_opened(className, title);
    case NotificationType.ITEM_DEADLINE_SOON:
      return t.item_deadline_soon(className, title, formatDateTime(at));
    case NotificationType.ITEM_OVERDUE:
      return t.item_overdue(className, title, formatDateTime(at));
    case NotificationType.ATTEMPT_GRADED:
      return t.attempt_graded(title);
    case NotificationType.SESSION_CANCELLED:
      return t.session_cancelled(className, session, formatDate(at));
    case NotificationType.SESSIONS_MOVED:
      return t.sessions_moved(className, count, formatDate(at));
    case NotificationType.SESSION_MAKEUP_ADDED:
      return t.session_makeup_added(className, formatDateTime(at));
    case NotificationType.SESSION_TEACHER_ASSIGNED:
      return t.session_teacher_assigned(className, session, formatDate(at));
    case NotificationType.GRADING_PENDING:
      return t.grading_pending(title, actorName);
    case NotificationType.GRADING_DELEGATED:
      return t.grading_delegated(title, actorName);
    case NotificationType.CLASS_CURRICULUM_CHANGED:
      return t.class_curriculum_changed(className);
    case NotificationType.FINAL_COMMENT_PUBLISHED:
      return t.final_comment_published(className);
    case NotificationType.CHILD_ITEM_OVERDUE:
      return t.child_item_overdue(
        childName,
        className,
        title,
        formatDateTime(at),
      );
    case NotificationType.CHILD_ATTEMPT_GRADED:
      return t.child_attempt_graded(childName, title);
    case NotificationType.CHILD_ATTENDANCE_LOW:
      // `count` mang ngưỡng cảnh báo hiệu lực của lớp.
      return t.child_attendance_low(childName, className, percent, count);
    default:
      return '';
  }
}
