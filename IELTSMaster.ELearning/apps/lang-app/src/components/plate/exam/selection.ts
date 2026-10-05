import { RangeApi } from 'platejs';
import type { PlateEditor } from 'platejs/react';

/**
 * Lấy lại vùng chọn từ DOM. Vùng chọn tạo bằng bàn phím ngay sau khi code đặt
 * selection (chèn indicator qua dialog…) có lúc chưa kịp đồng bộ vào editor.
 */
export function syncSelectionFromDom(editor: PlateEditor) {
  const dom = window.getSelection();
  if (
    !dom?.rangeCount ||
    !editor.api.hasTarget(dom.anchorNode) ||
    !editor.api.hasTarget(dom.focusNode)
  ) {
    return;
  }
  const range = editor.api.toSlateRange(dom, {
    exactMatch: false,
    suppressThrow: true,
  });
  if (
    range &&
    (!editor.selection || !RangeApi.equals(range, editor.selection))
  ) {
    editor.tf.select(range);
  }
}
