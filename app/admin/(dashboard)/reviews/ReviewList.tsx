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

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="admin-empty">No reviews yet. Add one above.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {reviews.slice(0, 20).map((r) => (
        <li
          key={r.id}
          style={{
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <strong>{r.name}</strong>
            <span style={{ color: 'var(--accent)' }}>{'★'.repeat(r.rating)}</span>
            <span className="admin-muted">{formatDate(r.date)}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {r.text.length > 120 ? `${r.text.slice(0, 120)}...` : r.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
