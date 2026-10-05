'use client';

import type { MediaKind } from '@lang/shared';
import { PathApi, type TElement } from 'platejs';
import {
  PlateElement,
  type PlateEditor,
  type PlateElementProps,
} from 'platejs/react';

// Ảnh/audio/video: node void chỉ giữ URL (file thật nằm trên R2), nên bản nháp
// trong localStorage không phình theo dung lượng media.

/** `type` của node media trong nội dung Plate. */
export const MEDIA_NODE_TYPE: Record<MediaKind, string> = {
  image: 'img',
  audio: 'audio',
  video: 'video',
};

interface TMediaBlock extends TElement {
  url: string;
  name?: string;
}

export function insertMedia(
  editor: PlateEditor,
  kind: MediaKind,
  url: string,
  name?: string,
) {
  const node: TMediaBlock = {
    type: MEDIA_NODE_TYPE[kind],
    url,
    ...(name ? { name } : {}),
    children: [{ text: '' }],
  };
  const entry = editor.api.block();
  const at = entry ? PathApi.next(entry[1]) : [editor.children.length];

  editor.tf.withoutNormalizing(() => {
    editor.tf.insertNodes(node, { at, select: false });
    // Luôn để lại một dòng nhập liệu ngay sau media, nếu chưa có.
    const nextPath = PathApi.next(at);
    const next = editor.api.node({ at: nextPath });
    if (!next) {
      editor.tf.insertNodes(
        { type: 'p', children: [{ text: '' }] } as TElement,
        { at: nextPath, select: true },
      );
    } else {
      editor.tf.select(editor.api.start(nextPath)!);
    }
  });
  editor.tf.focus();
}

const wrapClass = 'my-3';

export function ImageElement(props: PlateElementProps) {
  const el = props.element as TMediaBlock;
  return (
    <PlateElement {...props} className={wrapClass}>
      <div contentEditable={false}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh từ R2/URL ngoài */}
        <img
          src={el.url}
          alt={el.name ?? ''}
          className="exam-media max-h-[420px] max-w-full rounded-lg border border-[var(--border)]"
        />
      </div>
      {props.children}
    </PlateElement>
  );
}

export function AudioElement(props: PlateElementProps) {
  const el = props.element as TMediaBlock;
  return (
    <PlateElement {...props} className={wrapClass}>
      <div contentEditable={false}>
        <audio src={el.url} controls className="w-full max-w-[520px]" />
      </div>
      {props.children}
    </PlateElement>
  );
}

export function VideoElement(props: PlateElementProps) {
  const el = props.element as TMediaBlock;
  return (
    <PlateElement {...props} className={wrapClass}>
      <div contentEditable={false}>
        <video
          src={el.url}
          controls
          className="max-h-[420px] w-full max-w-[640px] rounded-lg border border-[var(--border)]"
        />
      </div>
      {props.children}
    </PlateElement>
  );
}
