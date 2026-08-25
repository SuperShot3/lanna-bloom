'use client';

import { useState } from 'react';
import {
  createPartnerApplicationAction,
  updatePartnerApplicationFieldsAction,
  type PartnerApplicationFieldsPayload,
} from './actions';
import { CATEGORY_OPTIONS, PREP_TIME_OPTIONS } from '@/lib/partnerPortal';
import type { PartnerApplicationRow } from '@/lib/supabase/partnerQueries';
import type { ProvinceOption } from './provinceOptions';

type PartnerApplicationEditFormProps = {
  application?: PartnerApplicationRow | null;
  provinces: ProvinceOption[];
  onSaved: (updated: PartnerApplicationRow, extra?: { tempPassword?: string }) => void;
  onCancel: () => void;
};

function emptyPayload(): PartnerApplicationFieldsPayload {
  return {
    shop_name: '',
    contact_name: '',
    email: '',
    phone: '',
    line_id: '',
    instagram: '',
    facebook: '',
    address: '',
    google_maps_url: '',
    district: '',
    province_code: '',
    lat: '',
    lng: '',
    self_deliver: false,
    delivery_zones: '',
    delivery_fee_note: '',
    categories: '',
    prep_time: '',
    cutoff_time: '',
    max_orders_per_day: '',
    sample_photo_urls: '',
    experience_note: '',
    admin_note: '',
  };
}

function rowToPayload(app: PartnerApplicationRow): PartnerApplicationFieldsPayload {
  return {
    shop_name: app.shop_name ?? '',
    contact_name: app.contact_name ?? '',
    email: app.email ?? '',
    phone: app.phone ?? '',
    line_id: app.line_id ?? '',
    instagram: app.instagram ?? '',
    facebook: app.facebook ?? '',
    address: app.address ?? '',
    google_maps_url: app.google_maps_url ?? '',
    district: app.district ?? '',
    province_code: app.province_code ?? '',
    lat: app.lat != null ? String(app.lat) : '',
    lng: app.lng != null ? String(app.lng) : '',
    self_deliver: app.self_deliver === true,
    delivery_zones: app.delivery_zones ?? '',
    delivery_fee_note: app.delivery_fee_note ?? '',
    categories: (app.categories ?? []).join(', '),
    prep_time: app.prep_time ?? '',
    cutoff_time: app.cutoff_time ?? '',
    max_orders_per_day: app.max_orders_per_day != null ? String(app.max_orders_per_day) : '',
    sample_photo_urls: (app.sample_photo_urls ?? []).join('\n'),
    experience_note: app.experience_note ?? '',
    admin_note: app.admin_note ?? '',
  };
}

