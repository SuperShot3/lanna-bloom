'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FiltersBar } from '@/app/admin/components/FiltersBar';
import {
  DeliveryRouteMapModal,
  buildMapMarkers,
} from '@/app/admin/components/DeliveryRouteMapModal';
import type {
  DeliveryBoardSupplierRequestSummary,
  OpenDeliverySummary,
  SupabaseOrderRow,
} from '@/lib/supabase/adminQueries';
import {
  supplierResponseLabelEnglish,
  supplierStatusLabelEnglish,
} from '@/lib/supplierRequests';
import {
  destinationDisplayName,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { zoneLabel } from '@/lib/delivery/zones';
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  formatOrderStatus,
  formatPaymentStatus,
  normalizeOrderStatus,
  type OrderStatus,
} from '@/lib/orders/statusConstants';
import {
  customerCardMessagePreview,
  firstLineItemSpecSummary,
  firstLineProductLabel,
  formatDeliveryDateCard,
  formatDeliveryWindowLabel,
  groupOrdersByDayPart,
  groupOrdersByDeliveryDate,
  itemTypeDisplayLabel,
  orderHasCustomerCardMessage,
  orderProductThumbPreviews,
  sortOrdersForBoard,
} from '@/lib/admin/deliveryBoardPreview';
import {
  buildCustomerDetailsClipboardText,
  buildDriverMessengerPlainText,
  buildDriverNotesClipboardText,
  buildOrderSummaryPlainTextFromBoardOrder,
  buildRecipientDetailsClipboardText,
  cardTextDisplayOrNone,
  checkoutMapsUrl,
  customerDeliveryAddressRaw,
  customerLineIdDisplay,
  customerPhoneDisplay,
  deliveryNotesDisplay,
  driverNotesDisplayOrNone,
  MISSING_EN,
  recipientPhoneDisplay,
} from '@/lib/admin/orderSummaryPlainText';
import { getLineUserContactUrl } from '@/lib/messenger';
import { LineIcon } from '@/components/icons';
import {
  e164Digits,
  phoneInternational,
  telHref,
  whatsappHref,
} from '@/lib/admin/deliveryContactLinks';
import { AdminCopyTextButton } from '@/app/admin/components/AdminCopyTextButton';
import {
  DeliveredEmailPreviewModal,
  type DeliveredPreviewPayload,
} from '@/app/admin/components/DeliveredEmailPreviewModal';
import { formatShopDateTime, shopAddDays, shopTodayYmd } from '@/lib/shopTime';
import { AdminOpenChatButton } from '@/components/orderChat/AdminOpenChatButton';

interface DeliveryBoardClientProps {
  initialOrders: SupabaseOrderRow[];
  initialTotal: number;
  initialError?: string;
  initialFilters: {
    orderId?: string;
    recipientPhone?: string;
    q?: string;
    orderStatus?: string;
    paymentStatus?: string;
    district?: string;
    deliveryDestination?: string;
    deliveryDateFrom?: string;
    deliveryDateTo?: string;
    openPipeline?: boolean;
  };
  /** URL / default dates for the toolbar (board chips; not used as search filters). */
  boardDateFrom: string;
  boardDateTo: string;
  /** Optional search From/To. Empty means all dates. */
  searchDateFrom?: string;
  searchDateTo?: string;
  searchAllDates?: boolean;
  pipelineOpen?: boolean;
  openDeliverySummary: OpenDeliverySummary;
  initialPage: number;
  pageSize: number;
  districts: string[];
  deliveryDestinations: string[];
  canEditStatus: boolean;
  canAssignDriver: boolean;
  /** Latest supplier_order_requests row per order (for reviewing supplier task replies). */
  supplierSummariesByOrderId: Record<string, DeliveryBoardSupplierRequestSummary>;
  orderChatEnabled?: boolean;
  appBaseUrl?: string;
}

const QUICK_DRIVER_NAMES = ['Pee Khai', 'Pee Vinai'] as const;

function isOpenPipelineStatus(status: string | null | undefined): boolean {
  const n = normalizeOrderStatus(status);
  return n !== 'DELIVERED' && n !== 'CANCELLED';
}

function isDeliveredStatus(status: string | null | undefined): boolean {
  return normalizeOrderStatus(status) === 'DELIVERED';
}

function workflowLabel(status: string | null | undefined): string {
  const n = normalizeOrderStatus(status);
  if (n === 'NEW') return 'Scheduled';
  if (n === 'DELIVERED' || n === 'CANCELLED') return formatOrderStatus(status);
  return 'In progress';
}

function deliveryCardStatusClass(status: string | null | undefined): string {
  const n = normalizeOrderStatus(status);
  if (n === 'DELIVERED') return 'admin-delivery-card--delivered';
  if (n === 'CANCELLED') return 'admin-delivery-card--cancelled';
  if (n === 'NEW') return 'admin-delivery-card--scheduled';
  return 'admin-delivery-card--pipeline';
}

function deliveryFlowBadgeStatusClass(status: string | null | undefined): string {
  const n = normalizeOrderStatus(status);
  if (n === 'DELIVERED') return 'admin-delivery-badge-flow--delivered';
  if (n === 'CANCELLED') return 'admin-delivery-badge-flow--cancelled';
  if (n === 'NEW') return 'admin-delivery-badge-flow--scheduled';
  return 'admin-delivery-badge-flow--pipeline';
}

function deliveryAreaSubtitle(o: SupabaseOrderRow): string | null {
  const dest = (o.delivery_destination ?? '').trim() as DeliveryDestinationId;
  if (dest && o.delivery_zone) {
    const z = zoneLabel(dest, o.delivery_zone.trim(), 'en');
    if (z) return `${destinationDisplayName(dest, 'en')} · ${z}`;
  }
  if (dest) return destinationDisplayName(dest, 'en');
  if (o.district?.trim()) return o.district;
  return null;
}

