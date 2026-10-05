import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AiFormatController } from './ai-format.controller';
import { AiFormatRun } from './ai-format-run.entity';
import { AiFormatService } from './ai-format.service';

/** Định dạng section đề thi bằng Gemini (req-5 Step 3). */
@Module({
  imports: [AiModule, TenantsModule, TypeOrmModule.forFeature([AiFormatRun])],
  controllers: [AiFormatController],
  providers: [AiFormatService],
})
export class AiFormatModule {}
