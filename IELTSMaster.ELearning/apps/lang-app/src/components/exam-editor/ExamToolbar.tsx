'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold as BoldIcon,
  ChevronDown,
  Code2,
  Columns2,
  Download,
  Eraser,
  Hash,
  Highlighter,
  Image as ImageIcon,
  Indent,
  Info,
  Italic as ItalicIcon,
  Languages,
  ListCollapse,
  List as ListIcon,
  ListChecks,
  ListOrdered,
  Minus,
  Music,
  Outdent,
  Redo2,
  Sparkles,
  Square,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Upload,
  Video,
} from 'lucide-react';
import {
  CALLOUT_COLORS,
  CALLOUT_VARIANTS,
  INDICATORS,
  ORDERING_STYLE,
  TODO_STYLE,
  type IndicatorKind,
} from '@lang/exam-core';
import type { MediaKind } from '@lang/shared';
import { RangeApi, TextApi, type TRange } from 'platejs';
import {
  useEditorRef,
  useEditorSelector,
  type PlateEditor,
} from 'platejs/react';
import { indent, outdent } from '@platejs/indent';
import { ListStyleType, toggleList } from '@platejs/list';
import {
  deleteColumn,
  deleteRow,
  deleteTable,
  insertTable,
  insertTableColumn,
  insertTableRow,
} from '@platejs/table';
import { isBlankActive, toggleBlank } from '@/components/plate/exam/blank';
import { MARK_KEYS } from '@/components/plate/exam/marks';
import { togglePair } from '@/components/plate/exam/pair';
import {
  activeRuby,
  applyRuby,
  toggleCallout,
  toggleToggleBlock,
} from '@/components/plate/exam/rich-blocks';
import {
  AlignButton,
  LinkButton,
  ListButton,
  MarkButton,
  ToolbarBtn,
  ToolbarSep,
} from '@/components/plate/toolbar';
import { PromptDialog } from '@/components/ui';
import { vi } from '@/i18n/vi';

const text = vi.examEditor.toolbar;
const richText = vi.examEditor.rich;

const BLOCK_TYPES = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code_block',
] as const;

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px'];

const TEXT_COLORS = [
  '#1f2328',
  '#c2255c',
  '#e8590c',
  '#f08c00',
  '#0ca678',
  '#1098ad',
  '#4c6ef5',
  '#7950f2',
];
const BG_COLORS = [
  '#fff3bf',
  '#ffe3e3',
  '#e6fcf5',
  '#e7f5ff',
  '#f3f0ff',
  '#f8f9fa',
];

