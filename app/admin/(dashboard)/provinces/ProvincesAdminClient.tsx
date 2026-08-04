'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { ProvinceRow, ProvinceStatus } from '@/lib/provinces/types';
import { PROVINCE_STATUSES, SEO_PAGE_STATUSES } from '@/lib/provinces/types';
import {
  getProvinceStatusFillColor,
  getProvinceStatusLabel,
} from '@/lib/provinces/statusColors';

const ThailandProvinceMap = dynamic(
  () =>
    import('@/components/delivery/ThailandProvinceMap').then((m) => m.ThailandProvinceMap),
  {
    ssr: false,
    loading: () => (
      <div className="admin-hint" style={{ padding: 24 }}>
        Loading map…
      </div>
    ),
  }
);

type Props = {
  initialProvinces: ProvinceRow[];
  initialStatus: string;
  initialSelectedCode: string | null;
  loadError: string | null;
};

type ViewMode = 'list' | 'map';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  ...PROVINCE_STATUSES.map((s) => ({ value: s, label: getProvinceStatusLabel(s) })),
];

export function ProvincesAdminClient({
  initialProvinces,
  initialStatus,
  initialSelectedCode,
  loadError,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('list');
  const [provinces, setProvinces] = useState(initialProvinces);
  const [selectedCode, setSelectedCode] = useState<string | null>(initialSelectedCode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const selected = useMemo(
    () => provinces.find((p) => p.province_code === selectedCode) ?? null,
    [provinces, selectedCode]
  );

  const filteredProvinces = useMemo(() => {
    if (!initialStatus || initialStatus === 'all') return provinces;
    return provinces.filter((p) => p.status === initialStatus);
  }, [provinces, initialStatus]);

  function handleStatusTab(status: string) {
    router.push(`/admin/provinces?status=${encodeURIComponent(status)}`);
  }

  function selectProvince(code: string) {
    const next = code || null;
    setSelectedCode(next);
    setError(null);
    setSuccess(null);
    const params = new URLSearchParams();
    if (initialStatus && initialStatus !== 'all') params.set('status', initialStatus);
    if (next) params.set('code', next);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/admin/provinces?${qs}` : '/admin/provinces', { scroll: false });
    });
  }

  async function saveProvince(form: HTMLFormElement) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const fd = new FormData(form);
    const status = String(fd.get('status') ?? selected.status) as ProvinceStatus;
    const catalogEnabled = fd.get('catalog_enabled') === 'on';
    const minRaw = String(fd.get('min_advance_notice_hours') ?? '').trim();
    const cutoffRaw = String(fd.get('same_day_cutoff_local') ?? '').trim();
    const categoriesRaw = String(fd.get('available_categories') ?? '').trim();

    const body: Record<string, unknown> = {
      status,
      catalog_enabled: catalogEnabled,
      min_advance_notice_hours: minRaw === '' ? null : Number(minRaw),
      same_day_cutoff_local: status === 'same_day' ? cutoffRaw || null : null,
      customer_message_en: String(fd.get('customer_message_en') ?? '') || null,
      customer_message_th: String(fd.get('customer_message_th') ?? '') || null,
      delivery_limitations_en: String(fd.get('delivery_limitations_en') ?? '') || null,
      delivery_limitations_th: String(fd.get('delivery_limitations_th') ?? '') || null,
      available_categories: categoriesRaw
        ? categoriesRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
      seo_page_status: String(fd.get('seo_page_status') ?? selected.seo_page_status),
      internal_notes: String(fd.get('internal_notes') ?? '') || null,
    };

    try {
      const res = await fetch(`/api/admin/provinces/${encodeURIComponent(selected.province_code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as
        | { province?: ProvinceRow; error?: string }
        | null;
      if (!res.ok) {
        setError(data?.error || 'Failed to save');
        setSaving(false);
        return;
      }
      if (data?.province) {
        setProvinces((prev) =>
          prev.map((p) => (p.province_code === data.province!.province_code ? data.province! : p))
        );
        setSuccess('Saved');
        router.refresh();
      }
    } catch {
      setError('Network error');
    }
    setSaving(false);
  }

  return (
    <div className="admin-orders">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Provinces</h1>
          <p className="admin-hint">
            Configure delivery status and customer messaging for Thailand. Checkout/zones are
            unchanged until a province is wired in code.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`admin-btn admin-btn-sm ${view === 'list' ? '' : 'admin-btn-outline'}`}
            onClick={() => setView('list')}
          >
            List
          </button>
          <button
            type="button"
            className={`admin-btn admin-btn-sm ${view === 'map' ? '' : 'admin-btn-outline'}`}
            onClick={() => setView('map')}
          >
            Map
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="admin-hint" style={{ color: '#a65d57' }}>
          Could not load provinces: {loadError}. Apply migration{' '}
          <code>20260803120000_provinces.sql</code> if the table is missing.
        </p>
      ) : null}

      <div className="admin-partner-tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`admin-partner-tab ${initialStatus === t.value ? 'active' : ''}`}
            onClick={() => handleStatusTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selected ? 'minmax(0, 1fr) minmax(280px, 380px)' : '1fr',
          gap: 16,
          alignItems: 'start',
        }}
        className="admin-provinces-layout"
      >
        <div>
          {view === 'map' ? (
            <ThailandProvinceMap
              mode="admin"
              provinces={provinces}
              selectedCode={selectedCode}
              onSelectProvince={selectProvince}
            />
          ) : (
            <div className="admin-partner-list">
              {filteredProvinces.length === 0 ? (
                <p className="admin-partner-empty">No provinces</p>
              ) : (
                <table className="admin-partner-table">
                  <thead>
                    <tr>
                      <th>Province</th>
                      <th>Status</th>
                      <th>Catalog</th>
                      <th>Destination</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProvinces.map((p) => (
                      <tr
                        key={p.province_code}
                        style={
                          p.province_code === selectedCode
                            ? { background: 'rgba(197, 160, 89, 0.12)' }
                            : undefined
                        }
                      >
                        <td>
                          <strong>{p.province_name_en}</strong>
                          <div className="admin-hint" style={{ margin: 0 }}>
                            {p.province_name_th} · {p.province_code}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '0.85rem',
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: getProvinceStatusFillColor(p.status),
                              }}
                            />
                            {getProvinceStatusLabel(p.status)}
                          </span>
                        </td>
                        <td>{p.catalog_enabled ? 'On' : 'Off'}</td>
                        <td>
                          {p.destination_id ? (
                            <code>{p.destination_id}</code>
                          ) : (
                            <span className="admin-hint">Not wired</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-outline"
                            onClick={() => selectProvince(p.province_code)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {selected ? (
          <aside
            style={{
              position: 'sticky',
              top: 12,
              background: 'var(--admin-surface, #fff)',
              border: '1px solid var(--border, #e5e2da)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>
                  {selected.province_name_en}
                </h2>
                <p className="admin-hint" style={{ margin: 0 }}>
                  {selected.province_name_th}
                </p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-outline"
                onClick={() => selectProvince('')}
              >
                Close
              </button>
            </div>

            <p className="admin-hint" style={{ marginTop: 10 }}>
              Destination wiring:{' '}
              {selected.destination_id ? (
                <>
                  <code>{selected.destination_id}</code> (read-only — code change required to
                  alter)
                </>
              ) : (
                'none — not available for checkout yet'
              )}
            </p>

            <form
              key={selected.province_code + selected.updated_at}
              onSubmit={(e) => {
                e.preventDefault();
                void saveProvince(e.currentTarget);
              }}
              style={{ display: 'grid', gap: 12, marginTop: 14 }}
            >
              <label className="admin-field">
                <span>Status</span>
                <select name="status" defaultValue={selected.status} className="admin-input">
                  {PROVINCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {getProvinceStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  name="catalog_enabled"
                  defaultChecked={selected.catalog_enabled}
                />
                <span>Catalog enabled</span>
              </label>
              <p className="admin-hint" style={{ margin: 0 }}>
                Cannot enable catalog while status is Coming Soon.
              </p>

              <label className="admin-field">
                <span>Min advance notice (hours)</span>
                <input
                  className="admin-input"
                  name="min_advance_notice_hours"
                  type="number"
                  min={0}
                  max={336}
                  defaultValue={selected.min_advance_notice_hours ?? ''}
                  placeholder="optional"
                />
              </label>

              <label className="admin-field">
                <span>Same-day cutoff (HH:MM, Bangkok)</span>
                <input
                  className="admin-input"
                  name="same_day_cutoff_local"
                  type="text"
                  pattern="([01]\d|2[0-3]):[0-5]\d"
                  placeholder="e.g. 14:00"
                  defaultValue={selected.same_day_cutoff_local ?? ''}
                />
              </label>
              <p className="admin-hint" style={{ margin: 0 }}>
                Only stored when status is Same-Day. Enforced at checkout with province delivery rules.
              </p>

              <label className="admin-field">
                <span>Customer message (EN)</span>
                <textarea
                  className="admin-input"
                  name="customer_message_en"
                  rows={3}
                  defaultValue={selected.customer_message_en ?? ''}
                />
              </label>

              <label className="admin-field">
                <span>Customer message (TH)</span>
                <textarea
                  className="admin-input"
                  name="customer_message_th"
                  rows={3}
                  defaultValue={selected.customer_message_th ?? ''}
                />
              </label>

              <label className="admin-field">
                <span>Delivery limitations (EN)</span>
                <textarea
                  className="admin-input"
                  name="delivery_limitations_en"
                  rows={2}
                  defaultValue={selected.delivery_limitations_en ?? ''}
                />
              </label>

              <label className="admin-field">
                <span>Delivery limitations (TH)</span>
                <textarea
                  className="admin-input"
                  name="delivery_limitations_th"
                  rows={2}
                  defaultValue={selected.delivery_limitations_th ?? ''}
                />
              </label>

              <label className="admin-field">
                <span>Available categories (comma-separated)</span>
                <input
                  className="admin-input"
                  name="available_categories"
                  defaultValue={(selected.available_categories ?? []).join(', ')}
                  placeholder="flowers, gifts"
                />
              </label>

              <label className="admin-field">
                <span>SEO page status</span>
                <select
                  name="seo_page_status"
                  defaultValue={selected.seo_page_status}
                  className="admin-input"
                >
                  {SEO_PAGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Internal notes</span>
                <textarea
                  className="admin-input"
                  name="internal_notes"
                  rows={3}
                  defaultValue={selected.internal_notes ?? ''}
                />
              </label>

              {error ? (
                <p style={{ color: '#a65d57', margin: 0, fontSize: '0.9rem' }}>{error}</p>
              ) : null}
              {success ? (
                <p style={{ color: '#2f6f5e', margin: 0, fontSize: '0.9rem' }}>{success}</p>
              ) : null}

              <button type="submit" className="admin-btn" disabled={saving}>
                {saving ? 'Saving…' : 'Save province'}
              </button>
            </form>
          </aside>
        ) : null}
      </div>

      <style jsx>{`
        .admin-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text, #1a3c34);
        }
        @media (max-width: 900px) {
          :global(.admin-provinces-layout) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
