'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ProductReview } from '@/lib/productReviews';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function ProductReviewModerationList({ reviews }: { reviews: ProductReview[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (reviews.length === 0) {
    return <p className="admin-empty">No product reviews yet.</p>;
  }

  async function patchStatus(id: string, status: 'approved' | 'rejected') {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/product-reviews/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Update failed');
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
  const others = reviews.filter((r) => r.status !== 'pending');

  return (
    <>
      {error ? (
        <p className="admin-costs-error" style={{ marginBottom: 12 }}>
          {error}
        </p>
      ) : null}
      {pending.length > 0 ? (
        <p className="admin-muted" style={{ margin: '0 0 12px' }}>
          {pending.length} waiting for approval
        </p>
      ) : (
        <p className="admin-muted" style={{ margin: '0 0 12px' }}>
          No pending product reviews.
        </p>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {[...pending, ...others].map((r) => {
          const busy = busyId === r.id;
          return (
            <li
              key={r.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <strong>{r.displayName}</strong>
                <span>{r.rating}/5</span>
                <span className="admin-muted">{formatDate(r.createdAt)}</span>
                <span className="admin-muted">{r.status}</span>
              </div>
              <p style={{ margin: '6px 0 8px', whiteSpace: 'pre-wrap' }}>{r.reviewText}</p>
              {r.status === 'pending' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="admin-cms-btn admin-cms-btn-primary"
                    disabled={busy}
                    onClick={() => patchStatus(r.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="admin-cms-btn"
                    disabled={busy}
                    onClick={() => patchStatus(r.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
