import type {
  CreateLessonInput,
  ExamUserRef,
  LessonDetail,
  LessonListItem,
  LessonVersionDetail,
  LessonVersionList,
  Paginated,
  SaveLessonContentInput,
  UpdateLessonInput,
} from '@lang/shared';
import { api } from './api';

// Bài học của tenant (`/t/:slug/lessons`). Lỗi nội dung 422 đọc bằng
// `contentIssuesOf` của `exam-api` (cùng dạng `ExamContentIssue`).

export const lessonsPath = (slug: string) => `/t/${slug}/lessons`;

/** Trang danh sách / trình soạn / version trong dashboard. */
export const lessonListPath = (slug: string) => `/t/${slug}/dashboard/lessons`;
export const lessonEditPath = (slug: string, id: string) =>
  `/t/${slug}/dashboard/lessons/${id}/edit`;
export const lessonVersionsPath = (slug: string, id: string) =>
  `/t/${slug}/dashboard/lessons/${id}/versions`;

export interface LessonListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
  categoryId?: string;
  blueprintId?: string;
  createdBy?: string;
}

export function listLessons(
  slug: string,
  query: LessonListQuery,
): Promise<Paginated<LessonListItem>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return api.get(`${lessonsPath(slug)}?${params.toString()}`);
}

export const listLessonCreators = (slug: string) =>
  api.get<ExamUserRef[]>(`${lessonsPath(slug)}/creators`);

export const createLesson = (slug: string, input: CreateLessonInput) =>
  api.post<LessonDetail>(lessonsPath(slug), input);

export const getLesson = (slug: string, id: string) =>
  api.get<LessonDetail>(`${lessonsPath(slug)}/${id}`);

export const updateLesson = (
  slug: string,
  id: string,
  input: UpdateLessonInput,
) => api.patch<LessonDetail>(`${lessonsPath(slug)}/${id}`, input);

export const saveLessonContent = (
  slug: string,
  id: string,
  input: SaveLessonContentInput,
) => api.put<LessonDetail>(`${lessonsPath(slug)}/${id}/content`, input);

export const cloneLesson = (slug: string, id: string) =>
  api.post<LessonDetail>(`${lessonsPath(slug)}/${id}/clone`);

export const publishLesson = (slug: string, id: string) =>
  api.post<LessonDetail>(`${lessonsPath(slug)}/${id}/publish`);

export const archiveLesson = (slug: string, id: string) =>
  api.post<LessonDetail>(`${lessonsPath(slug)}/${id}/archive`);

export const deleteLesson = (slug: string, id: string) =>
  api.delete<void>(`${lessonsPath(slug)}/${id}`);

export const listLessonVersions = (slug: string, id: string) =>
  api.get<LessonVersionList>(`${lessonsPath(slug)}/${id}/versions`);

export const getLessonVersion = (slug: string, id: string, version: number) =>
  api.get<LessonVersionDetail>(
    `${lessonsPath(slug)}/${id}/versions/${version}`,
  );

export const restoreLessonVersion = (
  slug: string,
  id: string,
  version: number,
  baseRevision: number,
) =>
  api.post<LessonDetail>(
    `${lessonsPath(slug)}/${id}/versions/${version}/restore`,
    { baseRevision },
  );
