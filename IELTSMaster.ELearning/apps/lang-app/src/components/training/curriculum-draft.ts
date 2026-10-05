import type {
  CurriculumDetail,
  CurriculumItemLabel,
  CurriculumItemType,
  CurriculumItemView,
  ExamStatus,
  SaveCurriculumItemsInput,
} from '@lang/shared';

// Bản đang sửa của giáo trình (chương + mục) và các phép biến đổi thuần dùng
// cho kéo thả / nút di chuyển. `key` ổn định cho React; `id` chỉ có ở mục/chương
// đã lưu (gửi lại để server giữ id). Các phép biến đổi generic theo loại mục/
// chương để giáo trình lớp (`components/classes`) dùng chung.

export const UNGROUPED = '__ungrouped';

export interface KeyedItem {
  key: string;
}

export interface KeyedGroup<I extends KeyedItem> {
  key: string;
  items: I[];
}

/** Cây chương + mục: mục chưa xếp chương rồi các chương theo thứ tự. */
export interface DraftTree<I extends KeyedItem, G extends KeyedGroup<I>> {
  ungrouped: I[];
  groups: G[];
}

export interface ItemDraft {
  key: string;
  id?: string;
  itemType: CurriculumItemType;
  contentId: string;
  contentTitle: string;
  contentStatus: ExamStatus;
  /** Tên hiển thị ghi đè; rỗng = tên bài học/đề. */
  title: string;
  label: CurriculumItemLabel;
  note: string;
}

export interface GroupDraft {
  key: string;
  id?: string;
  title: string;
  items: ItemDraft[];
}

export type CurriculumDraft = DraftTree<ItemDraft, GroupDraft>;

let counter = 0;
export const newKey = () => `new-${Date.now().toString(36)}-${counter++}`;

function fromItem(item: CurriculumItemView): ItemDraft {
  return {
    key: item.id,
    id: item.id,
    itemType: item.itemType,
    contentId: item.content.id,
    contentTitle: item.content.title,
    contentStatus: item.content.status,
    title: item.title ?? '',
    label: item.label,
    note: item.note ?? '',
  };
}

export function draftFromDetail(detail: CurriculumDetail): CurriculumDraft {
  return {
    ungrouped: detail.ungrouped.map(fromItem),
    groups: detail.groups.map((group) => ({
      key: group.id,
      id: group.id,
      title: group.title,
      items: group.items.map(fromItem),
    })),
  };
}

export function toSaveInput(
  draft: CurriculumDraft,
  baseRevision: number,
): SaveCurriculumItemsInput {
  const item = (row: ItemDraft) => ({
    ...(row.id ? { id: row.id } : {}),
    itemType: row.itemType,
    contentId: row.contentId,
    title: row.title.trim() || null,
    label: row.label,
    note: row.note.trim() || null,
  });
  return {
    baseRevision,
    ungrouped: draft.ungrouped.map(item),
    groups: draft.groups.map((group) => ({
      ...(group.id ? { id: group.id } : {}),
      title: group.title.trim(),
      items: group.items.map(item),
    })),
  };
}

/** So sánh bản đang sửa với bản đã lưu (bỏ qua `key`). */
export const draftSnapshot = (draft: CurriculumDraft) =>
  JSON.stringify(toSaveInput(draft, 0));

export const contentKey = (type: CurriculumItemType, id: string) =>
  `${type}:${id}`;

type ContentItem = KeyedItem & {
  itemType: CurriculumItemType;
  contentId: string;
};

/** Mọi mục của cây theo thứ tự hiển thị. */
export function allItems<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
): I[] {
  return [...draft.ungrouped, ...draft.groups.flatMap((group) => group.items)];
}

export function contentKeys<I extends ContentItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
): Set<string> {
  return new Set(
    allItems(draft).map((item) => contentKey(item.itemType, item.contentId)),
  );
}

export const itemCount = <I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
) => allItems(draft).length;

function itemsOf<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  groupKey: string,
): I[] {
  return groupKey === UNGROUPED
    ? draft.ungrouped
    : (draft.groups.find((group) => group.key === groupKey)?.items ?? []);
}

function withItems<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  groupKey: string,
  items: I[],
): DraftTree<I, G> {
  return groupKey === UNGROUPED
    ? { ...draft, ungrouped: items }
    : {
        ...draft,
        groups: draft.groups.map((group) =>
          group.key === groupKey ? { ...group, items } : group,
        ),
      };
}

/** Chương (hoặc `UNGROUPED`) đang chứa mục. */
export function groupKeyOf<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  itemKey: string,
): string {
  if (draft.ungrouped.some((item) => item.key === itemKey)) return UNGROUPED;
  return (
    draft.groups.find((group) =>
      group.items.some((item) => item.key === itemKey),
    )?.key ?? UNGROUPED
  );
}

/**
 * Chuyển mục tới vị trí `index` của chương đích (tính trên danh sách trước khi
 * gỡ mục ra); `index` bỏ trống = cuối chương.
 */
export function moveItem<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  itemKey: string,
  targetGroupKey: string,
  index?: number,
): DraftTree<I, G> {
  const sourceKey = groupKeyOf(draft, itemKey);
  const source = itemsOf(draft, sourceKey);
  const from = source.findIndex((item) => item.key === itemKey);
  if (from < 0) return draft;
  const item = source[from];
  let next = withItems(
    draft,
    sourceKey,
    source.filter((row) => row.key !== itemKey),
  );
  const target = [...itemsOf(next, targetGroupKey)];
  let at = index ?? target.length;
  if (sourceKey === targetGroupKey && index !== undefined && from < index) {
    at -= 1;
  }
  target.splice(Math.min(Math.max(at, 0), target.length), 0, item);
  next = withItems(next, targetGroupKey, target);
  return next;
}

export function updateItem<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  itemKey: string,
  patch: Partial<I>,
): DraftTree<I, G> {
  const groupKey = groupKeyOf(draft, itemKey);
  return withItems(
    draft,
    groupKey,
    itemsOf(draft, groupKey).map((item) =>
      item.key === itemKey ? { ...item, ...patch } : item,
    ),
  );
}

export function removeItem<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  itemKey: string,
): DraftTree<I, G> {
  const groupKey = groupKeyOf(draft, itemKey);
  return withItems(
    draft,
    groupKey,
    itemsOf(draft, groupKey).filter((item) => item.key !== itemKey),
  );
}

export function addItems<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  groupKey: string,
  items: I[],
): DraftTree<I, G> {
  return withItems(draft, groupKey, [...itemsOf(draft, groupKey), ...items]);
}

/** Đổi chỗ chương `from` sang vị trí `to`. */
export function moveGroup<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  from: number,
  to: number,
): DraftTree<I, G> {
  if (from === to || to < 0 || to >= draft.groups.length) return draft;
  const groups = [...draft.groups];
  const [group] = groups.splice(from, 1);
  groups.splice(to, 0, group);
  return { ...draft, groups };
}

/** Xoá chương; các mục của chương chuyển về cuối "Chưa xếp chương". */
export function removeGroup<I extends KeyedItem, G extends KeyedGroup<I>>(
  draft: DraftTree<I, G>,
  groupKey: string,
): DraftTree<I, G> {
  const group = draft.groups.find((row) => row.key === groupKey);
  if (!group) return draft;
  return {
    ...draft,
    ungrouped: [...draft.ungrouped, ...group.items],
    groups: draft.groups.filter((row) => row.key !== groupKey),
  };
}
