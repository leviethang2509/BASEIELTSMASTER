'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CALLOUT_COLORS,
  CALLOUT_VARIANTS,
  INDICATORS,
  ORDERING_STYLE,
  TODO_STYLE,
  buildOutline,
  createIndicator,
  extractExplanations,
  isIndicator,
  validateSection,
  type ExamElement,
  type IndicatorKind,
  type IndicatorProps,
  type TIndicatorElement,
  type ValidateSectionOptions,
} from '@lang/exam-core';
import {
  AiFormatRunStatus,
  type AiFormatJob,
  type MediaKind,
} from '@lang/shared';
import { X } from 'lucide-react';
import { NodeApi, RangeApi, type Value } from 'platejs';
import {
  Plate,
  PlateContent,
  usePlateEditor,
  type PlateEditor,
} from 'platejs/react';
import { toggleList } from '@platejs/list';
import { insertTable } from '@platejs/table';
import { MediaDialog } from '@/components/media/MediaDialog';
import {
  indicatorInsertIndex,
  insertIndicator,
  updateIndicatorById,
} from '@/components/plate/exam/indicator';
import { insertMedia } from '@/components/plate/exam/media';
import { togglePair } from '@/components/plate/exam/pair';
import {
  toggleCallout,
  toggleToggleBlock,
} from '@/components/plate/exam/rich-blocks';
import { EXAM_EDITOR_PLUGINS } from '@/components/plate/exam/plugins';
import { toEditorValue } from '@/components/plate/value';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { downloadJson, pickTextFile } from '@/lib/json-file';
import { AiFormatDialog } from './AiFormatDialog';
import { ExamToolbar } from './ExamToolbar';
import { ExplanationDialog } from './ExplanationDialog';
import { IndicatorDialog } from './IndicatorDialog';
import { IssuePanel } from './IssuePanel';
import { Minimap } from './Minimap';
import { SlashMenu, type SlashItem } from './SlashMenu';

const text = vi.examEditor;

interface IndicatorDialogState {
  /** Có id là sửa indicator sẵn có; không có là chèn mới. */
  id?: string;
  initial?: IndicatorProps;
}

interface SlashState {
  query: string;
  path: number[];
  start: number;
  top: number;
  left: number;
}

/** Định dạng bằng AI (req-5): chỉ trình soạn đề thi truyền, tenant đã bật AI. */
export interface SectionAiFormat {
  examId: string;
  sectionName: string;
  moduleId: string | null;
  /** Server có cấu hình Gemini (thiếu thì nút disable). */
  configured: boolean;
}

interface AiNotice {
  tone: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface SectionEditorProps {
  /** Khoá tab, gắn vào DOM để cuộn tới indicator đúng section. */
  sectionKey: string;
  slug: string;
  initialValue: Value;
  readOnly: boolean;
  /** Tab đang hiện (tab ẩn vẫn giữ editor để không mất lịch sử hoàn tác). */
  active: boolean;
  /** Tên file khi xuất JSON. */
  exportName: string;
  /** Bài học: không cảnh báo section không có câu hỏi. */
  validateOptions?: ValidateSectionOptions;
  /** Không truyền = không có nút "Định dạng bằng AI" (trình soạn bài học). */
  aiFormat?: SectionAiFormat;
  onChange: (value: Value) => void;
  onEditor: (editor: PlateEditor | null) => void;
}

/** Một tab section: editor Plate + thanh công cụ + mini map + bảng kiểm tra. */
export function SectionEditor({
  sectionKey,
  slug,
  initialValue,
  readOnly,
  active,
  exportName,
  validateOptions,
  aiFormat,
  onChange,
  onEditor,
}: SectionEditorProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<Value>(initialValue);
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const [indicatorDialog, setIndicatorDialog] =
    useState<IndicatorDialogState | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNotice, setAiNotice] = useState<AiNotice | null>(null);
  /** Kết quả AI còn lỗi: làm nổi bảng kiểm tra (plan 1.11). */
  const [highlightIssues, setHighlightIssues] = useState(false);
  /** Số câu Explanation sẽ gắn (tính lúc mở hộp hướng dẫn); `null` = đóng. */
  const [explanationTarget, setExplanationTarget] = useState<number[] | null>(
    null,
  );

  const editor = usePlateEditor({
    plugins: EXAM_EDITOR_PLUGINS,
    value: initialValue,
    // Không tự gắn `id` cho mọi block: nội dung trong editor phải giống hệt bản
    // đã lưu để biết còn thay đổi chưa lưu không (indicator/cặp ghép tự có id).
    nodeId: false,
  });

