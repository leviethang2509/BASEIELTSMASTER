'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, MessageSquare } from 'lucide-react';
import {
  GradebookColumnKind,
  type ClassFinalComment,
  type ClassGradebook,
  type ClassProgressStudent,
  type ClassroomDetail,
  type GradebookCell,
  type GradebookColumn,
  type GradebookRow,
} from '@lang/shared';
import {
  Badge,
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  iconButtonClass,
  inputClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import {
  classStudentPath,
  downloadClassProgress,
  getClassGradebook,
  saveFinalComment,
} from '@/lib/classroom-api';
import { saveBlob } from '@/lib/download';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';

/**
 * Tab "Bảng điểm" (R12): học viên × mục; nhóm thi gộp 1 cột (điểm cao nhất),
 * mục bài học hiện % câu tự chấm. Có lọc chương, cột trung bình chương và
 * nhận xét cuối khoá (T5).
 */
export function ClassGradebookPanel({
  slug,
  classroom,
  onCommentSaved,
}: {
  slug: string;
  classroom: ClassroomDetail;
  /** Nhận xét đổi → tải lại nhật ký lớp. */
  onCommentSaved: () => void;
}) {
  const text = vi.classes.gradebook;
  const [view, setView] = useState<ClassGradebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string>('');
  const [showRemoved, setShowRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<GradebookRow | null>(null);

  const load = useCallback(() => {
    getClassGradebook(slug, classroom.id).then(setView, (err: unknown) =>
      setError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, classroom.id]);

  useEffect(load, [load]);

  async function exportExcel() {
    setBusy(true);
    setError(null);
    try {
      const { blob, fileName } = await downloadClassProgress(
        slug,
        classroom.id,
      );
      saveBlob(blob, fileName ?? `bang-diem-${classroom.code}.xlsx`);
    } catch (err) {
      setError(errorMessage(err, vi.classes.progress.exportFailed));
    } finally {
      setBusy(false);
    }
  }

  if (!view) {
    return error ? (
      <FormAlert tone="error">{error}</FormAlert>
    ) : (
      <span className="text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </span>
    );
  }

  const rows = view.rows.filter((row) => showRemoved || !row.student.removed);
  // Lọc chương: `''` = mọi chương, `'none'` = mục chưa xếp chương.
  const shown = view.columns
    .map((column, index) => ({ column, index }))
    .filter(
      ({ column }) =>
        groupId === '' ||
        (groupId === 'none'
          ? column.groupId === null
          : column.groupId === groupId),
    );
  const averages = (row: GradebookRow) =>
    row.groupAverages.filter(
      (average) =>
        groupId === '' ||
        (groupId === 'none'
          ? average.groupId === null
          : average.groupId === groupId),
    );
  const titleOfGroup = (id: string | null) =>
    id === null
      ? text.ungrouped
      : (view.groups.find((group) => group.id === id)?.title ?? text.ungrouped);

  return (
    <div className="flex flex-col gap-4">
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-[70ch] text-[12.5px] text-[var(--muted)]">
          {text.hint}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {view.groups.length > 1 && (
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className={`${inputClass} w-auto py-2 text-[14px]`}
            >
              <option value="">{text.allGroups}</option>
              {view.groups.map((group) => (
                <option key={group.id ?? 'none'} value={group.id ?? 'none'}>
                  {group.title}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-[13px] text-[var(--muted)]">
            <input
              type="checkbox"
              checked={showRemoved}
              onChange={(event) => setShowRemoved(event.target.checked)}
            />
            {vi.classes.progress.showRemoved}
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void exportExcel()}
            className={secondaryButtonClass}
          >
            <Download size={15} /> {vi.classes.progress.export}
          </button>
        </div>
      </div>

      {view.columns.length === 0 ? (
        <FormAlert tone="info">{text.empty}</FormAlert>
      ) : rows.length === 0 ? (
        <FormAlert tone="info">{vi.classes.progress.noStudents}</FormAlert>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="min-w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <th className="sticky left-0 z-10 bg-[var(--card)] px-3 py-2 font-medium">
                  {vi.classes.progress.student}
                </th>
                {shown.map(({ column }) => (
                  <th key={column.id} className="px-3 py-2 font-medium">
                    <span className="block max-w-[14rem] truncate text-[var(--heading)]">
                      {column.title}
                    </span>
                    <span className="block text-[11.5px]">
                      {vi.curricula.label[column.label]}
                      {column.passThreshold !== null &&
                        ` · ${text.threshold(column.passThreshold)}`}
                    </span>
                  </th>
                ))}
                {rows[0] &&
                  averages(rows[0]).map((average) => (
                    <th
                      key={average.groupId ?? 'none'}
                      title={text.averageHint}
                      className="px-3 py-2 font-medium text-[var(--heading)]"
                    >
                      {text.average(titleOfGroup(average.groupId))}
                    </th>
                  ))}
                <th className="px-3 py-2 font-medium">{text.comment}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.student.membershipId}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-[var(--card)] px-3 py-2 text-left font-normal"
                  >
                    <StudentName
                      slug={slug}
                      classroomId={classroom.id}
                      student={row.student}
                    />
                  </th>
                  {shown.map(({ column, index }) => (
                    <td key={column.id} className="px-3 py-2">
                      <CellValue column={column} cell={row.cells[index]!} />
                    </td>
                  ))}
                  {averages(row).map((average) => (
                    <td
                      key={average.groupId ?? 'none'}
                      className="px-3 py-2 font-semibold text-[var(--heading)]"
                    >
                      {average.percent === null
                        ? vi.classes.noValue
                        : `${average.percent}%`}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <span className="flex items-start gap-1.5">
                      <span className="block max-w-[22rem] whitespace-pre-line text-[12.5px] text-[var(--body)]">
                        {row.comment ? (
                          <>
                            {row.comment.text}
                            <span className="mt-0.5 block text-[11.5px] text-[var(--muted)]">
                              {text.commentBy(
                                row.comment.author?.fullName ?? '',
                                formatDateTime(row.comment.updatedAt),
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-[var(--muted)]">
                            {text.commentEmpty}
                          </span>
                        )}
                      </span>
                      {view.canComment && (
                        <button
                          type="button"
                          title={text.commentEdit}
                          aria-label={text.commentEdit}
                          onClick={() => setEditing(row)}
                          className={iconButtonClass}
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!view.canComment && (
        <FormAlert tone="info">{text.commentClosed}</FormAlert>
      )}

      <FinalCommentDialog
        slug={slug}
        classroomId={classroom.id}
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={(cleared) => {
          setEditing(null);
          setNotice(cleared ? text.commentCleared : text.commentSaved);
          load();
          onCommentSaved();
        }}
      />
    </div>
  );
}

function StudentName({
  slug,
  classroomId,
  student,
}: {
  slug: string;
  classroomId: string;
  student: ClassProgressStudent;
}) {
  return (
    <>
      <Link
        href={classStudentPath(slug, classroomId, student.membershipId)}
        className="text-[var(--accent)] hover:underline"
      >
        {student.fullName}
      </Link>
      <span className="ml-1.5 inline-flex gap-1">
        {student.removed && <Badge>{vi.classes.progress.removed}</Badge>}
        {student.inactive && (
          <Badge tone="warning">{vi.classes.progress.inactive}</Badge>
        )}
      </span>
    </>
  );
}

/** Ô điểm: nhóm thi (điểm cao nhất + đậu/trượt) hoặc mục bài học. */
function CellValue({
  column,
  cell,
}: {
  column: GradebookColumn;
  cell: GradebookCell;
}) {
  const text = vi.classes.gradebook;
  if (cell.kind === GradebookColumnKind.LESSON) {
    return (
      <span>
        <span className="text-[13.5px] text-[var(--heading)]">
          {cell.percent === null ? vi.classes.noValue : `${cell.percent}%`}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-[var(--muted)]">
          {cell.completed
            ? text.lessonDone
            : cell.started
              ? text.lessonInProgress
              : text.lessonNotStarted}
        </span>
      </span>
    );
  }
  const attempts = cell.attempts
    .map((attempt) =>
      text.attemptLine(
        attempt.attemptIndex,
        attempt.percent === null
          ? text.pending
          : `${attempt.percent}%${attempt.passed ? ` · ${text.passed}` : ''}`,
      ),
    )
    .join('\n');
  if (cell.percent === null) {
    return (
      <span className="text-[12.5px] text-[var(--muted)]" title={attempts}>
        {cell.hasPending
          ? text.pending
          : cell.attempts.length === 0
            ? text.notStarted
            : text.noScore}
      </span>
    );
  }
  return (
    <span title={attempts || undefined}>
      <span className="text-[13.5px] font-semibold text-[var(--heading)]">
        {cell.percent}%
      </span>{' '}
      <Badge tone={cell.passed ? 'success' : 'danger'}>
        {cell.passed ? text.passed : text.failed}
      </Badge>
      {cell.hasPending && (
        <span className="mt-0.5 block text-[11.5px] text-[var(--muted)]">
          {text.hasPending}
        </span>
      )}
      {column.itemIds.length > 1 && attempts && (
        <span className="mt-0.5 block whitespace-pre-line text-[11.5px] text-[var(--muted)]">
          {attempts}
        </span>
      )}
    </span>
  );
}

function FinalCommentDialog({
  slug,
  classroomId,
  row,
  onClose,
  onSaved,
}: {
  slug: string;
  classroomId: string;
  row: GradebookRow | null;
  onClose: () => void;
  onSaved: (cleared: boolean) => void;
}) {
  const text = vi.classes.gradebook;
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(row?.comment?.text ?? '');
    setError(null);
  }, [row]);

  async function save() {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      const saved: ClassFinalComment | null = await saveFinalComment(
        slug,
        classroomId,
        row.student.membershipId,
        value,
      );
      onSaved(saved === null);
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={row !== null}
      title={row ? text.commentTitle(row.student.fullName) : ''}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <textarea
          rows={6}
          value={value}
          placeholder={text.commentPlaceholder}
          onChange={(event) => setValue(event.target.value)}
          className={inputClass}
        />
        <p className="text-[12.5px] text-[var(--muted)]">{text.commentHint}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className={compactPrimaryButtonClass}
          >
            {vi.curricula.form.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
