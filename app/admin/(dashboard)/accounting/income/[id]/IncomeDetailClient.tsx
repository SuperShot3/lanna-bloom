'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { IncomeRecord } from '@/types/accounting';
import { INCOME_SOURCE_TYPES, INCOME_PAYMENT_METHODS, MONEY_LOCATIONS, INCOME_STATUSES } from '@/types/accounting';
import { netAfterProcessingFee, processingFeeForIncome, STRIPE_FEE_PERCENT_LABEL } from '@/lib/accounting/stripeFee';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';

const SOURCE_TYPE_LABEL = Object.fromEntries(INCOME_SOURCE_TYPES.map((t) => [t.value, t.label]));
const PM_LABEL          = Object.fromEntries(INCOME_PAYMENT_METHODS.map((m) => [m.value, m.label]));
const LOC_LABEL         = Object.fromEntries(MONEY_LOCATIONS.map((l) => [l.value, l.label]));

function fmt(amount: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'confirmed' ? 'admin-badge-paid' : status === 'cancelled' ? 'admin-badge-payment-cancelled' : 'admin-badge-payment-pending';
  return <span className={`admin-badge ${cls}`}>{status}</span>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-expenses-detail-row">
      <dt className="admin-expenses-detail-label">{label}</dt>
      <dd className="admin-expenses-detail-value">{value}</dd>
    </div>
  );
}