  // Giữ callback mới nhất trong ref để effect chỉ chạy khi đổi editor.
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  useEffect(() => {
    onEditorRef.current(editor);
    return () => onEditorRef.current(null);
  }, [editor]);

  const examValue = value as unknown as ExamElement[];
  const outline = useMemo(() => buildOutline(examValue), [examValue]);
  const issues = useMemo(
    () => validateSection(examValue, validateOptions),
    [examValue, validateOptions],
  );

  // --- Slash menu ----------------------------------------------------------
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  // Chèn Question thì phải chọn dạng trước; Explanation hiện hướng dẫn kèm câu
  // sẽ được gắn; Part/Subpart chèn thẳng.
  const insertIndicatorOrAsk = useCallback(
    (kind: IndicatorKind) => {
      if (kind === 'question') {
        setIndicatorDialog({});
        return;
      }
      if (kind === 'explanation') {
        const current = editor.children as unknown as ExamElement[];
        const at = indicatorInsertIndex(editor);
        const probe = createIndicator('explanation', undefined, 'probe');
        const numbers =
          extractExplanations([
            ...current.slice(0, at),
            probe,
            ...current.slice(at),
          ]).find((item) => item.nodeId === probe.id)?.numbers ?? [];
        setExplanationTarget(numbers);
        return;
      }
      insertIndicator(editor, kind);
    },
    [editor],
  );

