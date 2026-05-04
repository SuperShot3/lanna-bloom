'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { IncomeRecord, IncomeFilters } from '@/types/accounting';
import { INCOME_SOURCE_TYPES, INCOME_STATUSES, incomeDocumentationComplete } from '@/types/accounting';
import type { IncomeListResult } from '@/lib/accounting/incomeRecords';

function fmt(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
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

interface Props {
  incomeData: IncomeListResult;
  incomePage: number;
  incomePageSize: number;
  incomeFilters: IncomeFilters;
  periodLabel: string;
  /** Overview net profit for the same date bounds (matches previous combined tab UX). */
  periodNetProfit: number | null;
}

export function AccountingIncomeRecordsPanel({
  incomeData,
  incomePage,
  incomePageSize,
  incomeFilters,
  periodLabel,
  periodNetProfit,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();

  const handleIncomeFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    router.push(`${pathname}?${next.toString()}`);
  };

  const exportIncomeCsv = () => {
    const headers = [
      'Created at',
      'Description',
      'Order ID',
      'Source mode',
      'Source type',
      'Payment method',
      'Money location',
      'Status',
      'Proof OK (non-Stripe needs file)',
      'Gross amount',
      'Stripe fee (estimate)',
      'External reference',
      'Currency',
      'Created by',
    ];
    const lines = [headers.join(',')];
    for (const rec of incomeData.records) {
      lines.push(
        [
          escapeCsvCell(rec.created_at),
          escapeCsvCell(rec.description),
          escapeCsvCell(rec.order_id ?? ''),
          escapeCsvCell(rec.source_mode),
          escapeCsvCell(rec.source_type),
          escapeCsvCell(rec.payment_method),
          escapeCsvCell(rec.money_location),
          escapeCsvCell(rec.income_status),
          incomeDocumentationComplete(rec) ? 'Yes' : 'No',
          String(rec.amount),
          rec.processing_fee_amount != null ? String(rec.processing_fee_amount) : '',
          escapeCsvCell(rec.external_reference ?? ''),
          escapeCsvCell(rec.currency || 'THB'),
          escapeCsvCell(rec.created_by ?? ''),
        ].join(',')
      );
    }
    downloadCsvLines(`income-${periodSlug(periodLabel)}.csv`, lines);
  };

  const incomeTotalPages = Math.ceil(incomeData.total / incomePageSize) || 1;

  const incomeSummaryRowFiltersActive = Boolean(
    incomeFilters.source_mode || incomeFilters.source_type || incomeFilters.income_status || incomeFilters.receipt
  );

  return (
    <div className="admin-income">
      <div className="admin-expenses-filters">
        <select
          className="admin-select"
          value={incomeFilters.source_mode ?? 'all'}
          onChange={(e) => handleIncomeFilterChange({ source_mode: e.target.value })}
          aria-label="Source mode"
        >
          <option value="all">All modes</option>
          <option value="auto_order">Auto (Order)</option>
          <option value="manual">Manual</option>
        </select>
        <select
          className="admin-select"
          value={incomeFilters.source_type ?? 'all'}
          onChange={(e) => handleIncomeFilterChange({ source_type: e.target.value })}
          aria-label="Source type"
        >
          <option value="all">All types</option>
          {INCOME_SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={incomeFilters.income_status ?? 'all'}
          onChange={(e) => handleIncomeFilterChange({ income_status: e.target.value })}
          aria-label="Status"
        >
          <option value="all">All statuses</option>
          {INCOME_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={incomeFilters.receipt ?? 'all'}
          onChange={(e) => handleIncomeFilterChange({ receipt: e.target.value })}
          aria-label="Proof status"
          title="Missing = non-Stripe without file. Has proof = Stripe or file attached."
        >
          <option value="all">All proof status</option>
          <option value="missing">Missing proof only (non-Stripe)</option>
          <option value="attached">Stripe or file attached</option>
        </select>
        {(incomeFilters.source_mode ||
          incomeFilters.source_type ||
          incomeFilters.income_status ||
          incomeFilters.receipt) && (
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            onClick={() =>
              handleIncomeFilterChange({
                source_mode: undefined,
                source_type: undefined,
                income_status: undefined,
                receipt: undefined,
              })
            }
          >
            Clear
          </button>
        )}
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={exportIncomeCsv}
          disabled={incomeData.records.length === 0}
          title="Export the visible page as CSV"
        >
          Export CSV
        </button>
      </div>

      <div className="admin-expenses-summary">
        <span className="admin-hint">
          {incomeData.total} record{incomeData.total !== 1 ? 's' : ''}
          {incomeData.missingProofCount > 0 && (
            <>
              {' · '}
              <strong style={{ color: '#d97706' }}>
                {incomeData.missingProofCount} missing proof{incomeData.missingProofCount !== 1 ? 's' : ''}
              </strong>
            </>
          )}
        </span>
        <div className="admin-income-summary-totals">
          <span className="admin-expenses-total">
            Confirmed revenue (gross): <strong>{fmt(incomeData.totalConfirmedAmount)}</strong>
          </span>
          {incomeData.totalConfirmedStripeFees > 0 && (
            <span className="admin-expenses-total">
              Stripe fees: <strong>−{fmt(incomeData.totalConfirmedStripeFees)}</strong>
            </span>
          )}
          {periodNetProfit != null && (
            <span className="admin-expenses-total">
              Net profit (period): <strong>{fmt(periodNetProfit)}</strong>
            </span>
          )}
          {incomeData.totalPendingAmount > 0 && (
            <span className="admin-expenses-total" style={{ color: '#d97706' }}>
              Pending: <strong>{fmt(incomeData.totalPendingAmount)}</strong>
            </span>
          )}
        </div>
        {incomeSummaryRowFiltersActive && periodNetProfit != null && (
          <p className="admin-hint" style={{ marginTop: 8, maxWidth: '42rem' }}>
            Gross and Stripe fee totals reflect the filters above. Net profit (period) is still for all income in the selected
            date range, same as the Overview tab.
          </p>
        )}
      </div>

      {incomeData.error ? (
        <div className="admin-error">
          <p>
            <strong>Error loading income records</strong>
          </p>
          <p>{incomeData.error}</p>
        </div>
      ) : incomeData.records.length === 0 ? (
        <p className="admin-empty">No income records found.</p>
      ) : (
        <>
          <div className="admin-expenses-table-wrap">
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Source</th>
                  <th>Mode</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Proof</th>
                  <th className="admin-expenses-col-amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {incomeData.records.map((rec: IncomeRecord) => (
                  <tr
                    key={rec.id}
                    className="admin-expenses-row"
                    onClick={() => router.push(`/admin/accounting/income/${rec.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') router.push(`/admin/accounting/income/${rec.id}`);
                    }}
                  >
                    <td className="admin-expenses-date">
                      {new Date(rec.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="admin-expenses-desc">
                      <span className="admin-expenses-desc-text">{rec.description}</span>
                      {rec.order_id && <span className="admin-expenses-notes">Order: {rec.order_id}</span>}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-category">
                        {rec.payment_method === 'stripe'
                          ? 'Stripe'
                          : rec.payment_method === 'bank_transfer'
                            ? 'Bank transfer'
                            : rec.payment_method === 'qr_payment'
                              ? 'QR payment'
                              : rec.payment_method === 'cash'
                                ? 'Cash'
                                : 'Other'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${rec.source_mode === 'auto_order' ? 'admin-badge-auto' : 'admin-badge-manual'}`}>
                        {rec.source_mode === 'auto_order' ? 'Auto' : 'Manual'}
                      </span>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-category">{rec.source_type}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          rec.income_status === 'confirmed'
                            ? 'admin-badge-paid'
                            : rec.income_status === 'cancelled'
                              ? 'admin-badge-payment-cancelled'
                              : 'admin-badge-payment-pending'
                        }`}
                      >
                        {rec.income_status}
                      </span>
                    </td>
                    <td>
                      {incomeDocumentationComplete(rec) ? (
                        <span className="admin-badge admin-badge-paid" title="Proof on file or Stripe (no upload required)">
                          ✓
                        </span>
                      ) : (
                        <span className="admin-badge admin-badge-payment-pending" title="Upload a proof for non-Stripe income">
                          —
                        </span>
                      )}
                    </td>
                    <td className="admin-expenses-amount">{fmt(rec.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {incomeTotalPages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {(incomePage - 1) * incomePageSize + 1}–{Math.min(incomePage * incomePageSize, incomeData.total)} of{' '}
                {incomeData.total}
              </span>
              <div className="admin-pagination-btns">
                <button
                  type="button"
                  disabled={incomePage <= 1}
                  className="admin-btn admin-btn-sm"
                  onClick={() => {
                    const n = new URLSearchParams(sp.toString());
                    n.set('page', String(incomePage - 1));
                    router.push(`${pathname}?${n.toString()}`);
                  }}
                >
                  Previous
                </button>
                <span className="admin-pagination-info">
                  Page {incomePage} of {incomeTotalPages}
                </span>
                <button
                  type="button"
                  disabled={incomePage >= incomeTotalPages}
                  className="admin-btn admin-btn-sm"
                  onClick={() => {
                    const n = new URLSearchParams(sp.toString());
                    n.set('page', String(incomePage + 1));
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
