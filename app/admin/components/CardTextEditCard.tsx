'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface CardTextEditCardProps {
  orderId: string;
  orderStatus: string | null;
  canEdit: boolean;
  initialEntries: OrderGiftCardEntry[];
  itemLabels: string[];
  itemCount: number;
}

type Slot = { text: string; itemTitle?: string };

const MAX_LEN = CHECKOUT_FIELD_LIMITS.giftCardMessage;

function slotsFromEntries(entries: OrderGiftCardEntry[]): Slot[] {
  if (entries.length === 0) return [{ text: '' }];
  return entries.map((e) => ({
    text: e.text,
    itemTitle: e.itemTitle,
  }));
}

function copyTextFromEntries(entries: OrderGiftCardEntry[]): string {
  return entries.map((e) => formatGiftCardEntry(e)).filter(Boolean).join('\n\n');
}

export function CardTextEditCard({
  orderId,
  orderStatus,
  canEdit,
  initialEntries,
  itemLabels,
  itemCount,
}: CardTextEditCardProps) {
  const router = useRouter();
  const lockedStatus = normalizeOrderStatus(orderStatus);
  const isLocked = lockedStatus === 'DELIVERED' || lockedStatus === 'CANCELLED';
  const editable = canEdit && !isLocked;
  const allowAdditional = itemCount > 1 || initialEntries.length > 1;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [slots, setSlots] = useState<Slot[]>(() => slotsFromEntries(initialEntries));

  useEffect(() => {
    if (editing) return;
    setSlots(slotsFromEntries(initialEntries));
  }, [initialEntries, editing]);

  const handleCancel = () => {
    setEditing(false);
    setSlots(slotsFromEntries(initialEntries));
    setMessage(null);
  };

  const handleChangeAt = (index: number, value: string) => {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, text: clipCheckoutField(value, 'giftCardMessage') } : slot
      )
    );
  };

  const handleAdd = () => {
    setSlots((prev) => {
      if (prev.length >= GIFT_CARD_MESSAGES_MAX_COUNT) return prev;
      const nextTitle = itemLabels[prev.length]?.trim() || undefined;
      return [...prev, nextTitle ? { text: '', itemTitle: nextTitle } : { text: '' }];
    });
  };

  const handleRemove = (index: number) => {
    if (index <= 0) return;
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSave = async () => {
    if (!editable || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/card-text`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            giftCardMessages: slots.map((slot, i) => ({
              text: slot.text,
              itemTitle: slot.itemTitle || itemLabels[i]?.trim() || undefined,
            })),
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update card text' });
        return;
      }
      setMessage({ type: 'success', text: 'Card text updated' });
      setEditing(false);
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const copyText = copyTextFromEntries(initialEntries);
  const canAdd =
    allowAdditional && !saving && slots.length < GIFT_CARD_MESSAGES_MAX_COUNT;

  return (
    <section className="admin-section">
      <div className="admin-summary-card-header" style={{ marginBottom: 12 }}>
        <h2 className="admin-section-title" style={{ marginBottom: 0 }}>
          Card text
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <AdminCopyTextButton
            text={copyText}
            ariaLabel={copyText ? 'Copy card message text to clipboard' : 'No card text to copy'}
          >
            {copyText ? 'Copy card text' : 'No text'}
          </AdminCopyTextButton>
          {editable && !editing ? (
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={() => {
                setEditing(true);
                setMessage(null);
              }}
            >
              Edit card text
            </button>
          ) : null}
        </div>
      </div>

      {isLocked ? (
        <p className="admin-hint" style={{ marginBottom: 12 }}>
          Card text cannot be edited when the order is {lockedStatus.toLowerCase()}.
        </p>
      ) : null}

      {!editing ? (
        initialEntries.length === 0 ? (
          <p style={{ margin: 0 }}>—</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {initialEntries.map((entry, index) => (
              <div key={`card-view-${index}`}>
                {entry.itemTitle ? (
                  <p className="admin-muted" style={{ margin: '0 0 4px' }}>
                    Card for {entry.itemTitle}
                  </p>
                ) : initialEntries.length > 1 ? (
                  <p className="admin-muted" style={{ margin: '0 0 4px' }}>
                    Card {index + 1}
                  </p>
                ) : null}
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{formatGiftCardEntry(entry)}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="admin-form" style={{ gap: 12 }}>
          {canAdd ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={handleAdd}
                disabled={saving}
              >
                Add additional card
              </button>
            </div>
          ) : null}
          {slots.map((slot, index) => {
            const itemName = slot.itemTitle?.trim() || itemLabels[index]?.trim() || '';
            const label = itemName
              ? `Card for ${itemName}`
              : slots.length > 1
                ? `Card ${index + 1}`
                : 'Card text';
            const fieldId = `card-text-${orderId}-${index}`;
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
                  {index > 0 && allowAdditional ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline"
                      onClick={() => handleRemove(index)}
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
                  onChange={(e) => handleChangeAt(index, e.target.value)}
                  disabled={saving}
                  maxLength={MAX_LEN}
                  placeholder="Message printed on the greeting card"
                />
                <p className="admin-hint" style={{ marginTop: 6, marginBottom: 0 }}>
                  {slot.text.length}/{MAX_LEN}
                </p>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="admin-btn"
              onClick={handleSave}
              disabled={saving}
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
            Save empty to clear card text. Edits appear in Order history below. Already-sent
            emails and supplier tasks are not updated.
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
