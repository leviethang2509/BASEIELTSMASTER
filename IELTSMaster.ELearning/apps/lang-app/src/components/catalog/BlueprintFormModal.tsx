'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CatalogScope,
  CATALOG_CODE_MAX_LENGTH,
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
  normalizeCatalogCode,
  type ExamBlueprintItem,
  type CategoryItem,
  type ExamModuleInput,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { ModulesEditor, newModuleKey, type ModuleDraft } from './ModulesEditor';
import { ScopeBadge } from './catalog-ui';

const FORM_ID = 'exam-blueprint-form';

interface BlueprintForm {
  categoryId: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  modules: ModuleDraft[];
}

function emptyForm(): BlueprintForm {
  return {
    categoryId: '',
    code: '',
    name: '',
    description: '',
    isActive: true,
    modules: [
      {
        key: newModuleKey(),
        name: '',
        code: '',
        referenceDurationMinutes: 30,
        description: '',
      },
    ],
  };
}

interface BlueprintFormModalProps {
  open: boolean;
  /** `/admin` hoặc `/t/{slug}`. */
  apiBase: string;
  /** Phạm vi của trang; loại đề hệ thống chỉ chọn được danh mục hệ thống. */
  scope: CatalogScope;
  /** `null` là tạo mới. */
  blueprint: ExamBlueprintItem | null;
  /** Xem chi tiết (Teacher, mục hệ thống ở trang tenant). */
  readOnly: boolean;
  categories: CategoryItem[];
  onClose: () => void;
  onSaved: () => void;
}

export function BlueprintFormModal({
  open,
  apiBase,
  scope,
  blueprint,
  readOnly,
  categories,
  onClose,
  onSaved,
}: BlueprintFormModalProps) {
  const [form, setForm] = useState<BlueprintForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const common = vi.catalog;
  const text = common.blueprints;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      blueprint
        ? {
            categoryId: blueprint.category.id,
            code: blueprint.code,
            name: blueprint.name,
            description: blueprint.description ?? '',
            isActive: blueprint.isActive,
            modules: blueprint.modules.map((module) => ({
              key: module.id,
              id: module.id,
              name: module.name,
              code: module.code,
              referenceDurationMinutes: module.referenceDurationMinutes,
              description: module.description ?? '',
            })),
          }
        : emptyForm(),
    );
  }, [open, blueprint]);

  // Danh mục đang dùng; danh mục hiện tại của loại đề vẫn hiện dù đã ngừng dùng.
  const categoryGroups = useMemo(() => {
    const usable = categories.filter(
      (category) =>
        (category.isActive || category.id === blueprint?.category.id) &&
        (scope === CatalogScope.TENANT || category.scope === scope),
    );
    return Object.values(CatalogScope)
      .map((value) => ({
        scope: value,
        items: usable.filter((category) => category.scope === value),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, blueprint, scope]);

  const noCategory = !blueprint && categoryGroups.length === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const modules: ExamModuleInput[] = form.modules.map((module) => ({
      ...(module.id ? { id: module.id } : {}),
      name: module.name,
      code: normalizeCatalogCode(module.code),
      referenceDurationMinutes: module.referenceDurationMinutes,
      description: module.description,
    }));
    if (modules.length === 0) {
      setError(text.needModule);
      return;
    }
    const duplicate = modules.find(
      (module, index) =>
        modules.findIndex((other) => other.code === module.code) !== index,
    );
    if (duplicate) {
      setError(text.duplicateModuleCode(duplicate.code));
      return;
    }

    const body = {
      categoryId: form.categoryId,
      code: normalizeCatalogCode(form.code),
      name: form.name,
      description: form.description,
      isActive: form.isActive,
      modules,
    };
    setSaving(true);
    setError(null);
    try {
      if (blueprint) {
        await api.patch(`${apiBase}/exam-blueprints/${blueprint.id}`, body);
      } else {
        await api.post(`${apiBase}/exam-blueprints`, body);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, common.saveFailed));
    } finally {
      setSaving(false);
    }
  }

  const totalMinutes = form.modules.reduce(
    (sum, module) => sum + module.referenceDurationMinutes,
    0,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={readOnly ? text.detail : blueprint ? text.edit : text.create}
      widthClass="max-w-3xl"
      footer={
        readOnly ? (
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.close}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className={secondaryButtonClass}
            >
              {vi.common.cancel}
            </button>
            <button
              type="submit"
              form={FORM_ID}
              disabled={saving || noCategory}
              className={compactPrimaryButtonClass}
            >
              {saving ? vi.common.processing : vi.admin.save}
            </button>
          </>
        )
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        {/* fieldset disabled khoá mọi ô nhập khi chỉ xem. */}
        <fieldset
          disabled={readOnly}
          className="grid min-w-0 gap-4 sm:grid-cols-2"
        >
          {readOnly && blueprint && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <ScopeBadge scope={blueprint.scope} />
              <span className="text-[13px] text-[var(--muted)]">
                {common.readOnly}
              </span>
            </div>
          )}
          {noCategory && (
            <div className="sm:col-span-2">
              <FormAlert tone="warning">{text.noCategory}</FormAlert>
            </div>
          )}

          <label className={`${labelClass} sm:col-span-2`}>
            <span className={labelTextClass}>{text.category}</span>
            <select
              required
              value={form.categoryId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="" disabled>
                {text.chooseCategory}
              </option>
              {categoryGroups.map((group) => {
                const options = group.items.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.isActive
                      ? `${category.name} (${category.code})`
                      : text.inactiveCategory(category.name)}
                  </option>
                ));
                return scope === CatalogScope.TENANT ? (
                  <optgroup key={group.scope} label={common.scope[group.scope]}>
                    {options}
                  </optgroup>
                ) : (
                  options
                );
              })}
            </select>
          </label>

          <label className={labelClass}>
            <span className={labelTextClass}>{common.code}</span>
            <input
              required
              maxLength={CATALOG_CODE_MAX_LENGTH}
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
              className={`${inputClass} font-mono`}
            />
          </label>

          <label className={labelClass}>
            <span className={labelTextClass}>{common.name}</span>
            <input
              required
              maxLength={CATALOG_NAME_MAX_LENGTH}
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className={inputClass}
            />
          </label>

          {!readOnly && (
            <p className="-mt-2 text-[12.5px] text-[var(--muted)] sm:col-span-2">
              {common.codeHint}
            </p>
          )}

          <label className={`${labelClass} sm:col-span-2`}>
            <span className={labelTextClass}>{common.description}</span>
            <textarea
              rows={2}
              maxLength={CATALOG_DESCRIPTION_MAX_LENGTH}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className={labelTextClass}>
                {text.modules}
                <span className="ml-2 font-normal text-[var(--muted)]">
                  {text.moduleCount(form.modules.length, totalMinutes)}
                </span>
              </span>
              {!readOnly && (
                <span className="text-[12.5px] text-[var(--muted)]">
                  {text.modulesHint}
                </span>
              )}
            </div>
            <ModulesEditor
              modules={form.modules}
              readOnly={readOnly}
              onChange={(modules) =>
                setForm((current) => ({ ...current, modules }))
              }
            />
          </div>

          <label className="flex items-start gap-2.5 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              <span className={labelTextClass}>{common.active}</span>
              <span className="block text-[12.5px] text-[var(--muted)]">
                {text.activeHint}
              </span>
            </span>
          </label>

          {error && (
            <div className="sm:col-span-2">
              <FormAlert tone="error">{error}</FormAlert>
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
