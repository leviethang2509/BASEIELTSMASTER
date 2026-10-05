import {
  EXAM_AUTHOR_ROLES,
  GRADER_ROLES,
  TENANT_MANAGER_ROLES,
  hasAnyRole,
  type TenantRole,
} from '@lang/shared';
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderTree,
  GraduationCap,
  Images,
  Layers,
  LayoutTemplate,
  LayoutDashboard,
  ListTree,
  Presentation,
  School,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { vi } from '@/i18n/vi';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/** Ngữ cảnh của dashboard; chỉ gồm dữ liệu thuần để truyền từ server layout. */
export type NavScope =
  | { kind: 'system' }
  | { kind: 'tenant'; slug: string; roles: readonly TenantRole[] };

function systemNavigation(): NavSection[] {
  return [
    {
      items: [
        { label: vi.nav.overview, href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      label: vi.nav.sectionManagement,
      items: [
        { label: vi.nav.users, href: '/admin/users', icon: Users },
        { label: vi.nav.tenants, href: '/admin/tenants', icon: Building2 },
        { label: vi.nav.plans, href: '/admin/plans', icon: CreditCard },
      ],
    },
    {
      label: vi.nav.sectionExam,
      items: [
        {
          label: vi.nav.categories,
          href: '/admin/categories',
          icon: FolderTree,
        },
        {
          label: vi.nav.examBlueprints,
          href: '/admin/exam-blueprints',
          icon: Layers,
        },
        {
          label: vi.nav.lessonBlueprints,
          href: '/admin/lesson-blueprints',
          icon: LayoutTemplate,
        },
      ],
    },
    {
      items: [
        { label: vi.nav.userManual, href: '/user-manual', icon: BookOpen },
      ],
    },
  ];
}

// Menu theo role trong tenant (plan mục 5.2). Ẩn menu chỉ là lớp giao diện,
// API vẫn kiểm tra quyền.
function tenantNavigation(
  slug: string,
  roles: readonly TenantRole[],
): NavSection[] {
  const base = `/t/${slug}/dashboard`;
  const sections: NavSection[] = [
    { items: [{ label: vi.nav.overview, href: base, icon: LayoutDashboard }] },
  ];

  if (hasAnyRole(roles, TENANT_MANAGER_ROLES)) {
    sections.push({
      label: vi.nav.sectionManagement,
      items: [{ label: vi.nav.members, href: `${base}/members`, icon: Users }],
    });
  }

  const examItems: NavItem[] = [];
  if (hasAnyRole(roles, EXAM_AUTHOR_ROLES)) {
    examItems.push(
      {
        label: vi.nav.categories,
        href: `${base}/categories`,
        icon: FolderTree,
      },
      {
        label: vi.nav.examBlueprints,
        href: `${base}/exam-blueprints`,
        icon: Layers,
      },
      {
        label: vi.nav.lessonBlueprints,
        href: `${base}/lesson-blueprints`,
        icon: LayoutTemplate,
      },
      { label: vi.nav.exams, href: `${base}/exams`, icon: FileText },
      { label: vi.nav.lessons, href: `${base}/lessons`, icon: GraduationCap },
      { label: vi.nav.media, href: `${base}/media`, icon: Images },
    );
  }
  if (hasAnyRole(roles, GRADER_ROLES)) {
    examItems.push({
      label: vi.nav.grading,
      href: `${base}/grading`,
      icon: ClipboardCheck,
    });
  }
  if (examItems.length > 0) {
    sections.push({ label: vi.nav.sectionExam, items: examItems });
  }
  if (hasAnyRole(roles, EXAM_AUTHOR_ROLES)) {
    sections.push({
      label: vi.nav.sectionTraining,
      items: [
        { label: vi.nav.courses, href: `${base}/courses`, icon: School },
        { label: vi.nav.curricula, href: `${base}/curricula`, icon: ListTree },
        { label: vi.nav.classes, href: `${base}/classes`, icon: Presentation },
        {
          label: vi.nav.schedule,
          href: `${base}/schedule`,
          icon: CalendarDays,
        },
      ],
    });
  }
  if (hasAnyRole(roles, TENANT_MANAGER_ROLES)) {
    sections.push({
      items: [
        { label: vi.nav.settings, href: `${base}/settings`, icon: Settings },
      ],
    });
  }
  return sections;
}

export function navigationFor(scope: NavScope): NavSection[] {
  return scope.kind === 'system'
    ? systemNavigation()
    : tenantNavigation(scope.slug, scope.roles);
}

/** Mục khớp dài nhất với pathname, để `/admin` không active ở mọi trang con. */
export function findActiveItem(
  sections: NavSection[],
  pathname: string,
): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of sections.flatMap((section) => section.items)) {
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best;
}
