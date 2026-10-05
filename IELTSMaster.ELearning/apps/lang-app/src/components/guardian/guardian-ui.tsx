import type { ChildManualAnswer, GuardianChild } from '@lang/shared';
import { Badge } from '@/components/ui';
import { vi } from '@/i18n/vi';

const text = vi.guardian;

/** Tên con + quan hệ + trạng thái membership. */
export function ChildBadges({ child }: { child: GuardianChild }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {child.relationship && (
        <Badge tone="accent">{text.relationship(child.relationship)}</Badge>
      )}
      {child.inactive && <Badge tone="warning">{text.inactive}</Badge>}
    </span>
  );
}

/**
 * Điểm và nhận xét của từng câu chấm tay (R19.1). Không kèm đề bài, câu trả
 * lời hay đáp án – phụ huynh không xem nội dung đề (R19.2).
 */
export function ManualAnswerList({
  answers,
}: {
  answers: ChildManualAnswer[] | undefined;
}) {
  if (!answers || answers.length === 0) return null;
  return (
    <div className="mt-2 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        {text.manualHeading}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1.5 text-[13px] text-[var(--body)]">
        {answers.map((answer) => (
          <li key={`${answer.sectionName}-${answer.number}`}>
            <span className="font-medium text-[var(--heading)]">
              {text.manualRow(answer.sectionName, answer.number)}
            </span>{' '}
            <span className="text-[var(--muted)]">
              · {text.manualScore(answer.score, answer.maxScore)}
            </span>
            <span className="block whitespace-pre-line">
              {answer.comment || (
                <span className="text-[var(--muted)]">
                  {text.manualNoComment}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
