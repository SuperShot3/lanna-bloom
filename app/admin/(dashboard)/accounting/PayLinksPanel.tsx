'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { AdminPayLinkListRow } from '@/lib/payLinks/listAdminPayLinks';

function fmt(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function PayLinksPanel({
  rows,
  paymentStatus,
}: {
  rows: AdminPayLinkListRow[];
  paymentStatus: 'PAID' | 'NOT_PAID' | 'all';
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const setStatus = (next: string) => {
    const sp = new URLSearchParams(searchParams?.toString() ?? '');
    if (next === 'all') sp.delete('paymentStatus');
    else sp.set('paymentStatus', next);
    const q = sp.toString();
    router.push(q ? `/admin/accounting/pay-links?${q}` : '/admin/accounting/pay-links');
  };

  const copy = async (row: AdminPayLinkListRow) => {
    try {
      await navigator.clipboard.writeText(row.reviewUrl);
      setCopiedId(row.orderId);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <section className="admin-accounting-section">
      <div className="admin-accounting-toolbar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <label className="admin-hint" htmlFor="pl-status-filter">
          Status
        </label>
        <select
          id="pl-status-filter"
          className="admin-select"
          value={paymentStatus}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All</option>
          <option value="NOT_PAID">Unpaid</option>
          <option value="PAID">Paid</option>
        </select>
        <Link href="/admin/accounting/pay-links/new" className="admin-btn admin-btn-primary">
          + New pay link
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="admin-hint">No pay links yet. Create one with amount and description, then send the URL.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Stripe fee</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.orderId}>
                  <td className="tabular-nums">{fmtDate(row.createdAt)}</td>
                  <td>
                    <Link href={`/admin/orders/${encodeURIComponent(row.orderId)}`}>{row.description}</Link>
                    <div className="admin-hint">{row.orderId}</div>
                  </td>
                  <td className="tabular-nums">{fmt(row.amount)}</td>
                  <td>{row.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'}</td>
                  <td>{row.customerName || row.customerEmail || '—'}</td>
                  <td className="tabular-nums">{row.paymentFee != null ? fmt(row.paymentFee) : '—'}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => copy(row)}>
                      {copiedId === row.orderId ? 'Copied' : 'Copy link'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
