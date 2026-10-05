import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';

/**
 * Lượt học của bài học, dùng để quyết định Save tạo version mới hay ghi đè và
 * xoá mềm hay xoá hẳn (như `exam_attempts` với đề thi). Tách thành provider
 * riêng để unit test của bài học thay bằng bản giả.
 */
@Injectable()
export class LessonAttemptLookup {
  constructor(
    @InjectRepository(LessonAttempt)
    private readonly attempts: Repository<LessonAttempt>,
  ) {}

  /** Có lượt học của bài (mọi version nếu không truyền `version`). */
  hasAttempts(
    manager: EntityManager,
    lessonId: string,
    version?: number,
  ): Promise<boolean> {
    return manager.getRepository(LessonAttempt).existsBy({
      lessonId,
      ...(version !== undefined ? { lessonVersion: version } : {}),
    });
  }

  /** Số lượt học theo version. */
  async countByVersion(lessonId: string): Promise<Map<number, number>> {
    const rows = await this.attempts
      .createQueryBuilder('attempt')
      .select('attempt.lessonVersion', 'version')
      .addSelect('COUNT(*)::int', 'count')
      .where('attempt.lessonId = :lessonId', { lessonId })
      .groupBy('attempt.lessonVersion')
      .getRawMany<{ version: number; count: number }>();
    return new Map(rows.map((row) => [row.version, row.count]));
  }
}
