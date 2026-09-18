'use client';

import { useEffect, useState } from 'react';
import { RewardsContactsPanel } from './RewardsContactsPanel';

type Customer = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

type CreditTransaction = {
  id: string;
  type: 'issue' | 'redeem' | 'reversal' | 'expire';
  amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  order_id: string | null;
};

type LookupState = {
  customer: Customer | null;
  balance: number;
  transactions: CreditTransaction[];
};

const TYPE_LABELS: Record<CreditTransaction['type'], string> = {
  issue: 'Issued',
  redeem: 'Redeemed',
  reversal: 'Reversal',
  expire: 'Expired',
};

function formatThb(amount: number): string {
  const sign = amount > 0 ? '+' : '';
  return `${sign}฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RewardsAdminClient() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const [customerLink, setCustomerLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCustomerLink(`${window.location.origin}/en/rewards`);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(customerLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const runLookup = async (targetEmail: string) => {
    if (!targetEmail.trim()) return;
    setLookingUp(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rewards/customer?email=${encodeURIComponent(targetEmail.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : `Lookup failed (${res.status})`);
        setLookup(null);
        return;
      }
      setLookup({
        customer: data.customer ?? null,
        balance: Number(data.balance ?? 0),
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    void runLookup(email);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const n = parseFloat(amount);
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid customer email.');
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a positive amount.');
      return;
    }

    setIssuing(true);
    try {
      const res = await fetch('/api/admin/rewards/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, amount: n, notes: notes.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : `Failed to issue credit (${res.status})`);
        return;
      }
      setSuccess(`Issued ${formatThb(n)} to ${trimmedEmail}.`);
      setAmount('');
      setNotes('');
      await runLookup(trimmedEmail);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="admin-expenses-new">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Rewards</h1>
          <p className="admin-hint">
            Issue store credit to people already in your contacts (orders + newsletter), one at a time or in bulk,
            and look up any customer's ledger. Checkout redemption is not built yet.
          </p>
        </div>
      </header>

      {error && (
        <div className="admin-error" role="alert">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="admin-pay-link-copied-banner" role="status">
          <span>{success}</span>
        </div>
      )}

      <div className="admin-expenses-form">
        <div className="admin-form-group">
          <label htmlFor="rw-link">Customer credit link (same link for everyone)</label>
          <div className="admin-pay-link-url-row">
            <input id="rw-link" className="admin-input" readOnly value={customerLink} />
            <button type="button" className="admin-btn admin-btn-primary" onClick={copyLink}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <p className="admin-hint">
            Customers open this, enter their email and receive a secure sign-in link. Use /th/rewards, /ru/rewards etc.
            for other languages.
          </p>
        </div>

        <div className="admin-form-group">
          <label htmlFor="rw-email">Customer email *</label>
          <input
            id="rw-email"
            type="email"
            className="admin-input"
            placeholder="customer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="admin-expenses-form-row">
          <div className="admin-form-group">
            <label htmlFor="rw-amount">Amount to issue (THB)</label>
            <input
              id="rw-amount"
              type="number"
              className="admin-input"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="rw-notes">
              Notes <span className="admin-hint">(optional)</span>
            </label>
            <input
              id="rw-notes"
              type="text"
              className="admin-input"
              placeholder="e.g. goodwill credit for late delivery"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <div className="admin-expenses-form-actions">
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={handleLookupSubmit}
            disabled={lookingUp}
          >
            {lookingUp ? 'Looking up…' : 'Look up balance'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleIssueSubmit}
            disabled={issuing}
          >
            {issuing ? 'Issuing…' : 'Issue credit'}
          </button>
        </div>
      </div>

      <RewardsContactsPanel />

      {lookup && (
        <section className="admin-section">
          <h2 className="admin-section-title">
            {lookup.customer ? lookup.customer.email : 'No customer found for that email yet'}
          </h2>
          {lookup.customer ? (
            <>
              <p className="admin-hint">
                Available balance: <strong>{formatThb(lookup.balance)}</strong>
              </p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Order</th>
                      <th>Notes</th>
                      <th>Created by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookup.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="admin-empty">
                          No ledger entries yet.
                        </td>
                      </tr>
                    ) : (
                      lookup.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>{new Date(tx.created_at).toLocaleString()}</td>
                          <td>{TYPE_LABELS[tx.type]}</td>
                          <td>{formatThb(Number(tx.amount))}</td>
                          <td>{tx.order_id ?? '—'}</td>
                          <td>{tx.notes ?? '—'}</td>
                          <td>{tx.created_by ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="admin-hint">
              Issuing credit will create this customer automatically.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
