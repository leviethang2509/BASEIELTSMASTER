import type {
  AttemptResponses,
  LearnerLessonDetail,
  LearnerLessonList,
  LessonAttemptView,
  LessonDraftRecording,
  LessonSectionViewResult,
  SaveAttemptResponsesResult,
} from '@lang/shared';
import { api } from './api';

// Học bài học ở khu vực chính (`/t/:slug/learner/lessons`, `lesson-attempts`).

const base = (slug: string) => `/t/${slug}/learner`;

/** Trang thông tin bài học (khu vực chính). */
export const learnerLessonPath = (slug: string, lessonId: string) =>
  `/t/${slug}/lessons/${lessonId}`;
/** Màn hình học bài. */
export const lessonAttemptPath = (slug: string, attemptId: string) =>
  `/t/${slug}/lesson-attempts/${attemptId}`;

export interface LearnerLessonQuery {
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

export const listLearnerLessons = (slug: string, query: LearnerLessonQuery) =>
  api.get<LearnerLessonList>(`${base(slug)}/lessons?${toQuery(query)}`);

export const getLearnerLesson = (slug: string, lessonId: string) =>
  api.get<LearnerLessonDetail>(`${base(slug)}/lessons/${lessonId}`);

/** Mở lượt học của version hiện tại (đã có thì trả lượt đó). */
export const startLessonAttempt = (slug: string, lessonId: string) =>
  api.post<LessonAttemptView>(`${base(slug)}/lessons/${lessonId}/attempts`);

const attemptBase = (slug: string, attemptId: string) =>
  `${base(slug)}/lesson-attempts/${attemptId}`;
const sectionBase = (slug: string, attemptId: string, sectionId: string) =>
  `${attemptBase(slug, attemptId)}/sections/${sectionId}`;

export const getLessonAttempt = (slug: string, attemptId: string) =>
  api.get<LessonAttemptView>(attemptBase(slug, attemptId));

export const viewLessonSection = (
  slug: string,
  attemptId: string,
  sectionId: string,
) =>
  api.put<LessonSectionViewResult>(
    `${sectionBase(slug, attemptId, sectionId)}/view`,
    {},
  );

export const saveLessonResponses = (
  slug: string,
  attemptId: string,
  sectionId: string,
  responses: AttemptResponses,
) =>
  api.put<SaveAttemptResponsesResult>(
    `${sectionBase(slug, attemptId, sectionId)}/responses`,
    { responses },
  );

export const submitLessonSection = (
  slug: string,
  attemptId: string,
  sectionId: string,
  responses: AttemptResponses,
) =>
  api.post<LessonAttemptView>(
    `${sectionBase(slug, attemptId, sectionId)}/submit`,
    { responses },
  );

export const retryLessonSection = (
  slug: string,
  attemptId: string,
  sectionId: string,
) =>
  api.post<LessonAttemptView>(
    `${sectionBase(slug, attemptId, sectionId)}/retry`,
  );

export function uploadLessonRecording(
  slug: string,
  attemptId: string,
  sectionId: string,
  number: number,
  file: File,
): Promise<LessonDraftRecording> {
  const form = new FormData();
  form.append('sectionId', sectionId);
  form.append('number', String(number));
  form.append('file', file);
  return api.postForm(`${attemptBase(slug, attemptId)}/recordings`, form);
}

/** Ghi âm của lần đang làm. */
export const getLessonDraftRecordingUrl = (
  slug: string,
  attemptId: string,
  sectionId: string,
  number: number,
) =>
  api.get<{ url: string }>(
    `${sectionBase(slug, attemptId, sectionId)}/recordings/${number}/url`,
  );

/** Ghi âm đã nộp (lần nộp gần nhất). */
export const getLessonAnswerRecordingUrl = (
  slug: string,
  attemptId: string,
  answerId: string,
) =>
  api.get<{ url: string }>(
    `${attemptBase(slug, attemptId)}/answers/${answerId}/recording-url`,
  );
