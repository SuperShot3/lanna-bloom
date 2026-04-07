'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { MoneyLocationTotal } from '@/types/accounting';
import type { Expense, ExpenseFilters } from '@/types/expenses';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types/expenses';
import type { ExpensesResult } from '@/lib/expenses/expenseQueries';
import type { LedgerResult } from '@/types/ledger';
import { formatStripeNextPayoutShort } from '@/lib/accounting/stripePayoutDisplay';
import { AccountingLedgerTable } from './AccountingLedgerTable';

interface OverviewData {
  totalIncome: number;
  confirmedIncome: number;
  stripeProcessingFees: number;
  confirmedIncomeNet: number;
  pendingIncome: number;
  totalExpenses: number;
  netResult: number;
  incomeByLocation: MoneyLocationTotal[];
  incomeCount: number;
  expenseCount: number;
  currency: string;
}

interface Props {
  overview: OverviewData | null;
  ledger: LedgerResult;
  periodLabel: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  activeTab: 'overview' | 'expenses' | 'ledger';
  expensesData: ExpensesResult;
  expensesPage: number;
  expensesPageSize: number;
  expensesFilters: ExpenseFilters;
}

const LOCATION_LABELS: Record<string, string> = {
  bank:   'Bank Account',
  cash:   'Cash on Hand',
  stripe: 'Stripe Balance',
  other:  'Other',
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
);
const PM_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);

