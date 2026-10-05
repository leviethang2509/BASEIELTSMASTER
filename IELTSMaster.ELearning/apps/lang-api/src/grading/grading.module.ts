import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttemptsModule } from '../attempts/attempts.module';
import { ClassroomsModule } from '../classrooms/classrooms.module';
import { LessonAttemptsModule } from '../lesson-attempts/lesson-attempts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { TenantsModule } from '../tenants/tenants.module';
import { GradingDelegation } from './grading-delegation.entity';
import { GradingDelegationsService } from './grading-delegations.service';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { LessonGradingController } from './lesson-grading.controller';
import { LessonGradingService } from './lesson-grading.service';

/**
 * Chấm bài thủ công: đề thi (Step 14 req-1), bài học (req-3 Step 5), quyền
 * chấm theo lớp/người soạn và chuyển giao chấm (req-3 Step 10).
 */
@Module({
  imports: [
    TenantsModule,
    AttemptsModule,
    LessonAttemptsModule,
    ClassroomsModule,
    NotificationsModule,
    StorageModule,
    TypeOrmModule.forFeature([GradingDelegation]),
  ],
  controllers: [GradingController, LessonGradingController],
  providers: [GradingService, LessonGradingService, GradingDelegationsService],
})
export class GradingModule {}
