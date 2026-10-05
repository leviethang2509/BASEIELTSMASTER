'use client';

import { type CSSProperties, useEffect, useState } from 'react';
import { QUESTION_TYPES, type IndicatorProps } from '@lang/exam-core';
import type { QuestionType } from '@lang/shared';
import {
  Modal,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';

// Popup chọn dạng câu hỏi, dùng cả lúc chèn indicator mới lẫn lúc bấm badge để
// đổi dạng. Speaking/Writing/Pick-n có thêm một con số, Matching có danh sách
// option.

const NUMBER_PARAM = {
  seconds: { min: 1, max: 300, def: 60 },
  maxChars: { min: 1, max: 3000, def: 500 },
  maxPicks: { min: 1, max: 20, def: 2 },
} as const;

type NumberParam = keyof typeof NUMBER_PARAM;

const isNumberParam = (param: string | undefined): param is NumberParam =>
  !!param && param in NUMBER_PARAM;

const fieldClass =
  'w-full rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)] px-3 text-[14px] text-[var(--heading)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--bg)]';

interface IndicatorDialogProps {
  open: boolean;
  /** Giá trị đang có khi sửa; bỏ trống khi chèn mới. */
  initial?: IndicatorProps;
  onSubmit: (props: IndicatorProps) => void;
  onClose: () => void;
}

export function IndicatorDialog({
  open,
  initial,
  onSubmit,
  onClose,
}: IndicatorDialogProps) {
  const text = vi.examEditor.indicatorDialog;
  const [qtype, setQtype] = useState<QuestionType | undefined>(initial?.qtype);
  const [numberText, setNumberText] = useState('');
  const [optionsText, setOptionsText] = useState('');

  const meta = QUESTION_TYPES.find((item) => item.qtype === qtype);
  const numberParam = isNumberParam(meta?.param) ? meta.param : null;
  const param = numberParam ? NUMBER_PARAM[numberParam] : null;
  const withOptions = meta?.param === 'options';

  useEffect(() => {
    if (open) setQtype(initial?.qtype);
  }, [open, initial?.qtype]);

  // Đổi dạng thì nạp lại giá trị tham số: giữ giá trị cũ nếu vẫn đúng dạng đó.
  useEffect(() => {
    if (meta?.param === 'options') {
      setOptionsText((initial?.options ?? []).join('\n'));
    } else if (isNumberParam(meta?.param)) {
      const key = meta.param;
      setNumberText(String(initial?.[key] ?? NUMBER_PARAM[key].def));
    }
  }, [meta?.param, initial]);

  const num = Number(numberText);
  const paramInvalid =
    !!param &&
    (!numberText.trim() ||
      !Number.isInteger(num) ||
      num < param.min ||
      num > param.max);

  const options = optionsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const duplicated = options.length !== new Set(options).size;
  const optionsInvalid = withOptions && (options.length < 2 || duplicated);

  const invalid = !qtype || paramInvalid || optionsInvalid;

  const submit = () => {
    if (invalid || !qtype) return;
    const props: IndicatorProps = { qtype };
    if (numberParam) props[numberParam] = num;
    if (withOptions) props.options = options;
    onSubmit(props);
  };

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
            disabled={invalid}
            onClick={submit}
            className={compactPrimaryButtonClass}
          >
            {text.save}
          </button>
        </>
      }
    >
      <div className="grid gap-1.5" role="radiogroup" aria-label={text.title}>
        {QUESTION_TYPES.map((item) => {
          const active = item.qtype === qtype;
          return (
            <button
              key={item.qtype}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setQtype(item.qtype)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] hover:bg-[var(--hover)]'
              }`}
            >
              <span
                className="ls-tint ls-tint-dot h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ '--tint-raw': item.color } as CSSProperties}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[var(--heading)]">
                  {item.label}
                </span>
                <span className="block text-[12.5px] text-[var(--muted)]">
                  {item.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {numberParam && param && (
        <label className="mt-4 block border-t border-[var(--border)] pt-3">
          <span className="mb-1.5 block text-[13px] font-semibold text-[var(--body)]">
            {text.params[numberParam].label} ({text.params[numberParam].unit})
          </span>
          <input
            type="number"
            min={param.min}
            max={param.max}
            value={numberText}
            onChange={(event) => setNumberText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !invalid) submit();
            }}
            className={`h-[42px] ${fieldClass}`}
          />
          <span
            className={`mt-1.5 block text-[12.5px] ${
              paramInvalid ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
            }`}
          >
            {text.numberHint(
              param.min,
              param.max,
              text.params[numberParam].unit,
            )}
          </span>
        </label>
      )}

      {withOptions && (
        <label className="mt-4 block border-t border-[var(--border)] pt-3">
          <span className="mb-1.5 block text-[13px] font-semibold text-[var(--body)]">
            {text.options(options.length)}
          </span>
          <textarea
            rows={6}
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
            placeholder={'i\nii\niii\n…'}
            className={`py-2 font-mono leading-relaxed ${fieldClass}`}
          />
          <span
            className={`mt-1.5 block text-[12.5px] ${
              optionsInvalid ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
            }`}
          >
            {duplicated ? text.duplicatedOptions : text.optionsHint}
          </span>
        </label>
      )}
    </Modal>
  );
}
