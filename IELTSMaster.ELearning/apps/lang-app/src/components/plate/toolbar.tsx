'use client';

import { useRef, useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import type { TRange } from 'platejs';
import {
  useEditorRef,
  useEditorSelector,
  useMarkToolbarButton,
  useMarkToolbarButtonState,
} from 'platejs/react';
import { setAlign } from '@platejs/basic-styles';
import { insertLink } from '@platejs/link';
import {
  useListToolbarButton,
  useListToolbarButtonState,
} from '@platejs/list/react';
import { PromptDialog } from '@/components/ui';
import { vi } from '@/i18n/vi';

// Các nút toolbar dùng chung cho editor Plate (chép từ lightc-general).

export function ToolbarBtn({
  title,
  pressed,
  disabled,
  onClick,
  onMouseDown,
  children,
}: {
  title: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={onMouseDown ?? ((event) => event.preventDefault())}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'text-[var(--body)] hover:bg-[var(--hover)]'
      }`}
    >
      {children}
    </button>
  );
}

export function ToolbarSep() {
  return <span className="mx-1 h-5 w-px bg-[var(--border-strong)]" />;
}

export function MarkButton({
  nodeType,
  title,
  children,
}: {
  nodeType: string;
  title: string;
  children: React.ReactNode;
}) {
  const state = useMarkToolbarButtonState({ nodeType });
  const { props } = useMarkToolbarButton(state);
  return (
    <ToolbarBtn title={title} pressed={props.pressed} onClick={props.onClick}>
      {children}
    </ToolbarBtn>
  );
}

export function ListButton({
  nodeType,
  title,
  children,
}: {
  nodeType: string;
  title: string;
  children: React.ReactNode;
}) {
  const state = useListToolbarButtonState({ nodeType });
  const { props } = useListToolbarButton(state);
  return (
    <ToolbarBtn
      title={title}
      pressed={props.pressed}
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
    >
      {children}
    </ToolbarBtn>
  );
}

export function AlignButton({
  value,
  title,
  children,
}: {
  value: 'left' | 'center' | 'right' | 'justify';
  title: string;
  children: React.ReactNode;
}) {
  const editor = useEditorRef();
  const current = useEditorSelector(
    (ed) =>
      ((ed.api.block()?.[0] as { align?: string } | undefined)?.align ??
        'start') as string,
    [],
  );
  const pressed =
    current === value || (value === 'left' && current === 'start');
  return (
    <ToolbarBtn
      title={title}
      pressed={pressed}
      onClick={() => setAlign(editor, value)}
    >
      {children}
    </ToolbarBtn>
  );
}

export function LinkButton() {
  const editor = useEditorRef();
  const [open, setOpen] = useState(false);
  // Mở popup làm ô nhập chiếm focus; giữ lại vùng chọn để chèn đúng chỗ.
  const savedSelection = useRef<TRange | null>(null);
  const text = vi.examEditor.toolbar;

  return (
    <>
      <ToolbarBtn
        title={text.link}
        onClick={() => {
          savedSelection.current = editor.selection;
          setOpen(true);
        }}
      >
        <LinkIcon size={15} />
      </ToolbarBtn>
      <PromptDialog
        open={open}
        title={text.link}
        label="URL"
        placeholder="https://…"
        confirmLabel={text.insert}
        onCancel={() => setOpen(false)}
        onSubmit={(url) => {
          setOpen(false);
          if (savedSelection.current) editor.tf.select(savedSelection.current);
          insertLink(editor, { url });
          editor.tf.focus();
        }}
      />
    </>
  );
}
