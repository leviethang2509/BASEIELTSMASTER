'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowLeft,
  Eye,
  History,
  Loader2,
  Save,
  Send,
  Settings2,
} from 'lucide-react';
import {
  collectDataUrls,
  validateSection,
  type ExamElement,
} from '@lang/exam-core';
import {
  ExamStatus,
  type AiStatus,
  type ExamBlueprintItem,
  type ExamContentIssue,
  type ExamDetail,
  type ExamModuleItem,
} from '@lang/shared';
import type { Value } from 'platejs';
import type { PlateEditor } from 'platejs/react';
import { ExamFormModal } from '@/components/exams/ExamFormModal';
import { ExamStatusBadge } from '@/components/exams/ExamStatusBadge';
import { applyDataUrls } from '@/components/plate/exam/embedded-media';
import { emptyValue } from '@/components/plate/value';
import {
  Badge,
  ConfirmDialog,
  FormAlert,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { getAiStatus } from '@/lib/ai-format-api';
import { uploadDataUrls } from '@/lib/embedded-media';
import { errorMessage } from '@/lib/error-message';
import {
  archiveExam,
  contentIssuesOf,
  publishExam,
  saveExamContent,
} from '@/lib/exam-api';
import { formatDateTime } from '@/lib/format';
import { PreviewDialog } from './PreviewDialog';
import { SectionEditor } from './SectionEditor';
import { SectionTabs } from './SectionTabs';
import {
  newSectionKey,
  snapshotOf,
  toDraftSections,
  type EditorSection,
} from './editor-sections';
import { clearExamDraft, saveExamDraft } from './exam-draft';

const text = vi.examEditor;

// Kiểm tra lại mỗi lần gõ tốn công; nhớ kết quả theo đúng mảng nội dung.
const errorCountCache = new WeakMap<Value, number>();
function errorCount(value: Value): number {
  let count = errorCountCache.get(value);
  if (count === undefined) {
    count = validateSection(value as unknown as ExamElement[]).filter(
      (issue) => issue.severity === 'error',
    ).length;
    errorCountCache.set(value, count);
  }
  return count;
}

interface ExamEditorProps {
  slug: string;
  exam: ExamDetail;
  /** Section của bản server (đã chuyển sang Plate Value). */
  serverSections: EditorSection[];
  /** Section khôi phục từ bản nháp trình duyệt, nếu người dùng chọn. */
  restoredSections: EditorSection[] | null;
  blueprints: ExamBlueprintItem[];
  listHref: string;
  versionsHref: string;
}

export function ExamEditor({
  slug,
  exam: initialExam,
  serverSections,
  restoredSections,
  blueprints,
  listHref,
  versionsHref,
}: ExamEditorProps) {
  const [exam, setExam] = useState(initialExam);
  const [sections, setSections] = useState<EditorSection[]>(
    restoredSections ?? serverSections,
  );
  const [activeKey, setActiveKey] = useState(
    (restoredSections ?? serverSections)[0].key,
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshotOf(serverSections),
  );
  const [dirty, setDirty] = useState(restoredSections !== null);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<'publish' | 'archive' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ExamContentIssue[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmVersion, setConfirmVersion] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const readOnly = !exam.canEdit;
  /** Trạng thái AI của tenant: chưa bật / lỗi tải thì không có nút (plan 1.17). */
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    if (readOnly) return;
    let active = true;
    getAiStatus(slug)
      .then((status) => {
        if (active) setAiStatus(status);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [slug, readOnly]);
  const editors = useRef(new Map<string, PlateEditor>());
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const modules: ExamModuleItem[] = useMemo(
    () =>
      blueprints.find((blueprint) => blueprint.id === exam.blueprint.id)
        ?.modules ?? [],
    [blueprints, exam.blueprint.id],
  );

  const updateSection = useCallback(
    (key: string, changes: Partial<EditorSection>) => {
      setSections((current) =>
        current.map((section) =>
          section.key === key ? { ...section, ...changes } : section,
        ),
      );
    },
    [],
  );

  // --- Bản nháp localStorage -------------------------------------------------
  // Sửa gì cũng đánh dấu chưa lưu ngay; sau khi ngừng gõ mới so với bản đã lưu
  // (có thể đã hoàn tác về như cũ) và ghi bản nháp.
  const lastSections = useRef(sections);
  /** Đồng bộ state sau khi lưu không phải là sửa của người dùng. */
  const syncedAfterSave = useRef(false);
  useEffect(() => {
    if (readOnly) return;
    if (lastSections.current !== sections) {
      lastSections.current = sections;
      if (!syncedAfterSave.current) setDirty(true);
      syncedAfterSave.current = false;
    }
    const timer = setTimeout(() => {
      const changed = snapshotOf(sections) !== savedSnapshot;
      setDirty(changed);
      if (changed) {
        saveExamDraft(exam.id, {
          savedAt: new Date().toISOString(),
          baseRevision: exam.contentRevision,
          sections: toDraftSections(sections),
        });
      } else {
        clearExamDraft(exam.id);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [sections, savedSnapshot, readOnly, exam.id, exam.contentRevision]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // --- Lưu -------------------------------------------------------------------
  const save = useCallback(
    async (confirmed = false) => {
      if (readOnly || saving) return;
      if (exam.hasAttempts && !confirmed) {
        setConfirmVersion(true);
        return;
      }
      setConfirmVersion(false);
      setSaving(true);
      setError(null);
      setIssues([]);
      setNotice(null);
      try {
        // Media dán vào dạng data: URI phải lên R2 trước (server từ chối base64).
        for (const section of sectionsRef.current) {
          const editor = editors.current.get(section.key);
          if (!editor) continue;
          const urls = collectDataUrls(editor.children);
          if (urls.length > 0) {
            applyDataUrls(editor, await uploadDataUrls(slug, urls));
          }
        }
        const sent = sectionsRef.current.map((section) => ({
          ...section,
          value: editors.current.get(section.key)?.children ?? section.value,
        }));
        const result = await saveExamContent(slug, exam.id, {
          baseRevision: exam.contentRevision,
          sections: sent.map((section) => ({
            moduleId: section.moduleId,
            name: section.name,
            durationMinutes: section.durationMinutes,
            rawData: section.value,
          })),
        });
        const sentSnapshot = snapshotOf(sent);
        setSavedSnapshot(sentSnapshot);
        // State đồng bộ với nội dung vừa gửi (editor có thể đã chuẩn hoá hoặc
        // thay URL media) nếu chưa sửa thêm trong lúc lưu.
        syncedAfterSave.current = true;
        setSections((current) =>
          current.map((section) => {
            const value = sent.find((item) => item.key === section.key)?.value;
            return value &&
              value !== section.value &&
              editors.current.get(section.key)?.children === value
              ? { ...section, value }
              : section;
          }),
        );
        if (result.currentVersion !== exam.currentVersion) {
          setNotice(text.newVersionSaved(result.currentVersion));
        }
        setExam(result);
        const unchanged = sectionsRef.current.every(
          (section) =>
            editors.current.get(section.key)?.children ===
            sent.find((item) => item.key === section.key)?.value,
        );
        if (unchanged) {
          setDirty(false);
          clearExamDraft(exam.id);
        }
      } catch (err) {
        setError(errorMessage(err, text.saveFailed));
        setIssues(contentIssuesOf(err));
      } finally {
        setSaving(false);
      }
    },
    [exam, readOnly, saving, slug],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  async function changeStatus(action: 'publish' | 'archive') {
    setBusyAction(action);
    setError(null);
    setIssues([]);
    setNotice(null);
    try {
      const result =
        action === 'publish'
          ? await publishExam(slug, exam.id)
          : await archiveExam(slug, exam.id);
      setExam(result);
      setNotice(action === 'publish' ? text.published : text.archived);
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
      setIssues(contentIssuesOf(err));
    } finally {
      setBusyAction(null);
      setConfirmArchive(false);
    }
  }

  function showIssue(issue: ExamContentIssue) {
    const section = sections[issue.sectionIndex];
    if (!section) return;
    setActiveKey(section.key);
    if (!issue.indicatorId) return;
    requestAnimationFrame(() => {
      document
        .querySelector(
          `[data-section-key="${section.key}"] [data-indicator-id="${CSS.escape(issue.indicatorId!)}"]`,
        )
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // --- Tab section -----------------------------------------------------------
  function addSection(module: ExamModuleItem | null) {
    const section: EditorSection = {
      key: newSectionKey(),
      moduleId: module?.id ?? null,
      name: module?.name ?? text.tabs.defaultName(sections.length + 1),
      durationMinutes: module?.referenceDurationMinutes ?? 30,
      value: emptyValue(),
    };
    setSections((current) => [...current, section]);
    setActiveKey(section.key);
  }

  function removeSection(key: string) {
    const index = sections.findIndex((section) => section.key === key);
    const rest = sections.filter((section) => section.key !== key);
    if (rest.length === 0) return;
    setSections(rest);
    if (activeKey === key) setActiveKey(rest[Math.max(0, index - 1)].key);
  }

  function moveSection(from: number, to: number) {
    setSections((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const tabs = sections.map((section) => ({
    key: section.key,
    name: section.name,
    durationMinutes: section.durationMinutes,
    errorCount: errorCount(section.value),
  }));
  const totalMinutes = sections.reduce(
    (sum, section) => sum + section.durationMinutes,
    0,
  );

  const saveStatus = saving
    ? text.saving
    : dirty
      ? text.unsaved
      : text.savedAt(formatDateTime(exam.contentSavedAt));
  const canPublish = exam.status !== ExamStatus.PUBLISHED;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <Link
          href={listHref}
          title={text.backToList}
          aria-label={text.backToList}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--border-strong)] text-[var(--body)] transition hover:bg-[var(--hover)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1
              className="truncate text-[19px] font-bold tracking-tight text-[var(--heading)]"
              title={exam.description ?? undefined}
            >
              {exam.title}
            </h1>
            <ExamStatusBadge status={exam.status} />
            <Badge>{text.version(exam.currentVersion)}</Badge>
            {readOnly && <Badge tone="warning">{text.readOnlyBadge}</Badge>}
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--muted)]">
            {exam.blueprint.name} ·{' '}
            {text.summary(sections.length, totalMinutes)}
            {!readOnly && (
              <>
                {' · '}
                <span className={dirty ? 'text-[var(--warn)]' : undefined}>
                  {saveStatus}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className={secondaryButtonClass}
          >
            <Eye size={16} /> {text.previewButton}
          </button>
          <Link href={versionsHref} className={secondaryButtonClass}>
            <History size={16} /> {text.versions}
          </Link>
          {!readOnly && (
            <>
              <button
                type="button"
                title={text.metadata}
                aria-label={text.metadata}
                onClick={() => setMetadataOpen(true)}
                className={secondaryButtonClass}
              >
                <Settings2 size={16} />
                <span className="hidden xl:inline">{text.metadata}</span>
              </button>
              {canPublish ? (
                <button
                  type="button"
                  disabled={dirty || saving || busyAction !== null}
                  title={dirty ? text.saveBeforePublish : undefined}
                  onClick={() => void changeStatus('publish')}
                  className={secondaryButtonClass}
                >
                  <Send size={16} />
                  {exam.status === ExamStatus.ARCHIVED
                    ? vi.exams.republish
                    : vi.exams.publish}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => setConfirmArchive(true)}
                  className={secondaryButtonClass}
                >
                  <Archive size={16} /> {vi.exams.archive}
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                title={text.saveShortcut}
                className={compactPrimaryButtonClass}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {text.save}
              </button>
            </>
          )}
        </div>
      </div>

      {readOnly && <FormAlert tone="info">{text.readOnlyHint}</FormAlert>}
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && (
        <FormAlert tone="error">
          <p>{error}</p>
          {issues.length > 0 && (
            <ul className="mt-1.5 max-h-[140px] list-disc overflow-auto pl-5">
              {issues
                .filter((issue) => issue.severity === 'error')
                .map((issue, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => showIssue(issue)}
                      className="text-left underline-offset-2 hover:underline"
                    >
                      {text.issueLine(issue.sectionName, issue.message)}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </FormAlert>
      )}

      <SectionTabs
        tabs={tabs}
        activeKey={activeKey}
        readOnly={readOnly}
        modules={modules}
        onSelect={setActiveKey}
        onAdd={addSection}
        onRename={(key, name) => updateSection(key, { name })}
        onDuration={(key, durationMinutes) =>
          updateSection(key, { durationMinutes })
        }
        onRemove={removeSection}
        onMove={moveSection}
      />

      {sections.map((section) => (
        <SectionEditor
          key={section.key}
          sectionKey={section.key}
          slug={slug}
          initialValue={section.value}
          readOnly={readOnly}
          active={section.key === activeKey}
          exportName={`${exam.title} - ${section.name}`}
          aiFormat={
            aiStatus?.enabled
              ? {
                  examId: exam.id,
                  sectionName: section.name,
                  moduleId: section.moduleId,
                  configured: aiStatus.configured,
                }
              : undefined
          }
          onChange={(value) => updateSection(section.key, { value })}
          onEditor={(editor) => {
            if (editor) editors.current.set(section.key, editor);
            else editors.current.delete(section.key);
          }}
        />
      ))}

      <PreviewDialog
        open={previewOpen}
        sections={sections}
        initialKey={activeKey}
        onClose={() => setPreviewOpen(false)}
      />
      <ExamFormModal
        open={metadataOpen}
        slug={slug}
        exam={exam}
        blueprints={blueprints}
        onClose={() => setMetadataOpen(false)}
        onSaved={(result) => {
          setMetadataOpen(false);
          // Metadata không đụng nội dung: giữ nguyên section đang soạn.
          setExam((current) => ({
            ...result,
            contentRevision: current.contentRevision,
            sections: current.sections,
          }));
        }}
      />
      <ConfirmDialog
        open={confirmVersion}
        title={text.newVersionTitle}
        message={text.newVersionConfirm(exam.currentVersion + 1)}
        confirmLabel={text.save}
        onConfirm={() => void save(true)}
        onCancel={() => setConfirmVersion(false)}
      />
      <ConfirmDialog
        open={confirmArchive}
        title={vi.exams.archive}
        message={vi.exams.archiveConfirm(exam.title)}
        confirmLabel={vi.exams.archive}
        loading={busyAction === 'archive'}
        onConfirm={() => void changeStatus('archive')}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  );
}
