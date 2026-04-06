import Link from 'next/link';
import { STRIPE_FEE_PERCENT_LABEL } from '@/lib/accounting/stripeFee';

export default function AccountingInfoPage() {
  return (
    <div className="admin-accounting-info">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/accounting" className="admin-back-link">← Accounting</Link>
          <h1 className="admin-title">How accounting works</h1>
          <p className="admin-hint">
            Quick reference for staff — what the admin numbers mean today (not legal or tax advice).
          </p>
        </div>
      </header>

      <div className="admin-accounting-info-body">
        <section className="admin-accounting-info-section">
          <h2 className="admin-accounting-info-heading">Purpose</h2>
          <p>
            The Accounting section is an internal ledger: it helps you see money coming in from sales,
            money going out as expenses, and a simple profit figure. It is designed for day-to-day
            operations, not for full statutory accounting.
          </p>
        </section>

        <section className="admin-accounting-info-section">
          <h2 className="admin-accounting-info-heading">What is tracked</h2>
          <ul className="admin-accounting-info-list">
            <li>
              <strong>Income records</strong> — Gross amounts from paid orders (created automatically when
              a payment is confirmed) and manual entries (cash sales, adjustments, legacy orders, etc.).
              Each row can link to an order, show payment method, and where the money sits (bank, cash,
              Stripe balance, other).
            </li>
            <li>
              <strong>Expenses</strong> — Business spending with date, category, payment method, and
              optional receipt file. Used for the expense total and net profit.
            </li>
            <li>
              <strong>Stripe processing fees (estimate)</strong> — For income recorded as{' '}
              <strong>Stripe (card/online)</strong>, the system automatically applies a{' '}
              <strong>fixed {STRIPE_FEE_PERCENT_LABEL}</strong> fee on the <strong>gross</strong> payment
              amount. This fee is subtracted when we show <strong>confirmed income (net)</strong> and{' '}
              <strong>net result</strong> (profit after expenses), so profit is closer to what you keep
              after card fees.
            </li>
          </ul>
        </section>

        <section className="admin-accounting-info-section">
          <h2 className="admin-accounting-info-heading">What is not tracked yet</h2>
          <ul className="admin-accounting-info-list">
            <li>
              <strong>Tax / VAT</strong> — Not calculated. Amounts are not split into tax-inclusive vs
              exclusive; speak to your accountant for tax reporting.
            </li>
            <li>
              <strong>Exact Stripe fees</strong> — Real Stripe fees can vary by card type and pricing.
              We use a fixed {STRIPE_FEE_PERCENT_LABEL} for planning only; reconcile with your Stripe
              dashboard for precise fees.
            </li>
            <li>
              <strong>Refunds</strong> — If an order is refunded but the income row is not cancelled or
              adjusted, revenue may still show until someone updates or deletes that record.
            </li>
            <li>
              <strong>Bank reconciliation</strong> — We do not match every payout to the bank statement
              automatically.
            </li>
            <li>
              <strong>Payroll, loans, inventory, fixed assets</strong> — Only what you enter as expenses
              or income appears here.
            </li>
          </ul>
        </section>

        <section className="admin-accounting-info-section">
          <h2 className="admin-accounting-info-heading">How to read the overview</h2>
          <ul className="admin-accounting-info-list">
            <li>
              <strong>Confirmed income (gross)</strong> — Total customer payments for confirmed income
              rows (before Stripe fees).
            </li>
            <li>
              <strong>Stripe processing fees</strong> — Shown when there are Stripe payments in the
              selected period; sum of {STRIPE_FEE_PERCENT_LABEL} on those gross amounts.
            </li>
            <li>
              <strong>Confirmed income (net)</strong> — Gross minus those Stripe fees. Other payment
              methods (cash, QR, bank transfer, etc.) have no automatic fee in this system.
            </li>
            <li>
              <strong>Total expenses</strong> — Sum of expense rows in the date range (by expense date).
            </li>
            <li>
              <strong>Net result</strong> — Confirmed income (net) minus total expenses. Pending income
              does not count toward net result.
            </li>
            <li>
              <strong>Income by money location</strong> — Uses <strong>gross</strong> confirmed amounts
              (where the money was recorded), so Stripe totals there are before the {STRIPE_FEE_PERCENT_LABEL}{' '}
              fee is applied.
            </li>
          </ul>
        </section>

        <section className="admin-accounting-info-section">
          <h2 className="admin-accounting-info-heading">Dates</h2>
          <p>
            Income filters use the <strong>record creation time</strong> in the admin; expenses use the{' '}
            <strong>expense date</strong> you enter. For a given month, the two may not align perfectly —
            use the same range when comparing, and keep that difference in mind.
          </p>
        </section>
      </div>
    </div>
  );
}
