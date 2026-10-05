'use client';

import {
  PAIR_KEY,
  createNodeId,
  createPair,
  isIndicator,
  isPair,
  pairOptions,
  questionScopeAt,
  type TPairElement,
} from '@lang/exam-core';
import { NodeApi, PathApi, RangeApi, TextApi, type TElement } from 'platejs';
import {
  PlateElement,
  createPlatePlugin,
  useEditorSelector,
  type PlateEditor,
  type PlateElementProps,
} from 'platejs/react';
import { vi } from '@/i18n/vi';
import { syncSelectionFromDom } from './selection';

// Cặp ghép dùng cho Matching / True-False-Not Given / Yes-No-Not Given. Mỗi cặp
// là MỘT block: phần hiển thị là nội dung soạn thảo bình thường, còn đáp án nằm
// ở node prop `answer`, nhập qua control thật (input / select) đặt trong vùng
// contentEditable=false.

const newPair = () => createPair() as unknown as TElement;

/** Thuộc tính của list (và marker đánh số tay) phải gỡ khi đổi dòng thành cặp. */
const LIST_PROPS = [
  'listStyleType',
  'indent',
  'listStart',
  'listRestart',
  'listRestartPolite',
  'checked',
  'num',
];

/** Block chỉ chứa chữ (không phải bảng, media, indicator…) thì mới đổi được. */
function isPairable(editor: PlateEditor, node: TElement) {
  if (isIndicator(node) || editor.api.isVoid(node)) return false;
  return node.children.every(
    (child) => TextApi.isText(child) || editor.api.isInline(child as TElement),
  );
}

/**
 * Tách block ở `index` tại mỗi ký tự xuống dòng mềm (`\n`) — dán text thô có
 * khi ra một đoạn nhiều dòng thay vì nhiều đoạn. Trả về số block sau khi tách.
 */
function splitSoftBreaks(editor: PlateEditor, index: number): number {
  let count = 1;
  for (;;) {
    const at = [index + count - 1];
    const [hit] = editor.api.nodes({
      at,
      match: (n) => TextApi.isText(n) && n.text.includes('\n'),
    });
    if (!hit) return count;
    const [text, textPath] = hit as unknown as [{ text: string }, number[]];
    const offset = text.text.indexOf('\n');
    const point = { path: textPath, offset };
    editor.tf.delete({
      at: { anchor: point, focus: { path: textPath, offset: offset + 1 } },
    });
    editor.tf.splitNodes({ at: point, always: true });
    count += 1;
  }
}

/**
 * Bật/tắt cặp ghép cho các dòng đang chọn — như nút list: mỗi dòng có chữ
 * thành một cặp (thêm ô đáp án bên phải). Mọi dòng đã là cặp thì trả về đoạn
 * văn thường.
 */
export function togglePair(editor: PlateEditor) {
  syncSelectionFromDom(editor);
  const selection = editor.selection;
  if (!selection) {
    editor.tf.insertNodes(newPair(), {
      at: [editor.children.length],
      select: true,
    });
    editor.tf.focus();
    return;
  }

  let entries = editor.api.blocks({ mode: 'highest' }) as [
    TElement,
    number[],
  ][];
  // Tô đen cả dòng (triple-click) thì điểm cuối rơi vào đầu dòng kế — dòng đó
  // không thực sự được chọn.
  const end = RangeApi.end(selection);
  if (
    RangeApi.isExpanded(selection) &&
    entries.length > 1 &&
    editor.api.isStart(end, [end.path[0]])
  ) {
    entries = entries.filter(([, path]) => path[0] !== end.path[0]);
  }

  const targets = entries.filter(
    ([node]) => isPair(node) || isPairable(editor, node),
  );
  if (targets.length === 0) {
    const last = entries.at(-1)?.[1] ?? [editor.children.length - 1];
    editor.tf.insertNodes(newPair(), {
      at: PathApi.next([last[0]]),
      select: true,
    });
    editor.tf.focus();
    return;
  }

  editor.tf.withoutNormalizing(() => {
    if (targets.every(([node]) => isPair(node))) {
      for (const [, path] of targets) {
        editor.tf.unsetNodes(['answer', 'id'], { at: path });
        editor.tf.setNodes({ type: 'p' }, { at: path });
      }
      return;
    }

    const single = targets.length === 1;
    // Đi từ dưới lên: tách dòng ở block sau không làm lệch chỉ số block trước.
    for (const [node, path] of [...targets].reverse()) {
      if (isPair(node)) continue;
      const count = splitSoftBreaks(editor, path[0]);
      for (let i = 0; i < count; i += 1) {
        const at = [path[0] + i];
        // Dòng trống xen giữa danh sách thì bỏ qua — trừ khi chỉ có đúng một
        // dòng trống đang đứng (chèn cặp mới).
        const empty = NodeApi.string(NodeApi.get(editor, at)!) === '';
        if (empty && !(single && count === 1)) continue;
        editor.tf.unsetNodes(LIST_PROPS, { at });
        editor.tf.setNodes(
          { type: PAIR_KEY, id: createNodeId(), answer: '' },
          { at },
        );
      }
    }
  });
  editor.tf.focus();
}

