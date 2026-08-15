'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PAY_LINK_TTL_MINUTES } from '@/lib/payLinks/adminPayLink';

export function PayLinkForm() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ draftId: string; reviewUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setCopied(false);
    setCopyError(null);
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/pay-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: n,
          description: description.trim(),
          customerName: customerName.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fromApi = typeof data.error === 'string' ? data.error.trim() : '';
        setError(fromApi || `Failed to create pay link (${res.status})`);
        return;
      }
      setCreated({ draftId: String(data.draftId), reviewUrl: String(data.reviewUrl) });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!created?.reviewUrl) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(created.reviewUrl);
      setCopied(true);
      return;
    } catch {
      /* fall through to input select + execCommand */
    }
    try {
      const el = document.getElementById('pay-link-url');
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.select();
        const ok = document.execCommand('copy');
        if (ok) {
          setCopied(true);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setCopied(false);
    setCopyError('Could not copy automatically. Select the URL and copy it yourself.');
  };

  return (
    <div className="admin-expenses-new">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/accounting/pay-links" className="admin-back-link">
            ← Back to Pay links
          </Link>
          <h1 className="admin-title">New pay link</h1>
          <p className="admin-hint">
            Extra item or service not in the store. The customer opens the URL and goes straight to Stripe.
            They have {PAY_LINK_TTL_MINUTES} minutes to pay. After that the link is disabled. An order is created only after they pay.
          </p>
        </div>
      </header>

      <div className="admin-accounting-notice">
        <span className="material-symbols-outlined">info</span>
        <span>
          This is not a flower delivery order. Send this shop URL. The customer must pay within{' '}
          {PAY_LINK_TTL_MINUTES} minutes. After they pay, the link shows a thank-you page and cannot be used again.
        </span>
      </div>

      {created ? (
        <div className="admin-expenses-form">
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Pay link ready. Copy and send it now. The customer must pay within {PAY_LINK_TTL_MINUTES} minutes.
          </p>
          <div className="admin-pay-link-created-banner" role="status">
            <span className="material-symbols-outlined" aria-hidden>
              schedule
            </span>
            <span>
              <strong>Valid for {PAY_LINK_TTL_MINUTES} minutes.</strong> After they pay, the same URL shows a
              thank-you page and cannot be charged again.
            </span>
          </div>
          {copied ? (
            <div className="admin-pay-link-copied-banner" role="status">
              <span className="material-symbols-outlined" aria-hidden>
                check_circle
              </span>
              <span>Link copied to clipboard. You can paste it in LINE, WhatsApp, or email.</span>
            </div>
          ) : null}
          {copyError ? (
            <div className="admin-error" role="alert">
              <p>{copyError}</p>
            </div>
          ) : null}
          <div className="admin-form-group">
            <label htmlFor="pay-link-url">Customer pay URL</label>
            <div className="admin-pay-link-url-row">
              <input id="pay-link-url" className="admin-input" readOnly value={created.reviewUrl} />
              <button
                type="button"
                className={`admin-btn admin-btn-primary${copied ? ' admin-btn-copied' : ''}`}
                onClick={copyLink}
                aria-live="polite"
              >
                <span className="material-symbols-outlined" aria-hidden>
                  {copied ? 'check_circle' : 'content_copy'}
                </span>
                {copied ? 'Copied to clipboard' : 'Copy link'}
              </button>
            </div>
          </div>
          <div className="admin-expenses-form-actions">
            <Link href="/admin/accounting/pay-links" className="admin-btn admin-btn-outline">
              View pay links
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={() => {
                setCreated(null);
                setAmount('');
                setDescription('');
                setCustomerName('');
                setCustomerEmail('');
                setPhone('');
                setCopied(false);
                setCopyError(null);
              }}
            >
              Create another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="admin-expenses-form" noValidate>
          {error && (
            <div className="admin-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          <div className="admin-expenses-form-row">
            <div className="admin-form-group">
              <label htmlFor="pl-amount">Amount (THB) *</label>
              <input
                id="pl-amount"
                type="number"
                className="admin-input"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                required
                autoFocus
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="pl-desc">Description *</label>
              <input
                id="pl-desc"
                type="text"
                className="admin-input"
                placeholder="e.g. Extra balloons, rush fee, custom arrangement"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                required
              />
            </div>
          </div>

          <div className="admin-expenses-form-row">
            <div className="admin-form-group">
              <label htmlFor="pl-name">
                Customer name <span className="admin-hint">(optional)</span>
              </label>
              <input
                id="pl-name"
                type="text"
                className="admin-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="pl-email">
                Email <span className="admin-hint">(optional, Stripe receipt)</span>
              </label>
              <input
                id="pl-email"
                type="email"
                className="admin-input"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label htmlFor="pl-phone">
              Phone <span className="admin-hint">(optional)</span>
            </label>
            <input
              id="pl-phone"
              type="tel"
              className="admin-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="admin-expenses-form-actions">
            <Link href="/admin/accounting/pay-links" className="admin-btn admin-btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-moderation-btn-loading"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="admin-moderation-spinner" aria-hidden />
                  Creating…
                </>
              ) : (
                'Create pay link'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
