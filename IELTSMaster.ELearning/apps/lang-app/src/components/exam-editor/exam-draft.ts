// Bản nháp của trình soạn đề trong localStorage (`exam:{id}:draft`), gồm mọi
// tab section. Nguồn chính là server; bản nháp giữ phần chưa bấm Lưu khi đóng
// tab, mất mạng hoặc lưu lỗi.

export interface DraftSection {
  moduleId: string | null;
  name: string;
  durationMinutes: number;
  /** Nội dung Plate. */
  value: unknown[];
}

export interface ExamDraft {
  savedAt: string;
  /** `contentRevision` của bản server lúc bắt đầu soạn. */
  baseRevision: number;
  sections: DraftSection[];
}

const draftKey = (examId: string) => `exam:${examId}:draft`;

const isDraftSection = (value: unknown): value is DraftSection => {
  const section = value as Partial<DraftSection> | null;
  return (
    typeof section?.name === 'string' &&
    typeof section.durationMinutes === 'number' &&
    Array.isArray(section.value)
  );
};

export function getExamDraft(examId: string): ExamDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(examId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<ExamDraft>;
    return typeof draft.savedAt === 'string' &&
      typeof draft.baseRevision === 'number' &&
      Array.isArray(draft.sections) &&
      draft.sections.length > 0 &&
      draft.sections.every(isDraftSection)
      ? (draft as ExamDraft)
      : null;
  } catch {
    return null;
  }
}

export function saveExamDraft(examId: string, draft: ExamDraft) {
  try {
    window.localStorage.setItem(draftKey(examId), JSON.stringify(draft));
  } catch {
    // Hết dung lượng hoặc bị chặn — bỏ qua, không chặn việc soạn thảo.
  }
}

export function clearExamDraft(examId: string) {
  try {
    window.localStorage.removeItem(draftKey(examId));
  } catch {
    // Không có gì để dọn.
  }
}
