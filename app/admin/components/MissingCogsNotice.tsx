'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type MissingCogsOrder = { order_id: string; paid_at?: string | null; cogs_amount?: number | null };

export function MissingCogsNotice() {
  const [count, setCount] = useState<number | null>(null);
  const [orders, setOrders] = useState<MissingCogsOrder[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/admin/orders/missing-cogs', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setCount(0);
          return;
        }
        if (!cancelled) {
          setCount(Number(data.count) || 0);
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch {
        if (!cancelled) setCount(0);
      }
    };
    run();
    const t = window.setInterval(run, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  if (!count) return null;

  const top = orders.slice(0, 3);

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label={`${count} paid orders missing COGS. Expand notification`}
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed',
          bottom: 12,
          left: 12,
          zIndex: 1000,
          width: 44,
          height: 44,
          borderRadius: 999,
          border: '1px solid rgba(148,163,184,.25)',
          background: '#0b1220',
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
          color: '#e2e8f0',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
        }}
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ color: '#fb7185' }}>
          error
        </span>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            padding: '0 6px',
            borderRadius: 999,
            background: '#fb7185',
            color: '#0b1220',
            fontSize: 11,
            fontWeight: 800,
            display: 'grid',
            placeItems: 'center',
            border: '2px solid #0b1220',
          }}
        >
          {count > 99 ? '99+' : String(count)}
        </span>
      </button>
    );
  }

  return (
    <div
      className="admin-missing-cogs"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 1000,
        maxWidth: 340,
        background: '#0b1220',
        border: '1px solid rgba(148,163,184,.25)',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        color: '#e2e8f0',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span className="material-symbols-outlined" aria-hidden="true" style={{ color: '#fb7185', marginTop: 2 }}>
          error
        </span>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontWeight: 700 }}>
              {count} paid order{count === 1 ? '' : 's'} missing COGS
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="admin-btn admin-btn-outline admin-btn-sm"
              aria-label="Collapse notification"
              style={{ padding: '4px 8px' }}
            >
              Collapse
            </button>
          </div>
          {top.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
              {top.map((o) => (
                <div key={o.order_id}>
                  <Link href={`/admin/accounting/orders/${encodeURIComponent(o.order_id)}`} className="admin-link">
                    {o.order_id}
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <Link href="/admin/orders" className="admin-link">
              Fix now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

