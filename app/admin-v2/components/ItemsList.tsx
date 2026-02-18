import Image from 'next/image';
import type { SupabaseOrderItemRow } from '@/lib/supabase/adminQueries';

interface ItemsListProps {
  items: SupabaseOrderItemRow[];
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '—';
  return `฿${Number(n).toLocaleString()}`;
}

export function ItemsList({ items }: ItemsListProps) {
  if (items.length === 0) {
    return (
      <section className="admin-v2-section">
        <h2 className="admin-v2-section-title">Items</h2>
        <p className="admin-v2-empty">No items.</p>
      </section>
    );
  }

  return (
    <section className="admin-v2-section">
      <h2 className="admin-v2-section-title">Items</h2>
      <ul className="admin-v2-items-list">
        {items.map((item, i) => (
          <li key={i} className="admin-v2-item">
            {item.image_url_snapshot ? (
              <div className="admin-v2-item-image">
                <Image
                  src={item.image_url_snapshot}
                  alt={item.bouquet_title ?? 'Item'}
                  width={64}
                  height={64}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              </div>
            ) : (
              <div className="admin-v2-item-placeholder" />
            )}
            <div className="admin-v2-item-details">
              <strong>{item.bouquet_title ?? '—'}</strong>
              <span>Size: {item.size ?? '—'}</span>
              <span>Qty: 1</span>
              <span>{formatAmount(item.price)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
