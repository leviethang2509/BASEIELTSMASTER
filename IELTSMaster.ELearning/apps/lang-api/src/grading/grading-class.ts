import type {
  GradingClassItemOption,
  GradingClassItemRef,
  GradingClassOption,
} from '@lang/shared';
import { In, type EntityManager } from 'typeorm';
import { ClassItem } from '../classrooms/class-item.entity';
import { loadContents } from '../classrooms/class-curriculum.service';
import { Classroom } from '../classrooms/classroom.entity';
import { classContentIdOf } from '../classrooms/classroom.mapper';

// Lớp/mục của các bài làm ở trang Chấm bài (req-3 Step 10): cột "Lớp · Mục"
// và hai ô lọc. Mục đã bị bỏ khỏi giáo trình lớp (`removed_at`) vẫn hiện vì
// bài làm cũ vẫn phải chấm được.

/** Mục lớp → tên mục + lớp, cho các bài làm có `class_item_id`. */
export async function loadClassItemRefs(
  manager: EntityManager,
  itemIds: readonly string[],
): Promise<Map<string, GradingClassItemRef>> {
  const ids = [...new Set(itemIds)];
  if (ids.length === 0) return new Map();
  const items = await manager.getRepository(ClassItem).findBy({ id: In(ids) });
  if (items.length === 0) return new Map();
  const [classrooms, contents] = await Promise.all([
    manager
      .getRepository(Classroom)
      .findBy({ id: In([...new Set(items.map((item) => item.classroomId))]) }),
    loadContents(manager, items),
  ]);
  const classroomById = new Map(classrooms.map((row) => [row.id, row]));
  return new Map(
    items.flatMap((item) => {
      const classroom = classroomById.get(item.classroomId);
      if (!classroom) return [];
      return [
        [
          item.id,
          {
            itemId: item.id,
            itemTitle:
              item.title ?? contents.get(classContentIdOf(item))?.title ?? '',
            classroomId: classroom.id,
            classroomCode: classroom.code,
            classroomName: classroom.name,
          },
        ] as const,
      ];
    }),
  );
}

/** Giá trị cho hai ô lọc "Lớp" và "Mục" của trang Chấm bài. */
export function classFilterOptions(
  refs: ReadonlyMap<string, GradingClassItemRef>,
): { classes: GradingClassOption[]; classItems: GradingClassItemOption[] } {
  const classes = new Map<string, GradingClassOption>();
  const classItems: GradingClassItemOption[] = [];
  for (const ref of refs.values()) {
    classes.set(ref.classroomId, {
      id: ref.classroomId,
      code: ref.classroomCode,
      name: ref.classroomName,
    });
    classItems.push({
      id: ref.itemId,
      classroomId: ref.classroomId,
      title: ref.itemTitle,
    });
  }
  return {
    classes: [...classes.values()].sort((a, b) => a.code.localeCompare(b.code)),
    classItems: classItems.sort((a, b) => a.title.localeCompare(b.title, 'vi')),
  };
}
