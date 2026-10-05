import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import { ClassSession } from './class-session.entity';

/**
 * Map buổi ↔ chương hoặc mục của giáo trình lớp (D4, R17), nhiều–nhiều, chỉ
 * tham khảo. Mục bị xoá/ẩn khỏi giáo trình lớp thì bỏ map.
 */
@Entity('class_session_links')
@Index('UQ_class_session_links_item', ['sessionId', 'classItemId'], {
  unique: true,
})
@Index('UQ_class_session_links_group', ['sessionId', 'classGroupId'], {
  unique: true,
})
@Check(
  'CHK_class_session_links_target',
  '("class_item_id" IS NULL) <> ("class_group_id" IS NULL)',
)
export class ClassSessionLink {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_class_session_links',
  })
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => ClassSession, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'session_id',
    foreignKeyConstraintName: 'FK_class_session_links_session_id',
  })
  session?: ClassSession;

  @Index('IDX_class_session_links_class_item_id')
  @Column({ name: 'class_item_id', type: 'uuid', nullable: true })
  classItemId: string | null;

  @ManyToOne(() => ClassItem, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'class_item_id',
    foreignKeyConstraintName: 'FK_class_session_links_class_item_id',
  })
  classItem?: ClassItem | null;

  @Index('IDX_class_session_links_class_group_id')
  @Column({ name: 'class_group_id', type: 'uuid', nullable: true })
  classGroupId: string | null;

  @ManyToOne(() => ClassGroup, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'class_group_id',
    foreignKeyConstraintName: 'FK_class_session_links_class_group_id',
  })
  classGroup?: ClassGroup | null;
}
