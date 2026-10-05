import type {
  CalendarFeed,
  CancelClassSessionInput,
  ClassScheduleView,
  ClassSessionDetail,
  ClassSessionView,
  CreateMakeupSessionInput,
  HolidayImpact,
  HolidayImpactInput,
  HolidayInput,
  MemberScheduleConflicts,
  SaveClassScheduleInput,
  SaveSessionLinksInput,
  ScheduleChangeSummary,
  TenantTrainingSettings,
  UpdateClassSessionInput,
  UpdateTenantSettingsInput,
} from '@lang/shared';
import { api } from './api';

// Thời khoá biểu lớp, buổi học, lịch và cài đặt trung tâm (req-3 Step 8).

const classPath = (slug: string, id: string) => `/t/${slug}/classes/${id}`;
const sessionPath = (slug: string, classId: string, sessionId: string) =>
  `${classPath(slug, classId)}/sessions/${sessionId}`;

/** Trang trong dashboard. */
export const schedulePagePath = (slug: string) =>
  `/t/${slug}/dashboard/schedule`;
export const sessionDetailPath = (slug: string, id: string) =>
  `/t/${slug}/dashboard/sessions/${id}`;
export const settingsPagePath = (slug: string) =>
  `/t/${slug}/dashboard/settings`;

export const getClassSchedule = (slug: string, id: string) =>
  api.get<ClassScheduleView>(`${classPath(slug, id)}/schedule`);

export const previewClassSchedule = (
  slug: string,
  id: string,
  input: SaveClassScheduleInput,
) =>
  api.post<ScheduleChangeSummary>(
    `${classPath(slug, id)}/schedule/preview`,
    input,
  );

export const saveClassSchedule = (
  slug: string,
  id: string,
  input: SaveClassScheduleInput,
) => api.put<ClassScheduleView>(`${classPath(slug, id)}/schedule`, input);

export const getMemberConflicts = (
  slug: string,
  id: string,
  membershipIds: string[],
) =>
  api.post<MemberScheduleConflicts[]>(`${classPath(slug, id)}/conflicts`, {
    membershipIds,
  });

export const createMakeupSession = (
  slug: string,
  classId: string,
  input: CreateMakeupSessionInput,
) =>
  api.post<ClassSessionView>(
    `${classPath(slug, classId)}/sessions/makeup`,
    input,
  );

export const updateSession = (
  slug: string,
  classId: string,
  sessionId: string,
  input: UpdateClassSessionInput,
) => api.patch<ClassSessionView>(sessionPath(slug, classId, sessionId), input);

export const cancelSession = (
  slug: string,
  classId: string,
  sessionId: string,
  input: CancelClassSessionInput,
) =>
  api.post<ClassSessionView>(
    `${sessionPath(slug, classId, sessionId)}/cancel`,
    input,
  );

export const restoreSession = (
  slug: string,
  classId: string,
  sessionId: string,
) =>
  api.post<ClassSessionView>(
    `${sessionPath(slug, classId, sessionId)}/restore`,
    {},
  );

export const deleteMakeupSession = (
  slug: string,
  classId: string,
  sessionId: string,
) => api.delete<void>(sessionPath(slug, classId, sessionId));

export const saveSessionLinks = (
  slug: string,
  classId: string,
  sessionId: string,
  input: SaveSessionLinksInput,
) =>
  api.put<ClassSessionView>(
    `${sessionPath(slug, classId, sessionId)}/links`,
    input,
  );

export const getSessionDetail = (slug: string, sessionId: string) =>
  api.get<ClassSessionDetail>(`/t/${slug}/sessions/${sessionId}`);

function rangeQuery(range: { from: string; to: string }, extra = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...range, ...extra })) {
    if (value) params.set(key, String(value));
  }
  return params.toString();
}

export const getMySchedule = (
  slug: string,
  range: { from: string; to: string },
) => api.get<CalendarFeed>(`/t/${slug}/schedule/mine?${rangeQuery(range)}`);

export const getCenterSchedule = (
  slug: string,
  range: { from: string; to: string },
  filter: { courseId?: string; teacherId?: string },
) =>
  api.get<CalendarFeed>(
    `/t/${slug}/schedule/center?${rangeQuery(range, filter)}`,
  );

export const getCourseSchedule = (
  slug: string,
  courseId: string,
  range: { from: string; to: string },
) =>
  api.get<CalendarFeed>(
    `/t/${slug}/courses/${courseId}/sessions?${rangeQuery(range)}`,
  );

export const getTenantSettings = (slug: string) =>
  api.get<TenantTrainingSettings>(`/t/${slug}/settings`);

export const updateTenantSettings = (
  slug: string,
  input: UpdateTenantSettingsInput,
) => api.patch<TenantTrainingSettings>(`/t/${slug}/settings`, input);

export const createHoliday = (slug: string, input: HolidayInput) =>
  api.post<TenantTrainingSettings>(`/t/${slug}/settings/holidays`, input);

export const updateHoliday = (slug: string, id: string, input: HolidayInput) =>
  api.patch<TenantTrainingSettings>(
    `/t/${slug}/settings/holidays/${id}`,
    input,
  );

export const deleteHoliday = (slug: string, id: string) =>
  api.delete<TenantTrainingSettings>(`/t/${slug}/settings/holidays/${id}`);

export const holidayImpact = (slug: string, input: HolidayImpactInput) =>
  api.post<HolidayImpact>(`/t/${slug}/settings/holidays/impact`, input);
