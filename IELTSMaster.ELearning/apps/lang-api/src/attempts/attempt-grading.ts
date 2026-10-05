import {
  gradeResponses,
  type GradableQuestion,
  type Responses,
} from '@lang/exam-core';
import {
  QuestionGrading,
  RESPONSE_MAX_ENTRIES,
  RESPONSE_TEXT_MAX_LENGTH,
  type AttemptResponses,
} from '@lang/shared';
import type { ExamQuestion } from '../exams/exam-question.entity';

// Chấm một section của lượt làm bằng dòng `exam_questions` (cùng hàm
// `gradeResponses` với preview ở client) và tách câu trả lời theo từng câu để
// ghi `exam_attempt_answers`. Bài học dùng chung với dòng `lesson_questions`
// (cùng các cột).

/** Các cột của `exam_questions` / `lesson_questions` cần để chấm. */
export type QuestionRow = Pick<
  ExamQuestion,
  'id' | 'number' | 'nodeId' | 'qtype' | 'grading' | 'answerKey' | 'maxScore'
>;

export const emptyAttemptResponses = (): AttemptResponses => ({
  value: {},
  picks: {},
  order: {},
});

export function toGradable(
  question: Omit<QuestionRow, 'id' | 'grading' | 'maxScore'>,
): GradableQuestion {
  return {
    number: question.number,
    nodeId: question.nodeId,
    qtype: question.qtype,
    answerKey: question.answerKey,
  } as GradableQuestion;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Số câu làm khoá JSON: số nguyên dương, không số 0 đầu. */
const QUESTION_NUMBER_KEY = /^[1-9]\d{0,5}$/;
const MAX_INDEX = 999;
const MAX_INDEXES = 200;

const isIndexList = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length <= MAX_INDEXES &&
  value.every((i) => Number.isInteger(i) && i >= 0 && i <= MAX_INDEX);

/** Câu trả lời gửi lên có đúng dạng `AttemptResponses` không (đọc phòng thủ). */
export function isAttemptResponses(value: unknown): value is AttemptResponses {
  if (!isRecord(value)) return false;
  const allowed = new Set(['value', 'picks', 'order']);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;

  let entries = 0;
  const check = (
    group: unknown,
    valid: (entry: unknown) => boolean,
  ): boolean => {
    if (group === undefined) return true;
    if (!isRecord(group)) return false;
    return Object.entries(group).every(([key, entry]) => {
      entries += 1;
      return QUESTION_NUMBER_KEY.test(key) && valid(entry);
    });
  };

  return (
    check(
      value.value,
      (entry) =>
        typeof entry === 'string' && entry.length <= RESPONSE_TEXT_MAX_LENGTH,
    ) &&
    check(value.picks, isIndexList) &&
    check(value.order, isIndexList) &&
    entries <= RESPONSE_MAX_ENTRIES
  );
}

/** Bổ sung nhóm còn thiếu (client có thể bỏ nhóm rỗng). */
export function normalizeResponses(
  responses: Partial<AttemptResponses>,
): AttemptResponses {
  return {
    value: responses.value ?? {},
    picks: responses.picks ?? {},
    order: responses.order ?? {},
  };
}

/** Phần câu trả lời thuộc về một câu; `null` khi bỏ trống. */
export function responseOf(
  question: Pick<ExamQuestion, 'number' | 'qtype' | 'answerKey'>,
  responses: AttemptResponses,
): unknown {
  const nonEmpty = (list: number[] | undefined) =>
    Array.isArray(list) && list.length > 0 ? list : null;

  switch (question.qtype) {
    case 'mc-single':
    case 'mc-multi':
    case 'polytomous':
      return nonEmpty(responses.picks[question.number]);
    case 'pick-n': {
      // Mọi câu của pick-n đọc chung lựa chọn ở số câu đầu.
      const { pickIndex } = question.answerKey as { pickIndex: number };
      return nonEmpty(responses.picks[question.number - pickIndex]);
    }
    case 'ordering':
      return nonEmpty(responses.order[question.number]);
    case 'speaking':
      return null;
    default: {
      const text = responses.value[question.number];
      return typeof text === 'string' && text.trim() !== '' ? text : null;
    }
  }
}

export interface GradedAnswer {
  questionId: string;
  response: unknown;
  isCorrect: boolean | null;
  /** Tự động: điểm tối đa hoặc 0; chấm tay: `null` (chờ chấm). */
  score: number | null;
}

export interface GradedSection {
  correct: number;
  total: number;
  manual: number;
  answers: GradedAnswer[];
}

export function gradeSection(
  questions: readonly QuestionRow[],
  responses: AttemptResponses,
): GradedSection {
  const result = gradeResponses(
    questions.map(toGradable),
    responses as Responses,
  );
  const answers = questions.map((question): GradedAnswer => {
    const response = responseOf(question, responses);
    if (question.grading === QuestionGrading.MANUAL) {
      return {
        questionId: question.id,
        response,
        isCorrect: null,
        score: null,
      };
    }
    const isCorrect = result.verdicts[question.number] === 'correct';
    return {
      questionId: question.id,
      response,
      isCorrect,
      score: isCorrect ? question.maxScore : 0,
    };
  });
  return {
    correct: result.correct,
    total: result.total,
    manual: result.manual,
    answers,
  };
}
