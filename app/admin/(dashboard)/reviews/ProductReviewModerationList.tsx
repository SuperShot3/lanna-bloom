'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminProductReview } from '@/lib/productReviews';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

function statusBadge(status: AdminProductReview['status']) {
  const colors: Record<string, string> = {
    pending: '#b45309',
    approved: '#15803d',
    rejected: '#6b7280',
    pending_email: '#6b7280',
  };
  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: colors[status] ?? '#6b7280',
      }}
    >
      {status}
    </span>
  );
}

export function ProductReviewModerationList({ reviews }: { reviews: AdminProductReview[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (reviews.length === 0) {
    return <p className="admin-empty">No product reviews yet.</p>;
  }

  async function mutate(
    id: string,
    method: 'PATCH' | 'DELETE',
    body?: Record<string, string>
  ) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/product-reviews/${encodeURIComponent(id)}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Action failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  const pending = reviews.filter((r) => r.status === 'pending');
  const other = reviews.filter((r) => r.status !== 'pending');

  function renderItem(r: AdminProductReview) {
    const busy = busyId === r.id;
    const bouquetLabel = r.bouquetName
      ? r.bouquetSlug
        ? `${r.bouquetName} (${r.bouquetSlug})`
        : r.bouquetName
      : r.bouquetId;
    return (
      <li
        key={r.id}
        style={{
          padding: '14px 0',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 6,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong>{r.displayName}</strong>
              <span>{r.rating}/5</span>
              {statusBadge(r.status)}
              {r.verifiedPurchase ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>
                  Verified purchase
                </span>
              ) : null}
              <span className="admin-muted">{formatDate(r.createdAt)}</span>
            </div>
            <p className="admin-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              Bouquet: {bouquetLabel}
              {r.authorEmail ? ` · ${r.authorEmail}` : ''}
              {r.locale ? ` · ${r.locale.toUpperCase()}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {r.status !== 'approved' && (
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                disabled={busy}
                onClick={() => mutate(r.id, 'PATCH', { status: 'approved' })}
              >
                {busy ? '…' : 'Approve'}
              </button>
            )}
            {r.status !== 'rejected' && (
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                disabled={busy}
                onClick={() => mutate(r.id, 'PATCH', { status: 'rejected' })}
              >
                {busy ? '…' : 'Reject'}
              </button>
            )}
            <button
              type="button"
              className="admin-btn admin-btn-danger admin-btn-sm"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Delete this product review permanently?')) return;
                mutate(r.id, 'DELETE');
              }}
            >
              {busy ? '…' : 'Delete'}
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{r.reviewText}</p>
      </li>
    );
  }

  return (
    <>
      {error ? (
        <p className="admin-costs-error" style={{ marginBottom: 12 }}>
          {error}
        </p>
      ) : null}
      {pending.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 className="admin-section-title">Pending ({pending.length})</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{pending.map(renderItem)}</ul>
        </section>
      )}
      <section>
        <h3 className="admin-section-title">
          {pending.length > 0 ? `All other (${other.length})` : `All reviews (${reviews.length})`}
        </h3>
        {pending.length === 0 && other.length === 0 ? (
          <p className="admin-muted">No pending product reviews.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {(pending.length > 0 ? other : reviews).map(renderItem)}
          </ul>
        )}
      </section>
    </>
  );
}
