'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Play } from 'lucide-react';
import {
  AttendanceMark,
  ClassItemLock,
  CurriculumItemType,
  LessonAttemptStatus,
  type LearnerClassDetail,
  type LearnerClassItemView,
  type LearnerClassSummary,
} from '@lang/shared';
import { ClassroomStatusBadge } from '@/components/classes/classes-ui';
import {
  Badge,
  FormAlert,
  SectionCard,
  compactPrimaryButtonClass,
  secondaryButtonClass,
  type BadgeTone,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  getMyClass,
  learnerSchedulePath,
  startClassItem,
} from '@/lib/learner-class-api';
import { attemptPath, attemptResultPath } from '@/lib/learner-api';
import { lessonAttemptPath } from '@/lib/lesson-learner-api';
import {
  AttemptResultBadges,
  LockBadge,
  sessionLabel,
  startLabel,
} from './class-learning-ui';

const text = vi.classLearning;
const common = vi.curricula;
const guardian = vi.guardian;

/** Trang lớp của học viên: giáo trình + trạng thái từng mục + buổi sắp tới. */
export function LearnerClassView({
  slug: rawSlug,
  classId,
}: {
  slug: string;
  classId: string;
}) {
  const slug = rawSlug.toLowerCase();
  const router = useRouter();
  const [data, setData] = useState<LearnerClassDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(() => {
    getMyClass(slug, classId).then(setData, (err: unknown) =>
      setLoadError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, classId]);

  useEffect(load, [load]);

  async function start(item: LearnerClassItemView) {
    setStarting(item.id);
    setActionError(null);
    try {
      const result = await startClassItem(slug, classId, item.id);
      router.push(
        result.itemType === CurriculumItemType.LESSON
          ? lessonAttemptPath(slug, result.attemptId)
          : attemptPath(slug, result.attemptId),
      );
    } catch (err) {
      setStarting(null);
      setActionError(errorMessage(err, vi.common.loadFailed));
      // Mục vừa đóng/đổi trạng thái: tải lại để hiện đúng.
      if (err instanceof ApiError && err.status === 409) load();
    }
  }

  const back = (
    <Link
      href={`/t/${slug}`}
      className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
    >
      <ArrowLeft size={15} /> {text.backToTenant}
    </Link>
  );

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
        <FormAlert tone="error">{loadError}</FormAlert>
        {back}
      </div>
    );
  }
  if (!data) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8">
      {back}
      {actionError && <FormAlert tone="error">{actionError}</FormAlert>}
      <LearnerClassBoard
        slug={slug}
        detail={data}
        starting={starting}
        onStart={start}
      />
    </div>
  );
}

/**
 * Phần hiển thị của trang lớp (nhận dữ liệu qua prop nên render/kiểm được
 * không cần gọi API): thông tin lớp, buổi sắp tới, kết quả nhóm thi, giáo
 * trình lớp kèm trạng thái từng mục.
 *
 * `readOnly` là góc nhìn phụ huynh (Step 13): bỏ nút vào học/làm bài và link
 * mở bài làm (route của học viên chỉ cho chủ lượt), chỉ còn trạng thái và kết
 * quả. Mỗi mục có thể kèm phần phụ (`itemExtra`) – phụ huynh dùng để hiện nhận
 * xét chấm tay.
 */
