'use client';

import type { CSSProperties } from 'react';
import {
  INDICATOR_KEY,
  createIndicator,
  indicatorColor,
  indicatorLabel,
  indicatorMeta,
  indicatorSuffix,
  isIndicator,
  type IndicatorKind,
  type IndicatorProps,
  type TIndicatorElement,
} from '@lang/exam-core';
import { NodeApi, PathApi, RangeApi, type TElement } from 'platejs';
import {
  PlateElement,
  createPlatePlugin,
  type PlateEditor,
  type PlateElementProps,
} from 'platejs/react';
import { vi } from '@/i18n/vi';

// Indicator: block void đánh dấu ranh giới các phần trong đề thi. Không gõ chữ
// vào được — mọi thao tác đi qua menu chèn và popup sửa tham số. Kiểu, nhãn và
// màu nằm ở `@lang/exam-core`; ở đây chỉ có plugin Plate.

const emptyParagraph = (): TElement => ({
  type: 'p',
  children: [{ text: '' }],
});

/** Vị trí (cấp ngoài cùng) mà `insertIndicator` sẽ chèn nếu gọi lúc này. */
export function indicatorInsertIndex(editor: PlateEditor): number {
  const entry = editor.api.block();
  if (!entry) return editor.children.length;
  const [blockNode, blockPath] = entry;
  const replaceHere =
    !isIndicator(blockNode) && NodeApi.string(blockNode) === '';
  return replaceHere ? blockPath[0] : blockPath[0] + 1;
}

/**
 * Chèn indicator thành một block riêng. Nếu ngay dưới indicator không có dữ
 * liệu (hết tài liệu hoặc lại là indicator) thì tạo thêm dòng trống và đặt con
 * trỏ vào đó; có block rồi thì chỉ đưa con trỏ về đầu block đó.
 */
export function insertIndicator(
  editor: PlateEditor,
  kind: IndicatorKind,
  extra?: IndicatorProps,
) {
  const node = createIndicator(kind, extra) as unknown as TElement;
  const entry = editor.api.block();

  let at: number[];
  if (!entry) {
    at = [editor.children.length];
  } else {
    const [blockNode, blockPath] = entry;
    // Đang đứng ở một dòng trống: thay chỗ nó, dòng trống tụt xuống dưới và
    // thành dòng nhập liệu ngay sau indicator.
    const replaceHere =
      !isIndicator(blockNode) && NodeApi.string(blockNode) === '';
    at = replaceHere ? [...blockPath] : PathApi.next(blockPath);
  }

  editor.tf.withoutNormalizing(() => {
    editor.tf.insertNodes(node, { at, select: false });

    const nextPath = PathApi.next(at);
    const next = NodeApi.get(editor, nextPath) as TElement | undefined;
    if (!next || isIndicator(next)) {
      editor.tf.insertNodes(emptyParagraph(), { at: nextPath, select: true });
    } else {
      editor.tf.select(editor.api.start(nextPath)!);
    }
  });
  editor.tf.focus();
}

/** Cập nhật tham số của indicator đang có (popup sửa dạng / số giây / ký tự). */
export function updateIndicatorById(
  editor: PlateEditor,
  id: string,
  props: IndicatorProps,
) {
  const entry = editor.api.node({
    at: [],
    match: (n) => isIndicator(n) && n.id === id,
  });
  if (!entry) return;
  // Đổi dạng thì gỡ luôn tham số của dạng cũ, tránh dữ liệu thừa đọng lại.
  editor.tf.setNodes(
    {
      qtype: props.qtype,
      seconds: props.qtype === 'speaking' ? props.seconds : undefined,
      maxChars: props.qtype === 'writing' ? props.maxChars : undefined,
      maxPicks: props.qtype === 'pick-n' ? props.maxPicks : undefined,
      options: props.qtype === 'matching' ? props.options : undefined,
    },
    { at: entry[1] },
  );
}

function removeSiblingIndicator(
  editor: PlateEditor,
  path: number[],
  offset: -1 | 1,
): boolean {
  const index = path[path.length - 1] + offset;
  if (index < 0) return false;
  const siblingPath = [...path.slice(0, -1), index];
  const sibling = NodeApi.get(editor, siblingPath) as TElement | undefined;
  if (!isIndicator(sibling)) return false;
  editor.tf.removeNodes({ at: siblingPath });
  return true;
}

function IndicatorElement(props: PlateElementProps) {
  const el = props.element as unknown as TIndicatorElement;
  const { color } = indicatorColor(el);
  const suffix = indicatorSuffix(el);
  // Mọi indicator câu hỏi đều bấm được để đổi dạng / sửa tham số.
  const editable = el.kind === 'question' && !props.editor.api.isReadOnly();
  const missing = el.kind === 'question' && !el.qtype;

  return (
    <PlateElement {...props} className="my-2.5 select-none">
      <div
        contentEditable={false}
        data-indicator-id={el.id}
        data-indicator-kind={el.kind}
        title={
          editable
            ? vi.examEditor.changeQuestionType(indicatorLabel(el))
            : indicatorMeta(el.kind).hint
        }
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold tracking-[0.02em] ${
          editable ? 'cursor-pointer' : 'cursor-default'
        } ${missing ? 'border-dashed' : ''} ${
          missing
            ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
            : 'ls-tint ls-tint-fg ls-tint-line ls-tint-soft'
        }`}
        style={missing ? undefined : ({ '--tint-raw': color } as CSSProperties)}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            missing ? 'bg-[var(--danger)]' : 'ls-tint-dot'
          }`}
        />
        {indicatorLabel(el)}
        {suffix && <span className="font-normal opacity-80">· {suffix}</span>}
      </div>
      {props.children}
    </PlateElement>
  );
}

export const IndicatorPlugin = createPlatePlugin({
  key: INDICATOR_KEY,
  node: { isElement: true, isVoid: true },
  handlers: {
    // Backspace/Delete xoá nguyên indicator thay vì gặm từng ký tự.
    onKeyDown: ({ editor, event }) => {
      const key = event.key;
      if (key !== 'Backspace' && key !== 'Delete' && key !== 'Enter') return;

      const entry = editor.api.block();
      if (!entry) return;
      const [node, path] = entry;

      // Con trỏ đang nằm trên chính indicator (click vào badge).
      if (isIndicator(node)) {
        event.preventDefault();
        if (key === 'Enter') {
          editor.tf.insertNodes(emptyParagraph(), {
            at: PathApi.next(path),
            select: true,
          });
        } else {
          editor.tf.removeNodes({ at: path });
        }
        return;
      }

      if (key === 'Enter') return;
      const selection = editor.selection;
      if (!selection || !RangeApi.isCollapsed(selection)) return;

      if (key === 'Backspace' && editor.api.isAt({ start: true })) {
        if (removeSiblingIndicator(editor as PlateEditor, path, -1)) {
          event.preventDefault();
        }
        return;
      }
      if (key === 'Delete' && editor.api.isAt({ end: true })) {
        if (removeSiblingIndicator(editor as PlateEditor, path, 1)) {
          event.preventDefault();
        }
      }
    },
  },
}).withComponent(IndicatorElement);
