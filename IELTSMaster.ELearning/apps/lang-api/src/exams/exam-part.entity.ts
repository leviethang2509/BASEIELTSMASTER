import { ExamPartKind } from '@lang/shared';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { ExamSection } from './exam-section.entity';

/** Part/Subpart của section, tách từ indicator bằng `extractStructure`. */
@Entity('exam_parts')
@Unique('UQ_exam_parts_section_node', ['sectionId', 'nodeId'])
@Check('CHK_exam_parts_kind', sqlInList('kind', ExamPartKind))
export class ExamPart {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_exam_parts' })
  id: string;

  @Column({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @ManyToOne(() => ExamSection, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'section_id',
    foreignKeyConstraintName: 'FK_exam_parts_section_id',
  })
  section?: ExamSection;

  /** Part chứa subpart; `null` với part và subpart đứng trước part đầu tiên. */
  @Index('IDX_exam_parts_parent_part_id')
  @Column({ name: 'parent_part_id', type: 'uuid', nullable: true })
  parentPartId: string | null;

  @ManyToOne(() => ExamPart, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'parent_part_id',
    foreignKeyConstraintName: 'FK_exam_parts_parent_part_id',
  })
  parentPart?: ExamPart | null;

  @Column({ type: 'varchar', length: 16 })
  kind: ExamPartKind;

  /** Id của indicator trong `raw_data`. */
  @Column({ name: 'node_id', type: 'varchar', length: 64 })
  nodeId: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({ name: 'first_number', type: 'int', nullable: true })
  firstNumber: number | null;

  @Column({ name: 'last_number', type: 'int', nullable: true })
  lastNumber: number | null;
}
