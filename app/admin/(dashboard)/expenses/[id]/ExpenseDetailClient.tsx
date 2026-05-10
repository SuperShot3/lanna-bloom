'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Expense, ExpenseBillLine, ExpenseReceiptImage } from '@/types/expenses';
import { billLineCheckpointCount, billTrackingProgress, expenseDocumentationComplete } from '@/types/expenses';
import { EXPENSE_CATEGORIES, PAYMENT_METHOD_LABEL_BY_VALUE } from '@/types/expenses';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';

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

const MAX_RECEIPT_BYTES = 500 * 1024;
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
    if (!file.type.startsWith('image/')) {
      setReceiptError('Only image files are allowed.');
      return;
    }

    setCompressingReceipt(true);
    let fileToUpload: File;
    try {
      fileToUpload = await compressReceiptImageForUpload(file, MAX_RECEIPT_BYTES);
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
      setExpenseState((prev) => ({ ...prev, receipt_attached: true }));
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
      setExpenseState((prev) => ({
        ...prev,
        receipt_attached: data.receipt_attached === true,
        receipt_file_path:
          typeof data.receipt_file_path === 'string' ? data.receipt_file_path : null,
      }));
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
        setReceiptError(data.error ?? 'Failed to save bill checklist');
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
      setReceiptError('Unexpected error saving bill checklist');
    } finally {
      setBillSaving(false);
    }
  };

  const toggleBillLine = (lineId: string, key: 'transfer_to_shop' | 'bill_from_shop') => {
    const target = billLines.find((l) => l.line_id === lineId);
    if (!target) return;
    if (key === 'bill_from_shop' && billLineCheckpointCount(target) === 1) return;
    const next = billLines.map((l) =>
      l.line_id === lineId ? { ...l, [key]: !l[key] } : l
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
            label="Bill checklist"
            value={
              <span
                className={
                  billProg.done === billProg.total
                    ? 'admin-badge admin-badge-paid'
                    : 'admin-badge admin-badge-payment-pending'
                }
              >
                {billProg.done}/{billProg.total} checks
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

      {/* Dual bill checklist — one row per order line (or one default row) */}
      {billLines.length > 0 && (
        <section className="admin-expenses-bill-checklist" aria-label="Bill checklist">
          <h2 className="admin-accounting-section-title">Bill checklist</h2>
          <p className="admin-hint admin-accounting-section-hint">
            For each product line: tick <strong>payment to the shop</strong> and <strong>bill from the shop</strong>.
            Linked orders show one row per product (two checks each). <strong>Delivery</strong> is only{' '}
            <strong>payment to the driver</strong> (one check — no shop bill).
          </p>
          {billSaving && <p className="admin-hint">Saving checklist…</p>}
          <div className="admin-expenses-table-wrap">
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Payment proof (shop or driver)</th>
                  <th>Bill from shop</th>
                </tr>
              </thead>
              <tbody>
                {billLines.map((line) => {
                  const singleCheck = billLineCheckpointCount(line) === 1;
                  return (
                  <tr key={line.line_id}>
                    <td className="admin-expenses-desc">
                      <span className="admin-expenses-desc-text">{line.label}</span>
                      <span className="admin-expenses-notes admin-ledger-mono">{line.line_id}</span>
                    </td>
                    <td>
                      <label className="admin-bill-check-label">
                        <input
                          type="checkbox"
                          checked={line.transfer_to_shop}
                          disabled={billSaving}
                          onChange={() => toggleBillLine(line.line_id, 'transfer_to_shop')}
                          aria-label={
                            singleCheck
                              ? `Proof of payment to driver for ${line.label}`
                              : `Payment / transfer to shop for ${line.label}`
                          }
                        />
                        <span>{singleCheck ? 'Paid driver (proof)' : 'Received'}</span>
                      </label>
                    </td>
                    <td>
                      {singleCheck ? (
                        <span className="admin-hint" title="Delivery is paid to the driver; no shop vendor bill.">
                          —
                        </span>
                      ) : (
                        <label className="admin-bill-check-label">
                          <input
                            type="checkbox"
                            checked={line.bill_from_shop}
                            disabled={billSaving}
                            onChange={() => toggleBillLine(line.line_id, 'bill_from_shop')}
                            aria-label={`Shop bill received for ${line.label}`}
                          />
                          <span>Received</span>
                        </label>
                      )}
                    </td>
                  </tr>
                  );
                })}
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            onClick={() => receiptFileInputRef.current?.click()}
            disabled={compressingReceipt || uploadingReceipt}
          >
            {compressingReceipt
              ? 'Preparing image…'
              : uploadingReceipt
                ? 'Uploading image…'
                : 'Add image'}
          </button>
          {receiptCount > 0 ? (
            <>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-primary"
                onClick={handleViewReceipt}
                disabled={loadingReceipt}
              >
                {loadingReceipt ? 'Loading…' : 'View receipt image'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-outline"
                onClick={handleDownloadReceipt}
                disabled={downloadingReceipt}
              >
                {downloadingReceipt ? 'Preparing download…' : 'Download image'}
              </button>
            </>
          ) : null}
        </div>
        <p className="admin-hint">
          Receipt images only. Large photos are compressed automatically before upload; max 500 KB after
          compression.
        </p>
        {loadingReceipts ? <p className="admin-hint">Loading images…</p> : null}
        {receiptCount > 0 ? (
          <div className="admin-expenses-table-wrap" style={{ marginTop: 10 }}>
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Image name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id}>
                    <td>{r.file_name}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
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
