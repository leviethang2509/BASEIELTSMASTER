import {
  CurriculumItemType,
  DEFAULT_PASS_THRESHOLD,
  ExamStatus,
  defaultCurriculumLabel,
  isoToTrainingLocal,
  trainingLocalToIso,
  type ClassCurriculum,
  type ClassItemView,
  type CurriculumDetail,
  type CurriculumItemLabel,
  type SaveClassCurriculumInput,
} from '@lang/shared';
import type { PickedContent } from '@/components/training/ContentPickerDialog';
import {
  allItems,
  contentKey,
  type DraftTree,
} from '@/components/training/curriculum-draft';

// Bản đang sửa của giáo trình lớp. `key` của mục là id (mục đã lưu) hoặc uuid
// sinh ở client (mục mới) và luôn gửi lên làm `id`, để lần thi lại trỏ được
// tới mục gốc vừa thêm. Ngày giờ giữ dạng ô `datetime-local` (giờ Việt Nam).

export interface ClassItemDraft {
  key: string;
  itemType: CurriculumItemType;
  contentId: string;
  contentTitle: string;
  contentStatus: ExamStatus;
  title: string;
  label: CurriculumItemLabel;
  note: string;
  opensAt: string;
  deadlineAt: string;
  acceptLate: boolean;
  passThreshold: string;
  /** `key` của mục gốc; rỗng = không phải lần thi lại. */
  retakeOf: string;
  learnerCount: number;
}

export interface ClassGroupDraft {
  key: string;
  id?: string;
  title: string;
  opensAt: string;
  items: ClassItemDraft[];
}

export type ClassCurriculumDraft = DraftTree<ClassItemDraft, ClassGroupDraft>;

/** uuid v4; không dùng `crypto.randomUUID` vì VPS chạy HTTP. */
export function newItemId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10, 16),
  ]
    .map((part) => part.join(''))
    .join('-');
}

const toLocal = (iso: string | null) => (iso ? isoToTrainingLocal(iso) : '');

export function classItemFromView(item: ClassItemView): ClassItemDraft {
  return {
    key: item.id,
    itemType: item.itemType,
    contentId: item.content.id,
    contentTitle: item.content.title,
    contentStatus: item.content.status,
    title: item.title ?? '',
    label: item.label,
    note: item.note ?? '',
    opensAt: toLocal(item.opensAt),
    deadlineAt: toLocal(item.deadlineAt),
    acceptLate: item.acceptLate,
    passThreshold: String(item.passThreshold),
    retakeOf: item.retakeOfItemId ?? '',
    learnerCount: item.learnerCount,
  };
}

/** Mục mới từ bài học/đề thi chọn được; `extra` chép từ mục giáo trình tham khảo. */
export function newClassItem(
  content: PickedContent,
  extra: {
    label?: CurriculumItemLabel;
    title?: string | null;
    note?: string | null;
  } = {},
): ClassItemDraft {
  return {
    key: newItemId(),
    itemType: content.itemType,
    contentId: content.id,
    contentTitle: content.title,
    contentStatus: content.status,
    title: extra.title ?? '',
    label: extra.label ?? defaultCurriculumLabel(content.itemType),
    note: extra.note ?? '',
    opensAt: '',
    deadlineAt: '',
    acceptLate: true,
    passThreshold: String(DEFAULT_PASS_THRESHOLD),
    retakeOf: '',
    learnerCount: 0,
  };
}

export function classDraftFrom(curriculum: ClassCurriculum): {
  draft: ClassCurriculumDraft;
  removed: ClassItemDraft[];
} {
  return {
    draft: {
      ungrouped: curriculum.ungrouped.map(classItemFromView),
      groups: curriculum.groups.map((group) => ({
        key: group.id,
        id: group.id,
        title: group.title,
        opensAt: toLocal(group.opensAt),
        items: group.items.map(classItemFromView),
      })),
    },
    removed: curriculum.removed.map(classItemFromView),
  };
}

/** Ô `datetime-local` → ISO (rỗng/sai → `null`). */
const toIso = (local: string) => (local ? trainingLocalToIso(local) : null);

