import type { LessonSectionItem } from '@lang/shared';
import type { Value } from 'platejs';
import { newSectionKey } from '@/components/exam-editor/editor-sections';
import { emptyValue, toEditorValue } from '@/components/plate/value';

// Tab section của trình soạn bài học: như `editor-sections` của đề thi nhưng
// không có thời lượng.

/** Một tab section trong trình soạn. `key` chỉ dùng ở client. */
export interface LessonEditorSection {
  key: string;
  moduleId: string | null;
  name: string;
  value: Value;
}

/** Section lưu trong bản nháp trình duyệt. */
export interface LessonDraftSection {
  moduleId: string | null;
  name: string;
  /** Nội dung Plate. */
  value: unknown[];
}

/** Chuỗi so sánh để biết nội dung đã khác bản đã lưu chưa. */
export const lessonSnapshotOf = (sections: readonly LessonEditorSection[]) =>
  JSON.stringify(
    sections.map((section) => [section.moduleId, section.name, section.value]),
  );

export const fromServerLessonSections = (
  sections: readonly LessonSectionItem[],
): LessonEditorSection[] =>
  sections.map((section) => ({
    key: newSectionKey(),
    moduleId: section.moduleId,
    name: section.name,
    value: toEditorValue(section.rawData) ?? emptyValue(),
  }));

export const fromLessonDraftSections = (
  sections: readonly LessonDraftSection[],
): LessonEditorSection[] =>
  sections.map((section) => ({
    key: newSectionKey(),
    moduleId: section.moduleId,
    name: section.name,
    value: toEditorValue(section.value) ?? emptyValue(),
  }));

export const toLessonDraftSections = (
  sections: readonly LessonEditorSection[],
): LessonDraftSection[] =>
  sections.map(({ moduleId, name, value }) => ({ moduleId, name, value }));
