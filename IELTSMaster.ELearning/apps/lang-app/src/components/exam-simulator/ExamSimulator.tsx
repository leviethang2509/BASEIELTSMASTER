'use client';

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Check, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import {
  CALLOUT_COLORS,
  bestWeightIndex,
  calloutVariant,
  isBlank,
  isCallout,
  isExplanation,
  isIndicator,
  isOrderingItem,
  isPair,
  isRuby,
  isText,
  isTodo,
  isToggle,
  numberingMode,
  pairChoices,
  plainText,
  questionTypeMeta,
  range,
  segmentQtype,
  toggleEnd,
  type ExamElement,
  type ExamNode,
  type NumberingMode,
  type PreviewPlan,
  type Segment,
  type TPairElement,
} from '@lang/exam-core';
import type { QuestionType } from '@lang/shared';
import { vi } from '@/i18n/vi';
import {
  QuestionBadge,
  ResultSummary,
  SimulatorProvider,
  useSimulator,
  type ReviewAnswer,
} from './SimulatorState';

// Bản giả lập như người làm bài nhìn thấy (chuyển từ lightc-general).
//
// Tài liệu được cắt thành từng câu hỏi theo indicator rồi mỗi dạng có renderer
// riêng. Nhờ vậy "không lộ đáp án" là mặc định của từng renderer — tick của
// multiple choice, số thứ tự của ordering và thứ tự đáp án trong dropdown đều
// không đi ra ngoài. Mỗi part là một tab: passage bên trái, subpart + question
// bên phải. Câu trả lời ghi qua `respond` với khoá khớp `gradeExam`.
//
// Nội dung có thể là `raw_data` (xem trước) hoặc content_public (thi thật):
// dòng ordering/polytomous của content_public đã được server xáo và mang `key`
// là chỉ số gốc, nên dùng `key` làm khoá chấm và không xáo lại.
//
// Giải thích (indicator `explanation`) chỉ hiện sau khi nộp ở bản xem trước;
// content_public không còn nội dung giải thích nên thi thật không có gì để hiện.
// Bài học đã nộp (`review`) nhận giải thích + đáp án từ server theo id indicator.

const text = vi.simulator;

interface Ctx {
  /** Cách đánh số của câu hỏi đang render; `undefined` khi ngoài câu hỏi. */
  mode?: NumberingMode;
  /** Số thứ tự kế tiếp sẽ cấp — thứ tự duyệt phải khớp `buildPlan`. */
  next: number;
}

const HEADING_CLASS: Record<string, string> = {
  h1: 'mt-5 text-[26px] font-bold',
  h2: 'mt-5 text-[22px] font-bold',
  h3: 'mt-4 text-[19px] font-semibold',
  h4: 'mt-4 text-[17px] font-semibold',
  h5: 'mt-3 text-[15.5px] font-semibold',
  h6: 'mt-3 text-[14.5px] font-semibold uppercase tracking-wide',
};

const stringProp = (node: ExamNode, key: string): string | undefined =>
  typeof node[key] === 'string' ? (node[key] as string) : undefined;

const numberProp = (node: ExamNode, key: string): number | undefined =>
  typeof node[key] === 'number' ? (node[key] as number) : undefined;

const keyField = (answer: ReviewAnswer | undefined, field: string): unknown =>
  answer && typeof answer.answerKey === 'object' && answer.answerKey !== null
    ? (answer.answerKey as Record<string, unknown>)[field]
    : undefined;

/** Chỉ số lựa chọn đúng của câu MC / pick-n / polytomous (mọi dòng điểm cao nhất). */
function correctChoices(answer: ReviewAnswer | undefined): Set<number> | null {
  if (!answer) return null;
  if (answer.qtype === 'polytomous') {
    const weights = keyField(answer, 'weights');
    if (!Array.isArray(weights)) return null;
    const best = bestWeightIndex(weights as (number | null)[]);
    return new Set(
      best < 0
        ? []
        : weights.flatMap((w, i) => (w === weights[best] ? [i] : [])),
    );
  }
  const indexes = keyField(answer, 'indexes');
  return Array.isArray(indexes) ? new Set(indexes as number[]) : null;
}

/** Dòng "Đáp án: …" sau câu trả lời sai. */
function CorrectAnswer({ children }: { children: ReactNode }) {
  return (
    <span className="ml-1.5 inline-flex items-baseline gap-1 text-[13.5px] font-semibold text-[var(--ok)]">
      <Check size={13} className="self-center" aria-hidden />
      {text.correctAnswer}: {children}
    </span>
  );
}

// --- Nội dung inline --------------------------------------------------------

