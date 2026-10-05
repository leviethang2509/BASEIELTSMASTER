import {
  applyAiOps,
  isIndicator,
  describeAttemptForAi,
  needsRetry,
  parseAiOps,
  structureErrors,
  validateSection,
  type AiAttemptOutcome,
  type ExamElement,
  type Issue,
} from '@lang/exam-core';
import { AI_INVALID_JSON, AI_TRUNCATED } from './ai-format-prompt';

const AI_NO_OPS =
  'Kết quả: không có thao tác nào, section chưa được định dạng.';

/**
 * Lần thử không áp được thao tác nào hoặc còn lỗi / thao tác bị bỏ thì gọi
 * tiếp – trừ khi section đã định dạng sẵn và AI không cần đổi gì.
 */
export function shouldRetryAiAttempt(attempt: AiFormatAttempt): boolean {
  if (attempt.alreadyFormatted) return false;
  return !attempt.applied || needsRetry(attempt);
}

/** Một lần gọi AI đã chấm xong (plan 7, Step 3). */
export interface AiFormatAttempt extends AiAttemptOutcome {
  value: ExamElement[];
  issues: Issue[];
  /** Dòng phản hồi cho lần thử sau (`describeAttemptForAi`). */
  feedback: string[];
  /** AI trả danh sách rỗng cho section đã có câu hỏi và không lỗi cấu trúc. */
  alreadyFormatted: boolean;
}

/**
 * Câu trả lời của AI → áp thao tác lên nội dung **gốc** → kiểm section. JSON
 * hỏng / bị cắt thì coi như không áp được gì (lỗi gửi lại cho AI).
 */
export function evaluateAiAttempt(
  original: readonly ExamElement[],
  text: string,
  finishReason: string | null,
  createId?: () => string,
): AiFormatAttempt {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const message =
      finishReason === 'MAX_TOKENS' ? AI_TRUNCATED : AI_INVALID_JSON;
    return {
      value: [...original],
      issues: [],
      feedback: [`Kết quả: ${message}`],
      structureErrorCount: 0,
      problemCount: 1,
      applied: false,
      alreadyFormatted: false,
    };
  }

  const parsed = parseAiOps(raw);
  const applied = applyAiOps(original, parsed, { createId });
  const problems = [...parsed.problems, ...applied.problems].sort(
    (a, b) => (a.opIndex ?? -1) - (b.opIndex ?? -1),
  );
  const issues = validateSection(applied.value);
  const feedback = describeAttemptForAi(issues, problems, applied.origins);
  const empty = !parsed.ops.length && !problems.length;
  const alreadyFormatted =
    empty &&
    original.some((block) => isIndicator(block) && block.kind === 'question') &&
    structureErrors(issues).length === 0;
  if (empty && !alreadyFormatted) feedback.unshift(AI_NO_OPS);
  return {
    value: applied.value,
    issues,
    feedback,
    structureErrorCount: structureErrors(issues).length,
    problemCount: problems.length,
    applied: parsed.ops.length > applied.problems.length,
    alreadyFormatted,
  };
}
