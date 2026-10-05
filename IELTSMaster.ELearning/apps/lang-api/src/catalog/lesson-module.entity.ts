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
import { CATALOG_CODE_CHECK } from './catalog-scope';
import { LessonBlueprint } from './lesson-blueprint.entity';

/**
 * Phần của mẫu bài học (Từ vựng, Ngữ pháp…), không có thời lượng. Section của
 * bài học chỉ snapshot phần lúc tạo, sửa/xoá phần không ảnh hưởng bài đã tạo.
 */
@Entity('lesson_modules')
// Deferred để lưu cả danh sách phần trong 1 transaction mà đổi chéo mã được.
@Unique('UQ_lesson_modules_blueprint_code', ['blueprintId', 'code'], {
  deferrable: 'INITIALLY DEFERRED',
})
@Check('CHK_lesson_modules_code_format', CATALOG_CODE_CHECK)
export class LessonModule {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_lesson_modules',
  })
  id: string;

  @Column({ name: 'blueprint_id', type: 'uuid' })
  blueprintId: string;

  @ManyToOne(() => LessonBlueprint, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'blueprint_id',
    foreignKeyConstraintName: 'FK_lesson_modules_blueprint_id',
  })
  blueprint?: LessonBlueprint;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  /** Vị trí trong danh sách phần gửi lên (từ 0). */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
