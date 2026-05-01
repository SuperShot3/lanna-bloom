'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { MoneyLocationTotal, IncomeRecord, IncomeFilters } from '@/types/accounting';
import { INCOME_SOURCE_TYPES, INCOME_STATUSES, MONEY_LOCATIONS, incomeDocumentationComplete } from '@/types/accounting';
import type { AccountingTransfer } from '@/types/accountingTransfers';
import type { Expense, ExpenseFilters } from '@/types/expenses';
import { billTrackingProgress, expenseDocumentationComplete } from '@/types/expenses';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types/expenses';
import type { ExpensesResult } from '@/lib/expenses/expenseQueries';
import type { LedgerResult } from '@/types/ledger';
import type { IncomeListResult } from '@/lib/accounting/incomeRecords';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
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
  /** Expenses in period missing full documentation (receipt file and/or bill checklist). */
  expensesMissingReceiptCount: number;
  /** Income records in period missing a proof of payment. */
  incomeMissingProofCount: number;
  currency: string;
}

interface Props {
  overview: OverviewData | null;
  ledger: LedgerResult;
  periodLabel: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  /** True when the user has explicitly chosen "All time" (period=all in URL). */
  isAllTime: boolean;
  activeTab: 'overview' | 'expenses' | 'ledger' | 'income' | 'transfers';
  expensesData: ExpensesResult;
  expensesPage: number;
  expensesPageSize: number;
  expensesFilters: ExpenseFilters;
  incomeData: IncomeListResult;
  incomePage: number;
  incomePageSize: number;
  incomeFilters: IncomeFilters;
  transfersData: { transfers: AccountingTransfer[]; error?: string };
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

const TRANSFER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  received: 'Received',
  reconciled: 'Reconciled',
};

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

