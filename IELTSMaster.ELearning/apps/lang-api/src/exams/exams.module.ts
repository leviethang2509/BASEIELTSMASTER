import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { CatalogModule } from '../catalog/catalog.module';
import { TenantsModule } from '../tenants/tenants.module';
import { User } from '../users/user.entity';
import { ExamContentService } from './exam-content.service';
import { ExamPart } from './exam-part.entity';
import { ExamQuestion } from './exam-question.entity';
import { ExamSection } from './exam-section.entity';
import { Exam } from './exam.entity';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

/** Đề thi, nội dung theo version và trình soạn đề (Step 12). */
@Module({
  imports: [
    TenantsModule,
    CatalogModule,
    TypeOrmModule.forFeature([
      Exam,
      ExamSection,
      ExamPart,
      ExamQuestion,
      ExamAttempt,
      User,
    ]),
  ],
  controllers: [ExamsController],
  providers: [ExamsService, ExamContentService],
  exports: [TypeOrmModule, ExamsService],
})
export class ExamsModule {}
