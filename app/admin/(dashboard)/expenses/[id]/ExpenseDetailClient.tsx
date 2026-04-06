'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Expense } from '@/types/expenses';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types/expenses';

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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ExpenseDetailClientProps {
  expense: Expense;
}

export function ExpenseDetailClient({ expense }: ExpenseDetailClientProps) {
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const handleViewReceipt = async () => {
    setLoadingReceipt(true);
    setReceiptError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${expense.id}/receipt-url`);
      const data = await res.json();
      if (!res.ok) {
        setReceiptError(data.error ?? 'Failed to load receipt');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setReceiptError('Unexpected error loading receipt');
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <div className="admin-expenses-detail">
      {/* Header */}
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/expenses" className="admin-back-link">← Back to Expenses</Link>
          <h1 className="admin-title">Expense Detail</h1>
        </div>
      </header>

      {/* Amount hero */}
      <div className="admin-expenses-hero">
        <span className="admin-expenses-hero-amount">
          {formatAmount(expense.amount, expense.currency)}
        </span>
        <span className="admin-badge admin-badge-category">
          {CATEGORY_LABEL[expense.category] ?? expense.category}
        </span>
      </div>

      {/* Details grid */}
      <div className="admin-expenses-detail-grid">
        <DetailRow label="Date" value={formatDate(expense.date)} />
        <DetailRow label="Description" value={expense.description} />
        <DetailRow label="Payment Method" value={PM_LABEL[expense.payment_method] ?? expense.payment_method} />
        <DetailRow
          label="Receipt"
          value={
            expense.receipt_attached ? (
              <span className="admin-badge admin-badge-paid">Attached</span>
            ) : (
              <span className="admin-badge admin-badge-payment-pending">Missing</span>
            )
          }
        />
        {expense.notes && <DetailRow label="Notes" value={expense.notes} />}
        {expense.linked_order_id && (
          <DetailRow
            label="Linked Order"
            value={
              <Link href={`/admin/orders/${expense.linked_order_id}`} className="admin-link">
                {expense.linked_order_id}
              </Link>
            }
          />
        )}
        <DetailRow label="Created by" value={expense.created_by} />
        <DetailRow label="Created at" value={formatDateTime(expense.created_at)} />
        <DetailRow label="Updated at" value={formatDateTime(expense.updated_at)} />
        <DetailRow label="Expense ID" value={<code className="admin-expenses-id">{expense.id}</code>} />
      </div>

      {/* Receipt actions */}
      <div className="admin-expenses-detail-actions">
        {expense.receipt_attached && expense.receipt_file_path ? (
          <>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleViewReceipt}
              disabled={loadingReceipt}
            >
              {loadingReceipt ? 'Loading…' : 'View Receipt'}
            </button>
            {receiptError && (
              <span className="admin-field-error">{receiptError}</span>
            )}
          </>
        ) : (
          <p className="admin-hint">No receipt attached to this expense.</p>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="admin-expenses-detail-row">
      <dt className="admin-expenses-detail-label">{label}</dt>
      <dd className="admin-expenses-detail-value">{value}</dd>
    </div>
  );
}
