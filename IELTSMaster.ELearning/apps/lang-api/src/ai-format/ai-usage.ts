import { AiFormatRunStatus, trainingMonthStartOf } from '@lang/shared';
import { MoreThanOrEqual, type Repository } from 'typeorm';
import type { AiFormatRun } from './ai-format-run.entity';

/**
 * Lượt AI đã dùng trong tháng hiện tại theo giờ Việt Nam (plan 4.1, giả định 9):
 * lượt `counted` cộng lượt đang chạy (chặn bấm song song vượt hạn mức). Gọi
 * với repository của transaction khi kiểm hạn mức trước khi tạo lượt mới.
 */
export function countAiUsage(
  runs: Repository<AiFormatRun>,
  tenantId: string,
  now: Date = new Date(),
): Promise<number> {
  const startedAt = MoreThanOrEqual(new Date(trainingMonthStartOf(now)));
  return runs.countBy([
    { tenantId, startedAt, counted: true },
    { tenantId, startedAt, status: AiFormatRunStatus.RUNNING },
  ]);
}
