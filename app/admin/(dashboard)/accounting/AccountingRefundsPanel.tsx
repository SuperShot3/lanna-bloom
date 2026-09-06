'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { IncomeRefundListRecord, IncomeRefundListResult } from '@/lib/accounting/incomeRefunds';

function fmt(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(ymd: string) {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeCsvCell(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsvLines(filename: string, lines: string[]) {
  const bom = '\ufeff';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function periodSlug(periodLabel: string) {
  return periodLabel.replace(/[^0-9a-z-]+/gi, '_');
}

function sourceLabel(source: string) {
  return source === 'stripe' ? 'Stripe' : 'Admin';
}

interface Props {
  refundsData: IncomeRefundListResult;
  page: number;
  pageSize: number;
  periodLabel: string;
}

export function AccountingRefundsPanel({ refundsData, page, pageSize, periodLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? '/admin/accounting/refunds';
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();
  const totalPages = Math.ceil(refundsData.total / pageSize) || 1;

  const exportCsv = () => {
    const headers = ['Date', 'Order', 'Source', 'Amount', 'Retained Stripe fee', 'Notes', 'Recorded by'];
    const lines = [headers.join(',')];
    for (const rec of refundsData.records) {
      lines.push(
        [
          escapeCsvCell(rec.refunded_at),
          escapeCsvCell(rec.order_id ?? ''),
          escapeCsvCell(sourceLabel(rec.source)),
          String(rec.amount),
          rec.retained_fee_amount != null ? String(rec.retained_fee_amount) : '',
          escapeCsvCell(rec.notes ?? ''),
          escapeCsvCell(rec.created_by ?? ''),
        ].join(',')
      );
    }
    downloadCsvLines(`refunds-${periodSlug(periodLabel)}.csv`, lines);
  };

  return (
    <div className="admin-income">
      <div className="admin-expenses-filters">
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={exportCsv}
          disabled={refundsData.records.length === 0}
          title="Export the visible page as CSV"
        >
          Export CSV
        </button>
      </div>

      <div className="admin-expenses-summary">
        <span className="admin-hint">
          {refundsData.total} refund{refundsData.total !== 1 ? 's' : ''} · {fmt(refundsData.totalAmount)} returned
          {refundsData.totalRetainedFee > 0 ? ` · retained Stripe fee ${fmt(refundsData.totalRetainedFee)}` : ''}
        </span>
        <p className="admin-hint" style={{ marginTop: 6 }}>
          Refunds are not income. Record them from an order with <strong>Refund</strong>. Customer card refunds still
          need to be issued in Stripe separately.
        </p>
      </div>

      {refundsData.error ? (
        <div className="admin-error">
          <p>
            <strong>Error loading refunds</strong>
          </p>
          <p>{refundsData.error}</p>
        </div>
      ) : refundsData.records.length === 0 ? (
        <p className="admin-empty">No refunds in this period.</p>
      ) : (
        <>
          <div className="admin-expenses-table-wrap">
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Source</th>
                  <th>Notes</th>
                  <th className="admin-expenses-col-amount">Amount</th>
                  <th className="admin-expenses-col-amount">Retained fee</th>
                </tr>
              </thead>
              <tbody>
                {refundsData.records.map((rec: IncomeRefundListRecord) => (
                  <tr key={rec.id}>
                    <td className="admin-expenses-date">{formatDate(rec.refunded_at)}</td>
                    <td className="admin-expenses-desc">
                      {rec.order_id ? (
                        <Link href={`/admin/orders/${encodeURIComponent(rec.order_id)}`} className="admin-link">
                          {rec.order_id}
                        </Link>
                      ) : (
                        <span className="admin-hint">No order</span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge ${rec.source === 'stripe' ? 'admin-badge-auto' : 'admin-badge-manual'}`}>
                        {sourceLabel(rec.source)}
                      </span>
                    </td>
                    <td className="admin-expenses-desc">
                      <span className="admin-expenses-desc-text">{rec.notes?.trim() || '—'}</span>
                    </td>
                    <td className="admin-expenses-amount">{fmt(rec.amount)}</td>
                    <td className="admin-expenses-amount">
                      {rec.retained_fee_amount != null && rec.retained_fee_amount > 0
                        ? fmt(rec.retained_fee_amount)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, refundsData.total)} of {refundsData.total}
              </span>
              <div className="admin-pagination-btns">
                <button
                  type="button"
                  disabled={page <= 1}
                  className="admin-btn admin-btn-sm"
                  onClick={() => {
                    const n = new URLSearchParams(sp.toString());
                    n.set('page', String(page - 1));
                    router.push(`${pathname}?${n.toString()}`);
                  }}
                >
                  Previous
                </button>
                <span className="admin-pagination-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  className="admin-btn admin-btn-sm"
                  onClick={() => {
                    const n = new URLSearchParams(sp.toString());
                    n.set('page', String(page + 1));
                    router.push(`${pathname}?${n.toString()}`);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
