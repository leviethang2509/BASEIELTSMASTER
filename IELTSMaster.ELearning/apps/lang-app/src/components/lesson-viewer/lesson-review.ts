import {
  buildPlan,
  gradeExam,
  structureFromPlan,
  type ExamElement,
  type GradeResult,
  type Responses,
  type Verdict,
} from '@lang/exam-core';
import type { LessonSectionResult } from '@lang/shared';
import type {
  ReviewAnswer,
  ReviewManualScore,
  SimulatorReview,
} from '@/components/exam-simulator/SimulatorState';

// Dựng `SimulatorReview` (kết quả + đáp án + giải thích) cho màn hình học bài:
// từ kết quả server chấm, hoặc chấm ngay ở client khi xem trước trong trình soạn.

/** Kết quả lần nộp gần nhất do server trả (đáp án/giải thích chỉ có sau khi nộp). */
export function reviewFromResult(
  result: LessonSectionResult,
): Omit<SimulatorReview, 'renderSpeaking'> {
  const verdicts: Record<number, Verdict> = {};
  const answers = new Map<number, ReviewAnswer>();
  const manual = new Map<number, ReviewManualScore>();
  for (const question of result.questions) {
    verdicts[question.number] = question.verdict;
    if (question.verdict === 'manual') {
      manual.set(question.number, {
        score: question.score,
        maxScore: question.maxScore,
        comment: question.comment,
      });
    } else {
      answers.set(question.number, {
        qtype: question.qtype,
        answerKey: question.answerKey,
      });
    }
  }
  const graded: GradeResult = {
    correct: result.correct,
    total: result.total,
    manual: manual.size,
    verdicts,
  };
  return {
    result: graded,
    responses: result.responses as Responses,
    answers,
    manual,
    explanations: new Map(
      result.explanations.map((item) => [
        item.nodeId,
        item.blocks as ExamElement[],
      ]),
    ),
  };
}

/**
 * Xem trước: chấm `raw_data` ở trình duyệt. Giải thích nằm sẵn trong nội dung
 * nên không cần bảng tra; câu chấm tay không có điểm.
 */
export function reviewFromRaw(
  value: readonly ExamElement[],
  responses: Responses,
): SimulatorReview {
  const plan = buildPlan(value);
  const answers = new Map<number, ReviewAnswer>();
  for (const question of structureFromPlan(plan).questions) {
    if (question.answerKey !== null) {
      answers.set(question.number, {
        qtype: question.qtype,
        answerKey: question.answerKey,
      });
    }
  }
  return {
    result: gradeExam(plan, responses),
    responses,
    answers,
    explanations: new Map(),
  };
}
