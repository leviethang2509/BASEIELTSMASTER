import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsModule } from '../exams/exams.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AttemptsScheduler } from './attempts.scheduler';
import { AttemptsService } from './attempts.service';
import { ExamAttemptAnswer } from './exam-attempt-answer.entity';
import { ExamAttemptSection } from './exam-attempt-section.entity';
import { ExamAttempt } from './exam-attempt.entity';
import { LearnerController } from './learner.controller';
import { LearnerExamsService } from './learner-exams.service';

/** Làm bài thi, chấm tự động và kết quả của học viên (Step 13). */
@Module({
  imports: [
    TenantsModule,
    ExamsModule,
    NotificationsModule,
    StorageModule,
    TypeOrmModule.forFeature([
      ExamAttempt,
      ExamAttemptSection,
      ExamAttemptAnswer,
    ]),
  ],
  controllers: [LearnerController],
  providers: [AttemptsService, LearnerExamsService, AttemptsScheduler],
  exports: [TypeOrmModule, AttemptsService],
})
export class AttemptsModule {}
