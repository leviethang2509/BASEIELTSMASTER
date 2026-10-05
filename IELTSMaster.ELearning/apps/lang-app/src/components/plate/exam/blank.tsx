'use client';

import { BLANK_KEY, isBlank } from '@lang/exam-core';
import { RangeApi, TextApi, type TElement } from 'platejs';
import {
  PlateElement,
  createPlatePlugin,
  type PlateEditor,
  type PlateElementProps,
} from 'platejs/react';
import { MARK_KEYS } from './marks';
import { syncSelectionFromDom } from './selection';

// Blank: ô trống trong đề. Là inline element (không phải mark) để mỗi ô giữ
// được ranh giới riêng — hai ô nằm sát nhau vẫn là hai ô, và bước xử lý dữ
// liệu đánh số / gắn đáp án được theo từng ô.

export function isBlankActive(editor: PlateEditor): boolean {
  return !!editor.api.some({ match: (n) => isBlank(n) });
}

/** Bôi đen rồi bấm: bọc đoạn text thành blank. Đang ở trong blank: gỡ blank. */
export function toggleBlank(editor: PlateEditor) {
  syncSelectionFromDom(editor);
  if (isBlankActive(editor)) {
    editor.tf.unwrapNodes({ match: (n) => isBlank(n), split: true });
    editor.tf.focus();
    return;
  }

  const selection = editor.selection;
  if (!selection || RangeApi.isCollapsed(selection)) return;

  editor.tf.withoutNormalizing(() => {
    // Nội dung trong blank là đáp án nên luôn là text thường.
    editor.tf.unsetNodes(MARK_KEYS, {
      at: selection,
      match: TextApi.isText,
      split: true,
    });
    const at = editor.selection;
    if (!at) return;
    editor.tf.wrapNodes({ type: BLANK_KEY, children: [] } as TElement, {
      at,
      split: true,
    });
  });
  editor.tf.focus();
}

function BlankElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="span" className="exam-blank">
      {props.children}
    </PlateElement>
  );
}

export const BlankPlugin = createPlatePlugin({
  key: BLANK_KEY,
  node: { isElement: true, isInline: true },
  shortcuts: {
    toggle: {
      keys: 'mod+shift+b',
      handler: ({ editor }) => {
        toggleBlank(editor as PlateEditor);
        return true;
      },
    },
  },
}).withComponent(BlankElement);
