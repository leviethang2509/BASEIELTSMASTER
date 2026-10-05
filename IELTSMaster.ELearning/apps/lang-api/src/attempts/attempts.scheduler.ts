import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttemptsService } from './attempts.service';

/** Mỗi phút chốt các section đã hết giờ mà học viên không quay lại (plan giả định 8). */
@Injectable()
export class AttemptsScheduler {
  private readonly logger = new Logger(AttemptsScheduler.name);
  private running = false;

  constructor(private readonly attempts: AttemptsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async finalizeExpired(): Promise<void> {
    // Lần trước chưa xong (DB chậm) thì bỏ qua, không chạy chồng.
    if (this.running) return;
    this.running = true;
    try {
      const closed = await this.attempts.finalizeExpired();
      if (closed > 0) this.logger.log(`Đã chốt ${closed} lượt làm quá giờ`);
    } catch (error) {
      this.logger.error(
        'Chốt lượt làm quá giờ thất bại',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