function payloadToRow(
  app: PartnerApplicationRow,
  fields: PartnerApplicationFieldsPayload
): PartnerApplicationRow {
  const parseCategories = (raw: string) =>
    raw
      .split(/[,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  const parseUrls = (raw: string) =>
    raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.startsWith('http://') || s.startsWith('https://'));
  const parseNum = (raw: string) => {
    const t = raw.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  return {
    ...app,
    shop_name: fields.shop_name.trim() || null,
    contact_name: fields.contact_name.trim() || null,
    email: fields.email.trim() || null,
    phone: fields.phone.trim() || null,
    line_id: fields.line_id.trim() || null,
    instagram: fields.instagram.trim() || null,
    facebook: fields.facebook.trim() || null,
    address: fields.address.trim() || null,
    google_maps_url: fields.google_maps_url.trim() || null,
    district: fields.district.trim() || null,
    province_code: fields.province_code.trim() || null,
    lat: parseNum(fields.lat),
    lng: parseNum(fields.lng),
    self_deliver: fields.self_deliver,
    delivery_zones: fields.delivery_zones.trim() || null,
    delivery_fee_note: fields.delivery_fee_note.trim() || null,
    categories: parseCategories(fields.categories),
    prep_time: fields.prep_time.trim() || null,
    cutoff_time: fields.cutoff_time.trim() || null,
    max_orders_per_day: parseNum(fields.max_orders_per_day),
    sample_photo_urls: parseUrls(fields.sample_photo_urls),
    experience_note: fields.experience_note.trim() || null,
    admin_note: fields.admin_note.trim() || null,
  };
}

export function PartnerApplicationEditForm({
  application,
  provinces,
  onSaved,
  onCancel,
}: PartnerApplicationEditFormProps) {
  const isCreate = !application;
  const [fields, setFields] = useState<PartnerApplicationFieldsPayload>(() =>
    application ? rowToPayload(application) : emptyPayload()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approveImmediately, setApproveImmediately] = useState(true);

  function updateField<K extends keyof PartnerApplicationFieldsPayload>(
    key: K,
    value: PartnerApplicationFieldsPayload[K]
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!application) {
      const result = await createPartnerApplicationAction(fields, { approveImmediately });
      setSaving(false);
      if (result.error && !result.application) {
        setError(result.error);
        return;
      }
      if (result.application) {
        if (result.error) {
          alert(result.error);
        }
        onSaved(result.application, { tempPassword: result.tempPassword });
      }
      return;
    }

    const result = await updatePartnerApplicationFieldsAction(application.id, fields);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved(payloadToRow(application, fields));
  }

  return (
    <form className="admin-partner-edit-form" onSubmit={handleSubmit}>
      {error && (
        <p className="admin-partner-edit-error" role="alert">
          {error}
        </p>
      )}

      <fieldset className="admin-partner-edit-section">
        <legend>Contact</legend>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          <span className="admin-partner-edit-label">
            Shop name <span aria-hidden="true">*</span>
          </span>
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.shop_name}
            onChange={(e) => updateField('shop_name', e.target.value)}
            required
          />
        </label>
        <label className="admin-partner-edit-field">
          <span className="admin-partner-edit-label">
            Contact name <span aria-hidden="true">*</span>
          </span>
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.contact_name}
            onChange={(e) => updateField('contact_name', e.target.value)}
            required
          />
        </label>
        <label className="admin-partner-edit-field">
          <span className="admin-partner-edit-label">
            Phone <span aria-hidden="true">*</span>
          </span>
          <input
            type="tel"
            className="admin-partner-edit-input"
            value={fields.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            required
          />
          <span className="admin-partner-edit-hint">Used as the partner login</span>
        </label>
        <label className="admin-partner-edit-field">
          Email
          <input
            type="email"
            className="admin-partner-edit-input"
            value={fields.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="admin-partner-edit-field">
          LINE ID
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.line_id}
            onChange={(e) => updateField('line_id', e.target.value)}
          />
        </label>
        <label className="admin-partner-edit-field">
          Instagram
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.instagram}
            onChange={(e) => updateField('instagram', e.target.value)}
            placeholder="@handle or full URL"
          />
        </label>
        <label className="admin-partner-edit-field">
          Facebook
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.facebook}
            onChange={(e) => updateField('facebook', e.target.value)}
            placeholder="Page URL or name"
          />
        </label>
      </fieldset>

      <fieldset className="admin-partner-edit-section">
        <legend>Location</legend>
        <label className="admin-partner-edit-field">
          <span className="admin-partner-edit-label">
            Province {isCreate && <span aria-hidden="true">*</span>}
          </span>
          <select
            className="admin-partner-edit-input"
            value={fields.province_code}
            onChange={(e) => updateField('province_code', e.target.value)}
            required={isCreate}
          >
            <option value="">—</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-partner-edit-field">
          District / sub-location
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.district}
            onChange={(e) => updateField('district', e.target.value)}
            placeholder="e.g. Nimman"
          />
        </label>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          Address
          <textarea
            className="admin-partner-edit-input"
            rows={2}
            value={fields.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Street address"
          />
        </label>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          Google Maps link
          <input
            type="url"
            className="admin-partner-edit-input"
            value={fields.google_maps_url}
            onChange={(e) => updateField('google_maps_url', e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
          />
          <span className="admin-partner-edit-hint">Paste the share link from Google Maps</span>
        </label>
        <label className="admin-partner-edit-field">
          Latitude
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.lat}
            onChange={(e) => updateField('lat', e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="admin-partner-edit-field">
          Longitude
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.lng}
            onChange={(e) => updateField('lng', e.target.value)}
            placeholder="Optional"
          />
        </label>
      </fieldset>

      <fieldset className="admin-partner-edit-section">
        <legend>Delivery</legend>
        <label className="admin-partner-edit-checkbox">
          <input
            type="checkbox"
            checked={fields.self_deliver}
            onChange={(e) => updateField('self_deliver', e.target.checked)}
          />
          Partner self-delivers
        </label>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          Delivery zones
          <textarea
            className="admin-partner-edit-input"
            rows={2}
            value={fields.delivery_zones}
            onChange={(e) => updateField('delivery_zones', e.target.value)}
          />
        </label>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          Delivery fee / policy note
          <textarea
            className="admin-partner-edit-input"
            rows={2}
            value={fields.delivery_fee_note}
            onChange={(e) => updateField('delivery_fee_note', e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset className="admin-partner-edit-section">
        <legend>Capacity</legend>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          Categories
          <input
            type="text"
            className="admin-partner-edit-input"
            value={fields.categories}
            onChange={(e) => updateField('categories', e.target.value)}
            placeholder={CATEGORY_OPTIONS.map((c) => c.value).join(', ')}
          />
          <span className="admin-partner-edit-hint">Comma-separated values (e.g. flowers, gifts)</span>
        </label>
        <div className="admin-partner-edit-row-3">
          <label className="admin-partner-edit-field">
            Prep time
            <select
              className="admin-partner-edit-input"
              value={fields.prep_time}
              onChange={(e) => updateField('prep_time', e.target.value)}
            >
              <option value="">—</option>
              {PREP_TIME_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.labelEn}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-partner-edit-field">
            Order cutoff time
            <input
              type="text"
              className="admin-partner-edit-input"
              value={fields.cutoff_time}
              onChange={(e) => updateField('cutoff_time', e.target.value)}
              placeholder="e.g. 14:00"
            />
          </label>
          <label className="admin-partner-edit-field">
            Max orders / day
            <input
              type="number"
              min={0}
              className="admin-partner-edit-input"
              value={fields.max_orders_per_day}
              onChange={(e) => updateField('max_orders_per_day', e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="admin-partner-edit-section">
        <legend>Notes &amp; samples</legend>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          Experience note
          <textarea
            className="admin-partner-edit-input"
            rows={3}
            value={fields.experience_note}
            onChange={(e) => updateField('experience_note', e.target.value)}
          />
        </label>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          Admin note
          <textarea
            className="admin-partner-edit-input"
            rows={2}
            value={fields.admin_note}
            onChange={(e) => updateField('admin_note', e.target.value)}
          />
        </label>
        <label className="admin-partner-edit-field admin-partner-edit-field--full">
          Sample photo URLs
          <textarea
            className="admin-partner-edit-input"
            rows={4}
            value={fields.sample_photo_urls}
            onChange={(e) => updateField('sample_photo_urls', e.target.value)}
            placeholder="One URL per line or comma-separated"
          />
        </label>
      </fieldset>

      {isCreate && (
        <label className="admin-partner-edit-checkbox">
          <input
            type="checkbox"
            checked={approveImmediately}
            onChange={(e) => setApproveImmediately(e.target.checked)}
          />
          <span>
            Approve immediately (create login and catalog partner)
            {approveImmediately && (
              <span className="admin-partner-edit-hint" style={{ display: 'block', marginTop: 4 }}>
                Phone is the login. Email is optional.
              </span>
            )}
          </span>
        </label>
      )}

      <div className="admin-partner-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          {saving
            ? isCreate
              ? approveImmediately
                ? 'Adding…'
                : 'Saving…'
              : 'Saving…'
            : isCreate
              ? approveImmediately
                ? 'Add and approve'
                : 'Save as pending'
              : 'Save changes'}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
