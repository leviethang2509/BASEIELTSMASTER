'use client';

import type { CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  CALLOUT_KEY,
  CALLOUT_COLORS,
  CALLOUT_VARIANTS,
  RUBY_KEY,
  TOGGLE_KEY,
  blockDepth,
  calloutVariant,
  isCallout,
  isIndicator,
  isRuby,
  isToggle,
  type CalloutVariant,
  type TCalloutElement,
  type TRubyElement,
} from '@lang/exam-core';
import { PathApi, RangeApi, type TElement } from 'platejs';
import {
  PlateElement,
  createPlatePlugin,
  type PlateEditor,
  type PlateElementProps,
} from 'platejs/react';
import { vi } from '@/i18n/vi';
import { syncSelectionFromDom } from './selection';

// Khối trình bày thêm (A8): callout, khối gập/mở, furigana. Kiểu và quy ước
// nằm ở `@lang/exam-core` (`rich.ts`) để bản giả lập hiển thị giống hệt.

const text = vi.examEditor.rich;

/** Thuộc tính của các kiểu block khác cần gỡ khi đổi block sang kiểu mới. */
const BLOCK_PROPS = ['listStyleType', 'listStart', 'checked', 'num', 'variant'];

function currentBlock(editor: PlateEditor) {
  const entry = editor.api.block();
  if (!entry || isIndicator(entry[0])) return null;
  return entry;
}

/** Đổi block đang đứng thành callout loại `variant`; đang đúng loại thì về đoạn thường. */
export function toggleCallout(editor: PlateEditor, variant: CalloutVariant) {
  const entry = currentBlock(editor);
  if (!entry) return;
  const [node, path] = entry;
  const same = isCallout(node) && calloutVariant(node) === variant;
  editor.tf.withoutNormalizing(() => {
    editor.tf.unsetNodes(BLOCK_PROPS, { at: path });
    editor.tf.setNodes(same ? { type: 'p' } : { type: CALLOUT_KEY, variant }, {
      at: path,
    });
  });
  editor.tf.focus();
}

/** Đổi block đang đứng thành tiêu đề khối gập/mở (hoặc bỏ). */
export function toggleToggleBlock(editor: PlateEditor) {
  const entry = currentBlock(editor);
  if (!entry) return;
  const [node, path] = entry;
  editor.tf.withoutNormalizing(() => {
    editor.tf.unsetNodes(BLOCK_PROPS, { at: path });
    editor.tf.setNodes(
      { type: isToggle(node) ? 'p' : TOGGLE_KEY },
      { at: path },
    );
  });
  editor.tf.focus();
}

export function activeRuby(editor: PlateEditor): TRubyElement | null {
  const entry = editor.api.above({ match: (n) => isRuby(n) });
  return entry ? (entry[0] as unknown as TRubyElement) : null;
}

/**
 * Gắn furigana cho đoạn đang bôi đen, hoặc sửa cách đọc khi con trỏ đang trong
 * furigana; `reading` rỗng thì gỡ furigana.
 */
export function applyRuby(editor: PlateEditor, reading: string) {
  syncSelectionFromDom(editor);
  const rt = reading.trim();
  const current = editor.api.above({ match: (n) => isRuby(n) });
  if (current) {
    if (rt) editor.tf.setNodes({ rt }, { at: current[1] });
    else editor.tf.unwrapNodes({ at: current[1] });
    editor.tf.focus();
    return;
  }
  const selection = editor.selection;
  if (!rt || !selection || RangeApi.isCollapsed(selection)) return;
  editor.tf.wrapNodes({ type: RUBY_KEY, rt, children: [] } as TElement, {
    at: selection,
    split: true,
  });
  editor.tf.focus();
}

function CalloutElement(props: PlateElementProps) {
  const el = props.element as unknown as TCalloutElement;
  const variant = calloutVariant(el);
  const color = CALLOUT_COLORS[variant];
  const readOnly = props.editor.api.isReadOnly();

  return (
    <PlateElement
      {...props}
      className="ls-tint ls-tint-line ls-tint-faint my-2.5 whitespace-pre-wrap rounded-lg border-l-4 px-3 py-2"
      style={{ '--tint-raw': color } as CSSProperties}
    >
      <div
        contentEditable={false}
        className="ls-tint-fg mb-0.5 select-none text-[12px] font-semibold"
      >
        {readOnly ? (
          text.callouts[variant]
        ) : (
          <select
            value={variant}
            aria-label={text.calloutVariant}
            onChange={(event) => {
              const path = props.editor.api.findPath(props.element);
              if (!path) return;
              props.editor.tf.setNodes(
                { variant: event.target.value as CalloutVariant },
                { at: path },
              );
            }}
            className="cursor-pointer bg-transparent font-semibold outline-none"
          >
            {CALLOUT_VARIANTS.map((item) => (
              <option key={item} value={item}>
                {text.callouts[item]}
              </option>
            ))}
          </select>
        )}
      </div>
      {props.children}
    </PlateElement>
  );
}

function ToggleElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      className="my-1 flex items-start gap-1.5 font-semibold"
    >
      <span
        contentEditable={false}
        title={text.toggleHint}
        className="mt-[7px] shrink-0 select-none text-[var(--muted)]"
      >
        <ChevronDown size={15} />
      </span>
      <div className="min-w-0 flex-1">{props.children}</div>
    </PlateElement>
  );
}

function RubyElement(props: PlateElementProps) {
  const el = props.element as unknown as TRubyElement;
  return (
    <PlateElement {...props} as="span" className="exam-ruby">
      <ruby>
        {props.children}
        <rt contentEditable={false} className="select-none">
          {el.rt}
        </rt>
      </ruby>
    </PlateElement>
  );
}

export const CalloutPlugin = createPlatePlugin({
  key: CALLOUT_KEY,
  node: { isElement: true },
  // Enter xuống dòng trong callout; Enter ở dòng trống cuối thì thoát ra ngoài.
  rules: { break: { default: 'lineBreak', emptyLineEnd: 'exit' } },
}).withComponent(CalloutElement);

export const TogglePlugin = createPlatePlugin({
  key: TOGGLE_KEY,
  node: { isElement: true },
  handlers: {
    // Enter cuối tiêu đề: dòng mới thụt vào một mức để thành nội dung của khối.
    onKeyDown: ({ editor, event }) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      const entry = editor.api.block();
      if (!entry || !isToggle(entry[0])) return;
      const selection = editor.selection;
      if (!selection || !RangeApi.isCollapsed(selection)) return;
      if (!editor.api.isAt({ end: true })) return;
      event.preventDefault();
      editor.tf.insertNodes(
        {
          type: 'p',
          indent: blockDepth(entry[0]) + 1,
          children: [{ text: '' }],
        } as TElement,
        { at: PathApi.next(entry[1]), select: true },
      );
    },
  },
}).withComponent(ToggleElement);

export const RubyPlugin = createPlatePlugin({
  key: RUBY_KEY,
  node: { isElement: true, isInline: true },
}).withComponent(RubyElement);
