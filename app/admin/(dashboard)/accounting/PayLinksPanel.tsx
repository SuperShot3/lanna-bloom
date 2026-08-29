'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AdminPayLinkListRow } from '@/lib/payLinks/listAdminPayLinks';
import { PAY_LINK_TTL_MINUTES } from '@/lib/payLinks/adminPayLink';

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

function PayLinkStatus({ row }: { row: AdminPayLinkListRow }) {
  if (row.linkStatus === 'paid' || row.paymentStatus === 'PAID') {
    return (
      <div className="admin-pay-link-status">
        <span className="admin-pay-link-badge admin-pay-link-badge--paid">
          <span className="material-symbols-outlined" aria-hidden>
            check_circle
          </span>
          Paid
        </span>
        <span className="admin-pay-link-status-note">
          {row.paidAt ? `Received ${fmtDate(row.paidAt)}` : 'Stripe payment received'}
        </span>
      </div>
    );
  }
  if (row.linkStatus === 'disabled') {
    return (
      <div className="admin-pay-link-status">
        <span className="admin-pay-link-badge admin-pay-link-badge--disabled">
          <span className="material-symbols-outlined" aria-hidden>
            block
          </span>
          Disabled
        </span>
        <span className="admin-pay-link-status-note">Turned off. Create a new link if they still need to pay.</span>
      </div>
    );
  }
  if (row.linkStatus === 'expired') {
    return (
      <div className="admin-pay-link-status">
        <span className="admin-pay-link-badge admin-pay-link-badge--expired">
          <span className="material-symbols-outlined" aria-hidden>
            timer_off
          </span>
          Expired
        </span>
        <span className="admin-pay-link-status-note">
          Not paid within {PAY_LINK_TTL_MINUTES} minutes. Create a new link.
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
      <span className="admin-pay-link-status-note">
        Customer must pay within {PAY_LINK_TTL_MINUTES} minutes. No order until they pay.
      </span>
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
  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);

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
      setCopiedId(row.id);
    } catch {
      setCopiedId(null);
    }
  };

  const disable = async (row: AdminPayLinkListRow) => {
    setDisableError(null);
    setDisablingId(row.id);
    try {
      const res = await fetch(`/api/admin/pay-links/${encodeURIComponent(row.id)}/disable`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDisableError(typeof data.error === 'string' ? data.error : 'Could not disable link');
        return;
      }
      router.refresh();
    } catch {
      setDisableError('Could not disable link');
    } finally {
      setDisablingId(null);
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
        Links are valid for {PAY_LINK_TTL_MINUTES} minutes. The customer opens a Lanna Bloom pay page, then Stripe.
        After payment the same URL shows thank you and cannot be charged again. Disable an unpaid link if you need to
        cancel it sooner.
      </p>

      {disableError ? (
        <div className="admin-error" role="alert">
          <p>{disableError}</p>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="admin-hint">
          {paymentStatus === 'NOT_PAID'
            ? 'No unpaid pay links.'
            : paymentStatus === 'PAID'
              ? 'No paid pay links yet. After a customer pays on Stripe, the order appears here.'
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
                const paid = row.linkStatus === 'paid' || row.paymentStatus === 'PAID';
                const rowClass =
                  paid
                    ? 'admin-pay-link-row--paid'
                    : row.linkStatus === 'expired' || row.linkStatus === 'disabled'
                      ? 'admin-pay-link-row--expired'
                      : 'admin-pay-link-row--unpaid';
                return (
                <tr key={row.id} className={rowClass}>
                  <td className="tabular-nums">{fmtDate(row.createdAt)}</td>
                  <td>
                    {row.orderId ? (
                      <>
                        <Link href={`/admin/orders/${encodeURIComponent(row.orderId)}`}>{row.description}</Link>
                        <div className="admin-hint">{row.orderId}</div>
                      </>
                    ) : (
                      <>
                        {row.description}
                        <div className="admin-hint">No order yet</div>
                      </>
                    )}
                  </td>
                  <td className="tabular-nums">{fmt(row.amount)}</td>
                  <td>
                    <PayLinkStatus row={row} />
                  </td>
                  <td>{row.customerName || row.customerEmail || '—'}</td>
                  <td className="tabular-nums">{row.paymentFee != null ? fmt(row.paymentFee) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {row.canCopy ? (
                        <button
                          type="button"
                          className={`admin-btn admin-btn-sm${
                            copiedId === row.id ? ' admin-btn-copied' : ' admin-btn-outline'
                          }`}
                          onClick={() => copy(row)}
                          aria-live="polite"
                        >
                          {copiedId === row.id ? 'Copied' : 'Copy link'}
                        </button>
                      ) : null}
                      {row.canDisable ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-outline"
                          disabled={disablingId === row.id}
                          onClick={() => disable(row)}
                        >
                          {disablingId === row.id ? 'Disabling…' : 'Disable'}
                        </button>
                      ) : null}
                    </div>
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
