'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { AccountingTransfer } from '@/types/accountingTransfers';

function formatAmount(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
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

const TRANSFER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  received: 'Received',
  reconciled: 'Reconciled',
};

function payoutsActionHref(sp: URLSearchParams, mode: 'transfer' | 'withdrawal'): string {
  const next = new URLSearchParams(sp.toString());
  next.set('action', 'payout');
  next.set('mode', mode);
  return `/admin/accounting/payouts-transfers?${next.toString()}`;
}

interface Props {
  transfersData: { transfers: AccountingTransfer[]; error?: string };
  periodLabel: string;
}

export function AccountingTransfersPanel({ transfersData, periodLabel }: Props) {
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();

  const exportTransfersCsv = () => {
    const headers = [
      'Transfer date',
      'From',
      'To',
      'Status',
      'Stripe ref',
      'Bank received',
      'Attachment',
      'Note',
      'Amount',
      'Currency',
      'Created by',
    ];
    const lines = [headers.join(',')];
    for (const t of transfersData.transfers) {
      lines.push(
        [
          escapeCsvCell(t.transfer_date.slice(0, 10)),
          escapeCsvCell(LOCATION_LABELS[t.from_location] ?? t.from_location),
          escapeCsvCell(LOCATION_LABELS[t.to_location] ?? t.to_location),
          escapeCsvCell(t.status),
          escapeCsvCell(t.external_reference ?? ''),
          escapeCsvCell(t.bank_received_date ?? ''),
          t.attachment_attached ? 'Yes' : 'No',
          escapeCsvCell(t.note ?? ''),
          String(t.amount),
          escapeCsvCell(t.currency || 'THB'),
          escapeCsvCell(t.created_by ?? ''),
        ].join(',')
      );
    }
    downloadCsvLines(`transfers-${periodSlug(periodLabel)}.csv`, lines);
  };

  const handleViewTransferAttachment = async (transferId: string) => {
    try {
      const res = await fetch(`/api/admin/accounting/transfers/${transferId}/attachment-url`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to load attachment');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      alert('Failed to load attachment');
    }
  };

  return (
    <div className="admin-expenses admin-accounting-payouts-transfers">
      <h2 className="admin-accounting-section-title">Stripe payouts / transfers</h2>
      <div className="admin-expenses-filters">
        <Link
          href={payoutsActionHref(sp, 'transfer')}
          className="admin-btn admin-btn-primary admin-btn-sm"
          scroll={false}
        >
          Record payout
        </Link>
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={exportTransfersCsv}
          disabled={transfersData.transfers.length === 0}
          title="Export visible transfers as CSV"
        >
          Export CSV
        </button>
      </div>
      <div className="admin-expenses-summary">
        <span className="admin-hint">
          {transfersData.transfers.length} transfer{transfersData.transfers.length !== 1 ? 's' : ''} found
        </span>
        <span className="admin-expenses-total">Stripe payouts are money movement only, not income.</span>
      </div>

      {transfersData.error ? (
        <div className="admin-error">
          <p>
            <strong>Error loading transfers</strong>
          </p>
          <p>{transfersData.error}</p>
        </div>
      ) : transfersData.transfers.length === 0 ? (
        <p className="admin-empty">
          No transfers found. Use{' '}
          <Link href={payoutsActionHref(sp, 'transfer')} className="admin-link" scroll={false}>
            Pay out
          </Link>{' '}
          to move money from Stripe Balance to Bank Account.
        </p>
      ) : (
        <div className="admin-expenses-table-wrap">
          <table className="admin-expenses-table">
            <thead>
              <tr>
                <th>Payout date</th>
                <th>Movement</th>
                <th>Status</th>
                <th>Stripe ref</th>
                <th>Bank received</th>
                <th>Attachment</th>
                <th className="admin-expenses-col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transfersData.transfers.map((transfer) => (
                <tr key={transfer.id} className="admin-expenses-row">
                  <td className="admin-expenses-date">{formatDate(transfer.transfer_date)}</td>
                  <td className="admin-expenses-desc">
                    <span className="admin-expenses-desc-text">
                      {LOCATION_LABELS[transfer.from_location] ?? transfer.from_location} →{' '}
                      {LOCATION_LABELS[transfer.to_location] ?? transfer.to_location}
                    </span>
                    {transfer.note && <span className="admin-expenses-notes">{transfer.note}</span>}
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        transfer.status === 'pending' ? 'admin-badge-payment-pending' : 'admin-badge-paid'
                      }`}
                    >
                      {TRANSFER_STATUS_LABEL[transfer.status] ?? transfer.status}
                    </span>
                  </td>
                  <td className="admin-ledger-mono">{transfer.external_reference ?? '—'}</td>
                  <td className="admin-expenses-date">{transfer.bank_received_date ? formatDate(transfer.bank_received_date) : '—'}</td>
                  <td>
                    {transfer.attachment_attached && transfer.attachment_file_path ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={() => handleViewTransferAttachment(transfer.id)}
                      >
                        View
                      </button>
                    ) : (
                      <span className="admin-badge admin-badge-payment-pending">None</span>
                    )}
                  </td>
                  <td className="admin-expenses-amount">{formatAmount(transfer.amount, transfer.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
