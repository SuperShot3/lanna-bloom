import type { ContactPreferenceOption } from '@/lib/orders/types';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import { ItemsList, type ItemWithCatalog } from '@/app/admin/components/ItemsList';

const CONTACT_PREF_LABELS: Record<ContactPreferenceOption, string> = {
  phone: 'Phone',
  line: 'LINE',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};

function parseContactPreference(raw: string | null | undefined): ContactPreferenceOption[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set<ContactPreferenceOption>(['phone', 'line', 'telegram', 'whatsapp']);
    const out: ContactPreferenceOption[] = [];
    for (const x of parsed) {
      if (typeof x === 'string' && allowed.has(x as ContactPreferenceOption)) {
        out.push(x as ContactPreferenceOption);
      }
    }
    return out;
  } catch {
    return [];
  }
}

interface OrderSummaryCardProps {
  order: SupabaseOrderRow;
  items: ItemWithCatalog[];
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '—';
  return `฿${Number(n).toLocaleString()}`;
}

export function OrderSummaryCard({ order, items }: OrderSummaryCardProps) {
  const contactPrefs = parseContactPreference(order.contact_preference);

  return (
    <section className="admin-section admin-summary-card">
      <h2 className="admin-section-title">Order summary</h2>
      <div className="admin-summary-grid">
        <div>
          <strong>Order ID</strong>
          <p>{order.order_id}</p>
        </div>
        <div>
          <strong>Created</strong>
          <p>{formatDate(order.created_at)}</p>
        </div>
        <div>
          <strong>Customer</strong>
          <p>{order.customer_name ?? '—'}</p>
          {order.customer_email && (
            <p className="admin-muted">{order.customer_email}</p>
          )}
          <p className="admin-muted">{order.phone ?? ''}</p>
          {contactPrefs.length > 0 && (
            <p className="admin-muted">
              Preferred contact:{' '}
              {contactPrefs.map((opt) => CONTACT_PREF_LABELS[opt]).join(' · ')}
            </p>
          )}
        </div>
        <ItemsList items={items} embedded summary={null} />
        <div>
          <strong>Items total</strong>
          <p>{formatAmount(order.items_total)}</p>
        </div>
        <div>
          <strong>Delivery fee</strong>
          <p>{formatAmount(order.delivery_fee)}</p>
        </div>
        {(order.referral_discount != null && order.referral_discount > 0) && (
          <div>
            <strong>Discount</strong>
            <p className="admin-discount">-{formatAmount(order.referral_discount)}</p>
          </div>
        )}
        <div>
          <strong>Grand total</strong>
          <p className="admin-total">{formatAmount(order.grand_total)}</p>
        </div>
        <div className="admin-summary-delivery">
          <strong>Delivery</strong>
          <p>
            <span className="admin-summary-inline-label">Date:</span> {order.delivery_date ?? '—'}
          </p>
          <p>
            <span className="admin-summary-inline-label">Window:</span> {order.delivery_window ?? '—'}
          </p>
          <p>
            <span className="admin-summary-inline-label">Address:</span> {order.address ?? '—'}
          </p>
          {order.delivery_google_maps_url && (
            <p>
              <a
                href={order.delivery_google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-link"
              >
                Open in Google Maps
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
