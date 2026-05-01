'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LedgerResult, LedgerRow } from '@/types/ledger';

type SortMode = 'date-asc' | 'date-desc' | 'amount-desc' | 'amount-asc';
type SubView = 'all' | 'income' | 'expense' | 'transfer' | 'missing';

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

function absAmount(r: LedgerRow): number {
  return r.amountIn ?? r.amountOut ?? 0;
}

function recomputeRunningBalance(rows: LedgerRow[], opening: number): LedgerRow[] {
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
  const [subView, setSubView] = useState<SubView>('all');

  const opening = ledger.openingBalance;

  const handleRowNav = (r: LedgerRow) => router.push(r.detailHref);

  // Filter rows by sub-view
  const filteredRows = useMemo(() => {
    const all = ledger.rows;
    if (subView === 'income') return all.filter((r) => r.kind === 'income');
    if (subView === 'expense') return all.filter((r) => r.kind === 'expense');
    if (subView === 'transfer') return all.filter((r) => r.kind === 'transfer');
    if (subView === 'missing') {
      return all.filter(
        (r) => (r.kind === 'income' || r.kind === 'expense') && r.receiptAttached === false
      );
    }
    return all;
  }, [ledger.rows, subView]);

  // Sort rows for the flat-table views
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    if (sortMode === 'date-asc') list.sort((a, b) => a.sortIso.localeCompare(b.sortIso));
    else if (sortMode === 'date-desc') list.sort((a, b) => b.sortIso.localeCompare(a.sortIso));
    else if (sortMode === 'amount-desc') list.sort((a, b) => absAmount(b) - absAmount(a));
    else list.sort((a, b) => absAmount(a) - absAmount(b));
    return list;
  }, [filteredRows, sortMode]);

  const showRunningBalance = subView === 'all' && sortMode === 'date-asc';
  const allRows = useMemo(
    () => (showRunningBalance ? recomputeRunningBalance(sortedRows, opening) : sortedRows),
    [showRunningBalance, sortedRows, opening]
  );

  // Whether to show monthly group headers (only meaningful with multi-month periods, all-types view)
  const showMonthly =
    ledger.monthlyGroups.length > 1 && subView === 'all' && sortMode === 'date-desc';

  const exportCurrentViewCsv = () => {
    const isAll = subView === 'all';
    const isIncome = subView === 'income';
    const isExpense = subView === 'expense';
    const isTransfer = subView === 'transfer';
    const isMissing = subView === 'missing';

    const headers: string[] = ['Date'];
    if (isAll || isMissing) headers.push('Type');
    headers.push('Category');
    headers.push('Description');
    if (isAll || isIncome || isExpense) headers.push('Source / account');
    if (isTransfer) headers.push('From → To');
    if (isIncome || isAll) headers.push('Amount in');
    if (isExpense || isAll || isMissing) headers.push('Amount out');
    if (showRunningBalance) headers.push('Running balance');
    if (isAll || isIncome || isMissing) headers.push('Receipt / proof');
    headers.push('Reference');
    headers.push('Created by');
    headers.push('Status');

    const lines = [headers.join(',')];
    for (const r of allRows) {
      const cells: string[] = [];
      cells.push(escapeCsvCell(r.displayDate));
      if (isAll || isMissing) cells.push(escapeCsvCell(r.transactionType));
      cells.push(escapeCsvCell(r.category));
      cells.push(escapeCsvCell(r.description));
      if (isAll || isIncome || isExpense) cells.push(escapeCsvCell(r.sourceAccount));
      if (isTransfer) cells.push(escapeCsvCell(r.sourceAccount));
      if (isIncome || isAll) cells.push(r.amountIn != null ? String(r.amountIn) : '');
      if (isExpense || isAll || isMissing) cells.push(r.amountOut != null ? String(r.amountOut) : '');
      if (showRunningBalance) cells.push(String(r.runningBalance));
      if (isAll || isIncome || isMissing) {
        cells.push(r.receiptAttached === null ? 'n/a' : r.receiptAttached ? 'Yes' : 'MISSING');
      }
      cells.push(escapeCsvCell(r.referenceId ?? ''));
      cells.push(escapeCsvCell(r.createdBy));
      cells.push(escapeCsvCell(r.status ?? ''));
      lines.push(cells.join(','));
    }
    downloadCsvLines(`ledger-${subView}-${periodSlug(periodLabel)}.csv`, lines);
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

  return (
    <div className="admin-accounting-section admin-ledger">
      {/* Sub-tab strip */}
      <div className="admin-ledger-subtabs" role="tablist" aria-label="Ledger view">
        <SubTabButton current={subView} value="all" label="All" count={ledger.rows.length} onSelect={setSubView} />
        <SubTabButton current={subView} value="income" label="Income" count={ledger.counts.income} onSelect={setSubView} />
        <SubTabButton current={subView} value="expense" label="Expenses" count={ledger.counts.expense} onSelect={setSubView} />
        <SubTabButton current={subView} value="transfer" label="Transfers" count={ledger.counts.transfer} onSelect={setSubView} />
        <SubTabButton
          current={subView}
          value="missing"
          label="Missing docs"
          count={ledger.counts.missingReceipts}
          onSelect={setSubView}
          warn={ledger.counts.missingReceipts > 0}
        />
      </div>

      <div className="admin-ledger-toolbar">
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
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={exportCurrentViewCsv}
          disabled={allRows.length === 0}
          title="Export the current sub-view as CSV"
        >
          Export CSV
        </button>
      </div>

      {!showRunningBalance && subView === 'all' && (
        <p className="admin-hint admin-ledger-rb-note">
          Running balance is shown only for &ldquo;All&rdquo; types and date order (oldest first).
          Change sort or sub-view to explore; period totals above still match the selected period.
        </p>
      )}

      {allRows.length === 0 ? (
        <p className="admin-empty">
          {subView === 'missing'
            ? 'No missing documentation in this period — income proof and expense receipts/checklists are complete.'
            : 'No transactions in this period.'}
        </p>
      ) : showMonthly ? (
        <MonthlyGroupedTable
          ledger={ledger}
          rows={allRows}
          subView={subView}
          showRunningBalance={false}
          onRowNav={handleRowNav}
        />
      ) : (
        <FlatTable
          rows={allRows}
          subView={subView}
          showRunningBalance={showRunningBalance}
          onRowNav={handleRowNav}
        />
      )}

      {/* Footer subtotals — context-sensitive to current view */}
      {(subView === 'expense' || (subView === 'all' && ledger.expensesByCategory.length > 0)) && (
        <SubtotalCard
          title="Expenses by category"
          items={ledger.expensesByCategory.map((c) => ({
            label: c.label,
            count: c.count,
            total: c.total,
            sign: 'neg',
          }))}
          grandTotal={ledger.periodTotals.totalExpenses}
          grandLabel="Total expenses"
          sign="neg"
        />
      )}

      {(subView === 'income' || (subView === 'all' && ledger.incomeByPaymentMethod.length > 0)) && (
        <SubtotalCard
          title="Income by payment method"
          items={ledger.incomeByPaymentMethod.map((p) => ({
            label: p.label,
            count: p.count,
            total: p.total,
            sign: 'pos',
          }))}
          grandTotal={ledger.periodTotals.totalIncome}
          grandLabel="Total income (net of fees)"
          sign="pos"
        />
      )}
    </div>
  );
}

