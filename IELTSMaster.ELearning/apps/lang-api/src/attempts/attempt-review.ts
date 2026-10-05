import { shuffleOrdering, type ExamElement } from '@lang/exam-core';
import {
  QuestionGrading,
  type AttemptReviewSection,
  type LessonSectionResult,
} from '@lang/shared';
import type { ExamQuestion } from '../exams/exam-question.entity';
import type { ExamSection } from '../exams/exam-section.entity';
import { normalizeResponses, toGradable } from './attempt-grading';
import type { ExamAttemptAnswer } from './exam-attempt-answer.entity';
import type { ExamAttemptSection } from './exam-attempt-section.entity';

// Xem lại một section của lượt thi kèm đáp án và đúng/sai từng câu (req-3
// Step 10, F4). Chỉ giáo viên của lớp và Owner/Admin gọi tới; học viên vẫn chỉ
// thấy số câu đúng ở `AttemptResult`. Dạng dữ liệu trùng với kết quả section
// của bài học (`LessonSectionResult`) để client dùng chung `reviewFromResult`.

export function examSectionReview(
  section: ExamAttemptSection,
  examSection: ExamSection,
  questions: readonly ExamQuestion[],
  answers: readonly ExamAttemptAnswer[],
): AttemptReviewSection {
  return {
    id: section.id,
    name: examSection.name,
    content: shuffleOrdering(
      examSection.contentPublic as ExamElement[],
      section.orderSeed,
      questions.map(toGradable),
    ),
    result: section.submittedAt
      ? toSectionResult(section, examSection, questions, answers)
      : null,
  };
}

function toSectionResult(
  section: ExamAttemptSection,
  examSection: ExamSection,
  questions: readonly ExamQuestion[],
  answers: readonly ExamAttemptAnswer[],
): LessonSectionResult {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const manual = questions.filter(
    (question) => question.grading === QuestionGrading.MANUAL,
  );
  return {
    submittedAt: section.submittedAt!.toISOString(),
    correct: section.correct ?? 0,
    total: section.total ?? 0,
    manualCount: manual.length,
    manualGradedCount: manual.filter(
      (question) => answerByQuestion.get(question.id)?.gradedAt,
    ).length,
    responses: normalizeResponses(section.responses),
    questions: questions.map((question) => {
      const answer = answerByQuestion.get(question.id);
      const isManual = question.grading === QuestionGrading.MANUAL;
      return {
        number: question.number,
        qtype: question.qtype,
        verdict: isManual ? 'manual' : answer?.isCorrect ? 'correct' : 'wrong',
        answerKey: isManual ? null : question.answerKey,
        maxScore: question.maxScore,
        score: isManual
          ? answer?.gradedAt
            ? answer.score
            : null
          : (answer?.score ?? 0),
        comment: answer?.gradedAt ? answer.comment : null,
        gradedAt: answer?.gradedAt?.toISOString() ?? null,
        recordingAnswerId: answer?.recordingKey ? answer.id : null,
      };
    }),
    explanations: (examSection.explanations ?? []).map((item) => ({
      nodeId: item.nodeId,
      numbers: item.numbers,
      blocks: item.blocks,
    })),
  };
}
