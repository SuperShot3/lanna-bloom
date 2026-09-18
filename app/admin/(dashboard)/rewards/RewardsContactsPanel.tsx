'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Contact = {
  email: string;
  name: string | null;
  orderCount: number;
  lastOrderAt: string | null;
  marketingConsent: boolean;
  newsletter: boolean;
  balance: number;
};

type BulkResult = { email: string; ok: boolean; error?: string };

const PAGE = 100;

const thb = (n: number) => `฿${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export function RewardsContactsPanel({ onIssued }: { onIssued?: () => void }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlyConsent, setOnlyConsent] = useState(false);
  const [onlyNoCredit, setOnlyNoCredit] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(PAGE);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failures, setFailures] = useState<BulkResult[]>([]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/rewards/contacts');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof data.error === 'string' ? data.error : `Failed to load contacts (${res.status})`);
        return;
      }
      setContacts(data.contacts as Contact[]);
    } catch {
      setLoadError('Network error loading contacts.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (contacts ?? []).filter((c) => {
      if (onlyConsent && !(c.marketingConsent || c.newsletter)) return false;
      if (onlyNoCredit && c.balance > 0) return false;
      if (!q) return true;
      return c.email.includes(q) || (c.name ?? '').toLowerCase().includes(q);
    });
  }, [contacts, search, onlyConsent, onlyNoCredit]);

  const visible = filtered.slice(0, shown);

  const toggle = (email: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });

  const selectAllFiltered = () => setSelected(new Set(filtered.map((c) => c.email)));

  const issue = async () => {
    setMessage(null);
    setFailures([]);
    const n = parseFloat(amount);
    if (selected.size === 0) return setMessage('Select at least one contact.');
    if (!Number.isFinite(n) || n <= 0) return setMessage('Enter a positive amount.');
    if (!window.confirm(`Issue ${thb(n)} to ${selected.size} contact(s)?`)) return;

    setBusy(true);
    try {
      const res = await fetch('/api/admin/rewards/issue-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: Array.from(selected), amount: n, notes: notes.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === 'string' ? data.error : `Failed (${res.status})`);
        return;
      }
      setMessage(`Issued ${thb(n)} to ${data.succeeded} contact(s)${data.failed ? `, ${data.failed} failed` : ''}.`);
      setFailures((data.results as BulkResult[]).filter((r) => !r.ok));
      setSelected(new Set());
      setAmount('');
      await load();
      onIssued?.();
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">Contacts</h2>
      <p className="admin-hint">
        Everyone from your orders and newsletter. Credit can only be issued to people in this list. Marketing =
        opted in at checkout or newsletter.
      </p>

      {loadError && (
        <div className="admin-error" role="alert">
          <p>{loadError}</p>
        </div>
      )}

      <div className="admin-expenses-form-row">
        <div className="admin-form-group">
          <input
            className="admin-input"
            type="search"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShown(PAGE);
            }}
          />
        </div>
        <div className="admin-form-group">
          <label>
            <input type="checkbox" checked={onlyConsent} onChange={(e) => setOnlyConsent(e.target.checked)} /> Marketing
            opt-in only
          </label>{' '}
          <label>
            <input type="checkbox" checked={onlyNoCredit} onChange={(e) => setOnlyNoCredit(e.target.checked)} /> No
            credit yet
          </label>
        </div>
      </div>

      <div className="admin-expenses-form-actions">
        <span className="admin-hint">
          {contacts ? `${filtered.length} of ${contacts.length} contacts · ${selected.size} selected` : 'Loading…'}
        </span>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={selectAllFiltered}>
          Select all {filtered.length}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={() => setSelected(new Set())}
          disabled={selected.size === 0}
        >
          Clear
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th />
              <th>Email</th>
              <th>Name</th>
              <th>Orders</th>
              <th>Last order</th>
              <th>Marketing</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.email}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(c.email)}
                    onChange={() => toggle(c.email)}
                    aria-label={`Select ${c.email}`}
                  />
                </td>
                <td>{c.email}</td>
                <td>{c.name ?? '—'}</td>
                <td>{c.orderCount}</td>
                <td>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}</td>
                <td>{c.marketingConsent || c.newsletter ? 'Yes' : '—'}</td>
                <td>{c.balance > 0 ? thb(c.balance) : '—'}</td>
              </tr>
            ))}
            {contacts && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="admin-empty">
                  No contacts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > shown && (
        <button type="button" className="admin-btn admin-btn-outline" onClick={() => setShown((s) => s + PAGE)}>
          Show more ({filtered.length - shown} left)
        </button>
      )}

      <div className="admin-expenses-form" style={{ marginTop: 16 }}>
        <h3 className="admin-section-title">Issue credit to {selected.size} selected</h3>
        <div className="admin-expenses-form-row">
          <div className="admin-form-group">
            <label htmlFor="rwb-amount">Amount each (THB)</label>
            <input
              id="rwb-amount"
              type="number"
              className="admin-input"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="rwb-notes">Notes (optional)</label>
            <input
              id="rwb-notes"
              className="admin-input"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. September returning customers"
            />
          </div>
        </div>
        <div className="admin-expenses-form-actions">
          <button type="button" className="admin-btn admin-btn-primary" onClick={issue} disabled={busy}>
            {busy ? 'Issuing…' : `Issue to ${selected.size} contact(s)`}
          </button>
        </div>
        {message && <p className="admin-hint" role="status">{message}</p>}
        {failures.length > 0 && (
          <ul className="admin-hint">
            {failures.map((f) => (
              <li key={f.email}>
                {f.email}: {f.error}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
