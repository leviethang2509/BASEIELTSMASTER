'use client';

import { useMemo, useState } from 'react';
import { buildPlan, type ExamElement } from '@lang/exam-core';
import { Modal } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ExamSimulator } from '@/components/exam-simulator/ExamSimulator';
import {
  AnswerNav,
  SimulatorProvider,
} from '@/components/exam-simulator/SimulatorState';

export interface PreviewSection {
  key: string;
  name: string;
  /** Không có ở bài học. */
  durationMinutes?: number;
  value: readonly unknown[];
}

interface PreviewDialogProps {
  open: boolean;
  sections: PreviewSection[];
  /** Section mở sẵn (thường là tab đang soạn). */
  initialKey?: string;
  onClose: () => void;
  /** Chú thích cạnh bài làm (mặc định của đề thi). */
  aside?: string;
}

/** Giả lập bài làm từng section, chấm ngay ở trình duyệt (không tạo bài làm). */
export function PreviewDialog({
  open,
  sections,
  initialKey,
  onClose,
  aside,
}: PreviewDialogProps) {
  if (!open || sections.length === 0) return null;
  return (
    <PreviewBody
      sections={sections}
      initialKey={initialKey}
      onClose={onClose}
      aside={aside}
    />
  );
}

// Tách thân để mỗi lần mở là một lượt làm bài mới (state khởi tạo lại).
function PreviewBody({
  sections,
  initialKey,
  onClose,
  aside,
}: Omit<PreviewDialogProps, 'open'>) {
  const text = vi.examEditor.preview;
  const [key, setKey] = useState(
    sections.some((section) => section.key === initialKey)
      ? initialKey!
      : sections[0].key,
  );
  const section = sections.find((item) => item.key === key) ?? sections[0];
  const plan = useMemo(
    () => buildPlan(section.value as ExamElement[]),
    [section.value],
  );
  const hasNumbers = plan.parts.some((part) => part.numbers.length > 0);

  return (
    <SimulatorProvider key={section.key} plan={plan}>
      <Modal
        open
        onClose={onClose}
        title={text.title}
        widthClass="max-w-[1280px] h-[85vh]"
        // Nền giống trang chính cho giống tờ đề.
        surfaceClass="bg-[var(--raised)]"
        // Thân popup không tự cuộn: từng cột trong tab cuộn riêng.
        bodyClass="flex flex-col overflow-hidden"
        footer={hasNumbers ? <AnswerNav plan={plan} /> : undefined}
      >
        {sections.length > 1 && (
          <div
            role="tablist"
            aria-label={text.sections}
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--sidebar)] px-3 py-1.5"
          >
            {sections.map((item, index) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={item.key === section.key}
                onClick={() => setKey(item.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                  item.key === section.key
                    ? 'bg-[var(--panel)] text-[var(--heading)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--body)]'
                }`}
              >
                {text.sectionLabel(index + 1, item.name, item.durationMinutes)}
              </button>
            ))}
          </div>
        )}
        <ExamSimulator plan={plan} aside={aside ?? text.aside} />
      </Modal>
    </SimulatorProvider>
  );
}
