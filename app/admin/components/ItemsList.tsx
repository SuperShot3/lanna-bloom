import Image from 'next/image';
import Link from 'next/link';
import type { SupabaseOrderItemRow, OrderItemAddOnsDisplay } from '@/lib/supabase/adminQueries';

export interface ItemWithCatalog extends SupabaseOrderItemRow {
  catalogHref?: string;
  addOns?: OrderItemAddOnsDisplay;
}

interface ItemsListProps {
  items: ItemWithCatalog[];
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '—';
  return `฿${Number(n).toLocaleString()}`;
}

function getWrappingLabel(opt: string | null | undefined): string {
  if (!opt) return '—';
  const lower = String(opt).toLowerCase();
  if (lower === 'standard' || lower === 'classic') return 'Free';
  if (lower === 'premium') return 'Premium';
  if (lower === 'no paper' || lower === 'none') return 'No paper';
  return opt;
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
      <p className="admin-v2-hint" style={{ marginBottom: 12 }}>
        Flower / product name, card text, and add-ons for each line item.
      </p>
      <ul className="admin-v2-items-list">
        {items.map((item, i) => (
          <li key={i} className="admin-v2-item">
            {item.image_url_snapshot ? (
              <div className="admin-v2-item-image">
                <a
                  href={item.image_url_snapshot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-v2-item-image-link"
                  title="Click to view full size"
                >
                  <Image
                    src={item.image_url_snapshot}
                    alt={item.bouquet_title ?? 'Item'}
                    width={64}
                    height={64}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                  />
                </a>
              </div>
            ) : (
              <div className="admin-v2-item-placeholder" />
            )}
            <div className="admin-v2-item-details">
              <div className="admin-v2-item-header">
                <strong>{item.bouquet_title ?? '—'}</strong>
                <span className="admin-v2-item-type-badge">
                  {(item.item_type ?? 'bouquet') === 'product' ? 'Product' : 'Bouquet'}
                </span>
              </div>
              {item.addOns?.cardMessage?.trim() && (
                <div className="admin-v2-item-card-text">
                  <span className="admin-v2-addon-label">Card text:</span>
                  <span className="admin-v2-addon-message">&quot;{item.addOns.cardMessage.trim()}&quot;</span>
                </div>
              )}
              <div className="admin-v2-item-meta">
                <span>Size: {item.size ?? '—'}</span>
                <span>Qty: 1</span>
                <span>{formatAmount(item.price)}</span>
              </div>
              {(item.addOns?.cardType != null || item.addOns?.wrappingOption) && (
                <div className="admin-v2-item-addons">
                  {item.addOns?.cardType != null && (
                    <span className="admin-v2-addon-row">
                      Card: {item.addOns.cardType === 'premium' ? 'Premium' : 'Free'}
                    </span>
                  )}
                  {item.addOns?.wrappingOption && (
                    <span className="admin-v2-addon-row">
                      Wrapping: {getWrappingLabel(item.addOns.wrappingOption)}
                    </span>
                  )}
                </div>
              )}
              {item.catalogHref && (
                <Link
                  href={item.catalogHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-v2-item-catalog-link"
                >
                  View on shop
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
