'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Brain,
  FileText,
  Globe,
  GraduationCap,
  Headphones,
  Languages,
  Library,
  MessageCircle,
  Mic,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import {
  CatalogScope,
  type CategoryColor,
  type CategoryIconName,
} from '@lang/shared';
import { Badge } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';

/** Mã màu Solarized của `CategoryColor`. */
export const CATEGORY_COLOR_HEX: Record<CategoryColor, string> = {
  yellow: '#b58900',
  orange: '#cb4b16',
  red: '#dc322f',
  magenta: '#d33682',
  violet: '#6c71c4',
  blue: '#268bd2',
  cyan: '#2aa198',
  green: '#859900',
};

export const CATEGORY_ICONS: Record<CategoryIconName, LucideIcon> = {
  languages: Languages,
  globe: Globe,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  library: Library,
  award: Award,
  headphones: Headphones,
  mic: Mic,
  'pen-line': PenLine,
  'message-circle': MessageCircle,
  'file-text': FileText,
  brain: Brain,
};

/** Ô vuông biểu tượng + màu của danh mục. */
export function CategoryIcon({
  icon,
  color,
  size = 32,
}: {
  icon: CategoryIconName;
  color: CategoryColor;
  size?: number;
}) {
  const Icon = CATEGORY_ICONS[icon];
  const hex = CATEGORY_COLOR_HEX[color];
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-lg"
      style={{
        width: size,
        height: size,
        color: hex,
        backgroundColor: `${hex}22`,
      }}
    >
      <Icon size={Math.round(size * 0.55)} />
    </span>
  );
}

export function ScopeBadge({ scope }: { scope: CatalogScope }) {
  return scope === CatalogScope.SYSTEM ? (
    <Badge tone="accent" title={vi.catalog.systemHint}>
      {vi.catalog.scope.system}
    </Badge>
  ) : (
    <Badge>{vi.catalog.scope.tenant}</Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? 'success' : 'neutral'}>
      {active ? vi.catalog.active : vi.catalog.inactive}
    </Badge>
  );
}

/** Tìm không phân biệt hoa thường và dấu tiếng Việt. */
export function matchesSearch(query: string, ...values: string[]): boolean {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/đ/gi, 'd')
      .toLowerCase();
  const needle = normalize(query.trim());
  return !needle || values.some((value) => normalize(value).includes(needle));
}

/** Tải danh sách (không phân trang) và tải lại sau khi thêm/sửa/xoá. */
export function useCatalogList<T>(path: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<T[]>(path)
      .then(
        (result) => {
          if (cancelled) return;
          setRows(result);
          setError(null);
        },
        (err: unknown) => {
          if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  return {
    rows,
    loading,
    error,
    setError,
    reload: () => setReloadKey((key) => key + 1),
  };
}
