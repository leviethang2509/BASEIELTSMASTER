import {
  CreateDateColumn,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from './course.entity';
import { Curriculum } from './curriculum.entity';

/**
 * Giáo trình tham khảo gắn vào khoá học (m-m). Xoá khoá học thì bỏ gắn; xoá
 * giáo trình đang gắn bị chặn (NO ACTION, service báo 409).
 */
@Entity('course_curricula')
export class CourseCurriculum {
  @PrimaryColumn({
    name: 'course_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_course_curricula',
  })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'course_id',
    foreignKeyConstraintName: 'FK_course_curricula_course_id',
  })
  course?: Course;

  @Index('IDX_course_curricula_curriculum_id')
  @PrimaryColumn({
    name: 'curriculum_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_course_curricula',
  })
  curriculumId: string;

  @ManyToOne(() => Curriculum, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'curriculum_id',
    foreignKeyConstraintName: 'FK_course_curricula_curriculum_id',
  })
  curriculum?: Curriculum;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_course_curricula_created_by',
  })
  creator?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
