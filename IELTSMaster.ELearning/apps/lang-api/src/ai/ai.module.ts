import { Module } from '@nestjs/common';
import { GcpCredentialsService } from './gcp-credentials.service';
import { GeminiService } from './gemini.service';

/** Kết nối Gemini (req-5): thiếu cấu hình thì `GeminiService.assertConfigured` ném 501. */
@Module({
  providers: [GcpCredentialsService, GeminiService],
  exports: [GeminiService],
})
export class AiModule {}
