import type { PlateEditor } from 'platejs/react';

/** Thay URL `data:` bằng URL đã upload ngay trong editor, để lần lưu sau khỏi upload lại. */
export function applyDataUrls(
  editor: PlateEditor,
  uploaded: ReadonlyMap<string, string>,
) {
  editor.tf.withoutNormalizing(() => {
    for (const [from, to] of uploaded) {
      const entries = [
        ...editor.api.nodes({
          at: [],
          match: (n) => (n as { url?: unknown }).url === from,
        }),
      ];
      for (const [, path] of entries) {
        editor.tf.setNodes({ url: to }, { at: path });
      }
    }
  });
}
