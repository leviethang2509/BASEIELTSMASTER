import type { ExamSectionItem } from '@lang/shared';
import type { Value } from 'platejs';
import { emptyValue, toEditorValue } from '@/components/plate/value';
import type { DraftSection } from './exam-draft';

/** Một tab section trong trình soạn. `key` chỉ dùng ở client. */
export interface EditorSection {
  key: string;
  moduleId: string | null;
  name: string;
  durationMinutes: number;
  value: Value;
}

let sectionCounter = 0;
export const newSectionKey = () => `section-${++sectionCounter}`;

/** Chuỗi so sánh để biết nội dung đã khác bản đã lưu chưa. */
export const snapshotOf = (sections: readonly EditorSection[]) =>
  JSON.stringify(
    sections.map((section) => [
      section.moduleId,
      section.name,
      section.durationMinutes,
      section.value,
    ]),
  );

export const fromServerSections = (
  sections: readonly ExamSectionItem[],
): EditorSection[] =>
  sections.map((section) => ({
    key: newSectionKey(),
    moduleId: section.moduleId,
    name: section.name,
    durationMinutes: section.durationMinutes,
    value: toEditorValue(section.rawData) ?? emptyValue(),
  }));

export const fromDraftSections = (
  sections: readonly DraftSection[],
): EditorSection[] =>
  sections.map((section) => ({
    key: newSectionKey(),
    moduleId: section.moduleId,
    name: section.name,
    durationMinutes: section.durationMinutes,
    value: toEditorValue(section.value) ?? emptyValue(),
  }));

export const toDraftSections = (
  sections: readonly EditorSection[],
): DraftSection[] =>
  sections.map(({ moduleId, name, durationMinutes, value }) => ({
    moduleId,
    name,
    durationMinutes,
    value,
  }));
