'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminGuideComment } from '@/lib/info/guideComments/read';

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

function statusBadge(status: AdminGuideComment['status']) {
  const colors: Record<AdminGuideComment['status'], string> = {
    pending: '#b45309',
    approved: '#15803d',
    hidden: '#6b7280',
  };
  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: colors[status],
      }}
    >
      {status}
    </span>
  );
}

export function InfoCommentModerationList({ comments }: { comments: AdminGuideComment[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (comments.length === 0) {
    return <p className="admin-empty">No guide comments yet.</p>;
  }

  async function mutate(
    id: string,
    method: 'PATCH' | 'DELETE',
    body?: Record<string, string>
  ) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/info-comments/${encodeURIComponent(id)}`, {
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

  const pending = comments.filter((c) => c.status === 'pending');
  const other = comments.filter((c) => c.status !== 'pending');

  function renderItem(c: AdminGuideComment) {
    const busy = busyId === c.id;
    return (
      <li
        key={c.id}
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
              <strong>{c.authorName}</strong>
              {statusBadge(c.status)}
              <span className="admin-muted">{formatDate(c.createdAt)}</span>
            </div>
            <p className="admin-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              Guide: <code>{c.guideSlug}</code> · {c.locale.toUpperCase()}
              {c.authorEmail ? ` · ${c.authorEmail}` : ''}
              {c.helpfulCount > 0 ? ` · ${c.helpfulCount} helpful` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {c.status !== 'approved' && (
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                disabled={busy}
                onClick={() => mutate(c.id, 'PATCH', { status: 'approved' })}
              >
                {busy ? '…' : 'Approve'}
              </button>
            )}
            {c.status !== 'hidden' && (
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                disabled={busy}
                onClick={() => mutate(c.id, 'PATCH', { status: 'hidden' })}
              >
                {busy ? '…' : 'Hide'}
              </button>
            )}
            <button
              type="button"
              className="admin-btn admin-btn-danger admin-btn-sm"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Delete this comment permanently?')) return;
                mutate(c.id, 'DELETE');
              }}
            >
              {busy ? '…' : 'Delete'}
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{c.body}</p>
      </li>
    );
  }

  return (
    <>
      {error && (
        <p className="admin-costs-error" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}
      {pending.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 className="admin-section-title">Pending ({pending.length})</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{pending.map(renderItem)}</ul>
        </section>
      )}
      <section>
        <h3 className="admin-section-title">
          {pending.length > 0 ? `All other (${other.length})` : `All comments (${comments.length})`}
        </h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {(pending.length > 0 ? other : comments).map(renderItem)}
        </ul>
      </section>
    </>
  );
}
