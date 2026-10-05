'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  CATALOG_CODE_MAX_LENGTH,
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
  CategoryColor,
  CategoryIconName,
  normalizeCatalogCode,
  type CategoryItem,
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
import { CATEGORY_COLOR_HEX, CATEGORY_ICONS, CategoryIcon } from './catalog-ui';

const FORM_ID = 'category-form';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  icon: DEFAULT_CATEGORY_ICON,
  color: DEFAULT_CATEGORY_COLOR,
  sortOrder: '0',
  isActive: true,
};

interface CategoryFormModalProps {
  open: boolean;
  /** `/admin` hoặc `/t/{slug}`. */
  apiBase: string;
  /** `null` là tạo mới. */
  category: CategoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryFormModal({
  open,
  apiBase,
  category,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const common = vi.catalog;
  const text = common.categories;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      category
        ? {
            code: category.code,
            name: category.name,
            description: category.description ?? '',
            icon: category.icon,
            color: category.color,
            sortOrder: String(category.sortOrder),
            isActive: category.isActive,
          }
        : emptyForm,
    );
  }, [open, category]);

  const update =
    (field: 'name' | 'description' | 'sortOrder') =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      code: normalizeCatalogCode(form.code),
      name: form.name,
      description: form.description,
      icon: form.icon,
      color: form.color,
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive,
    };
    setSaving(true);
    setError(null);
    try {
      if (category) {
        await api.patch(`${apiBase}/categories/${category.id}`, body);
      } else {
        await api.post(`${apiBase}/categories`, body);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, common.saveFailed));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? text.edit : text.create}
      widthClass="max-w-xl"
      footer={
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
            disabled={saving}
            className={compactPrimaryButtonClass}
          >
            {saving ? vi.common.processing : vi.admin.save}
          </button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
      >
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
            onChange={update('name')}
            className={inputClass}
          />
        </label>

        <p className="-mt-2 text-[12.5px] text-[var(--muted)] sm:col-span-2">
          {common.codeHint}
        </p>

        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>{common.description}</span>
          <textarea
            rows={2}
            maxLength={CATALOG_DESCRIPTION_MAX_LENGTH}
            value={form.description}
            onChange={update('description')}
            className={inputClass}
          />
        </label>

        <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
          <legend className={`${labelTextClass} mb-1.5`}>{text.icon}</legend>
          <div className="flex flex-wrap gap-2">
            {Object.values(CategoryIconName).map((icon) => {
              const Icon = CATEGORY_ICONS[icon];
              const selected = form.icon === icon;
              return (
                <button
                  key={icon}
                  type="button"
                  aria-label={icon}
                  aria-pressed={selected}
                  onClick={() => setForm((current) => ({ ...current, icon }))}
                  className={`grid h-10 w-10 place-items-center rounded-lg border transition ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--border-strong)] text-[var(--body)] hover:bg-[var(--hover)]'
                  }`}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
          <legend className={`${labelTextClass} mb-1.5`}>{text.color}</legend>
          <div className="flex flex-wrap items-center gap-2">
            {Object.values(CategoryColor).map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                aria-pressed={form.color === color}
                onClick={() => setForm((current) => ({ ...current, color }))}
                className="grid h-8 w-8 place-items-center rounded-full text-white ring-offset-2 ring-offset-[var(--card)] transition aria-pressed:ring-2 aria-pressed:ring-[var(--heading)]"
                style={{ backgroundColor: CATEGORY_COLOR_HEX[color] }}
              >
                {form.color === color && <Check size={16} />}
              </button>
            ))}
            <span className="ml-2 flex items-center gap-2 text-[13px] text-[var(--muted)]">
              <CategoryIcon icon={form.icon} color={form.color} />
              {form.name || common.name}
            </span>
          </div>
        </fieldset>

        <label className={labelClass}>
          <span className={labelTextClass}>{common.sortOrder}</span>
          <input
            type="number"
            min={0}
            max={10000}
            step={1}
            value={form.sortOrder}
            onChange={update('sortOrder')}
            className={inputClass}
          />
        </label>

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
      </form>
    </Modal>
  );
}
