'use client';

import { CatalogScope } from '@lang/shared';
import { ExamBlueprintsView } from '@/components/catalog/ExamBlueprintsView';

export default function AdminExamBlueprintsPage() {
  return (
    <ExamBlueprintsView
      apiBase="/admin"
      scope={CatalogScope.SYSTEM}
      canManage
    />
  );
}
