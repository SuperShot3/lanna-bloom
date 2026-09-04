'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import {
  DELIVERY_WINDOWS,
  formatDeliveryWindowLabel,
  type DeliveryWindow,
} from '@/lib/orders/deliveryFields';
import {
  checkoutMapsUrl,
  deliveryNotesDisplay,
  recipientNameDisplay,
  recipientPhoneDisplay,
} from '@/lib/admin/orderSummaryPlainText';
import { AdminCopyTextButton } from '@/app/admin/components/AdminCopyTextButton';
import {
  CHECKOUT_FIELD_LIMITS,
  GIFT_CARD_MESSAGES_MAX_COUNT,
  clipCheckoutField,
} from '@/lib/checkout/checkoutFieldLimits';
import {
  formatGiftCardEntry,
  type OrderGiftCardEntry,
} from '@/lib/orders/giftCardMessages';
import { normalizeOrderStatus } from '@/lib/orders/statusConstants';

interface DeliveryEditCardProps {
  order: SupabaseOrderRow;
  canEdit: boolean;
  initialCardEntries: OrderGiftCardEntry[];
  itemLabels: string[];
  itemCount: number;
}

type CardSlot = { text: string; itemTitle?: string };

const CARD_MAX_LEN = CHECKOUT_FIELD_LIMITS.giftCardMessage;

function surpriseFromOrder(order: SupabaseOrderRow): boolean | null {
  const json = order.order_json as { delivery?: { surpriseDelivery?: boolean } } | null | undefined;
  const v = json?.delivery?.surpriseDelivery;
  if (v === true) return true;
  if (v === false) return false;
  return null;
}

function windowFromOrder(order: SupabaseOrderRow): DeliveryWindow {
  const w = order.delivery_window?.trim();
  if (w && (DELIVERY_WINDOWS as readonly string[]).includes(w)) {
    return w as DeliveryWindow;
  }
  return 'MORNING_9_12';
}

function slotsFromEntries(entries: OrderGiftCardEntry[]): CardSlot[] {
  if (entries.length === 0) return [{ text: '' }];
  return entries.map((e) => ({
    text: e.text,
    itemTitle: e.itemTitle,
  }));
}

function copyTextFromEntries(entries: OrderGiftCardEntry[]): string {
  return entries.map((e) => formatGiftCardEntry(e)).filter(Boolean).join('\n\n');
}

