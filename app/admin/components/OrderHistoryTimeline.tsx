import { formatShopDateTime } from '@/lib/shopTime';
import type {
  OrderDeliveryChangeHistoryRow,
  SupabaseStatusHistoryRow,
} from '@/lib/supabase/adminQueries';
import {
  deliveryFieldLabel,
  formatDeliveryFieldValue,
  type DeliveryDetailsFieldKey,
} from '@/lib/orders/deliveryFields';

type TimelineEntry =
  | {
      kind: 'status';
      createdAt: string | null;
      fromStatus: string | null;
      toStatus: string | null;
    }
  | {
      kind: 'delivery';
      createdAt: string | null;
      adminEmail: string;
      from: Record<string, string | boolean | null>;
      to: Record<string, string | boolean | null>;
      changedFields: string[];
    };

interface OrderHistoryTimelineProps {
  statusHistory: SupabaseStatusHistoryRow[];
  deliveryChanges: OrderDeliveryChangeHistoryRow[];
}

function isFieldKey(key: string): key is DeliveryDetailsFieldKey {
  return (
    key === 'delivery_date' ||
    key === 'delivery_window' ||
    key === 'address' ||
    key === 'delivery_google_maps_url' ||
    key === 'recipient_name' ||
    key === 'recipient_phone' ||
    key === 'notes' ||
    key === 'surprise_delivery'
  );
}

export function OrderHistoryTimeline({
  statusHistory,
  deliveryChanges,
}: OrderHistoryTimelineProps) {
  const entries: TimelineEntry[] = [
    ...statusHistory.map((h) => ({
      kind: 'status' as const,
      createdAt: h.created_at,
      fromStatus: h.from_status,
      toStatus: h.to_status,
    })),
    ...deliveryChanges.map((d) => ({
      kind: 'delivery' as const,
      createdAt: d.created_at,
      adminEmail: d.admin_email,
      from: (d.diff_json?.from ?? {}) as Record<string, string | boolean | null>,
      to: (d.diff_json?.to ?? {}) as Record<string, string | boolean | null>,
      changedFields: d.diff_json?.changedFields ?? Object.keys(d.diff_json?.to ?? {}),
    })),
  ].sort((a, b) => {
    const at = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
    return at - bt;
  });

  if (entries.length === 0) return null;

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">Order history</h2>
      <ul className="admin-timeline">
        {entries.map((entry, i) => {
          if (entry.kind === 'status') {
            return (
              <li key={`status-${i}-${entry.createdAt ?? ''}`}>
                <span className="admin-timeline-status">
                  {entry.fromStatus ?? '—'} → {entry.toStatus ?? '—'}
                </span>
                <span className="admin-timeline-date">
                  {entry.createdAt ? formatShopDateTime(entry.createdAt) : '—'}
                </span>
              </li>
            );
          }

          const fields =
            entry.changedFields.length > 0
              ? entry.changedFields
              : Object.keys({ ...entry.from, ...entry.to });

          return (
            <li key={`delivery-${i}-${entry.createdAt ?? ''}`}>
              <div>
                <span className="admin-timeline-status">Delivery updated</span>
                {entry.adminEmail ? (
                  <span className="admin-muted" style={{ marginLeft: 8 }}>
                    by {entry.adminEmail}
                  </span>
                ) : null}
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {fields.map((field) => {
                    const label = isFieldKey(field) ? deliveryFieldLabel(field) : field;
                    const fromVal = isFieldKey(field)
                      ? formatDeliveryFieldValue(field, entry.from[field])
                      : String(entry.from[field] ?? '—');
                    const toVal = isFieldKey(field)
                      ? formatDeliveryFieldValue(field, entry.to[field])
                      : String(entry.to[field] ?? '—');
                    return (
                      <li key={field} className="admin-muted" style={{ marginBottom: 2 }}>
                        {label}: {fromVal} → {toVal}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <span className="admin-timeline-date">
                {entry.createdAt ? formatShopDateTime(entry.createdAt) : '—'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
