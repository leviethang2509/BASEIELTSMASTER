import {
  manualBlockTexts,
  manualHeadingId,
  manualPlainText,
  type ManualGroup,
  type ManualPage,
  type ManualRole,
  type UserManual,
} from '@lang/shared';

export const USER_MANUAL_BASE = '/user-manual';

export function manualPageHref(pageId: string, anchor?: string | null): string {
  return `${USER_MANUAL_BASE}/${pageId}${anchor ? `#${anchor}` : ''}`;
}

export function allManualPages(manual: UserManual): ManualPage[] {
  return manual.groups.flatMap((group) => group.pages);
}

/** Chữ thường, bỏ dấu tiếng Việt, gộp khoảng trắng: tìm "dang nhap" khớp "Đăng nhập". */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ManualSearchEntry {
  page: ManualPage;
  /** Tiêu đề + tóm tắt + mọi chữ trong trang, đã chuẩn hoá. */
  haystack: string;
  /** Các đoạn chữ thuần để trích đoạn khớp. */
  texts: string[];
}

export function buildSearchIndex(manual: UserManual): ManualSearchEntry[] {
  return allManualPages(manual).map((page) => {
    const texts = [
      page.title,
      page.summary,
      ...page.blocks.flatMap(manualBlockTexts).map(manualPlainText),
    ];
    return {
      page,
      texts,
      haystack: normalizeSearchText(texts.join(' \n ')),
    };
  });
}

export interface ManualSearchResult {
  page: ManualPage;
  /** Đoạn chữ đầu tiên chứa từ khoá (ngoài tiêu đề), để hiện dưới kết quả. */
  snippet: string | null;
}

/** Trang chứa đủ mọi từ của truy vấn (không cần liền nhau). */
export function searchManual(
  index: readonly ManualSearchEntry[],
  query: string,
): ManualSearchResult[] {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  if (terms.length === 0) return [];
  return index
    .filter((entry) => terms.every((term) => entry.haystack.includes(term)))
    .map((entry) => {
      const match = entry.texts
        .slice(1)
        .find((text) => normalizeSearchText(text).includes(terms[0]));
      return {
        page: entry.page,
        snippet: match ? snippet(match, terms[0]) : null,
      };
    });
}

function snippet(text: string, term: string, radius = 60): string {
  // Bỏ dấu giữ nguyên số ký tự với chữ dựng sẵn (NFC) nên vị trí tìm được trên
  // bản chuẩn hoá dùng được cho bản gốc.
  const flat = text.replace(/\s+/g, ' ').trim();
  const at = normalizeSearchText(flat).indexOf(term);
  if (at < 0 || flat.length <= radius * 2) return flat;
  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + term.length + radius);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

/** Nhóm chỉ giữ trang dành cho role (trang `roles` rỗng là trang chung). */
export function filterManualGroups(
  groups: readonly ManualGroup[],
  role: ManualRole | '',
): ManualGroup[] {
  if (!role) return [...groups];
  return groups
    .map((group) => ({
      ...group,
      pages: group.pages.filter(
        (page) => page.roles.length === 0 || page.roles.includes(role),
      ),
    }))
    .filter((group) => group.pages.length > 0);
}

export interface ManualTocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export function manualToc(page: ManualPage): ManualTocItem[] {
  return page.blocks.flatMap((block) =>
    block.type === 'heading'
      ? [
          {
            id: manualHeadingId(block.text),
            text: manualPlainText(block.text),
            level: block.level,
          },
        ]
      : [],
  );
}