export function toClassSaveInput(
  draft: ClassCurriculumDraft,
  baseRevision: number,
): SaveClassCurriculumInput {
  const item = (row: ClassItemDraft) => {
    const isExam = row.itemType === CurriculumItemType.EXAM;
    return {
      id: row.key,
      itemType: row.itemType,
      contentId: row.contentId,
      title: row.title.trim() || null,
      label: row.label,
      note: row.note.trim() || null,
      opensAt: toIso(row.opensAt),
      deadlineAt: toIso(row.deadlineAt),
      ...(isExam
        ? {
            acceptLate: row.acceptLate,
            passThreshold: Number(row.passThreshold || DEFAULT_PASS_THRESHOLD),
            retakeOfItemId: row.retakeOf || null,
          }
        : {}),
    };
  };
  return {
    baseRevision,
    ungrouped: draft.ungrouped.map(item),
    groups: draft.groups.map((group) => ({
      ...(group.id ? { id: group.id } : {}),
      title: group.title.trim(),
      opensAt: toIso(group.opensAt),
      items: group.items.map(item),
    })),
  };
}

/** So sánh bản đang sửa với bản đã lưu. */
export const classDraftSnapshot = (draft: ClassCurriculumDraft) =>
  JSON.stringify(toClassSaveInput(draft, 0));

/** Mục đề thi gốc (không phải lần thi lại) đứng trước mục `key`. */
export function retakeTargets(
  draft: ClassCurriculumDraft,
  key: string,
): ClassItemDraft[] {
  const items = allItems(draft);
  const index = items.findIndex((item) => item.key === key);
  return items
    .slice(0, Math.max(index, 0))
    .filter(
      (item) => item.itemType === CurriculumItemType.EXAM && !item.retakeOf,
    );
}

/**
 * Nội dung đã có trong lớp (không tính lần thi lại): đề thi thêm lại chỉ được
 * khi là lần thi lại nên hộp chọn coi như "Đã có".
 */
export function classContentKeys(draft: ClassCurriculumDraft): Set<string> {
  return new Set(
    allItems(draft)
      .filter((item) => !item.retakeOf)
      .map((item) => contentKey(item.itemType, item.contentId)),
  );
}

/**
 * Chép chương + mục của giáo trình tham khảo vào bản đang sửa: bỏ qua bài/đề
 * đã có trong lớp hoặc chưa publish; mục đã ẩn trùng nội dung thì khôi phục.
 * Chương cùng tên đã có thì chép vào chương đó.
 */
export function importCurriculum(
  draft: ClassCurriculumDraft,
  removed: ClassItemDraft[],
  source: CurriculumDetail,
  newGroupKey: () => string,
): {
  draft: ClassCurriculumDraft;
  removed: ClassItemDraft[];
  added: number;
  skipped: number;
} {
  const existing = classContentKeys(draft);
  let restPool = [...removed];
  let added = 0;
  let skipped = 0;
  const take = (item: CurriculumDetail['ungrouped'][number]) => {
    const key = contentKey(item.itemType, item.content.id);
    if (existing.has(key)) {
      skipped += 1;
      return [];
    }
    const hidden = restPool.find(
      (row) => contentKey(row.itemType, row.contentId) === key,
    );
    if (hidden) {
      restPool = restPool.filter((row) => row !== hidden);
    } else if (item.content.status !== ExamStatus.PUBLISHED) {
      skipped += 1;
      return [];
    }
    existing.add(key);
    added += 1;
    return [
      hidden ??
        newClassItem(
          { itemType: item.itemType, ...item.content },
          { label: item.label, title: item.title, note: item.note },
        ),
    ];
  };

  const ungrouped = [...draft.ungrouped, ...source.ungrouped.flatMap(take)];
  const groups = [...draft.groups];
  for (const group of source.groups) {
    const items = group.items.flatMap(take);
    if (items.length === 0) continue;
    const index = groups.findIndex(
      (row) => row.title.trim() === group.title.trim(),
    );
    if (index >= 0) {
      groups[index] = {
        ...groups[index],
        items: [...groups[index].items, ...items],
      };
    } else {
      groups.push({
        key: newGroupKey(),
        title: group.title,
        opensAt: '',
        items,
      });
    }
  }
  return { draft: { ungrouped, groups }, removed: restPool, added, skipped };
}
