import {
  buildPlan,
  isExplanation,
  segmentQtype,
  type ExamElement,
} from '@lang/exam-core';

// Tách đề bài của câu chấm tay từ content_public của section (không đáp án)
// để người chấm đọc cạnh bài làm.

export interface QuestionPrompt {
  /** Vị trí part chứa câu trong `parts`. */
  partIndex: number;
  /** Hướng dẫn subpart đứng ngay trước câu + nội dung câu. */
  prompt: ExamElement[];
}

export interface SectionPrompts {
  /** Passage của từng part (theo thứ tự `buildPlan`). */
  parts: ExamElement[][];
  /** Theo `node_id` của câu hỏi. */
  questions: Map<string, QuestionPrompt>;
}

export function sectionPrompts(
  content: readonly ExamElement[],
): SectionPrompts {
  const plan = buildPlan(content);
  const questions = new Map<string, QuestionPrompt>();
  plan.parts.forEach((part, partIndex) => {
    // Hướng dẫn subpart áp dụng cho mọi câu sau nó, tới subpart kế tiếp.
    let lead: ExamElement[] = [];
    let afterQuestion = false;
    for (const segment of part.items) {
      // Giải thích (content_public chỉ còn indicator rỗng) không cắt ngang
      // hướng dẫn subpart của các câu sau nó.
      if (isExplanation(segment.indicator)) continue;
      if (!segmentQtype(segment)) {
        if (afterQuestion) lead = [];
        lead.push(...segment.blocks);
        afterQuestion = false;
        continue;
      }
      afterQuestion = true;
      if (segment.indicator) {
        questions.set(segment.indicator.id, {
          partIndex,
          prompt: [...lead, ...segment.blocks],
        });
      }
    }
  });
  return { parts: plan.parts.map((part) => part.passage), questions };
}