export function IncomeDetailClient({ record }: { record: IncomeRecord }) {
  const router = useRouter();
  const [loadingProof, setLoadingProof] = useState(false);
  const [proofError, setProofError]     = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<string>(record.income_status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [locUpdate, setLocUpdate]       = useState<string>(record.money_location);
  const [savingLoc, setSavingLoc]       = useState(false);
  const [saveMsg, setSaveMsg]           = useState<string | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const handleViewProof = async () => {
    setLoadingProof(true);
    setProofError(null);
    try {
      const res = await fetch(`/api/admin/accounting/income/${record.id}/proof-url`);
      const data = await res.json();
      if (!res.ok) { setProofError(data.error ?? 'Failed to load proof'); return; }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setProofError('Unexpected error loading proof');
    } finally {
      setLoadingProof(false);
    }
  };

  const handleStatusSave = async () => {
    setSavingStatus(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/accounting/income/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ income_status: statusUpdate }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveMsg(data.error ?? 'Update failed'); }
      else { setSaveMsg('Status updated'); }
    } catch {
      setSaveMsg('Network error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleLocSave = async () => {
    setSavingLoc(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/accounting/income/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ money_location: locUpdate }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveMsg(data.error ?? 'Update failed'); }
      else { setSaveMsg('Money location updated'); }
    } catch {
      setSaveMsg('Network error');
    } finally {
      setSavingLoc(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteAction('Permanently delete this income record? This cannot be undone.')) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/accounting/income/${record.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? 'Delete failed');
        return;
      }
      router.push('/admin/accounting/income');
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const isAutoOrder = record.source_mode === 'auto_order';

  const processingFee =
    typeof record.processing_fee_amount === 'number'
      ? record.processing_fee_amount
      : processingFeeForIncome(record.amount, record.payment_method);
  const netAfterFees = netAfterProcessingFee(record.amount, processingFee);
  const isStripe = record.payment_method === 'stripe';

  return (
    <div className="admin-expenses-detail">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/accounting/income" className="admin-back-link">← Back to Income</Link>
          <h1 className="admin-title">Income Record</h1>
        </div>
      </header>

      {/* Hero */}
      <div className="admin-expenses-hero">
        <span className="admin-expenses-hero-amount">{fmt(record.amount)}</span>
        {isStripe && (
          <span className="admin-hint" style={{ display: 'block', marginTop: 4 }}>
            Gross amount (before {STRIPE_FEE_PERCENT_LABEL} Stripe fee)
          </span>
        )}
        <span className={`admin-badge ${isAutoOrder ? 'admin-badge-auto' : 'admin-badge-manual'}`}>
          {isAutoOrder ? 'Auto-generated' : 'Manual entry'}
        </span>
        <StatusBadge status={record.income_status} />
      </div>

      {/* Details */}
      <div className="admin-expenses-detail-grid">
        <Row label="Description"    value={record.description} />
        <Row label="Source Type"    value={SOURCE_TYPE_LABEL[record.source_type] ?? record.source_type} />
        <Row label="Payment Method" value={PM_LABEL[record.payment_method] ?? record.payment_method} />
        {isStripe && (
          <>
            <Row
              label={`Stripe fee (${STRIPE_FEE_PERCENT_LABEL})`}
              value={fmt(processingFee)}
            />
            <Row label="Net after Stripe fee" value={fmt(netAfterFees)} />
          </>
        )}
        <Row label="Money Location" value={LOC_LABEL[record.money_location] ?? record.money_location} />
        <Row label="Status"         value={<StatusBadge status={record.income_status} />} />
        {record.order_id && (
          <Row label="Order ID" value={
            <Link href={`/admin/orders/${record.order_id}`} className="admin-link">{record.order_id}</Link>
          } />
        )}
        {record.external_reference && <Row label="External Ref" value={record.external_reference} />}
        <Row label="Proof File" value={
          record.receipt_attached
            ? <span className="admin-badge admin-badge-paid">Attached</span>
            : <span className="admin-badge admin-badge-payment-pending">None</span>
        } />
        {record.notes && <Row label="Notes" value={record.notes} />}
        <Row label="Created by"  value={record.created_by} />
        <Row label="Created at"  value={fmtDateTime(record.created_at)} />
        <Row label="Updated at"  value={fmtDateTime(record.updated_at)} />
        {record.confirmed_at && <Row label="Confirmed at" value={fmtDateTime(record.confirmed_at)} />}
        <Row label="Record ID"   value={<code className="admin-expenses-id">{record.id}</code>} />
      </div>

      {/* Actions */}
      <div className="admin-accounting-detail-actions">
        {record.receipt_attached && record.proof_file_path && (
          <div>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleViewProof} disabled={loadingProof}>
              {loadingProof ? 'Loading…' : 'View Proof File'}
            </button>
            {proofError && <p className="admin-field-error">{proofError}</p>}
          </div>
        )}

        {/* Money location override (manual only) */}
        {!isAutoOrder && (
          <div className="admin-accounting-status-update">
            <label htmlFor="loc-select" className="admin-hint" style={{ fontWeight: 600 }}>
              Money Location
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                id="loc-select"
                className="admin-select"
                value={locUpdate}
                onChange={(e) => setLocUpdate(e.target.value)}
              >
                {MONEY_LOCATIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-btn-sm"
                onClick={handleLocSave}
                disabled={savingLoc || locUpdate === record.money_location}
              >
                {savingLoc ? 'Saving…' : 'Save'}
              </button>
            </div>
            {saveMsg && <p className="admin-hint" style={{ marginTop: 4 }}>{saveMsg}</p>}
          </div>
        )}

        {/* Status override (for manual records) */}
        {!isAutoOrder && (
          <div className="admin-accounting-status-update">
            <label htmlFor="status-select" className="admin-hint" style={{ fontWeight: 600 }}>Update Status</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                id="status-select"
                className="admin-select"
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value)}
              >
                {INCOME_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-btn-sm"
                onClick={handleStatusSave}
                disabled={savingStatus || statusUpdate === record.income_status}
              >
                {savingStatus ? 'Saving…' : 'Save'}
              </button>
            </div>
            {saveMsg && <p className="admin-hint" style={{ marginTop: 4 }}>{saveMsg}</p>}
          </div>
        )}

        {isAutoOrder && (
          <p className="admin-hint">
            This record was created automatically from an order payment. Status and amount are locked.
          </p>
        )}

        {/* Delete — available for all record types */}
        <div className="admin-accounting-delete-zone">
          <button
            type="button"
            className="admin-btn admin-btn-danger admin-btn-sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete record'}
          </button>
          {deleteError && <p className="admin-field-error" style={{ marginTop: 6 }}>{deleteError}</p>}
        </div>
      </div>
    </div>
  );
}
