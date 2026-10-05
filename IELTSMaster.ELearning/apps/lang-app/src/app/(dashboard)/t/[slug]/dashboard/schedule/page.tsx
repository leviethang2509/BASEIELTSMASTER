'use client';

import { useEffect, useState } from 'react';
import {
  CourseStatus,
  TENANT_MANAGER_ROLES,
  TenantRole,
  hasAnyRole,
  type CourseListItem,
  type MembershipListItem,
} from '@lang/shared';
import { CalendarFeedView } from '@/components/calendar/CalendarFeedView';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { SelectFilter } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { listActiveMembers } from '@/lib/classroom-api';
import { getCenterSchedule, getMySchedule } from '@/lib/schedule-api';
import { listCourses } from '@/lib/training-api';

type Scope = 'mine' | 'center';

/**
 * Lịch (R16): "Lịch dạy của tôi" cho giáo viên (kể cả buổi dạy thế); Owner/
 * Admin thêm "Lịch trung tâm" lọc theo khoá học, giáo viên.
 */
export default function SchedulePage() {
  const { tenant, roles } = useTenantDashboard();
  const slug = tenant.slug;
  const text = vi.schedule;
  const isManager = hasAnyRole(roles, TENANT_MANAGER_ROLES);
  const [scope, setScope] = useState<Scope>(isManager ? 'center' : 'mine');
  const [courseId, setCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [teachers, setTeachers] = useState<MembershipListItem[]>([]);

  useEffect(() => {
    if (!isManager) return;
    listCourses(slug, {
      page: 1,
      pageSize: 100,
      status: CourseStatus.ACTIVE,
    }).then(
      (result) => setCourses(result.items),
      () => undefined,
    );
    listActiveMembers(slug, TenantRole.TEACHER, '', 100).then(
      (result) => setTeachers(result.items),
      () => undefined,
    );
  }, [isManager, slug]);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {isManager && (
        <nav className="flex gap-1 border-b border-[var(--border)]">
          {(['center', 'mine'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={`-mb-px border-b-2 px-3 py-2 text-[14px] font-medium transition ${
                scope === value
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--heading)]'
              }`}
            >
              {text[value]}
            </button>
          ))}
        </nav>
      )}
      <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
        {scope === 'center' ? text.centerHint : text.mineHint}
      </p>
      {scope === 'center' ? (
        <CalendarFeedView
          slug={slug}
          load={(range) =>
            getCenterSchedule(slug, range, {
              courseId: courseId || undefined,
              teacherId: teacherId || undefined,
            })
          }
          reloadKey={`center:${courseId}:${teacherId}`}
          toolbarExtra={
            <>
              <SelectFilter
                value={courseId}
                allLabel={text.allCourses}
                options={courses.map((row) => ({
                  value: row.id,
                  label: `${row.code} – ${row.name}`,
                }))}
                onChange={setCourseId}
              />
              <SelectFilter
                value={teacherId}
                allLabel={text.allTeachers}
                options={teachers.map((row) => ({
                  value: row.id,
                  label: row.fullName,
                }))}
                onChange={setTeacherId}
              />
            </>
          }
        />
      ) : (
        <CalendarFeedView
          slug={slug}
          load={(range) => getMySchedule(slug, range)}
          reloadKey="mine"
        />
      )}
    </div>
  );
}
