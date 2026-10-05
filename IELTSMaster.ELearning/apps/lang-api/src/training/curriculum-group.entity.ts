import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Curriculum } from './curriculum.entity';

/** Chương của giáo trình (1 cấp, C4). */
@Entity('curriculum_groups')
export class CurriculumGroup {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_curriculum_groups',
  })
  id: string;

  @Index('IDX_curriculum_groups_curriculum_id')
  @Column({ name: 'curriculum_id', type: 'uuid' })
  curriculumId: string;

  @ManyToOne(() => Curriculum, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'curriculum_id',
    foreignKeyConstraintName: 'FK_curriculum_groups_curriculum_id',
  })
  curriculum?: Curriculum;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;
}
