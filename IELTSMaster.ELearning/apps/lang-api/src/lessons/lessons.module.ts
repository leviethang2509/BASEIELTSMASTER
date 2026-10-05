import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { User } from '../users/user.entity';
import { LessonAttemptLookup } from './lesson-attempt-lookup';
import { LessonContentService } from './lesson-content.service';
import { LessonPart } from './lesson-part.entity';
import { LessonQuestion } from './lesson-question.entity';
import { LessonSection } from './lesson-section.entity';
import { Lesson } from './lesson.entity';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

/** Bài học, nội dung theo version và trình soạn bài học (req-3 Step 4). */
@Module({
  imports: [
    TenantsModule,
    CatalogModule,
    TypeOrmModule.forFeature([
      Lesson,
      LessonSection,
      LessonPart,
      LessonQuestion,
      LessonAttempt,
      User,
    ]),
  ],
  controllers: [LessonsController],
  providers: [LessonsService, LessonContentService, LessonAttemptLookup],
  exports: [TypeOrmModule, LessonsService],
})
export class LessonsModule {}
