import type {
  AttemptRecording,
  AttemptResponses,
  AttemptResult,
  AttemptStatus,
  AttemptView,
  LearnerAttemptItem,
  LearnerExamDetail,
  LearnerExamList,
  Paginated,
  SaveAttemptResponsesResult,
} from '@lang/shared';
import { api } from './api';

// Làm bài thi ở khu vực chính (`/t/:slug/learner`).

const base = (slug: string) => `/t/${slug}/learner`;

/** Trang thông tin đề (khu vực chính). */
export const learnerExamPath = (slug: string, examId: string) =>
  `/t/${slug}/exams/${examId}`;
/** Trang thi toàn màn hình. */
export const attemptPath = (slug: string, attemptId: string) =>
  `/t/${slug}/attempts/${attemptId}`;
export const attemptResultPath = (slug: string, attemptId: string) =>
  `/t/${slug}/attempts/${attemptId}/result`;

export interface LearnerExamQuery {
  page: number;
  pageSize: number;
  q?: string;
  categoryId?: string;
  blueprintId?: string;
}

const toQuery = (query: object) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
};

export const listLearnerExams = (slug: string, query: LearnerExamQuery) =>
  api.get<LearnerExamList>(`${base(slug)}/exams?${toQuery(query)}`);

export const getLearnerExam = (slug: string, examId: string) =>
  api.get<LearnerExamDetail>(`${base(slug)}/exams/${examId}`);

export const startAttempt = (slug: string, examId: string) =>
  api.post<AttemptView>(`${base(slug)}/exams/${examId}/attempts`);

export const listMyAttempts = (
  slug: string,
  query: { page: number; pageSize: number; status?: AttemptStatus },
) =>
  api.get<Paginated<LearnerAttemptItem>>(
    `${base(slug)}/attempts?${toQuery(query)}`,
  );

const attemptBase = (slug: string, attemptId: string) =>
  `${base(slug)}/attempts/${attemptId}`;

export const getAttempt = (slug: string, attemptId: string) =>
  api.get<AttemptView>(attemptBase(slug, attemptId));

export const startAttemptSection = (
  slug: string,
  attemptId: string,
  sectionId: string,
) =>
  api.post<AttemptView>(
    `${attemptBase(slug, attemptId)}/sections/${sectionId}/start`,
  );

export const saveAttemptResponses = (
  slug: string,
  attemptId: string,
  sectionId: string,
  responses: AttemptResponses,
) =>
  api.put<SaveAttemptResponsesResult>(
    `${attemptBase(slug, attemptId)}/sections/${sectionId}/responses`,
    { responses },
  );

export const submitAttemptSection = (
  slug: string,
  attemptId: string,
  sectionId: string,
  responses: AttemptResponses,
) =>
  api.post<AttemptView>(
    `${attemptBase(slug, attemptId)}/sections/${sectionId}/submit`,
    { responses },
  );

export const finishAttempt = (slug: string, attemptId: string) =>
  api.post<AttemptView>(`${attemptBase(slug, attemptId)}/finish`);

export function uploadRecording(
  slug: string,
  attemptId: string,
  sectionId: string,
  number: number,
  file: File,
): Promise<AttemptRecording> {
  const form = new FormData();
  form.append('sectionId', sectionId);
  form.append('number', String(number));
  form.append('file', file);
  return api.postForm(`${attemptBase(slug, attemptId)}/recordings`, form);
}

export const getRecordingUrl = (
  slug: string,
  attemptId: string,
  answerId: string,
) =>
  api.get<{ url: string }>(
    `${attemptBase(slug, attemptId)}/recordings/${answerId}/url`,
  );

export const getAttemptResult = (slug: string, attemptId: string) =>
  api.get<AttemptResult>(`${attemptBase(slug, attemptId)}/result`);
