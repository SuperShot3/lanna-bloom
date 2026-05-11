'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Expense, ExpenseBillLine, ExpenseReceiptImage } from '@/types/expenses';
import {
  billLineProofReceived,
  billTrackingProgress,
  expenseDocumentationComplete,
  setBillLineProofReceived,
} from '@/types/expenses';
import { EXPENSE_CATEGORIES, PAYMENT_METHOD_LABEL_BY_VALUE } from '@/types/expenses';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import {
  MAX_RECEIPT_IMAGES_PER_EXPENSE,
  MAX_RECEIPT_UPLOAD_BYTES,
  MAX_RECEIPT_UPLOAD_LABEL,
} from '@/lib/receiptUploadLimits';

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

function receiptFileName(path: string | null): string | null {
  if (!path) return null;
  const raw = path.split('/').pop() ?? path;
  return decodeURIComponent(raw);
}

interface ExpenseDetailClientProps {
  expense: Expense;
}

const DELETE_RECEIPT_CONFIRM =
  'Are you sure you want to delete this receipt? This cannot be undone.';

export function ExpenseDetailClient({ expense }: ExpenseDetailClientProps) {
  const router = useRouter();
  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  const [expenseState, setExpenseState] = useState(expense);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [compressingReceipt, setCompressingReceipt] = useState(false);
  const [receipts, setReceipts] = useState<ExpenseReceiptImage[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [billLines, setBillLines] = useState<ExpenseBillLine[]>(expense.bill_tracking ?? []);
  const [billSaving, setBillSaving] = useState(false);
  const [paperBillPdfBusy, setPaperBillPdfBusy] = useState(false);
  const receiptCount = receipts.length;
  const currentReceiptName = receiptCount > 0 ? receipts[0].file_name : receiptFileName(expenseState.receipt_file_path);
  const receiptLimitReached = receiptCount >= MAX_RECEIPT_IMAGES_PER_EXPENSE;

  const loadReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const res = await fetch(`/api/admin/expenses/${expenseState.id}/receipts`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReceiptError(data.error ?? 'Failed to load receipt images');
        return;
      }
      setReceipts(Array.isArray(data.receipts) ? (data.receipts as ExpenseReceiptImage[]) : []);
    } catch {
      setReceiptError('Unexpected error loading receipt images');
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    void loadReceipts();
  }, [expenseState.id]);

  useEffect(() => {
    setBillLines(expenseState.bill_tracking ?? []);
  }, [expenseState.id, expenseState.updated_at, expenseState.bill_tracking]);

  const openReceipt = async (filePath: string, download = false) => {
    if (!filePath) return;
    setReceiptError(null);
    try {
      const q = new URLSearchParams({ path: filePath });
      if (download) q.set('download', '1');
      const res = await fetch(`/api/admin/expenses/${expenseState.id}/receipt-url?${q.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReceiptError(data.error ?? 'Failed to open image');
        return;
      }
      if (download) {
        window.location.assign(data.signedUrl);
      } else {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setReceiptError('Unexpected error opening image');
    }
  };

  const handleViewReceipt = async () => {
    if (!receipts[0]?.file_path) return;
    setLoadingReceipt(true);
    try {
      await openReceipt(receipts[0].file_path, false);
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
    if (receiptCount >= MAX_RECEIPT_IMAGES_PER_EXPENSE) {
      setReceiptError(`Maximum ${MAX_RECEIPT_IMAGES_PER_EXPENSE} receipt images per expense row.`);
      return;
    }
    if (!isReceiptImageFile(file)) {
      setReceiptError('Only image files are allowed.');
      return;
    }

    setCompressingReceipt(true);
    let fileToUpload: File;
    try {
      fileToUpload = await compressReceiptImageForUpload(file, MAX_RECEIPT_UPLOAD_BYTES);
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : 'Could not prepare image for upload.');
      setCompressingReceipt(false);
      return;
    }
    setCompressingReceipt(false);

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const uploadRes = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseState.id)}/receipts`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setReceiptError(uploadData.error ?? 'Receipt upload failed');
        return;
      }
      if (uploadData.expense) {
        const updatedExpense = uploadData.expense as Expense;
        setExpenseState(updatedExpense);
        setBillLines(updatedExpense.bill_tracking ?? []);
      } else {
        const nextBillLines = billLines.map((line) => setBillLineProofReceived(line, true));
        setExpenseState((prev) => ({
          ...prev,
          receipt_attached: true,
          bill_tracking: nextBillLines,
        }));
        setBillLines(nextBillLines);
      }
      await loadReceipts();
      setReceiptError(null);
    } catch {
      setReceiptError('Unexpected error while uploading image');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receipts[0]?.file_path) return;
    setDownloadingReceipt(true);
    try {
      await openReceipt(receipts[0].file_path, true);
    } catch {
      setReceiptError('Unexpected error preparing download');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirmDeleteAction(DELETE_RECEIPT_CONFIRM)) return;
    setDeletingReceiptId(receiptId);
    setReceiptError(null);
    try {
      const res = await fetch(
        `/api/admin/expenses/${encodeURIComponent(expenseState.id)}/receipts/${encodeURIComponent(receiptId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReceiptError(typeof data.error === 'string' ? data.error : 'Delete failed');
        return;
      }
      if (data.expense) {
        const updatedExpense = data.expense as Expense;
        setExpenseState(updatedExpense);
        setBillLines(updatedExpense.bill_tracking ?? []);
      } else {
        setExpenseState((prev) => ({
          ...prev,
          receipt_attached: data.receipt_attached === true,
          receipt_file_path:
            typeof data.receipt_file_path === 'string' ? data.receipt_file_path : null,
        }));
      }
      await loadReceipts();
      router.refresh();
    } catch {
      setReceiptError('Unexpected error while deleting receipt');
    } finally {
      setDeletingReceiptId(null);
    }
  };

  const persistBillLines = async (next: ExpenseBillLine[]) => {
    setBillSaving(true);
    setReceiptError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseState.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_tracking: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReceiptError(data.error ?? 'Failed to save proof checklist');
        return;
      }
      if (data.expense) {
        const e = data.expense as Expense;
        setExpenseState(e);
        setBillLines(e.bill_tracking ?? next);
      } else {
        setBillLines(next);
      }
    } catch {
      setReceiptError('Unexpected error saving proof checklist');
    } finally {
      setBillSaving(false);
    }
  };

  const toggleBillLine = (lineId: string) => {
    const target = billLines.find((l) => l.line_id === lineId);
    if (!target) return;
    const nextReceived = !billLineProofReceived(target);
    const next = billLines.map((l) =>
      l.line_id === lineId ? setBillLineProofReceived(l, nextReceived) : l
    );
    setBillLines(next);
    void persistBillLines(next);
  };

  const billProg = billTrackingProgress(billLines);

  const downloadPaperBillRequestPdf = async () => {
    setPaperBillPdfBusy(true);
    setReceiptError(null);
    try {
      const res = await fetch(
        `/api/admin/expenses/${encodeURIComponent(expenseState.id)}/paper-bill-request`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === 'string' ? data.error : 'Failed to generate PDF';
        const detail = typeof data.detail === 'string' ? data.detail : '';
        setReceiptError(detail ? `${msg} — ${detail}` : msg);
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
      setExpenseState((prev) => ({
        ...prev,
        paper_bill_requested_at: new Date().toISOString(),
      }));
      router.refresh();
    } catch {
      setReceiptError('Network error while generating PDF');
    } finally {
      setPaperBillPdfBusy(false);
    }
  };

  const receiptActions = (
    <section className="admin-expenses-receipt-panel" aria-labelledby="receipt-images-heading">
      <input
        ref={receiptFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAddReceiptImage}
        style={{ display: 'none' }}
        aria-label="Add receipt image"
      />

      <div className="admin-expenses-receipt-panel-header">
        <div>
          <h2 id="receipt-images-heading" className="admin-accounting-section-title">
            Receipt images
          </h2>
          <p className="admin-hint admin-accounting-section-hint">
            Upload the paper bill / payment proof first; it marks the proof checklist received
            automatically. You can add up to {MAX_RECEIPT_IMAGES_PER_EXPENSE - 1} extra images;
            max {MAX_RECEIPT_UPLOAD_LABEL} each.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-btn-sm admin-expenses-add-image-btn"
          onClick={() => receiptFileInputRef.current?.click()}
          disabled={compressingReceipt || uploadingReceipt || receiptLimitReached}
        >
          {receiptLimitReached
            ? 'Image limit reached'
            : compressingReceipt
              ? 'Preparing image…'
              : uploadingReceipt
                ? 'Uploading image…'
                : '+ Add image'}
        </button>
      </div>

      <div className="admin-expenses-receipt-status-row">
        <span
          className={
            expenseState.receipt_attached
              ? 'admin-badge admin-badge-paid'
              : 'admin-badge admin-badge-payment-pending'
          }
        >
          {expenseState.receipt_attached
            ? `${receiptCount}/${MAX_RECEIPT_IMAGES_PER_EXPENSE} image${receiptCount === 1 ? '' : 's'} attached`
            : 'Missing image'}
        </span>
        {loadingReceipts ? <span className="admin-hint">Loading images…</span> : null}
      </div>

      {receiptCount > 0 ? (
        <div className="admin-expenses-receipt-list">
          {receipts.map((r) => (
            <article key={r.id} className="admin-expenses-receipt-card">
              <div className="admin-expenses-receipt-card-main">
                <span className="material-symbols-outlined" aria-hidden>
                  receipt_long
                </span>
                <div>
                  <strong>{r.file_name}</strong>
                  <span className="admin-hint">Uploaded {formatDateTime(r.created_at)}</span>
                </div>
              </div>
              <div className="admin-expenses-receipt-card-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-outline"
                  onClick={() => void openReceipt(r.file_path, false)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-outline"
                  onClick={() => void openReceipt(r.file_path, true)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-outline admin-btn-danger"
                  disabled={deletingReceiptId === r.id || compressingReceipt || uploadingReceipt}
                  onClick={() => void handleDeleteReceipt(r.id)}
                >
                  {deletingReceiptId === r.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-expenses-receipt-empty">
          <span className="material-symbols-outlined" aria-hidden>
            add_photo_alternate
          </span>
          <span>No receipt image yet. Tap Add image to upload one.</span>
        </div>
      )}

      {receiptCount > 0 ? (
        <div className="admin-expenses-receipt-quick-actions">
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            onClick={handleViewReceipt}
            disabled={loadingReceipt}
          >
            {loadingReceipt ? 'Loading…' : 'View first image'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            onClick={handleDownloadReceipt}
            disabled={downloadingReceipt}
          >
            {downloadingReceipt ? 'Preparing download…' : 'Download first image'}
          </button>
        </div>
      ) : null}

      {receiptError && <span className="admin-field-error">{receiptError}</span>}
    </section>
  );

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
              if (!confirmDeleteAction('Delete this expense? This cannot be undone.')) return;
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
          label="Receipt files"
          value={
            expenseState.receipt_attached ? (
              <span className="admin-badge admin-badge-paid">Attached</span>
            ) : (
              <span className="admin-badge admin-badge-payment-pending">Missing</span>
            )
          }
        />
        {billProg && (
          <DetailRow
            label="Proof checklist"
            value={
              <span
                className={
                  billProg.done === billProg.total
                    ? 'admin-badge admin-badge-paid'
                    : 'admin-badge admin-badge-payment-pending'
                }
              >
                {billProg.done}/{billProg.total} proofs
              </span>
            }
          />
        )}
        <DetailRow label="Images added" value={String(receiptCount)} />
        <DetailRow label="Image name" value={currentReceiptName ?? '—'} />
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
        <DetailRow
          label="Paper bill request"
          value={
            expenseState.paper_bill_requested_at ? (
              <span title={new Date(expenseState.paper_bill_requested_at).toLocaleString('en-GB')}>
                PDF generated {formatDateTime(expenseState.paper_bill_requested_at)}
              </span>
            ) : (
              <span className="admin-hint">Not yet</span>
            )
          }
        />
        <DetailRow label="Created by" value={expenseState.created_by} />
        <DetailRow label="Created at" value={formatDateTime(expenseState.created_at)} />
        <DetailRow label="Updated at" value={formatDateTime(expenseState.updated_at)} />
        <DetailRow label="Expense ID" value={<code className="admin-expenses-id">{expenseState.id}</code>} />
      </div>

      {receiptActions}

      {/* Proof checklist — one row per order line (or one default row) */}
      {billLines.length > 0 && (
        <section className="admin-expenses-bill-checklist" aria-label="Proof checklist">
          <h2 className="admin-accounting-section-title">Proof checklist</h2>
          <p className="admin-hint admin-accounting-section-hint">
            Each row needs one <strong>paper bill / payment proof</strong>. Uploading an image marks
            the proof received automatically. Linked orders show one row per product; delivery uses
            the same single proof check.
          </p>
          {billSaving && <p className="admin-hint">Saving checklist…</p>}
          <div className="admin-expenses-table-wrap">
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Paper bill / payment proof</th>
                </tr>
              </thead>
              <tbody>
                {billLines.map((line) => (
                  <tr key={line.line_id}>
                    <td className="admin-expenses-desc">
                      <span className="admin-expenses-desc-text">{line.label}</span>
                      <span className="admin-expenses-notes admin-ledger-mono">{line.line_id}</span>
                    </td>
                    <td>
                      <label className="admin-bill-check-label">
                        <input
                          type="checkbox"
                          checked={billLineProofReceived(line)}
                          disabled={billSaving}
                          onChange={() => toggleBillLine(line.line_id)}
                          aria-label={`Paper bill or payment proof received for ${line.label}`}
                        />
                        <span>Received</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {expenseState.linked_order_id && (
        <section className="admin-expenses-bill-checklist" aria-label="Paper bill request">
          <h2 className="admin-accounting-section-title">Paper bill from shop</h2>
          <p className="admin-hint admin-accounting-section-hint">
            When the vendor bill is still missing, generate a PDF you can send or print. It includes order
            details, customer contact preference, item photos from the order, and any payment slips already
            attached to this expense.
          </p>
          {!expenseDocumentationComplete(expenseState) && (
            <p className="admin-hint">This expense is not fully documented yet — a PDF is especially useful here.</p>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-btn-sm"
            disabled={paperBillPdfBusy}
            onClick={() => void downloadPaperBillRequestPdf()}
          >
            {paperBillPdfBusy ? 'Generating PDF…' : 'Generate paper bill request PDF'}
          </button>
        </section>
      )}

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
