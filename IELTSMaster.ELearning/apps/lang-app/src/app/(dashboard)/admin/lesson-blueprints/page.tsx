'use client';

import { CatalogScope } from '@lang/shared';
import { LessonBlueprintsView } from '@/components/catalog/LessonBlueprintsView';

export default function AdminLessonBlueprintsPage() {
  return (
    <LessonBlueprintsView
      apiBase="/admin"
      scope={CatalogScope.SYSTEM}
      canManage
    />
  );
}
