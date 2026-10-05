'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { vi } from '@/i18n/vi';

const TICK_MS = 500;
const WARNING_MS = 5 * 60_000;
const DANGER_MS = 60_000;

/** `mm:ss`, hoặc `h:mm:ss` khi còn từ 1 giờ. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Đồng hồ đếm ngược theo `deadline_at` của server. `offsetMs` = giờ server trừ
 * giờ máy lúc tải bài, để máy lệch giờ vẫn đếm đúng. Hết giờ gọi `onExpire` một lần.
 */
export function Countdown({
  deadlineAt,
  offsetMs,
  onExpire,
}: {
  deadlineAt: string;
  offsetMs: number;
  onExpire: () => void;
}) {
  const deadline = Date.parse(deadlineAt);
  const remainingNow = () => deadline - (Date.now() + offsetMs);
  const [remaining, setRemaining] = useState(remainingNow);
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const tick = () => {
      const next = deadline - (Date.now() + offsetMs);
      setRemaining(next);
      if (next <= 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [deadline, offsetMs]);

  const tone =
    remaining <= DANGER_MS
      ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
      : remaining <= WARNING_MS
        ? 'bg-[var(--warn-soft)] text-[var(--warn-text)]'
        : 'bg-[var(--sidebar)] text-[var(--heading)]';

  return (
    <div
      role="timer"
      aria-label={vi.examTaking.timeLeft}
      title={vi.examTaking.timeLeft}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[16px] font-bold tabular-nums ${tone}`}
    >
      <Clock size={16} />
      {formatClock(remaining)}
    </div>
  );
}
