'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import type { Expense, ExpenseFilters } from '@/types/expenses';
import { billTrackingProgress, expenseDocumentationComplete } from '@/types/expenses';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_FILTER_OPTIONS,
  PAYMENT_METHOD_LABEL_BY_VALUE,
} from '@/types/expenses';
import type { ExpensesResult } from '@/lib/expenses/expenseQueries';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import { MAX_RECEIPT_UPLOAD_BYTES, MAX_RECEIPT_UPLOAD_LABEL } from '@/lib/receiptUploadLimits';

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

function proofStatusText(exp: Expense) {
  const p = billTrackingProgress(exp.bill_tracking);
  if (expenseDocumentationComplete(exp)) return 'Complete';
  if (!exp.receipt_attached) return 'Need image';
  if (p && p.done < p.total) return `Proofs ${p.done}/${p.total}`;
  return 'Incomplete';
}

function paidLastSort(a: Expense, b: Expense) {
  const aComplete = expenseDocumentationComplete(a);
  const bComplete = expenseDocumentationComplete(b);
  if (aComplete === bComplete) return 0;
  return aComplete ? 1 : -1;
}

function ExpenseStatusIcon({ complete }: { complete: boolean }) {
  return (
    <span
      className={`admin-expenses-status-icon ${
        complete ? 'admin-expenses-status-icon-paid' : 'admin-expenses-status-icon-unpaid'
      }`}
      title={complete ? 'Paid / complete' : 'Needs proof'}
      aria-label={complete ? 'Paid / complete' : 'Needs proof'}
    >
    </span>
  );
}

function ExpenseOrderVisual({ expense }: { expense: Expense }) {
  const isDelivery = expense.category === 'delivery';
  const preview = expense.order_preview;
  if (!preview && !isDelivery) return null;

  const title = preview?.title ?? 'Linked order';
  const label = isDelivery ? `Delivery money for ${title}` : title;

  return (
    <span
      className={`admin-expenses-order-visual${isDelivery ? ' admin-expenses-order-visual-delivery' : ''}`}
      title={label}
      aria-label={label}
    >
      {preview?.image_url ? (
        <img src={preview.image_url} alt="" className="admin-expenses-order-thumb" />
      ) : (
        <span className="admin-expenses-order-emoji" aria-hidden="true">
          {isDelivery ? '🚚' : '🌸'}
        </span>
      )}
      {isDelivery && preview?.image_url ? (
        <span className="admin-expenses-order-delivery-badge" aria-hidden="true">
          🚚
        </span>
      ) : null}
    </span>
  );
}

function ExpenseOrderMeta({ expense }: { expense: Expense }) {
  const isDelivery = expense.category === 'delivery';
  const preview = expense.order_preview;

  if (isDelivery) {
    return (
      <span className="admin-badge admin-expenses-delivery-badge">
        🚚 Delivery money
      </span>
    );
  }

  if (!preview) return null;
  return (
    <span className="admin-expenses-order-meta">
      Order: {preview.title}
      {preview.item_count && preview.item_count > 1 ? ` +${preview.item_count - 1} more` : ''}
    </span>
  );
}

