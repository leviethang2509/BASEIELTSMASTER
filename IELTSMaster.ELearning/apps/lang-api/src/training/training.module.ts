import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../catalog/category.entity';
import { Exam } from '../exams/exam.entity';
import { Lesson } from '../lessons/lesson.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { User } from '../users/user.entity';
import { CourseCurriculum } from './course-curriculum.entity';
import { Course } from './course.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CurriculaController } from './curricula.controller';
import { CurriculaService } from './curricula.service';
import { CurriculumGroup } from './curriculum-group.entity';
import { CurriculumItem } from './curriculum-item.entity';
import { Curriculum } from './curriculum.entity';

/** Khoá học và giáo trình tham khảo (req-3 Step 6); lớp học thêm ở Step 7. */
@Module({
  imports: [
    TenantsModule,
    TypeOrmModule.forFeature([
      Course,
      Curriculum,
      CourseCurriculum,
      CurriculumGroup,
      CurriculumItem,
      Category,
      Lesson,
      Exam,
      User,
    ]),
  ],
  controllers: [CoursesController, CurriculaController],
  providers: [CoursesService, CurriculaService],
  exports: [TypeOrmModule, CoursesService, CurriculaService],
})
export class TrainingModule {}