function renderLeaf(leaf: ExamNode, key: string): ReactNode {
  const content = stringProp(leaf, 'text') ?? '';
  if (!content) return null;

  let node: ReactNode = content;
  if (leaf.bold) node = <strong>{node}</strong>;
  if (leaf.italic) node = <em>{node}</em>;
  if (leaf.underline) node = <u>{node}</u>;
  if (leaf.strikethrough) node = <s>{node}</s>;
  if (leaf.code) {
    node = (
      <code className="rounded bg-[var(--hover)] px-1 py-0.5 font-mono text-[0.92em]">
        {node}
      </code>
    );
  }
  if (leaf.superscript) node = <sup>{node}</sup>;
  if (leaf.subscript) node = <sub>{node}</sub>;
  if (leaf.highlight)
    node = (
      <mark className="bg-[var(--highlight-bg)] text-[var(--highlight-fg)]">
        {node}
      </mark>
    );

  // Màu chữ/nền do người soạn chọn đi qua biến CSS + class của `globals.css`
  // (`.ls-leaf-*`): bảng màu của toolbar "nướng" cho nền sáng nên ở theme tối
  // phải sáng lên mới đọc được. Đặt thẳng `color` thì không đổi được.
  const fg = stringProp(leaf, 'color');
  const bg = stringProp(leaf, 'backgroundColor');
  const style = {
    ...(fg ? { '--leaf-fg': fg } : {}),
    ...(bg ? { '--leaf-bg': bg } : {}),
    fontSize: stringProp(leaf, 'fontSize'),
  } as CSSProperties;

  return (
    <span
      key={key}
      className={`${fg ? 'ls-leaf-fg' : ''} ${bg ? 'ls-leaf-bg' : ''}`.trim()}
      style={style}
    >
      {node}
    </span>
  );
}