function Dropdown({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 items-center gap-0.5 rounded-md px-1.5 transition ${
          open
            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'text-[var(--body)] hover:bg-[var(--hover)]'
        }`}
      >
        {icon}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 min-w-[190px] rounded-xl border border-[var(--border-strong)] bg-[var(--raised)] p-1.5 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-[var(--body)] transition hover:bg-[var(--hover)]"
    >
      {children}
    </button>
  );
}

const selectClass =
  'h-8 rounded-md border border-[var(--border-strong)] bg-[var(--bg)] px-2 text-[13px] text-[var(--body)] outline-none';

function BlockTypeSelect() {
  const editor = useEditorRef();
  const current = useEditorSelector(
    (ed) => (ed.api.block()?.[0] as { type?: string } | undefined)?.type ?? 'p',
    [],
  );
  return (
    <select
      value={
        (BLOCK_TYPES as readonly string[]).includes(current) ? current : 'p'
      }
      onChange={(event) => {
        editor.tf.focus();
        editor.tf.toggleBlock(event.target.value);
      }}
      title={text.blockType}
      aria-label={text.blockType}
      className={selectClass}
    >
      {BLOCK_TYPES.map((type) => (
        <option key={type} value={type}>
          {text.blockTypes[type]}
        </option>
      ))}
    </select>
  );
}

function FontSizeSelect() {
  const editor = useEditorRef();
  const current = useEditorSelector(
    (ed) => (ed.api.marks() as { fontSize?: string } | null)?.fontSize ?? '',
    [],
  );
  return (
    <select
      value={current}
      onChange={(event) => {
        editor.tf.focus();
        if (event.target.value) {
          editor.tf.addMark('fontSize', event.target.value);
        } else {
          editor.tf.removeMark('fontSize');
        }
      }}
      title={text.fontSize}
      aria-label={text.fontSize}
      className={selectClass}
    >
      <option value="">{text.fontSize}</option>
      {FONT_SIZES.map((size) => (
        <option key={size} value={size}>
          {size.replace('px', '')}
        </option>
      ))}
    </select>
  );
}

function ColorSwatches({
  colors,
  markKey,
  close,
}: {
  colors: string[];
  markKey: 'color' | 'backgroundColor';
  close: () => void;
}) {
  const editor = useEditorRef();
  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5 p-1">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={color}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              editor.tf.addMark(markKey, color);
              editor.tf.focus();
              close();
            }}
            className="h-6 w-6 rounded-md border border-[var(--border-strong)]"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <MenuItem
        onClick={() => {
          editor.tf.removeMark(markKey);
          editor.tf.focus();
          close();
        }}
      >
        {text.removeColor}
      </MenuItem>
    </div>
  );
}

function BlankButton() {
  const editor = useEditorRef();
  const active = useEditorSelector((ed) => isBlankActive(ed as never), []);
  return (
    <ToolbarBtn
      title={text.blank}
      pressed={active}
      onClick={() => toggleBlank(editor)}
    >
      <Square size={15} />
    </ToolbarBtn>
  );
}

function RubyButton() {
  const editor = useEditorRef();
  const ruby = useEditorSelector(
    (ed) => activeRuby(ed as PlateEditor)?.rt ?? null,
    [],
  );
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState('');
  const [warning, setWarning] = useState(false);
  // Popup chiếm focus nên giữ lại vùng chọn để gắn đúng chỗ.
  const saved = useRef<TRange | null>(null);

  return (
    <>
      <ToolbarBtn
        title={warning ? richText.rubyNeedSelection : richText.ruby}
        pressed={ruby !== null}
        onClick={() => {
          const selection = editor.selection;
          if (
            ruby === null &&
            (!selection || RangeApi.isCollapsed(selection))
          ) {
            setWarning(true);
            return;
          }
          setWarning(false);
          saved.current = selection;
          setInitial(ruby ?? '');
          setOpen(true);
        }}
      >
        <Languages size={15} />
      </ToolbarBtn>
      <PromptDialog
        open={open}
        title={richText.rubyTitle}
        label={richText.rubyLabel}
        defaultValue={initial}
        hint={ruby !== null ? richText.rubyHint : undefined}
        required={ruby === null}
        confirmLabel={richText.rubySave}
        onCancel={() => setOpen(false)}
        onSubmit={(value) => {
          setOpen(false);
          if (saved.current) editor.tf.select(saved.current);
          applyRuby(editor, value);
        }}
      />
    </>
  );
}

/** Nút "Định dạng bằng AI" (req-5 plan 1.17): không truyền = không có nút. */
export interface ToolbarAiFormat {
  /** Server thiếu cấu hình Gemini: nút disable kèm tooltip. */
  configured: boolean;
  onOpen: () => void;
}

function AiFormatButton({ configured, onOpen }: ToolbarAiFormat) {
  const label = vi.aiFormat.button;
  return (
    // Tooltip đặt ở khung ngoài: nút disable không nhận sự kiện chuột.
    <span title={configured ? label : vi.aiFormat.notConfigured}>
      <button
        type="button"
        disabled={!configured}
        aria-label={label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onOpen}
        className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:text-[var(--muted)] disabled:opacity-60 disabled:hover:bg-transparent"
      >
        <Sparkles size={15} />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </span>
  );
}

interface ExamToolbarProps {
  onOpenMedia: (kind: MediaKind) => void;
  onInsertIndicator: (kind: IndicatorKind) => void;
  onExport: () => void;
  onImport: () => void;
  /** Chỉ trình soạn đề thi truyền (plan 1.19). */
  aiFormat?: ToolbarAiFormat;
}

export function ExamToolbar({
  onOpenMedia,
  onInsertIndicator,
  onExport,
  onImport,
  aiFormat,
}: ExamToolbarProps) {
  const editor = useEditorRef();
  const run = (action: () => void) => () => {
    action();
    editor.tf.focus();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-[var(--sidebar)] px-1.5 py-1">
      <BlockTypeSelect />
      <FontSizeSelect />
      <ToolbarSep />

      <MarkButton nodeType="bold" title={text.bold}>
        <BoldIcon size={15} />
      </MarkButton>
      <MarkButton nodeType="italic" title={text.italic}>
        <ItalicIcon size={15} />
      </MarkButton>
      <MarkButton nodeType="underline" title={text.underline}>
        <UnderlineIcon size={15} />
      </MarkButton>
      <MarkButton nodeType="strikethrough" title={text.strikethrough}>
        <Strikethrough size={15} />
      </MarkButton>
      <MarkButton nodeType="code" title={text.code}>
        <Code2 size={15} />
      </MarkButton>
      <MarkButton nodeType="highlight" title={text.highlight}>
        <Highlighter size={15} />
      </MarkButton>
      <MarkButton nodeType="superscript" title={text.superscript}>
        <SuperscriptIcon size={15} />
      </MarkButton>
      <MarkButton nodeType="subscript" title={text.subscript}>
        <SubscriptIcon size={15} />
      </MarkButton>

      <Dropdown
        title={text.textColor}
        icon={<span className="text-[13px] font-bold leading-none">A</span>}
      >
        {(close) => (
          <ColorSwatches colors={TEXT_COLORS} markKey="color" close={close} />
        )}
      </Dropdown>
      <Dropdown
        title={text.backgroundColor}
        icon={
          <span className="rounded-sm bg-[var(--highlight-bg)] px-1 text-[13px] font-bold leading-none text-[var(--highlight-fg)]">
            A
          </span>
        }
      >
        {(close) => (
          <ColorSwatches
            colors={BG_COLORS}
            markKey="backgroundColor"
            close={close}
          />
        )}
      </Dropdown>

      <ToolbarBtn
        title={text.clearFormat}
        onClick={() => {
          const at = editor.selection;
          if (!at) return;
          editor.tf.unsetNodes(MARK_KEYS, {
            at,
            match: TextApi.isText,
            split: true,
          });
          editor.tf.focus();
        }}
      >
        <Eraser size={15} />
      </ToolbarBtn>
      <ToolbarSep />

      <ListButton nodeType={ListStyleType.Disc} title={text.bulletList}>
        <ListIcon size={15} />
      </ListButton>
      <ListButton nodeType={ListStyleType.Decimal} title={text.numberedList}>
        <ListOrdered size={15} />
      </ListButton>
      <ListButton nodeType={TODO_STYLE} title={text.todoList}>
        <ListChecks size={15} />
      </ListButton>
      <ToolbarBtn
        title={text.orderingList}
        onClick={run(() =>
          toggleList(editor, { listStyleType: ORDERING_STYLE }),
        )}
      >
        <Hash size={15} />
      </ToolbarBtn>
      <ToolbarBtn title={text.pair} onClick={() => togglePair(editor)}>
        <Columns2 size={15} />
      </ToolbarBtn>
      <Dropdown title={richText.callout} icon={<Info size={15} />}>
        {(close) =>
          CALLOUT_VARIANTS.map((variant) => (
            <MenuItem
              key={variant}
              onClick={() => {
                toggleCallout(editor, variant);
                close();
              }}
            >
              <span
                className="ls-tint ls-tint-dot h-2 w-2 shrink-0 rounded-full"
                style={
                  { '--tint-raw': CALLOUT_COLORS[variant] } as CSSProperties
                }
              />
              {richText.callouts[variant]}
            </MenuItem>
          ))
        }
      </Dropdown>
      <ToolbarBtn
        title={richText.toggle}
        onClick={() => toggleToggleBlock(editor)}
      >
        <ListCollapse size={15} />
      </ToolbarBtn>
      <RubyButton />
      <ToolbarBtn title={text.indent} onClick={run(() => indent(editor))}>
        <Indent size={15} />
      </ToolbarBtn>
      <ToolbarBtn title={text.outdent} onClick={run(() => outdent(editor))}>
        <Outdent size={15} />
      </ToolbarBtn>
      <ToolbarSep />

      <AlignButton value="left" title={text.alignLeft}>
        <AlignLeft size={15} />
      </AlignButton>
      <AlignButton value="center" title={text.alignCenter}>
        <AlignCenter size={15} />
      </AlignButton>
      <AlignButton value="right" title={text.alignRight}>
        <AlignRight size={15} />
      </AlignButton>
      <AlignButton value="justify" title={text.alignJustify}>
        <AlignJustify size={15} />
      </AlignButton>
      <ToolbarSep />

      <LinkButton />
      <ToolbarBtn
        title={text.divider}
        onClick={run(() =>
          editor.tf.insertNodes({ type: 'hr', children: [{ text: '' }] }),
        )}
      >
        <Minus size={15} />
      </ToolbarBtn>
      <ToolbarBtn title={text.image} onClick={() => onOpenMedia('image')}>
        <ImageIcon size={15} />
      </ToolbarBtn>
      <ToolbarBtn title={text.audio} onClick={() => onOpenMedia('audio')}>
        <Music size={15} />
      </ToolbarBtn>
      <ToolbarBtn title={text.video} onClick={() => onOpenMedia('video')}>
        <Video size={15} />
      </ToolbarBtn>

      <Dropdown title={text.table} icon={<TableIcon size={15} />}>
        {(close) => (
          <>
            <MenuItem
              onClick={() => {
                insertTable(editor, { colCount: 3, rowCount: 3, header: true });
                editor.tf.focus();
                close();
              }}
            >
              {text.insertTable}
            </MenuItem>
            {(
              [
                [text.addRow, () => insertTableRow(editor)],
                [text.addColumn, () => insertTableColumn(editor)],
                [text.deleteRow, () => deleteRow(editor)],
                [text.deleteColumn, () => deleteColumn(editor)],
                [text.deleteTable, () => deleteTable(editor)],
              ] as const
            ).map(([label, action]) => (
              <MenuItem
                key={label}
                onClick={() => {
                  action();
                  close();
                }}
              >
                {label}
              </MenuItem>
            ))}
          </>
        )}
      </Dropdown>
      <ToolbarSep />

      <BlankButton />
      <Dropdown
        title={text.indicator}
        icon={<span className="text-[12.5px] font-semibold">Indicator</span>}
      >
        {(close) =>
          INDICATORS.map((meta) => (
            <MenuItem
              key={meta.kind}
              onClick={() => {
                onInsertIndicator(meta.kind);
                close();
              }}
            >
              <span
                className="ls-tint ls-tint-dot h-2 w-2 shrink-0 rounded-full"
                style={{ '--tint-raw': meta.color } as CSSProperties}
              />
              <span className="flex-1">{meta.label}</span>
              <span className="text-[11.5px] text-[var(--muted)]">
                {meta.hint}
              </span>
            </MenuItem>
          ))
        }
      </Dropdown>
      <ToolbarSep />

      <ToolbarBtn title={text.undo} onClick={() => editor.tf.undo()}>
        <Undo2 size={15} />
      </ToolbarBtn>
      <ToolbarBtn title={text.redo} onClick={() => editor.tf.redo()}>
        <Redo2 size={15} />
      </ToolbarBtn>
      <ToolbarBtn title={text.exportJson} onClick={onExport}>
        <Download size={15} />
      </ToolbarBtn>
      <ToolbarBtn title={text.importJson} onClick={onImport}>
        <Upload size={15} />
      </ToolbarBtn>
      {aiFormat && (
        <>
          <ToolbarSep />
          <AiFormatButton {...aiFormat} />
        </>
      )}
    </div>
  );
}
