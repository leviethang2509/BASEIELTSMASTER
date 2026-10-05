'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  ADULT_AGE,
  TENANT_SLUG_MAX_LENGTH,
  isAdultOn,
  todayInTimeZone,
  validateTenantSlug,
  type OwnedTenant,
  type ServicePlanSummary,
} from '@lang/shared';
import { useAuth } from '@/components/auth/AuthProvider';
import { LogoPicker } from '@/components/media/LogoPicker';
import {
  FormAlert,
  SectionCard,
  inputClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatPrice } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export interface TenantFormValues {
  name: string;
  slug: string;
  planId: string;
  /** URL logo đã upload lên R2; `null` là dùng chữ cái đầu của tên. */
  logoUrl: string | null;
  description: string;
  email: string;
  phone: string;
  address: string;
}

const emptyForm: TenantFormValues = {
  name: '',
  slug: '',
  planId: '',
  logoUrl: null,
  description: '',
  email: '',
  phone: '',
  address: '',
};

type TenantFormProps =
  | { mode: 'create'; initialPlanId?: string }
  | {
      mode: 'resubmit';
      tenant: OwnedTenant;
    };

const text = vi.tenantForm;

// Đăng ký trung tâm (`POST /tenants`) và sửa & gửi lại khi bị từ chối (`PUT /tenants/:id`).
export function TenantForm(props: TenantFormProps) {
  const router = useRouter();
  const { user, reloadContexts } = useAuth();
  const resubmitting = props.mode === 'resubmit';
  const [form, setForm] = useState<TenantFormValues>(() =>
    props.mode === 'resubmit'
      ? {
          name: props.tenant.name,
          slug: props.tenant.slug,
          planId: props.tenant.plan.id,
          logoUrl: props.tenant.logoUrl,
          description: props.tenant.description ?? '',
          email: props.tenant.email ?? '',
          phone: props.tenant.phone ?? '',
          address: props.tenant.address ?? '',
        }
      : { ...emptyForm, planId: props.initialPlanId ?? '' },
  );
  // Gửi lại giữ slug cũ; đăng ký mới thì gợi ý theo tên cho tới khi người dùng tự sửa.
  const [slugTouched, setSlugTouched] = useState(resubmitting);
  const [plans, setPlans] = useState<ServicePlanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const debouncedName = useDebouncedValue(form.name.trim(), 400);

  useEffect(() => {
    let cancelled = false;
    api.get<ServicePlanSummary[]>('/public/plans').then(
      (result) => {
        if (cancelled) return;
        setPlans(result);
        // Gói trên URL hoặc gói cũ đã ngừng áp dụng thì chọn gói đầu tiên.
        setForm((current) =>
          result.some((plan) => plan.id === current.planId)
            ? current
            : { ...current, planId: result[0]?.id ?? '' },
        );
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slugTouched || !debouncedName) return;
    let cancelled = false;
    api
      .get<{
        slug: string;
      }>(`/tenants/slug-suggestion?name=${encodeURIComponent(debouncedName)}`)
      .then(
        ({ slug }) => {
          if (!cancelled) setForm((current) => ({ ...current, slug }));
        },
        () => {
          // Không gợi ý được thì để trống, API tự tạo khi gửi.
        },
      );
    return () => {
      cancelled = true;
    };
  }, [debouncedName, slugTouched]);

  if (!user) return null;
  const adult = isAdultOn(user.dateOfBirth, todayInTimeZone(user.timezone));
  const slugError = form.slug ? validateTenantSlug(form.slug) : null;

  const update =
    (field: keyof TenantFormValues) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (slugError || !form.planId) return;
    setSaving(true);
    setError(null);
    try {
      if (props.mode === 'resubmit') {
        await api.put<OwnedTenant>(`/tenants/${props.tenant.id}`, form);
      } else {
        await api.post<OwnedTenant>('/tenants', form);
      }
      await reloadContexts();
      router.push('/me');
    } catch (err) {
      setError(errorMessage(err, vi.account.saveFailed));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-10">
      <div>
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--body)] transition hover:text-[var(--accent)]"
        >
          <ArrowLeft size={16} /> {text.backToMe}
        </Link>
        <h1 className="mt-3 text-[28px] font-bold text-[var(--heading)]">
          {resubmitting ? text.resubmitTitle : text.createTitle}
        </h1>
        <p className="mt-1 text-[14.5px] text-[var(--body)]">
          {resubmitting ? text.resubmitSubtitle : text.createSubtitle}
        </p>
      </div>

      {props.mode === 'resubmit' && props.tenant.rejectionReason && (
        <FormAlert tone="error">
          <span className="font-semibold">{text.rejectionReason}:</span>{' '}
          {props.tenant.rejectionReason}
        </FormAlert>
      )}
      {!adult && <FormAlert tone="error">{text.underAge(ADULT_AGE)}</FormAlert>}

      <form onSubmit={handleSubmit}>
        <fieldset
          disabled={!adult || saving}
          className="flex min-w-0 flex-col gap-6"
        >
          <SectionCard title={text.infoSection}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`${labelClass} sm:col-span-2`}>
                <span className={labelTextClass}>
                  {text.logo}{' '}
                  <span className="font-normal text-[var(--muted)]">
                    {vi.common.optional}
                  </span>
                </span>
                <LogoPicker
                  value={form.logoUrl}
                  name={form.name}
                  onChange={(logoUrl) =>
                    setForm((current) => ({ ...current, logoUrl }))
                  }
                />
              </div>

              <label className={`${labelClass} sm:col-span-2`}>
                <span className={labelTextClass}>{text.name}</span>
                <input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={update('name')}
                  placeholder={text.namePlaceholder}
                  className={inputClass}
                />
              </label>

              <label className={`${labelClass} sm:col-span-2`}>
                <span className={labelTextClass}>{text.slug}</span>
                <span
                  className={`flex items-center rounded-xl border bg-[var(--sidebar)] transition focus-within:border-[var(--accent)] focus-within:bg-[var(--bg)] ${
                    slugError
                      ? 'border-[var(--danger)]'
                      : 'border-[var(--border-strong)]'
                  }`}
                >
                  <span className="pl-4 font-mono text-[14px] text-[var(--muted)]">
                    /t/
                  </span>
                  <input
                    value={form.slug}
                    maxLength={TENANT_SLUG_MAX_LENGTH}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={slugError !== null}
                    onChange={(event) => {
                      setSlugTouched(true);
                      const slug = event.target.value.toLowerCase();
                      setForm((current) => ({ ...current, slug }));
                    }}
                    className="min-w-0 flex-1 bg-transparent py-3 pl-0.5 pr-4 font-mono text-[15px] text-[var(--heading)] outline-none"
                  />
                </span>
                <span
                  className={`text-[12.5px] ${
                    slugError ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {slugError ? text.slugErrors[slugError] : text.slugHint}
                </span>
              </label>

              <label className={`${labelClass} sm:col-span-2`}>
                <span className={labelTextClass}>
                  {text.description}{' '}
                  <span className="font-normal text-[var(--muted)]">
                    {vi.common.optional}
                  </span>
                </span>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={form.description}
                  onChange={update('description')}
                  placeholder={text.descriptionPlaceholder}
                  className={`${inputClass} resize-y`}
                />
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>
                  {text.email}{' '}
                  <span className="font-normal text-[var(--muted)]">
                    {vi.common.optional}
                  </span>
                </span>
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={update('email')}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>
                  {text.phone}{' '}
                  <span className="font-normal text-[var(--muted)]">
                    {vi.common.optional}
                  </span>
                </span>
                <input
                  type="tel"
                  maxLength={30}
                  value={form.phone}
                  onChange={update('phone')}
                  className={inputClass}
                />
              </label>

              <label className={`${labelClass} sm:col-span-2`}>
                <span className={labelTextClass}>
                  {text.address}{' '}
                  <span className="font-normal text-[var(--muted)]">
                    {vi.common.optional}
                  </span>
                </span>
                <input
                  maxLength={500}
                  value={form.address}
                  onChange={update('address')}
                  className={inputClass}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard title={text.planSection} description={text.planHint}>
            {!plans ? (
              <p className="text-[14px] text-[var(--muted)]">
                {vi.common.loading}
              </p>
            ) : plans.length === 0 ? (
              <p className="text-[14px] text-[var(--muted)]">{text.noPlans}</p>
            ) : (
              <div
                role="radiogroup"
                aria-label={text.planSection}
                className="grid gap-3 sm:grid-cols-3"
              >
                {plans.map((plan) => {
                  const checked = plan.id === form.planId;
                  return (
                    <label
                      key={plan.id}
                      className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 transition ${
                        checked
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-strong)] hover:bg-[var(--hover)]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="planId"
                          value={plan.id}
                          checked={checked}
                          onChange={update('planId')}
                          className="h-4 w-4 accent-[var(--accent)]"
                        />
                        <span className="text-[15px] font-semibold text-[var(--heading)]">
                          {plan.name}
                        </span>
                      </span>
                      <span className="text-[13.5px] text-[var(--body)]">
                        {text.maxMembers(plan.maxMembers)}
                      </span>
                      <span className="font-mono text-[13px] text-[var(--muted)]">
                        {plan.price === null
                          ? text.priceContact
                          : formatPrice(plan.price)}
                      </span>
                      {plan.description && (
                        <span className="whitespace-pre-line text-[12.5px] text-[var(--muted)]">
                          {plan.description}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {error && <FormAlert tone="error">{error}</FormAlert>}

          <div>
            <button
              type="submit"
              disabled={slugError !== null || !form.planId}
              className={primaryButtonClass}
            >
              {saving
                ? vi.common.processing
                : resubmitting
                  ? text.resubmit
                  : text.submit}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