// ─── Sub-tab button ──────────────────────────────────────────────────────────
function SubTabButton({
  current,
  value,
  label,
  count,
  onSelect,
  warn,
}: {
  current: SubView;
  value: SubView;
  label: string;
  count: number;
  onSelect: (v: SubView) => void;
  warn?: boolean;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`admin-ledger-subtab${active ? ' admin-ledger-subtab-active' : ''}${
        warn ? ' admin-ledger-subtab-warn' : ''
      }`}
      onClick={() => onSelect(value)}
    >
      {label}
      <span className="admin-ledger-subtab-count">{count}</span>
    </button>
  );
}

// ─── Flat table (no monthly grouping) ────────────────────────────────────────
function FlatTable({
  rows,
  subView,
  showRunningBalance,
  onRowNav,
}: {
  rows: LedgerRow[];
  subView: SubView;
  showRunningBalance: boolean;
  onRowNav: (r: LedgerRow) => void;
}) {
  return (
    <div className="admin-ledger-table-wrap">
      <table className="admin-ledger-table">
        <Thead subView={subView} showRunningBalance={showRunningBalance} />
        <tbody>
          {rows.map((r) => (
            <LedgerTr key={`${r.kind}-${r.id}`} r={r} subView={subView} showRunningBalance={showRunningBalance} onRowNav={onRowNav} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Monthly-grouped table ───────────────────────────────────────────────────
function MonthlyGroupedTable({
  ledger,
  rows,
  subView,
  showRunningBalance,
  onRowNav,
}: {
  ledger: LedgerResult;
  rows: LedgerRow[];
  subView: SubView;
  showRunningBalance: boolean;
  onRowNav: (r: LedgerRow) => void;
}) {
  // Build a row-id -> row map so we can render each group in the order monthlyGroups gives.
  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  return (
    <div className="admin-ledger-monthly">
      {ledger.monthlyGroups.map((group) => {
        const groupRows = group.rowIds.map((id) => rowsById.get(id)).filter((r): r is LedgerRow => !!r);
        if (groupRows.length === 0) return null;
        return (
          <details key={group.ym} className="admin-ledger-month" open>
            <summary className="admin-ledger-month-summary">
              <span className="admin-ledger-month-label">{group.label}</span>
              <span className="admin-ledger-month-stats">
                <span>
                  Income <strong style={{ color: '#16a34a' }}>{fmt(group.totalIncome)}</strong>
                </span>
                <span>
                  Expenses <strong style={{ color: '#dc2626' }}>{fmt(group.totalExpenses)}</strong>
                </span>
                <span>
                  Net{' '}
                  <strong style={{ color: group.net >= 0 ? '#16a34a' : '#dc2626' }}>
                    {fmt(group.net)}
                  </strong>
                </span>
              </span>
            </summary>
            <div className="admin-ledger-table-wrap">
              <table className="admin-ledger-table">
                <Thead subView={subView} showRunningBalance={showRunningBalance} />
                <tbody>
                  {groupRows.map((r) => (
                    <LedgerTr
                      key={`${r.kind}-${r.id}`}
                      r={r}
                      subView={subView}
                      showRunningBalance={showRunningBalance}
                      onRowNav={onRowNav}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}

// ─── Table head — adapts columns to the active sub-view ──────────────────────
function Thead({ subView, showRunningBalance }: { subView: SubView; showRunningBalance: boolean }) {
  const showType = subView === 'all' || subView === 'missing';
  const showSource = subView !== 'transfer';
  const showFromTo = subView === 'transfer';
  const showIn = subView === 'all' || subView === 'income';
  const showOut = subView === 'all' || subView === 'expense' || subView === 'missing';
  const showReceipt = subView === 'all' || subView === 'income' || subView === 'expense' || subView === 'missing';

  return (
    <thead>
      <tr>
        <th>Date</th>
        {showType && <th>Type</th>}
        <th>Category</th>
        <th>Description</th>
        {showSource && <th>Source / account</th>}
        {showFromTo && <th>From → To</th>}
        {showIn && <th className="admin-ledger-num">In</th>}
        {showOut && <th className="admin-ledger-num">Out</th>}
        {showRunningBalance && <th className="admin-ledger-num">Balance</th>}
        {showReceipt && <th>Receipt</th>}
        <th>Ref</th>
        <th>By</th>
        <th>Status</th>
      </tr>
    </thead>
  );
}

// ─── Table row ───────────────────────────────────────────────────────────────
function LedgerTr({
  r,
  subView,
  showRunningBalance,
  onRowNav,
}: {
  r: LedgerRow;
  subView: SubView;
  showRunningBalance: boolean;
  onRowNav: (r: LedgerRow) => void;
}) {
  const showType = subView === 'all' || subView === 'missing';
  const showSource = subView !== 'transfer';
  const showFromTo = subView === 'transfer';
  const showIn = subView === 'all' || subView === 'income';
  const showOut = subView === 'all' || subView === 'expense' || subView === 'missing';
  const showReceipt = subView === 'all' || subView === 'income' || subView === 'expense' || subView === 'missing';

  return (
    <tr
      className={
        r.kind === 'income'
          ? 'admin-ledger-row admin-ledger-row-income'
          : r.kind === 'transfer'
            ? 'admin-ledger-row'
            : 'admin-ledger-row admin-ledger-row-expense'
      }
      role="link"
      tabIndex={0}
      onClick={() => onRowNav(r)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onRowNav(r);
      }}
    >
      <td className="admin-ledger-nowrap">{formatDisplayDate(r.displayDate)}</td>
      {showType && <td className="admin-ledger-nowrap">{r.transactionType}</td>}
      <td>
        <span className="admin-badge admin-badge-category">{r.category}</span>
      </td>
      <td className="admin-ledger-desc">{r.description}</td>
      {showSource && <td className="admin-ledger-nowrap">{r.sourceAccount}</td>}
      {showFromTo && <td className="admin-ledger-nowrap">{r.sourceAccount}</td>}
      {showIn && (
        <td className="admin-ledger-num">{r.amountIn != null ? fmt(r.amountIn, r.currency) : '—'}</td>
      )}
      {showOut && (
        <td className="admin-ledger-num">{r.amountOut != null ? fmt(r.amountOut, r.currency) : '—'}</td>
      )}
      {showRunningBalance && (
        <td className="admin-ledger-num admin-ledger-balance">{fmt(r.runningBalance, r.currency)}</td>
      )}
      {showReceipt && (
        <td>
          {r.receiptAttached === null ? (
            <span className="admin-hint">—</span>
          ) : r.receiptAttached ? (
            <span className="admin-badge admin-badge-paid">✓</span>
          ) : (
            <span className="admin-badge admin-badge-payment-pending">Missing</span>
          )}
        </td>
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
  );
}

// ─── Footer subtotal card ────────────────────────────────────────────────────
function SubtotalCard({
  title,
  items,
  grandTotal,
  grandLabel,
  sign,
}: {
  title: string;
  items: { label: string; count: number; total: number; sign: 'pos' | 'neg' }[];
  grandTotal: number;
  grandLabel: string;
  sign: 'pos' | 'neg';
}) {
  if (items.length === 0) return null;
  const color = sign === 'pos' ? '#16a34a' : '#dc2626';
  return (
    <div className="admin-ledger-subtotals">
      <h3 className="admin-ledger-subtotals-title">{title}</h3>
      <ul className="admin-ledger-subtotals-list">
        {items.map((it) => (
          <li key={it.label} className="admin-ledger-subtotal-row">
            <span className="admin-ledger-subtotal-label">
              {it.label} <span className="admin-hint">({it.count})</span>
            </span>
            <span className="admin-ledger-subtotal-amount" style={{ color }}>
              {it.sign === 'neg' ? '−' : ''}
              {fmt(it.total)}
            </span>
          </li>
        ))}
        <li className="admin-ledger-subtotal-row admin-ledger-subtotal-grand">
          <span className="admin-ledger-subtotal-label">{grandLabel}</span>
          <span className="admin-ledger-subtotal-amount" style={{ color }}>
            {sign === 'neg' ? '−' : ''}
            {fmt(grandTotal)}
          </span>
        </li>
      </ul>
    </div>
  );
}
