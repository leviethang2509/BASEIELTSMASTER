import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsModule } from '../lessons/lessons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { TenantsModule } from '../tenants/tenants.module';
import { LearnerLessonsController } from './learner-lessons.controller';
import { LearnerLessonsService } from './learner-lessons.service';
import { LessonAttemptAnswer } from './lesson-attempt-answer.entity';
import { LessonAttemptSection } from './lesson-attempt-section.entity';
import { LessonAttempt } from './lesson-attempt.entity';
import { LessonAttemptsService } from './lesson-attempts.service';

/** Học bài học, chấm tự động bài tập và kết quả của học viên (req-3 Step 5). */
@Module({
  imports: [
    TenantsModule,
    LessonsModule,
    NotificationsModule,
    StorageModule,
    TypeOrmModule.forFeature([
      LessonAttempt,
      LessonAttemptSection,
      LessonAttemptAnswer,
    ]),
  ],
  controllers: [LearnerLessonsController],
  providers: [LessonAttemptsService, LearnerLessonsService],
  exports: [TypeOrmModule, LessonAttemptsService],
})
export class LessonAttemptsModule {}