export function DeliveryEditCard({
  order,
  canEdit,
  initialCardEntries,
  itemLabels,
  itemCount,
}: DeliveryEditCardProps) {
  const router = useRouter();
  const lockedStatus = normalizeOrderStatus(order.order_status);
  const isLocked = lockedStatus === 'DELIVERED' || lockedStatus === 'CANCELLED';
  const editable = canEdit && !isLocked;
  const allowAdditionalCards = itemCount > 1 || initialCardEntries.length > 1;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deliveryDate, setDeliveryDate] = useState(order.delivery_date?.trim() ?? '');
  const [deliveryWindow, setDeliveryWindow] = useState<DeliveryWindow>(windowFromOrder(order));
  const [address, setAddress] = useState(
    order.address?.trim() ||
      ((order.order_json as { delivery?: { address?: string } } | null)?.delivery?.address ?? '')
  );
  const [mapsUrl, setMapsUrl] = useState(checkoutMapsUrl(order) ?? '');
  const [recipientName, setRecipientName] = useState(recipientNameDisplay(order));
  const [recipientPhone, setRecipientPhone] = useState(
    order.recipient_phone?.trim() ||
      ((order.order_json as { delivery?: { recipientPhone?: string } } | null)?.delivery
        ?.recipientPhone ??
        '')
  );
  const [notes, setNotes] = useState(deliveryNotesDisplay(order));
  const [surprise, setSurprise] = useState<boolean | null>(surpriseFromOrder(order));
  const [cardSlots, setCardSlots] = useState<CardSlot[]>(() => slotsFromEntries(initialCardEntries));

  useEffect(() => {
    if (editing) return;
    setDeliveryDate(order.delivery_date?.trim() ?? '');
    setDeliveryWindow(windowFromOrder(order));
    setAddress(
      order.address?.trim() ||
        ((order.order_json as { delivery?: { address?: string } } | null)?.delivery?.address ?? '')
    );
    setMapsUrl(checkoutMapsUrl(order) ?? '');
    setRecipientName(recipientNameDisplay(order));
    setRecipientPhone(
      order.recipient_phone?.trim() ||
        ((order.order_json as { delivery?: { recipientPhone?: string } } | null)?.delivery
          ?.recipientPhone ??
          '')
    );
    setNotes(deliveryNotesDisplay(order));
    setSurprise(surpriseFromOrder(order));
    setCardSlots(slotsFromEntries(initialCardEntries));
  }, [order, initialCardEntries, editing]);

  const handleCancel = () => {
    setEditing(false);
    setCardSlots(slotsFromEntries(initialCardEntries));
    setMessage(null);
  };

  const handleCardChangeAt = (index: number, value: string) => {
    setCardSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, text: clipCheckoutField(value, 'giftCardMessage') } : slot
      )
    );
  };

  const handleAddCard = () => {
    setCardSlots((prev) => {
      if (prev.length >= GIFT_CARD_MESSAGES_MAX_COUNT) return prev;
      const nextTitle = itemLabels[prev.length]?.trim() || undefined;
      return [...prev, nextTitle ? { text: '', itemTitle: nextTitle } : { text: '' }];
    });
  };

  const handleRemoveCard = (index: number) => {
    if (index <= 0) return;
    setCardSlots((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSave = async () => {
    if (!editable || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const deliveryBody: Record<string, unknown> = {
        delivery_date: deliveryDate.trim(),
        delivery_window: deliveryWindow,
        address: address.trim(),
        delivery_google_maps_url: mapsUrl.trim() || null,
        recipient_name: recipientName.trim() || null,
        recipient_phone: recipientPhone.trim() || null,
        notes: notes.trim() || null,
        surprise_delivery: surprise,
      };
      const cardBody = {
        giftCardMessages: cardSlots.map((slot, i) => ({
          text: slot.text,
          itemTitle: slot.itemTitle || itemLabels[i]?.trim() || undefined,
        })),
      };

      const [deliveryRes, cardRes] = await Promise.all([
        fetch(`/api/admin/orders/${encodeURIComponent(order.order_id)}/delivery-details`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deliveryBody),
        }),
        fetch(`/api/admin/orders/${encodeURIComponent(order.order_id)}/card-text`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardBody),
        }),
      ]);

      const deliveryData = await deliveryRes.json().catch(() => ({}));
      const cardData = await cardRes.json().catch(() => ({}));
      const deliveryNoop =
        !deliveryRes.ok && deliveryData.error === 'No changes detected';
      const cardNoop = !cardRes.ok && cardData.error === 'No changes detected';
      const deliveryFailed = !deliveryRes.ok && !deliveryNoop;
      const cardFailed = !cardRes.ok && !cardNoop;

      if (deliveryFailed) {
        setMessage({
          type: 'error',
          text: deliveryData.error ?? 'Failed to update delivery details',
        });
        return;
      }
      if (cardFailed) {
        setMessage({ type: 'error', text: cardData.error ?? 'Failed to update card text' });
        return;
      }
      if (deliveryNoop && cardNoop) {
        setMessage({ type: 'error', text: 'No changes detected' });
        return;
      }

      setMessage({ type: 'success', text: 'Delivery details updated' });
      setEditing(false);
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const cardCopyText = copyTextFromEntries(initialCardEntries);
  const canAddCard =
    allowAdditionalCards && !saving && cardSlots.length < GIFT_CARD_MESSAGES_MAX_COUNT;

  return (
    <section className="admin-section">
      <div className="admin-summary-card-header" style={{ marginBottom: 12 }}>
        <h2 className="admin-section-title" style={{ marginBottom: 0 }}>
          Delivery details
        </h2>
        {editable && !editing ? (
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={() => {
              setEditing(true);
              setMessage(null);
            }}
          >
            Edit delivery details
          </button>
        ) : null}
      </div>

      {isLocked ? (
        <p className="admin-hint" style={{ marginBottom: 12 }}>
          Delivery details cannot be edited when the order is {lockedStatus.toLowerCase()}.
        </p>
      ) : null}

      {!editing ? (
        <div className="admin-summary-grid">
          <div>
            <strong>Date</strong>
            <p>{order.delivery_date?.trim() || '—'}</p>
          </div>
          <div>
            <strong>Window</strong>
            <p>{formatDeliveryWindowLabel(order.delivery_window)}</p>
          </div>
          <div>
            <strong>Address</strong>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {order.address?.trim() ||
                (order.order_json as { delivery?: { address?: string } } | null)?.delivery
                  ?.address ||
                '—'}
            </p>
          </div>
          <div>
            <strong>Recipient</strong>
            <p>
              {recipientNameDisplay(order) || '—'}
              {recipientPhoneDisplay(order) ? ` · ${recipientPhoneDisplay(order)}` : ''}
            </p>
          </div>
          <div>
            <strong>Card text</strong>
            <div className="admin-summary-field-row">
              <div className="admin-summary-field-main">
                {initialCardEntries.length === 0 ? (
                  <p>—</p>
                ) : (
                  initialCardEntries.map((entry, index) => (
                    <div key={`card-view-${index}`}>
                      {entry.itemTitle ? (
                        <p className="admin-muted" style={{ margin: '0 0 4px' }}>
                          Card for {entry.itemTitle}
                        </p>
                      ) : initialCardEntries.length > 1 ? (
                        <p className="admin-muted" style={{ margin: '0 0 4px' }}>
                          Card {index + 1}
                        </p>
                      ) : null}
                      <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                        {formatGiftCardEntry(entry)}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <AdminCopyTextButton
                text={cardCopyText}
                ariaLabel={
                  cardCopyText ? 'Copy card message text to clipboard' : 'No card text to copy'
                }
                className="admin-copy-text-btn--inline"
              >
                {cardCopyText ? 'Copy card text' : 'No text'}
              </AdminCopyTextButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-form" style={{ gap: 12 }}>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`delivery-date-${order.order_id}`}>Delivery date</label>
            <input
              id={`delivery-date-${order.order_id}`}
              type="date"
              className="admin-input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`delivery-window-${order.order_id}`}>Time window</label>
            <select
              id={`delivery-window-${order.order_id}`}
              className="admin-select"
              value={deliveryWindow}
              onChange={(e) => setDeliveryWindow(e.target.value as DeliveryWindow)}
              disabled={saving}
            >
              {DELIVERY_WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {formatDeliveryWindowLabel(w)}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`delivery-address-${order.order_id}`}>Address</label>
            <textarea
              id={`delivery-address-${order.order_id}`}
              className="admin-input"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`delivery-maps-${order.order_id}`}>Google Maps URL</label>
            <input
              id={`delivery-maps-${order.order_id}`}
              type="url"
              className="admin-input"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              disabled={saving}
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`recipient-name-${order.order_id}`}>Recipient name</label>
            <input
              id={`recipient-name-${order.order_id}`}
              type="text"
              className="admin-input"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`recipient-phone-${order.order_id}`}>Recipient phone</label>
            <input
              id={`recipient-phone-${order.order_id}`}
              type="text"
              className="admin-input"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`delivery-notes-${order.order_id}`}>Driver notes</label>
            <textarea
              id={`delivery-notes-${order.order_id}`}
              className="admin-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`surprise-${order.order_id}`}>Surprise delivery</label>
            <select
              id={`surprise-${order.order_id}`}
              className="admin-select"
              value={surprise === null ? '' : surprise ? 'yes' : 'no'}
              onChange={(e) => {
                const v = e.target.value;
                setSurprise(v === '' ? null : v === 'yes');
              }}
              disabled={saving}
            >
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          {canAddCard ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={handleAddCard}
                disabled={saving}
              >
                Add additional card
              </button>
            </div>
          ) : null}
          {cardSlots.map((slot, index) => {
            const itemName = slot.itemTitle?.trim() || itemLabels[index]?.trim() || '';
            const label = itemName
              ? `Card for ${itemName}`
              : cardSlots.length > 1
                ? `Card ${index + 1}`
                : 'Card text';
            const fieldId = `card-text-${order.order_id}-${index}`;
            return (
              <div className="admin-form-group" key={fieldId} style={{ marginBottom: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <label htmlFor={fieldId}>{label}</label>
                  {index > 0 && allowAdditionalCards ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline"
                      onClick={() => handleRemoveCard(index)}
                      disabled={saving}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <textarea
                  id={fieldId}
                  className="admin-input"
                  rows={3}
                  value={slot.text}
                  onChange={(e) => handleCardChangeAt(index, e.target.value)}
                  disabled={saving}
                  maxLength={CARD_MAX_LEN}
                  placeholder="Message printed on the greeting card"
                />
                <p className="admin-hint" style={{ marginTop: 6, marginBottom: 0 }}>
                  {slot.text.length}/{CARD_MAX_LEN}
                </p>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="admin-btn"
              onClick={handleSave}
              disabled={saving || !deliveryDate.trim() || !address.trim()}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
          <p className="admin-hint" style={{ margin: 0 }}>
            Delivery fee and grand total are not changed. Edits appear in Order history below.
          </p>
        </div>
      )}

      {message ? (
        <p className={message.type === 'success' ? 'admin-costs-success' : 'admin-costs-error'}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
