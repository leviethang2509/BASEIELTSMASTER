// Bản nháp của trình soạn bài học trong localStorage (`lesson:{id}:draft`),
// gồm mọi tab section (như `exam-draft` của đề thi).
import type { LessonDraftSection } from './lesson-sections';

export interface LessonDraft {
  savedAt: string;
  /** `contentRevision` của bản server lúc bắt đầu soạn. */
  baseRevision: number;
  sections: LessonDraftSection[];
}

const draftKey = (lessonId: string) => `lesson:${lessonId}:draft`;

const isDraftSection = (value: unknown): value is LessonDraftSection => {
  const section = value as Partial<LessonDraftSection> | null;
  return typeof section?.name === 'string' && Array.isArray(section.value);
};

export function getLessonDraft(lessonId: string): LessonDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(lessonId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<LessonDraft>;
    return typeof draft.savedAt === 'string' &&
      typeof draft.baseRevision === 'number' &&
      Array.isArray(draft.sections) &&
      draft.sections.length > 0 &&
      draft.sections.every(isDraftSection)
      ? (draft as LessonDraft)
      : null;
  } catch {
    return null;
  }
}

export function saveLessonDraft(lessonId: string, draft: LessonDraft) {
  try {
    window.localStorage.setItem(draftKey(lessonId), JSON.stringify(draft));
  } catch {
    // Hết dung lượng hoặc bị chặn — bỏ qua, không chặn việc soạn thảo.
  }
}

export function clearLessonDraft(lessonId: string) {
  try {
    window.localStorage.removeItem(draftKey(lessonId));
  } catch {
    // Không có gì để dọn.
  }
}