function ExpenseProofBadges({ expense }: { expense: Expense }) {
  const p = billTrackingProgress(expense.bill_tracking);
  const proofsDone = p ? p.done === p.total : true;

  return (
    <div className="admin-expenses-proof-stack">
      <span className={`admin-badge ${expense.receipt_attached ? 'admin-badge-paid' : 'admin-badge-payment-pending'}`}>
        {expense.receipt_attached ? 'Image' : 'No image'}
      </span>
      {p ? (
        <span
          className={`admin-badge ${proofsDone ? 'admin-badge-paid' : 'admin-badge-payment-pending'}`}
          title="Proof checklist progress"
        >
          Proofs {p.done}/{p.total}
        </span>
      ) : null}
      {expense.paper_bill_requested_at ? (
        <span
          className="admin-badge admin-badge-paid"
          title={new Date(expense.paper_bill_requested_at).toLocaleString('en-GB')}
        >
          Req sent
        </span>
      ) : null}
    </div>
  );
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
  const proofFileInputRef = useRef<HTMLInputElement>(null);
  const proofExpenseIdRef = useRef<string | null>(null);

  const [proofUploadState, setProofUploadState] = useState<{
    expenseId: string;
    stage: 'preparing' | 'uploading';
  } | null>(null);
  const [proofUploadError, setProofUploadError] = useState<string | null>(null);

  const handleExpenseFilterChange = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    });
    router.push(`${pathname}?${next.toString()}`);
  };

  const openProofPicker = (expenseId: string) => {
    if (proofUploadState) return;
    proofExpenseIdRef.current = expenseId;
    setProofUploadError(null);
    proofFileInputRef.current?.click();
  };

  const handleProofImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0] ?? null;
    e.currentTarget.value = '';

    const expenseId = proofExpenseIdRef.current;
    proofExpenseIdRef.current = null;
    if (!file) return;
    if (!expenseId) {
      setProofUploadError('Choose an expense before selecting an image.');
      return;
    }

    setProofUploadError(null);
    if (!isReceiptImageFile(file)) {
      setProofUploadError('Only image proof files are allowed.');
      return;
    }

    let fileToUpload: File;
    setProofUploadState({ expenseId, stage: 'preparing' });
    try {
      fileToUpload = await compressReceiptImageForUpload(file, MAX_RECEIPT_UPLOAD_BYTES);
    } catch (err) {
      setProofUploadError(err instanceof Error ? err.message : 'Could not prepare image for upload.');
      setProofUploadState(null);
      return;
    }

    setProofUploadState({ expenseId, stage: 'uploading' });
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseId)}/receipts`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProofUploadError(typeof data.error === 'string' ? data.error : 'Proof upload failed');
        return;
      }
      router.refresh();
    } catch {
      setProofUploadError('Unexpected error while uploading proof image');
    } finally {
      setProofUploadState(null);
    }
  };

  const proofButtonLabel = (expenseId: string) => {
    if (proofUploadState?.expenseId === expenseId) {
      return proofUploadState.stage === 'preparing' ? 'Preparing…' : 'Uploading…';
    }
    return 'Submit proof';
  };

  const openExpenseDetail = (expenseId: string) => {
    router.push(`/admin/expenses/${expenseId}`);
  };

  const sortedExpenses = [...expensesData.expenses].sort(paidLastSort);

  const exportExpensesCsv = () => {
    const headers = [
      'Date',
      'Description',
      'Category',
      'Payment method',
      'Receipt attached',
      'Proof checks (done/total)',
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
    for (const exp of sortedExpenses) {
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
  const documentedCount = Math.max(0, expensesData.total - expensesData.missingReceiptCount);

  return (
    <div className="admin-expenses">
      <input
        ref={proofFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleProofImageChange}
        style={{ display: 'none' }}
        aria-label="Submit expense proof image"
      />

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
          title="Receipt image + one proof check per line"
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
      {proofUploadError && <span className="admin-field-error admin-expenses-proof-error">{proofUploadError}</span>}

      <div className="admin-expenses-summary admin-expenses-summary-grid">
        <div className="admin-expenses-summary-card admin-expenses-summary-card-primary">
          <span className="admin-expenses-summary-label">Total expenses</span>
          <strong className="admin-expenses-summary-value">{formatAmount(expensesData.totalAmount)}</strong>
          <span className="admin-hint">{periodLabel}</span>
        </div>
        <div className="admin-expenses-summary-card">
          <span className="admin-expenses-summary-label">Records</span>
          <strong className="admin-expenses-summary-value">{expensesData.total}</strong>
          <span className="admin-hint">Showing {expensesData.expenses.length}</span>
        </div>
        <div
          className={`admin-expenses-summary-card${
            expensesData.missingReceiptCount > 0 ? ' admin-expenses-summary-card-warning' : ''
          }`}
        >
          <span className="admin-expenses-summary-label">Need proof</span>
          <strong className="admin-expenses-summary-value">{expensesData.missingReceiptCount}</strong>
          <span className="admin-hint">{documentedCount} complete</span>
        </div>
      </div>

      {expensesData.error ? (
        <div className="admin-error">
          <p>
            <strong>Error loading expenses</strong>
          </p>
          <p>{expensesData.error}</p>
        </div>
      ) : sortedExpenses.length === 0 ? (
        <p className="admin-empty">
          No expenses found.{' '}
          <Link href="/admin/expenses/new" className="admin-link">
            Add your first expense →
          </Link>
        </p>
      ) : (
        <>
          <div className="admin-expenses-table-wrap admin-expenses-desktop-table">
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense</th>
                  <th className="admin-expenses-col-amount">Amount</th>
                  <th>Proofs</th>
                  <th style={{ width: 1 }} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map((exp: Expense) => {
                  const docsComplete = expenseDocumentationComplete(exp);

                  return (
                    <tr
                      key={exp.id}
                      className={`admin-expenses-row ${
                        docsComplete ? 'admin-expenses-row-paid' : 'admin-expenses-row-unpaid'
                      }`}
                      onClick={() => router.push(`/admin/expenses/${exp.id}`)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push(`/admin/expenses/${exp.id}`);
                      }}
                    >
                      <td className="admin-expenses-date">
                        <span className="admin-expenses-date-with-status">
                          <ExpenseStatusIcon complete={docsComplete} />
                          {formatDate(exp.date)}
                        </span>
                      </td>
                      <td className="admin-expenses-desc">
                        <span className="admin-expenses-desc-main">
                          <ExpenseOrderVisual expense={exp} />
                          <span className="admin-expenses-desc-copy">
                            <span className="admin-expenses-desc-text">{exp.description}</span>
                            <span className="admin-expenses-meta">
                              <span className="admin-badge admin-badge-category">
                                {CATEGORY_LABEL[exp.category] ?? exp.category}
                              </span>
                              <span>{PM_LABEL[exp.payment_method] ?? exp.payment_method}</span>
                              <ExpenseOrderMeta expense={exp} />
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="admin-expenses-amount">{formatAmount(exp.amount, exp.currency)}</td>
                      <td>
                        <ExpenseProofBadges expense={exp} />
                      </td>
                      <td className="admin-expenses-actions-cell">
                        <div className="admin-expenses-actions">
                          <button
                            type="button"
                            className={`admin-btn ${docsComplete ? 'admin-btn-outline' : 'admin-btn-primary'} admin-btn-sm`}
                            disabled={proofUploadState !== null}
                            title={`Upload bill or receipt proof image. Photos are compressed before upload (max ${MAX_RECEIPT_UPLOAD_LABEL}).`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openProofPicker(exp.id);
                            }}
                          >
                            {proofButtonLabel(exp.id)}
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-outline admin-btn-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openExpenseDetail(exp.id);
                            }}
                          >
                            View expense
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-expenses-mobile-list" aria-label="Expenses">
            {sortedExpenses.map((exp: Expense) => {
              const docsComplete = expenseDocumentationComplete(exp);

              return (
                <article
                  key={exp.id}
                  className={`admin-expenses-mobile-card ${
                    docsComplete ? 'admin-expenses-mobile-card-paid' : 'admin-expenses-mobile-card-unpaid'
                  }`}
                  onClick={() => router.push(`/admin/expenses/${exp.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') router.push(`/admin/expenses/${exp.id}`);
                  }}
                >
                  <div className="admin-expenses-mobile-card-top">
                    <div className="admin-expenses-mobile-main">
                      <ExpenseOrderVisual expense={exp} />
                      <div className="admin-expenses-mobile-copy">
                        <span className="admin-expenses-date admin-expenses-date-with-status">
                          <ExpenseStatusIcon complete={docsComplete} />
                          {formatDate(exp.date)}
                        </span>
                        <h3 className="admin-expenses-mobile-title">{exp.description}</h3>
                        <span className="admin-expenses-meta">
                          <span className="admin-badge admin-badge-category">
                            {CATEGORY_LABEL[exp.category] ?? exp.category}
                          </span>
                          <span>{PM_LABEL[exp.payment_method] ?? exp.payment_method}</span>
                          <ExpenseOrderMeta expense={exp} />
                        </span>
                      </div>
                    </div>
                    <strong className="admin-expenses-mobile-amount">
                      {formatAmount(exp.amount, exp.currency)}
                    </strong>
                  </div>

                  <div
                    className={`admin-expenses-mobile-fields${
                      exp.paper_bill_requested_at ? '' : ' admin-expenses-mobile-fields-single'
                    }`}
                  >
                    <div>
                      <span>Proofs</span>
                      <strong className={docsComplete ? 'admin-expenses-mobile-ok' : 'admin-expenses-mobile-warn'}>
                        {proofStatusText(exp)}
                      </strong>
                    </div>
                    {exp.paper_bill_requested_at ? (
                      <div>
                        <span>Request</span>
                        <strong>Sent</strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="admin-expenses-mobile-actions">
                    <button
                      type="button"
                      className={`admin-btn ${docsComplete ? 'admin-btn-outline' : 'admin-btn-primary'} admin-btn-sm`}
                      disabled={proofUploadState !== null}
                      title={`Upload bill or receipt proof image. Photos are compressed before upload (max ${MAX_RECEIPT_UPLOAD_LABEL}).`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openProofPicker(exp.id);
                      }}
                    >
                      {proofButtonLabel(exp.id)}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openExpenseDetail(exp.id);
                      }}
                    >
                      View expense
                    </button>
                  </div>
                </article>
              );
            })}
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
