import type {
  CourseDetail,
  CourseListItem,
  CreateCourseInput,
  CreateCurriculumInput,
  CurriculumDetail,
  CurriculumListItem,
  ExamUserRef,
  Paginated,
  SaveCurriculumItemsInput,
  UpdateCourseInput,
  UpdateCurriculumInput,
} from '@lang/shared';
import { api } from './api';

// Khoá học (`/t/:slug/courses`) và giáo trình tham khảo (`/t/:slug/curricula`).

const coursesPath = (slug: string) => `/t/${slug}/courses`;
const curriculaPath = (slug: string) => `/t/${slug}/curricula`;

/** Trang trong dashboard. */
export const courseListPath = (slug: string) => `/t/${slug}/dashboard/courses`;
export const courseDetailPath = (slug: string, id: string) =>
  `${courseListPath(slug)}/${id}`;
export const curriculumListPath = (slug: string) =>
  `/t/${slug}/dashboard/curricula`;
export const curriculumDetailPath = (slug: string, id: string) =>
  `${curriculumListPath(slug)}/${id}`;

function withQuery(path: string, query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return `${path}?${params.toString()}`;
}

export interface CourseListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
  categoryId?: string;
}

export const listCourses = (slug: string, query: CourseListQuery) =>
  api.get<Paginated<CourseListItem>>(withQuery(coursesPath(slug), query));

export const getCourse = (slug: string, id: string) =>
  api.get<CourseDetail>(`${coursesPath(slug)}/${id}`);

export const createCourse = (slug: string, input: CreateCourseInput) =>
  api.post<CourseDetail>(coursesPath(slug), input);

export const updateCourse = (
  slug: string,
  id: string,
  input: UpdateCourseInput,
) => api.patch<CourseDetail>(`${coursesPath(slug)}/${id}`, input);

export const deleteCourse = (slug: string, id: string) =>
  api.delete<void>(`${coursesPath(slug)}/${id}`);

export const attachCurriculum = (
  slug: string,
  id: string,
  curriculumId: string,
) =>
  api.post<CourseDetail>(
    `${coursesPath(slug)}/${id}/curricula/${curriculumId}`,
  );

export const detachCurriculum = (
  slug: string,
  id: string,
  curriculumId: string,
) => api.delete<void>(`${coursesPath(slug)}/${id}/curricula/${curriculumId}`);

export interface CurriculumListQuery {
  page: number;
  pageSize: number;
  q?: string;
  createdBy?: string;
  courseId?: string;
}

export const listCurricula = (slug: string, query: CurriculumListQuery) =>
  api.get<Paginated<CurriculumListItem>>(withQuery(curriculaPath(slug), query));

export const listCurriculumCreators = (slug: string) =>
  api.get<ExamUserRef[]>(`${curriculaPath(slug)}/creators`);

export const getCurriculum = (slug: string, id: string) =>
  api.get<CurriculumDetail>(`${curriculaPath(slug)}/${id}`);

export const createCurriculum = (slug: string, input: CreateCurriculumInput) =>
  api.post<CurriculumDetail>(curriculaPath(slug), input);

export const updateCurriculum = (
  slug: string,
  id: string,
  input: UpdateCurriculumInput,
) => api.patch<CurriculumDetail>(`${curriculaPath(slug)}/${id}`, input);

export const saveCurriculumItems = (
  slug: string,
  id: string,
  input: SaveCurriculumItemsInput,
) => api.put<CurriculumDetail>(`${curriculaPath(slug)}/${id}/items`, input);

export const cloneCurriculum = (slug: string, id: string) =>
  api.post<CurriculumDetail>(`${curriculaPath(slug)}/${id}/clone`);

export const deleteCurriculum = (slug: string, id: string) =>
  api.delete<void>(`${curriculaPath(slug)}/${id}`);
