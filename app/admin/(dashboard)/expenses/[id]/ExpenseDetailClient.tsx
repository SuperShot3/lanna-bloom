'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

const MAX_RECEIPT_BYTES = 500 * 1024;

export function ExpenseDetailClient({ expense }: ExpenseDetailClientProps) {
  const router = useRouter();
  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  const [expenseState, setExpenseState] = useState(expense);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleViewReceipt = async () => {
    if (!expenseState.receipt_file_path) return;
    setLoadingReceipt(true);
    setReceiptError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${expenseState.id}/receipt-url`);
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

  const handleAddReceiptImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (receiptFileInputRef.current) receiptFileInputRef.current.value = '';

    setReceiptError(null);
    if (!file.type.startsWith('image/')) {
      setReceiptError('Only image files are allowed.');
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setReceiptError('Image is too large. Max size is 500 KB.');
      return;
    }

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/admin/expenses/upload-receipt', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || typeof uploadData.path !== 'string') {
        setReceiptError(uploadData.error ?? 'Receipt upload failed');
        return;
      }

      const updateRes = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseState.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_file_path: uploadData.path,
          receipt_attached: true,
        }),
      });
      const updateData = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok || !updateData.expense) {
        setReceiptError(updateData.error ?? 'Failed to save receipt');
        return;
      }

      setExpenseState(updateData.expense as Expense);
    } catch {
      setReceiptError('Unexpected error while uploading image');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!expenseState.receipt_file_path) return;
    setDownloadingReceipt(true);
    setReceiptError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${expenseState.id}/receipt-url?download=1`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReceiptError(data.error ?? 'Failed to prepare download');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setReceiptError('Unexpected error preparing download');
    } finally {
      setDownloadingReceipt(false);
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
        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-danger"
            disabled={deleting}
            onClick={async () => {
              if (!confirm('Delete this expense? This cannot be undone.')) return;
              setDeleting(true);
              try {
                const res = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseState.id)}`, {
                  method: 'DELETE',
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  alert(data.error ?? 'Failed to delete expense');
                  return;
                }
                router.push('/admin/expenses');
                router.refresh();
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Network error');
              } finally {
                setDeleting(false);
              }
            }}
            title="Delete expense"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </header>

      {/* Amount hero */}
      <div className="admin-expenses-hero">
        <span className="admin-expenses-hero-amount">
          {formatAmount(expenseState.amount, expenseState.currency)}
        </span>
        <span className="admin-badge admin-badge-category">
          {CATEGORY_LABEL[expenseState.category] ?? expenseState.category}
        </span>
      </div>

      {/* Details grid */}
      <div className="admin-expenses-detail-grid">
        <DetailRow label="Date" value={formatDate(expenseState.date)} />
        <DetailRow label="Description" value={expenseState.description} />
        <DetailRow label="Payment Method" value={PM_LABEL[expenseState.payment_method] ?? expenseState.payment_method} />
        <DetailRow
          label="Receipt"
          value={
            expenseState.receipt_attached ? (
              <span className="admin-badge admin-badge-paid">Attached</span>
            ) : (
              <span className="admin-badge admin-badge-payment-pending">Missing</span>
            )
          }
        />
        {expenseState.notes && <DetailRow label="Notes" value={expenseState.notes} />}
        {expenseState.linked_order_id && (
          <DetailRow
            label="Linked Order"
            value={
              <Link href={`/admin/orders/${expenseState.linked_order_id}`} className="admin-link">
                {expenseState.linked_order_id}
              </Link>
            }
          />
        )}
        <DetailRow label="Created by" value={expenseState.created_by} />
        <DetailRow label="Created at" value={formatDateTime(expenseState.created_at)} />
        <DetailRow label="Updated at" value={formatDateTime(expenseState.updated_at)} />
        <DetailRow label="Expense ID" value={<code className="admin-expenses-id">{expenseState.id}</code>} />
      </div>

      {/* Receipt actions */}
      <div className="admin-expenses-detail-actions">
        <input
          ref={receiptFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleAddReceiptImage}
          style={{ display: 'none' }}
          aria-label="Add receipt image"
        />
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={() => receiptFileInputRef.current?.click()}
          disabled={uploadingReceipt}
        >
          {uploadingReceipt ? 'Uploading image…' : 'Add image'}
        </button>
        {expenseState.receipt_attached && expenseState.receipt_file_path ? (
          <>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleViewReceipt}
              disabled={loadingReceipt}
            >
              {loadingReceipt ? 'Loading…' : 'View receipt image'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt}
            >
              {downloadingReceipt ? 'Preparing download…' : 'Download image'}
            </button>
          </>
        ) : null}
        <p className="admin-hint">Receipt images only, max size 500 KB.</p>
        {receiptError && <span className="admin-field-error">{receiptError}</span>}
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
