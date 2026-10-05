'use client';

import { useState } from 'react';
import {
  ORDERING_STYLE,
  TODO_STYLE,
  listRun,
  qtypeAt,
  type TListItem,
} from '@lang/exam-core';
import type { TElement } from 'platejs';
import { isOrderedList } from '@platejs/list';
import {
  ListPlugin,
  useTodoListElement,
  useTodoListElementState,
} from '@platejs/list/react';
import { useEditorSelector, type PlateElementProps } from 'platejs/react';
import { vi } from '@/i18n/vi';
import { NumberPopover, type NumberMode } from './number-popover';

// Plugin list mặc định render mọi mức thành <ul style="list-style-type: …">.
// Với `todo` và `ordering` thì không có marker CSS tương ứng, nên tự vẽ:
// checkbox cho `todo`, nút bấm số cho `ordering`.

function TodoItem(props: PlateElementProps) {
  const state = useTodoListElementState({ element: props.element });
  const { checkboxProps } = useTodoListElement(state);
  const editor = props.editor;
  const path = props.path as number[];
  const top = path[0];

  // Dạng "chọn 1 đáp án": tick ô này thì bỏ tick những ô còn lại cùng danh
  // sách. Làm ngay tại chỗ tick vì normalizer không biết ô nào vừa được chọn.
  const single = useEditorSelector(
    (ed) => qtypeAt(ed.children, top) === 'mc-single',
    [top],
  );

  const toggle = (checked: boolean) => {
    if (!checked || !single) {
      checkboxProps.onCheckedChange(checked);
      return;
    }
    editor.tf.withoutNormalizing(() => {
      for (const i of listRun(editor.children, top)) {
        if (i !== top && (editor.children[i] as TListItem).checked) {
          editor.tf.setNodes({ checked: false }, { at: [i] });
        }
      }
      checkboxProps.onCheckedChange(true);
    });
  };

  return (
    <div className="flex items-start gap-2">
      <input
        type={single ? 'radio' : 'checkbox'}
        contentEditable={false}
        checked={checkboxProps.checked}
        disabled={editor.api.isReadOnly()}
        aria-label={vi.examEditor.correctAnswer}
        onChange={(event) => toggle(event.target.checked)}
        onMouseDown={checkboxProps.onMouseDown}
        className="mt-[6px] h-[15px] w-[15px] shrink-0 accent-[var(--accent)]"
      />
      <div className="min-w-0 flex-1">{props.children}</div>
    </div>
  );
}

interface MarkerState {
  mode: NumberMode;
  status: 'ok' | 'missing' | 'dup';
  taken: number[];
}

/**
 * Trạng thái của marker: ý nghĩa con số (thứ tự hay trọng số), số đã dùng ở
 * dòng khác, và dòng này có đang lỗi không. Trả về chuỗi JSON rồi parse lại vì
 * `useEditorSelector` so sánh kết quả bằng `===`.
 */
function useMarkerState(top: number, num: number | undefined): MarkerState {
  const json = useEditorSelector(
    (ed) => {
      const mode: NumberMode =
        qtypeAt(ed.children, top) === 'polytomous' ? 'polytomous' : 'ordering';
      const others = listRun(ed.children, top)
        .filter((i) => i !== top)
        .map((i) => (ed.children[i] as TListItem).num)
        .filter((n): n is number => typeof n === 'number');

      let status: MarkerState['status'] = 'ok';
      if (typeof num !== 'number') status = 'missing';
      else if (mode === 'ordering' && others.includes(num)) status = 'dup';

      return JSON.stringify({
        mode,
        status,
        taken: mode === 'ordering' ? others : [],
      });
    },
    [top, num],
  );
  return JSON.parse(json) as MarkerState;
}

function OrderingItem(props: PlateElementProps) {
  const el = props.element as TListItem;
  const editor = props.editor;
  const path = props.path as number[];
  const state = useMarkerState(path[0], el.num);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const readOnly = editor.api.isReadOnly();
  const text = vi.examEditor.numberPopover;

  const bad = state.status !== 'ok';

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        contentEditable={false}
        disabled={readOnly}
        title={text.markerTitle[state.mode]}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => setAnchor(event.currentTarget)}
        className={`mt-[3px] grid h-[22px] min-w-[22px] shrink-0 select-none place-items-center rounded-md border px-1 text-[12.5px] font-semibold transition disabled:cursor-default ${
          bad
            ? 'border-dashed border-[var(--danger)] text-[var(--danger)]'
            : 'border-[var(--border-strong)] bg-[var(--sidebar)] text-[var(--body)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
        }`}
      >
        {typeof el.num === 'number' ? el.num : '?'}
      </button>
      <div className="min-w-0 flex-1">{props.children}</div>

      {anchor && (
        <NumberPopover
          anchor={anchor}
          mode={state.mode}
          value={el.num}
          taken={state.taken}
          onClose={() => setAnchor(null)}
          onSubmit={(num) => {
            editor.tf.setNodes({ num }, { at: path });
            setAnchor(null);
          }}
        />
      )}
    </div>
  );
}

function PlainList(props: PlateElementProps) {
  const el = props.element as TElement & {
    listStyleType?: string;
    listStart?: number;
  };
  const Tag = isOrderedList(el) ? 'ol' : 'ul';
  return (
    <Tag
      style={{
        listStyleType: el.listStyleType,
        margin: 0,
        padding: 0,
        position: 'relative',
      }}
      start={el.listStart}
    >
      <li>{props.children}</li>
    </Tag>
  );
}

/** ListPlugin có thêm cách vẽ marker cho danh sách `todo` và `ordering`. */
export const ExamListPlugin = ListPlugin.configure({
  render: {
    belowNodes: (props) => {
      const listStyleType = (props.element as { listStyleType?: string })
        .listStyleType;
      if (!listStyleType) return;
      if (listStyleType === TODO_STYLE) {
        return function TodoBelow(p) {
          return <TodoItem {...p} />;
        };
      }
      if (listStyleType === ORDERING_STYLE) {
        return function OrderingBelow(p) {
          return <OrderingItem {...p} />;
        };
      }
      return function PlainBelow(p) {
        return <PlainList {...p} />;
      };
    },
  },
});
