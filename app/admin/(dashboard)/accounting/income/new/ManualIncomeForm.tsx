'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  INCOME_SOURCE_TYPES,
  INCOME_PAYMENT_METHODS,
  MONEY_LOCATIONS,
} from '@/types/accounting';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ManualIncomeForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount]               = useState('');
  const [date, setDate]                   = useState(todayISO());
  const [sourceType, setSourceType]       = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [moneyLocation, setMoneyLocation] = useState('');
  const [description, setDescription]     = useState('');
  const [orderId, setOrderId]             = useState('');
  const [externalRef, setExternalRef]     = useState('');
  const [notes, setNotes]                 = useState('');

  const [proofFile, setProofFile]         = useState<File | null>(null);
  const [proofPreview, setProofPreview]   = useState<string | null>(null);

  const [loading, setLoading]             = useState(false);
  const [uploadStatus, setUploadStatus]   = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError]                 = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [fieldErrors, setFieldErrors]     = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setProofFile(file);
    setProofPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errs.amount = 'Enter a valid positive amount';
    if (!sourceType)     errs.sourceType     = 'Select a source type';
    if (!paymentMethod)  errs.paymentMethod  = 'Select a payment method';
    if (!moneyLocation)  errs.moneyLocation  = 'Select where money landed';
    if (!description.trim()) errs.description = 'Description is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDuplicateWarning(false);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    let proofPath: string | null = null;

    if (proofFile) {
      setUploadStatus('uploading');
      try {
        const fd = new FormData();
        fd.append('file', proofFile);
        const uploadRes = await fetch('/api/admin/accounting/upload-proof', { method: 'POST', body: fd });
        if (!uploadRes.ok) {
          const d = await uploadRes.json().catch(() => ({}));
          setUploadStatus('error');
          setError(d.error ?? 'Proof upload failed');
          setLoading(false);
          return;
        }
        proofPath = (await uploadRes.json()).path;
        setUploadStatus('done');
      } catch {
        setUploadStatus('error');
        setError('Proof upload failed. Please try again.');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/admin/accounting/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:            parseFloat(amount),
          source_type:       sourceType,
          payment_method:    paymentMethod,
          money_location:    moneyLocation,
          description:       description.trim(),
          order_id:          orderId.trim() || null,
          external_reference: externalRef.trim() || null,
          proof_file_path:   proofPath,
          receipt_attached:  !!proofPath,
          notes:             notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setDuplicateWarning(true);
        setError(data.error ?? 'Duplicate income record detected for this order ID.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'Failed to save income record');
        setLoading(false);
        return;
      }

      router.push(`/admin/accounting/income/${data.record.id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="admin-expenses-new">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/accounting/income" className="admin-back-link">← Back to Income</Link>
          <h1 className="admin-title">Add Manual Income</h1>
          <p className="admin-hint">For legacy, offline, or exceptional income not captured automatically</p>
        </div>
      </header>

      {/* Important notice */}
      <div className="admin-accounting-notice">
        <span className="material-symbols-outlined">info</span>
        <span>
          Automatic income is created when orders are marked paid. Use this form only for income that
          was <strong>not captured automatically</strong> — legacy orders, cash sales, or manual adjustments.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="admin-expenses-form" noValidate>
        {error && (
          <div className={`admin-error${duplicateWarning ? ' admin-error-warning' : ''}`} role="alert">
            <p>{error}</p>
            {duplicateWarning && (
              <p className="admin-hint">
                If you need to update an existing record, find it in the{' '}
                <Link href="/admin/accounting/income" className="admin-link">income list</Link>.
              </p>
            )}
          </div>
        )}

        {/* Amount + Date */}
        <div className="admin-expenses-form-row">
          <div className="admin-form-group">
            <label htmlFor="inc-amount">Amount (THB) *</label>
            <input
              id="inc-amount"
              type="number"
              className={`admin-input${fieldErrors.amount ? ' admin-input-error' : ''}`}
              placeholder="0.00"
              min="0.01"
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
            <label htmlFor="inc-date">Date *</label>
            <input
              id="inc-date"
              type="date"
              className="admin-input admin-input-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Source type */}
        <div className="admin-form-group">
          <label htmlFor="inc-source">Source Type *</label>
          <select
            id="inc-source"
            className={`admin-select${fieldErrors.sourceType ? ' admin-input-error' : ''}`}
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            required
          >
            <option value="">Select source type…</option>
            {INCOME_SOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {fieldErrors.sourceType && <span className="admin-field-error">{fieldErrors.sourceType}</span>}
        </div>

        {/* Payment method */}
        <div className="admin-expenses-form-row">
          <div className="admin-form-group">
            <label htmlFor="inc-pm">Payment Method *</label>
            <select
              id="inc-pm"
              className={`admin-select${fieldErrors.paymentMethod ? ' admin-input-error' : ''}`}
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                // Auto-suggest money location
                if (!moneyLocation) {
                  if (e.target.value === 'stripe') setMoneyLocation('stripe');
                  else if (e.target.value === 'cash') setMoneyLocation('cash');
                  else if (['bank_transfer', 'qr_payment'].includes(e.target.value)) setMoneyLocation('bank');
                }
              }}
              required
            >
              <option value="">Select method…</option>
              {INCOME_PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {fieldErrors.paymentMethod && <span className="admin-field-error">{fieldErrors.paymentMethod}</span>}
          </div>

          <div className="admin-form-group">
            <label htmlFor="inc-location">Money Location *</label>
            <select
              id="inc-location"
              className={`admin-select${fieldErrors.moneyLocation ? ' admin-input-error' : ''}`}
              value={moneyLocation}
              onChange={(e) => setMoneyLocation(e.target.value)}
              required
            >
              <option value="">Where did money go?</option>
              {MONEY_LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            {fieldErrors.moneyLocation && <span className="admin-field-error">{fieldErrors.moneyLocation}</span>}
          </div>
        </div>

        {/* Description */}
        <div className="admin-form-group">
          <label htmlFor="inc-desc">Description *</label>
          <input
            id="inc-desc"
            type="text"
            className={`admin-input${fieldErrors.description ? ' admin-input-error' : ''}`}
            placeholder="e.g. Walk-in sale, legacy order from March"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            required
          />
          {fieldErrors.description && <span className="admin-field-error">{fieldErrors.description}</span>}
        </div>

        {/* Optional order reference */}
        <div className="admin-expenses-form-row">
          <div className="admin-form-group">
            <label htmlFor="inc-order">Order ID Reference <span className="admin-hint">(optional)</span></label>
            <input
              id="inc-order"
              type="text"
              className="admin-input"
              placeholder="e.g. ORD-12345"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <span className="admin-hint">If provided, duplicate check runs against existing income records.</span>
          </div>
          <div className="admin-form-group">
            <label htmlFor="inc-ext">External Reference <span className="admin-hint">(optional)</span></label>
            <input
              id="inc-ext"
              type="text"
              className="admin-input"
              placeholder="Bank slip no., LINE ref, etc."
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
            />
          </div>
        </div>

        {/* Proof file */}
        <div className="admin-form-group">
          <label>Proof of Payment <span className="admin-hint">(optional)</span></label>
          <div
            className="admin-expenses-upload-area"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Upload proof file"
          >
            {proofPreview ? (
              <img src={proofPreview} alt="Proof preview" className="admin-expenses-preview-img" />
            ) : proofFile ? (
              <div className="admin-expenses-file-info">
                <span className="material-symbols-outlined">attach_file</span>
                <span>{proofFile.name}</span>
              </div>
            ) : (
              <div className="admin-expenses-upload-placeholder">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span>Tap to attach proof</span>
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
            aria-label="Upload proof file"
          />
          {uploadStatus === 'uploading' && <p className="admin-hint">Uploading…</p>}
          {uploadStatus === 'error' && <p className="admin-field-error">Upload failed</p>}
          {proofFile && (
            <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" style={{ marginTop: 4 }}
              onClick={() => { setProofFile(null); setProofPreview(null); setUploadStatus('idle'); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
              Remove
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="admin-form-group">
          <label htmlFor="inc-notes">Notes <span className="admin-hint">(optional)</span></label>
          <textarea
            id="inc-notes"
            className="admin-input admin-expenses-textarea"
            placeholder="Context, reason for manual entry…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="admin-expenses-form-actions">
          <Link href="/admin/accounting/income" className="admin-btn admin-btn-outline">Cancel</Link>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save Income Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
