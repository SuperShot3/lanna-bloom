'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types/expenses';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function NewExpenseForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount]           = useState('');
  const [date, setDate]               = useState(todayISO());
  const [category, setCategory]       = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes]             = useState('');
  const [linkedOrderId, setLinkedOrderId] = useState('');

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setReceiptFile(file);
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    } else {
      setReceiptPreview(null);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
      errs.amount = 'Enter a valid amount';
    }
    if (!date) errs.date = 'Date is required';
    if (!category) errs.category = 'Select a category';
    if (!description.trim()) errs.description = 'Description is required';
    if (!paymentMethod) errs.paymentMethod = 'Select a payment method';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);

    let receiptPath: string | null = null;

    // Upload receipt first if provided
    if (receiptFile) {
      setUploadProgress('uploading');
      try {
        const formData = new FormData();
        formData.append('file', receiptFile);
        const uploadRes = await fetch('/api/admin/expenses/upload-receipt', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}));
          setUploadProgress('error');
          setError(data.error ?? 'Receipt upload failed');
          setLoading(false);
          return;
        }
        const { path } = await uploadRes.json();
        receiptPath = path;
        setUploadProgress('done');
      } catch {
        setUploadProgress('error');
        setError('Receipt upload failed. Please try again.');
        setLoading(false);
        return;
      }
    }

    // Create expense record
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:           parseFloat(amount),
          date,
          category,
          description:      description.trim(),
          payment_method:   paymentMethod,
          receipt_file_path: receiptPath,
          receipt_attached: !!receiptPath,
          notes:            notes.trim() || null,
          linked_order_id:  linkedOrderId.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save expense');
        setLoading(false);
        return;
      }

      router.push(`/admin/expenses/${data.expense.id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="admin-expenses-new">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/expenses" className="admin-back-link">← Back to Expenses</Link>
          <h1 className="admin-title">Add Expense</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="admin-expenses-form" noValidate>
        {error && (
          <div className="admin-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Amount + Date row */}
        <div className="admin-expenses-form-row">
          <div className="admin-form-group">
            <label htmlFor="exp-amount">Amount (THB) *</label>
            <input
              id="exp-amount"
              type="number"
              className={`admin-input${fieldErrors.amount ? ' admin-input-error' : ''}`}
              placeholder="0.00"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              required
              autoFocus
            />
            {fieldErrors.amount && <span className="admin-field-error">{fieldErrors.amount}</span>}
          </div>

          <div className="admin-form-group">
            <label htmlFor="exp-date">Date *</label>
            <input
              id="exp-date"
              type="date"
              className={`admin-input admin-input-date${fieldErrors.date ? ' admin-input-error' : ''}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            {fieldErrors.date && <span className="admin-field-error">{fieldErrors.date}</span>}
          </div>
        </div>

        {/* Category */}
        <div className="admin-form-group">
          <label htmlFor="exp-category">Category *</label>
          <select
            id="exp-category"
            className={`admin-select${fieldErrors.category ? ' admin-input-error' : ''}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select category…</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {fieldErrors.category && <span className="admin-field-error">{fieldErrors.category}</span>}
        </div>

        {/* Description */}
        <div className="admin-form-group">
          <label htmlFor="exp-description">Description *</label>
          <input
            id="exp-description"
            type="text"
            className={`admin-input${fieldErrors.description ? ' admin-input-error' : ''}`}
            placeholder="What was this expense for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            required
          />
          {fieldErrors.description && <span className="admin-field-error">{fieldErrors.description}</span>}
        </div>

        {/* Payment method */}
        <div className="admin-form-group">
          <label htmlFor="exp-payment">Payment Method *</label>
          <select
            id="exp-payment"
            className={`admin-select${fieldErrors.paymentMethod ? ' admin-input-error' : ''}`}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            required
          >
            <option value="">Select method…</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {fieldErrors.paymentMethod && <span className="admin-field-error">{fieldErrors.paymentMethod}</span>}
        </div>

        {/* Receipt upload */}
        <div className="admin-form-group">
          <label>Receipt Photo / File</label>
          <div
            className="admin-expenses-upload-area"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Upload receipt"
          >
            {receiptPreview ? (
              <img src={receiptPreview} alt="Receipt preview" className="admin-expenses-preview-img" />
            ) : receiptFile ? (
              <div className="admin-expenses-file-info">
                <span className="material-symbols-outlined">attach_file</span>
                <span>{receiptFile.name}</span>
              </div>
            ) : (
              <div className="admin-expenses-upload-placeholder">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span>Tap to attach receipt</span>
                <span className="admin-hint">JPG, PNG, WebP, HEIC or PDF · max 10 MB</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="admin-expenses-file-input"
            onChange={handleFileChange}
            aria-label="Upload receipt file"
          />
          {uploadProgress === 'uploading' && (
            <p className="admin-hint">Uploading receipt…</p>
          )}
          {uploadProgress === 'error' && (
            <p className="admin-field-error">Upload failed</p>
          )}
          {receiptFile && (
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-outline"
              style={{ marginTop: 4 }}
              onClick={() => {
                setReceiptFile(null);
                setReceiptPreview(null);
                setUploadProgress('idle');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Remove
            </button>
          )}
        </div>

        {/* Notes (optional) */}
        <div className="admin-form-group">
          <label htmlFor="exp-notes">Notes <span className="admin-hint">(optional)</span></label>
          <textarea
            id="exp-notes"
            className="admin-input admin-expenses-textarea"
            placeholder="Any extra details…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Linked order (optional) */}
        <div className="admin-form-group">
          <label htmlFor="exp-order">Linked Order ID <span className="admin-hint">(optional)</span></label>
          <input
            id="exp-order"
            type="text"
            className="admin-input"
            placeholder="e.g. ORD-12345"
            value={linkedOrderId}
            onChange={(e) => setLinkedOrderId(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="admin-expenses-form-actions">
          <Link href="/admin/expenses" className="admin-btn admin-btn-outline">
            Cancel
          </Link>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