function fmt(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAmount(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AccountingOverviewClient({
  overview,
  ledger,
  periodLabel,
  initialDateFrom,
  initialDateTo,
  activeTab,
  expensesData,
  expensesPage,
  expensesPageSize,
  expensesFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();

  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? '');
  const [dateTo, setDateTo]     = useState(initialDateTo ?? '');
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  /** Keep date inputs aligned with URL when navigating (useState only uses initial value on mount). */
  useEffect(() => {
    setDateFrom(initialDateFrom ?? '');
    setDateTo(initialDateTo ?? '');
  }, [initialDateFrom, initialDateTo]);

  const switchTab = (tab: 'overview' | 'expenses' | 'ledger') => {
    const next = new URLSearchParams(sp.toString());
    if (dateFrom) next.set('dateFrom', dateFrom);
    else next.delete('dateFrom');
    if (dateTo) next.set('dateTo', dateTo);
    else next.delete('dateTo');
    if (tab === 'expenses') next.set('tab', 'expenses');
    else if (tab === 'ledger') next.set('tab', 'ledger');
    else next.delete('tab');
    router.push(`${pathname}?${next.toString()}`);
  };

  const applyFilter = () => {
    const next = new URLSearchParams(sp.toString());
    if (dateFrom) next.set('dateFrom', dateFrom); else next.delete('dateFrom');
    if (dateTo)   next.set('dateTo',   dateTo);   else next.delete('dateTo');
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
    const next = new URLSearchParams(sp.toString());
    next.delete('dateFrom');
    next.delete('dateTo');
    next.delete('page');
    if (activeTab === 'expenses') next.set('tab', 'expenses');
    else if (activeTab === 'ledger') next.set('tab', 'ledger');
    else next.delete('tab');
    router.push(`${pathname}?${next.toString()}`);
  };

  const handleExpenseFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    router.push(`${pathname}?${next.toString()}`);
  };

  const runBackfill = async (dryRun: boolean) => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch('/api/admin/accounting/backfill-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBackfillResult(`Error: ${data.error ?? 'Unknown error'}`);
      } else if (dryRun) {
        setBackfillResult(
          `Dry run: Would create ${data.wouldCreate} records, skip ${data.wouldSkip} already existing (out of ${data.total} paid orders)`
        );
      } else {
        setBackfillResult(data.message ?? `Created: ${data.created}, Skipped: ${data.skipped}`);
        setTimeout(() => router.refresh(), 1500);
      }
    } catch {
      setBackfillResult('Network error. Please try again.');
    } finally {
      setBackfilling(false);
    }
  };

  const net = overview?.netResult ?? 0;
  const isProfit = net >= 0;

  const expensesTotalPages = expensesData
    ? Math.ceil(expensesData.total / expensesPageSize) || 1
    : 1;

  return (
    <div className="admin-accounting">
      {/* Header */}
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Accounting</h1>
          <p className="admin-hint">{periodLabel}</p>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin/accounting/income/new" className="admin-btn admin-btn-primary">
            + Manual Income
          </Link>
          <Link href="/admin/accounting/income" className="admin-btn admin-btn-outline">
            All Income
          </Link>
          <Link href="/admin/expenses/new" className="admin-btn admin-btn-outline">
            + Add Expense
          </Link>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="admin-accounting-tabs">
        <button
          type="button"
          className={`admin-accounting-tab${activeTab === 'overview' ? ' admin-accounting-tab-active' : ''}`}
          onClick={() => switchTab('overview')}
        >
          <span className="material-symbols-outlined">account_balance_wallet</span>
          Overview
        </button>
        <button
          type="button"
          className={`admin-accounting-tab${activeTab === 'expenses' ? ' admin-accounting-tab-active' : ''}`}
          onClick={() => switchTab('expenses')}
        >
          <span className="material-symbols-outlined">receipt_long</span>
          Expenses
          {overview && overview.expenseCount > 0 && (
            <span className="admin-accounting-tab-count">{overview.expenseCount}</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-accounting-tab${activeTab === 'ledger' ? ' admin-accounting-tab-active' : ''}`}
          onClick={() => switchTab('ledger')}
        >
          <span className="material-symbols-outlined">table_rows</span>
          Ledger
          {ledger.rows.length > 0 && (
            <span className="admin-accounting-tab-count">{ledger.rows.length}</span>
          )}
        </button>
        <Link
          href="/admin/accounting/income"
          className="admin-accounting-tab"
        >
          <span className="material-symbols-outlined">payments</span>
          Income Records
          {overview && overview.incomeCount > 0 && (
            <span className="admin-accounting-tab-count">{overview.incomeCount}</span>
          )}
        </Link>
      </div>

      {/* Period filter — shown on both tabs */}
      <div className="admin-accounting-period-row">
        <input
          type="date"
          className="admin-input admin-input-date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="admin-input admin-input-date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
        />
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={applyFilter}>
          Apply
        </button>
        {(initialDateFrom || initialDateTo) && (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={clearFilter}>
            All time
          </button>
        )}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        overview === null ? (
          <div className="admin-error"><p>Failed to load accounting data. Check Supabase configuration.</p></div>
        ) : (
          <>
            {/* Primary KPIs — Net Profit first as hero, then supporting metrics */}
            <div className="admin-accounting-kpi-grid">
              <KpiCard
                label="Net Profit"
                value={fmt(net)}
                sub={isProfit ? 'After all fees & expenses' : 'Loss after all fees & expenses'}
                color={isProfit ? 'green' : 'red'}
                icon={isProfit ? 'savings' : 'trending_down'}
                hero
              />
              <KpiCard
                label="Revenue"
                value={fmt(overview.confirmedIncome)}
                sub="Confirmed income · gross"
                color="green"
                icon="trending_up"
              />
              <KpiCard
                label="Expenses"
                value={fmt(overview.totalExpenses)}
                sub={`${overview.expenseCount} record${overview.expenseCount !== 1 ? 's' : ''}`}
                color="red"
                icon="receipt_long"
              />
              <KpiCard
                label="Orders"
                value={String(overview.incomeCount)}
                sub="Income records in period"
                color="blue"
                icon="shopping_bag"
              />
              <KpiCard
                label="Avg. Order Value"
                value={overview.incomeCount > 0 ? fmt(overview.confirmedIncome / overview.incomeCount) : '—'}
                sub="Revenue ÷ confirmed orders"
                color="blue"
                icon="calculate"
              />
              {overview.pendingIncome > 0 && (
                <KpiCard
                  label="Pending Income"
                  value={fmt(overview.pendingIncome)}
                  sub="Awaiting confirmation"
                  color="yellow"
                  icon="schedule"
                />
              )}
            </div>

            {/* Stripe fee breakdown — secondary detail, only shown when relevant */}
            {overview.stripeProcessingFees > 0 && (
              <div className="admin-accounting-section">
                <h2 className="admin-accounting-section-title">Stripe Fee Breakdown</h2>
                <div className="admin-accounting-kpi-grid admin-accounting-kpi-grid-sm">
                  <KpiCard
                    label="Processing Fees"
                    value={`−${fmt(overview.stripeProcessingFees)}`}
                    sub="Fixed 5.3% on card/Stripe payments"
                    color="blue"
                    icon="percent"
                  />
                </div>
              </div>
            )}

            {/* Money location breakdown */}
            {overview.incomeByLocation.length > 0 && (
              <div className="admin-accounting-section">
                <h2 className="admin-accounting-section-title">Where the Money Is</h2>
                <p className="admin-hint admin-accounting-section-hint">
                  Net balance per channel after fees and expenses. Each expense is deducted from
                  the account it was paid from (cash → Cash, bank transfer/card/QR → Bank Account).
                </p>
                <div className="admin-accounting-location-grid">
                  {overview.incomeByLocation
                    .sort((a, b) => b.netAfterFeesAndExpenses - a.netAfterFeesAndExpenses)
                    .map((loc) => (
                      <div key={loc.location} className="admin-accounting-location-card">
                        <span className="material-symbols-outlined admin-accounting-location-icon">
                          {loc.location === 'bank' ? 'account_balance' : loc.location === 'cash' ? 'payments' : loc.location === 'stripe' ? 'credit_card' : 'wallet'}
                        </span>
                        <div>
                          <p className="admin-accounting-location-label">{LOCATION_LABELS[loc.location] ?? loc.location}</p>
                          <p className="admin-accounting-location-amount">{fmt(loc.netAfterFeesAndExpenses)}</p>
                          {loc.location === 'stripe' && (
                            <p className="admin-hint admin-accounting-location-payout-hint">
                              In Stripe until bank payout · next: {formatStripeNextPayoutShort()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="admin-accounting-section">
              <div className="admin-accounting-quicklinks">
                <button
                  type="button"
                  className="admin-accounting-quicklink"
                  onClick={() => switchTab('expenses')}
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                  Expense Records
                </button>
                <button
                  type="button"
                  className="admin-accounting-quicklink"
                  onClick={() => switchTab('ledger')}
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                  Ledger &amp; Export
                </button>
                <Link href="/admin/orders" className="admin-accounting-quicklink">
                  <span className="material-symbols-outlined">arrow_forward</span>
                  Orders
                </Link>
              </div>
            </div>

            {/* Backfill — collapsed by default */}
            <details className="admin-accounting-section admin-accounting-backfill">
              <summary className="admin-accounting-backfill-summary">
                <span className="admin-accounting-section-title admin-accounting-backfill-summary-title">
                  Historical Backfill
                </span>
                <span className="admin-hint admin-accounting-backfill-summary-hint">Advanced — one-time setup</span>
              </summary>
              <p className="admin-hint">
                Run once to create income records for paid orders that existed before the accounting system was added.
                The operation is idempotent — already-linked orders are skipped automatically.
              </p>
              <div className="admin-accounting-backfill-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline admin-btn-sm"
                  onClick={() => runBackfill(true)}
                  disabled={backfilling}
                >
                  {backfilling ? 'Checking…' : 'Dry Run (preview only)'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary admin-btn-sm"
                  onClick={() => runBackfill(false)}
                  disabled={backfilling}
                >
                  {backfilling ? 'Running…' : 'Run Backfill'}
                </button>
              </div>
              {backfillResult && (
                <p className="admin-accounting-backfill-result">{backfillResult}</p>
              )}
            </details>
          </>
        )
      )}

      {/* ── EXPENSES TAB ── */}
      {activeTab === 'expenses' && (
        <div className="admin-expenses">
          {/* Extra expense-specific filters (category, payment method) */}
          <div className="admin-expenses-filters">
            <select
              className="admin-select"
              value={expensesFilters.category ?? 'all'}
              onChange={(e) => handleExpenseFilterChange({ category: e.target.value })}
              aria-label="Category"
            >
              <option value="all">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              className="admin-select"
              value={expensesFilters.payment_method ?? 'all'}
              onChange={(e) => handleExpenseFilterChange({ payment_method: e.target.value })}
              aria-label="Payment method"
            >
              <option value="all">All payment methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {(expensesFilters.category || expensesFilters.payment_method) && (
              <button
                type="button"
                className="admin-btn admin-btn-outline admin-btn-sm"
                onClick={() => handleExpenseFilterChange({ category: undefined, payment_method: undefined })}
              >
                Clear
              </button>
            )}
          </div>

          {/* Summary */}
              <div className="admin-expenses-summary">
                <span className="admin-hint">
                  {expensesData.total} expense{expensesData.total !== 1 ? 's' : ''} found
                </span>
                <span className="admin-expenses-total">
                  Total: <strong>{formatAmount(expensesData.totalAmount)}</strong>
                </span>
              </div>

              {expensesData.error ? (
                <div className="admin-error">
                  <p><strong>Error loading expenses</strong></p>
                  <p>{expensesData.error}</p>
                </div>
              ) : expensesData.expenses.length === 0 ? (
                <p className="admin-empty">
                  No expenses found.{' '}
                  <Link href="/admin/expenses/new" className="admin-link">Add your first expense →</Link>
                </p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="admin-expenses-table-wrap">
                    <table className="admin-expenses-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Category</th>
                          <th>Payment</th>
                          <th>Receipt</th>
                          <th className="admin-expenses-col-amount">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expensesData.expenses.map((exp: Expense) => (
                          <tr
                            key={exp.id}
                            className="admin-expenses-row"
                            onClick={() => router.push(`/admin/expenses/${exp.id}`)}
                            role="link"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') router.push(`/admin/expenses/${exp.id}`);
                            }}
                          >
                            <td className="admin-expenses-date">{formatDate(exp.date)}</td>
                            <td className="admin-expenses-desc">
                              <span className="admin-expenses-desc-text">{exp.description}</span>
                              {exp.notes && (
                                <span className="admin-expenses-notes">{exp.notes}</span>
                              )}
                            </td>
                            <td>
                              <span className="admin-badge admin-badge-category">
                                {CATEGORY_LABEL[exp.category] ?? exp.category}
                              </span>
                            </td>
                            <td className="admin-expenses-pm">{PM_LABEL[exp.payment_method] ?? exp.payment_method}</td>
                            <td>
                              {exp.receipt_attached ? (
                                <span className="admin-badge admin-badge-paid">✓ Yes</span>
                              ) : (
                                <span className="admin-badge admin-badge-payment-pending">Missing</span>
                              )}
                            </td>
                            <td className="admin-expenses-amount">
                              {formatAmount(exp.amount, exp.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {expensesTotalPages > 1 && (
                    <div className="admin-pagination">
                      <span>
                        Showing {(expensesPage - 1) * expensesPageSize + 1}–{Math.min(expensesPage * expensesPageSize, expensesData.total)} of {expensesData.total}
                      </span>
                      <div className="admin-pagination-btns">
                        <button
                          type="button"
                          disabled={expensesPage <= 1}
                          className="admin-btn admin-btn-sm"
                          onClick={() => {
                            const next = new URLSearchParams(sp.toString());
                            next.set('page', String(expensesPage - 1));
                            router.push(`${pathname}?${next.toString()}`);
                          }}
                        >
                          Previous
                        </button>
                        <span className="admin-pagination-info">Page {expensesPage} of {expensesTotalPages}</span>
                        <button
                          type="button"
                          disabled={expensesPage >= expensesTotalPages}
                          className="admin-btn admin-btn-sm"
                          onClick={() => {
                            const next = new URLSearchParams(sp.toString());
                            next.set('page', String(expensesPage + 1));
                            router.push(`${pathname}?${next.toString()}`);
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
      )}

      {/* ── LEDGER TAB ── */}
      {activeTab === 'ledger' && (
        <AccountingLedgerTable ledger={ledger} periodLabel={periodLabel} />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  icon,
  large = false,
  hero = false,
}: {
  label: string;
  value: string;
  sub: string;
  color: 'green' | 'red' | 'yellow' | 'blue';
  icon: string;
  large?: boolean;
  hero?: boolean;
}) {
  const cls = [
    'admin-accounting-kpi',
    `admin-accounting-kpi-${color}`,
    large ? 'admin-accounting-kpi-large' : '',
    hero  ? 'admin-accounting-kpi-hero'  : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className={`material-symbols-outlined admin-accounting-kpi-icon admin-accounting-kpi-icon-${color}`}>
        {icon}
      </span>
      <div>
        <p className="admin-accounting-kpi-label">{label}</p>
        <p className="admin-accounting-kpi-value">{value}</p>
        <p className="admin-accounting-kpi-sub">{sub}</p>
      </div>
    </div>
  );
}
