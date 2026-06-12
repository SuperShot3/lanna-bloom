'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MONEY_LOCATIONS } from '@/types/accounting';
import type { AccountingSectionCounts } from './AccountingSectionSwitcher';
import { AccountingSectionSwitcher } from './AccountingSectionSwitcher';
import { prepareProofFileForUpload } from '@/lib/prepareProofFileForUpload';

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
  const withdrawalFileInputRef = useRef<HTMLInputElement>(null);

  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? '');
  const [dateTo, setDateTo] = useState(initialDateTo ?? '');
  const [transferOpen, setTransferOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
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
  const [withdrawalDate, setWithdrawalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalPurpose, setWithdrawalPurpose] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [withdrawalAttachment, setWithdrawalAttachment] = useState<File | null>(null);
  const [withdrawalSaving, setWithdrawalSaving] = useState(false);
  const [withdrawalMsg, setWithdrawalMsg] = useState<string | null>(null);

  useEffect(() => {
    setDateFrom(initialDateFrom ?? '');
    setDateTo(initialDateTo ?? '');
  }, [initialDateFrom, initialDateTo]);

  useEffect(() => {
    if (sp.get('action') !== 'withdrawal') return;
    setWithdrawalOpen(true);
    setTransferOpen(false);
    setWithdrawalMsg(null);
    const next = new URLSearchParams(sp.toString());
    next.delete('action');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [sp, pathname, router]);

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

  const renderPeriodControls = (className: string) => (
    <div className={className}>
      <div className="admin-accounting-period-dates" aria-label="Custom accounting period">
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
      </div>
      <div className="admin-accounting-period-quick" aria-label="Quick accounting period">
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
          <span className="admin-action-label-full">Year to date</span>
          <span className="admin-action-label-short">Year</span>
        </button>
        {!isAllTime ? (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={useAllTime}>
            All time
          </button>
        ) : (
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={useThisMonth}>
            <span className="admin-action-label-full">Back to this month</span>
            <span className="admin-action-label-short">This month</span>
          </button>
        )}
      </div>
    </div>
  );

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
            className="admin-btn admin-btn-outline admin-accounting-header-action admin-accounting-header-action-payout"
            onClick={() => {
              setTransferOpen((v) => !v);
              setWithdrawalOpen(false);
              setTransferMsg(null);
            }}
          >
            <span className="material-symbols-outlined" aria-hidden>
              swap_horiz
            </span>
            <span className="admin-action-label-full">Payout</span>
            <span className="admin-action-label-short">Payout</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-accounting-header-action admin-accounting-header-action-withdrawal"
            onClick={() => {
              setWithdrawalOpen((v) => !v);
              setTransferOpen(false);
              setWithdrawalMsg(null);
            }}
            aria-expanded={withdrawalOpen}
          >
            <span className="material-symbols-outlined" aria-hidden>
              savings
            </span>
            <span className="admin-action-label-full">Personal withdrawal</span>
            <span className="admin-action-label-short">Withdraw</span>
          </button>
          <Link
            href="/admin/accounting/income/new"
            className="admin-btn admin-btn-primary admin-accounting-header-action admin-accounting-header-action-income"
          >
            <span className="material-symbols-outlined" aria-hidden>
              add_card
            </span>
            <span className="admin-action-label-full">+ Manual Income</span>
            <span className="admin-action-label-short">Income</span>
          </Link>
          <Link
            href="/admin/expenses/new"
            className="admin-btn admin-btn-outline admin-accounting-header-action admin-accounting-header-action-expense"
          >
            <span className="material-symbols-outlined" aria-hidden>
              receipt_long
            </span>
            <span className="admin-action-label-full">+ Add Expense</span>
            <span className="admin-action-label-short">Expense</span>
          </Link>
          <AccountingSectionSwitcher
            counts={navCounts}
            mode="mobile"
            mobilePanelChildren={renderPeriodControls('admin-accounting-period-row admin-accounting-period-row-mobile-panel')}
          />
        </div>
      </header>

      {withdrawalOpen && (
        <div className="admin-accounting-section" style={{ marginTop: 12 }}>
          <h2 className="admin-accounting-section-title">Record personal withdrawal</h2>
          <p className="admin-hint">
            This reduces your bank balance but does not change revenue or business profit. Use this when money leaves the
            business for personal use.
          </p>
          <div className="admin-accounting-backfill-actions" style={{ flexWrap: 'wrap' }}>
            <input
              type="date"
              className="admin-input admin-input-date"
              value={withdrawalDate}
              onChange={(e) => setWithdrawalDate(e.target.value)}
              aria-label="When"
            />
            <input
              type="number"
              className="admin-input"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              placeholder="Amount (THB)"
              min="0"
              step="0.01"
              inputMode="decimal"
              aria-label="Amount"
              style={{ maxWidth: 160 }}
            />
            <input
              type="text"
              className="admin-input"
              value={withdrawalPurpose}
              onChange={(e) => setWithdrawalPurpose(e.target.value)}
              placeholder="Where did the money go?"
              aria-label="Where did the money go?"
              style={{ minWidth: 240 }}
              required
            />
            <input
              type="text"
              className="admin-input"
              value={withdrawalNotes}
              onChange={(e) => setWithdrawalNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              aria-label="Additional notes"
              style={{ minWidth: 220 }}
            />
            <input
              ref={withdrawalFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              className="admin-expenses-file-input"
              onChange={(e) => setWithdrawalAttachment(e.target.files?.[0] ?? null)}
              aria-label="Attach proof"
            />
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
              onClick={() => withdrawalFileInputRef.current?.click()}
            >
              {withdrawalAttachment ? withdrawalAttachment.name : 'Attach proof'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={withdrawalSaving}
              onClick={async () => {
                setWithdrawalSaving(true);
                setWithdrawalMsg(null);
                try {
                  const amt = parseFloat(withdrawalAmount);
                  let proofPath: string | null = null;

                  if (withdrawalAttachment) {
                    let fileToUpload: File;
                    try {
                      fileToUpload = await prepareProofFileForUpload(withdrawalAttachment);
                    } catch (e) {
                      setWithdrawalMsg(e instanceof Error ? e.message : 'Could not prepare proof');
                      return;
                    }
                    const fd = new FormData();
                    fd.append('file', fileToUpload);
                    const uploadRes = await fetch('/api/admin/accounting/upload-proof', {
                      method: 'POST',
                      body: fd,
                    });
                    const uploadData = await uploadRes.json().catch(() => ({}));
                    if (!uploadRes.ok) {
                      setWithdrawalMsg(uploadData.error ?? 'Proof upload failed');
                      return;
                    }
                    proofPath = uploadData.path ?? null;
                  }

                  const res = await fetch('/api/admin/accounting/withdrawals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      amount: amt,
                      withdrawal_date: withdrawalDate,
                      from_location: 'bank',
                      purpose: withdrawalPurpose,
                      notes: withdrawalNotes.trim() || null,
                      proof_file_path: proofPath,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setWithdrawalMsg(data.error ?? 'Withdrawal failed');
                  } else {
                    setWithdrawalMsg('Withdrawal saved');
                    setWithdrawalAmount('');
                    setWithdrawalPurpose('');
                    setWithdrawalNotes('');
                    setWithdrawalAttachment(null);
                    if (withdrawalFileInputRef.current) withdrawalFileInputRef.current.value = '';
                    router.refresh();
                  }
                } catch {
                  setWithdrawalMsg('Network error. Please try again.');
                } finally {
                  setWithdrawalSaving(false);
                }
              }}
            >
              {withdrawalSaving ? 'Saving…' : 'Record withdrawal'}
            </button>
          </div>
          {withdrawalMsg && (
            <p className="admin-hint" style={{ marginTop: 6 }}>
              {withdrawalMsg}
            </p>
          )}
        </div>
      )}

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
                    let fileToUpload: File;
                    try {
                      fileToUpload = await prepareProofFileForUpload(transferAttachment);
                    } catch (e) {
                      setTransferMsg(e instanceof Error ? e.message : 'Could not prepare attachment');
                      return;
                    }
                    const fd = new FormData();
                    fd.append('file', fileToUpload);
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

      <AccountingSectionSwitcher
        counts={navCounts}
        mode="desktop"
      />

      {renderPeriodControls('admin-accounting-period-row admin-accounting-period-row-main')}

      {children}
    </div>
  );
}