function BlankField({ no }: { no?: number }) {
  const { mark, respond, initial, locked, review, result } = useSimulator();
  const saved = no !== undefined ? (initial.value[no] ?? '') : '';
  useEffect(() => {
    if (no !== undefined && saved.trim() !== '') mark({ [no]: true });
    // Chỉ đánh dấu câu đã trả lời từ trước, một lần lúc dựng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {/* Số thứ tự nằm ngoài ô nhập để gõ đè cũng không mất số. */}
      {no !== undefined && <QuestionBadge nos={[no]} />}
      <input
        type="text"
        defaultValue={saved}
        readOnly={locked}
        data-sim-field={no}
        aria-label={no !== undefined ? text.question(no) : text.blank}
        onChange={
          no !== undefined
            ? (event) => {
                respond.value(no, event.target.value);
                mark({ [no]: event.target.value.trim() !== '' });
              }
            : undefined
        }
        className="exam-preview-input"
      />
      {no !== undefined && result?.verdicts[no] === 'wrong' && (
        <BlankAnswer accepted={keyField(review?.answers.get(no), 'accepted')} />
      )}
    </>
  );
}

function BlankAnswer({ accepted }: { accepted: unknown }) {
  if (!Array.isArray(accepted) || accepted.length === 0) return null;
  return <CorrectAnswer>{accepted.join(' / ')}</CorrectAnswer>;
}

function renderInline(node: ExamNode, key: string, ctx: Ctx): ReactNode {
  if (isText(node)) return renderLeaf(node, key);

  if (isBlank(node)) {
    const no = ctx.mode === 'blank' ? ctx.next++ : undefined;
    return <BlankField key={key} no={no} />;
  }

  const children = renderInlines(node.children, key, ctx);
  if (isRuby(node)) {
    return (
      <ruby key={key}>
        {children}
        <rt>{stringProp(node, 'rt')}</rt>
      </ruby>
    );
  }
  if (node.type === 'a') {
    return (
      <a
        key={key}
        href={stringProp(node, 'url')}
        target="_blank"
        rel="noreferrer"
        className="text-[var(--link)] underline"
      >
        {children}
      </a>
    );
  }
  return <Fragment key={key}>{children}</Fragment>;
}

function renderInlines(
  nodes: readonly ExamNode[],
  keyPrefix: string,
  ctx: Ctx,
): ReactNode[] {
  return nodes.map((node, i) => renderInline(node, `${keyPrefix}.${i}`, ctx));
}

/** `lead` là phần chèn vào đầu dòng (badge số câu), chạy inline với chữ. */
function blockContent(
  node: ExamElement,
  key: string,
  ctx: Ctx,
  lead?: ReactNode,
): ReactNode {
  const children = renderInlines(node.children ?? [], key, ctx);
  const hasText = children.some(Boolean);
  if (!hasText) return lead ?? <br />;
  return lead
    ? [<Fragment key="lead">{lead}</Fragment>, ...children]
    : children;
}

function alignStyle(node: ExamElement): CSSProperties {
  const align = stringProp(node, 'align');
  return align && align !== 'start'
    ? { textAlign: align as CSSProperties['textAlign'] }
    : {};
}

// --- Khối thường ------------------------------------------------------------

/** Marker của một dòng trong danh sách. Ô tick LUÔN trống: đó là đáp án. */
function listMarker(node: ExamElement, index: number | undefined): ReactNode {
  if (isTodo(node)) {
    return (
      <input
        type="checkbox"
        aria-label={text.choice}
        className="mt-[5px] h-[15px] w-[15px] shrink-0 accent-[var(--accent)]"
      />
    );
  }
  return (
    <span className="mt-[1px] w-[1.6em] shrink-0 text-right">
      {node.listStyleType === 'decimal' ? `${index}.` : '•'}
    </span>
  );
}

function renderBlock(
  node: ExamElement,
  key: string,
  ctx: Ctx,
  listIndex?: number,
  lead?: ReactNode,
): ReactNode {
  const type = node.type ?? 'p';

  // Indicator bị ẩn hoàn toàn ở bản giả lập.
  if (isIndicator(node)) return null;

  if (type === 'hr') {
    return <hr key={key} className="my-5 border-[var(--border)]" />;
  }

  if (type === 'img') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ảnh từ R2/URL ngoài
      <img
        key={key}
        src={stringProp(node, 'url')}
        alt={stringProp(node, 'name') ?? ''}
        className="exam-media my-3 max-h-[420px] max-w-full rounded-lg border border-[var(--border)]"
      />
    );
  }
  if (type === 'audio') {
    return (
      <audio
        key={key}
        src={stringProp(node, 'url')}
        controls
        className="my-3 w-full max-w-[520px]"
      />
    );
  }
  if (type === 'video') {
    return (
      <video
        key={key}
        src={stringProp(node, 'url')}
        controls
        className="my-3 max-h-[420px] w-full max-w-[640px] rounded-lg border border-[var(--border)]"
      />
    );
  }

  if (type === 'code_block') {
    return (
      <pre
        key={key}
        className="my-3 overflow-x-auto rounded-lg bg-[var(--sidebar)] p-3 font-mono text-[13px]"
      >
        <code>
          {node.children.map((line, i) => (
            <div key={i}>
              {isText(line)
                ? renderLeaf(line, `${key}.${i}`)
                : blockContent(line, `${key}.${i}`, ctx)}
            </div>
          ))}
        </code>
      </pre>
    );
  }

  if (type === 'table') {
    return (
      <div key={key} className="my-3 overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-[14.5px]">
          <tbody>
            {node.children.map((row, r) => (
              <tr key={r}>
                {(isText(row) ? [] : row.children).map((cell, c) => {
                  if (isText(cell)) return null;
                  const Tag = cell.type === 'th' ? 'th' : 'td';
                  return (
                    <Tag
                      key={c}
                      className={`border border-[var(--border-strong)] px-2.5 py-1.5 align-top ${
                        Tag === 'th'
                          ? 'bg-[var(--sidebar)] text-left font-semibold'
                          : ''
                      }`}
                    >
                      {cell.children.map((block, i) =>
                        isText(block)
                          ? renderLeaf(block, `${key}.${r}.${c}.${i}`)
                          : renderBlock(block, `${key}.${r}.${c}.${i}`, ctx),
                      )}
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Cặp ghép nằm ngoài câu hỏi matching: vẫn cho điền, nhưng không có dropdown
  // vì không biết lấy tập đáp án từ đâu.
  if (isPair(node)) {
    return (
      <div key={key} className="flex items-start gap-3 py-1">
        <div className="min-w-0 flex-1">
          {blockContent(node, key, ctx, lead)}
        </div>
        <input
          aria-label={text.answer}
          className="exam-preview-input shrink-0"
        />
      </div>
    );
  }

  const content = blockContent(node, key, ctx, lead);
  const style = alignStyle(node);
  const indent = numberProp(node, 'indent') ?? 0;

  if (node.listStyleType) {
    return (
      <div
        key={key}
        style={{ ...style, paddingLeft: 12 + Math.max(0, indent - 1) * 24 }}
        className="flex gap-2 py-0.5"
      >
        {listMarker(node, listIndex)}
        <div className="min-w-0 flex-1">{content}</div>
      </div>
    );
  }

  const padded = { ...style, ...(indent ? { paddingLeft: indent * 24 } : {}) };

  if (HEADING_CLASS[type]) {
    const Tag = type as 'h1';
    return (
      <Tag key={key} style={padded} className={HEADING_CLASS[type]}>
        {content}
      </Tag>
    );
  }
  if (isCallout(node)) {
    const variant = calloutVariant(node);
    const color = CALLOUT_COLORS[variant];
    return (
      <div
        key={key}
        style={{ ...padded, '--tint-raw': color } as CSSProperties}
        className="ls-tint ls-tint-line ls-tint-faint my-3 whitespace-pre-wrap rounded-lg border-l-4 px-3 py-2"
      >
        <div className="ls-tint-fg text-[12px] font-semibold">
          {text.callouts[variant]}
        </div>
        {content}
      </div>
    );
  }
  if (type === 'blockquote') {
    return (
      <blockquote
        key={key}
        style={padded}
        className="my-3 border-l-2 border-[var(--accent)] pl-3 text-[var(--body)]"
      >
        {content}
      </blockquote>
    );
  }
  return (
    <p key={key} style={padded} className="my-2">
      {content}
    </p>
  );
}

/** Khối gập/mở: tiêu đề + nội dung, mặc định đang gập. */
function ToggleBlock({
  node,
  summary,
  children,
}: {
  node: ExamElement;
  summary: ReactNode;
  children: ReactNode;
}) {
  const indent = numberProp(node, 'indent') ?? 0;
  return (
    <details
      style={{ ...alignStyle(node), paddingLeft: indent * 24 }}
      className="group my-2"
    >
      <summary className="flex cursor-pointer list-none items-start gap-1.5 font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronDown
          size={15}
          aria-hidden
          className="mt-[7px] shrink-0 -rotate-90 text-[var(--muted)] transition group-open:rotate-0"
        />
        <span className="min-w-0 flex-1">{summary}</span>
      </summary>
      <div>{children}</div>
    </details>
  );
}

/** Khối không thuộc câu hỏi (passage, phần hướng dẫn của subpart…). */
function renderPlain(
  blocks: readonly ExamElement[],
  keyPrefix: string,
  ctx: Ctx = { next: 0 },
): ReactNode[] {
  // Danh sách đánh số dùng bộ đếm riêng theo từng mức thụt lề, reset khi gặp
  // block không phải list — giống cách plugin list hiển thị trong editor.
  let counters: Record<number, number> = {};
  const out: ReactNode[] = [];

  let i = 0;
  while (i < blocks.length) {
    const node = blocks[i];
    const key = `${keyPrefix}.${i}`;

    if (isToggle(node)) {
      const end = toggleEnd(blocks, i);
      out.push(
        <ToggleBlock
          key={key}
          node={node}
          summary={blockContent(node, key, ctx)}
        >
          {renderPlain(blocks.slice(i + 1, end), `${key}.t`, ctx)}
        </ToggleBlock>,
      );
      counters = {};
      i = end;
      continue;
    }

    const indent = numberProp(node, 'indent') ?? 0;
    let listIndex: number | undefined;

    if (node.listStyleType === 'decimal') {
      for (const level of Object.keys(counters).map(Number)) {
        if (level > indent) delete counters[level];
      }
      const listStart = numberProp(node, 'listStart');
      const startAt = listStart !== undefined ? listStart - 1 : 0;
      counters[indent] = (counters[indent] ?? startAt) + 1;
      listIndex = counters[indent];
    } else if (!node.listStyleType) {
      counters = {};
    }

    out.push(renderBlock(node, key, ctx, listIndex));
    i += 1;
  }
  return out;
}

/**
 * Giải thích: chỉ hiện sau khi nộp, không có nội dung thì thôi. `raw_data` có
 * sẵn nội dung; content_public chỉ còn indicator, nội dung lấy từ `review`.
 */
function ExplanationReveal({
  nodeId,
  blocks: own,
  keyPrefix,
}: {
  nodeId: string | undefined;
  blocks: readonly ExamElement[];
  keyPrefix: string;
}) {
  const { result, review } = useSimulator();
  const blocks =
    own.length > 0
      ? own
      : ((nodeId ? review?.explanations.get(nodeId) : undefined) ?? []);
  if (!result || blocks.length === 0) return null;
  return (
    <aside className="my-3 rounded-lg border border-dashed border-[var(--warn)] bg-[var(--warn-soft)] px-3 py-2">
      <div className="text-[12px] font-semibold text-[var(--warn)]">
        {text.explanation}
      </div>
      {renderPlain(blocks, keyPrefix)}
    </aside>
  );
}

// --- Các nhóm tương tác -----------------------------------------------------

interface Row {
  key: string;
  content: ReactNode;
  /** Chỉ số của dòng trong câu hỏi — khoá chấm của MC / ordering. */
  index: number;
  /** Số câu của dòng — chỉ có ở cặp ghép. */
  no?: number;
}

function ChoiceGroup({
  rows,
  single,
  name,
  nos,
  max,
}: {
  rows: Row[];
  single: boolean;
  name: string;
  /** Số câu của câu hỏi; pick-n có n số, tick k ô thì k số đầu là đã làm. */
  nos: number[];
  /** Pick-n: số ô được tick tối đa. */
  max?: number;
}) {
  const { mark, respond, initial, locked, review } = useSimulator();
  const correct = correctChoices(review?.answers.get(nos[0]));
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => {
    const valid = new Set(rows.map((row) => row.index));
    const saved = nos.length > 0 ? (initial.picks[nos[0]] ?? []) : [];
    return new Set(saved.filter((index) => valid.has(index)));
  });
  const full = !single && max !== undefined && picked.size >= max;

  useEffect(() => {
    if (picked.size > 0) {
      mark(Object.fromEntries(nos.map((no, i) => [no, i < picked.size])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (index: number, checked: boolean) => {
    const next = new Set(single ? [] : picked);
    if (checked) next.add(index);
    else next.delete(index);
    setPicked(next);
    respond.picks(
      nos[0],
      [...next].sort((a, b) => a - b),
    );
    mark(Object.fromEntries(nos.map((no, i) => [no, i < next.size])));
  };

  return (
    <div className="my-2">
      {max !== undefined && (
        <p className="px-1.5 text-[12.5px] text-[var(--muted)]">
          {text.pickHint(max, picked.size)}
        </p>
      )}
      <div className="grid gap-1">
        {rows.map((row) => {
          const checked = picked.has(row.index);
          const disabled = locked || (full && !checked);
          const isAnswer = correct?.has(row.index) ?? false;
          const tone = !correct
            ? ''
            : isAnswer
              ? 'bg-[var(--ok-soft)]'
              : checked
                ? 'bg-[var(--danger-soft)]'
                : '';
          return (
            <label
              key={row.key}
              className={`flex items-start gap-2 rounded-lg px-1.5 py-1 transition ${tone} ${
                disabled
                  ? 'cursor-default'
                  : 'cursor-pointer hover:bg-[var(--hover)]'
              }`}
            >
              <input
                type={single ? 'radio' : 'checkbox'}
                name={name}
                checked={checked}
                disabled={disabled}
                onChange={(event) => toggle(row.index, event.target.checked)}
                className="mt-[5px] h-[15px] w-[15px] shrink-0 accent-[var(--accent)]"
              />
              <span className="min-w-0 flex-1">{row.content}</span>
              {isAnswer && (
                <span className="mt-[3px] inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--ok)]">
                  <Check size={13} aria-hidden /> {text.correctAnswer}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PairGroup({ rows, options }: { rows: Row[]; options: string[] }) {
  const { mark, respond, initial, locked, review, result } = useSimulator();
  const savedOf = (no: number | undefined) => {
    const saved = no !== undefined ? initial.value[no] : undefined;
    return saved !== undefined && options.includes(saved) ? saved : '';
  };
  useEffect(() => {
    mark(
      Object.fromEntries(
        rows.flatMap((row) =>
          row.no !== undefined && savedOf(row.no) ? [[row.no, true]] : [],
        ),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="my-2 grid gap-1.5">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3"
        >
          <div className="min-w-0 flex-1">
            {row.no !== undefined && <QuestionBadge nos={[row.no]} />}
            {row.content}
            {row.no !== undefined && result?.verdicts[row.no] === 'wrong' && (
              <PairAnswer
                answer={keyField(review?.answers.get(row.no), 'answer')}
              />
            )}
          </div>
          <select
            defaultValue={savedOf(row.no)}
            disabled={locked}
            data-sim-field={row.no}
            aria-label={
              row.no !== undefined ? text.question(row.no) : text.answer
            }
            onChange={(event) => {
              if (row.no === undefined) return;
              respond.value(row.no, event.target.value);
              mark({ [row.no]: event.target.value !== '' });
            }}
            className="mt-[2px] h-[30px] w-full shrink-0 rounded-md border border-[var(--border-strong)] bg-[var(--bg)] px-2 text-[13.5px] text-[var(--heading)] outline-none focus:border-[var(--accent)] disabled:opacity-100 sm:w-[180px]"
          >
            <option value="">{text.choose}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function PairAnswer({ answer }: { answer: unknown }) {
  if (typeof answer !== 'string' || answer === '') return null;
  return (
    <div>
      <CorrectAnswer>{answer}</CorrectAnswer>
    </div>
  );
}

function OrderingGroup({ rows, nos }: { rows: Row[]; nos: number[] }) {
  const { mark, respond, initial, locked, exam, review, result } =
    useSimulator();
  const answerOrder = keyField(review?.answers.get(nos[0]), 'order');
  const [saved] = useState(() => {
    const order = initial.order[nos[0]];
    const indexes = rows.map((row) => row.index);
    const isPermutation =
      Array.isArray(order) &&
      order.length === indexes.length &&
      indexes.every((index) => order.includes(index));
    return isPermutation ? order : null;
  });
  const [order, setOrder] = useState(
    () => saved ?? rows.map((row) => row.index),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const byIndex = new Map(rows.map((row) => [row.index, row]));

  useEffect(() => {
    if (saved) mark(Object.fromEntries(nos.map((no) => [no, true])));
    // Xem trước: thứ tự xáo ban đầu cũng là một câu trả lời. Thi thật chỉ lưu
    // khi người làm đã sắp xếp (chưa động tới thì tính là bỏ trống).
    else if (!exam) respond.order(nos[0], order);
    // Chỉ chạy một lần lúc dựng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (from: number, to: number) => {
    if (locked || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
    respond.order(nos[0], next);
    mark(Object.fromEntries(nos.map((no) => [no, true])));
  };

  return (
    <div className="my-2 grid gap-1.5">
      {order.map((index, i) => {
        const row = byIndex.get(index);
        if (!row) return null;
        return (
          <div
            key={row.key}
            draggable={!locked}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null) move(order.indexOf(dragIndex), i);
              setDragIndex(null);
            }}
            className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 transition ${
              dragIndex === index
                ? 'border-[var(--accent)] opacity-60'
                : 'border-[var(--border)] bg-[var(--bg)]'
            }`}
          >
            <GripVertical
              size={15}
              aria-hidden
              className={`mt-[4px] shrink-0 text-[var(--muted)] ${locked ? '' : 'cursor-grab'}`}
            />
            <span className="mt-[2px] w-[1.4em] shrink-0 text-[13px] font-semibold text-[var(--muted)]">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">{row.content}</div>
            {!locked && (
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  aria-label={text.moveUp}
                  onClick={() => move(i, i - 1)}
                  className="text-[var(--muted)] transition hover:text-[var(--accent)]"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label={text.moveDown}
                  onClick={() => move(i, i + 1)}
                  className="text-[var(--muted)] transition hover:text-[var(--accent)]"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })}
      {result?.verdicts[nos[0]] === 'wrong' && Array.isArray(answerOrder) && (
        <div className="rounded-lg border border-[var(--ok)] bg-[var(--ok-soft)] px-3 py-2">
          <div className="mb-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--ok)]">
            <Check size={13} aria-hidden /> {text.correctOrder}
          </div>
          {(answerOrder as number[]).map((index, i) => {
            const row = byIndex.get(index);
            if (!row) return null;
            return (
              <div key={row.key} className="flex items-start gap-2">
                <span className="w-[1.4em] shrink-0 text-[13px] font-semibold text-[var(--muted)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">{row.content}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Điểm + nhận xét của câu chấm tay (bài học đã nộp). */
function ManualScore({ no }: { no?: number }) {
  const { review } = useSimulator();
  const manual = no !== undefined ? review?.manual?.get(no) : undefined;
  if (!manual) return null;
  return (
    <div className="my-2 rounded-lg border border-[var(--border)] bg-[var(--sidebar)] px-3 py-2 text-[13.5px]">
      {manual.score === null ? (
        <span className="text-[var(--muted)]">{text.awaitingGrading}</span>
      ) : (
        <>
          <span className="font-semibold text-[var(--heading)]">
            {text.manualScore(manual.score, manual.maxScore)}
          </span>
          {manual.comment && (
            <p className="mt-1 whitespace-pre-wrap text-[var(--body)]">
              {manual.comment}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SpeakingBox({ seconds, no }: { seconds?: number; no?: number }) {
  const { exam, review } = useSimulator();
  if (review?.renderSpeaking && no !== undefined) {
    return <>{review.renderSpeaking(no)}</>;
  }
  if (exam?.renderSpeaking && no !== undefined) {
    return <>{exam.renderSpeaking(no, seconds)}</>;
  }
  return (
    <div className="my-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--sidebar)] px-4 py-3 text-[13.5px] text-[var(--muted)]">
      {text.speaking(seconds)}
    </div>
  );
}

function WritingBox({ maxChars, no }: { maxChars?: number; no?: number }) {
  const { mark, respond, initial, locked } = useSimulator();
  const [value, setValue] = useState(() =>
    no !== undefined ? (initial.value[no] ?? '') : '',
  );
  useEffect(() => {
    if (no !== undefined && value.trim() !== '') mark({ [no]: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="my-3">
      <textarea
        rows={6}
        value={value}
        maxLength={maxChars}
        readOnly={locked}
        data-sim-field={no}
        aria-label={no !== undefined ? text.question(no) : text.answer}
        onChange={(event) => {
          setValue(event.target.value);
          if (no === undefined) return;
          respond.value(no, event.target.value);
          mark({ [no]: event.target.value.trim() !== '' });
        }}
        className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-[14.5px] leading-relaxed text-[var(--heading)] outline-none focus:border-[var(--accent)]"
      />
      <p className="mt-1 text-right text-[12px] text-[var(--muted)]">
        {text.charCount(value.length, maxChars)}
      </p>
    </div>
  );
}

// --- Câu hỏi ----------------------------------------------------------------

/**
 * Xáo trộn ổn định theo `seed`: cùng một câu hỏi thì thứ tự luôn như nhau, chứ
 * không nhảy loạn mỗi lần React render lại.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const LEAD_TYPES = new Set(['p', 'blockquote', ...Object.keys(HEADING_CLASS)]);

/** Dòng chữ thường có thể mang badge số câu ở đầu (thường là đề bài). */
function canLead(node: ExamElement): boolean {
  return (
    LEAD_TYPES.has(node.type ?? 'p') &&
    !node.listStyleType &&
    plainText(node).trim() !== ''
  );
}

function renderQuestion(
  seg: Segment,
  qtype: QuestionType,
  keyPrefix: string,
): ReactNode[] {
  const mode = numberingMode(qtype);
  const ctx: Ctx = { mode, next: seg.start };
  const out: ReactNode[] = [];
  const blocks = seg.blocks;
  const seed = seg.indicator?.id ?? keyPrefix;

  // Dạng tính cả câu hỏi là một (hoặc n) câu: badge đặt ở đầu dòng đề bài,
  // không có đề bài thì đứng riêng một dòng trước nội dung đầu tiên.
  const questionNos =
    mode === 'question' || mode === 'pick' ? range(seg.start, seg.count) : [];
  let leadPending = questionNos.length > 0;
  const badgeLine = (key: string) => (
    <div key={key} className="my-2">
      <QuestionBadge nos={questionNos} />
    </div>
  );

  const input = questionTypeMeta(qtype)!.input;
  const inGroup = (node: ExamElement) =>
    (input === 'choice' && isTodo(node)) ||
    (input === 'pair' && isPair(node)) ||
    (input === 'ordering' && isOrderingItem(node));

  // Chỉ số lựa chọn chạy suốt câu hỏi — cùng thứ tự `gradeExam` đọc đáp án.
  let itemIndex = 0;

  let i = 0;
  while (i < blocks.length) {
    const node = blocks[i];

    if (!inGroup(node)) {
      const key = `${keyPrefix}.${i}`;
      if (isToggle(node)) {
        if (leadPending && plainText(node).trim() !== '') {
          out.push(badgeLine(`${keyPrefix}.lead`));
          leadPending = false;
        }
        // Nội dung gập/mở dừng trước nhóm lựa chọn/cặp ghép/dòng đánh số.
        const end = toggleEnd(blocks, i, (next) =>
          inGroup(next as ExamElement),
        );
        out.push(
          <ToggleBlock
            key={key}
            node={node}
            summary={blockContent(node, key, ctx)}
          >
            {blocks
              .slice(i + 1, end)
              .map((child, k) => renderBlock(child, `${key}.t${k}`, ctx))}
          </ToggleBlock>,
        );
        i = end;
        continue;
      }
      if (leadPending && canLead(node)) {
        out.push(
          renderBlock(
            node,
            key,
            ctx,
            undefined,
            <QuestionBadge nos={questionNos} />,
          ),
        );
        leadPending = false;
      } else {
        if (leadPending && plainText(node).trim() !== '') {
          out.push(badgeLine(`${keyPrefix}.lead`));
          leadPending = false;
        }
        out.push(renderBlock(node, key, ctx));
      }
      i += 1;
      continue;
    }

    if (leadPending) {
      out.push(badgeLine(`${keyPrefix}.lead`));
      leadPending = false;
    }

    // Gom trọn dãy liền nhau rồi giao cho renderer của dạng.
    const start = i;
    const run: ExamElement[] = [];
    while (i < blocks.length && inGroup(blocks[i])) {
      run.push(blocks[i]);
      i += 1;
    }

    const rows: Row[] = run.map((item, k) => {
      const position = itemIndex++;
      return {
        key: `${keyPrefix}.${start + k}`,
        // content_public: dòng ordering/polytomous mang chỉ số gốc ở `key`.
        index: numberProp(item, 'key') ?? position,
        no: mode === 'pair' ? ctx.next++ : undefined,
        content: blockContent(item, `${keyPrefix}.${start + k}`, ctx),
      };
    });

    if (input === 'choice' || qtype === 'polytomous') {
      // Polytomous soạn như ordering nhưng làm bài như MC một đáp án.
      out.push(
        <ChoiceGroup
          key={`${keyPrefix}.g${start}`}
          rows={rows}
          single={qtype === 'mc-single' || qtype === 'polytomous'}
          name={`${seed}-${start}`}
          nos={questionNos}
          max={qtype === 'pick-n' ? seg.count : undefined}
        />,
      );
    } else if (input === 'pair') {
      out.push(
        <PairGroup
          key={`${keyPrefix}.g${start}`}
          rows={rows}
          options={pairChoices(seg.indicator, run as TPairElement[])}
        />,
      );
    } else {
      // Thứ tự soạn trong editor chính là đáp án nên phải xáo trước khi hiện;
      // content_public đã được server xáo theo lượt làm.
      const shuffledByServer = run.every(
        (item) => numberProp(item, 'key') !== undefined,
      );
      out.push(
        <OrderingGroup
          key={`${keyPrefix}.g${start}`}
          rows={
            shuffledByServer ? rows : seededShuffle(rows, `${seed}:${start}`)
          }
          nos={questionNos}
        />,
      );
    }
  }

  if (leadPending) out.push(badgeLine(`${keyPrefix}.lead`));

  if (qtype === 'speaking') {
    out.push(
      <SpeakingBox
        key={`${keyPrefix}.speak`}
        seconds={seg.indicator?.seconds}
        no={questionNos[0]}
      />,
    );
  }
  if (qtype === 'writing') {
    out.push(
      <WritingBox
        key={`${keyPrefix}.write`}
        maxChars={seg.indicator?.maxChars}
        no={questionNos[0]}
      />,
    );
  }
  if (qtype === 'speaking' || qtype === 'writing') {
    out.push(<ManualScore key={`${keyPrefix}.score`} no={questionNos[0]} />);
  }

  return out;
}

// --- Thành phần chính -------------------------------------------------------

const BODY_CLASS = 'text-[15px] leading-[1.9] text-[var(--heading)]';

/** Cây nội dung theo plan: phần mở đầu + passage/câu hỏi của từng part. */
function renderPlan(plan: PreviewPlan) {
  const intro = renderPlain(plan.intro, 'intro');
  const hasIntro = plan.intro.some(
    (node) => plainText(node).trim() !== '' || (node.type ?? 'p') !== 'p',
  );
  const parts = plan.parts.map((part, p) => {
    const passage = renderPlain(part.passage, `p${p}`);
    const items: ReactNode[] = part.items.map((seg, s) => {
      const key = `p${p}.s${s}`;
      if (isExplanation(seg.indicator)) {
        return (
          <ExplanationReveal
            key={key}
            nodeId={seg.indicator?.id}
            blocks={seg.blocks}
            keyPrefix={key}
          />
        );
      }
      const qtype = segmentQtype(seg);
      return (
        <Fragment key={key}>
          {qtype
            ? renderQuestion(seg, qtype, key)
            : renderPlain(seg.blocks, key)}
        </Fragment>
      );
    });
    // Nội dung đứng trước part đầu tiên đi kèm tab đầu.
    if (p === 0 && hasIntro) {
      (part.passage.length > 0 ? passage : items).unshift(...intro);
    }
    return { passage, items };
  });
  return { intro, parts };
}

export function ExamSimulator({
  plan,
  aside,
}: {
  plan: PreviewPlan;
  /** Ghi chú nhỏ đặt cuối thanh tab. */
  aside?: ReactNode;
}) {
  const { tab, setTab, attempt } = useSimulator();

  // Dựng cây một lần theo plan; đổi tab hay trả lời chỉ render lại badge.
  const rendered = useMemo(() => renderPlan(plan), [plan]);

  if (plan.parts.length === 0) {
    return (
      <div
        key={attempt}
        className={`min-h-0 flex-1 overflow-auto px-5 py-4 ${BODY_CLASS}`}
      >
        {rendered.intro}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ResultSummary />

      {/* Thanh tab nằm ngoài mọi vùng cuộn nên luôn đứng yên. */}
      <div className="flex shrink-0 items-end gap-4 border-b border-[var(--border)] px-5">
        <div role="tablist" className="flex min-w-0 gap-1 overflow-x-auto">
          {plan.parts.map((part, p) => {
            const selected = p === tab;
            const first = part.numbers[0];
            const last = part.numbers[part.numbers.length - 1];
            return (
              <button
                key={part.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(p)}
                className={`-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition ${
                  selected
                    ? 'border-[var(--accent)] text-[var(--heading)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--body)]'
                }`}
              >
                Part {p + 1}
                {first !== undefined && (
                  <span className="ml-1.5 text-[12px] font-normal text-[var(--muted)]">
                    {text.questionRange(first, last)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {aside && (
          <p className="ml-auto hidden shrink-0 pb-2.5 text-[12px] text-[var(--muted)] lg:block">
            {aside}
          </p>
        )}
      </div>

      {/* Đổi `attempt` (làm lại) thì dựng lại toàn bộ ô nhập với giá trị trống. */}
      <Fragment key={attempt}>
        {rendered.parts.map((part, p) => {
          const split = plan.parts[p].passage.length > 0;
          // Không unmount tab ẩn: câu trả lời đã nhập phải còn khi quay lại.
          // Màn hình hẹp: hai cột xếp chồng, cuộn chung.
          return (
            <div
              key={plan.parts[p].key}
              role="tabpanel"
              className={`${p === tab ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col overflow-auto md:flex-row md:overflow-hidden ${BODY_CLASS}`}
            >
              {split && (
                <section className="shrink-0 border-[var(--border)] px-5 py-4 md:min-h-0 md:flex-1 md:basis-0 md:overflow-auto md:border-r">
                  {part.passage}
                </section>
              )}
              <section className="shrink-0 px-5 py-4 md:min-h-0 md:flex-1 md:basis-0 md:overflow-auto">
                {part.items}
              </section>
            </div>
          );
        })}
      </Fragment>
    </div>
  );
}

/**
 * Nội dung liền mạch như một tài liệu (màn hình học bài): không tab Part,
 * passage đứng trước câu hỏi của part. Nằm trong `SimulatorProvider`.
 */
export function ExamDocument({ plan }: { plan: PreviewPlan }) {
  const { attempt } = useSimulator();
  const rendered = useMemo(() => renderPlan(plan), [plan]);
  return (
    <div key={attempt} className={BODY_CLASS}>
      {plan.parts.length === 0
        ? rendered.intro
        : rendered.parts.map((part, p) => (
            <Fragment key={plan.parts[p].key}>
              {part.passage}
              {part.items}
            </Fragment>
          ))}
    </div>
  );
}

/** Khối nội dung chỉ để đọc: phần hướng dẫn section, đề bài khi chấm bài. */
export function ExamBlocks({ blocks }: { blocks: readonly ExamElement[] }) {
  const plan = useMemo(() => ({ intro: [...blocks], parts: [] }), [blocks]);
  return (
    <SimulatorProvider plan={plan}>
      <div className={BODY_CLASS}>{renderPlain(blocks, 'intro')}</div>
    </SimulatorProvider>
  );
}
