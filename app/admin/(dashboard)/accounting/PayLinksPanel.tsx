'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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

function isPaid(status: string) {
  return status.toUpperCase() === 'PAID';
}

function PayLinkStatus({ status, paidAt }: { status: string; paidAt: string | null }) {
  if (isPaid(status)) {
    return (
      <div className="admin-pay-link-status">
        <span className="admin-pay-link-badge admin-pay-link-badge--paid">
          <span className="material-symbols-outlined" aria-hidden>
            check_circle
          </span>
          Paid
        </span>
        <span className="admin-pay-link-status-note">
          {paidAt ? `Received ${fmtDate(paidAt)}` : 'Stripe payment received'}
        </span>
      </div>
    );
  }
  return (
    <div className="admin-pay-link-status">
      <span className="admin-pay-link-badge admin-pay-link-badge--unpaid">
        <span className="material-symbols-outlined" aria-hidden>
          schedule
        </span>
        Not paid yet
      </span>
      <span className="admin-pay-link-status-note">Link created. Waiting for the customer to pay.</span>
    </div>
  );
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

  useEffect(() => {
    if (!copiedId) return;
    const t = window.setTimeout(() => setCopiedId(null), 4000);
    return () => window.clearTimeout(t);
  }, [copiedId]);

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
          <option value="NOT_PAID">Not paid yet</option>
          <option value="PAID">Paid</option>
        </select>
        <Link href="/admin/accounting/pay-links/new" className="admin-btn admin-btn-primary">
          + New pay link
        </Link>
      </div>

      <p className="admin-pay-link-legend">
        <span className="admin-pay-link-badge admin-pay-link-badge--unpaid">
          <span className="material-symbols-outlined" aria-hidden>
            schedule
          </span>
          Not paid yet
        </span>
        <span>Link created. Customer has not paid.</span>
        <span className="admin-pay-link-badge admin-pay-link-badge--paid">
          <span className="material-symbols-outlined" aria-hidden>
            check_circle
          </span>
          Paid
        </span>
        <span>Stripe received the money.</span>
      </p>

      {rows.length === 0 ? (
        <p className="admin-hint">
          {paymentStatus === 'NOT_PAID'
            ? 'No unpaid pay links. When you create a link, it stays here until the customer pays.'
            : paymentStatus === 'PAID'
              ? 'No paid pay links yet. After a customer pays on Stripe, the row moves here.'
              : 'No pay links yet. Create one with amount and description, then send the URL.'}
        </p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Customer</th>
                <th>Stripe fee</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const paid = isPaid(row.paymentStatus);
                return (
                <tr
                  key={row.orderId}
                  className={paid ? 'admin-pay-link-row--paid' : 'admin-pay-link-row--unpaid'}
                >
                  <td className="tabular-nums">{fmtDate(row.createdAt)}</td>
                  <td>
                    <Link href={`/admin/orders/${encodeURIComponent(row.orderId)}`}>{row.description}</Link>
                    <div className="admin-hint">{row.orderId}</div>
                  </td>
                  <td className="tabular-nums">{fmt(row.amount)}</td>
                  <td>
                    <PayLinkStatus status={row.paymentStatus} paidAt={row.paidAt} />
                  </td>
                  <td>{row.customerName || row.customerEmail || '—'}</td>
                  <td className="tabular-nums">{row.paymentFee != null ? fmt(row.paymentFee) : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={`admin-btn admin-btn-sm${
                        copiedId === row.orderId ? ' admin-btn-copied' : ' admin-btn-outline'
                      }`}
                      onClick={() => copy(row)}
                      aria-live="polite"
                    >
                      {copiedId === row.orderId ? (
                        <>
                          <span className="material-symbols-outlined" aria-hidden style={{ fontSize: 16 }}>
                            check_circle
                          </span>
                          Copied to clipboard
                        </>
                      ) : (
                        'Copy link'
                      )}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
