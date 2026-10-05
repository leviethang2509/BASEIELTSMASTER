import type {
  CalendarFeed,
  CalendarRangeQuery,
  ChildClassDetail,
  ChildOverview,
  GuardianChild,
} from '@lang/shared';
import { api } from './api';

// Khu vực phụ huynh "Con của tôi" (req-3 Step 13, R19). Mọi route kiểm liên
// kết `student_guardians` ở server; học viên không liên kết trả 404.

const base = (slug: string) => `/t/${slug}/children`;

export const childrenPath = (slug: string) => `/t/${slug}/children`;
export const childPath = (slug: string, membershipId: string) =>
  `/t/${slug}/children/${membershipId}`;
export const childClassPath = (
  slug: string,
  membershipId: string,
  classId: string,
) => `/t/${slug}/children/${membershipId}/classes/${classId}`;

export const listMyChildren = (slug: string) =>
  api.get<GuardianChild[]>(base(slug));

export const getChild = (slug: string, membershipId: string) =>
  api.get<ChildOverview>(`${base(slug)}/${membershipId}`);

export const getChildClass = (
  slug: string,
  membershipId: string,
  classId: string,
) =>
  api.get<ChildClassDetail>(`${base(slug)}/${membershipId}/classes/${classId}`);

export const getChildSchedule = (
  slug: string,
  membershipId: string,
  range: CalendarRangeQuery,
) =>
  api.get<CalendarFeed>(
    `${base(slug)}/${membershipId}/schedule?from=${range.from}&to=${range.to}`,
  );
