import type { Order } from '@/lib/orders';
import {
  buildCardTextClipboardText,
  buildCustomerDetailsClipboardText,
  buildDriverMessengerPlainText,
  buildDriverNotesClipboardText,
  buildOrderSummaryPlainText,
  buildRecipientDetailsClipboardText,
  checkoutMapsUrl,
  deliveryNotesDisplay,
  driverNotesDisplayOrNone,
  customerLineIdDisplay,
  customerPhoneDisplay,
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
import {
  destinationDisplayName,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { zoneLabel } from '@/lib/delivery/zones';

interface OrderSummaryCardProps {
  order: SupabaseOrderRow;
  items: ItemWithCatalog[];
  /** Custom-order flow message card text (merged into “Copy card text” when present). */
  customGreetingCard?: string | null;
}

export function OrderSummaryCard({ order, items, customGreetingCard }: OrderSummaryCardProps) {
  const orderJson = order.order_json as Partial<Order> | null | undefined;
  const referralPartnerName =
    typeof orderJson?.referralPartnerName === 'string' ? orderJson.referralPartnerName : null;
  const referralCommissionRate =
    typeof orderJson?.referralCommissionRate === 'number' ? orderJson.referralCommissionRate : null;
  const referralCommissionAmount =
    typeof orderJson?.referralCommissionAmount === 'number' ? orderJson.referralCommissionAmount : null;
  const mapsUrl = checkoutMapsUrl(order);
  const deliveryNotes = deliveryNotesDisplay(order);
  const recipientName = recipientNameDisplay(order);
  const recipientPhone = recipientPhoneDisplay(order);
  const surpriseDelivery = surpriseDeliveryAdminLabel(order);
  const copyText = buildOrderSummaryPlainText(order, items);
  const driverMessengerText = buildDriverMessengerPlainText(order, items, customGreetingCard);
  const customerLineId = customerLineIdDisplay(order);
  const cardTextForCopy = buildCardTextClipboardText(items, customGreetingCard);

  const deliveryAddressResolved =
    order.address?.trim() ||
    orderJson?.delivery?.address?.trim() ||
    '';
  const addressForCopy = deliveryAddressResolved.trim();
  const mapsUrlForCopy = mapsUrl?.trim() ?? '';
  const driverNotesForCopy = buildDriverNotesClipboardText(order);
  const customerDetailsForCopy = buildCustomerDetailsClipboardText(order);
  const recipientDetailsForCopy = buildRecipientDetailsClipboardText(order);

  return (
    <section className="admin-section admin-summary-card">
      <div className="admin-summary-card-header">
        <h2 className="admin-section-title">Order summary</h2>
        <div className="admin-summary-header-actions">
          <AdminCopyTextButton
            text={driverMessengerText}
            ariaLabel="Copy Thai message for driver: pickup time, phone, address (map pin separate)"
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
          <div className="admin-summary-field-row">
            <div className="admin-summary-field-main">
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Name:</span> {naText(order.customer_name)}
              </p>
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Phone:</span>{' '}
                <span className="admin-summary-key-value">{naText(customerPhoneDisplay(order))}</span>
              </p>
              <p className="admin-muted">Email: {naText(order.customer_email)}</p>
              <p className="admin-muted">Preferred contact: {preferredContactDisplay(order)}</p>
              {customerLineId ? (
                <p className="admin-muted">
                  LINE ID:{' '}
                  <span className="admin-summary-key-value">{customerLineId}</span>
                </p>
              ) : null}
            </div>
            <AdminCopyTextButton
              text={customerDetailsForCopy}
              ariaLabel="Copy customer name and phone to clipboard"
              className="admin-copy-text-btn--inline"
            >
              Copy customer details
            </AdminCopyTextButton>
          </div>
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
            {referralPartnerName && referralCommissionAmount != null && (
              <p className="admin-muted">
                {referralPartnerName} commission
                {referralCommissionRate != null ? ` (${referralCommissionRate}%)` : ''}:{' '}
                {formatAmountNa(referralCommissionAmount)}
              </p>
            )}
          </div>
        )}
        <div>
          <strong>Grand total</strong>
          <p className="admin-total">{formatAmountNa(order.grand_total)}</p>
        </div>
        <div className="admin-summary-delivery admin-summary-block-key">
          <strong>Delivery</strong>
          <p className="admin-summary-recipient-line">
            <span className="admin-summary-inline-label">Date:</span>{' '}
            <span className="admin-summary-emphasis">{naText(order.delivery_date)}</span>
          </p>
          <p className="admin-summary-recipient-line">
            <span className="admin-summary-inline-label">Window:</span> {naText(order.delivery_window)}
          </p>
          {order.delivery_destination?.trim() && (
            <p className="admin-summary-recipient-line">
              <span className="admin-summary-inline-label">Destination:</span>{' '}
              {destinationDisplayName(
                order.delivery_destination.trim() as DeliveryDestinationId,
                'en'
              )}
            </p>
          )}
          {order.delivery_zone?.trim() && order.delivery_destination?.trim() && (
            <p className="admin-summary-recipient-line">
              <span className="admin-summary-inline-label">Zone:</span>{' '}
              {zoneLabel(
                order.delivery_destination.trim() as DeliveryDestinationId,
                order.delivery_zone.trim(),
                'en'
              ) ?? order.delivery_zone}
              <span className="admin-muted"> ({order.delivery_zone})</span>
            </p>
          )}
          {order.postal_code?.trim() && (
            <p className="admin-summary-recipient-line">
              <span className="admin-summary-inline-label">Postcode:</span>{' '}
              {naText(order.postal_code)}
            </p>
          )}
          {!order.delivery_destination?.trim() && order.district?.trim() && (
            <p className="admin-summary-recipient-line">
              <span className="admin-summary-inline-label">District (legacy):</span>{' '}
              {naText(order.district)}
            </p>
          )}

          <div className="admin-summary-field-row">
            <div className="admin-summary-field-main">
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Address:</span>{' '}
                <span className="admin-summary-key-value admin-summary-key-value--multiline">
                  {naText(deliveryAddressResolved)}
                </span>
              </p>
            </div>
            <AdminCopyTextButton
              text={addressForCopy}
              ariaLabel="Copy delivery address text to clipboard"
              className="admin-copy-text-btn--inline"
            >
              Copy address
            </AdminCopyTextButton>
          </div>

          <div className="admin-summary-field-row">
            <div className="admin-summary-field-main">
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Driver notes:</span>{' '}
                <span className="admin-summary-key-value admin-summary-key-value--multiline">
                  {driverNotesDisplayOrNone(deliveryNotes)}
                </span>
              </p>
            </div>
            <AdminCopyTextButton
              text={driverNotesForCopy}
          ariaLabel="Copy driver notes to clipboard"
              className="admin-copy-text-btn--inline"
            >
              Copy driver notes
            </AdminCopyTextButton>
          </div>

          <div className="admin-summary-field-row">
            <div className="admin-summary-field-main">
              <p className="admin-summary-recipient-line">
                <span className="admin-summary-inline-label">Card text:</span>{' '}
                <span className="admin-summary-key-value admin-summary-key-value--multiline">
                  {naText(cardTextForCopy)}
                </span>
              </p>
            </div>
            <AdminCopyTextButton
              text={cardTextForCopy}
              ariaLabel="Copy card message text to clipboard"
              className="admin-copy-text-btn--inline"
            >
              Copy card text
            </AdminCopyTextButton>
          </div>

          <div className="admin-summary-field-row">
            <div className="admin-summary-field-main">
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
              text={mapsUrlForCopy}
              ariaLabel="Copy Google Maps pin link to clipboard"
              className="admin-copy-text-btn--inline"
            >
              Copy map pin
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
              text={recipientDetailsForCopy}
              ariaLabel="Copy recipient name and phone to clipboard"
              className="admin-copy-text-btn--inline"
            >
              Copy recipient details
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
