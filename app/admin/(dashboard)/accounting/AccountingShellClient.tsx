'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MONEY_LOCATIONS } from '@/types/accounting';
import type { AccountingSectionCounts } from './AccountingSectionSwitcher';
import { AccountingSectionSwitcher } from './AccountingSectionSwitcher';

interface Props {
  periodLabel: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  /** True when the user has explicitly chosen "All time" (period=all in URL). */
  isAllTime: boolean;
  navCounts?: AccountingSectionCounts;
  children: ReactNode;
}

export function AccountingShellClient({
  periodLabel,
  initialDateFrom,
  initialDateTo,
  isAllTime,
  navCounts,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();

  const transferFileInputRef = useRef<HTMLInputElement>(null);

  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? '');
  const [dateTo, setDateTo] = useState(initialDateTo ?? '');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCurrency, setTransferCurrency] = useState('THB');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferFrom, setTransferFrom] = useState('stripe');
  const [transferTo, setTransferTo] = useState('bank');
  const [transferStatus, setTransferStatus] = useState('received');
  const [transferExternalRef, setTransferExternalRef] = useState('');
  const [transferBankReceivedDate, setTransferBankReceivedDate] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferAttachment, setTransferAttachment] = useState<File | null>(null);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferMsg, setTransferMsg] = useState<string | null>(null);

  useEffect(() => {
    setDateFrom(initialDateFrom ?? '');
    setDateTo(initialDateTo ?? '');
  }, [initialDateFrom, initialDateTo]);

  const navigateWithQuery = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(sp.toString());
    mutate(next);
    router.push(`${pathname}?${next.toString()}`);
  };

  const applyPeriodFilter = () => {
    navigateWithQuery((next) => {
      if (dateFrom) next.set('dateFrom', dateFrom);
      else next.delete('dateFrom');
      if (dateTo) next.set('dateTo', dateTo);
      else next.delete('dateTo');
      next.delete('period');
      next.delete('page');
    });
  };

  const useThisMonth = () => {
    setDateFrom('');
    setDateTo('');
    navigateWithQuery((next) => {
      next.delete('dateFrom');
      next.delete('dateTo');
      next.delete('period');
      next.delete('page');
    });
  };

  const useAllTime = () => {
    setDateFrom('');
    setDateTo('');
    navigateWithQuery((next) => {
      next.delete('dateFrom');
      next.delete('dateTo');
      next.set('period', 'all');
      next.delete('page');
    });
  };

  const useQuickRange = (kind: 'this_month' | 'last_month' | 'ytd') => {
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let from = '';
    let to = '';
    if (kind === 'this_month') {
      from = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
      to = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (kind === 'last_month') {
      from = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      to = fmt(new Date(now.getFullYear(), now.getMonth(), 0));
    } else {
      from = fmt(new Date(now.getFullYear(), 0, 1));
      to = fmt(new Date(now.getFullYear(), 11, 31));
    }
    setDateFrom(from);
    setDateTo(to);
    navigateWithQuery((next) => {
      next.set('dateFrom', from);
      next.set('dateTo', to);
      next.delete('period');
      next.delete('page');
    });
  };

  return (
    <div className="admin-accounting">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Accounting</h1>
          <p className="admin-hint admin-accounting-period-label">{periodLabel}</p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={() => {
              setTransferOpen((v) => !v);
              setTransferMsg(null);
            }}
          >
            Record Stripe Payout
          </button>
          <Link href="/admin/accounting/income/new" className="admin-btn admin-btn-primary">
            + Manual Income
          </Link>
          <Link href="/admin/expenses/new" className="admin-btn admin-btn-outline">
            + Add Expense
          </Link>
        </div>
      </header>

      {transferOpen && (
        <div className="admin-accounting-section" style={{ marginTop: 12 }}>
          <h2 className="admin-accounting-section-title">Record Stripe Payout / Money Transfer</h2>
          <p className="admin-hint">
            Moves already-recorded money between locations. This is not income and does not change revenue or profit.
          </p>
          <div className="admin-accounting-backfill-actions" style={{ flexWrap: 'wrap' }}>
            <input
              type="date"
              className="admin-input admin-input-date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              aria-label="Transfer date"
            />
            <input
              type="number"
              className="admin-input"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
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
              value={transferCurrency}
              onChange={(e) => setTransferCurrency(e.target.value.toUpperCase())}
              placeholder="Currency"
              aria-label="Currency"
              style={{ maxWidth: 110 }}
            />
            <select
              className="admin-select"
              value={transferFrom}
              onChange={(e) => setTransferFrom(e.target.value)}
              aria-label="From location"
            >
              <option value="" disabled>
                From
              </option>
              {MONEY_LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <span className="admin-hint" aria-hidden="true">
              →
            </span>
            <select
              className="admin-select"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              aria-label="To location"
            >
              <option value="" disabled>
                To
              </option>
              {MONEY_LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <select
              className="admin-select"
              value={transferStatus}
              onChange={(e) => setTransferStatus(e.target.value)}
              aria-label="Payout status"
            >
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="reconciled">Reconciled</option>
            </select>
            <input
              type="text"
              className="admin-input"
              value={transferExternalRef}
              onChange={(e) => setTransferExternalRef(e.target.value)}
              placeholder="Stripe payout ID / reference"
              aria-label="Stripe payout reference"
              style={{ minWidth: 220 }}
            />
            <input
              type="date"
              className="admin-input admin-input-date"
              value={transferBankReceivedDate}
              onChange={(e) => setTransferBankReceivedDate(e.target.value)}
              aria-label="Bank received date"
            />
            <input
              type="text"
              className="admin-input"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Note (optional)"
              aria-label="Note"
              style={{ minWidth: 220 }}
            />
            <input
              ref={transferFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              className="admin-expenses-file-input"
              onChange={(e) => setTransferAttachment(e.target.files?.[0] ?? null)}
              aria-label="Attach payout proof"
            />
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={() => transferFileInputRef.current?.click()}
            >
              {transferAttachment ? transferAttachment.name : 'Attach proof'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={transferSaving}
              onClick={async () => {
                setTransferSaving(true);
                setTransferMsg(null);
                try {
                  const amt = parseFloat(transferAmount);
                  let attachmentPath: string | null = null;

                  if (transferAttachment) {
                    const fd = new FormData();
                    fd.append('file', transferAttachment);
                    const uploadRes = await fetch('/api/admin/accounting/upload-proof', {
                      method: 'POST',
                      body: fd,
                    });
                    const uploadData = await uploadRes.json().catch(() => ({}));
                    if (!uploadRes.ok) {
                      setTransferMsg(uploadData.error ?? 'Attachment upload failed');
                      return;
                    }
                    attachmentPath = uploadData.path ?? null;
                  }

                  const res = await fetch('/api/admin/accounting/transfers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      amount: amt,
                      currency: transferCurrency.trim() || 'THB',
                      transfer_date: transferDate,
                      from_location: transferFrom,
                      to_location: transferTo,
                      status: transferStatus,
                      external_reference: transferExternalRef.trim() || null,
                      bank_received_date: transferBankReceivedDate || null,
                      attachment_file_path: attachmentPath,
                      note: transferNote.trim() || null,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setTransferMsg(data.error ?? 'Transfer failed');
                  } else {
                    setTransferMsg('Transfer saved');
                    setTransferAmount('');
                    setTransferExternalRef('');
                    setTransferBankReceivedDate('');
                    setTransferNote('');
                    setTransferAttachment(null);
                    if (transferFileInputRef.current) transferFileInputRef.current.value = '';
                    router.refresh();
                  }
                } catch {
                  setTransferMsg('Network error. Please try again.');
                } finally {
                  setTransferSaving(false);
                }
              }}
            >
              {transferSaving ? 'Saving…' : 'Record transfer'}
            </button>
          </div>
          {transferMsg && (
            <p className="admin-hint" style={{ marginTop: 6 }}>
              {transferMsg}
            </p>
          )}
        </div>
      )}

      <AccountingSectionSwitcher counts={navCounts} />

      <div className="admin-accounting-period-row">
        <input
          type="date"
          className="admin-input admin-input-date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="admin-input admin-input-date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
        />
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={applyPeriodFilter}>
          Apply
        </button>
        <span className="admin-hint" aria-hidden="true">
          |
        </span>
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={() => useQuickRange('this_month')}
        >
          This month
        </button>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => useQuickRange('last_month')}>
          Last month
        </button>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => useQuickRange('ytd')}>
          Year to date
        </button>
        {!isAllTime ? (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={useAllTime}>
            All time
          </button>
        ) : (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={useThisMonth}>
            Back to this month
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
