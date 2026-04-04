import Image from 'next/image';
import Link from 'next/link';
import type { SupabaseOrderItemRow, OrderItemAddOnsDisplay } from '@/lib/supabase/adminQueries';

export interface ItemWithCatalog extends SupabaseOrderItemRow {
  catalogHref?: string;
  addOns?: OrderItemAddOnsDisplay;
}

export interface ItemsListSummary {
  itemsTotal: number | null;
  deliveryFee: number | null;
  grandTotal: number | null;
}

interface ItemsListProps {
  items: ItemWithCatalog[];
  /** Order totals to show at bottom of items section (flowers total, delivery, grand total). */
  summary?: ItemsListSummary | null;
  /** When true, render without outer <section> (for use inside Order summary card). */
  embedded?: boolean;
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  return `฿${Number(n).toLocaleString()}`;
}

function getWrappingLabel(opt: string | null | undefined): string {
  if (!opt) return 'N/A';
  const lower = String(opt).toLowerCase();
  if (lower === 'standard' || lower === 'classic') return 'Free';
  if (lower === 'premium') return 'Premium';
  if (lower === 'no paper' || lower === 'none') return 'No paper';
  return opt;
}

export function ItemsList({ items, summary, embedded }: ItemsListProps) {
  const showSummary =
    !embedded &&
    summary &&
    (summary.itemsTotal != null || summary.deliveryFee != null || summary.grandTotal != null);

  if (!embedded && items.length === 0 && !showSummary) {
    return (
      <section className="admin-section">
        <h2 className="admin-section-title">Items</h2>
        <p className="admin-empty">No items.</p>
      </section>
    );
  }

  const title = embedded ? (
    <h3 className="admin-section-title">Items</h3>
  ) : (
    <h2 className="admin-section-title">Items</h2>
  );

  const body = (
    <>
      {title}
      {items.length === 0 ? (
        <p className="admin-empty">No line items in this order.</p>
      ) : (
        <ul className="admin-items-list">
          {items.map((item, i) => (
            <li key={i} className="admin-item">
              {item.image_url_snapshot ? (
                <div className="admin-item-image">
                  <a
                    href={item.image_url_snapshot}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-item-image-link"
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
                <div className="admin-item-placeholder" />
              )}
              <div className="admin-item-details">
                <div className="admin-item-header">
                  <strong>{item.bouquet_title?.trim() ? item.bouquet_title : 'N/A'}</strong>
                  <span className="admin-item-type-badge">
                    {(item.item_type ?? 'bouquet') === 'product' ? 'Product' : 'Bouquet'}
                  </span>
                </div>
                {item.addOns?.cardMessage?.trim() && (
                  <div className="admin-item-card-text">
                    <span className="admin-addon-label">Card text:</span>
                    <span className="admin-addon-message">&quot;{item.addOns.cardMessage.trim()}&quot;</span>
                  </div>
                )}
                <div className="admin-item-meta">
                  <span>Size: {item.size?.trim() ? item.size : 'N/A'}</span>
                  <span>Qty: 1</span>
                  <span>{formatAmount(item.price)}</span>
                </div>
                {(item.addOns?.cardType != null || item.addOns?.wrappingOption) && (
                  <div className="admin-item-addons">
                    {item.addOns?.cardType != null && (
                      <span className="admin-addon-row">
                        Card: {item.addOns.cardType === 'premium' ? 'Premium' : 'Free'}
                      </span>
                    )}
                    {item.addOns?.wrappingOption && (
                      <span className="admin-addon-row">
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
                    className="admin-item-catalog-link"
                  >
                    View on shop
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {showSummary && summary && (
        <div className="admin-summary">
          {summary.itemsTotal != null && (
            <p><strong>Flowers / products total:</strong> {formatAmount(summary.itemsTotal)}</p>
          )}
          {summary.deliveryFee != null && (
            <p><strong>Delivery:</strong> {formatAmount(summary.deliveryFee)}</p>
          )}
          {summary.grandTotal != null && (
            <p><strong>Total:</strong> {formatAmount(summary.grandTotal)}</p>
          )}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="admin-summary-items">{body}</div>;
  }

  return <section className="admin-section">{body}</section>;
}
