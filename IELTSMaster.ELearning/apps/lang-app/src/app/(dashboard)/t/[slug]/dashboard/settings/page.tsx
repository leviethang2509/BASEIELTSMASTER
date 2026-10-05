'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  HOLIDAY_NAME_MAX_LENGTH,
  calendarDaysBetween,
  type HolidayImpact,
  type HolidayInput,
  type HolidayView,
  type TenantTrainingSettings,
} from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import {
  ConfirmDialog,
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  iconButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDate } from '@/lib/format';
import {
  createHoliday,
  deleteHoliday,
  getTenantSettings,
  holidayImpact,
  updateHoliday,
  updateTenantSettings,
} from '@/lib/schedule-api';

/** Thao tác ngày nghỉ đang chờ xác nhận (kèm lớp bị ảnh hưởng, U5.3). */
type Pending =
  | {
      kind: 'save';
      id: string | null;
      input: HolidayInput;
      impact: HolidayImpact;
    }
  | { kind: 'delete'; holiday: HolidayView; impact: HolidayImpact };

/** Cài đặt trung tâm (Owner/Admin): tham số chuyên cần, ngày nghỉ. */
export default function TenantSettingsPage() {
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const text = vi.tenantSettings;
  const [settings, setSettings] = useState<TenantTrainingSettings | null>(null);
  const [lateWeight, setLateWeight] = useState('');
  const [threshold, setThreshold] = useState('');
  const [editing, setEditing] = useState<HolidayView | 'new' | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = (result: TenantTrainingSettings) => {
    setSettings(result);
    setLateWeight(String(result.lateWeight));
    setThreshold(String(result.warningThreshold));
  };

  useEffect(() => {
    getTenantSettings(slug).then(apply, (err: unknown) =>
      setError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug]);

  async function saveParams(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      apply(
        await updateTenantSettings(slug, {
          lateWeight: Number(lateWeight),
          warningThreshold: Number(threshold),
        }),
      );
      setNotice(text.saved);
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  async function askDelete(holiday: HolidayView) {
    setError(null);
    setNotice(null);
    try {
      const impact = await holidayImpact(slug, {
        holidayId: holiday.id,
        remove: true,
      });
      setPending({ kind: 'delete', holiday, impact });
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    }
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      if (pending.kind === 'delete') {
        apply(await deleteHoliday(slug, pending.holiday.id));
        setNotice(text.holidayDeleted);
      } else {
        apply(
          pending.id
            ? await updateHoliday(slug, pending.id, pending.input)
            : await createHoliday(slug, pending.input),
        );
        setNotice(text.holidaySaved);
        setEditing(null);
      }
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (!settings) {
    return (
      <div className="p-6">
        {error ? (
          <FormAlert tone="error">{error}</FormAlert>
        ) : (
          <span className="text-[14px] text-[var(--muted)]">
            {vi.common.loading}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
        {text.subtitle}
      </p>
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold text-[var(--heading)]">
          {text.attendanceTitle}
        </h2>
        <p className="mb-4 mt-1 text-[13px] text-[var(--muted)]">
          {text.attendanceHint}
        </p>
        <form onSubmit={saveParams} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>{text.lateWeight}</span>
              <input
                type="number"
                required
                min={0}
                max={1}
                step={0.05}
                value={lateWeight}
                onChange={(event) => setLateWeight(event.target.value)}
                className={inputClass}
              />
              <span className="text-[12px] text-[var(--muted)]">
                {text.lateWeightHint}
              </span>
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text.warningThreshold}</span>
              <input
                type="number"
                required
                min={0}
                max={100}
                step={1}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                className={inputClass}
              />
              <span className="text-[12px] text-[var(--muted)]">
                {text.warningThresholdHint}
              </span>
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className={`${compactPrimaryButtonClass} w-fit`}
          >
            {text.save}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            {text.holidaysTitle}
          </h2>
          <button
            type="button"
            onClick={() => {
              setEditing('new');
              setNotice(null);
            }}
            className={`${compactPrimaryButtonClass} ml-auto`}
          >
            <Plus size={15} /> {text.addHoliday}
          </button>
        </div>
        <p className="mb-4 mt-1 text-[13px] text-[var(--muted)]">
          {text.holidaysHint}
        </p>
        {settings.holidays.length === 0 ? (
          <p className="py-4 text-center text-[14px] text-[var(--muted)]">
            {text.noHolidays}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {settings.holidays.map((holiday) => (
              <li
                key={holiday.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-[14px]"
              >
                <span className="min-w-0 flex-1 font-medium text-[var(--heading)]">
                  {holiday.name}
                </span>
                <span className="tabular-nums text-[var(--body)]">
                  {holiday.startDate === holiday.endDate
                    ? formatDate(holiday.startDate)
                    : `${formatDate(holiday.startDate)} – ${formatDate(holiday.endDate)}`}
                </span>
                <span className="w-16 text-[13px] text-[var(--muted)]">
                  {text.days(
                    calendarDaysBetween(holiday.startDate, holiday.endDate) + 1,
                  )}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    title={text.editHoliday}
                    aria-label={text.editHoliday}
                    onClick={() => {
                      setEditing(holiday);
                      setNotice(null);
                    }}
                    className={iconButtonClass}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    title={text.deleteTitle}
                    aria-label={text.deleteTitle}
                    onClick={() => void askDelete(holiday)}
                    className={iconButtonClass}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HolidayFormModal
        holiday={editing}
        slug={slug}
        onClose={() => setEditing(null)}
        onReady={(id, input, impact) =>
          setPending({ kind: 'save', id, input, impact })
        }
      />
      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'delete'
            ? text.deleteTitle
            : editing === 'new'
              ? text.addHoliday
              : text.editHoliday
        }
        message={
          pending ? (
            <div className="flex flex-col gap-2">
              {pending.kind === 'delete' && (
                <p>{text.deleteMessage(pending.holiday.name)}</p>
              )}
              <p className="font-semibold">{text.impactTitle}</p>
              {pending.impact.classes.length === 0 ? (
                <p>{text.impactNone}</p>
              ) : (
                <ul className="list-disc pl-5">
                  {pending.impact.classes.map((row) => (
                    <li key={row.classroom.id}>
                      {text.impactLine(row.classroom.code, row.moved)}
                      {row.previousEndDate !== row.endDate &&
                        `, ${text.impactEnd(
                          formatDate(row.previousEndDate),
                          formatDate(row.endDate),
                        )}`}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[13px] text-[var(--muted)]">
                {text.impactNotify}
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmLabel={
          pending?.kind === 'delete' ? text.deleteTitle : text.confirmSave
        }
        tone={pending?.kind === 'delete' ? 'danger' : 'default'}
        loading={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

/** Thêm/sửa ngày nghỉ: kiểm ảnh hưởng trước, xác nhận ở trang cha. */
function HolidayFormModal({
  holiday,
  slug,
  onClose,
  onReady,
}: {
  holiday: HolidayView | 'new' | null;
  slug: string;
  onClose: () => void;
  onReady: (
    id: string | null,
    input: HolidayInput,
    impact: HolidayImpact,
  ) => void;
}) {
  const text = vi.tenantSettings;
  const existing = holiday && holiday !== 'new' ? holiday : null;
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holiday) return;
    setName(existing?.name ?? '');
    setStartDate(existing?.startDate ?? '');
    setEndDate(existing?.endDate ?? '');
    setError(null);
  }, [holiday, existing]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const input = {
      name: name.trim(),
      startDate,
      endDate: endDate || startDate,
    };
    try {
      const impact = await holidayImpact(slug, {
        holidayId: existing?.id ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      onReady(existing?.id ?? null, input, impact);
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={holiday !== null}
      onClose={onClose}
      title={existing ? text.editHoliday : text.addHoliday}
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
            form="holiday-form"
            disabled={busy}
            className={compactPrimaryButtonClass}
          >
            {busy ? vi.common.processing : text.checkImpact}
          </button>
        </>
      }
    >
      <form id="holiday-form" onSubmit={submit} className="flex flex-col gap-4">
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <label className={labelClass}>
          <span className={labelTextClass}>{text.holidayName}</span>
          <input
            required
            value={name}
            maxLength={HOLIDAY_NAME_MAX_LENGTH}
            placeholder={text.holidayNamePlaceholder}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={labelTextClass}>{text.from}</span>
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>{text.to}</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </form>
    </Modal>
  );
}
