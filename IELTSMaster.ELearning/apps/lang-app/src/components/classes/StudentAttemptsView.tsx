'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  CurriculumItemType,
  type AttemptReview,
  type ClassStudentAttemptRow,
  type ClassStudentAttempts,
  type ClassStudentItemView,
} from '@lang/shared';
import { AttemptResultBadges } from '@/components/class-learning/class-learning-ui';
import { AttemptReviewView } from '@/components/classes/AttemptReviewView';
import {
  Badge,
  FormAlert,
  Modal,
  SectionCard,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import {
  classDetailPath,
  getClassStudentAttempts,
  getClassStudentExamRecordingUrl,
  getClassStudentExamReview,
  getClassStudentLessonRecordingUrl,
  getClassStudentLessonReview,
} from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';

const text = vi.classStudentAttempts;

/** Lượt đang mở xem chi tiết. */
interface Opened {
  itemType: CurriculumItemType;
  attemptId: string;
}

/**
 * Bài làm chi tiết của một học viên trong lớp (req-3 Step 10, F4): mọi mục của
 * giáo trình lớp kèm các lượt, mở ra xem câu trả lời và đúng/sai từng câu.
 */
export function StudentAttemptsView({
  slug,
  classId,
  membershipId,
}: {
  slug: string;
  classId: string;
  membershipId: string;
}) {
  const [data, setData] = useState<ClassStudentAttempts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [review, setReview] = useState<AttemptReview | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClassStudentAttempts(slug, classId, membershipId).then(
      (result) => {
        if (!cancelled) setData(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, classId, membershipId]);

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    setReview(null);
    setReviewError(null);
    const load =
      opened.itemType === CurriculumItemType.LESSON
        ? getClassStudentLessonReview
        : getClassStudentExamReview;
    load(slug, classId, membershipId, opened.attemptId).then(
      (result) => {
        if (!cancelled) setReview(result);
      },
      (err: unknown) => {
        if (!cancelled) setReviewError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [opened, slug, classId, membershipId]);

  const recordingUrl = (answerId: string) => {
    if (!opened) return Promise.reject(new Error('no attempt'));
    const load =
      opened.itemType === CurriculumItemType.LESSON
        ? getClassStudentLessonRecordingUrl
        : getClassStudentExamRecordingUrl;
    return load(slug, classId, membershipId, opened.attemptId, answerId);
  };

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <FormAlert tone="error">{error}</FormAlert>
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

  let lastGroup: string | null | undefined;
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Link
        href={`${classDetailPath(slug, classId)}?tab=members`}
        className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
      >
        <ArrowLeft size={15} /> {text.back}
      </Link>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <h1 className="text-[19px] font-bold text-[var(--heading)]">
          {data.student.fullName}
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">
          {data.student.email}
        </p>
        <p className="mt-1.5 text-[14px] text-[var(--body)]">
          {data.classroom.code} · {data.classroom.name}
        </p>
      </section>

      {data.removed && <FormAlert tone="info">{text.removedStudent}</FormAlert>}
      <p className="text-[13px] text-[var(--muted)]">{text.reviewHint}</p>

      {data.items.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-[var(--muted)]">
          {text.empty}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((item) => {
            const heading =
              item.groupTitle !== lastGroup
                ? (item.groupTitle ?? text.ungrouped)
                : null;
            lastGroup = item.groupTitle;
            return (
              <div key={item.id} className="flex flex-col gap-2">
                {heading !== null && (
                  <h2 className="mt-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--muted)]">
                    {heading}
                  </h2>
                )}
                <ItemCard
                  item={item}
                  onOpen={(attemptId) =>
                    setOpened({ itemType: item.itemType, attemptId })
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={opened !== null}
        title={
          review
            ? `${text.reviewTitle} – ${review.itemTitle}`
            : text.reviewTitle
        }
        widthClass="max-w-4xl"
        onClose={() => setOpened(null)}
      >
        {reviewError ? (
          <FormAlert tone="error">{reviewError}</FormAlert>
        ) : !review ? (
          <p className="py-10 text-center text-[14px] text-[var(--muted)]">
            {vi.common.loading}
          </p>
        ) : (
          <AttemptReviewView review={review} recordingUrl={recordingUrl} />
        )}
      </Modal>
    </div>
  );
}

function ItemCard({
  item,
  onOpen,
}: {
  item: ClassStudentItemView;
  onOpen: (attemptId: string) => void;
}) {
  const lesson = item.lessonAttempt;
  return (
    <SectionCard
      title={item.title}
      description={[
        vi.curricula.label[item.label],
        item.attemptIndex && item.attemptIndex > 1
          ? text.attemptLabel(item.attemptIndex)
          : null,
        item.deadlineAt ? text.deadline(formatDateTime(item.deadlineAt)) : null,
        item.itemType === CurriculumItemType.EXAM
          ? text.threshold(item.passThreshold)
          : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      <div className="flex flex-col gap-2">
        {item.removed && <Badge tone="warning">{text.removedItem}</Badge>}
        {!item.required && <Badge tone="neutral">{text.notRequired}</Badge>}
        {item.itemType === CurriculumItemType.EXAM ? (
          item.attempts.length === 0 ? (
            <p className="text-[13.5px] text-[var(--muted)]">
              {text.noAttempt}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {item.attempts.map((attempt) => (
                <AttemptRow
                  key={attempt.id}
                  attempt={attempt}
                  onOpen={() => onOpen(attempt.id)}
                />
              ))}
            </ul>
          )
        ) : lesson === null ? (
          <p className="text-[13.5px] text-[var(--muted)]">{text.noAttempt}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={lesson.completedAt ? 'success' : 'accent'}>
              {vi.lessonLearning.status[lesson.status]}
            </Badge>
            <span className="text-[13px] text-[var(--muted)]">
              {text.lessonProgress(lesson.autoCorrect, lesson.autoTotal)}
            </span>
            {lesson.manualCount > 0 && (
              <span className="text-[13px] text-[var(--muted)]">
                {vi.learner.manualProgress(
                  lesson.manualGradedCount,
                  lesson.manualCount,
                )}
              </span>
            )}
            {lesson.canReview && (
              <button
                type="button"
                onClick={() => onOpen(lesson.attemptId)}
                className={secondaryButtonClass}
              >
                {text.review}
              </button>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function AttemptRow({
  attempt,
  onOpen,
}: {
  attempt: ClassStudentAttemptRow;
  onOpen: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2">
      <span className="text-[13px] text-[var(--muted)]">
        {formatDateTime(attempt.startedAt)}
      </span>
      {attempt.voidedAt ? (
        <Badge tone="danger">{vi.classAttempts.voidedBadge}</Badge>
      ) : (
        <AttemptResultBadges attempt={attempt} />
      )}
      {attempt.canReview && (
        <button
          type="button"
          onClick={onOpen}
          className={`${secondaryButtonClass} ml-auto`}
        >
          {text.review}
        </button>
      )}
    </li>
  );
}
