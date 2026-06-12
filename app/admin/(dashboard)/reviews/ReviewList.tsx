'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Review } from '@/lib/reviews';

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

/** DB rows use UUID ids; static entries in reviews.json use short ids (e.g. r1). */
function isDeletableReviewId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (reviews.length === 0) {
    return <p className="admin-empty">No reviews yet. Add one above.</p>;
  }

  async function handleDelete(id: string) {
    if (!isDeletableReviewId(id)) return;
    if (!window.confirm('Delete this review? This cannot be undone.')) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Delete failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Something went wrong.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {error && (
        <p className="admin-costs-error" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {reviews.slice(0, 20).map((r) => {
          const canDelete = isDeletableReviewId(r.id);
          return (
            <li
              key={r.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 4,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{r.name}</strong>
                  <span style={{ color: 'var(--accent)' }}>{'★'.repeat(r.rating)}</span>
                  <span className="admin-muted">{formatDate(r.date)}</span>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    disabled={deletingId === r.id}
                    onClick={() => handleDelete(r.id)}
                    aria-label={`Delete review from ${r.name}`}
                  >
                    {deletingId === r.id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {r.text.length > 120 ? `${r.text.slice(0, 120)}...` : r.text}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
