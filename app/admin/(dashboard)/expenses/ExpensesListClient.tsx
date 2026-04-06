'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Expense, ExpenseFilters } from '@/types/expenses';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types/expenses';

interface ExpensesListClientProps {
  initialExpenses: Expense[];
  initialTotal: number;
  initialTotalAmount: number;
  initialError?: string;
  initialFilters: ExpenseFilters;
  initialPage: number;
  pageSize: number;
}

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
);
const PM_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);

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

export function ExpensesListClient({
  initialExpenses,
  initialTotal,
  initialTotalAmount,
  initialError,
  initialFilters,
  initialPage,
  pageSize,
}: ExpensesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sp = searchParams ?? new URLSearchParams();

  const handleFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    router.push(`${pathname}?${next.toString()}`);
  };

  const totalPages = Math.ceil(initialTotal / pageSize) || 1;

  return (
    <div className="admin-expenses">
      {/* Page header */}
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Expenses</h1>
          <p className="admin-hint">Track and manage business expenses</p>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin/expenses/new" className="admin-btn admin-btn-primary">
            + Add Expense
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="admin-expenses-filters">
        <input
          type="date"
          className="admin-input admin-input-date"
          value={initialFilters.dateFrom ?? ''}
          onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
          placeholder="From date"
          aria-label="From date"
        />
        <input
          type="date"
          className="admin-input admin-input-date"
          value={initialFilters.dateTo ?? ''}
          onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
          placeholder="To date"
          aria-label="To date"
        />
        <select
          className="admin-select"
          value={initialFilters.category ?? 'all'}
          onChange={(e) => handleFilterChange({ category: e.target.value })}
          aria-label="Category"
        >
          <option value="all">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          className="admin-select"
          value={initialFilters.payment_method ?? 'all'}
          onChange={(e) => handleFilterChange({ payment_method: e.target.value })}
          aria-label="Payment method"
        >
          <option value="all">All payment methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {(initialFilters.dateFrom || initialFilters.dateTo || initialFilters.category || initialFilters.payment_method) && (
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            onClick={() => handleFilterChange({ dateFrom: undefined, dateTo: undefined, category: undefined, payment_method: undefined })}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Total summary */}
      <div className="admin-expenses-summary">
        <span className="admin-hint">
          {initialTotal} expense{initialTotal !== 1 ? 's' : ''} found
        </span>
        <span className="admin-expenses-total">
          Total: <strong>{formatAmount(initialTotalAmount)}</strong>
        </span>
      </div>

      {/* Error state */}
      {initialError ? (
        <div className="admin-error">
          <p><strong>Error loading expenses</strong></p>
          <p>{initialError}</p>
          <p className="admin-error-hint">Check Supabase configuration and server logs.</p>
        </div>
      ) : initialExpenses.length === 0 ? (
        <p className="admin-empty">No expenses found. <Link href="/admin/expenses/new" className="admin-link">Add your first expense →</Link></p>
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
                {initialExpenses.map((exp) => (
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
          {totalPages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {(initialPage - 1) * pageSize + 1}–{Math.min(initialPage * pageSize, initialTotal)} of {initialTotal}
              </span>
              <div className="admin-pagination-btns">
                <button
                  type="button"
                  disabled={initialPage <= 1}
                  className="admin-btn admin-btn-sm"
                  onClick={() => {
                    const next = new URLSearchParams(sp.toString());
                    next.set('page', String(initialPage - 1));
                    router.push(`${pathname}?${next.toString()}`);
                  }}
                >
                  Previous
                </button>
                <span className="admin-pagination-info">Page {initialPage} of {totalPages}</span>
                <button
                  type="button"
                  disabled={initialPage >= totalPages}
                  className="admin-btn admin-btn-sm"
                  onClick={() => {
                    const next = new URLSearchParams(sp.toString());
                    next.set('page', String(initialPage + 1));
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
  );
}
