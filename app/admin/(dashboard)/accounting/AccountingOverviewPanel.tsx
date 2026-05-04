'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { MoneyLocationTotal } from '@/types/accounting';
import { useMissingCogsSummary } from '@/app/admin/components/MissingCogsNotice';

/** Mirrors `getAccountingOverview` payload (client-safe; keep aligned with server). */
export interface AccountingOverviewSnapshot {
  totalIncome: number;
  confirmedIncome: number;
  stripeProcessingFees: number;
  confirmedIncomeNet: number;
  /** Confirmed Stripe income — gross volume (Stripe Dashboard gross). */
  stripeConfirmedGross: number;
  stripeConfirmedNetBeforeRefunds: number;
  /** Stripe net after fees & Stripe refunds in period (Stripe Dashboard net, when ranges match). */
  stripeNetVolumeAfterRefunds: number;
  stripeRefundsInPeriod: number;
  offStripeConfirmedGross: number;
  offStripeConfirmedNet: number;
  offStripeRefundsInPeriod: number;
  offStripeNetAfterRefunds: number;
  totalRefunds: number;
  confirmedIncomeNetAfterRefunds: number;
  cogsSubtotal: number;
  operatingExpensesSubtotal: number;
  grossProfit: number;
  pendingIncome: number;
  totalExpenses: number;
  netResult: number;
  incomeByLocation: MoneyLocationTotal[];
  /** Cumulative implied balances by payment channel through `ledgerBalanceThrough`. */
  incomeByLocationLedger: MoneyLocationTotal[];
  ledgerBalanceThrough: string;
  incomeCount: number;
  /** Rows with `income_status === 'confirmed'` in period. */
  confirmedIncomeCount: number;
  expenseCount: number;
  expensesMissingReceiptCount: number;
  incomeMissingProofCount: number;
  transfersCount: number;
  currency: string;
}

const LOCATION_LABELS: Record<string, string> = {
  bank: 'Bank',
  cash: 'Cash',
  stripe: 'Stripe',
  other: 'Other',
};

const PRIMARY_LEDGER_LOCATIONS = new Set(['stripe', 'bank', 'cash', 'other']);

function channelHasLedgerActivity(loc: MoneyLocationTotal): boolean {
  return (
    loc.grossTotal !== 0 ||
    loc.netAfterFees !== 0 ||
    loc.allocatedExpenses !== 0 ||
    (loc.transfersNet ?? 0) !== 0 ||
    loc.netAfterFeesAndExpenses !== 0
  );
}

/** Stripe → Bank → Cash always listed when returned by API; Other only when non-zero; unknown buckets appended. */
function ledgerChannelsForDisplay(ledger: MoneyLocationTotal[]): MoneyLocationTotal[] {
  const pick = (loc: string) => ledger.find((l) => l.location === loc);
  const stripe = pick('stripe');
  const bank = pick('bank');
  const cash = pick('cash');
  const other = pick('other');
  const core = [stripe, bank, cash].filter((r): r is MoneyLocationTotal => Boolean(r));
  const includeOther = other != null && channelHasLedgerActivity(other);
  const extras = ledger.filter((l) => !PRIMARY_LEDGER_LOCATIONS.has(l.location)).filter(channelHasLedgerActivity);
  return [...core, ...(includeOther && other ? [other] : []), ...extras];
}

