'use client';

import { useState } from 'react';
import {
  emptyResponses,
  extractStructure,
  type ExamElement,
  type Responses,
} from '@lang/exam-core';
import type { PreviewSection } from '@/components/exam-editor/PreviewDialog';
import { Modal } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { reviewFromRaw } from './lesson-review';
import { LessonViewer, type LessonViewerSection } from './LessonViewer';

const text = vi.lessonLearning;

interface LessonPreviewDialogProps {
  open: boolean;
  sections: PreviewSection[];
  /** Section mở sẵn (thường là tab đang soạn). */
  initialKey?: string;
  onClose: () => void;
}

/** Xem trước bài học bằng màn hình học bài, chấm ở trình duyệt, không lưu. */
export function LessonPreviewDialog({
  open,
  sections,
  initialKey,
  onClose,
}: LessonPreviewDialogProps) {
  if (!open || sections.length === 0) return null;
  return (
    <PreviewBody
      sections={sections}
      initialKey={initialKey}
      onClose={onClose}
    />
  );
}

// Tách thân để mỗi lần mở là một lượt học mới (state khởi tạo lại).
function PreviewBody({
  sections,
  initialKey,
  onClose,
}: Omit<LessonPreviewDialogProps, 'open'>) {
  const [state, setState] = useState<LessonViewerSection[]>(() =>
    sections.map((section) => ({
      id: section.key,
      name: section.name,
      content: section.value,
      questionCount: extractStructure(section.value as ExamElement[]).questions
        .length,
      submitted: false,
      submitCount: 0,
      submittedAt: null,
      viewed: false,
      responses: emptyResponses(),
      review: null,
    })),
  );

  const update = (id: string, changes: Partial<LessonViewerSection>) =>
    setState((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );

  return (
    <Modal
      open
      onClose={onClose}
      title={text.previewTitle}
      widthClass="max-w-[1100px] h-[85vh]"
      surfaceClass="bg-[var(--raised)]"
    >
      <LessonViewer
        sections={state}
        canSubmit
        initialSectionId={initialKey}
        aside={text.previewAside}
        onView={(id) => update(id, { viewed: true })}
        onSubmit={async (id, responses: Responses) => {
          const section = state.find((item) => item.id === id)!;
          update(id, {
            submitted: true,
            viewed: true,
            submitCount: section.submitCount + 1,
            submittedAt: new Date().toISOString(),
            responses,
            review: reviewFromRaw(section.content as ExamElement[], responses),
          });
        }}
        onRetry={async (id) =>
          update(id, { submitted: false, responses: emptyResponses() })
        }
      />
    </Modal>
  );
}
