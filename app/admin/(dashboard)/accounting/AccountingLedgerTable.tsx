'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LedgerResult, LedgerRow } from '@/types/ledger';

type SortMode = 'date-asc' | 'date-desc' | 'amount-desc' | 'amount-asc';
type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';

function fmt(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDisplayDate(ymd: string) {
  return new Date(ymd + 'T12:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeCsvCell(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: LedgerRow[], includeBalance: boolean) {
  const headers = [
    'Date',
    'Type',
    'Category',
    'Description',
    'Source / account',
    'Amount in',
    'Amount out',
    ...(includeBalance ? ['Running balance'] : []),
    'Reference',
    'Created by',
    'Status',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const line = [
      escapeCsvCell(r.displayDate),
      escapeCsvCell(r.transactionType),
      escapeCsvCell(r.category),
      escapeCsvCell(r.description),
      escapeCsvCell(r.sourceAccount),
      r.amountIn != null ? String(r.amountIn) : '',
      r.amountOut != null ? String(r.amountOut) : '',
      ...(includeBalance ? [String(r.runningBalance)] : []),
      escapeCsvCell(r.referenceId ?? ''),
      escapeCsvCell(r.createdBy),
      escapeCsvCell(r.status ?? ''),
    ].join(',');
    lines.push(line);
  }
  const bom = '\ufeff';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function absAmount(r: LedgerRow): number {
  return r.amountIn ?? r.amountOut ?? 0;
}

function recomputeRunningBalance(
  rows: LedgerRow[],
  opening: number
): LedgerRow[] {
  let b = opening;
  return rows.map((r) => {
    b += r.delta;
    return { ...r, runningBalance: b };
  });
}

interface Props {
  ledger: LedgerResult;
  periodLabel: string;
}

export function AccountingLedgerTable({ ledger, periodLabel }: Props) {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<SortMode>('date-asc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const baseRows = ledger.rows;
  const opening = ledger.openingBalance;

  const { displayRows, showRunningBalance } = useMemo(() => {
    let list = [...baseRows];

    if (typeFilter === 'income') list = list.filter((r) => r.kind === 'income');
    else if (typeFilter === 'expense') list = list.filter((r) => r.kind === 'expense');
    else if (typeFilter === 'transfer') list = list.filter((r) => r.kind === 'transfer');

    const canShowRb =
      sortMode === 'date-asc' && typeFilter === 'all';

    if (sortMode === 'date-asc') {
      list.sort((a, b) => a.sortIso.localeCompare(b.sortIso));
    } else if (sortMode === 'date-desc') {
      list.sort((a, b) => b.sortIso.localeCompare(a.sortIso));
    } else if (sortMode === 'amount-desc') {
      list.sort((a, b) => absAmount(b) - absAmount(a));
    } else {
      list.sort((a, b) => absAmount(a) - absAmount(b));
    }

    if (canShowRb) {
      return { displayRows: recomputeRunningBalance(list, opening), showRunningBalance: true };
    }
    return {
      displayRows: list.map((r) => ({ ...r, runningBalance: r.runningBalance })),
      showRunningBalance: false,
    };
  }, [baseRows, opening, sortMode, typeFilter]);

  const handleRowNav = (r: LedgerRow) => {
    router.push(r.detailHref);
  };

  if (ledger.error) {
    return (
      <div className="admin-accounting-section">
        <h2 className="admin-accounting-section-title">Ledger</h2>
        <div className="admin-error">
          <p>Could not load ledger: {ledger.error}</p>
        </div>
      </div>
    );
  }

  const fname = `ledger-${periodLabel.replace(/[^0-9a-z-]+/gi, '_')}.csv`;

  return (
    <div className="admin-accounting-section admin-ledger">
      <div className="admin-ledger-header">
        <h2 className="admin-accounting-section-title">Export</h2>
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={() => downloadCsv(fname, displayRows, showRunningBalance)}
          disabled={displayRows.length === 0}
        >
          Export CSV
        </button>
      </div>

      <div className="admin-ledger-toolbar">
        <label className="admin-ledger-field">
          <span className="admin-hint">Type</span>
          <select
            className="admin-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            aria-label="Filter by type"
          >
            <option value="all">All</option>
            <option value="income">Income only</option>
            <option value="expense">Expenses only</option>
            <option value="transfer">Transfers only</option>
          </select>
        </label>
        <label className="admin-ledger-field">
          <span className="admin-hint">Sort</span>
          <select
            className="admin-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Sort"
          >
            <option value="date-asc">Date (oldest first)</option>
            <option value="date-desc">Date (newest first)</option>
            <option value="amount-desc">Amount (high → low)</option>
            <option value="amount-asc">Amount (low → high)</option>
          </select>
        </label>
      </div>

      {!showRunningBalance && (
        <p className="admin-hint admin-ledger-rb-note">
          Running balance is shown only for “All” types and date order (oldest first). Change sort or filter to
          explore; totals above still match the selected period.
        </p>
      )}

      {displayRows.length === 0 ? (
        <p className="admin-empty">No transactions in this period.</p>
      ) : (
        <div className="admin-ledger-table-wrap">
          <table className="admin-ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Source / account</th>
                <th className="admin-ledger-num">In</th>
                <th className="admin-ledger-num">Out</th>
                {showRunningBalance && <th className="admin-ledger-num">Balance</th>}
                <th>Ref</th>
                <th>By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r) => (
                <tr
                  key={`${r.kind}-${r.id}`}
                  className={
                    r.kind === 'income'
                      ? 'admin-ledger-row admin-ledger-row-income'
                      : r.kind === 'transfer'
                        ? 'admin-ledger-row'
                        : 'admin-ledger-row admin-ledger-row-expense'
                  }
                  role="link"
                  tabIndex={0}
                  onClick={() => handleRowNav(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRowNav(r);
                  }}
                >
                  <td className="admin-ledger-nowrap">{formatDisplayDate(r.displayDate)}</td>
                  <td className="admin-ledger-nowrap">{r.transactionType}</td>
                  <td>
                    <span className="admin-badge admin-badge-category">{r.category}</span>
                  </td>
                  <td className="admin-ledger-desc">{r.description}</td>
                  <td className="admin-ledger-nowrap">{r.sourceAccount}</td>
                  <td className="admin-ledger-num">{r.amountIn != null ? fmt(r.amountIn, r.currency) : '—'}</td>
                  <td className="admin-ledger-num">{r.amountOut != null ? fmt(r.amountOut, r.currency) : '—'}</td>
                  {showRunningBalance && (
                    <td className="admin-ledger-num admin-ledger-balance">{fmt(r.runningBalance, r.currency)}</td>
                  )}
                  <td className="admin-ledger-mono admin-ledger-ref">
                    {r.referenceId ? (
                      <span title={r.referenceId}>{r.referenceId.slice(0, 8)}…</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="admin-ledger-by">{r.createdBy}</td>
                  <td>{r.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
