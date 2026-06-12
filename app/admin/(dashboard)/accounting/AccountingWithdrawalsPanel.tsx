'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { AccountingWithdrawal } from '@/types/accountingWithdrawals';

function formatAmount(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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

const LOCATION_LABELS: Record<string, string> = {
  bank: 'Bank Account',
  cash: 'Cash on Hand',
  stripe: 'Stripe Balance',
  other: 'Other',
};

interface Props {
  withdrawalsData: {
    withdrawals: AccountingWithdrawal[];
    periodTotal: number;
    periodCount: number;
    error?: string;
  };
  periodLabel: string;
}

export function AccountingWithdrawalsPanel({ withdrawalsData, periodLabel }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();
  const recordHref = (() => {
    const next = new URLSearchParams(sp.toString());
    next.set('action', 'withdrawal');
    return `/admin/accounting/withdrawals?${next.toString()}`;
  })();
  const [editing, setEditing] = useState<AccountingWithdrawal | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const exportCsv = () => {
    const headers = ['Date', 'Purpose', 'Notes', 'Amount', 'Currency', 'From', 'Recorded by'];
    const lines = [headers.join(',')];
    for (const w of withdrawalsData.withdrawals) {
      lines.push(
        [
          escapeCsvCell(w.withdrawal_date.slice(0, 10)),
          escapeCsvCell(w.purpose),
          escapeCsvCell(w.notes ?? ''),
          String(w.amount),
          escapeCsvCell(w.currency || 'THB'),
          escapeCsvCell(LOCATION_LABELS[w.from_location] ?? w.from_location),
          escapeCsvCell(w.created_by ?? ''),
        ].join(',')
      );
    }
    downloadCsvLines(`personal-withdrawals-${periodSlug(periodLabel)}.csv`, lines);
  };

  const handleViewProof = async (withdrawalId: string) => {
    try {
      const res = await fetch(`/api/admin/accounting/withdrawals/${withdrawalId}/proof-url`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to load proof');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      alert('Failed to load proof');
    }
  };

  const openEdit = (w: AccountingWithdrawal) => {
    setEditing(w);
    setEditDate(w.withdrawal_date.slice(0, 10));
    setEditAmount(String(w.amount));
    setEditPurpose(w.purpose);
    setEditNotes(w.notes ?? '');
    setMsg(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/accounting/withdrawals/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawal_date: editDate,
          amount: parseFloat(editAmount),
          purpose: editPurpose,
          notes: editNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? 'Update failed');
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setMsg('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (w: AccountingWithdrawal) => {
    if (!confirm(`Delete withdrawal "${w.purpose}" (${formatAmount(w.amount)})? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/accounting/withdrawals/${w.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Delete failed');
        return;
      }
      router.refresh();
    } catch {
      alert('Network error. Please try again.');
    }
  };

  return (
    <div className="admin-expenses">
      <div className="admin-expenses-filters">
        <Link
          href={recordHref}
          className="admin-btn admin-btn-primary admin-btn-sm"
          scroll={false}
        >
          + Record withdrawal
        </Link>
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={exportCsv}
          disabled={withdrawalsData.withdrawals.length === 0}
          title="Export visible withdrawals as CSV"
        >
          Export CSV
        </button>
      </div>
      <div className="admin-expenses-summary">
        <span className="admin-expenses-total">
          Total personal withdrawals in period: {formatAmount(withdrawalsData.periodTotal)} (
          {withdrawalsData.periodCount} {withdrawalsData.periodCount === 1 ? 'entry' : 'entries'})
        </span>
        <span className="admin-hint">
          Personal withdrawals reduce bank balance but do not change revenue or business profit.
        </span>
      </div>

      {withdrawalsData.error ? (
        <div className="admin-error">
          <p>
            <strong>Error loading withdrawals</strong>
          </p>
          <p>{withdrawalsData.error}</p>
        </div>
      ) : withdrawalsData.withdrawals.length === 0 ? (
        <p className="admin-empty">
          No personal withdrawals in this period.{' '}
          <Link href={recordHref} className="admin-link" scroll={false}>
            Record a withdrawal
          </Link>{' '}
          when money leaves the business bank for personal use.
        </p>
      ) : (
        <div className="admin-expenses-table-wrap">
          <table className="admin-expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Purpose</th>
                <th>Notes</th>
                <th>From</th>
                <th>Proof</th>
                <th>Recorded by</th>
                <th className="admin-expenses-col-amount">Amount</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {withdrawalsData.withdrawals.map((w) => (
                <tr key={w.id} className="admin-expenses-row">
                  <td className="admin-expenses-date">{formatDate(w.withdrawal_date)}</td>
                  <td className="admin-expenses-desc">
                    <span className="admin-expenses-desc-text">{w.purpose}</span>
                  </td>
                  <td className="admin-expenses-notes">{w.notes ?? '—'}</td>
                  <td>{LOCATION_LABELS[w.from_location] ?? w.from_location}</td>
                  <td>
                    {w.proof_attached && w.proof_file_path ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={() => handleViewProof(w.id)}
                      >
                        View
                      </button>
                    ) : (
                      <span className="admin-badge admin-badge-payment-pending">None</span>
                    )}
                  </td>
                  <td className="admin-expenses-notes">{w.created_by}</td>
                  <td className="admin-expenses-amount">{formatAmount(w.amount, w.currency)}</td>
                  <td>
                    <div className="admin-expenses-row-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={() => openEdit(w)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={() => deleteRow(w)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="admin-accounting-section" style={{ marginTop: 16 }}>
          <h2 className="admin-accounting-section-title">Edit withdrawal</h2>
          <div className="admin-accounting-backfill-actions" style={{ flexWrap: 'wrap' }}>
            <input
              type="date"
              className="admin-input admin-input-date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              aria-label="Withdrawal date"
            />
            <input
              type="number"
              className="admin-input"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="Amount"
              min="0"
              step="0.01"
              inputMode="decimal"
              aria-label="Amount"
              style={{ maxWidth: 160 }}
            />
            <input
              type="text"
              className="admin-input"
              value={editPurpose}
              onChange={(e) => setEditPurpose(e.target.value)}
              placeholder="Where did the money go?"
              aria-label="Purpose"
              style={{ minWidth: 220 }}
            />
            <input
              type="text"
              className="admin-input"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              aria-label="Notes"
              style={{ minWidth: 220 }}
            />
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={saving}
              onClick={saveEdit}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
          {msg && (
            <p className="admin-hint" style={{ marginTop: 6 }}>
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
