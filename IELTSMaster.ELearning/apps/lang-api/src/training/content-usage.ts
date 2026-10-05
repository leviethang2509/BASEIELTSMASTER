import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ClassItem } from '../classrooms/class-item.entity';
import { CurriculumItem } from './curriculum-item.entity';

export const LESSON_IN_CURRICULUM =
  'Bài học đang nằm trong giáo trình, chỉ lưu trữ được, không xoá được';
export const EXAM_IN_CURRICULUM =
  'Đề thi đang nằm trong giáo trình, chỉ lưu trữ được, không xoá được';
export const LESSON_IN_CLASS =
  'Bài học đang nằm trong giáo trình lớp học, chỉ lưu trữ được, không xoá được';
export const EXAM_IN_CLASS =
  'Đề thi đang nằm trong giáo trình lớp học, chỉ lưu trữ được, không xoá được';

/**
 * Chặn xoá bài học/đề thi đang được dùng (C5): gọi trong transaction đã khoá
 * dòng bài/đề trước khi xoá (lưu mục giáo trình khoá chia sẻ dòng bài/đề nên
 * không chen vào giữa). Giáo trình lớp tính cả mục đã ẩn (bài làm vẫn trỏ tới).
 */
export async function assertLessonNotInUse(
  manager: EntityManager,
  lessonId: string,
): Promise<void> {
  if (await manager.getRepository(CurriculumItem).existsBy({ lessonId })) {
    throw new ConflictException(LESSON_IN_CURRICULUM);
  }
  if (await manager.getRepository(ClassItem).existsBy({ lessonId })) {
    throw new ConflictException(LESSON_IN_CLASS);
  }
}

export async function assertExamNotInUse(
  manager: EntityManager,
  examId: string,
): Promise<void> {
  if (await manager.getRepository(CurriculumItem).existsBy({ examId })) {
    throw new ConflictException(EXAM_IN_CURRICULUM);
  }
  if (await manager.getRepository(ClassItem).existsBy({ examId })) {
    throw new ConflictException(EXAM_IN_CLASS);
  }
}