function truncateAddressLine(s: string, max = 90): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function DeliveryCardAddress({ order }: { order: SupabaseOrderRow }) {
  const raw = customerDeliveryAddressRaw(order);
  const mapsHref = checkoutMapsUrl(order);
  const deliveryNotes = deliveryNotesDisplay(order);
  const cardMessage = customerCardMessagePreview(order);
  const driverNotesForCopy = buildDriverNotesClipboardText(order);
  const area = deliveryAreaSubtitle(order);
  const addressFieldIsMapsLink = Boolean(raw && mapsHref && raw.trim() === mapsHref);
  const fallbackAreaOnly = !raw && !mapsHref && Boolean(area);
  const addressForCopy = addressFieldIsMapsLink ? '' : raw.trim();
  const mapsForCopy = mapsHref?.trim() ?? '';

  let main: ReactNode;
  if (fallbackAreaOnly) {
    main = <span className="admin-delivery-address-text">{area}</span>;
  } else if (!raw && !mapsHref) {
    main = <span className="admin-hint">—</span>;
  } else if (addressFieldIsMapsLink || (!raw && mapsHref)) {
    main = (
      <a
        href={mapsHref!}
        target="_blank"
        rel="noopener noreferrer"
        className="admin-delivery-address-link"
      >
        Open in Google Maps
      </a>
    );
  } else if (raw) {
    main = (
      <span className="admin-delivery-address-text" title={raw}>
        {truncateAddressLine(raw)}
      </span>
    );
  } else {
    main = <span className="admin-hint">—</span>;
  }

  const showAreaBelow = Boolean(area && !fallbackAreaOnly);
  const addressIsMapsOnly = addressFieldIsMapsLink || (!raw && Boolean(mapsForCopy));
  const showSeparateMapRow = Boolean(mapsForCopy) && !addressIsMapsOnly && Boolean(raw);
  const primaryCopyText = addressIsMapsOnly ? mapsForCopy : addressForCopy;
  const primaryCopyLabel = addressIsMapsOnly ? 'Copy map pin' : 'Copy address';
  const primaryCopyAria = addressIsMapsOnly
    ? 'Copy Google Maps pin link'
    : 'Copy delivery address text';

  return (
    <div className="admin-delivery-address-block">
      <div
        className={`admin-delivery-card-copy-row admin-delivery-field-pair ${
          addressIsMapsOnly
            ? 'admin-delivery-field-pair--maps'
            : 'admin-delivery-field-pair--address'
        }`}
      >
        <div className="admin-delivery-card-meta admin-delivery-card-meta--location admin-delivery-field-chip">
          <span className="material-symbols-outlined admin-delivery-meta-icon">location_on</span>
          <div className="admin-delivery-address-main">
            <span className="admin-delivery-field-label">Address:</span>
            {main}
          </div>
        </div>
        <AdminCopyTextButton
          text={primaryCopyText}
          ariaLabel={primaryCopyAria}
          className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-copy-action"
        >
          <span className="material-symbols-outlined admin-delivery-copy-action-ico" aria-hidden>
            content_copy
          </span>
          {primaryCopyLabel}
        </AdminCopyTextButton>
      </div>
      {showAreaBelow ? (
        <p className="admin-delivery-card-meta admin-delivery-card-meta--area">{area}</p>
      ) : null}
      {showSeparateMapRow ? (
        <div className="admin-delivery-card-copy-row admin-delivery-field-pair admin-delivery-field-pair--maps">
          <p className="admin-delivery-card-meta admin-delivery-card-meta--area admin-delivery-card-copy-row-text admin-delivery-field-chip">
            <a
              href={mapsHref!}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-delivery-address-maps-link"
            >
              Open in Google Maps
            </a>
          </p>
          <AdminCopyTextButton
            text={mapsForCopy}
            ariaLabel="Copy Google Maps pin link"
            className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-copy-action"
          >
            <span className="material-symbols-outlined admin-delivery-copy-action-ico" aria-hidden>
              content_copy
            </span>
            Copy map pin
          </AdminCopyTextButton>
        </div>
      ) : null}
      <div className="admin-delivery-card-copy-row admin-delivery-field-pair admin-delivery-field-pair--driver">
        <p
          className="admin-delivery-card-meta admin-delivery-card-meta--area admin-delivery-card-copy-row-text admin-delivery-card-meta--driver-notes admin-delivery-field-chip"
          title={deliveryNotes || MISSING_EN}
        >
          <span className="material-symbols-outlined admin-delivery-meta-icon">note_alt</span>
          <span className="admin-delivery-field-body">
            <span className="admin-delivery-field-label">Driver notes:</span>{' '}
            {driverNotesDisplayOrNone(deliveryNotes)}
          </span>
        </p>
        <AdminCopyTextButton
          text={driverNotesForCopy}
          ariaLabel="Copy driver notes"
          className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-copy-action"
        >
          <span className="material-symbols-outlined admin-delivery-copy-action-ico" aria-hidden>
            content_copy
          </span>
          Copy driver notes
        </AdminCopyTextButton>
      </div>
      <div
        className={`admin-delivery-card-copy-row admin-delivery-field-pair admin-delivery-field-pair--card${
          cardMessage.trim() ? '' : ' admin-delivery-field-pair--card-empty'
        }`}
      >
        <p
          className="admin-delivery-card-meta admin-delivery-card-meta--area admin-delivery-card-copy-row-text admin-delivery-card-meta--card-message admin-delivery-field-chip"
          title={cardMessage.trim() || 'N/A'}
        >
          <span className="material-symbols-outlined admin-delivery-meta-icon">card_giftcard</span>
          <span className="admin-delivery-field-body">
            <span className="admin-delivery-field-label">Card text:</span>{' '}
            {cardTextDisplayOrNone(cardMessage)}
          </span>
        </p>
        <AdminCopyTextButton
          text={cardMessage.trim() ? `Card text: ${cardMessage.trim()}` : ''}
          ariaLabel={cardMessage.trim() ? 'Copy card text' : 'No card text to copy'}
          className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-copy-action"
        >
          <span className="material-symbols-outlined admin-delivery-copy-action-ico" aria-hidden>
            content_copy
          </span>
          {cardMessage.trim() ? 'Copy card text' : 'No text'}
        </AdminCopyTextButton>
      </div>
    </div>
  );
}

function DeliveryCardPrimaryCopyActions({ order }: { order: SupabaseOrderRow }) {
  const driverMessengerText = buildDriverMessengerPlainText(order);
  const copyAllText = buildOrderSummaryPlainTextFromBoardOrder(order);
  return (
    <div className="admin-delivery-card-top-copy">
      <AdminCopyTextButton
        text={driverMessengerText}
        ariaLabel="Copy Thai message for driver"
        className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-copy-action admin-delivery-copy-action--driver"
      >
        Copy for driver
      </AdminCopyTextButton>
      <AdminCopyTextButton
        text={copyAllText}
        ariaLabel="Copy full order summary to clipboard"
        className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-copy-action admin-delivery-copy-action--all"
      >
        Copy all
      </AdminCopyTextButton>
    </div>
  );
}

function jsonItemTypePill(order: SupabaseOrderRow): string {
  const json = order.order_json as { items?: Array<{ itemType?: string }> } | null | undefined;
  const t = json?.items?.[0]?.itemType?.trim();
  if (t) return itemTypeDisplayLabel(t);
  return 'Bouquet';
}

function ContactNumberChip({
  label,
  phone,
  countryCode,
}: {
  label: string;
  phone: string | null | undefined;
  countryCode: string | null | undefined;
}) {
  const raw = phone?.trim() ?? '';
  const intl = phoneInternational(phone, countryCode);
  if (!intl && !raw) return null;
  const display = intl ?? raw;
  const copyText = (intl ?? raw).trim();
  return (
    <div className="admin-delivery-contact-chip">
      <span className="admin-delivery-contact-chip-role">{label}</span>
      <span className="admin-delivery-contact-chip-num" title={copyText || display}>
        {display}
      </span>
      <AdminCopyTextButton
        text={copyText || display}
        ariaLabel={`Copy ${label} number`}
        className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-contact-chip-copy"
      >
        <span className="material-symbols-outlined admin-delivery-contact-chip-copy-ico">content_copy</span>
      </AdminCopyTextButton>
    </div>
  );
}

