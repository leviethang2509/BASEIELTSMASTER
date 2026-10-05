import type {
  AttemptReview,
  ClassAttendance,
  ClassFinalComment,
  ClassGradebook,
  ClassStudentAttempts,
  ClassCurriculum,
  ClassLogEntry,
  ClassroomDetail,
  ClassroomListItem,
  ClassroomMembers,
  ClassroomStatus,
  CreateClassroomInput,
  MembershipListItem,
  Paginated,
  SaveClassCurriculumInput,
  SaveFinalCommentInput,
  TenantRole,
  UpdateClassroomInput,
} from '@lang/shared';
import { api } from './api';

// Lớp học (`/t/:slug/classes`): thông tin, giáo viên & học viên, giáo trình lớp,
// nhật ký thay đổi.

const classesPath = (slug: string) => `/t/${slug}/classes`;

/** Trang trong dashboard. */
export const classListPath = (slug: string) => `/t/${slug}/dashboard/classes`;
export const classDetailPath = (slug: string, id: string) =>
  `${classListPath(slug)}/${id}`;
/** Trang lớp mở sẵn tab Thời khoá biểu. */
export const classSchedulePath = (slug: string, id: string) =>
  `${classDetailPath(slug, id)}?tab=schedule`;

function withQuery(path: string, query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return `${path}?${params.toString()}`;
}

export interface ClassroomListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
  courseId?: string;
  teacherId?: string;
}

export const listClassrooms = (slug: string, query: ClassroomListQuery) =>
  api.get<Paginated<ClassroomListItem>>(withQuery(classesPath(slug), query));

export const getClassroom = (slug: string, id: string) =>
  api.get<ClassroomDetail>(`${classesPath(slug)}/${id}`);

export const createClassroom = (slug: string, input: CreateClassroomInput) =>
  api.post<ClassroomDetail>(classesPath(slug), input);

export const updateClassroom = (
  slug: string,
  id: string,
  input: UpdateClassroomInput,
) => api.patch<ClassroomDetail>(`${classesPath(slug)}/${id}`, input);

export const changeClassroomStatus = (
  slug: string,
  id: string,
  status: ClassroomStatus,
) => api.post<ClassroomDetail>(`${classesPath(slug)}/${id}/status`, { status });

export const deleteClassroom = (slug: string, id: string) =>
  api.delete<void>(`${classesPath(slug)}/${id}`);

export const getClassroomMembers = (slug: string, id: string) =>
  api.get<ClassroomMembers>(`${classesPath(slug)}/${id}/members`);

export const addClassroomTeachers = (
  slug: string,
  id: string,
  membershipIds: string[],
) =>
  api.post<ClassroomMembers>(`${classesPath(slug)}/${id}/teachers`, {
    membershipIds,
  });

export const removeClassroomTeacher = (
  slug: string,
  id: string,
  membershipId: string,
) => api.delete<void>(`${classesPath(slug)}/${id}/teachers/${membershipId}`);

export const addClassroomStudents = (
  slug: string,
  id: string,
  membershipIds: string[],
) =>
  api.post<ClassroomMembers>(`${classesPath(slug)}/${id}/students`, {
    membershipIds,
  });

export const removeClassroomStudent = (
  slug: string,
  id: string,
  membershipId: string,
) => api.delete<void>(`${classesPath(slug)}/${id}/students/${membershipId}`);

export const getClassCurriculum = (slug: string, id: string) =>
  api.get<ClassCurriculum>(`${classesPath(slug)}/${id}/curriculum`);

export const saveClassCurriculum = (
  slug: string,
  id: string,
  input: SaveClassCurriculumInput,
) => api.put<ClassCurriculum>(`${classesPath(slug)}/${id}/curriculum`, input);

export const listClassLogs = (
  slug: string,
  id: string,
  query: { page: number; pageSize: number },
) =>
  api.get<Paginated<ClassLogEntry>>(
    withQuery(`${classesPath(slug)}/${id}/logs`, query),
  );

/** Thành viên đang hoạt động có `role` (chọn giáo viên/học viên, Owner/Admin). */
export const listActiveMembers = (
  slug: string,
  role: TenantRole,
  q: string,
  pageSize = 50,
) =>
  api.get<Paginated<MembershipListItem>>(
    withQuery(`/t/${slug}/memberships`, {
      page: 1,
      pageSize,
      role,
      status: 'active',
      q,
    }),
  );

// --- Bài làm chi tiết của học viên (req-3 Step 10, F4) -----------------------

export const classStudentPath = (
  slug: string,
  id: string,
  membershipId: string,
) => `${classDetailPath(slug, id)}/students/${membershipId}`;

const studentBase = (slug: string, id: string, membershipId: string) =>
  `${classesPath(slug)}/${id}/students/${membershipId}`;

export const getClassStudentAttempts = (
  slug: string,
  id: string,
  membershipId: string,
) =>
  api.get<ClassStudentAttempts>(
    `${studentBase(slug, id, membershipId)}/attempts`,
  );

export const getClassStudentExamReview = (
  slug: string,
  id: string,
  membershipId: string,
  attemptId: string,
) =>
  api.get<AttemptReview>(
    `${studentBase(slug, id, membershipId)}/attempts/${attemptId}`,
  );

export const getClassStudentLessonReview = (
  slug: string,
  id: string,
  membershipId: string,
  attemptId: string,
) =>
  api.get<AttemptReview>(
    `${studentBase(slug, id, membershipId)}/lesson-attempts/${attemptId}`,
  );

export const getClassStudentExamRecordingUrl = (
  slug: string,
  id: string,
  membershipId: string,
  attemptId: string,
  answerId: string,
) =>
  api.get<{ url: string }>(
    `${studentBase(slug, id, membershipId)}/attempts/${attemptId}/recordings/${answerId}/url`,
  );

export const getClassStudentLessonRecordingUrl = (
  slug: string,
  id: string,
  membershipId: string,
  attemptId: string,
  answerId: string,
) =>
  api.get<{ url: string }>(
    `${studentBase(slug, id, membershipId)}/lesson-attempts/${attemptId}/recordings/${answerId}/url`,
  );

// --- Chuyên cần, bảng điểm, nhận xét cuối khoá (Step 11) --------------------

export const getClassAttendance = (slug: string, id: string) =>
  api.get<ClassAttendance>(`${classesPath(slug)}/${id}/progress/attendance`);

export const getClassGradebook = (slug: string, id: string) =>
  api.get<ClassGradebook>(`${classesPath(slug)}/${id}/progress/gradebook`);

/** Tải file Excel (2 sheet: Chuyên cần, Bảng điểm). */
export const downloadClassProgress = (slug: string, id: string) =>
  api.download(`${classesPath(slug)}/${id}/progress/export.xlsx`);

export const saveFinalComment = (
  slug: string,
  id: string,
  membershipId: string,
  text: string,
) =>
  api.put<ClassFinalComment | null>(
    `${studentBase(slug, id, membershipId)}/comment`,
    { text } satisfies SaveFinalCommentInput,
  );
