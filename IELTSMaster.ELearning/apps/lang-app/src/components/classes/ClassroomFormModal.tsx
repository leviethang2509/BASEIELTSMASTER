'use client';

import { useEffect, useState } from 'react';
import {
  CLASSROOM_CODE_MAX_LENGTH,
  CLASSROOM_DESCRIPTION_MAX_LENGTH,
  CLASSROOM_LOCATION_MAX_LENGTH,
  CLASSROOM_MAX_STUDENTS,
  CLASSROOM_NAME_MAX_LENGTH,
  COURSE_MAX_PLANNED_SESSIONS,
  CourseStatus,
  type ClassroomDetail,
  type CourseDetail,
  type CourseListItem,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { createClassroom, updateClassroom } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { getCourse, listCourses } from '@/lib/training-api';

const FORM_ID = 'classroom-form';

/**
 * Tạo/sửa thông tin lớp (Owner/Admin). Tạo: chọn khoá học đang dùng và
 * (tuỳ chọn) 1 giáo trình tham khảo của khoá học để chép; khoá học không đổi
 * sau khi tạo (D1).
 */
export function ClassroomFormModal({
  open,
  slug,
  classroom,
  defaultCourseId,
  onClose,
  onSaved,
}: {
  open: boolean;
  slug: string;
  /** `null` là tạo lớp mới. */
  classroom: ClassroomDetail | null;
  /** Khoá học chọn sẵn khi tạo từ trang khoá học. */
  defaultCourseId?: string;
  onClose: () => void;
  onSaved: (classroom: ClassroomDetail) => void;
}) {
  const text = vi.classes.form;
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [courseId, setCourseId] = useState('');
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [curriculumId, setCurriculumId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [plannedSessions, setPlannedSessions] = useState('');
  const [maxStudents, setMaxStudents] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCourseId(classroom?.course.id ?? defaultCourseId ?? '');
    setCurriculumId('');
    setCode(classroom?.code ?? '');
    setName(classroom?.name ?? '');
    setDescription(classroom?.description ?? '');
    setStartDate(classroom?.startDate ?? '');
    setPlannedSessions(classroom?.plannedSessions.toString() ?? '');
    setMaxStudents(classroom?.maxStudents?.toString() ?? '');
    setLocation(classroom?.location ?? '');
    setError(null);
  }, [open, classroom, defaultCourseId]);

  // Khoá học đang dùng để chọn khi tạo lớp.
  useEffect(() => {
    if (!open || classroom) return;
    let cancelled = false;
    listCourses(slug, {
      page: 1,
      pageSize: 100,
      status: CourseStatus.ACTIVE,
    }).then(
      (result) => {
        if (!cancelled) setCourses(result.items);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, classroom, slug]);

  // Giáo trình tham khảo của khoá học đã chọn; chọn sẵn nếu chỉ có 1.
  useEffect(() => {
    if (!open || classroom || !courseId) {
      setCourse(null);
      return;
    }
    let cancelled = false;
    getCourse(slug, courseId).then(
      (result) => {
        if (cancelled) return;
        setCourse(result);
        setCurriculumId(
          result.curricula.length === 1 ? result.curricula[0].id : '',
        );
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [open, classroom, slug, courseId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const common = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        maxStudents: maxStudents ? Number(maxStudents) : null,
        location: location.trim() || null,
      };
      onSaved(
        classroom
          ? await updateClassroom(slug, classroom.id, common)
          : await createClassroom(slug, {
              ...common,
              courseId,
              startDate,
              plannedSessions: plannedSessions ? Number(plannedSessions) : null,
              sourceCurriculumId: curriculumId || null,
            }),
      );
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={classroom ? text.editTitle : text.createTitle}
      widthClass="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.cancel}
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={busy}
            className={compactPrimaryButtonClass}
          >
            {busy ? vi.common.processing : classroom ? text.save : text.create}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4">
        {classroom ? (
          <p className="text-[13px] text-[var(--muted)]">
            {text.course}:{' '}
            <span className="font-medium text-[var(--heading)]">
              {classroom.course.name} ({classroom.course.code})
            </span>
            . {text.courseFixed}
          </p>
        ) : (
          <>
            <label className={labelClass}>
              <span className={labelTextClass}>{text.course}</span>
              <select
                value={courseId}
                required
                onChange={(event) => setCourseId(event.target.value)}
                className={`${inputClass} py-2.5`}
              >
                <option value="">{text.coursePlaceholder}</option>
                {courses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} ({row.code})
                  </option>
                ))}
              </select>
            </label>
            {course && (
              <label className={labelClass}>
                <span className={labelTextClass}>{text.curriculum}</span>
                <select
                  value={curriculumId}
                  onChange={(event) => setCurriculumId(event.target.value)}
                  className={`${inputClass} py-2.5`}
                >
                  <option value="">{text.noCurriculum}</option>
                  {course.curricula.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} ·{' '}
                      {vi.curricula.summary(row.groupCount, row.itemCount)}
                    </option>
                  ))}
                </select>
                <span className="text-[12px] text-[var(--muted)]">
                  {text.curriculumHint}
                </span>
              </label>
            )}
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <label className={labelClass}>
            <span className={labelTextClass}>{text.code}</span>
            <input
              value={code}
              required
              maxLength={CLASSROOM_CODE_MAX_LENGTH}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className={`${inputClass} font-mono`}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>{text.name}</span>
            <input
              value={name}
              required
              maxLength={CLASSROOM_NAME_MAX_LENGTH}
              placeholder={text.namePlaceholder}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <p className="-mt-2 text-[12px] text-[var(--muted)]">{text.codeHint}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          {!classroom && (
            <>
              <label className={labelClass}>
                <span className={labelTextClass}>{text.startDate}</span>
                <input
                  type="date"
                  value={startDate}
                  required
                  onChange={(event) => setStartDate(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>{text.plannedSessions}</span>
                <input
                  type="number"
                  min={1}
                  max={COURSE_MAX_PLANNED_SESSIONS}
                  value={plannedSessions}
                  placeholder={course?.plannedSessions?.toString()}
                  onChange={(event) => setPlannedSessions(event.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}
          <label className={labelClass}>
            <span className={labelTextClass}>{text.maxStudents}</span>
            <input
              type="number"
              min={1}
              max={CLASSROOM_MAX_STUDENTS}
              value={maxStudents}
              placeholder={vi.classes.unlimited}
              onChange={(event) => setMaxStudents(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <p className="-mt-2 text-[12px] text-[var(--muted)]">
          {!classroom && course
            ? `${text.plannedSessionsHint(course.plannedSessions)} `
            : ''}
          {classroom ? `${text.scheduleFieldsHint} ` : ''}
          {text.maxStudentsHint}
        </p>

        <label className={labelClass}>
          <span className={labelTextClass}>{text.location}</span>
          <input
            value={location}
            maxLength={CLASSROOM_LOCATION_MAX_LENGTH}
            onChange={(event) => setLocation(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>{text.description}</span>
          <textarea
            value={description}
            rows={3}
            maxLength={CLASSROOM_DESCRIPTION_MAX_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
          />
        </label>
        {error && <FormAlert tone="error">{error}</FormAlert>}
      </form>
    </Modal>
  );
}