function DeliveryCardContact({ order }: { order: SupabaseOrderRow }) {
  const cust = order.customer_name?.trim() ?? '';
  const rec = order.recipient_name?.trim() ?? '';
  const samePerson =
    Boolean(cust && rec && cust.localeCompare(rec, undefined, { sensitivity: 'base' }) === 0);
  const customerPhone = customerPhoneDisplay(order).trim();
  const recipientPhone = recipientPhoneDisplay(order).trim();
  const custPhoneLabel = customerPhone || MISSING_EN;
  const recPhoneLabel = recipientPhone || MISSING_EN;
  const customerDetailsForCopy = buildCustomerDetailsClipboardText(order);
  const recipientDetailsForCopy = buildRecipientDetailsClipboardText(order);

  const custTel = telHref(order.phone, order.phone_country_code);
  const custWa = whatsappHref(order.phone, order.phone_country_code);
  const customerLineId = customerLineIdDisplay(order);
  const custLineHref = getLineUserContactUrl(customerLineId);
  const recTel = telHref(order.recipient_phone, order.recipient_phone_country_code);
  const recWa = whatsappHref(order.recipient_phone, order.recipient_phone_country_code);
  const samePhone = e164Same(
    order.phone,
    order.phone_country_code,
    order.recipient_phone,
    order.recipient_phone_country_code
  );
  const hasCustPhone = Boolean(order.phone?.trim());
  const hasRecPhone = Boolean(order.recipient_phone?.trim()) && !samePhone;
  const hasCustLineId = Boolean(customerLineId);
  const hasNumbers = hasCustPhone || hasRecPhone || hasCustLineId;
  const showCustomer = Boolean(custTel || custWa || custLineHref);
  const showRecipient = Boolean((recTel || recWa) && !samePhone);
  const email = order.customer_email?.trim();
  const hasChannels = hasNumbers || showCustomer || showRecipient || Boolean(email);

  const partySummary = samePerson
    ? cust || 'No name'
    : [cust || null, rec || null].filter(Boolean).join(' · ') || 'No name';

  return (
    <details className="admin-delivery-contact-details">
      <summary className="admin-delivery-contact-summary">
        <span className="material-symbols-outlined admin-delivery-contact-summary-icon">contact_phone</span>
        Contact
        <span className="admin-delivery-contact-summary-snippet" title={partySummary}>
          {partySummary}
        </span>
        <span className="material-symbols-outlined admin-delivery-contact-chevron">expand_more</span>
      </summary>
      <div className="admin-delivery-contact-panel">
        <p className="admin-delivery-contact-group-label">People</p>
        <div className="admin-delivery-contact-party">
          {samePerson ? (
            <p className="admin-delivery-card-name-line">
              <span className="admin-delivery-card-name-role">Customer & recipient</span>
              <span className={`admin-delivery-card-name-value${cust ? '' : ' admin-hint'}`}>
                {cust || 'N/A'}
              </span>
              <span
                className={`admin-delivery-card-name-phone${customerPhone ? '' : ' admin-hint'}`}
                title={custPhoneLabel}
              >
                {custPhoneLabel}
              </span>
            </p>
          ) : (
            <>
              <p className="admin-delivery-card-name-line">
                <span className="admin-delivery-card-name-role">Customer</span>
                <span className={`admin-delivery-card-name-value${cust ? '' : ' admin-hint'}`}>
                  {cust || 'N/A'}
                </span>
                <span
                  className={`admin-delivery-card-name-phone${customerPhone ? '' : ' admin-hint'}`}
                  title={custPhoneLabel}
                >
                  {custPhoneLabel}
                </span>
              </p>
              <p className="admin-delivery-card-name-line">
                <span className="admin-delivery-card-name-role">Recipient</span>
                <span className={`admin-delivery-card-name-value${rec ? '' : ' admin-hint'}`}>
                  {rec || 'N/A'}
                </span>
                <span
                  className={`admin-delivery-card-name-phone${recipientPhone ? '' : ' admin-hint'}`}
                  title={recPhoneLabel}
                >
                  {recPhoneLabel}
                </span>
              </p>
            </>
          )}
          <div className="admin-delivery-card-copy-row admin-delivery-card-copy-row--actions-only admin-delivery-contact-party-copy">
            <AdminCopyTextButton
              text={customerDetailsForCopy}
              ariaLabel="Copy customer name and phone"
              className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-copy-action admin-delivery-copy-action--party"
            >
              <span className="material-symbols-outlined admin-delivery-copy-action-ico" aria-hidden>
                content_copy
              </span>
              Copy customer details
            </AdminCopyTextButton>
            <AdminCopyTextButton
              text={recipientDetailsForCopy}
              ariaLabel="Copy recipient name and phone"
              className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-copy-action admin-delivery-copy-action--party"
            >
              <span className="material-symbols-outlined admin-delivery-copy-action-ico" aria-hidden>
                content_copy
              </span>
              Copy recipient details
            </AdminCopyTextButton>
          </div>
        </div>

        {hasChannels ? (
          <>
            {hasNumbers ? (
              <div className="admin-delivery-contact-numbers">
                {hasCustPhone ? (
                  <ContactNumberChip label="Customer" phone={order.phone} countryCode={order.phone_country_code} />
                ) : null}
                {hasCustLineId ? (
                  <div className="admin-delivery-contact-chip">
                    <span className="admin-delivery-contact-chip-role">Customer LINE</span>
                    <span className="admin-delivery-contact-chip-num" title={customerLineId}>
                      {customerLineId}
                    </span>
                    <AdminCopyTextButton
                      text={customerLineId}
                      ariaLabel="Copy customer LINE ID"
                      className="admin-btn admin-btn-outline admin-copy-text-btn admin-delivery-contact-chip-copy"
                    >
                      <span className="material-symbols-outlined admin-delivery-contact-chip-copy-ico">
                        content_copy
                      </span>
                    </AdminCopyTextButton>
                  </div>
                ) : null}
                {hasRecPhone ? (
                  <ContactNumberChip
                    label="Recipient"
                    phone={order.recipient_phone}
                    countryCode={order.recipient_phone_country_code}
                  />
                ) : null}
              </div>
            ) : null}

            {showCustomer ? (
              <div className="admin-delivery-contact-actions">
                {custTel ? (
                  <a href={custTel} className="admin-delivery-contact-link admin-delivery-contact-link--compact">
                    <span className="material-symbols-outlined">call</span>
                    Call
                  </a>
                ) : null}
                {custWa ? (
                  <a
                    href={custWa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-delivery-contact-link admin-delivery-contact-link--compact"
                  >
                    <span className="material-symbols-outlined">chat</span>
                    WhatsApp
                  </a>
                ) : null}
                {custLineHref ? (
                  <a
                    href={custLineHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-delivery-contact-link admin-delivery-contact-link--compact"
                  >
                    <LineIcon size={20} className="admin-delivery-contact-line-ico" />
                    LINE
                  </a>
                ) : null}
              </div>
            ) : null}

            {showRecipient ? (
              <div className="admin-delivery-contact-actions">
                {recTel ? (
                  <a href={recTel} className="admin-delivery-contact-link admin-delivery-contact-link--compact">
                    <span className="material-symbols-outlined">call</span>
                    Call recipient
                  </a>
                ) : null}
                {recWa ? (
                  <a
                    href={recWa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-delivery-contact-link admin-delivery-contact-link--compact"
                  >
                    <span className="material-symbols-outlined">chat</span>
                    WhatsApp recipient
                  </a>
                ) : null}
              </div>
            ) : null}

            {email ? (
              <>
                <p className="admin-delivery-contact-group-label">Email</p>
                <a href={`mailto:${encodeURIComponent(email)}`} className="admin-delivery-contact-link">
                  <span className="material-symbols-outlined">mail</span>
                  {email}
                </a>
              </>
            ) : null}
          </>
        ) : (
          <p className="admin-delivery-contact-empty admin-hint">No phone or email on file</p>
        )}
      </div>
    </details>
  );
}

function DeliveryDriverAssignment({
  orderId,
  driverName,
  draftName,
  canAssignDriver,
  isSaving,
  message,
  onDraftChange,
  onAssign,
  onClear,
}: {
  orderId: string;
  driverName: string;
  draftName: string;
  canAssignDriver: boolean;
  isSaving: boolean;
  message?: { type: 'success' | 'error'; text: string };
  onDraftChange: (value: string) => void;
  onAssign: (value: string) => void;
  onClear: () => void;
}) {
  const assignedName = driverName.trim();
  const customName = draftName.trim();
  const canSaveCustom = Boolean(customName) && customName !== assignedName && !isSaving;

  const summaryAssignee = assignedName ? (
    <span className="admin-delivery-driver-summary-assignee" title={assignedName}>
      {assignedName}
    </span>
  ) : (
    <span className="admin-delivery-driver-summary-assignee admin-delivery-driver-summary-assignee--muted">Unassigned</span>
  );

  if (!canAssignDriver) {
    return assignedName ? (
      <details className="admin-delivery-contact-details admin-delivery-driver-control">
        <summary className="admin-delivery-contact-summary" aria-label={`Driver for ${orderId}`}>
          <span className="material-symbols-outlined admin-delivery-contact-summary-icon">local_shipping</span>
          Driver
          {summaryAssignee}
          <span className="material-symbols-outlined admin-delivery-contact-chevron">expand_more</span>
        </summary>
        <div className="admin-delivery-contact-panel">
          <p className="admin-delivery-contact-group-label">Assigned driver</p>
          <p className="admin-delivery-driver-panel-value">{assignedName}</p>
        </div>
      </details>
    ) : null;
  }

  return (
    <details className="admin-delivery-contact-details admin-delivery-driver-control" aria-label={`Driver assignment for ${orderId}`}>
      <summary className="admin-delivery-contact-summary">
        <span className="material-symbols-outlined admin-delivery-contact-summary-icon">local_shipping</span>
        Driver
        {summaryAssignee}
        <span className="material-symbols-outlined admin-delivery-contact-chevron">expand_more</span>
      </summary>
      <div className="admin-delivery-contact-panel admin-delivery-driver-panel">
        {assignedName ? (
          <>
            <p className="admin-delivery-contact-group-label">Current assignment</p>
            <p className="admin-delivery-driver-panel-value">{assignedName}</p>
          </>
        ) : null}
        <p className="admin-delivery-contact-group-label">{assignedName ? 'Change driver' : 'Assign driver'}</p>
        <div className="admin-delivery-driver-choices">
          {QUICK_DRIVER_NAMES.map((name) => {
            const selected = assignedName.localeCompare(name, undefined, { sensitivity: 'base' }) === 0;
            return (
              <button
                key={name}
                type="button"
                className={`admin-delivery-driver-choice${selected ? ' selected' : ''}`}
                onClick={() => onAssign(name)}
                disabled={isSaving || selected}
                aria-pressed={selected}
              >
                <span className="material-symbols-outlined">
                  {selected ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                {name}
              </button>
            );
          })}
        </div>
        <div className="admin-delivery-driver-custom">
          <input
            type="text"
            className="admin-input admin-delivery-driver-input"
            value={draftName}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Other driver name"
            aria-label={`Custom driver name for ${orderId}`}
            disabled={isSaving}
          />
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-delivery-driver-save"
            onClick={() => onAssign(customName)}
            disabled={!canSaveCustom}
          >
            Save
          </button>
          {assignedName ? (
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-outline admin-delivery-driver-clear"
              onClick={onClear}
              disabled={isSaving}
            >
              Clear
            </button>
          ) : null}
        </div>
        {isSaving ? <span className="admin-delivery-driver-message">Saving…</span> : null}
        {message ? (
          <span className={`admin-delivery-driver-message admin-delivery-driver-message--${message.type}`}>
            {message.text}
          </span>
        ) : null}
      </div>
    </details>
  );
}

function formatSupplierBoardAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return `฿${Number(value).toLocaleString()}`;
}

function DeliveryCardSupplierReply({
  orderId,
  order,
  summary,
}: {
  orderId: string;
  order: SupabaseOrderRow;
  summary: DeliveryBoardSupplierRequestSummary | undefined;
}) {
  if (!summary) return null;

  const statusLabel = supplierStatusLabelEnglish(summary.status);
  const responseLabel = supplierResponseLabelEnglish(summary.supplier_response_type);
  const summarySnippet =
    summary.supplier_response_type === 'PREPARE' ||
    summary.supplier_response_type === 'PREPARE_WITH_CHANGES' ||
    summary.supplier_response_type === 'DECLINE'
      ? responseLabel
      : statusLabel;

  const manageHref = `/admin/orders/${encodeURIComponent(orderId)}/supplier-requests`;
  const confirmedName = order.confirmed_supplier_shop_name?.trim();

  return (
    <details className="admin-delivery-contact-details admin-delivery-supplier-details">
      <summary className="admin-delivery-contact-summary" aria-label={`Supplier request for ${orderId}`}>
        <span className="material-symbols-outlined admin-delivery-contact-summary-icon">storefront</span>
        Supplier
        <span className="admin-delivery-supplier-summary-snippet" title={summary.shop_name_snapshot}>
          {summarySnippet}
        </span>
        <span className="material-symbols-outlined admin-delivery-contact-chevron">expand_more</span>
      </summary>
      <div className="admin-delivery-contact-panel admin-delivery-supplier-panel">
        <p className="admin-delivery-contact-group-label">Shop</p>
        <p className="admin-delivery-driver-panel-value">{summary.shop_name_snapshot}</p>

        <p className="admin-delivery-contact-group-label">Link status</p>
        <p className="admin-delivery-driver-panel-value">{statusLabel}</p>

        <p className="admin-delivery-contact-group-label">Supplier reply</p>
        <p className="admin-delivery-driver-panel-value">{responseLabel}</p>

        <p className="admin-delivery-contact-group-label">Price offered</p>
        <p className="admin-delivery-driver-panel-value">{formatSupplierBoardAmount(summary.supplier_price)}</p>

        <p className="admin-delivery-contact-group-label">Ready time</p>
        <p className="admin-delivery-driver-panel-value">
          {summary.supplier_ready_time?.trim() ? summary.supplier_ready_time.trim() : '—'}
        </p>

        {summary.supplier_reason?.trim() ? (
          <>
            <p className="admin-delivery-contact-group-label">Reason / conditions</p>
            <p className="admin-delivery-supplier-text-block">{summary.supplier_reason.trim()}</p>
          </>
        ) : null}

        {summary.supplier_notes?.trim() ? (
          <>
            <p className="admin-delivery-contact-group-label">Notes</p>
            <p className="admin-delivery-supplier-text-block">{summary.supplier_notes.trim()}</p>
          </>
        ) : null}

        <p className="admin-delivery-contact-group-label">Responded at</p>
        <p className="admin-delivery-driver-panel-value">{formatShopDateTime(summary.responded_at)}</p>

        {confirmedName ? (
          <>
            <p className="admin-delivery-contact-group-label">Approved on order</p>
            <p className="admin-delivery-driver-panel-value">
              {confirmedName}
              {order.confirmed_supplier_price != null
                ? ` · ${formatSupplierBoardAmount(order.confirmed_supplier_price)}`
                : ''}
              {order.confirmed_supplier_ready_time?.trim()
                ? ` · Ready ${order.confirmed_supplier_ready_time.trim()}`
                : ''}
            </p>
          </>
        ) : null}

        <Link
          href={manageHref}
          className="admin-delivery-contact-link admin-delivery-contact-link--compact"
        >
          <span className="material-symbols-outlined">assignment</span>
          Supplier requests
        </Link>
      </div>
    </details>
  );
}

function e164Same(
  a: string | null | undefined,
  acc: string | null | undefined,
  b: string | null | undefined,
  bcc: string | null | undefined
): boolean {
  const da = e164Digits(a, acc);
  const db = e164Digits(b, bcc);
  return Boolean(da && db && da === db);
}

export function DeliveryBoardClient({
  initialOrders,
  initialTotal,
  initialError,
  initialFilters,
  boardDateFrom,
  boardDateTo,
  searchDateFrom,
  searchDateTo,
  searchAllDates = false,
  pipelineOpen = false,
  openDeliverySummary,
  initialPage,
  pageSize,
  districts,
  deliveryDestinations,
  canEditStatus,
  canAssignDriver,
  supplierSummariesByOrderId = {},
  orderChatEnabled = false,
  appBaseUrl = '',
}: DeliveryBoardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sp = searchParams ?? new URLSearchParams();
  const returnTo = `${pathname}${sp.toString() ? `?${sp.toString()}` : ''}`;

  const today = shopTodayYmd();
  const dateFrom = boardDateFrom || today;
  const dateTo = boardDateTo || dateFrom;
  const rangeSingleDay = dateFrom === dateTo;
  const dateNavLocked = searchAllDates || pipelineOpen;

  const [searchDraft, setSearchDraft] = useState(initialFilters.q ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hideDelivered, setHideDelivered] = useState(true);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, OrderStatus>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
  const [statusMessages, setStatusMessages] = useState<
    Record<string, { type: 'success' | 'error'; text: string } | undefined>
  >({});
  const [driverNameOverrides, setDriverNameOverrides] = useState<Record<string, string | null | undefined>>({});
  const [driverDrafts, setDriverDrafts] = useState<Record<string, string | undefined>>({});
  const [savingDriver, setSavingDriver] = useState<Record<string, boolean>>({});
  const [driverMessages, setDriverMessages] = useState<
    Record<string, { type: 'success' | 'error'; text: string } | undefined>
  >({});
  const [deliveredPreview, setDeliveredPreview] = useState<{
    orderId: string;
    preview: DeliveredPreviewPayload;
  } | null>(null);
  const [chatUnreadByOrder, setChatUnreadByOrder] = useState<Record<string, number>>({});

  useEffect(() => {
    setSearchDraft(initialFilters.q ?? '');
  }, [initialFilters.q]);

  useEffect(() => {
    if (!orderChatEnabled) return;
    let cancelled = false;
    async function loadUnread() {
      try {
        const res = await fetch('/api/admin/orders/chat-unread', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          byOrderId?: Record<string, number>;
        } | null;
        if (cancelled) return;
        setChatUnreadByOrder(data?.byOrderId ?? {});
      } catch {
        /* ignore */
      }
    }
    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderChatEnabled]);

  const sortedOrders = useMemo(
    () => sortOrdersForBoard(initialOrders),
    [initialOrders]
  );
  const effectiveOrders = useMemo(
    () =>
      sortedOrders.map((o) => {
        const override = statusOverrides[o.order_id];
        return override ? { ...o, order_status: override } : o;
      }),
    [sortedOrders, statusOverrides]
  );
  const visibleOrders = useMemo(() => {
    if (!hideDelivered) return effectiveOrders;
    return effectiveOrders.filter((o) => !isDeliveredStatus(o.order_status));
  }, [effectiveOrders, hideDelivered]);
  const deliveredHiddenCount = useMemo(
    () => effectiveOrders.filter((o) => isDeliveredStatus(o.order_status)).length,
    [effectiveOrders]
  );
  const grouped = useMemo(() => groupOrdersByDayPart(visibleOrders), [visibleOrders]);
  const groupedByDate = useMemo(() => groupOrdersByDeliveryDate(visibleOrders), [visibleOrders]);
  const groupByDate = searchAllDates || pipelineOpen || dateFrom !== dateTo;
  const mapMarkers = useMemo(() => buildMapMarkers(visibleOrders), [visibleOrders]);

  const statInProgress = visibleOrders.filter((o) => isOpenPipelineStatus(o.order_status)).length;
  const statDelivered = effectiveOrders.filter((o) => isDeliveredStatus(o.order_status)).length;
  const statMorning = grouped.morning.length;
  const statAfternoon = grouped.midday.length + grouped.afternoon.length + grouped.evening.length;

  const stripDays = useMemo(() => {
    if (!dateNavLocked && dateFrom !== dateTo) {
      const days: string[] = [];
      let d = dateFrom;
      for (let i = 0; i < 14 && d <= dateTo; i += 1) {
        days.push(d);
        d = shopAddDays(d, 1);
      }
      return days;
    }
    const center = rangeSingleDay && !dateNavLocked ? dateFrom : today;
    return Array.from({ length: 7 }, (_, i) => shopAddDays(center, i - 3));
  }, [dateNavLocked, rangeSingleDay, dateFrom, dateTo, today]);

  const tomorrowYmd = shopAddDays(today, 1);
  const weekEndYmd = shopAddDays(today, 6);
  const countsByDate = openDeliverySummary.countsByDate;
  const countForDay = (ymd: string) => countsByDate[ymd] ?? 0;
  const countInRange = (from: string, to: string) => {
    let n = 0;
    for (const [ymd, c] of Object.entries(countsByDate)) {
      if (ymd >= from && ymd <= to) n += c;
    }
    return n;
  };
  const tomorrowOpenCount = countForDay(tomorrowYmd);
  const weekOpenCount = countInRange(today, weekEndYmd);
  const hasUpcomingOpen = openDeliverySummary.upcomingCount > 0;
  const overduePreview = openDeliverySummary.overdue.slice(0, 5);
  const ordersStatLabel = searchAllDates
    ? 'Matches'
    : pipelineOpen
      ? 'Open deliveries'
      : dateFrom === today && dateTo === today
        ? 'Today orders'
        : 'Orders';

  const totalPages = Math.ceil(initialTotal / pageSize) || 1;

  const replaceParams = (next: URLSearchParams) => {
    router.replace(`/admin/orders?${next.toString()}`, { scroll: false });
  };

  const handleFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    next.delete('pipeline');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    replaceParams(next);
  };

  const setDateRange = (from: string, to: string) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    next.delete('q');
    next.delete('pipeline');
    next.set('dateFrom', from);
    next.set('dateTo', to);
    setSearchDraft('');
    replaceParams(next);
  };

  const setSearchDates = (from: string | undefined, to: string | undefined) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    if (from) next.set('dateFrom', from);
    else next.delete('dateFrom');
    if (to) next.set('dateTo', to);
    else next.delete('dateTo');
    replaceParams(next);
  };

  const clearSearchDates = () => {
    setSearchDates(undefined, undefined);
  };

  const applyPreset = (preset: 'today' | 'tomorrow' | 'week') => {
    const t = shopTodayYmd();
    if (preset === 'today') setDateRange(t, t);
    else if (preset === 'tomorrow') {
      const tm = shopAddDays(t, 1);
      setDateRange(tm, tm);
    } else {
      setDateRange(t, shopAddDays(t, 6));
    }
  };

  const presetActive = (): 'today' | 'tomorrow' | 'week' | null => {
    if (dateNavLocked) return null;
    const t = shopTodayYmd();
    if (dateFrom === t && dateTo === t) return 'today';
    if (dateFrom === shopAddDays(t, 1) && dateTo === shopAddDays(t, 1)) return 'tomorrow';
    if (dateFrom === t && dateTo === shopAddDays(t, 6)) return 'week';
    return null;
  };

  const submitSearch = (e?: FormEvent) => {
    e?.preventDefault();
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    next.delete('orderId');
    next.delete('recipientPhone');
    next.delete('pipeline');
    const q = searchDraft.trim();
    if (q) {
      next.set('q', q);
      if (!searchAllDates) {
        next.delete('dateFrom');
        next.delete('dateTo');
      }
    } else {
      next.delete('q');
      next.set('dateFrom', today);
      next.set('dateTo', today);
    }
    replaceParams(next);
  };

  const clearSearch = () => {
    setSearchDraft('');
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    next.delete('q');
    next.delete('orderId');
    next.delete('recipientPhone');
    next.set('dateFrom', today);
    next.set('dateTo', today);
    replaceParams(next);
  };

  const viewAllOpen = () => {
    const next = new URLSearchParams();
    next.set('pipeline', 'open');
    setSearchDraft('');
    replaceParams(next);
  };

  const viewOrderOnBoard = (deliveryDate: string | null | undefined) => {
    const ymd = deliveryDate?.trim();
    if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      setDateRange(ymd, ymd);
      return;
    }
    viewAllOpen();
  };

  const handleDeliveryStatusChange = async (order: SupabaseOrderRow, nextStatus: string) => {
    if (!canEditStatus) return;
    const normalized = normalizeOrderStatus(nextStatus);
    const previousStatus = normalizeOrderStatus(order.order_status);
    if (normalized === previousStatus || savingStatus[order.order_id]) return;

    setStatusOverrides((current) => ({ ...current, [order.order_id]: normalized }));
    setSavingStatus((current) => ({ ...current, [order.order_id]: true }));
    setStatusMessages((current) => ({ ...current, [order.order_id]: undefined }));

    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.order_id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: normalized }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deliveredEmailPreview?: DeliveredPreviewPayload | null;
      };
      if (!res.ok) {
        setStatusOverrides((current) => ({ ...current, [order.order_id]: previousStatus }));
        setStatusMessages((current) => ({
          ...current,
          [order.order_id]: { type: 'error', text: data.error ?? 'Failed to update' },
        }));
        return;
      }

      setStatusMessages((current) => ({
        ...current,
        [order.order_id]: { type: 'success', text: 'Saved' },
      }));
      setTimeout(() => {
        setStatusMessages((current) => ({ ...current, [order.order_id]: undefined }));
      }, 3000);
      if (data.deliveredEmailPreview?.outboxId) {
        setDeliveredPreview({ orderId: order.order_id, preview: data.deliveredEmailPreview });
      }
      router.refresh();
    } catch (e) {
      setStatusOverrides((current) => ({ ...current, [order.order_id]: previousStatus }));
      setStatusMessages((current) => ({
        ...current,
        [order.order_id]: {
          type: 'error',
          text: e instanceof Error ? e.message : 'Network error',
        },
      }));
    } finally {
      setSavingStatus((current) => ({ ...current, [order.order_id]: false }));
    }
  };

  const handleDriverAssignmentChange = async (order: SupabaseOrderRow, nextDriverName: string) => {
    if (!canAssignDriver || savingDriver[order.order_id]) return;
    const trimmedName = nextDriverName.trim();
    const currentOverride = driverNameOverrides[order.order_id];
    const previousName =
      currentOverride === undefined ? order.driver_name?.trim() ?? '' : currentOverride?.trim() ?? '';

    if (trimmedName === previousName) return;

    setDriverNameOverrides((current) => ({ ...current, [order.order_id]: trimmedName || null }));
    setDriverDrafts((current) => ({ ...current, [order.order_id]: trimmedName }));
    setSavingDriver((current) => ({ ...current, [order.order_id]: true }));
    setDriverMessages((current) => ({ ...current, [order.order_id]: undefined }));

    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.order_id)}/driver-assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_name: trimmedName || null }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        order?: { driver_name?: string | null };
      };

      if (!res.ok) {
        setDriverNameOverrides((current) => ({ ...current, [order.order_id]: previousName || null }));
        setDriverDrafts((current) => ({ ...current, [order.order_id]: previousName }));
        setDriverMessages((current) => ({
          ...current,
          [order.order_id]: { type: 'error', text: data.error ?? 'Failed to update driver' },
        }));
        return;
      }

      const savedName = data.order?.driver_name?.trim() ?? '';
      setDriverNameOverrides((current) => ({ ...current, [order.order_id]: savedName || null }));
      setDriverDrafts((current) => ({ ...current, [order.order_id]: savedName }));
      setDriverMessages((current) => ({
        ...current,
        [order.order_id]: { type: 'success', text: savedName ? 'Driver saved' : 'Driver cleared' },
      }));
      setTimeout(() => {
        setDriverMessages((current) => ({ ...current, [order.order_id]: undefined }));
      }, 3000);
      router.refresh();
    } catch (e) {
      setDriverNameOverrides((current) => ({ ...current, [order.order_id]: previousName || null }));
      setDriverDrafts((current) => ({ ...current, [order.order_id]: previousName }));
      setDriverMessages((current) => ({
        ...current,
        [order.order_id]: {
          type: 'error',
          text: e instanceof Error ? e.message : 'Network error',
        },
      }));
    } finally {
      setSavingDriver((current) => ({ ...current, [order.order_id]: false }));
    }
  };

  const detailHref = (orderId: string) => {
    const base = `/admin/orders/${encodeURIComponent(orderId)}`;
    if (returnTo) return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
    return base;
  };

  const toggleSection = (id: string) => {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  };

  const dayPartSections: { id: string; title: string; count: number; orders: SupabaseOrderRow[]; icon: string }[] = [
    { id: 'morning', title: 'Morning', count: grouped.morning.length, orders: grouped.morning, icon: 'wb_sunny' },
    {
      id: 'midday',
      title: 'Midday',
      count: grouped.midday.length,
      orders: grouped.midday,
      icon: 'light_mode',
    },
    {
      id: 'afternoon',
      title: 'Afternoon',
      count: grouped.afternoon.length,
      orders: grouped.afternoon,
      icon: 'wb_twilight',
    },
    {
      id: 'evening',
      title: 'Evening',
      count: grouped.evening.length,
      orders: grouped.evening,
      icon: 'nights_stay',
    },
    {
      id: 'unknown',
      title: 'Time not set',
      count: grouped.unknown.length,
      orders: grouped.unknown,
      icon: 'schedule',
    },
  ].filter((s) => s.count > 0);

  const sections = groupByDate
    ? groupedByDate.map((g) => ({
        id: g.date ? `date-${g.date}` : 'date-unknown',
        title: g.date ? formatDeliveryDateCard(g.date) : 'Date not set',
        count: g.orders.length,
        orders: g.orders,
        icon: 'calendar_today',
      }))
    : dayPartSections;

  return (
    <div className="admin-delivery-board">
      <header className="admin-header admin-page-header admin-delivery-board-header">
        <div>
          <h1 className="admin-title admin-delivery-board-title">Delivery Board</h1>
        </div>
      </header>

      {openDeliverySummary.overdueCount > 0 ? (
        <div className="admin-open-delivery-alert admin-open-delivery-alert--overdue" role="status">
          <span className="material-symbols-outlined admin-open-delivery-alert-icon" aria-hidden>
            error
          </span>
          <div className="admin-open-delivery-alert-body">
            <p className="admin-open-delivery-alert-title">
              {openDeliverySummary.overdueCount} overdue{' '}
              {openDeliverySummary.overdueCount === 1 ? 'delivery' : 'deliveries'} still open
            </p>
            {overduePreview.length > 0 ? (
              <ul className="admin-open-delivery-alert-list">
                {overduePreview.map((o) => (
                  <li key={o.order_id}>
                    <Link
                      href={detailHref(o.order_id)}
                      className="admin-link"
                    >
                      {o.order_id}
                    </Link>
                    <span className="admin-open-delivery-alert-date">
                      {formatDeliveryDateCard(o.delivery_date)}
                    </span>
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      onClick={() => viewOrderOnBoard(o.delivery_date)}
                    >
                      View on board
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {openDeliverySummary.upcomingCount > 0 ? (
              <p className="admin-open-delivery-alert-extra">
                Also {openDeliverySummary.upcomingCount} upcoming open{' '}
                {openDeliverySummary.upcomingCount === 1 ? 'delivery' : 'deliveries'}.
              </p>
            ) : null}
            {pipelineOpen ? null : (
              <button type="button" className="admin-link admin-open-delivery-alert-all" onClick={viewAllOpen}>
                View all open →
              </button>
            )}
          </div>
        </div>
      ) : openDeliverySummary.upcomingCount > 0 ? (
        <div className="admin-open-delivery-alert admin-open-delivery-alert--upcoming" role="status">
          <span className="material-symbols-outlined admin-open-delivery-alert-icon" aria-hidden>
            event_upcoming
          </span>
          <div className="admin-open-delivery-alert-body">
            <p className="admin-open-delivery-alert-title">
              {openDeliverySummary.upcomingCount} upcoming open{' '}
              {openDeliverySummary.upcomingCount === 1 ? 'delivery' : 'deliveries'}
            </p>
            <p className="admin-open-delivery-alert-extra">
              Count badges on dates show which days still need delivery.
            </p>
            {pipelineOpen ? null : (
              <button type="button" className="admin-link admin-open-delivery-alert-all" onClick={viewAllOpen}>
                View all open →
              </button>
            )}
          </div>
        </div>
      ) : null}

      <div className="admin-delivery-board-toolbar">
        <div className="admin-delivery-board-segments" role="tablist" aria-label="Date range presets">
          {(
            [
              ['today', 'Today', 0],
              ['tomorrow', 'Tomorrow', tomorrowOpenCount],
              ['week', 'This week', weekOpenCount],
            ] as const
          ).map(([key, label, badge]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={presetActive() === key}
              className={`admin-delivery-board-segment ${presetActive() === key ? 'active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              {label}
              {key !== 'today' && badge > 0 ? (
                <span className="admin-delivery-board-segment-badge" aria-label={`${badge} open deliveries`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="admin-delivery-board-date-actions">
          <label
            className={`admin-delivery-board-calendar-btn${hasUpcomingOpen ? ' has-upcoming' : ''}`}
            title={hasUpcomingOpen ? 'Upcoming open deliveries' : 'Pick a single day'}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <input
              type="date"
              className="admin-delivery-board-date-input"
              value={rangeSingleDay && !dateNavLocked ? dateFrom : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v) setDateRange(v, v);
              }}
              aria-label="Pick a single day"
            />
          </label>
          <a
            href={`/api/admin/orders/export?${sp.toString()}`}
            className="admin-btn admin-btn-outline admin-delivery-board-export"
            download
            aria-label="Export CSV"
            title="Export CSV"
          >
            <span className="material-symbols-outlined admin-shell-icon" style={{ fontSize: 18 }}>
              download
            </span>
            <span className="sr-only">Export CSV</span>
          </a>
        </div>
      </div>

      <div className="admin-delivery-board-stats">
        <div className="admin-delivery-stat admin-delivery-stat--orders">
          <span className="material-symbols-outlined admin-delivery-stat-icon">shopping_bag</span>
          <div>
            <span className="admin-delivery-stat-value">{initialTotal}</span>
            <span className="admin-delivery-stat-label">{ordersStatLabel}</span>
          </div>
        </div>
        <div className="admin-delivery-stat admin-delivery-stat--progress">
          <span className="material-symbols-outlined admin-delivery-stat-icon">local_shipping</span>
          <div>
            <span className="admin-delivery-stat-value">{statInProgress}</span>
            <span className="admin-delivery-stat-label">In progress</span>
          </div>
        </div>
        <div className="admin-delivery-stat admin-delivery-stat--delivered">
          <span className="material-symbols-outlined admin-delivery-stat-icon">check_circle</span>
          <div>
            <span className="admin-delivery-stat-value">{statDelivered}</span>
            <span className="admin-delivery-stat-label">Delivered</span>
          </div>
        </div>
        <div className="admin-delivery-stat admin-delivery-stat--morning">
          <span className="material-symbols-outlined admin-delivery-stat-icon">wb_sunny</span>
          <div>
            <span className="admin-delivery-stat-value">{statMorning}</span>
            <span className="admin-delivery-stat-label">Morning</span>
          </div>
        </div>
        <div className="admin-delivery-stat admin-delivery-stat--pm">
          <span className="material-symbols-outlined admin-delivery-stat-icon">wb_twilight</span>
          <div>
            <span className="admin-delivery-stat-value">{statAfternoon}</span>
            <span className="admin-delivery-stat-label">Afternoon + evening</span>
          </div>
        </div>
      </div>

      <div className="admin-delivery-board-strip-wrap">
        <div className="admin-delivery-board-strip">
          {stripDays.map((ymd) => {
            const isExactDay = !dateNavLocked && ymd === dateFrom && ymd === dateTo;
            const isInRange =
              !dateNavLocked && dateFrom !== dateTo && ymd >= dateFrom && ymd <= dateTo;
            const isSelected = isExactDay || isInRange;
            const isTodayCell = ymd === today;
            const openCount = countForDay(ymd);
            const isOverdueDay = ymd < today && openCount > 0;
            const label =
              isTodayCell
                ? 'Today'
                : new Intl.DateTimeFormat('en-GB', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'Asia/Bangkok',
                  }).format(new Date(`${ymd}T12:00:00+07:00`));
            return (
              <button
                key={ymd}
                type="button"
                className={`admin-delivery-strip-day${isSelected ? ' selected' : ''}${
                  isTodayCell ? ' is-today' : ''
                }${openCount > 0 ? ' has-open' : ''}${isOverdueDay ? ' is-overdue' : ''}`}
                data-is-today={isTodayCell ? 'true' : undefined}
                aria-current={isSelected ? 'date' : undefined}
                aria-label={
                  openCount > 0
                    ? `${label}, ${openCount} open ${openCount === 1 ? 'delivery' : 'deliveries'}`
                    : label
                }
                onClick={() => setDateRange(ymd, ymd)}
              >
                <span className="admin-delivery-strip-label">{label}</span>
                {openCount > 0 ? (
                  <span
                    className={`admin-delivery-strip-count${
                      isOverdueDay ? ' admin-delivery-strip-count--overdue' : ' admin-delivery-strip-count--upcoming'
                    }`}
                    aria-hidden
                  >
                    {openCount > 99 ? '99+' : openCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {searchAllDates ? (
        <p className="admin-hint admin-delivery-board-range-hint">
          Searching by name, order ID, or phone
          {searchDateFrom || searchDateTo ? (
            <>
              {' '}
              from <strong>{searchDateFrom || 'any date'}</strong> to{' '}
              <strong>{searchDateTo || 'any date'}</strong>
            </>
          ) : (
            <> — all dates</>
          )}
          . <strong>{initialTotal}</strong> {initialTotal === 1 ? 'match' : 'matches'}.
        </p>
      ) : pipelineOpen ? (
        <p className="admin-hint admin-delivery-board-range-hint">
          Showing all paid deliveries that are not delivered or cancelled
          {openDeliverySummary.total > initialTotal
            ? ` (${initialTotal} of ${openDeliverySummary.total} on this page)`
            : null}
          .
        </p>
      ) : dateFrom !== dateTo ? (
        <p className="admin-hint admin-delivery-board-range-hint">
          Showing deliveries from <strong>{dateFrom}</strong> to <strong>{dateTo}</strong>, grouped by
          day.
        </p>
      ) : null}

      <form className="admin-delivery-board-search-row" onSubmit={submitSearch}>
        <div className="admin-delivery-board-search-field">
          <span className="material-symbols-outlined admin-delivery-search-icon">search</span>
          <input
            type="search"
            className="admin-input admin-delivery-board-search"
            placeholder="Search by name, order ID, or phone"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            aria-label="Search orders by recipient, sender, order ID, or phone"
          />
        </div>
        <button type="submit" className="admin-btn admin-btn-sm">
          Search
        </button>
        {searchAllDates || searchDraft.trim() ? (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={clearSearch}>
            Clear search
          </button>
        ) : null}
        <button
          type="button"
          className={`admin-btn admin-btn-sm admin-delivery-filter-toggle ${filtersOpen ? 'admin-btn-primary' : ''}`}
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            filter_list
          </span>
          Filters
        </button>
        <label className="admin-checkbox-row admin-delivery-hide-delivered">
          <input
            type="checkbox"
            className="admin-checkbox"
            checked={hideDelivered}
            onChange={(e) => setHideDelivered(e.target.checked)}
          />
          <span>Hide delivered</span>
        </label>
      </form>

      {searchAllDates ? (
        <div className="admin-delivery-search-dates">
          <span className="admin-delivery-search-dates-label">Time frame</span>
          <label className="admin-delivery-search-date-field">
            <span>From</span>
            <input
              type="date"
              className="admin-input admin-input-date"
              value={searchDateFrom ?? ''}
              onChange={(e) => setSearchDates(e.target.value || undefined, searchDateTo)}
              aria-label="Search from delivery date"
            />
          </label>
          <span className="admin-delivery-search-dates-sep" aria-hidden>
            –
          </span>
          <label className="admin-delivery-search-date-field">
            <span>To</span>
            <input
              type="date"
              className="admin-input admin-input-date"
              value={searchDateTo ?? ''}
              onChange={(e) => setSearchDates(searchDateFrom, e.target.value || undefined)}
              aria-label="Search to delivery date"
            />
          </label>
          {searchDateFrom || searchDateTo ? (
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={clearSearchDates}
            >
              All time
            </button>
          ) : (
            <span className="admin-hint">All time</span>
          )}
        </div>
      ) : null}

      {hideDelivered && deliveredHiddenCount > 0 ? (
        <p className="admin-hint admin-delivery-hide-delivered-hint">
          {deliveredHiddenCount} delivered {deliveredHiddenCount === 1 ? 'order' : 'orders'} hidden on this page.
        </p>
      ) : null}

      {filtersOpen ? (
        <div className="admin-delivery-filters-panel">
          <FiltersBar
            filters={{
              ...initialFilters,
              deliveryDateFrom: dateFrom,
              deliveryDateTo: dateTo,
            }}
            districts={districts}
            deliveryDestinations={deliveryDestinations}
            onFilterChange={handleFilterChange}
          />
        </div>
      ) : null}

      {initialError ? (
        <div className="admin-error">
          <p>
            <strong>Error loading orders</strong>
          </p>
          <p>{initialError}</p>
          <p className="admin-error-hint">Check Supabase configuration and server logs.</p>
        </div>
      ) : (
        <>
          {visibleOrders.length === 0 ? (
            <p className="admin-empty">
              {sortedOrders.length > 0 && hideDelivered ? (
                <>
                  Every order on this page is marked delivered. Uncheck <strong>Hide delivered</strong> to see them,
                  or adjust filters.
                </>
              ) : (
                <>
                  {searchAllDates
                    ? 'No orders match this search. Try a different name, order ID, or phone.'
                    : pipelineOpen
                      ? 'No open paid deliveries.'
                      : 'No orders in this range. Try another day or clear filters.'}
                </>
              )}
            </p>
          ) : (
            <div className="admin-delivery-sections">
              {sections.map((sec) => {
                const isCollapsed = collapsed[sec.id];
                return (
                  <section key={sec.id} className="admin-delivery-section">
                    <button
                      type="button"
                      className="admin-delivery-section-head"
                      onClick={() => toggleSection(sec.id)}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="material-symbols-outlined admin-delivery-section-icon">{sec.icon}</span>
                      <span className="admin-delivery-section-title">
                        {sec.title} ({sec.count})
                      </span>
                      <span className="material-symbols-outlined admin-delivery-section-chevron">
                        {isCollapsed ? 'expand_more' : 'expand_less'}
                      </span>
                    </button>
                    {!isCollapsed ? (
                      <ul className="admin-delivery-card-list">
                        {sec.orders.map((o) => {
                          const productThumbs = orderProductThumbPreviews(o);
                          const hasMultipleImages = productThumbs.length > 1;
                          const productLabel = firstLineProductLabel(o);
                          const singleSpecLine =
                            productThumbs.length === 1
                              ? productThumbs[0]?.spec ?? firstLineItemSpecSummary(o)
                              : null;
                          const cardStatusClass = deliveryCardStatusClass(o.order_status);
                          const flowBadgeStatusClass = deliveryFlowBadgeStatusClass(o.order_status);
                          const paid = (o.payment_status ?? '').toUpperCase() === 'PAID';
                          const hasCardMessage = orderHasCustomerCardMessage(o);
                          const isSavingStatus = Boolean(savingStatus[o.order_id]);
                          const statusMessage = statusMessages[o.order_id];
                          const driverNameOverride = driverNameOverrides[o.order_id];
                          const driverName =
                            driverNameOverride === undefined ? o.driver_name?.trim() ?? '' : driverNameOverride?.trim() ?? '';
                          const driverDraft = driverDrafts[o.order_id] ?? driverName;
                          const isSavingDriver = Boolean(savingDriver[o.order_id]);
                          const driverMessage = driverMessages[o.order_id];
                          return (
                            <li key={o.order_id} className="admin-delivery-card-wrap">
                              <div className={`admin-delivery-card ${cardStatusClass}`}>
                                <div className="admin-delivery-card-thumb">
                                  {productThumbs.length > 0 ? (
                                    <div
                                      className={`admin-delivery-card-thumb-visual${
                                        hasMultipleImages ? ' admin-delivery-card-thumb-visual--multi' : ''
                                      }`}
                                    >
                                      {productThumbs.map((thumb, index) => (
                                        <div
                                          key={`${o.order_id}-${index}`}
                                          className="admin-delivery-card-product"
                                        >
                                          <a
                                            href={thumb.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="admin-delivery-card-mini-img-wrap"
                                            title="Open image in new tab"
                                          >
                                            <Image
                                              src={thumb.imageUrl}
                                              alt={thumb.label}
                                              fill
                                              sizes="112px"
                                              className="admin-delivery-card-mini-img"
                                              unoptimized
                                            />
                                          </a>
                                          <p className="admin-delivery-card-thumb-caption">{thumb.label}</p>
                                          {thumb.spec ? (
                                            <p className="admin-delivery-card-thumb-spec">{thumb.spec}</p>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="admin-delivery-card-thumb-visual">
                                      <div className="admin-delivery-card-thumb-placeholder">
                                        <span className="material-symbols-outlined">local_florist</span>
                                      </div>
                                    </div>
                                  )}
                                  {productThumbs.length === 0 ? (
                                    <>
                                      <p className="admin-delivery-card-thumb-caption">{productLabel}</p>
                                      {singleSpecLine ? (
                                        <p className="admin-delivery-card-thumb-spec">{singleSpecLine}</p>
                                      ) : null}
                                    </>
                                  ) : null}
                                  <div className="admin-delivery-card-thumb-status">
                                    <span
                                      className={`admin-delivery-badge-pay ${paid ? 'paid' : 'unpaid'}`}
                                    >
                                      {paid ? 'Paid' : formatPaymentStatus(o.payment_status)}
                                    </span>
                                    {canEditStatus ? (
                                      <div className="admin-delivery-status-control">
                                        <label className="sr-only" htmlFor={`delivery-status-${o.order_id}`}>
                                          Order status for {o.order_id}
                                        </label>
                                        <select
                                          id={`delivery-status-${o.order_id}`}
                                          className={`admin-delivery-status-select ${flowBadgeStatusClass}`}
                                          value={normalizeOrderStatus(o.order_status)}
                                          onChange={(e) => handleDeliveryStatusChange(o, e.target.value)}
                                          disabled={isSavingStatus}
                                          aria-label={`Order status for ${o.order_id}`}
                                        >
                                          {ORDER_STATUS.map((s) => (
                                            <option key={s} value={s}>
                                              {ORDER_STATUS_LABELS[s]}
                                            </option>
                                          ))}
                                        </select>
                                        {isSavingStatus ? (
                                          <span className="admin-delivery-status-saving">Saving…</span>
                                        ) : null}
                                        {statusMessage ? (
                                          <span
                                            className={`admin-delivery-status-message admin-delivery-status-message--${statusMessage.type}`}
                                          >
                                            {statusMessage.text}
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <span className={`admin-delivery-badge-flow ${flowBadgeStatusClass}`}>
                                        {workflowLabel(o.order_status)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="admin-delivery-card-body">
                                  <div className="admin-delivery-card-header-row">
                                    <p className="admin-delivery-card-id">{o.order_id}</p>
                                    <DeliveryCardPrimaryCopyActions order={o} />
                                  </div>
                                  <div className="admin-delivery-card-top">
                                    <div className="admin-delivery-card-top-text">
                                      <div
                                        className="admin-delivery-card-datetime"
                                        aria-label="Delivery date and time window"
                                      >
                                        <div className="admin-delivery-card-datetime-row">
                                          <span className="material-symbols-outlined admin-delivery-datetime-icon">
                                            calendar_today
                                          </span>
                                          <span className="admin-delivery-card-date">
                                            {formatDeliveryDateCard(o.delivery_date)}
                                          </span>
                                        </div>
                                        <div className="admin-delivery-card-time-window">
                                          <span className="material-symbols-outlined admin-delivery-datetime-icon">
                                            schedule
                                          </span>
                                          <span className="admin-delivery-card-time">
                                            {formatDeliveryWindowLabel(o.delivery_window)}
                                          </span>
                                        </div>
                                      </div>
                                      <DeliveryCardAddress order={o} />
                                    </div>
                                    <div className="admin-delivery-card-badges">
                                      <DeliveryDriverAssignment
                                        orderId={o.order_id}
                                        driverName={driverName}
                                        draftName={driverDraft}
                                        canAssignDriver={canAssignDriver}
                                        isSaving={isSavingDriver}
                                        message={driverMessage}
                                        onDraftChange={(value) =>
                                          setDriverDrafts((current) => ({ ...current, [o.order_id]: value }))
                                        }
                                        onAssign={(value) => handleDriverAssignmentChange(o, value)}
                                        onClear={() => handleDriverAssignmentChange(o, '')}
                                      />
                                    </div>
                                  </div>
                                  <DeliveryCardContact order={o} />
                                  <DeliveryCardSupplierReply
                                    orderId={o.order_id}
                                    order={o}
                                    summary={supplierSummariesByOrderId[o.order_id]}
                                  />
                                  <div className="admin-delivery-card-bottom">
                                    <div className="admin-delivery-card-bottom-pills">
                                      <span className="admin-delivery-product-pill">
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                          inventory_2
                                        </span>
                                        {jsonItemTypePill(o)}
                                      </span>
                                      <span
                                        className={`admin-delivery-gift-card-pill${hasCardMessage ? ' admin-delivery-gift-card-pill--yes' : ' admin-delivery-gift-card-pill--na'}`}
                                        title={hasCardMessage ? 'Customer provided card / gift message' : undefined}
                                      >
                                        <span className="material-symbols-outlined admin-delivery-gift-card-pill-ico">
                                          card_giftcard
                                        </span>
                                        {hasCardMessage ? 'Card message' : 'Gift card N/A'}
                                      </span>
                                      <span
                                        className={`admin-delivery-gift-card-pill${deliveryNotesDisplay(o) ? ' admin-delivery-gift-card-pill--yes' : ' admin-delivery-gift-card-pill--na'}`}
                                        title={deliveryNotesDisplay(o) || undefined}
                                      >
                                        <span className="material-symbols-outlined admin-delivery-gift-card-pill-ico">
                                          note_alt
                                        </span>
                                        {deliveryNotesDisplay(o) ? 'Driver notes' : 'Driver notes N/A'}
                                      </span>
                                    </div>
                                    <div className="admin-delivery-card-bottom-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                      {orderChatEnabled ? (
                                        <AdminOpenChatButton
                                          orderId={o.order_id}
                                          unreadCount={chatUnreadByOrder[o.order_id] ?? 0}
                                          chatLink={
                                            o.public_token
                                              ? `${appBaseUrl}/order/${encodeURIComponent(o.order_id)}?token=${encodeURIComponent(o.public_token)}&chat=1`
                                              : null
                                          }
                                          className="admin-btn admin-btn-sm admin-btn-outline"
                                        />
                                      ) : null}
                                      <Link href={detailHref(o.order_id)} className="admin-btn admin-btn-sm admin-btn-primary">
                                        View
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}

          {visibleOrders.length > 0 && initialTotal > sortedOrders.length ? (
            <p className="admin-hint admin-delivery-page-hint">
              Showing {effectiveOrders.length} of {initialTotal} orders — use pagination or narrow the date range.
            </p>
          ) : null}

          {visibleOrders.length > 0 ? (
            <div className="admin-pagination">
              <span>
                Showing {(initialPage - 1) * pageSize + 1}–{Math.min(initialPage * pageSize, initialTotal)} of{' '}
                {initialTotal}
              </span>
              <div className="admin-pagination-btns">
                <button
                  type="button"
                  disabled={initialPage <= 1}
                  onClick={() => {
                    const next = new URLSearchParams(sp.toString());
                    next.set('page', String(initialPage - 1));
                    replaceParams(next);
                  }}
                  className="admin-btn admin-btn-sm"
                >
                  Previous
                </button>
                <span className="admin-pagination-info">
                  Page {initialPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={initialPage >= totalPages}
                  onClick={() => {
                    const next = new URLSearchParams(sp.toString());
                    next.set('page', String(initialPage + 1));
                    replaceParams(next);
                  }}
                  className="admin-btn admin-btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="admin-delivery-board-fab-row">
        <button type="button" className="admin-btn admin-delivery-route-btn" onClick={() => setMapOpen(true)}>
          <span className="material-symbols-outlined">map</span>
          Route view
        </button>
      </div>

      {mapOpen ? (
        <DeliveryRouteMapModal markers={mapMarkers} onClose={() => setMapOpen(false)} />
      ) : null}
      {deliveredPreview ? (
        <DeliveredEmailPreviewModal
          key={deliveredPreview.preview.outboxId}
          open={!!deliveredPreview}
          orderId={deliveredPreview.orderId}
          initial={deliveredPreview.preview}
          onClose={() => setDeliveredPreview(null)}
        />
      ) : null}
    </div>
  );
}
