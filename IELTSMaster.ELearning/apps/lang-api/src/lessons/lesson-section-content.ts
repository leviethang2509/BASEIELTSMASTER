import { randomInt, randomUUID } from 'node:crypto';
import {
  extractExplanations,
  extractStructure,
  stripAnswers,
  type ExamValue,
} from '@lang/exam-core';
import { LessonSectionStatus } from '@lang/shared';
import type { EntityManager } from 'typeorm';
import { insertable } from '../exams/section-content';
import { LessonPart } from './lesson-part.entity';
import { LessonQuestion } from './lesson-question.entity';
import { LessonSection } from './lesson-section.entity';

// Kiểm tra nội dung (`assertSectionShapes`, `sectionIssues`…) dùng chung với
// đề thi ở `exams/section-content.ts`: chỉ phụ thuộc `@lang/exam-core`.

/** Section lý thuyết không có câu hỏi là bình thường: không cảnh báo. */
export const LESSON_VALIDATE_OPTIONS = { requireQuestions: false } as const;

/** Nội dung một section bài học trước khi lưu (từ request hoặc version cũ). */
export interface LessonSectionDraft {
  moduleId: string | null;
  name: string;
  rawData: unknown[];
}

/** Dòng `lesson_sections` kèm `lesson_parts`/`lesson_questions`, id sinh sẵn. */
export interface PreparedLessonSection {
  section: LessonSection;
  parts: LessonPart[];
  questions: LessonQuestion[];
}

/**
 * Tách cấu trúc + đáp án, giải thích và tạo content_public (như
 * `prepareSection` của đề thi, không có thời lượng). Nội dung phải đã qua
 * `assertSectionShapes`. Part cha luôn đứng trước subpart trong danh sách.
 */
export function prepareLessonSection(
  draft: LessonSectionDraft,
  target: {
    lessonId: string;
    version: number;
    sortOrder: number;
    createdBy: string;
  },
): PreparedLessonSection {
  const value = draft.rawData as ExamValue;
  const structure = extractStructure(value);
  const sectionId = randomUUID();

  const partIds = new Map<string, string>();
  const parts = [...structure.parts]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((part): LessonPart => {
      const id = randomUUID();
      partIds.set(part.nodeId, id);
      return {
        id,
        sectionId,
        parentPartId:
          part.parentNodeId === null
            ? null
            : (partIds.get(part.parentNodeId) ?? null),
        kind: part.kind,
        nodeId: part.nodeId,
        sortOrder: part.sortOrder,
        firstNumber: part.firstNumber,
        lastNumber: part.lastNumber,
      };
    });

  const questions = structure.questions.map((question): LessonQuestion => ({
    id: randomUUID(),
    sectionId,
    partId:
      question.partNodeId === null
        ? null
        : (partIds.get(question.partNodeId) ?? null),
    number: question.number,
    nodeId: question.nodeId,
    subIndex: question.subIndex,
    qtype: question.qtype,
    grading: question.grading,
    answerKey: question.answerKey,
    options: question.options,
    params: question.params,
    maxScore: question.maxScore,
  }));

  const section = {
    id: sectionId,
    lessonId: target.lessonId,
    version: target.version,
    status: LessonSectionStatus.ACTIVE,
    moduleId: draft.moduleId,
    name: draft.name,
    sortOrder: target.sortOrder,
    rawData: value,
    // Thứ tự xáo lưu sẵn chỉ để content_public không lộ đáp án.
    contentPublic: stripAnswers(value, randomInt(2 ** 31)),
    explanations: extractExplanations(value),
    questionCount: questions.length,
    createdBy: target.createdBy,
  } as LessonSection;

  return { section, parts, questions };
}

/** Ghi section + part + câu hỏi đã chuẩn bị (part cha trước subpart). */
export async function insertPreparedLessonSections(
  manager: EntityManager,
  prepared: readonly PreparedLessonSection[],
): Promise<void> {
  if (prepared.length === 0) return;
  await manager
    .getRepository(LessonSection)
    .insert(insertable(prepared.map((item) => item.section)));
  const parts = prepared.flatMap((item) => item.parts);
  if (parts.length > 0) {
    await manager.getRepository(LessonPart).insert(insertable(parts));
  }
  const questions = prepared.flatMap((item) => item.questions);
  if (questions.length > 0) {
    await manager.getRepository(LessonQuestion).insert(insertable(questions));
  }
}
