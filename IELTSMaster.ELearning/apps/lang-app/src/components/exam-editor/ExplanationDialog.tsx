'use client';

import {
  Modal,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';

interface ExplanationDialogProps {
  open: boolean;
  /** Số câu mà Explanation sẽ gắn nếu chèn ở vị trí con trỏ hiện tại. */
  numbers: readonly number[];
  onInsert: () => void;
  onClose: () => void;
}

/** Hướng dẫn chi tiết trước khi chèn indicator Explanation (R3). */
export function ExplanationDialog({
  open,
  numbers,
  onInsert,
  onClose,
}: ExplanationDialogProps) {
  const text = vi.examEditor.explanationDialog;
  const target =
    numbers.length > 0
      ? text.targetNumbers(numbers[0], numbers[numbers.length - 1])
      : text.targetNone;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.title}
      widthClass="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.cancel}
          </button>
          <button
            type="button"
            onClick={onInsert}
            className={compactPrimaryButtonClass}
          >
            {text.insert}
          </button>
        </>
      }
    >
      <p className="text-[14px] text-[var(--body)]">{text.intro}</p>
      <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-[13.5px] leading-relaxed text-[var(--body)]">
        {text.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--sidebar)] px-3 py-2 text-[13.5px] text-[var(--body)]">
        {text.target}{' '}
        <strong
          className={
            numbers.length > 0
              ? 'text-[var(--heading)]'
              : 'text-[var(--danger)]'
          }
        >
          {target}
        </strong>
      </p>
    </Modal>
  );
}
