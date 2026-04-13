import {
  buildOrderSummaryPlainText,
  checkoutMapsUrl,
  formatAmountNa,
  naText,
  preferredContactDisplay,
  recipientNameDisplay,
  recipientPhoneDisplay,
  surpriseDeliveryAdminLabel,
} from '@/lib/admin/orderSummaryPlainText';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import { ItemsList, type ItemWithCatalog } from '@/app/admin/components/ItemsList';
import { OrderSummaryCopyAllButton } from '@/app/admin/components/OrderSummaryCopyAllButton';
import { formatShopDateTime } from '@/lib/shopTime';

interface OrderSummaryCardProps {
  order: SupabaseOrderRow;
  items: ItemWithCatalog[];
}

export function OrderSummaryCard({ order, items }: OrderSummaryCardProps) {
  const mapsUrl = checkoutMapsUrl(order);
  const recipientName = recipientNameDisplay(order);
  const recipientPhone = recipientPhoneDisplay(order);
  const surpriseDelivery = surpriseDeliveryAdminLabel(order);
  const copyText = buildOrderSummaryPlainText(order, items);

  return (
    <section className="admin-section admin-summary-card">
      <div className="admin-summary-card-header">
        <h2 className="admin-section-title">Order summary</h2>
        <OrderSummaryCopyAllButton text={copyText} />
      </div>
      <div className="admin-summary-grid">
        <div>
          <strong>Order ID</strong>
          <p>{naText(order.order_id)}</p>
        </div>
        <div>
          <strong>Created</strong>
          <p>{formatShopDateTime(order.created_at, 'N/A')}</p>
        </div>
        <div>
          <strong>Customer</strong>
          <p>{naText(order.customer_name)}</p>
          <p className="admin-muted">Email: {naText(order.customer_email)}</p>
          <p className="admin-muted">Phone: {naText(order.phone)}</p>
          <p className="admin-muted">Preferred contact: {preferredContactDisplay(order)}</p>
        </div>
        <ItemsList items={items} embedded summary={null} />
        <div>
          <strong>Items total</strong>
          <p>{formatAmountNa(order.items_total)}</p>
        </div>
        <div>
          <strong>Delivery fee</strong>
          <p>{formatAmountNa(order.delivery_fee)}</p>
        </div>
        {(order.referral_discount != null && order.referral_discount > 0) && (
          <div>
            <strong>Discount</strong>
            <p className="admin-discount">-{formatAmountNa(order.referral_discount)}</p>
          </div>
        )}
        <div>
          <strong>Grand total</strong>
          <p className="admin-total">{formatAmountNa(order.grand_total)}</p>
        </div>
        <div className="admin-summary-delivery">
          <strong>Delivery</strong>
          <p>
            <span className="admin-summary-inline-label">Date:</span> {naText(order.delivery_date)}
          </p>
          <p>
            <span className="admin-summary-inline-label">Window:</span> {naText(order.delivery_window)}
          </p>
          <p>
            <span className="admin-summary-inline-label">Address:</span> {naText(order.address)}
          </p>
          <p>
            <span className="admin-summary-inline-label">Google Maps (checkout):</span>{' '}
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="admin-link">
                Open in Google Maps
              </a>
            ) : (
              <span className="admin-muted">N/A</span>
            )}
          </p>
        </div>
        <div className="admin-summary-recipient">
          <strong>Recipient</strong>
          <p>
            <span className="admin-summary-inline-label">Name:</span> {naText(recipientName)}
          </p>
          <p>
            <span className="admin-summary-inline-label">Phone:</span> {naText(recipientPhone)}
          </p>
          {surpriseDelivery != null && (
            <p>
              <span className="admin-summary-inline-label">Surprise delivery:</span> {surpriseDelivery}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
