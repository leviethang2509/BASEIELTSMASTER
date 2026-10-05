import type {
  CalendarFeed,
  CalendarRangeQuery,
  ClassItemAttemptRow,
  LearnerClassDetail,
  LearnerClassItem,
  StartClassItemResult,
  VoidClassAttemptResult,
} from '@lang/shared';
import { api } from './api';

// Học viên trong lớp (req-3 Step 9): lớp của tôi, trang lớp, bắt đầu mục,
// lịch học của tôi; giáo viên "Cho làm lại" một lượt thi của mục.

const base = (slug: string) => `/t/${slug}/learner`;

/** Trang lớp của học viên (khu vực chính, không phải dashboard). */
export const learnerClassPath = (slug: string, classId: string) =>
  `/t/${slug}/classes/${classId}`;
/** "Lịch học của tôi". */
export const learnerSchedulePath = (slug: string) => `/t/${slug}/schedule`;

export const listMyClasses = (slug: string) =>
  api.get<LearnerClassItem[]>(`${base(slug)}/classes`);

export const getMyClass = (slug: string, classId: string) =>
  api.get<LearnerClassDetail>(`${base(slug)}/classes/${classId}`);

/** Mở mục: tạo lượt thi mới hoặc mở lại lượt học bài học. */
export const startClassItem = (slug: string, classId: string, itemId: string) =>
  api.post<StartClassItemResult>(
    `${base(slug)}/classes/${classId}/items/${itemId}/start`,
  );

export const getMyClassSchedule = (slug: string, range: CalendarRangeQuery) =>
  api.get<CalendarFeed>(
    `${base(slug)}/schedule?from=${range.from}&to=${range.to}`,
  );

// --- Giáo viên của lớp ------------------------------------------------------

export const listItemAttempts = (
  slug: string,
  classId: string,
  itemId: string,
) =>
  api.get<ClassItemAttemptRow[]>(
    `/t/${slug}/classes/${classId}/items/${itemId}/attempts`,
  );

/** "Cho làm lại": huỷ lượt cũ để học viên thi lại mục này (R10.5). */
export const voidClassAttempt = (
  slug: string,
  classId: string,
  itemId: string,
  attemptId: string,
) =>
  api.post<VoidClassAttemptResult>(
    `/t/${slug}/classes/${classId}/items/${itemId}/void/${attemptId}`,
  );
