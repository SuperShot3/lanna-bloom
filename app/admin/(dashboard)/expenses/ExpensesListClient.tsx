'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import type { Expense, ExpenseFilters } from '@/types/expenses';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, billTrackingProgress, expenseDocumentationComplete } from '@/types/expenses';

interface ExpensesListClientProps {
  initialExpenses: Expense[];
  initialTotal: number;
  initialTotalAmount: number;
  initialMissingReceiptCount: number;
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
  initialMissingReceiptCount,
  initialError,
  initialFilters,
  initialPage,
  pageSize,
}: ExpensesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sp = searchParams ?? new URLSearchParams();
  const [paperBillPdfExpenseId, setPaperBillPdfExpenseId] = useState<string | null>(null);

  const downloadPaperBillRequestPdf = async (expenseId: string) => {
    setPaperBillPdfExpenseId(expenseId);
    try {
      const res = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseId)}/paper-bill-request`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === 'string' ? data.error : 'Failed to generate PDF';
        const detail = typeof data.detail === 'string' ? data.detail : '';
        alert(detail ? `${msg}\n\n${detail}` : msg);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      let name = 'paper-bill-request.pdf';
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) name = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Network error');
    } finally {
      setPaperBillPdfExpenseId(null);
    }
  };

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
        <select
          className="admin-select"
          value={initialFilters.receipt ?? 'all'}
          onChange={(e) => handleFilterChange({ receipt: e.target.value })}
          aria-label="Receipt status"
          title="Filter by paper-bill / receipt status"
        >
          <option value="all">All receipt status</option>
          <option value="missing">Missing receipt only</option>
          <option value="attached">Has receipt</option>
        </select>
        {(initialFilters.dateFrom || initialFilters.dateTo || initialFilters.category || initialFilters.payment_method || initialFilters.receipt) && (
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            onClick={() => handleFilterChange({ dateFrom: undefined, dateTo: undefined, category: undefined, payment_method: undefined, receipt: undefined })}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Total summary */}
      <div className="admin-expenses-summary">
        <span className="admin-hint">
          {initialTotal} expense{initialTotal !== 1 ? 's' : ''} found
          {initialMissingReceiptCount > 0 && (
            <>
              {' · '}
              <strong style={{ color: '#d97706' }}>
                {initialMissingReceiptCount} missing receipt{initialMissingReceiptCount !== 1 ? 's' : ''}
              </strong>
            </>
          )}
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
                  <th>Bills</th>
                  <th title="Checked when documentation is still incomplete">Incomplete</th>
                  <th title="Paper bill request PDF was generated">Bill req</th>
                  <th className="admin-expenses-col-amount">Amount</th>
                  <th style={{ width: 1 }} aria-label="Actions" />
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
                    <td>
                      {(() => {
                        const p = billTrackingProgress(exp.bill_tracking);
                        if (!p) return <span className="admin-hint">—</span>;
                        const done = p.done === p.total;
                        return (
                          <span
                            className={`admin-badge ${done ? 'admin-badge-paid' : 'admin-badge-payment-pending'}`}
                            title="Bill checklist progress"
                          >
                            {p.done}/{p.total}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {!expenseDocumentationComplete(exp) ? (
                        <span
                          className="admin-badge admin-badge-payment-pending"
                          title="Receipt and/or bill checklist still incomplete"
                        >
                          ✓
                        </span>
                      ) : (
                        <span className="admin-hint">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {exp.paper_bill_requested_at ? (
                        <span
                          className="admin-badge admin-badge-paid"
                          title={new Date(exp.paper_bill_requested_at).toLocaleString('en-GB')}
                        >
                          ✓
                        </span>
                      ) : (
                        <span className="admin-hint">—</span>
                      )}
                    </td>
                    <td className="admin-expenses-amount">
                      {formatAmount(exp.amount, exp.currency)}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        disabled={!exp.linked_order_id || paperBillPdfExpenseId === exp.id}
                        title={
                          exp.linked_order_id
                            ? 'Download PDF to request a missing paper bill from the shop'
                            : 'Link this expense to an order first'
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!exp.linked_order_id) return;
                          void downloadPaperBillRequestPdf(exp.id);
                        }}
                      >
                        {paperBillPdfExpenseId === exp.id ? 'PDF…' : 'Bill PDF'}
                      </button>
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