function fmt(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function copyPeriodQuery(sp: URLSearchParams, target: URLSearchParams) {
  for (const key of ['dateFrom', 'dateTo', 'period'] as const) {
    const v = sp.get(key);
    if (v) target.set(key, v);
  }
}

function channelIcon(loc: string) {
  if (loc === 'bank') return 'account_balance';
  if (loc === 'cash') return 'payments';
  if (loc === 'stripe') return 'credit_card';
  return 'wallet';
}

interface Props {
  overview: AccountingOverviewSnapshot;
}

export function AccountingOverviewPanel({ overview }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();
  const { count: missingCogsCount, loaded: missingCogsLoaded } = useMissingCogsSummary();
  const [pnlBreakdownOpen, setPnlBreakdownOpen] = useState(false);

  const net = overview.netResult;
  const isProfit = net >= 0;

  const focusMissingReceipts = (target: 'expenses' | 'income') => {
    const next = new URLSearchParams();
    copyPeriodQuery(sp, next);
    if (target === 'expenses') {
      next.set('documentation', 'incomplete');
      next.delete('receipt');
    } else {
      next.set('receipt', 'missing');
      next.delete('documentation');
    }
    next.delete('page');
    const path = target === 'expenses' ? '/admin/accounting/expenses' : '/admin/accounting/income';
    const q = next.toString();
    router.push(q ? `${path}?${q}` : path);
  };

  const showExpenseDoc = overview.expenseCount > 0;
  const showIncomeProof = overview.incomeCount > 0 && overview.incomeMissingProofCount > 0;
  const expenseDocPct =
    overview.expenseCount > 0
      ? Math.round(((overview.expenseCount - overview.expensesMissingReceiptCount) / overview.expenseCount) * 100)
      : null;
  const incomeProofPct =
    overview.incomeCount > 0
      ? Math.round(((overview.incomeCount - overview.incomeMissingProofCount) / overview.incomeCount) * 100)
      : null;

  const cogsAlert = missingCogsLoaded && missingCogsCount > 0;
  const expenseAlert = showExpenseDoc && overview.expensesMissingReceiptCount > 0;
  const incomeAlert = showIncomeProof;
  const showAlertsRow = cogsAlert || expenseAlert || incomeAlert;

  const channelRows = ledgerChannelsForDisplay(overview.incomeByLocationLedger);

  const maxBar = Math.max(
    ...channelRows.map((l) => Math.abs(l.netAfterFeesAndExpenses)),
    1e-9
  );

  const avgOrder =
    overview.confirmedIncomeCount > 0
      ? fmt(overview.confirmedIncome / overview.confirmedIncomeCount)
      : '—';

  const kpiShell =
    'flex gap-3 rounded-[10px] border border-[var(--admin-border,#e5e7eb)] bg-[var(--admin-card-bg,#f9fafb)] px-4 py-3 sm:px-5 sm:py-4';
  const kpiLabel = 'text-[0.78rem] font-medium leading-tight text-[var(--admin-text-muted,#6b7280)]';
  const kpiValue = 'mt-1 text-[1.15rem] font-medium tabular-nums leading-tight text-[var(--admin-text,#111827)] sm:text-[1.25rem]';
  const kpiSub = 'mt-0.5 text-[0.72rem] font-normal leading-snug text-[var(--admin-text-muted,#6b7280)]';

  return (
    <div className="admin-accounting-overview-root">
      {/* Section 1 — KPI strip */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div
          className={`${kpiShell} sm:col-span-2 xl:col-span-2 xl:min-h-[7.5rem] xl:py-5 ${
            isProfit ? 'border-emerald-200/80 bg-emerald-50/50' : 'border-red-200/80 bg-rose-50/50'
          }`}
        >
          <span
            className={`material-symbols-outlined shrink-0 text-[2rem] opacity-80 sm:text-[2.35rem] ${
              isProfit ? 'text-emerald-600' : 'text-red-600'
            }`}
            aria-hidden
          >
            {isProfit ? 'savings' : 'trending_down'}
          </span>
          <div className="min-w-0 flex-1">
            <p className={kpiLabel}>Net profit</p>
            <p className={`${kpiValue} text-[1.35rem] sm:text-[1.65rem] xl:text-[1.85rem]`}>{fmt(net)}</p>
            <p className={kpiSub}>
              Stripe + non-Stripe income, after fees &amp; refunds, COGS, and operating expenses — see breakdown
            </p>
          </div>
        </div>

        <div className={`${kpiShell} xl:col-span-1`}>
          <span className="material-symbols-outlined shrink-0 text-[1.5rem] text-sky-600 opacity-80" aria-hidden>
            credit_card
          </span>
          <div className="min-w-0">
            <p className={kpiLabel}>Stripe — gross volume</p>
            <p className={kpiValue}>{fmt(overview.stripeConfirmedGross)}</p>
            <p className={kpiSub}>Net {fmt(overview.stripeNetVolumeAfterRefunds)} · compare Dashboard</p>
          </div>
        </div>

        <div className={`${kpiShell} xl:col-span-1`}>
          <span className="material-symbols-outlined shrink-0 text-[1.5rem] text-teal-600 opacity-80" aria-hidden>
            account_balance
          </span>
          <div className="min-w-0">
            <p className={kpiLabel}>Non-Stripe income</p>
            <p className={kpiValue}>{fmt(overview.offStripeNetAfterRefunds)}</p>
            <p className={kpiSub}>Bank, QR, cash, manual (LINE, etc.)</p>
          </div>
        </div>

        <div className={`${kpiShell} xl:col-span-1`}>
          <span className="material-symbols-outlined shrink-0 text-[1.5rem] text-violet-600 opacity-80" aria-hidden>
            inventory_2
          </span>
          <div className="min-w-0">
            <p className={kpiLabel}>Confirmed rows</p>
            <p className={kpiValue}>{overview.confirmedIncomeCount}</p>
            <p className={kpiSub}>Income records · includes Stripe, bank, manual</p>
          </div>
        </div>

        <div className={`${kpiShell} xl:col-span-1`}>
          <span className="material-symbols-outlined shrink-0 text-[1.5rem] text-amber-600 opacity-80" aria-hidden>
            avg_pace
          </span>
          <div className="min-w-0">
            <p className={kpiLabel}>Avg order value</p>
            <p className={kpiValue}>{avgOrder}</p>
            <p className={kpiSub}>Confirmed gross ÷ income rows ({overview.confirmedIncomeCount})</p>
          </div>
        </div>

        <div className={`${kpiShell} xl:col-span-1`}>
          <span className="material-symbols-outlined shrink-0 text-[1.5rem] text-red-600 opacity-80" aria-hidden>
            receipt_long
          </span>
          <div className="min-w-0">
            <p className={kpiLabel}>Expenses</p>
            <p className={kpiValue}>{fmt(overview.totalExpenses)}</p>
            <p className={kpiSub}>{overview.expenseCount} rows · {fmt(overview.totalExpenses)} combined</p>
          </div>
        </div>
      </div>

      {/* Section 2 — P&amp;L + channels */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:gap-10">
        <section className="admin-accounting-section mb-0 min-w-0">
          <h2 className="admin-accounting-section-title mb-0" id="accounting-pnl-heading">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent bg-transparent py-1 text-left font-[inherit] text-[inherit] transition hover:border-[var(--admin-border,#e5e7eb)] hover:bg-[var(--admin-card-bg,#f9fafb)] sm:py-0"
              onClick={() => setPnlBreakdownOpen((o) => !o)}
              aria-expanded={pnlBreakdownOpen}
              aria-controls="accounting-pnl-breakdown"
            >
              <span className="min-w-0">How we get to net profit</span>
              <span className="material-symbols-outlined shrink-0 text-[1.35rem] leading-none text-[var(--admin-text-muted,#6b7280)]" aria-hidden>
                {pnlBreakdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </h2>
          <div
            id="accounting-pnl-breakdown"
            role="region"
            aria-labelledby="accounting-pnl-heading"
            hidden={!pnlBreakdownOpen}
          >
              <p className="admin-accounting-pl-foot mb-3.5 mt-2 max-w-none sm:mt-3">
                Revenue is split: Stripe (card) vs everything else. Total revenue, then COGS, operating expenses, net profit.
              </p>
              <div
                className="admin-accounting-pl-table admin-accounting-pl-table--overview max-w-[40rem] shadow-sm"
                aria-label="Profit and loss detail"
              >
                <div className="admin-accounting-pl-row">
                  <div className="admin-accounting-pl-dt">Stripe — gross volume (card / online)</div>
                  <div className="admin-accounting-pl-dd admin-accounting-pl-dd--in">{fmt(overview.stripeConfirmedGross)}</div>
                </div>
                <div className="admin-accounting-pl-row">
                  <div className="admin-accounting-pl-dt">Stripe — net volume (after fees &amp; Stripe refunds)</div>
                  <div className="admin-accounting-pl-dd admin-accounting-pl-dd--in">{fmt(overview.stripeNetVolumeAfterRefunds)}</div>
                </div>
                {(overview.stripeProcessingFees > 0 || overview.stripeRefundsInPeriod > 0) && (
                  <p className="admin-accounting-pl-foot -mt-1 mb-2 max-w-[40rem] pl-1 text-[0.8rem] text-[var(--admin-text-muted,#6b7280)]">
                    Fees −{fmt(overview.stripeProcessingFees)}
                    {overview.stripeRefundsInPeriod > 0 ? ` · Stripe refunds −${fmt(overview.stripeRefundsInPeriod)}` : ''}
                  </p>
                )}
                <div className="admin-accounting-pl-row">
                  <div className="admin-accounting-pl-dt">
                    Non-Stripe — bank, QR, cash, manual (e.g. LINE without an order)
                  </div>
                  <div className="admin-accounting-pl-dd admin-accounting-pl-dd--in">{fmt(overview.offStripeNetAfterRefunds)}</div>
                </div>
                {overview.offStripeRefundsInPeriod > 0 && (
                  <p className="admin-accounting-pl-foot -mt-1 mb-2 max-w-[40rem] pl-1 text-[0.8rem] text-[var(--admin-text-muted,#6b7280)]">
                    Non-Stripe refunds in period −{fmt(overview.offStripeRefundsInPeriod)}
                  </p>
                )}
                <div className="admin-accounting-pl-row admin-accounting-pl-row--subtotal">
                  <div className="admin-accounting-pl-dt">Total confirmed revenue (all buckets)</div>
                  <div className="admin-accounting-pl-dd admin-accounting-pl-dd--in">{fmt(overview.confirmedIncomeNetAfterRefunds)}</div>
                </div>
                <div className="admin-accounting-pl-row">
                  <div className="admin-accounting-pl-dt">COGS — flowers, packaging, balloons, plush, cards &amp; delivery</div>
                  <div className="admin-accounting-pl-dd admin-accounting-pl-dd--out">−{fmt(overview.cogsSubtotal)}</div>
                </div>
                <div className="admin-accounting-pl-row admin-accounting-pl-row--subtotal">
                  <div className="admin-accounting-pl-dt">Gross profit</div>
                  <div
                    className={`admin-accounting-pl-dd ${overview.grossProfit >= 0 ? 'admin-accounting-pl-dd--in' : 'admin-accounting-pl-dd--out'}`}
                  >
                    {fmt(overview.grossProfit)}
                  </div>
                </div>
                <div className="admin-accounting-pl-row">
                  <div className="admin-accounting-pl-dt">Operating expenses — advertising, transport, tools, supplier &amp; other</div>
                  <div className="admin-accounting-pl-dd admin-accounting-pl-dd--out">
                    −{fmt(overview.operatingExpensesSubtotal)}
                  </div>
                </div>
                <div className="admin-accounting-pl-row admin-accounting-pl-row--total">
                  <div className="admin-accounting-pl-dt">Net profit</div>
                  <div className={`admin-accounting-pl-dd ${isProfit ? 'admin-accounting-pl-dd--in' : 'admin-accounting-pl-dd--out'}`}>
                    {fmt(net)}
                  </div>
                </div>
              </div>
              <p className="admin-accounting-pl-foot mt-3 max-w-[40rem]">
                <span className="font-medium text-[var(--admin-text,#111827)]">Cross-check:</span> gross profit ({fmt(overview.grossProfit)}) −
                operating ({fmt(overview.operatingExpensesSubtotal)}) = net ({fmt(net)}). Stripe net volume should match the Stripe
                Dashboard when the same date range is selected; small differences can come from fee timing or estimated fees on older
                rows.
              </p>
          </div>
        </section>

        <section className="admin-accounting-section mb-0">
          <h2 className="admin-accounting-section-title">Where the money is</h2>
          <p className="admin-hint mb-4 mt-1 text-[0.82rem] leading-snug text-[var(--admin-text-muted,#6b7280)]">
            YTD {(overview.ledgerBalanceThrough ?? '').slice(0, 4) || new Date().getFullYear()}
          </p>
          <div className="flex flex-col gap-5">
            {channelRows.length === 0 ? (
              <p className="admin-hint text-[0.85rem] text-[var(--admin-text-muted,#6b7280)]">No channel totals to display.</p>
            ) : (
              channelRows.map((loc) => {
                const v = loc.netAfterFeesAndExpenses;
                const pct = Math.min(100, (Math.abs(v) / maxBar) * 100);
                const positive = v >= 0;
                return (
                  <div key={loc.location}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[0.88rem] font-medium text-[var(--admin-text,#111827)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[1.15rem] text-[var(--admin-text-muted,#6b7280)]" aria-hidden>
                          {channelIcon(loc.location)}
                        </span>
                        {LOCATION_LABELS[loc.location] ?? loc.location}
                      </span>
                      <span className="tabular-nums">{fmt(v)}</span>
                    </div>
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--admin-border,#e5e7eb)]"
                      role="presentation"
                      aria-hidden
                    >
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${
                          positive ? 'bg-emerald-500/85' : 'bg-rose-500/85'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Section 3 — Alerts */}
      {showAlertsRow && (
        <section className="admin-accounting-section mb-0" aria-label="Accounting alerts">
          <h2 className="admin-accounting-section-title">Needs attention</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {cogsAlert && (
              <div
                className="flex min-w-[min(100%,260px)] flex-1 items-start gap-3 rounded-[10px] border border-rose-200/90 bg-rose-50/60 px-4 py-3"
                role="status"
              >
                <span className="material-symbols-outlined mt-0.5 text-rose-600" aria-hidden>
                  error
                </span>
                <div className="min-w-0 text-[0.88rem] leading-snug text-[var(--admin-text,#111827)]">
                  <p className="font-medium">
                    {missingCogsCount} paid order{missingCogsCount === 1 ? '' : 's'} missing COGS
                  </p>
                  <p className="mt-1 text-[var(--admin-text-muted,#6b7280)]">
                    <Link href="/admin/orders" className="admin-link font-medium">
                      Review orders →
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {expenseAlert && expenseDocPct !== null && (
              <button
                type="button"
                className="flex min-w-[min(100%,260px)] flex-1 items-start gap-3 rounded-[10px] border border-amber-200/90 bg-amber-50/50 px-4 py-3 text-left transition hover:border-amber-300"
                onClick={() => focusMissingReceipts('expenses')}
                aria-label="Show expenses with incomplete documentation"
              >
                <span className="material-symbols-outlined mt-0.5 text-amber-700" aria-hidden>
                  receipt_long
                </span>
                <div className="min-w-0 text-[0.88rem] leading-snug text-[var(--admin-text,#111827)]">
                  <p className="font-medium">Expense documentation {expenseDocPct}% complete</p>
                  <p className="mt-1 text-[var(--admin-text-muted,#6b7280)]">
                    {overview.expensesMissingReceiptCount} incomplete — open list
                  </p>
                </div>
              </button>
            )}

            {incomeAlert && incomeProofPct !== null && (
              <button
                type="button"
                className="flex min-w-[min(100%,260px)] flex-1 items-start gap-3 rounded-[10px] border border-amber-200/90 bg-amber-50/50 px-4 py-3 text-left transition hover:border-amber-300"
                onClick={() => focusMissingReceipts('income')}
                aria-label="Show income records missing uploaded proof"
              >
                <span className="material-symbols-outlined mt-0.5 text-amber-700" aria-hidden>
                  request_quote
                </span>
                <div className="min-w-0 text-[0.88rem] leading-snug text-[var(--admin-text,#111827)]">
                  <p className="font-medium">Income proof {incomeProofPct}% complete</p>
                  <p className="mt-1 text-[var(--admin-text-muted,#6b7280)]">
                    {overview.incomeMissingProofCount} need upload — open list
                  </p>
                </div>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
