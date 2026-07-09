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
import { normalizeOrderStatus } from '@/lib/orders/statusConstants';

interface DeliveryEditCardProps {
  order: SupabaseOrderRow;
  canEdit: boolean;
}

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

export function DeliveryEditCard({ order, canEdit }: DeliveryEditCardProps) {
  const router = useRouter();
  const lockedStatus = normalizeOrderStatus(order.order_status);
  const isLocked = lockedStatus === 'DELIVERED' || lockedStatus === 'CANCELLED';
  const editable = canEdit && !isLocked;

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
  }, [order, editing]);

  const handleCancel = () => {
    setEditing(false);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!editable || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        delivery_date: deliveryDate.trim(),
        delivery_window: deliveryWindow,
        address: address.trim(),
        delivery_google_maps_url: mapsUrl.trim() || null,
        recipient_name: recipientName.trim() || null,
        recipient_phone: recipientPhone.trim() || null,
        notes: notes.trim() || null,
        surprise_delivery: surprise,
      };
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.order_id)}/delivery-details`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update delivery details' });
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
