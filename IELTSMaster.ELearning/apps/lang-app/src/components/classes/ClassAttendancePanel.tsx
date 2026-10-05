'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import {
  AttendanceMark,
  type AttendanceRow,
  type ClassAttendance,
  type ClassroomDetail,
} from '@lang/shared';
import {
  Badge,
  FormAlert,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
  type BadgeTone,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import {
  classStudentPath,
  downloadClassProgress,
  getClassAttendance,
  updateClassroom,
} from '@/lib/classroom-api';
import { saveBlob } from '@/lib/download';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';

const MARK_TONE: Record<AttendanceMark, BadgeTone> = {
  [AttendanceMark.ON_TIME]: 'success',
  [AttendanceMark.LATE]: 'warning',
  [AttendanceMark.MISSED]: 'danger',
  [AttendanceMark.IN_PROGRESS]: 'accent',
  [AttendanceMark.PENDING]: 'neutral',
  [AttendanceMark.EXCLUDED]: 'neutral',
};

/**
 * Tab "Tiến độ & Chuyên cần" (R11): bảng học viên × mục đề thi có hạn nộp, tỉ
 * lệ chuyên cần và cảnh báo dưới ngưỡng. Owner/Admin sửa được hệ số/ngưỡng
 * riêng của lớp ngay tại đây (người dùng chốt Step 11).
 */
export function ClassAttendancePanel({
  slug,
  classroom,
  onParamsSaved,
}: {
  slug: string;
  classroom: ClassroomDetail;
  /** Tham số lớp đổi → tải lại thông tin lớp + nhật ký. */
  onParamsSaved: () => void;
}) {
  const text = vi.classes.progress;
  const [view, setView] = useState<ClassAttendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [lateWeight, setLateWeight] = useState('');
  const [threshold, setThreshold] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getClassAttendance(slug, classroom.id).then(
      (result) => {
        setView(result);
        setLateWeight(
          result.params.classLateWeight === null
            ? ''
            : String(result.params.classLateWeight),
        );
        setThreshold(
          result.params.classWarningThreshold === null
            ? ''
            : String(result.params.classWarningThreshold),
        );
      },
      (err: unknown) => setError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, classroom.id]);

  useEffect(load, [load]);

  async function saveParams() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await updateClassroom(slug, classroom.id, {
        lateWeight: lateWeight.trim() === '' ? null : Number(lateWeight),
        warningThreshold: threshold.trim() === '' ? null : Number(threshold),
      });
      setNotice(text.params.saved);
      load();
      onParamsSaved();
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

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
      setError(errorMessage(err, text.exportFailed));
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
  const belowCount = rows.filter((row) => row.belowThreshold).length;

  return (
    <div className="flex flex-col gap-4">
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-[15px] font-semibold text-[var(--heading)]">
          {text.params.title}
        </h2>
        <p className="mt-1 text-[12.5px] text-[var(--muted)]">
          {view.canManageParams ? text.params.hint : text.params.readOnly}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            <span className={labelTextClass}>{text.params.lateWeight}</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={lateWeight}
              disabled={!view.canManageParams}
              placeholder={text.params.placeholder}
              onChange={(event) => setLateWeight(event.target.value)}
              className={`${inputClass} w-32`}
            />
            <span className="text-[12px] text-[var(--muted)]">
              {text.params.tenantValue(String(view.params.tenantLateWeight))}
            </span>
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>
              {text.params.warningThreshold}
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={threshold}
              disabled={!view.canManageParams}
              placeholder={text.params.placeholder}
              onChange={(event) => setThreshold(event.target.value)}
              className={`${inputClass} w-32`}
            />
            <span className="text-[12px] text-[var(--muted)]">
              {text.params.tenantValue(
                `${view.params.tenantWarningThreshold}%`,
              )}
            </span>
          </label>
          {view.canManageParams && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveParams()}
              className={secondaryButtonClass}
            >
              {text.params.save}
            </button>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-[70ch] text-[12.5px] text-[var(--muted)]">
          {text.hint} {text.lateRule}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-[13px] text-[var(--muted)]">
            <input
              type="checkbox"
              checked={showRemoved}
              onChange={(event) => setShowRemoved(event.target.checked)}
            />
            {text.showRemoved}
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void exportExcel()}
            className={secondaryButtonClass}
          >
            <Download size={15} /> {text.export}
          </button>
        </div>
      </div>

      {belowCount > 0 && (
        <FormAlert tone="warning">
          {text.belowCount(belowCount, view.params.warningThreshold)}
        </FormAlert>
      )}

      {view.columns.length === 0 ? (
        <FormAlert tone="info">{text.empty}</FormAlert>
      ) : rows.length === 0 ? (
        <FormAlert tone="info">{text.noStudents}</FormAlert>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="min-w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <th className="sticky left-0 z-10 bg-[var(--card)] px-3 py-2 font-medium">
                  {text.student}
                </th>
                {view.columns.map((column) => (
                  <th key={column.itemId} className="px-3 py-2 font-medium">
                    <span className="block max-w-[14rem] truncate text-[var(--heading)]">
                      {column.title}
                      {column.attemptIndex > 1 &&
                        ` · ${text.attemptIndex(column.attemptIndex)}`}
                    </span>
                    <span className="block text-[11.5px]">
                      {text.deadline(formatDateTime(column.deadlineAt))}
                    </span>
                    <span className="block text-[11.5px]">
                      {column.acceptLate ? text.acceptLate : text.noLate}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">{text.rate}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <StudentRow
                  key={row.student.membershipId}
                  slug={slug}
                  classroomId={classroom.id}
                  row={row}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentRow({
  slug,
  classroomId,
  row,
}: {
  slug: string;
  classroomId: string;
  row: AttendanceRow;
}) {
  const text = vi.classes.progress;
  return (
    <tr className="border-b border-[var(--border)] last:border-0">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-[var(--card)] px-3 py-2 text-left font-normal"
      >
        <Link
          href={classStudentPath(slug, classroomId, row.student.membershipId)}
          className="text-[var(--accent)] hover:underline"
        >
          {row.student.fullName}
        </Link>
        <span className="ml-1.5 inline-flex gap-1">
          {row.student.removed && <Badge>{text.removed}</Badge>}
          {row.student.inactive && (
            <Badge tone="warning">{text.inactive}</Badge>
          )}
        </span>
      </th>
      {row.cells.map((cell) => (
        <td key={cell.itemId} className="px-3 py-2">
          <Badge tone={MARK_TONE[cell.mark]}>{text.marks[cell.mark]}</Badge>
          {cell.startedAt && (
            <span className="mt-0.5 block text-[11.5px] text-[var(--muted)]">
              {text.startedAt(formatDateTime(cell.startedAt))}
            </span>
          )}
        </td>
      ))}
      <td className="px-3 py-2">
        <span
          className={`text-[14px] font-semibold ${
            row.belowThreshold
              ? 'text-[var(--danger)]'
              : 'text-[var(--heading)]'
          }`}
        >
          {row.rate.percent === null
            ? vi.classes.noValue
            : `${row.rate.percent}%`}
        </span>
        <span className="block text-[11.5px] text-[var(--muted)]">
          {text.counted(row.rate.counted)} ·{' '}
          {text.tally(row.rate.onTime, row.rate.late, row.rate.missed)}
        </span>
      </td>
    </tr>
  );
}
