'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ClipboardList,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import {
  TenantRole,
  type ClassroomDetail,
  type ClassroomMemberView,
  type ClassroomMembers,
  type ClassroomStudentView,
} from '@lang/shared';
import {
  Badge,
  ConfirmDialog,
  FormAlert,
  iconButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import {
  addClassroomStudents,
  addClassroomTeachers,
  classStudentPath,
  getClassroomMembers,
  removeClassroomStudent,
  removeClassroomTeacher,
} from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { formatDate } from '@/lib/format';
import { getMemberConflicts } from '@/lib/schedule-api';
import { MemberPickerDialog } from './MemberPickerDialog';

type Kind = 'teachers' | 'students';

/**
 * Tab "Giáo viên & Học viên": Owner/Admin thêm/xoá (lớp chưa kết thúc/huỷ);
 * giáo viên của lớp chỉ xem. Học viên đã rời lớp gom ở cuối (D9).
 */
export function ClassMembersPanel({
  slug,
  classroom,
  onChanged,
}: {
  slug: string;
  classroom: ClassroomDetail;
  /** Số học viên/giáo viên đổi → tải lại thông tin lớp. */
  onChanged: () => void;
}) {
  const text = vi.classes.members;
  const editable = classroom.canManage && classroom.canEditCurriculum;
  const [members, setMembers] = useState<ClassroomMembers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [picking, setPicking] = useState<Kind | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<{
    kind: Kind;
    member: ClassroomMemberView;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClassroomMembers(slug, classroom.id).then(
      (result) => {
        if (!cancelled) setMembers(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, classroom.id]);

  async function add(ids: string[]) {
    if (!picking) return;
    setBusy(true);
    setPickError(null);
    try {
      const result =
        picking === 'teachers'
          ? await addClassroomTeachers(slug, classroom.id, ids)
          : await addClassroomStudents(slug, classroom.id, ids);
      setMembers(result);
      setPicking(null);
      setNotice(text.added(ids.length));
      setError(null);
      onChanged();
    } catch (err) {
      setPickError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    const { kind, member } = removing;
    setBusy(true);
    setError(null);
    try {
      if (kind === 'teachers') {
        await removeClassroomTeacher(slug, classroom.id, member.membershipId);
      } else {
        await removeClassroomStudent(slug, classroom.id, member.membershipId);
      }
      setMembers(await getClassroomMembers(slug, classroom.id));
      setNotice(text.removedDone(member.fullName));
      onChanged();
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  if (!members) {
    return error ? (
      <FormAlert tone="error">{error}</FormAlert>
    ) : (
      <span className="text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </span>
    );
  }

  const active = members.students.filter((row) => !row.removedAt);
  const left = members.students.filter((row) => row.removedAt);
  const room =
    classroom.maxStudents === null
      ? null
      : Math.max(classroom.maxStudents - active.length, 0);

  function row(kind: Kind, member: ClassroomMemberView | ClassroomStudentView) {
    const student = 'otherClasses' in member ? member : null;
    return (
      <li
        key={member.membershipId}
        className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[14px] font-medium text-[var(--heading)]">
              {member.fullName}
            </span>
            {member.membershipStatus !== 'active' && (
              <Badge tone="warning">{text.inactive}</Badge>
            )}
            {student?.removedAt && <Badge>{text.removed}</Badge>}
          </span>
          <span className="block truncate text-[12.5px] text-[var(--muted)]">
            {member.email} ·{' '}
            {student?.removedAt
              ? text.removedAt(formatDate(student.removedAt))
              : text.addedAt(formatDate(member.addedAt))}
          </span>
          {student && student.otherClasses.length > 0 && (
            <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-[var(--warn-text)]">
              <AlertTriangle size={13} />
              {text.otherClasses(
                student.otherClasses.map((row) => row.code).join(', '),
              )}
            </span>
          )}
        </span>
        {student && (
          <Link
            href={classStudentPath(slug, classroom.id, member.membershipId)}
            title={vi.classStudentAttempts.open}
            aria-label={vi.classStudentAttempts.open}
            className={iconButtonClass}
          >
            <ClipboardList size={16} />
          </Link>
        )}
        {editable && !student?.removedAt && (
          <button
            type="button"
            title={
              kind === 'teachers' ? text.removeTeacher : text.removeStudent
            }
            aria-label={
              kind === 'teachers' ? text.removeTeacher : text.removeStudent
            }
            onClick={() => setRemoving({ kind, member })}
            className={iconButtonClass}
          >
            <UserMinus size={16} />
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <span>
            <h2 className="text-[15px] font-semibold text-[var(--heading)]">
              {text.teachersTitle} ({members.teachers.length})
            </h2>
            <p className="text-[12.5px] text-[var(--muted)]">
              {text.teachersHint}
            </p>
          </span>
          {editable && (
            <button
              type="button"
              onClick={() => {
                setPickError(null);
                setPicking('teachers');
              }}
              className={secondaryButtonClass}
            >
              <UserPlus size={16} /> {text.addTeachers}
            </button>
          )}
        </div>
        {members.teachers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-center text-[13.5px] text-[var(--muted)]">
            {text.noTeachers}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {members.teachers.map((member) => row('teachers', member))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <span>
            <h2 className="text-[15px] font-semibold text-[var(--heading)]">
              {text.studentsTitle} ·{' '}
              {text.capacity(active.length, classroom.maxStudents)}
            </h2>
            <p className="text-[12.5px] text-[var(--muted)]">
              {text.studentsHint}
            </p>
          </span>
          {editable && (
            <button
              type="button"
              disabled={room === 0}
              onClick={() => {
                setPickError(null);
                setPicking('students');
              }}
              className={secondaryButtonClass}
            >
              <UserPlus size={16} /> {text.addStudents}
            </button>
          )}
        </div>
        {classroom.maxStudents !== null &&
          active.length > classroom.maxStudents && (
            <FormAlert tone="error">
              {vi.classes.overCapacity(active.length, classroom.maxStudents)}
            </FormAlert>
          )}
        {active.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-center text-[13.5px] text-[var(--muted)]">
            {text.noStudents}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {active.map((member) => row('students', member))}
          </ul>
        )}
        {left.length > 0 && (
          <details className="rounded-xl border border-[var(--border)] p-3">
            <summary className="cursor-pointer text-[13.5px] font-medium text-[var(--body)]">
              {text.showRemoved(left.length)}
            </summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {left.map((member) => row('students', member))}
            </ul>
          </details>
        )}
      </section>

      <MemberPickerDialog
        open={picking !== null}
        slug={slug}
        role={picking === 'teachers' ? TenantRole.TEACHER : TenantRole.STUDENT}
        title={
          picking === 'teachers'
            ? text.pickerTitleTeachers
            : text.pickerTitleStudents
        }
        inClass={
          new Set(
            (picking === 'teachers' ? members.teachers : active).map(
              (member) => member.membershipId,
            ),
          )
        }
        checkConflicts={(ids) => getMemberConflicts(slug, classroom.id, ids)}
        busy={busy}
        error={pickError}
        footerNote={
          picking === 'students' && room !== null ? text.room(room) : undefined
        }
        onAdd={(ids) => void add(ids)}
        onClose={() => setPicking(null)}
      />
      <ConfirmDialog
        open={removing !== null}
        title={
          removing?.kind === 'teachers'
            ? text.removeTeacher
            : text.removeStudent
        }
        message={
          removing
            ? removing.kind === 'teachers'
              ? text.removeTeacherConfirm(removing.member.fullName)
              : text.removeStudentConfirm(removing.member.fullName)
            : ''
        }
        confirmLabel={
          removing?.kind === 'teachers'
            ? text.removeTeacher
            : text.removeStudent
        }
        tone="danger"
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