/** Đưa con trỏ sang ô đáp án của cặp. */
function focusAnswer(id: string) {
  // Element được render trong cùng vòng cập nhật nên đợi một nhịp cho chắc.
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-pair-answer="${id}"]`)?.focus();
  });
}

const answerClass =
  'h-[28px] w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg)] px-2 text-[13.5px] text-[var(--heading)] outline-none focus:border-[var(--accent)] disabled:opacity-80';

function PairElement(props: PlateElementProps) {
  const el = props.element as unknown as TPairElement;
  const editor = props.editor;
  const path = props.path as number[];
  const top = path[0];
  const readOnly = editor.api.isReadOnly();
  const text = vi.examEditor.pair;

  // Ô đáp án là input tự do hay dropdown phụ thuộc câu hỏi đang chứa cặp này.
  // Trả về chuỗi JSON vì selector so sánh bằng `===`.
  const optionsJson = useEditorSelector(
    (ed) =>
      JSON.stringify(pairOptions(questionScopeAt(ed.children, top)?.indicator)),
    [top],
  );
  const options = JSON.parse(optionsJson) as string[] | null;
  // Đáp án cũ không còn trong danh sách (option vừa bị sửa): vẫn hiện ra để
  // không mất dữ liệu âm thầm, bảng kiểm tra sẽ báo lỗi.
  const stale =
    options && el.answer && !options.includes(el.answer) ? el.answer : null;

  const setAnswer = (answer: string) => {
    editor.tf.setNodes({ answer }, { at: path });
  };

  return (
    <PlateElement {...props} className="exam-pair">
      <div className="min-w-0 flex-1">{props.children}</div>
      <div
        contentEditable={false}
        className="w-[180px] shrink-0 select-none"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        // Ô đáp án nằm trong element không phải void nên Slate vẫn coi editor
        // đang focus; mỗi lần `setNodes` nó đồng bộ lại DOM selection và cướp
        // focus khỏi ô nhập. Báo blur (chỉ đổi cờ) để tránh việc đó.
        onFocus={() => editor.tf.blur()}
      >
        {options ? (
          <select
            data-pair-answer={el.id}
            value={el.answer ?? ''}
            disabled={readOnly}
            aria-label={text.answer}
            onChange={(event) => setAnswer(event.target.value)}
            className={answerClass}
          >
            <option value="">{text.chooseAnswer}</option>
            {stale && <option value={stale}>{text.staleAnswer(stale)}</option>}
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            data-pair-answer={el.id}
            value={el.answer ?? ''}
            readOnly={readOnly}
            placeholder={text.answer}
            aria-label={text.answer}
            onChange={(event) => setAnswer(event.target.value)}
            className={answerClass}
          />
        )}
      </div>
    </PlateElement>
  );
}

export const PairPlugin = createPlatePlugin({
  key: PAIR_KEY,
  node: { isElement: true },
  handlers: {
    onKeyDown: ({ editor, event }) => {
      const entry = editor.api.block();
      if (!entry) return;
      const [node, path] = entry;
      if (!isPair(node)) return;

      if (event.key === 'Enter') {
        // Không để Slate tách block: tách sẽ bê nguyên `answer` sang cặp mới.
        event.preventDefault();
        editor.tf.insertNodes(newPair(), {
          at: PathApi.next(path),
          select: true,
        });
        return;
      }

      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        focusAnswer(node.id);
        return;
      }

      // Cặp rỗng + Backspace ở đầu dòng: trả về đoạn văn thường thay vì gộp
      // ngược lên block trên.
      if (
        event.key === 'Backspace' &&
        editor.api.isAt({ start: true }) &&
        NodeApi.string(node) === ''
      ) {
        event.preventDefault();
        editor.tf.setNodes(
          { type: 'p', id: undefined, answer: undefined },
          { at: path },
        );
      }
    },
  },
}).withComponent(PairElement);