/** RFC-4180 cell escape (commas, quotes, newlines). */
function escapeCsvCell(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Trigger a CSV download in the browser. Adds UTF-8 BOM for Excel compatibility. */
function downloadCsvLines(filename: string, lines: string[]) {
  const bom = '\ufeff';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Slug a period label into a filename-safe token. */
function periodSlug(periodLabel: string) {
  return periodLabel.replace(/[^0-9a-z-]+/gi, '_');
}

export function AccountingOverviewClient({
  overview,
  ledger,
  periodLabel,
  initialDateFrom,
  initialDateTo,
  isAllTime,
  activeTab,
  expensesData,
  expensesPage,
  expensesPageSize,
  expensesFilters,
  incomeData,
  incomePage,
  incomePageSize,
  incomeFilters,
  transfersData,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();
  const transferFileInputRef = useRef<HTMLInputElement>(null);

  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? '');
  const [dateTo, setDateTo]     = useState(initialDateTo ?? '');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCurrency, setTransferCurrency] = useState('THB');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferFrom, setTransferFrom] = useState('stripe');
  const [transferTo, setTransferTo] = useState('bank');
  const [transferStatus, setTransferStatus] = useState('received');
  const [transferExternalRef, setTransferExternalRef] = useState('');
  const [transferBankReceivedDate, setTransferBankReceivedDate] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferAttachment, setTransferAttachment] = useState<File | null>(null);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferMsg, setTransferMsg] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  /** Keep date inputs aligned with URL when navigating (useState only uses initial value on mount). */
  useEffect(() => {
    setDateFrom(initialDateFrom ?? '');
    setDateTo(initialDateTo ?? '');
  }, [initialDateFrom, initialDateTo]);

  const switchTab = (tab: 'overview' | 'expenses' | 'ledger' | 'income' | 'transfers') => {
    const next = new URLSearchParams(sp.toString());
    if (dateFrom) next.set('dateFrom', dateFrom);
    else next.delete('dateFrom');
    if (dateTo) next.set('dateTo', dateTo);
    else next.delete('dateTo');
    if (tab === 'expenses') next.set('tab', 'expenses');
    else if (tab === 'ledger') next.set('tab', 'ledger');
    else if (tab === 'income') next.set('tab', 'income');
    else if (tab === 'transfers') next.set('tab', 'transfers');
    else next.delete('tab');
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  const applyFilter = () => {
    const next = new URLSearchParams(sp.toString());
    if (dateFrom) next.set('dateFrom', dateFrom); else next.delete('dateFrom');
    if (dateTo)   next.set('dateTo',   dateTo);   else next.delete('dateTo');
    // Choosing explicit dates implicitly leaves "all time" mode.
    next.delete('period');
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  /** Reset to the default "this month" view. */
  const useThisMonth = () => {
    setDateFrom('');
    setDateTo('');
    const next = new URLSearchParams(sp.toString());
    next.delete('dateFrom');
    next.delete('dateTo');
    next.delete('period');
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  /** Switch to all-time view (no period bounds). */
  const useAllTime = () => {
    setDateFrom('');
    setDateTo('');
    const next = new URLSearchParams(sp.toString());
    next.delete('dateFrom');
    next.delete('dateTo');
    next.set('period', 'all');
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  /** Quick range buttons: this month, last month, year-to-date. */
  const useQuickRange = (kind: 'this_month' | 'last_month' | 'ytd') => {
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let from = '';
    let to = '';
    if (kind === 'this_month') {
      from = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
      to   = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (kind === 'last_month') {
      from = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      to   = fmt(new Date(now.getFullYear(), now.getMonth(), 0));
    } else {
      from = fmt(new Date(now.getFullYear(), 0, 1));
      to   = fmt(new Date(now.getFullYear(), 11, 31));
    }
    setDateFrom(from);
    setDateTo(to);
    const next = new URLSearchParams(sp.toString());
    next.set('dateFrom', from);
    next.set('dateTo', to);
    next.delete('period');
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  const handleExpenseFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    next.set('tab', 'expenses');
    router.push(`${pathname}?${next.toString()}`);
  };

  /** From Overview KPI: expenses → incomplete documentation filter; income → missing proof filter. */
  const focusMissingReceipts = (target: 'expenses' | 'income') => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    next.set('tab', target);
    if (target === 'expenses') {
      next.set('documentation', 'incomplete');
      next.delete('receipt');
    } else {
      next.set('receipt', 'missing');
      next.delete('documentation');
    }
    router.push(`${pathname}?${next.toString()}`);
  };

  /** CSV export — Expenses tab. Uses currently-loaded expensesData (already filtered). */
  const exportExpensesCsv = () => {
    const headers = [
      'Date',
      'Description',
      'Category',
      'Payment method',
      'Receipt attached',
      'Bill checks (done/total)',
      'Documentation complete',
      'Amount',
      'Currency',
      'Notes',
      'Linked order',
      'Created by',
    ];
    const lines = [headers.join(',')];
    for (const exp of expensesData.expenses) {
      const p = billTrackingProgress(exp.bill_tracking);
      lines.push([
        escapeCsvCell(exp.date.slice(0, 10)),
        escapeCsvCell(exp.description),
        escapeCsvCell(CATEGORY_LABEL[exp.category] ?? exp.category),
        escapeCsvCell(PM_LABEL[exp.payment_method] ?? exp.payment_method),
        exp.receipt_attached ? 'Yes' : 'MISSING',
        escapeCsvCell(p ? `${p.done}/${p.total}` : '—'),
        expenseDocumentationComplete(exp) ? 'Yes' : 'No',
        String(exp.amount),
        escapeCsvCell(exp.currency || 'THB'),
        escapeCsvCell(exp.notes ?? ''),
        escapeCsvCell(exp.linked_order_id ?? ''),
        escapeCsvCell(exp.created_by ?? ''),
      ].join(','));
    }
    downloadCsvLines(`expenses-${periodSlug(periodLabel)}.csv`, lines);
  };

  /** CSV export — Income Records tab. */
  const exportIncomeCsv = () => {
    const headers = ['Created at', 'Description', 'Order ID', 'Source mode', 'Source type', 'Payment method', 'Money location', 'Status', 'Proof OK (non-Stripe needs file)', 'Gross amount', 'Stripe fee (estimate)', 'External reference', 'Currency', 'Created by'];
    const lines = [headers.join(',')];
    for (const rec of incomeData.records) {
      lines.push([
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
      ].join(','));
    }
    downloadCsvLines(`income-${periodSlug(periodLabel)}.csv`, lines);
  };

  /** CSV export — Transfers tab. */
  const exportTransfersCsv = () => {
    const headers = ['Transfer date', 'From', 'To', 'Status', 'Stripe ref', 'Bank received', 'Attachment', 'Note', 'Amount', 'Currency', 'Created by'];
    const lines = [headers.join(',')];
    for (const t of transfersData.transfers) {
      lines.push([
        escapeCsvCell(t.transfer_date.slice(0, 10)),
        escapeCsvCell(LOCATION_LABELS[t.from_location] ?? t.from_location),
        escapeCsvCell(LOCATION_LABELS[t.to_location] ?? t.to_location),
        escapeCsvCell(t.status),
        escapeCsvCell(t.external_reference ?? ''),
        escapeCsvCell(t.bank_received_date ?? ''),
        t.attachment_attached ? 'Yes' : 'No',
        escapeCsvCell(t.note ?? ''),
        String(t.amount),
        escapeCsvCell(t.currency || 'THB'),
        escapeCsvCell(t.created_by ?? ''),
      ].join(','));
    }
    downloadCsvLines(`transfers-${periodSlug(periodLabel)}.csv`, lines);
  };

  const net = overview?.netResult ?? 0;
  const isProfit = net >= 0;

  const expensesTotalPages = expensesData
    ? Math.ceil(expensesData.total / expensesPageSize) || 1
    : 1;

  const incomeTotalPages = Math.ceil(incomeData.total / incomePageSize) || 1;

  const incomeSummaryRowFiltersActive = Boolean(
    incomeFilters.source_mode || incomeFilters.source_type || incomeFilters.income_status
  );

  const handleIncomeFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v); else next.delete(k);
    });
    next.set('tab', 'income');
    router.push(`${pathname}?${next.toString()}`);
  };

  const handleViewTransferAttachment = async (transferId: string) => {
    try {
      const res = await fetch(`/api/admin/accounting/transfers/${transferId}/attachment-url`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to load attachment');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      alert('Failed to load attachment');
    }
  };

  return (
    <div className="admin-accounting">
      {/* Header */}
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Accounting</h1>
          <p className="admin-hint">{periodLabel}</p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={() => {
              setTransferOpen((v) => !v);
              setTransferMsg(null);
            }}
          >
            Record Stripe Payout
          </button>
          <Link href="/admin/accounting/income/new" className="admin-btn admin-btn-primary">
            + Manual Income
          </Link>
          <Link href="/admin/expenses/new" className="admin-btn admin-btn-outline">
            + Add Expense
          </Link>
        </div>
      </header>

      {transferOpen && (
        <div className="admin-accounting-section" style={{ marginTop: 12 }}>
          <h2 className="admin-accounting-section-title">Record Stripe Payout / Money Transfer</h2>
          <p className="admin-hint">
            Moves already-recorded money between locations. This is not income and does not change revenue or profit.
          </p>
          <div className="admin-accounting-backfill-actions" style={{ flexWrap: 'wrap' }}>
            <input
              type="date"
              className="admin-input admin-input-date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              aria-label="Transfer date"
            />
            <input
              type="number"
              className="admin-input"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="Amount"
              min="0"
              step="0.01"
              inputMode="decimal"
              aria-label="Amount"
              style={{ maxWidth: 160 }}
            />
            <input
              type="text"
              className="admin-input"
              value={transferCurrency}
              onChange={(e) => setTransferCurrency(e.target.value.toUpperCase())}
              placeholder="Currency"
              aria-label="Currency"
              style={{ maxWidth: 110 }}
            />
            <select
              className="admin-select"
              value={transferFrom}
              onChange={(e) => setTransferFrom(e.target.value)}
              aria-label="From location"
            >
              <option value="" disabled>From</option>
              {MONEY_LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <span className="admin-hint" aria-hidden="true">→</span>
            <select
              className="admin-select"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              aria-label="To location"
            >
              <option value="" disabled>To</option>
              {MONEY_LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <select
              className="admin-select"
              value={transferStatus}
              onChange={(e) => setTransferStatus(e.target.value)}
              aria-label="Payout status"
            >
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="reconciled">Reconciled</option>
            </select>
            <input
              type="text"
              className="admin-input"
              value={transferExternalRef}
              onChange={(e) => setTransferExternalRef(e.target.value)}
              placeholder="Stripe payout ID / reference"
              aria-label="Stripe payout reference"
              style={{ minWidth: 220 }}
            />
            <input
              type="date"
              className="admin-input admin-input-date"
              value={transferBankReceivedDate}
              onChange={(e) => setTransferBankReceivedDate(e.target.value)}
              aria-label="Bank received date"
            />
            <input
              type="text"
              className="admin-input"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Note (optional)"
              aria-label="Note"
              style={{ minWidth: 220 }}
            />
            <input
              ref={transferFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              className="admin-expenses-file-input"
              onChange={(e) => setTransferAttachment(e.target.files?.[0] ?? null)}
              aria-label="Attach payout proof"
            />
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={() => transferFileInputRef.current?.click()}
            >
              {transferAttachment ? transferAttachment.name : 'Attach proof'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={transferSaving}
              onClick={async () => {
                setTransferSaving(true);
                setTransferMsg(null);
                try {
                  const amt = parseFloat(transferAmount);
                  let attachmentPath: string | null = null;

                  if (transferAttachment) {
                    const fd = new FormData();
                    fd.append('file', transferAttachment);
                    const uploadRes = await fetch('/api/admin/accounting/upload-proof', {
                      method: 'POST',
                      body: fd,
                    });
                    const uploadData = await uploadRes.json().catch(() => ({}));
                    if (!uploadRes.ok) {
                      setTransferMsg(uploadData.error ?? 'Attachment upload failed');
                      return;
                    }
                    attachmentPath = uploadData.path ?? null;
                  }

                  const res = await fetch('/api/admin/accounting/transfers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      amount: amt,
                      currency: transferCurrency.trim() || 'THB',
                      transfer_date: transferDate,
                      from_location: transferFrom,
                      to_location: transferTo,
                      status: transferStatus,
                      external_reference: transferExternalRef.trim() || null,
                      bank_received_date: transferBankReceivedDate || null,
                      attachment_file_path: attachmentPath,
                      note: transferNote.trim() || null,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setTransferMsg(data.error ?? 'Transfer failed');
                  } else {
                    setTransferMsg('Transfer saved');
                    setTransferAmount('');
                    setTransferExternalRef('');
                    setTransferBankReceivedDate('');
                    setTransferNote('');
                    setTransferAttachment(null);
                    if (transferFileInputRef.current) transferFileInputRef.current.value = '';
                    router.refresh();
                  }
                } catch {
                  setTransferMsg('Network error. Please try again.');
                } finally {
                  setTransferSaving(false);
                }
              }}
            >
              {transferSaving ? 'Saving…' : 'Record transfer'}
            </button>
          </div>
          {transferMsg && <p className="admin-hint" style={{ marginTop: 6 }}>{transferMsg}</p>}
        </div>
      )}

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
          className={`admin-accounting-tab${activeTab === 'income' ? ' admin-accounting-tab-active' : ''}`}
          onClick={() => switchTab('income')}
        >
          <span className="material-symbols-outlined">payments</span>
          Income Records
          {overview && overview.incomeCount > 0 && (
            <span className="admin-accounting-tab-count">{overview.incomeCount}</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-accounting-tab${activeTab === 'transfers' ? ' admin-accounting-tab-active' : ''}`}
          onClick={() => switchTab('transfers')}
        >
          <span className="material-symbols-outlined">swap_horiz</span>
          Payouts & Transfers
          {transfersData.transfers.length > 0 && (
            <span className="admin-accounting-tab-count">{transfersData.transfers.length}</span>
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
      </div>

      {/* Period filter — shown on every tab */}
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
        <span className="admin-hint" aria-hidden="true">|</span>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => useQuickRange('this_month')}>
          This month
        </button>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => useQuickRange('last_month')}>
          Last month
        </button>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => useQuickRange('ytd')}>
          Year to date
        </button>
        {!isAllTime ? (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={useAllTime}>
            All time
          </button>
        ) : (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={useThisMonth}>
            Back to this month
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
              {/* Expense documentation KPI — clickable; opens Expenses tab with incomplete filter. */}
              {overview.expenseCount > 0 && (
                <button
                  type="button"
                  className={`admin-accounting-kpi admin-accounting-kpi-${
                    overview.expensesMissingReceiptCount === 0 ? 'green' : 'yellow'
                  } admin-accounting-kpi-clickable`}
                  onClick={() => focusMissingReceipts('expenses')}
                  aria-label="Show expenses with incomplete documentation"
                  title="Receipt image plus transfer and shop-bill checkboxes per line (when applicable)"
                >
                  <span
                    className={`material-symbols-outlined admin-accounting-kpi-icon admin-accounting-kpi-icon-${
                      overview.expensesMissingReceiptCount === 0 ? 'green' : 'yellow'
                    }`}
                  >
                    {overview.expensesMissingReceiptCount === 0 ? 'task_alt' : 'receipt_long'}
                  </span>
                  <div>
                    <p className="admin-accounting-kpi-label">Expense documentation</p>
                    <p className="admin-accounting-kpi-value">
                      {overview.expenseCount - overview.expensesMissingReceiptCount} / {overview.expenseCount}
                    </p>
                    <p className="admin-accounting-kpi-sub">
                      {overview.expensesMissingReceiptCount === 0
                        ? 'Receipts and bill checks complete'
                        : `${overview.expensesMissingReceiptCount} incomplete — click to list`}
                    </p>
                  </div>
                </button>
              )}
              {overview.incomeCount > 0 && overview.incomeMissingProofCount > 0 && (
                <button
                  type="button"
                  className="admin-accounting-kpi admin-accounting-kpi-yellow admin-accounting-kpi-clickable"
                  onClick={() => focusMissingReceipts('income')}
                  aria-label="Show income records missing uploaded proof"
                  title="Non-Stripe income should have a proof file; Stripe is satisfied by the Stripe dashboard"
                >
                  <span className="material-symbols-outlined admin-accounting-kpi-icon admin-accounting-kpi-icon-yellow">
                    request_quote
                  </span>
                  <div>
                    <p className="admin-accounting-kpi-label">Income proof (non-Stripe)</p>
                    <p className="admin-accounting-kpi-value">
                      {overview.incomeCount - overview.incomeMissingProofCount} / {overview.incomeCount}
                    </p>
                    <p className="admin-accounting-kpi-sub">
                      {overview.incomeMissingProofCount} need upload — click to list
                    </p>
                  </div>
                </button>
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
                    .filter((loc) => loc.location !== 'other')
                    .sort((a, b) => b.netAfterFeesAndExpenses - a.netAfterFeesAndExpenses)
                    .map((loc) => (
                      <div key={loc.location} className="admin-accounting-location-card">
                        <span className="material-symbols-outlined admin-accounting-location-icon">
                          {loc.location === 'bank' ? 'account_balance' : loc.location === 'cash' ? 'payments' : loc.location === 'stripe' ? 'credit_card' : 'wallet'}
                        </span>
                        <div>
                          <p className="admin-accounting-location-label">{LOCATION_LABELS[loc.location] ?? loc.location}</p>
                          <p className="admin-accounting-location-amount">{fmt(loc.netAfterFeesAndExpenses)}</p>
                          {typeof loc.transfersNet === 'number' && loc.transfersNet !== 0 && (
                            <p className="admin-hint" style={{ marginTop: 2 }}>
                              Transfers: {loc.transfersNet > 0 ? '+' : ''}{fmt(loc.transfersNet)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* ── EXPENSES TAB ── */}
      {activeTab === 'expenses' && (
        <div className="admin-expenses">
          {/* Extra expense-specific filters (category, payment method, receipt status) */}
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
            <select
              className="admin-select"
              value={expensesFilters.receipt ?? 'all'}
              onChange={(e) => handleExpenseFilterChange({ receipt: e.target.value })}
              aria-label="Receipt status"
              title="Filter by receipt image on file"
            >
              <option value="all">All receipt status</option>
              <option value="missing">Missing receipt only</option>
              <option value="attached">Has receipt</option>
            </select>
            <select
              className="admin-select"
              value={expensesFilters.documentation ?? 'all'}
              onChange={(e) => handleExpenseFilterChange({ documentation: e.target.value })}
              aria-label="Documentation"
              title="Receipt + bill checklist (transfer + shop bill per line)"
            >
              <option value="all">All documentation</option>
              <option value="incomplete">Incomplete only</option>
              <option value="complete">Complete only</option>
            </select>
            {(expensesFilters.category ||
              expensesFilters.payment_method ||
              expensesFilters.receipt ||
              expensesFilters.documentation) && (
              <button
                type="button"
                className="admin-btn admin-btn-outline admin-btn-sm"
                onClick={() =>
                  handleExpenseFilterChange({
                    category: undefined,
                    payment_method: undefined,
                    receipt: undefined,
                    documentation: undefined,
                  })
                }
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={exportExpensesCsv}
              disabled={expensesData.expenses.length === 0}
              title="Export the visible page as CSV"
            >
              Export CSV
            </button>
          </div>

          {/* Summary */}
              <div className="admin-expenses-summary">
                <span className="admin-hint">
                  {expensesData.total} expense{expensesData.total !== 1 ? 's' : ''} found
                  {expensesData.missingReceiptCount > 0 &&
                    expensesFilters.documentation !== 'incomplete' && (
                    <>
                      {' · '}
                      <strong style={{ color: '#d97706' }}>
                        {expensesData.missingReceiptCount} expense
                        {expensesData.missingReceiptCount !== 1 ? 's' : ''} need documentation
                      </strong>
                    </>
                  )}
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
                          <th>Bills</th>
                          <th className="admin-expenses-col-amount">Amount</th>
                          <th style={{ width: 1 }} aria-label="Actions" />
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
                            <td>
                              {(() => {
                                const p = billTrackingProgress(exp.bill_tracking);
                                if (!p) {
                                  return <span className="admin-hint">—</span>;
                                }
                                const done = p.done === p.total;
                                return (
                                  <span
                                    className={`admin-badge ${done ? 'admin-badge-paid' : 'admin-badge-payment-pending'}`}
                                    title="Transfer + shop bill checks per line"
                                  >
                                    {p.done}/{p.total}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="admin-expenses-amount">
                              {formatAmount(exp.amount, exp.currency)}
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                className="admin-btn admin-btn-outline admin-btn-danger admin-btn-sm"
                                disabled={deletingExpenseId === exp.id}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!confirmDeleteAction('Delete this expense? This cannot be undone.')) return;
                                  setDeletingExpenseId(exp.id);
                                  try {
                                    const res = await fetch(`/api/admin/expenses/${encodeURIComponent(exp.id)}`, {
                                      method: 'DELETE',
                                    });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) {
                                      alert(data.error ?? 'Failed to delete expense');
                                      return;
                                    }
                                    router.refresh();
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : 'Network error');
                                  } finally {
                                    setDeletingExpenseId(null);
                                  }
                                }}
                                title="Delete expense"
                              >
                                {deletingExpenseId === exp.id ? 'Deleting…' : 'Delete'}
                              </button>
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

      {/* ── PAYOUTS & TRANSFERS TAB ── */}
      {activeTab === 'transfers' && (
        <div className="admin-expenses">
          <div className="admin-expenses-filters">
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={exportTransfersCsv}
              disabled={transfersData.transfers.length === 0}
              title="Export visible transfers as CSV"
            >
              Export CSV
            </button>
          </div>
          <div className="admin-expenses-summary">
            <span className="admin-hint">
              {transfersData.transfers.length} transfer{transfersData.transfers.length !== 1 ? 's' : ''} found
            </span>
            <span className="admin-expenses-total">
              Stripe payouts are money movement only, not income.
            </span>
          </div>

          {transfersData.error ? (
            <div className="admin-error">
              <p><strong>Error loading transfers</strong></p>
              <p>{transfersData.error}</p>
            </div>
          ) : transfersData.transfers.length === 0 ? (
            <p className="admin-empty">
              No transfers found. Use <strong>Record Stripe Payout</strong> to move money from Stripe Balance to Bank Account.
            </p>
          ) : (
            <div className="admin-expenses-table-wrap">
              <table className="admin-expenses-table">
                <thead>
                  <tr>
                    <th>Payout date</th>
                    <th>Movement</th>
                    <th>Status</th>
                    <th>Stripe ref</th>
                    <th>Bank received</th>
                    <th>Attachment</th>
                    <th className="admin-expenses-col-amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transfersData.transfers.map((transfer) => (
                    <tr key={transfer.id} className="admin-expenses-row">
                      <td className="admin-expenses-date">{formatDate(transfer.transfer_date)}</td>
                      <td className="admin-expenses-desc">
                        <span className="admin-expenses-desc-text">
                          {(LOCATION_LABELS[transfer.from_location] ?? transfer.from_location)} →{' '}
                          {LOCATION_LABELS[transfer.to_location] ?? transfer.to_location}
                        </span>
                        {transfer.note && (
                          <span className="admin-expenses-notes">{transfer.note}</span>
                        )}
                      </td>
                      <td>
                        <span className={`admin-badge ${transfer.status === 'pending' ? 'admin-badge-payment-pending' : 'admin-badge-paid'}`}>
                          {TRANSFER_STATUS_LABEL[transfer.status] ?? transfer.status}
                        </span>
                      </td>
                      <td className="admin-ledger-mono">
                        {transfer.external_reference ?? '—'}
                      </td>
                      <td className="admin-expenses-date">
                        {transfer.bank_received_date ? formatDate(transfer.bank_received_date) : '—'}
                      </td>
                      <td>
                        {transfer.attachment_attached && transfer.attachment_file_path ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn-outline admin-btn-sm"
                            onClick={() => handleViewTransferAttachment(transfer.id)}
                          >
                            View
                          </button>
                        ) : (
                          <span className="admin-badge admin-badge-payment-pending">None</span>
                        )}
                      </td>
                      <td className="admin-expenses-amount">
                        {formatAmount(transfer.amount, transfer.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── LEDGER TAB ── */}
      {activeTab === 'ledger' && (
        <AccountingLedgerTable ledger={ledger} periodLabel={periodLabel} />
      )}

      {/* ── INCOME TAB ── */}
      {activeTab === 'income' && (
        <div className="admin-income">
          {/* Income-specific filters */}
          <div className="admin-expenses-filters">
            <select className="admin-select" value={incomeFilters.source_mode ?? 'all'}
              onChange={(e) => handleIncomeFilterChange({ source_mode: e.target.value })} aria-label="Source mode">
              <option value="all">All modes</option>
              <option value="auto_order">Auto (Order)</option>
              <option value="manual">Manual</option>
            </select>
            <select className="admin-select" value={incomeFilters.source_type ?? 'all'}
              onChange={(e) => handleIncomeFilterChange({ source_type: e.target.value })} aria-label="Source type">
              <option value="all">All types</option>
              {INCOME_SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select className="admin-select" value={incomeFilters.income_status ?? 'all'}
              onChange={(e) => handleIncomeFilterChange({ income_status: e.target.value })} aria-label="Status">
              <option value="all">All statuses</option>
              {INCOME_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
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
            {(incomeFilters.source_mode || incomeFilters.source_type || incomeFilters.income_status || incomeFilters.receipt) && (
              <button type="button" className="admin-btn admin-btn-outline admin-btn-sm"
                onClick={() => handleIncomeFilterChange({ source_mode: undefined, source_type: undefined, income_status: undefined, receipt: undefined })}>
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

          {/* Summary */}
          <div className="admin-expenses-summary">
            <span className="admin-hint">
              {incomeData.total} record{incomeData.total !== 1 ? 's' : ''}
              {incomeData.missingProofCount > 0 && (
                <>
                  {' · '}
                  <strong style={{ color: '#d97706' }}>
                    {incomeData.missingProofCount} missing proof
                    {incomeData.missingProofCount !== 1 ? 's' : ''}
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
              {overview && (
                <span className="admin-expenses-total">
                  Net profit (period): <strong>{fmt(overview.netResult)}</strong>
                </span>
              )}
              {incomeData.totalPendingAmount > 0 && (
                <span className="admin-expenses-total" style={{ color: '#d97706' }}>
                  Pending: <strong>{fmt(incomeData.totalPendingAmount)}</strong>
                </span>
              )}
            </div>
            {incomeSummaryRowFiltersActive && (
              <p className="admin-hint" style={{ marginTop: 8, maxWidth: '42rem' }}>
                Gross and Stripe fee totals reflect the filters above. Net profit (period) is still for all income
                in the selected date range, same as the Overview tab.
              </p>
            )}
          </div>

          {incomeData.error ? (
            <div className="admin-error">
              <p><strong>Error loading income records</strong></p>
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
                        onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/admin/accounting/income/${rec.id}`); }}
                      >
                        <td className="admin-expenses-date">
                          {new Date(rec.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="admin-expenses-desc">
                          <span className="admin-expenses-desc-text">{rec.description}</span>
                          {rec.order_id && (
                            <span className="admin-expenses-notes">Order: {rec.order_id}</span>
                          )}
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-category">
                            {rec.payment_method === 'stripe' ? 'Stripe' :
                             rec.payment_method === 'bank_transfer' ? 'Bank transfer' :
                             rec.payment_method === 'qr_payment' ? 'QR payment' :
                             rec.payment_method === 'cash' ? 'Cash' : 'Other'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${rec.source_mode === 'auto_order' ? 'admin-badge-auto' : 'admin-badge-manual'}`}>
                            {rec.source_mode === 'auto_order' ? 'Auto' : 'Manual'}
                          </span>
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-category">
                            {rec.source_type}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${rec.income_status === 'confirmed' ? 'admin-badge-paid' : rec.income_status === 'cancelled' ? 'admin-badge-payment-cancelled' : 'admin-badge-payment-pending'}`}>
                            {rec.income_status}
                          </span>
                        </td>
                        <td>
                          {incomeDocumentationComplete(rec) ? (
                            <span className="admin-badge admin-badge-paid" title="Proof on file or Stripe (no upload required)">✓</span>
                          ) : (
                            <span className="admin-badge admin-badge-payment-pending" title="Upload a proof for non-Stripe income">—</span>
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
                  <span>Showing {(incomePage - 1) * incomePageSize + 1}–{Math.min(incomePage * incomePageSize, incomeData.total)} of {incomeData.total}</span>
                  <div className="admin-pagination-btns">
                    <button type="button" disabled={incomePage <= 1} className="admin-btn admin-btn-sm"
                      onClick={() => { const n = new URLSearchParams(sp.toString()); n.set('page', String(incomePage - 1)); n.set('tab', 'income'); router.push(`${pathname}?${n.toString()}`); }}>
                      Previous
                    </button>
                    <span className="admin-pagination-info">Page {incomePage} of {incomeTotalPages}</span>
                    <button type="button" disabled={incomePage >= incomeTotalPages} className="admin-btn admin-btn-sm"
                      onClick={() => { const n = new URLSearchParams(sp.toString()); n.set('page', String(incomePage + 1)); n.set('tab', 'income'); router.push(`${pathname}?${n.toString()}`); }}>
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
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
