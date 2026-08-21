'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approvePartnerApplicationAction,
  rejectPartnerApplicationAction,
  deletePartnerApplicationAction,
  reissuePartnerPasswordAction,
} from './actions';
import { PartnerApplicationEditForm } from './PartnerApplicationEditForm';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import type { PartnerApplicationRow } from '@/lib/supabase/partnerQueries';
import { displayPartnerLoginPhone } from '@/lib/partnerLogin';
import type { ProvinceOption } from './provinceOptions';

type PartnerApplicationsClientProps = {
  initialApplications: PartnerApplicationRow[];
  initialStatus: string;
  initialProvince: string;
  provinces: ProvinceOption[];
};

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function formatDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

function lineHref(lineId: string): string {
  return `https://line.me/ti/p/~${lineId.replace(/^@/, '')}`;
}

function facebookHref(fb: string): string {
  return fb.startsWith('http') ? fb : `https://${fb.replace(/^https?:\/\//, '')}`;
}

function mapsHref(app: PartnerApplicationRow): string | null {
  const explicit = app.google_maps_url?.trim();
  if (explicit) {
    return /^[a-zA-Z][a-zA-Z+\-.]*:\/\//.test(explicit) ? explicit : `https://${explicit}`;
  }
  if (app.lat != null && app.lng != null) {
    return `https://maps.google.com/?q=${app.lat},${app.lng}`;
  }
  if (app.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(app.address)}`;
  }
  return null;
}

function formatCategories(categories: string[] | null): string {
  if (!categories?.length) return '—';
  return categories.join(', ');
}

export function PartnerApplicationsClient({
  initialApplications,
  initialStatus,
  initialProvince,
  provinces,
}: PartnerApplicationsClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<PartnerApplicationRow | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reissuing, setReissuing] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const provinceNameByCode = new Map(provinces.map((p) => [p.code, p.nameEn]));

  function provinceLabel(code: string | null | undefined): string {
    if (!code) return '—';
    return provinceNameByCode.get(code) ?? code;
  }

  function openCreateDrawer() {
    setSelected(null);
    setDrawerMode('create');
    setTempPassword(null);
    setRejectNote('');
  }

  function openDrawer(app: PartnerApplicationRow) {
    setSelected(app);
    setDrawerMode('view');
    setTempPassword(null);
    setRejectNote('');
  }

  function closeDrawer() {
    setSelected(null);
    setDrawerMode('view');
  }

  function pushFilters(status: string, province: string) {
    const params = new URLSearchParams();
    params.set('status', status);
    if (province && province !== 'all') {
      params.set('province', province);
    }
    router.push(`/admin/partners/applications?${params.toString()}`);
  }

  function handleStatusTab(status: string) {
    pushFilters(status, initialProvince);
  }

  function handleProvinceFilter(province: string) {
    pushFilters(initialStatus, province);
  }

  async function handleApprove(app: PartnerApplicationRow) {
    setApproving(true);
    setTempPassword(null);
    const result = await approvePartnerApplicationAction(app.id);
    setApproving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (result.tempPassword) {
      setTempPassword(result.tempPassword);
      router.refresh();
    }
  }

  async function handleReject(app: PartnerApplicationRow) {
    setRejecting(true);
    const result = await rejectPartnerApplicationAction(app.id, rejectNote);
    setRejecting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    closeDrawer();
    router.refresh();
  }

  async function handleDelete(app: PartnerApplicationRow) {
    const msg = app.status === 'approved'
      ? 'Delete this partner? Their login will be removed and they will no longer access the partner portal. This cannot be undone.'
      : 'Delete this application? This cannot be undone.';
    if (!confirmDeleteAction(msg)) return;
    setDeleting(true);
    const result = await deletePartnerApplicationAction(app.id);
    setDeleting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    closeDrawer();
    router.refresh();
  }

  async function handleReissuePassword(app: PartnerApplicationRow) {
    if (!confirm('Generate a new password? The partner will need this to log in. Send it to them via LINE.')) return;
    setReissuing(true);
    setTempPassword(null);
    const result = await reissuePartnerPasswordAction(app.id);
    setReissuing(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (result.tempPassword) {
      setTempPassword(result.tempPassword);
      router.refresh();
    }
  }

  function handleEditSaved(updated: PartnerApplicationRow, extra?: { tempPassword?: string }) {
    setSelected(updated);
    setDrawerMode('view');
    if (extra?.tempPassword) {
      setTempPassword(extra.tempPassword);
    }
    router.refresh();
  }

  const selectedMapsUrl = selected ? mapsHref(selected) : null;

  return (
    <div className="admin-orders">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Partner Applications</h1>
          <p className="admin-hint">Review and manage vendor shop registrations from Supabase</p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateDrawer}
          >
            + Add partner
          </button>
        </div>
      </header>

      <div className="admin-partner-tabs" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
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
        <label
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
          }}
        >
          Province
          <select
            className="admin-partner-reject-input"
            value={initialProvince}
            onChange={(e) => handleProvinceFilter(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="all">All provinces</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.nameEn}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-partner-list">
        {initialApplications.length === 0 ? (
          <p className="admin-partner-empty">No applications</p>
        ) : (
          <table className="admin-partner-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Province</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>LINE</th>
                <th>Facebook</th>
                <th>Map</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {initialApplications.map((app) => {
                const mapUrl = mapsHref(app);
                return (
                  <tr key={app.id}>
                    <td>{app.shop_name ?? '—'}</td>
                    <td>{provinceLabel(app.province_code)}</td>
                    <td>{app.contact_name ?? '—'}</td>
                    <td>
                      {app.phone ? (
                        <a href={`tel:${app.phone}`} className="admin-partner-link-cell">
                          {app.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="admin-partner-link-col">
                      {app.line_id ? (
                        <a
                          href={lineHref(app.line_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-partner-link-cell"
                          title={app.line_id}
                        >
                          LINE
                        </a>
                      ) : '—'}
                    </td>
                    <td className="admin-partner-link-col">
                      {app.facebook ? (
                        <a
                          href={facebookHref(app.facebook)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-partner-link-cell"
                          title={app.facebook}
                        >
                          FB
                        </a>
                      ) : '—'}
                    </td>
                    <td className="admin-partner-link-col">
                      {mapUrl ? (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-partner-link-cell"
                          title="Open in Google Maps"
                        >
                          Map
                        </a>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`admin-partner-badge admin-partner-badge--${app.status ?? 'pending'}`}>
                        {app.status ?? 'pending'}
                      </span>
                    </td>
                    <td>{formatDate(app.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={() => openDrawer(app)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(selected || drawerMode === 'create') && (
        <div className="admin-partner-drawer-overlay" onClick={closeDrawer}>
          <div className="admin-partner-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-partner-drawer-header">
              <h2>
                {drawerMode === 'create'
                  ? 'Add partner'
                  : selected?.shop_name ?? 'Application'}
              </h2>
              <div className="admin-partner-drawer-header-actions">
                {drawerMode === 'view' && selected && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-sm"
                    onClick={() => setDrawerMode('edit')}
                  >
                    Edit
                  </button>
                )}
                <button type="button" className="admin-partner-drawer-close" onClick={closeDrawer}>
                  ×
                </button>
              </div>
            </div>
            <div className="admin-partner-drawer-body">
              {drawerMode === 'create' || (drawerMode === 'edit' && selected) ? (
                <PartnerApplicationEditForm
                  application={drawerMode === 'create' ? null : selected}
                  provinces={provinces}
                  onSaved={handleEditSaved}
                  onCancel={() => {
                    if (drawerMode === 'create') {
                      closeDrawer();
                      return;
                    }
                    setDrawerMode('view');
                  }}
                />
              ) : selected ? (
                <>
                  <dl className="admin-partner-detail">
                    <dt>Province</dt>
                    <dd>{provinceLabel(selected.province_code)}</dd>
                    <dt>Contact</dt>
                    <dd>{selected.contact_name ?? '—'}</dd>
                    <dt>Email</dt>
                    <dd>{selected.email ?? '—'}</dd>
                    <dt>Phone</dt>
                    <dd>
                      {selected.phone ? (
                        <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                      ) : '—'}
                    </dd>
                    <dt>LINE</dt>
                    <dd>
                      {selected.line_id ? (
                        <a href={lineHref(selected.line_id)} target="_blank" rel="noopener noreferrer">
                          {selected.line_id}
                        </a>
                      ) : '—'}
                    </dd>
                    {selected.instagram && (
                      <>
                        <dt>Instagram</dt>
                        <dd>
                          <a
                            href={
                              selected.instagram.startsWith('http')
                                ? selected.instagram
                                : `https://instagram.com/${selected.instagram.replace(/^@/, '')}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selected.instagram}
                          </a>
                        </dd>
                      </>
                    )}
                    {selected.facebook && (
                      <>
                        <dt>Facebook</dt>
                        <dd>
                          <a
                            href={facebookHref(selected.facebook)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selected.facebook}
                          </a>
                        </dd>
                      </>
                    )}
                    <dt>Address</dt>
                    <dd>{selected.address ?? '—'}</dd>
                    <dt>Google Maps</dt>
                    <dd>
                      {selectedMapsUrl ? (
                        <a href={selectedMapsUrl} target="_blank" rel="noopener noreferrer">
                          Open map
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                    <dt>District</dt>
                    <dd>{selected.district ?? '—'}</dd>
                    {(selected.lat != null || selected.lng != null) && (
                      <>
                        <dt>Coordinates</dt>
                        <dd>
                          {selected.lat != null && selected.lng != null
                            ? `${selected.lat}, ${selected.lng}`
                            : '—'}
                          {selectedMapsUrl && (
                            <>
                              {' '}
                              <a href={selectedMapsUrl} target="_blank" rel="noopener noreferrer">
                                (map)
                              </a>
                            </>
                          )}
                        </dd>
                      </>
                    )}
                    <dt>Categories</dt>
                    <dd>{formatCategories(selected.categories)}</dd>
                    <dt>Prep time</dt>
                    <dd>{selected.prep_time ?? '—'}</dd>
                    <dt>Order cutoff</dt>
                    <dd>{selected.cutoff_time ?? '—'}</dd>
                    <dt>Max orders / day</dt>
                    <dd>{selected.max_orders_per_day ?? '—'}</dd>
                    <dt>Self-deliver</dt>
                    <dd>{selected.self_deliver ? 'Yes' : 'No'}</dd>
                    {selected.delivery_zones && (
                      <>
                        <dt>Delivery zones</dt>
                        <dd>{selected.delivery_zones}</dd>
                      </>
                    )}
                    {selected.delivery_fee_note && (
                      <>
                        <dt>Delivery fee / policy</dt>
                        <dd>{selected.delivery_fee_note}</dd>
                      </>
                    )}
                    {selected.experience_note && (
                      <>
                        <dt>Experience</dt>
                        <dd>{selected.experience_note}</dd>
                      </>
                    )}
                    {selected.admin_note && (
                      <>
                        <dt>Admin note</dt>
                        <dd>{selected.admin_note}</dd>
                      </>
                    )}
                  </dl>
                  {selected.sample_photo_urls && selected.sample_photo_urls.length > 0 && (
                    <div className="admin-partner-samples">
                      <h4>Sample photos</h4>
                      <div className="admin-partner-samples-grid">
                        {selected.sample_photo_urls.map((url, i) => (
                          <img key={i} src={url} alt="" width={120} height={120} style={{ objectFit: 'cover', borderRadius: 8 }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {(tempPassword || (selected.status === 'approved' && selected.temp_password)) && (
                    <div className="admin-partner-temp-password">
                      <strong>Partner login</strong>
                      {selected.phone && (
                        <div>
                          Phone:{' '}
                          <code>{displayPartnerLoginPhone(selected.phone)}</code>
                        </div>
                      )}
                      <div>
                        Password:{' '}
                        <code>{tempPassword ?? selected.temp_password ?? ''}</code>
                      </div>
                      <span className="admin-partner-temp-password-hint">
                        Send the phone number and password to the partner via LINE
                      </span>
                    </div>
                  )}
                  {selected.status === 'pending' && (
                    <div className="admin-partner-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        disabled={approving}
                        onClick={() => handleApprove(selected)}
                      >
                        {approving ? 'Approving…' : 'Approve'}
                      </button>
                      <div className="admin-partner-reject">
                        <input
                          type="text"
                          placeholder="Rejection note (optional)"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          className="admin-partner-reject-input"
                        />
                        <button
                          type="button"
                          className="admin-btn admin-btn-outline"
                          disabled={rejecting}
                          onClick={() => handleReject(selected)}
                        >
                          {rejecting ? 'Rejecting…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="admin-partner-actions">
                    {selected.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline"
                        disabled={reissuing}
                        onClick={() => handleReissuePassword(selected)}
                      >
                        {reissuing ? 'Re-issuing…' : 'Re-issue password'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline"
                      disabled={deleting}
                      onClick={() => handleDelete(selected)}
                      style={{ color: '#c0392b', borderColor: '#c0392b' }}
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
