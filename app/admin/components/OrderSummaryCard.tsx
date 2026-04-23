import {
  buildClipboardCardText,
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
  const cardTextClipboard = buildClipboardCardText(items, customGreetingCard);
  const customerPhoneRaw = order.phone?.trim() ?? '';
  const receiverPhoneRaw = recipientPhone.trim();
  const addressRaw = order.address?.trim() ?? '';
  const mapsUrlRaw = mapsUrl ?? '';
  const driverMessengerText = buildDriverMessengerPlainText(order, items, customGreetingCard);

  return (
    <section className="admin-section admin-summary-card">
      <div className="admin-summary-card-header">
        <h2 className="admin-section-title">Order summary</h2>
        <OrderSummaryCopyAllButton text={copyText} />
      </div>
      <div className="admin-summary-quick-copy">
        <p className="admin-summary-quick-copy-title">Copy for messaging</p>
        <div className="admin-summary-quick-copy-group admin-summary-quick-copy-group--driver">
          <p className="admin-summary-quick-copy-subtitle">Driver / LINE (grouped)</p>
          <p className="admin-summary-quick-copy-hint">
            Order ID, date & time window, address, Maps pin, recipient, sender phone, and card text in one message.
          </p>
          <div className="admin-summary-quick-copy-btns">
            <AdminCopyTextButton
              text={driverMessengerText}
              ariaLabel="Copy grouped delivery and card text for driver (LINE/Messenger)"
              className="admin-copy-text-btn--primary"
            >
              Delivery + card for driver
            </AdminCopyTextButton>
          </div>
        </div>
        <div className="admin-summary-quick-copy-divider" role="presentation" />
        <p className="admin-summary-quick-copy-subtitle">Single fields</p>
        <p className="admin-summary-quick-copy-hint">
          Copy one value at a time (card, phones, address, or Maps link only).
        </p>
        <div className="admin-summary-quick-copy-btns">
          <AdminCopyTextButton text={cardTextClipboard} ariaLabel="Copy card text to clipboard">
            Card text
          </AdminCopyTextButton>
          <AdminCopyTextButton text={customerPhoneRaw} ariaLabel="Copy customer phone to clipboard">
            Customer phone
          </AdminCopyTextButton>
          <AdminCopyTextButton text={receiverPhoneRaw} ariaLabel="Copy receiver phone to clipboard">
            Receiver phone
          </AdminCopyTextButton>
          <AdminCopyTextButton text={addressRaw} ariaLabel="Copy delivery address to clipboard">
            Address
          </AdminCopyTextButton>
          <AdminCopyTextButton text={mapsUrlRaw} ariaLabel="Copy Google Maps link to clipboard">
            Maps link
          </AdminCopyTextButton>
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
          <p>
            <span className="admin-summary-inline-label">Date:</span>{' '}
            <span className="admin-summary-emphasis">{naText(order.delivery_date)}</span>
          </p>
          <p>
            <span className="admin-summary-inline-label">Window:</span> {naText(order.delivery_window)}
          </p>
          <p>
            <span className="admin-summary-inline-label">Address:</span>{' '}
            <span className="admin-summary-key-value admin-summary-key-value--multiline">
              {naText(order.address)}
            </span>
          </p>
          <p>
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
        <div className="admin-summary-recipient admin-summary-block-key">
          <strong>Recipient</strong>
          <p>
            <span className="admin-summary-inline-label">Name:</span> {naText(recipientName)}
          </p>
          <p>
            <span className="admin-summary-inline-label">Phone:</span>{' '}
            <span className="admin-summary-key-value">{naText(recipientPhone)}</span>
          </p>
          <p>
            <span className="admin-summary-inline-label">Surprise delivery:</span> {surpriseDelivery}
          </p>
        </div>
      </div>
    </section>
  );
}
