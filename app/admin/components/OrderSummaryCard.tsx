import type { Order } from '@/lib/orders';
import {
  buildDriverMessengerPlainText,
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
import { AdminCopyTextButton } from '@/app/admin/components/AdminCopyTextButton';
import { formatShopDateTime } from '@/lib/shopTime';

interface OrderSummaryCardProps {
  order: SupabaseOrderRow;
  items: ItemWithCatalog[];
  /** Custom-order flow message card text (merged into “Copy card text” when present). */
  customGreetingCard?: string | null;
}

export function OrderSummaryCard({ order, items, customGreetingCard }: OrderSummaryCardProps) {
  const mapsUrl = checkoutMapsUrl(order);
  const recipientName = recipientNameDisplay(order);
  const recipientPhone = recipientPhoneDisplay(order);
  const surpriseDelivery = surpriseDeliveryAdminLabel(order);
  const copyText = buildOrderSummaryPlainText(order, items);
  const driverMessengerText = buildDriverMessengerPlainText(order, items, customGreetingCard);

  const deliveryAddressResolved =
    order.address?.trim() ||
    (order.order_json as Partial<Order> | null | undefined)?.delivery?.address?.trim() ||
    '';
  const deliveryDateRaw = order.delivery_date?.trim() || '';
  const deliveryWindowRaw = order.delivery_window?.trim() || '';
  const mapsUrlRaw = mapsUrl?.trim() ?? '';
  const hasDeliveryWhenWhere = Boolean(
    deliveryDateRaw || deliveryWindowRaw || deliveryAddressResolved || mapsUrlRaw
  );
  const deliveryDateTimeAddressForCopy = hasDeliveryWhenWhere
    ? `Date: ${deliveryDateRaw || 'N/A'}\nTime / window: ${deliveryWindowRaw || 'N/A'}\nAddress: ${
        deliveryAddressResolved || 'N/A'
      }\nGoogle Maps: ${mapsUrlRaw || 'N/A'}`
    : '';
  const recipientNameForCopy = recipientName.trim();
  const recipientPhoneForCopy = recipientPhone.trim();
  const recipientNamePhoneForCopy =
    recipientNameForCopy || recipientPhoneForCopy
      ? `Name: ${recipientNameForCopy || 'N/A'}\nPhone: ${recipientPhoneForCopy || 'N/A'}`
      : '';

  return (
    <section className="admin-section admin-summary-card">
      <div className="admin-summary-card-header">
        <h2 className="admin-section-title">Order summary</h2>
        <div className="admin-summary-header-actions">
          <AdminCopyTextButton
            text={driverMessengerText}
            ariaLabel="Copy message for driver: when, where, map pin, recipient, card text, balloon text, order id"
            className="admin-summary-copy-driver"
          >
            Copy for driver
          </AdminCopyTextButton>
          <OrderSummaryCopyAllButton text={copyText} />
        </div>
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
        <div className="admin-summary-block-key">
          <strong>Customer</strong>
          <p>{naText(order.customer_name)}</p>
          <p className="admin-muted">Email: {naText(order.customer_email)}</p>
          <p className="admin-muted">
            Phone: <span className="admin-summary-key-value">{naText(order.phone)}</span>
          </p>
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
        <div className="admin-summary-delivery admin-summary-block-key">
          <strong>Delivery</strong>
          <div className="admin-summary-field-row">
            <div className="admin-summary-field-main">
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Date:</span>{' '}
                <span className="admin-summary-emphasis">{naText(order.delivery_date)}</span>
              </p>
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Window:</span> {naText(order.delivery_window)}
              </p>
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Address:</span>{' '}
                <span className="admin-summary-key-value admin-summary-key-value--multiline">
                  {naText(deliveryAddressResolved)}
                </span>
              </p>
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Google Maps (checkout):</span>{' '}
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-link admin-summary-key-value"
                  >
                    Open in Google Maps
                  </a>
                ) : (
                  <span className="admin-muted">N/A</span>
                )}
              </p>
            </div>
            <AdminCopyTextButton
              text={deliveryDateTimeAddressForCopy}
              ariaLabel="Copy delivery date, time window, address, and Google Maps link to clipboard"
              className="admin-copy-text-btn--inline"
            >
              Copy date, time, address & map
            </AdminCopyTextButton>
          </div>
        </div>
        <div className="admin-summary-recipient admin-summary-block-key">
          <strong>Recipient</strong>
          <div className="admin-summary-field-row">
            <div className="admin-summary-field-main">
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Name:</span> {naText(recipientName)}
              </p>
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Phone:</span>{' '}
                <span className="admin-summary-key-value">{naText(recipientPhone)}</span>
              </p>
            </div>
            <AdminCopyTextButton
              text={recipientNamePhoneForCopy}
              ariaLabel="Copy recipient name and phone to clipboard"
              className="admin-copy-text-btn--inline"
            >
              Copy name & phone
            </AdminCopyTextButton>
          </div>
          <p>
            <span className="admin-summary-inline-label">Surprise delivery:</span> {surpriseDelivery}
          </p>
        </div>
      </div>
    </section>
  );
}
