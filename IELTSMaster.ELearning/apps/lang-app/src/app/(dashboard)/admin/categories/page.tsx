'use client';

import { CatalogScope } from '@lang/shared';
import { CategoriesView } from '@/components/catalog/CategoriesView';

export default function AdminCategoriesPage() {
  return (
    <CategoriesView apiBase="/admin" scope={CatalogScope.SYSTEM} canManage />
  );
}
