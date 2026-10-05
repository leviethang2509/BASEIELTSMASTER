import type {
  CreateExamInput,
  ExamContentIssue,
  ExamDetail,
  ExamListItem,
  ExamUserRef,
  ExamVersionDetail,
  ExamVersionList,
  Paginated,
  SaveExamContentInput,
  UpdateExamInput,
} from '@lang/shared';
import { ApiError, api } from './api';

// Đề thi của tenant (`/t/:slug/exams`).

export const examsPath = (slug: string) => `/t/${slug}/exams`;

/** Trang trình soạn / version trong dashboard. */
export const examEditPath = (slug: string, id: string) =>
  `/t/${slug}/dashboard/exams/${id}/edit`;
export const examVersionsPath = (slug: string, id: string) =>
  `/t/${slug}/dashboard/exams/${id}/versions`;

export interface ExamListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
  categoryId?: string;
  blueprintId?: string;
  createdBy?: string;
}

export function listExams(
  slug: string,
  query: ExamListQuery,
): Promise<Paginated<ExamListItem>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return api.get(`${examsPath(slug)}?${params.toString()}`);
}

export const listExamCreators = (slug: string) =>
  api.get<ExamUserRef[]>(`${examsPath(slug)}/creators`);

export const createExam = (slug: string, input: CreateExamInput) =>
  api.post<ExamDetail>(examsPath(slug), input);

export const getExam = (slug: string, id: string) =>
  api.get<ExamDetail>(`${examsPath(slug)}/${id}`);

export const updateExam = (slug: string, id: string, input: UpdateExamInput) =>
  api.patch<ExamDetail>(`${examsPath(slug)}/${id}`, input);

export const saveExamContent = (
  slug: string,
  id: string,
  input: SaveExamContentInput,
) => api.put<ExamDetail>(`${examsPath(slug)}/${id}/content`, input);

export const cloneExam = (slug: string, id: string) =>
  api.post<ExamDetail>(`${examsPath(slug)}/${id}/clone`);

export const publishExam = (slug: string, id: string) =>
  api.post<ExamDetail>(`${examsPath(slug)}/${id}/publish`);

export const archiveExam = (slug: string, id: string) =>
  api.post<ExamDetail>(`${examsPath(slug)}/${id}/archive`);

export const deleteExam = (slug: string, id: string) =>
  api.delete<void>(`${examsPath(slug)}/${id}`);

export const listExamVersions = (slug: string, id: string) =>
  api.get<ExamVersionList>(`${examsPath(slug)}/${id}/versions`);

export const getExamVersion = (slug: string, id: string, version: number) =>
  api.get<ExamVersionDetail>(`${examsPath(slug)}/${id}/versions/${version}`);

export const restoreExamVersion = (
  slug: string,
  id: string,
  version: number,
  baseRevision: number,
) =>
  api.post<ExamDetail>(`${examsPath(slug)}/${id}/versions/${version}/restore`, {
    baseRevision,
  });

/** Lỗi nội dung đi kèm 422 (publish, lưu đề đã publish). */
export function contentIssuesOf(error: unknown): ExamContentIssue[] {
  if (!(error instanceof ApiError) || error.status !== 422) return [];
  const issues = (error.body as { issues?: unknown } | undefined)?.issues;
  return Array.isArray(issues) ? (issues as ExamContentIssue[]) : [];
}
