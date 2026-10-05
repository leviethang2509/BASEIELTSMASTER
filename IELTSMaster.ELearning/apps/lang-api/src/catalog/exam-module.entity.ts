import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { sqlDurationMinutes } from '../common/sql';
import { CATALOG_CODE_CHECK } from './catalog-scope';
import { ExamBlueprint } from './exam-blueprint.entity';

/**
 * Module của loại đề (Listening, Reading…). Section của đề thi chỉ snapshot
 * module lúc tạo, sửa/xoá module không ảnh hưởng đề đã tạo.
 */
@Entity('exam_modules')
// Deferred để lưu cả danh sách module trong 1 transaction mà đổi chéo mã được.
@Unique('UQ_exam_modules_blueprint_code', ['blueprintId', 'code'], {
  deferrable: 'INITIALLY DEFERRED',
})
@Check('CHK_exam_modules_code_format', CATALOG_CODE_CHECK)
@Check(
  'CHK_exam_modules_reference_duration',
  sqlDurationMinutes('reference_duration_minutes'),
)
export class ExamModule {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_exam_modules',
  })
  id: string;

  @Column({ name: 'blueprint_id', type: 'uuid' })
  blueprintId: string;

  @ManyToOne(() => ExamBlueprint, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'blueprint_id',
    foreignKeyConstraintName: 'FK_exam_modules_blueprint_id',
  })
  blueprint?: ExamBlueprint;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  /** Vị trí trong danh sách module gửi lên (từ 0). */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ name: 'reference_duration_minutes', type: 'integer' })
  referenceDurationMinutes: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
