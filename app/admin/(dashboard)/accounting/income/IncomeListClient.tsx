'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { IncomeRecord, IncomeFilters } from '@/types/accounting';
import { INCOME_SOURCE_TYPES, INCOME_STATUSES } from '@/types/accounting';

interface Props {
  initialRecords: IncomeRecord[];
  initialTotal: number;
  initialConfirmedAmount: number;
  initialConfirmedStripeFees: number;
  initialPendingAmount: number;
  initialError?: string;
  initialFilters: IncomeFilters;
  initialPage: number;
  pageSize: number;
  /** Same as Overview “Net profit” for the selected date range (all income minus fees and expenses). */
  periodNetProfit?: number;
}

const SOURCE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  INCOME_SOURCE_TYPES.map((t) => [t.value, t.label])
);

function fmt(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'confirmed' ? 'admin-badge-paid' :
    status === 'cancelled' ? 'admin-badge-payment-cancelled' :
    'admin-badge-payment-pending';
  return <span className={`admin-badge ${cls}`}>{status}</span>;
}

function ModeBadge({ mode }: { mode: string }) {
  return (
    <span className={`admin-badge ${mode === 'auto_order' ? 'admin-badge-auto' : 'admin-badge-manual'}`}>
      {mode === 'auto_order' ? 'Auto' : 'Manual'}
    </span>
  );
}

export function IncomeListClient({
  initialRecords,
  initialTotal,
  initialConfirmedAmount,
  initialConfirmedStripeFees,
  initialPendingAmount,
  initialError,
  initialFilters,
  initialPage,
  pageSize,
  periodNetProfit,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sp = searchParams ?? new URLSearchParams();

  const handleFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v); else next.delete(k);
    });
    router.push(`${pathname}?${next.toString()}`);
  };

  const totalPages = Math.ceil(initialTotal / pageSize) || 1;
  const hasFilters = initialFilters.dateFrom || initialFilters.dateTo || initialFilters.source_mode || initialFilters.source_type || initialFilters.income_status;

  return (
    <div className="admin-income">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/accounting" className="admin-back-link">← Accounting Overview</Link>
          <h1 className="admin-title">Income Records</h1>
          <p className="admin-hint">{initialTotal} record{initialTotal !== 1 ? 's' : ''}</p>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin/accounting/income/new" className="admin-btn admin-btn-primary">
            + Add Manual
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="admin-expenses-filters">
        <input type="date" className="admin-input admin-input-date" value={initialFilters.dateFrom ?? ''}
          onChange={(e) => handleFilterChange({ dateFrom: e.target.value })} aria-label="From date" />
        <input type="date" className="admin-input admin-input-date" value={initialFilters.dateTo ?? ''}
          onChange={(e) => handleFilterChange({ dateTo: e.target.value })} aria-label="To date" />
        <select className="admin-select" value={initialFilters.source_mode ?? 'all'}
          onChange={(e) => handleFilterChange({ source_mode: e.target.value })} aria-label="Source mode">
          <option value="all">All modes</option>
          <option value="auto_order">Auto (Order)</option>
          <option value="manual">Manual</option>
        </select>
        <select className="admin-select" value={initialFilters.source_type ?? 'all'}
          onChange={(e) => handleFilterChange({ source_type: e.target.value })} aria-label="Source type">
          <option value="all">All types</option>
          {INCOME_SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select className="admin-select" value={initialFilters.income_status ?? 'all'}
          onChange={(e) => handleFilterChange({ income_status: e.target.value })} aria-label="Status">
          <option value="all">All statuses</option>
          {INCOME_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm"
            onClick={() => handleFilterChange({ dateFrom: undefined, dateTo: undefined, source_mode: undefined, source_type: undefined, income_status: undefined })}>
            Clear
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="admin-expenses-summary">
        <span className="admin-hint">{initialTotal} record{initialTotal !== 1 ? 's' : ''}</span>
        <div className="admin-income-summary-totals">
          <span className="admin-expenses-total">
            Confirmed revenue (gross): <strong>{fmt(initialConfirmedAmount)}</strong>
          </span>
          {initialConfirmedStripeFees > 0 && (
            <span className="admin-expenses-total">
              Stripe fees (5.3%): <strong>−{fmt(initialConfirmedStripeFees)}</strong>
            </span>
          )}
          {periodNetProfit != null && (
            <span className="admin-expenses-total">
              Net profit (period): <strong>{fmt(periodNetProfit)}</strong>
            </span>
          )}
          {initialPendingAmount > 0 && (
            <span className="admin-expenses-total" style={{ color: '#d97706' }}>
              Pending (gross): <strong>{fmt(initialPendingAmount)}</strong>
            </span>
          )}
        </div>
        {hasFilters && periodNetProfit != null && (
          <p className="admin-hint" style={{ marginTop: 8, maxWidth: '42rem' }}>
            Gross and Stripe fee totals reflect the filters above. Net profit (period) is for all income in the
            selected date range, same as Accounting Overview.
          </p>
        )}
      </div>

      {initialError ? (
        <div className="admin-error">
          <p><strong>Error loading income records</strong></p>
          <p>{initialError}</p>
        </div>
      ) : initialRecords.length === 0 ? (
        <p className="admin-empty">
          No income records found.{' '}
          <Link href="/admin/accounting/income/new" className="admin-link">Add a manual entry</Link> or run the backfill from the{' '}
          <Link href="/admin/accounting" className="admin-link">overview page</Link>.
        </p>
      ) : (
        <>
          <div className="admin-expenses-table-wrap">
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Mode</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Proof</th>
                  <th className="admin-expenses-col-amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {initialRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="admin-expenses-row"
                    onClick={() => router.push(`/admin/accounting/income/${rec.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/admin/accounting/income/${rec.id}`); }}
                  >
                    <td className="admin-expenses-date">{fmtDate(rec.created_at)}</td>
                    <td className="admin-expenses-desc">
                      <span className="admin-expenses-desc-text">{rec.description}</span>
                      {rec.order_id && (
                        <span className="admin-expenses-notes">Order: {rec.order_id}</span>
                      )}
                    </td>
                    <td><ModeBadge mode={rec.source_mode} /></td>
                    <td>
                      <span className="admin-badge admin-badge-category">
                        {SOURCE_TYPE_LABEL[rec.source_type] ?? rec.source_type}
                      </span>
                    </td>
                    <td><StatusBadge status={rec.income_status} /></td>
                    <td>
                      {rec.receipt_attached
                        ? <span className="admin-badge admin-badge-paid">✓</span>
                        : <span className="admin-badge admin-badge-payment-pending">—</span>}
                    </td>
                    <td className="admin-expenses-amount">{fmt(rec.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <span>Showing {(initialPage - 1) * pageSize + 1}–{Math.min(initialPage * pageSize, initialTotal)} of {initialTotal}</span>
              <div className="admin-pagination-btns">
                <button type="button" disabled={initialPage <= 1} className="admin-btn admin-btn-sm"
                  onClick={() => { const n = new URLSearchParams(sp.toString()); n.set('page', String(initialPage - 1)); router.push(`${pathname}?${n.toString()}`); }}>
                  Previous
                </button>
                <span className="admin-pagination-info">Page {initialPage} of {totalPages}</span>
                <button type="button" disabled={initialPage >= totalPages} className="admin-btn admin-btn-sm"
                  onClick={() => { const n = new URLSearchParams(sp.toString()); n.set('page', String(initialPage + 1)); router.push(`${pathname}?${n.toString()}`); }}>
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
