'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Expense, ExpenseFilters } from '@/types/expenses';
import { billTrackingProgress, expenseDocumentationComplete } from '@/types/expenses';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_FILTER_OPTIONS,
  PAYMENT_METHOD_LABEL_BY_VALUE,
} from '@/types/expenses';
import type { ExpensesResult } from '@/lib/expenses/expenseQueries';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
);
const PM_LABEL = PAYMENT_METHOD_LABEL_BY_VALUE;

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
  expensesData: ExpensesResult;
  expensesPage: number;
  expensesPageSize: number;
  expensesFilters: ExpenseFilters;
  periodLabel: string;
}

export function AccountingExpensesPanel({
  expensesData,
  expensesPage,
  expensesPageSize,
  expensesFilters,
  periodLabel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();

  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [paperBillPdfExpenseId, setPaperBillPdfExpenseId] = useState<string | null>(null);

  const handleExpenseFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    router.push(`${pathname}?${next.toString()}`);
  };

  const downloadPaperBillRequestPdf = async (expenseId: string) => {
    setPaperBillPdfExpenseId(expenseId);
    try {
      const res = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseId)}/paper-bill-request`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === 'string' ? data.error : 'Failed to generate PDF';
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

  const exportExpensesCsv = () => {
    const headers = [
      'Date',
      'Description',
      'Category',
      'Payment method',
      'Receipt attached',
      'Bill checks (done/total)',
      'Documentation complete',
      'Incomplete (flag)',
      'Paper bill request sent',
      'Amount',
      'Currency',
      'Notes',
      'Linked order',
      'Created by',
    ];
    const lines = [headers.join(',')];
    for (const exp of expensesData.expenses) {
      const p = billTrackingProgress(exp.bill_tracking);
      lines.push(
        [
          escapeCsvCell(exp.date.slice(0, 10)),
          escapeCsvCell(exp.description),
          escapeCsvCell(CATEGORY_LABEL[exp.category] ?? exp.category),
          escapeCsvCell(PM_LABEL[exp.payment_method] ?? exp.payment_method),
          exp.receipt_attached ? 'Yes' : 'MISSING',
          escapeCsvCell(p ? `${p.done}/${p.total}` : '—'),
          expenseDocumentationComplete(exp) ? 'Yes' : 'No',
          !expenseDocumentationComplete(exp) ? 'YES' : '',
          exp.paper_bill_requested_at ? 'Yes' : '',
          String(exp.amount),
          escapeCsvCell(exp.currency || 'THB'),
          escapeCsvCell(exp.notes ?? ''),
          escapeCsvCell(exp.linked_order_id ?? ''),
          escapeCsvCell(exp.created_by ?? ''),
        ].join(',')
      );
    }
    downloadCsvLines(`expenses-${periodSlug(periodLabel)}.csv`, lines);
  };

  const expensesTotalPages =
    expensesData ? Math.ceil(expensesData.total / expensesPageSize) || 1 : 1;

  return (
    <div className="admin-expenses">
      <div className="admin-expenses-filters">
        <select
          className="admin-select"
          value={expensesFilters.category ?? 'all'}
          onChange={(e) => handleExpenseFilterChange({ category: e.target.value })}
          aria-label="Category"
        >
          <option value="all">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={expensesFilters.payment_method ?? 'all'}
          onChange={(e) => handleExpenseFilterChange({ payment_method: e.target.value })}
          aria-label="Payment method"
        >
          <option value="all">All payment methods</option>
          {EXPENSE_PAYMENT_FILTER_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
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

      <div className="admin-expenses-summary">
        <span className="admin-hint">
          {expensesData.total} expense{expensesData.total !== 1 ? 's' : ''} found
          {expensesData.missingReceiptCount > 0 && expensesFilters.documentation !== 'incomplete' && (
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
          <p>
            <strong>Error loading expenses</strong>
          </p>
          <p>{expensesData.error}</p>
        </div>
      ) : expensesData.expenses.length === 0 ? (
        <p className="admin-empty">
          No expenses found.{' '}
          <Link href="/admin/expenses/new" className="admin-link">
            Add your first expense →
          </Link>
        </p>
      ) : (
        <>
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
                      {exp.notes && <span className="admin-expenses-notes">{exp.notes}</span>}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-category">{CATEGORY_LABEL[exp.category] ?? exp.category}</span>
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
                            title="Bill checklist progress (delivery = 1 step; products = 2)"
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
                    <td className="admin-expenses-amount">{formatAmount(exp.amount, exp.currency)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expensesTotalPages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {(expensesPage - 1) * expensesPageSize + 1}–
                {Math.min(expensesPage * expensesPageSize, expensesData.total)} of {expensesData.total}
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
                <span className="admin-pagination-info">
                  Page {expensesPage} of {expensesTotalPages}
                </span>
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
  );
}