  const slashItems: SlashItem[] = useMemo(() => {
    const all: SlashItem[] = [
      ...INDICATORS.map((meta) => ({
        key: `indicator-${meta.kind}`,
        label: meta.label,
        hint: meta.hint,
        color: meta.color,
        run: () => insertIndicatorOrAsk(meta.kind),
      })),
      ...(['h1', 'h2', 'h3'] as const).map((type) => ({
        key: type,
        label: text.toolbar.blockTypes[type],
        hint: 'heading',
        run: () => editor.tf.toggleBlock(type),
      })),
      ...CALLOUT_VARIANTS.map((variant) => ({
        key: `callout-${variant}`,
        label: text.rich.callouts[variant],
        hint: 'callout',
        color: CALLOUT_COLORS[variant],
        run: () => toggleCallout(editor, variant),
      })),
      {
        key: 'toggle',
        label: text.rich.toggle,
        hint: 'toggle',
        run: () => toggleToggleBlock(editor),
      },
      {
        key: 'ul',
        label: text.toolbar.bulletList,
        hint: 'list',
        run: () => toggleList(editor, { listStyleType: 'disc' }),
      },
      {
        key: 'ol',
        label: text.toolbar.numberedList,
        hint: 'list',
        run: () => toggleList(editor, { listStyleType: 'decimal' }),
      },
      {
        key: 'todo',
        label: text.toolbar.todoList,
        hint: 'multiple choice',
        run: () => toggleList(editor, { listStyleType: TODO_STYLE }),
      },
      {
        key: 'ordering',
        label: text.slash.ordering,
        hint: 'ordering · polytomous',
        run: () => toggleList(editor, { listStyleType: ORDERING_STYLE }),
      },
      {
        key: 'pair',
        label: text.slash.pair,
        hint: 'matching · true/false',
        run: () => togglePair(editor),
      },
      {
        key: 'table',
        label: text.slash.table,
        hint: 'table',
        run: () =>
          insertTable(editor, { colCount: 3, rowCount: 3, header: true }),
      },
      {
        key: 'code',
        label: text.toolbar.blockTypes.code_block,
        hint: 'code',
        run: () => editor.tf.toggleBlock('code_block'),
      },
      {
        key: 'hr',
        label: text.toolbar.divider,
        hint: 'divider',
        run: () =>
          editor.tf.insertNodes({ type: 'hr', children: [{ text: '' }] }),
      },
      {
        key: 'img',
        label: text.toolbar.image,
        hint: 'media',
        run: () => setMediaKind('image'),
      },
      {
        key: 'audio',
        label: text.toolbar.audio,
        hint: 'media',
        run: () => setMediaKind('audio'),
      },
      {
        key: 'video',
        label: text.toolbar.video,
        hint: 'media',
        run: () => setMediaKind('video'),
      },
    ];
    const query = (slash?.query ?? '').trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query) ||
        item.hint.toLowerCase().includes(query),
    );
  }, [editor, insertIndicatorOrAsk, slash?.query]);

  const closeSlash = useCallback(() => {
    setSlash(null);
    setSlashIndex(0);
  }, []);

  /** Sau khi chọn mục: xoá phần `/query` đã gõ rồi mới chèn. */
  const runSlash = useCallback(
    (item: SlashItem) => {
      if (!slash) return;
      const { path, start, query } = slash;
      closeSlash();
      editor.tf.delete({
        at: {
          anchor: { path, offset: start },
          focus: { path, offset: start + query.length + 1 },
        },
      });
      item.run();
    },
    [closeSlash, editor, slash],
  );

  const detectSlash = useCallback(() => {
    const selection = editor.selection;
    if (readOnly || !selection || !RangeApi.isCollapsed(selection)) {
      closeSlash();
      return;
    }

    const path = selection.anchor.path;
    const offset = selection.anchor.offset;
    const node = NodeApi.get(editor, path) as { text?: string } | undefined;
    const before = (node?.text ?? '').slice(0, offset);
    const match = /(?:^|\s)\/([\p{L}\d-]*)$/u.exec(before);
    if (!match) {
      closeSlash();
      return;
    }

    const domSelection = window.getSelection();
    const rect = domSelection?.rangeCount
      ? domSelection.getRangeAt(0).getBoundingClientRect()
      : null;
    setSlash({
      query: match[1],
      path,
      start: offset - match[1].length - 1,
      top: (rect?.bottom ?? 0) + 6,
      left: Math.min(rect?.left ?? 0, window.innerWidth - 292),
    });
    setSlashIndex(0);
  }, [closeSlash, editor, readOnly]);

  // --- Bấm vào badge câu hỏi để đổi dạng / sửa tham số ---------------------
  const onContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) return;
      const badge = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-indicator-id]',
      );
      if (!badge || badge.dataset.indicatorKind !== 'question') return;
      const id = badge.dataset.indicatorId!;
      const node = examValue.find(
        (item): item is TIndicatorElement =>
          isIndicator(item) && item.id === id,
      );
      setIndicatorDialog({
        id,
        initial: {
          qtype: node?.qtype,
          seconds: node?.seconds,
          maxChars: node?.maxChars,
          maxPicks: node?.maxPicks,
          options: node?.options,
        },
      });
    },
    [examValue, readOnly],
  );

  function submitIndicator(props: IndicatorProps) {
    if (!indicatorDialog) return;
    if (indicatorDialog.id) {
      updateIndicatorById(editor, indicatorDialog.id, props);
    } else {
      insertIndicator(editor, 'question', props);
    }
    setIndicatorDialog(null);
  }

  async function importJson() {
    const content = await pickTextFile('application/json');
    if (content === null) return;
    let next: Value | null;
    try {
      next = toEditorValue(JSON.parse(content));
    } catch {
      next = null;
    }
    if (!next) {
      setImportError(text.importInvalid);
      return;
    }
    setImportError(null);
    editor.tf.setValue(next);
  }

  /** Job AI dừng: áp kết quả thành một bước hoàn tác, không tự Save (plan 1.9). */
  function finishAiFormat(job: AiFormatJob) {
    setAiOpen(false);
    setHighlightIssues(false);
    const result = job.result;
    if (job.status === AiFormatRunStatus.CANCELLED || !result) {
      setAiNotice({ tone: 'info', message: vi.aiFormat.cancelled });
      return;
    }
    if (!result.changed) {
      setAiNotice(
        job.status === AiFormatRunStatus.SUCCEEDED
          ? { tone: 'info', message: vi.aiFormat.alreadyFormatted }
          : { tone: 'warning', message: vi.aiFormat.unchanged },
      );
      return;
    }
    const next = toEditorValue(result.value);
    if (!next) {
      setAiNotice({ tone: 'error', message: vi.aiFormat.invalidResult });
      return;
    }
    // `setValue` = xoá + chèn node (có ghi lịch sử); batch riêng để một lần
    // Ctrl+Z quay về đúng bản trước khi định dạng.
    editor.tf.withNewBatch(() => editor.tf.setValue(next));
    if (job.status === AiFormatRunStatus.PARTIAL) {
      const errors = result.issues.filter(
        (issue) => issue.severity === 'error' && issue.category === 'structure',
      ).length;
      setAiNotice({ tone: 'warning', message: vi.aiFormat.partial(errors) });
      setHighlightIssues(true);
    } else {
      setAiNotice({ tone: 'success', message: vi.aiFormat.succeeded });
    }
  }

  const stats = useMemo(() => {
    const plain = value.map((node) => NodeApi.string(node)).join(' ');
    const words = plain.trim() ? plain.trim().split(/\s+/).length : 0;
    return { words, chars: plain.replace(/\s/g, '').length };
  }, [value]);

  return (
    <div
      data-section-key={sectionKey}
      className={`${active ? 'flex' : 'hidden'} min-h-0 flex-1 gap-3`}
    >
      <div
        onKeyDownCapture={(event) => {
          if (!slash || !slashItems.length) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashIndex((index) => (index + 1) % slashItems.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashIndex(
              (index) => (index - 1 + slashItems.length) % slashItems.length,
            );
          } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            runSlash(slashItems[slashIndex]);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            closeSlash();
          }
        }}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)]"
      >
        <Plate
          editor={editor}
          readOnly={readOnly}
          onChange={({ value: next }) => {
            if (next !== value) {
              setValue(next);
              onChange(next);
            }
            detectSlash();
          }}
        >
          {!readOnly && (
            <ExamToolbar
              onOpenMedia={setMediaKind}
              onInsertIndicator={insertIndicatorOrAsk}
              onExport={() => downloadJson(exportName, editor.children)}
              onImport={() => void importJson()}
              aiFormat={
                aiFormat && {
                  configured: aiFormat.configured,
                  onOpen: () => setAiOpen(true),
                }
              }
            />
          )}
          {importError && (
            <div className="border-b border-[var(--border)] p-2">
              <FormAlert tone="error">{importError}</FormAlert>
            </div>
          )}
          {aiNotice && (
            <div className="border-b border-[var(--border)] p-2">
              <FormAlert tone={aiNotice.tone}>
                <div className="flex items-start gap-2">
                  <p className="flex-1">{aiNotice.message}</p>
                  <button
                    type="button"
                    title={vi.aiFormat.dismiss}
                    aria-label={vi.aiFormat.dismiss}
                    onClick={() => {
                      setAiNotice(null);
                      setHighlightIssues(false);
                    }}
                    className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              </FormAlert>
            </div>
          )}
          <div
            ref={scrollerRef}
            onClick={onContentClick}
            className="min-h-0 flex-1 overflow-auto"
          >
            <PlateContent
              aria-label={text.contentLabel}
              className="exam-editor min-h-full px-5 py-4 text-[15px] leading-[1.9] text-[var(--heading)] outline-none"
              placeholder={readOnly ? undefined : text.placeholder}
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 border-t border-[var(--border)] bg-[var(--sidebar)] px-4 py-1.5 text-[12px] text-[var(--muted)]">
            <span>{text.stats(stats.words, stats.chars)}</span>
            {!readOnly && (
              <span className="hidden md:inline">{text.shortcuts}</span>
            )}
          </div>
        </Plate>
      </div>

      <div
        className={`${highlightIssues ? 'flex' : 'hidden'} w-[248px] shrink-0 flex-col gap-3 lg:flex`}
      >
        <Minimap items={outline} scrollerRef={scrollerRef} active={active} />
        <IssuePanel
          issues={issues}
          outline={outline}
          scrollerRef={scrollerRef}
          highlight={highlightIssues}
        />
      </div>

      {slash && active && (
        <SlashMenu
          items={slashItems}
          activeIndex={slashIndex}
          position={{ top: slash.top, left: slash.left }}
          onSelect={runSlash}
        />
      )}

      {mediaKind && (
        <MediaDialog
          open
          kind={mediaKind}
          slug={slug}
          onClose={() => setMediaKind(null)}
          onInsert={(url, name) => {
            insertMedia(editor, mediaKind, url, name);
            setMediaKind(null);
          }}
        />
      )}

      {explanationTarget && (
        <ExplanationDialog
          open
          numbers={explanationTarget}
          onClose={() => setExplanationTarget(null)}
          onInsert={() => {
            setExplanationTarget(null);
            insertIndicator(editor, 'explanation');
          }}
        />
      )}

      {aiOpen && aiFormat && (
        <AiFormatDialog
          slug={slug}
          examId={aiFormat.examId}
          sectionName={aiFormat.sectionName}
          moduleId={aiFormat.moduleId}
          getValue={() => editor.children}
          onClose={() => setAiOpen(false)}
          onDone={finishAiFormat}
        />
      )}

      {indicatorDialog && (
        <IndicatorDialog
          open
          initial={indicatorDialog.initial}
          onSubmit={submitIndicator}
          onClose={() => setIndicatorDialog(null)}
        />
      )}
    </div>
  );
}