export function LearnerClassBoard({
  slug,
  detail: data,
  starting,
  onStart,
  readOnly = false,
  scheduleHref,
  itemExtra,
}: {
  slug: string;
  detail: LearnerClassDetail;
  /** Id mục đang mở (nút hiện "Đang mở…"). */
  starting: string | null;
  onStart: (item: LearnerClassItemView) => void;
  readOnly?: boolean;
  /** Link "lịch học"; mặc định lịch của chính học viên. */
  scheduleHref?: string;
  itemExtra?: (item: LearnerClassItemView) => ReactNode;
}) {
  const titleOf = (itemId: string) =>
    [...data.ungrouped, ...data.groups.flatMap((g) => g.items)].find(
      (item) => item.id === itemId,
    )?.title ?? '';

  const renderItem = (item: LearnerClassItemView) => {
    const busy = starting === item.id;
    const lessonAttempt = item.lessonAttempt;
    const isLesson = item.itemType === CurriculumItemType.LESSON;
    // Bài học đã có lượt: link "Học tiếp"/"Xem lại" mở đúng lượt đó, không cần
    // thêm nút "Vào học".
    const canOpen =
      !readOnly && item.lock === null && !(isLesson && lessonAttempt);
    // Đã làm xong mục đề thi: xem lại kết quả thay vì vào làm.
    const reviewHref = readOnly
      ? null
      : !isLesson && item.attempt
        ? attemptResultPath(slug, item.attempt.id)
        : isLesson && lessonAttempt
          ? lessonAttemptPath(slug, lessonAttempt.attemptId)
          : null;

    return (
      <li
        key={item.id}
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 basis-56">
            <span className="block truncate text-[14.5px] font-semibold text-[var(--heading)]">
              {item.title}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone="accent">{common.label[item.label]}</Badge>
              {item.attemptIndex !== null && item.retakeOfItemId && (
                <Badge tone="neutral">
                  {text.attemptIndex(item.attemptIndex)} ·{' '}
                  {text.retakeOf(titleOf(item.retakeOfItemId))}
                </Badge>
              )}
              {item.retakeOfItemId && !item.required && (
                <Badge tone="success">
                  {readOnly ? guardian.notRequired : text.notRequired}
                </Badge>
              )}
              {item.opensAt && (
                <Badge tone="neutral">
                  {text.opensAt(formatDateTime(item.opensAt))}
                </Badge>
              )}
              {item.deadlineAt && (
                <Badge
                  tone="warning"
                  title={isLesson ? undefined : text.deadlineStartHint}
                >
                  {text.deadlineAt(formatDateTime(item.deadlineAt))}
                </Badge>
              )}
              {!isLesson && !item.acceptLate && (
                <Badge tone="warning">{text.noLate}</Badge>
              )}
              {!isLesson && (
                <Badge tone="neutral">
                  {text.passThreshold(item.passThreshold)}
                </Badge>
              )}
              {item.attempt && <AttemptResultBadges attempt={item.attempt} />}
              {isLesson && item.lessonCompletedAt && (
                <Badge tone="success">{text.completed}</Badge>
              )}
              {item.lock && item.lock !== ClassItemLock.DONE && (
                <LockBadge lock={item.lock} />
              )}
            </span>
            {item.note && (
              <span className="mt-1 block whitespace-pre-line text-[12.5px] text-[var(--body)]">
                {item.note}
              </span>
            )}
            {item.sessions.length > 0 && (
              <span className="mt-1 block text-[12.5px] text-[var(--muted)]">
                {text.learnAtSession(
                  item.sessions.map(sessionLabel).join(', '),
                )}
              </span>
            )}
            {itemExtra?.(item)}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {reviewHref && (
              <Link
                prefetch={false}
                href={reviewHref}
                className={secondaryButtonClass}
              >
                {isLesson
                  ? lessonAttempt?.status === LessonAttemptStatus.COMPLETED
                    ? text.reviewLesson
                    : text.continueLesson
                  : text.reviewAttempt}
              </Link>
            )}
            {canOpen && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onStart(item)}
                className={compactPrimaryButtonClass}
              >
                <Play size={15} />
                {busy ? text.starting : startLabel(item.itemType)}
              </button>
            )}
          </span>
        </div>
      </li>
    );
  };

  return (
    <>
      <header className="flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] text-[var(--muted)]">
            {data.code}
          </span>
          <ClassroomStatusBadge status={data.status} />
        </div>
        <h1 className="text-[24px] font-bold leading-tight text-[var(--heading)]">
          {data.name}
        </h1>
        <p className="text-[14px] text-[var(--body)]">{data.course.name}</p>
        {data.description && (
          <p className="whitespace-pre-line text-[13.5px] text-[var(--body)]">
            {data.description}
          </p>
        )}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[var(--muted)]">
          {data.teachers.length > 0 && (
            <div className="flex gap-1.5">
              <dt>{text.teachers}:</dt>
              <dd className="text-[var(--body)]">
                {data.teachers.map((row) => row.fullName).join(', ')}
              </dd>
            </div>
          )}
          <div>{text.studentCount(data.studentCount)}</div>
          {data.location && <div>{data.location}</div>}
          <div>{text.progress(data.doneCount, data.itemCount)}</div>
        </dl>
        <Link
          prefetch={false}
          href={scheduleHref ?? learnerSchedulePath(slug)}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          <CalendarDays size={15} />{' '}
          {readOnly ? guardian.scheduleHeading : text.myScheduleLink}
        </Link>
      </header>

      {!data.isOpen && (
        <FormAlert tone="info">
          {readOnly ? guardian.classNotOpen : text.classNotOpen}
        </FormAlert>
      )}

      <SectionCard title={text.upcomingSessions}>
        {data.upcomingSessions.length === 0 ? (
          <p className="text-[13.5px] text-[var(--muted)]">{text.noUpcoming}</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-[13.5px] text-[var(--body)]">
            {data.upcomingSessions.map((session) => (
              <li key={session.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{sessionLabel(session)}</span>
                {session.location && (
                  <span className="text-[var(--muted)]">
                    {session.location}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {data.summary && <ClassSummaryCard summary={data.summary} />}

      {data.examGroups.length > 0 && (
        <SectionCard title={text.groupsHeading}>
          <ul className="flex flex-col gap-2">
            {data.examGroups.map((group) => (
              <li
                key={group.rootItemId}
                className="flex flex-wrap items-center gap-2 text-[13.5px] text-[var(--body)]"
              >
                <span className="min-w-0 flex-1 basis-48 truncate font-medium text-[var(--heading)]">
                  {group.title}
                </span>
                <Badge tone="neutral">
                  {group.bestPercent === null
                    ? text.groupNoScore
                    : text.groupBest(group.bestPercent)}
                </Badge>
                <Badge tone={group.passed ? 'success' : 'warning'}>
                  {group.passed ? text.passed : text.failed}
                </Badge>
                {group.hasPending && (
                  <span className="text-[12.5px] text-[var(--muted)]">
                    {text.groupPending}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title={text.curriculumHeading}>
        {data.itemCount === 0 ? (
          <p className="text-[13.5px] text-[var(--muted)]">
            {text.emptyCurriculum}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.ungrouped.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {text.ungrouped}
                </h3>
                <ul className="flex flex-col gap-2">
                  {data.ungrouped.map(renderItem)}
                </ul>
              </div>
            )}
            {data.groups.map((group) => (
              <div key={group.id} className="flex flex-col gap-2">
                <h3 className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[var(--heading)]">
                  {group.title}
                  {group.opensAt && (
                    <Badge tone="neutral">
                      {text.opensAt(formatDateTime(group.opensAt))}
                    </Badge>
                  )}
                </h3>
                {group.items.length === 0 ? (
                  <p className="text-[13px] text-[var(--muted)]">
                    {text.emptyCurriculum}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {group.items.map(renderItem)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

/** Tổng kết cuối khoá: chuyên cần, trung bình chương, nhận xét (Step 11). */
function ClassSummaryCard({ summary }: { summary: LearnerClassSummary }) {
  const label = vi.classLearning.summary;
  const rate = summary.attendance;
  return (
    <SectionCard title={label.heading}>
      <div className="flex flex-col gap-3 text-[13.5px] text-[var(--body)]">
        <p className="text-[12.5px] text-[var(--muted)]">{label.hint}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{label.attendance}:</span>
          <span
            className={`text-[16px] font-bold ${
              summary.belowThreshold
                ? 'text-[var(--danger)]'
                : 'text-[var(--heading)]'
            }`}
          >
            {rate.percent === null ? vi.classes.noValue : `${rate.percent}%`}
          </span>
          <span className="text-[12.5px] text-[var(--muted)]">
            {label.attendanceHint(rate.onTime, rate.late, rate.missed)}
          </span>
        </div>
        {summary.belowThreshold && (
          <FormAlert tone="warning">
            {label.below(summary.warningThreshold)}
          </FormAlert>
        )}
        {summary.attendanceItems.length === 0 ? (
          <p className="text-[12.5px] text-[var(--muted)]">
            {label.noAttendance}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {summary.attendanceItems.map((item) => (
              <li
                key={item.itemId}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="min-w-0 flex-1 basis-48 truncate">
                  {item.title}
                </span>
                <span className="text-[12.5px] text-[var(--muted)]">
                  {vi.classLearning.deadlineAt(formatDateTime(item.deadlineAt))}
                </span>
                <Badge tone={SUMMARY_MARK_TONE[item.mark]}>
                  {label.marks[item.mark]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {summary.groupAverages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{label.averages}:</span>
            {summary.groupAverages.map((average) => (
              <Badge key={average.groupId ?? 'none'} tone="neutral">
                {average.title}:{' '}
                {average.percent === null
                  ? vi.classes.noValue
                  : `${average.percent}%`}
              </Badge>
            ))}
          </div>
        )}
        <div>
          <span className="font-medium">{label.comment}: </span>
          {summary.finalComment ? (
            <span className="whitespace-pre-line">
              {summary.finalComment.text}
            </span>
          ) : (
            <span className="text-[var(--muted)]">{label.noComment}</span>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

const SUMMARY_MARK_TONE: Record<AttendanceMark, BadgeTone> = {
  [AttendanceMark.ON_TIME]: 'success',
  [AttendanceMark.LATE]: 'warning',
  [AttendanceMark.MISSED]: 'danger',
  [AttendanceMark.IN_PROGRESS]: 'accent',
  [AttendanceMark.PENDING]: 'neutral',
  [AttendanceMark.EXCLUDED]: 'neutral',
};
