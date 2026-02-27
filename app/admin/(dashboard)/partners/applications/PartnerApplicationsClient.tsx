'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  approvePartnerApplicationAction,
  rejectPartnerApplicationAction,
} from './actions';
import type { PartnerApplicationRow } from '@/lib/supabase/partnerQueries';

type PartnerApplicationsClientProps = {
  initialApplications: PartnerApplicationRow[];
  initialStatus: string;
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

export function PartnerApplicationsClient({
  initialApplications,
  initialStatus,
}: PartnerApplicationsClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<PartnerApplicationRow | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  function handleStatusTab(status: string) {
    router.push(`/admin/partners/applications?status=${status}`);
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
    setSelected(null);
    setRejectNote('');
    router.refresh();
  }

  const mapsUrl = selected?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`
    : '';

  return (
    <div className="admin-v2-orders">
      <header className="admin-v2-header">
        <div>
          <h1 className="admin-v2-title">Partner Applications</h1>
          <p className="admin-v2-hint">Admin — Partner onboarding</p>
        </div>
        <div className="admin-v2-header-actions">
          <Link href="/admin" className="admin-v2-btn admin-v2-btn-outline">
            Back
          </Link>
          <a href="/api/auth/signout?callbackUrl=/admin/login" className="admin-v2-btn admin-v2-btn-outline">
            Log out
          </a>
        </div>
      </header>

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

      <div className="admin-partner-list">
        {initialApplications.length === 0 ? (
          <p className="admin-partner-empty">No applications</p>
        ) : (
          <table className="admin-partner-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {initialApplications.map((app) => (
                <tr key={app.id}>
                  <td>{app.shop_name ?? '—'}</td>
                  <td>{app.contact_name ?? '—'}</td>
                  <td>{app.email ?? '—'}</td>
                  <td>
                    <span className={`admin-partner-badge admin-partner-badge--${app.status ?? 'pending'}`}>
                      {app.status ?? 'pending'}
                    </span>
                  </td>
                  <td>{formatDate(app.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-v2-btn admin-v2-btn-outline admin-v2-btn-sm"
                      onClick={() => setSelected(app)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="admin-partner-drawer-overlay" onClick={() => setSelected(null)}>
          <div className="admin-partner-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-partner-drawer-header">
              <h2>{selected.shop_name ?? 'Application'}</h2>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="admin-partner-drawer-body">
              <dl className="admin-partner-detail">
                <dt>Contact</dt>
                <dd>{selected.contact_name ?? '—'}</dd>
                <dt>Email</dt>
                <dd>{selected.email ?? '—'}</dd>
                <dt>Phone</dt>
                <dd>{selected.phone ?? '—'}</dd>
                <dt>LINE</dt>
                <dd>
                  {selected.line_id ? (
                    <a href={`https://line.me/ti/p/~${selected.line_id.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">
                      {selected.line_id}
                    </a>
                  ) : '—'}
                </dd>
                <dt>Address</dt>
                <dd>
                  {selected.address ? (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      {selected.address}
                    </a>
                  ) : '—'}
                </dd>
                <dt>District</dt>
                <dd>{selected.district ?? '—'}</dd>
                <dt>Self-deliver</dt>
                <dd>{selected.self_deliver ? 'Yes' : 'No'}</dd>
                {selected.delivery_zones && (
                  <>
                    <dt>Delivery zones</dt>
                    <dd>{selected.delivery_zones}</dd>
                  </>
                )}
                {selected.experience_note && (
                  <>
                    <dt>Experience</dt>
                    <dd>{selected.experience_note}</dd>
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
              {tempPassword && (
                <div className="admin-partner-temp-password">
                  <strong>Temp password (send to partner):</strong> {tempPassword}
                </div>
              )}
              {selected.status === 'pending' && (
                <div className="admin-partner-actions">
                  <button
                    type="button"
                    className="admin-v2-btn admin-v2-btn-primary"
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
                      className="admin-v2-btn admin-v2-btn-outline"
                      disabled={rejecting}
                      onClick={() => handleReject(selected)}
                    >
                      {rejecting ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
