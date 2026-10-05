import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CatalogScope } from '@lang/shared';
import { IsNull, type FindOptionsWhere, type Repository } from 'typeorm';

/** CHECK định dạng mã, khớp `CATALOG_CODE_PATTERN` (`@lang/shared`). */
export const CATALOG_CODE_CHECK = `"code" ~ '^[A-Z0-9]+([-_][A-Z0-9]+)*$'`;

/**
 * Chủ sở hữu dữ liệu đang thao tác: `null` là trang hệ thống (`/admin/*`),
 * uuid là tenant (`/t/:slug/*`, lấy từ `TenantContext`).
 */
export type CatalogOwner = string | null;

interface ScopedRow {
  id: string;
  tenantId: string | null;
}

export function scopeOf(row: { tenantId: string | null }): CatalogScope {
  return row.tenantId === null ? CatalogScope.SYSTEM : CatalogScope.TENANT;
}

/** Điều kiện `tenant_id` của dữ liệu thuộc đúng chủ sở hữu. */
export function ownedBy(owner: CatalogOwner) {
  return owner === null ? IsNull() : owner;
}

/** Hệ thống chỉ thấy mục hệ thống; tenant thấy mục hệ thống và của mình. */
export function isVisibleTo(row: ScopedRow, owner: CatalogOwner): boolean {
  return row.tenantId === null || row.tenantId === owner;
}

/** Đọc các dòng chủ sở hữu nhìn thấy (2 truy vấn thay cho `OR` để repository giả dùng được). */
export async function findVisible<T extends ScopedRow>(
  repository: Repository<T>,
  owner: CatalogOwner,
): Promise<T[]> {
  const system = await repository.findBy({
    tenantId: IsNull(),
  } as FindOptionsWhere<T>);
  if (owner === null) return system;
  const own = await repository.findBy({
    tenantId: owner,
  } as FindOptionsWhere<T>);
  return [...system, ...own];
}

/**
 * Dòng chủ sở hữu được sửa/xoá. Tenant đụng vào mục hệ thống → 403; mục của
 * tenant khác (hoặc trang hệ thống đụng mục tenant) coi như không tồn tại.
 */
export async function findOwned<T extends ScopedRow>(
  repository: Repository<T>,
  owner: CatalogOwner,
  id: string,
  notFoundMessage: string,
): Promise<T> {
  const row = await repository.findOneBy({ id } as FindOptionsWhere<T>);
  if (!row || (row.tenantId !== null && row.tenantId !== owner)) {
    throw new NotFoundException(notFoundMessage);
  }
  if (row.tenantId !== owner) {
    throw new ForbiddenException(
      'Mục của hệ thống chỉ xem được, không sửa hay xoá được',
    );
  }
  return row;
}

/** Sắp xếp tiếng Việt, không phân biệt hoa thường. */
export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'vi', { sensitivity: 'base' });
}
