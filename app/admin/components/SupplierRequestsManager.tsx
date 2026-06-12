'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupplierOrderRequestRow } from '@/lib/supabase/adminQueries';
import {
  SUPPLIER_SHOPS,
  supplierResponseLabelEnglish,
  supplierStatusLabelEnglish,
} from '@/lib/supplierRequests';

interface SupplierRequestsManagerProps {
  orderId: string;
  initialRequests: SupplierOrderRequestRow[];
  canManage: boolean;
  supplierBaseUrl: string;
}

function isApprovatable(status: string): boolean {
  return status === 'ACCEPTED' || status === 'ACCEPTED_WITH_CHANGES';
}

function canDisable(status: string): boolean {
  return status !== 'DISABLED' && status !== 'APPROVED' && status !== 'EXPIRED';
}

function formatAmount(value: number | null | undefined): string {
  if (value == null) return 'No price yet';
  return `฿${Number(value).toLocaleString()}`;
}

export function SupplierRequestsManager({
  orderId,
  initialRequests,
  canManage,
  supplierBaseUrl,
}: SupplierRequestsManagerProps) {
  const router = useRouter();
  const [shopId, setShopId] = useState<string>(SUPPLIER_SHOPS[0]?.id ?? '');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeRequest = useMemo(
    () =>
      initialRequests.find((request) =>
        ['LINK_CREATED', 'LINK_SENT', 'LINK_OPENED', 'WAITING_RESPONSE'].includes(request.status)
      ),
    [initialRequests]
  );
  const buildRequestUrl = (token: string) =>
    `${supplierBaseUrl.replace(/\/+$/, '')}/task/${encodeURIComponent(token)}`;

  async function createRequest() {
    if (!canManage || busyKey) return;
    setBusyKey('create');
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/supplier-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to create supplier link' });
        return;
      }
      setMessage({ type: 'success', text: 'Supplier link created' });
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setBusyKey(null);
    }
  }

  async function copyLink(request: SupplierOrderRequestRow) {
    const key = `copy:${request.id}`;
    if (busyKey) return;
    setBusyKey(key);
    setMessage(null);
    const url = buildRequestUrl(request.public_token);
    try {
      await navigator.clipboard.writeText(url);
      await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/supplier-requests/${encodeURIComponent(
          request.id
        )}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'LINK_COPIED' }),
        }
      );
      setMessage({ type: 'success', text: 'Link copied' });
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to copy link' });
    } finally {
      setBusyKey(null);
    }
  }

  async function patchAction(requestId: string, action: 'disable' | 'approve') {
    if (!canManage || busyKey) return;
    const key = `${action}:${requestId}`;
    setBusyKey(key);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/supplier-requests/${encodeURIComponent(
          requestId
        )}/${action}`,
        { method: 'PATCH' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save supplier request' });
        return;
      }
      setMessage({
        type: 'success',
        text: action === 'approve' ? 'Supplier approved' : 'Link disabled',
      });
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="admin-section admin-supplier-manager">
      <div className="admin-summary-card-header">
        <div>
          <h2 className="admin-section-title">Create Supplier Request</h2>
          <p className="admin-hint">Supplier links use the neutral task domain and no Lanna Bloom branding.</p>
        </div>
      </div>

      {canManage ? (
        <div className="admin-supplier-generate-row">
          <label>
            Shop
            <select
              className="admin-select"
              value={shopId}
              disabled={Boolean(activeRequest) || busyKey === 'create'}
              onChange={(event) => setShopId(event.target.value)}
            >
              {SUPPLIER_SHOPS.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={createRequest}
            disabled={Boolean(activeRequest) || busyKey === 'create'}
          >
            {busyKey === 'create' ? 'Creating…' : 'Create link'}
          </button>
          {activeRequest && (
            <p className="admin-hint">An active request already exists. Disable it before creating a new link.</p>
          )}
        </div>
      ) : (
        <p className="admin-muted">This account cannot manage supplier requests.</p>
      )}

      {message && (
        <p className={message.type === 'success' ? 'admin-costs-success' : 'admin-costs-error'}>
          {message.text}
        </p>
      )}

      <h3 className="admin-section-title admin-supplier-subtitle">All Requests</h3>
      {initialRequests.length === 0 ? (
        <p className="admin-empty">No supplier requests yet.</p>
      ) : (
        <div className="admin-supplier-request-list">
          {initialRequests.map((request) => {
            const url = buildRequestUrl(request.public_token);
            return (
              <article key={request.id} className="admin-supplier-request-card">
                <div>
                  <div className="admin-supplier-request-heading">
                    <strong>{request.shop_name_snapshot}</strong>
                    <span className="admin-badge">{supplierStatusLabelEnglish(request.status)}</span>
                  </div>
                  <p className="admin-muted">
                    Response: {supplierResponseLabelEnglish(request.supplier_response_type)} · Price:{' '}
                    {formatAmount(request.supplier_price)}
                    {request.supplier_ready_time ? ` · Ready ${request.supplier_ready_time}` : ''}
                  </p>
                  {request.supplier_reason && (
                    <p className="admin-muted">Reason/conditions: {request.supplier_reason}</p>
                  )}
                  {request.supplier_notes && <p className="admin-muted">Notes: {request.supplier_notes}</p>}
                  <p className="admin-supplier-link-preview">{url}</p>
                </div>
                <div className="admin-supplier-card-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    onClick={() => copyLink(request)}
                    disabled={busyKey === `copy:${request.id}`}
                  >
                    {busyKey === `copy:${request.id}` ? 'Copying…' : 'Copy link'}
                  </button>
                  <Link href={url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-sm admin-btn-outline">
                    Preview
                  </Link>
                  {canManage && canDisable(request.status) && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      onClick={() => patchAction(request.id, 'disable')}
                      disabled={busyKey === `disable:${request.id}`}
                    >
                      {busyKey === `disable:${request.id}` ? 'Disabling…' : 'Disable link'}
                    </button>
                  )}
                  {canManage && isApprovatable(request.status) && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-primary"
                      onClick={() => patchAction(request.id, 'approve')}
                      disabled={busyKey === `approve:${request.id}`}
                    >
                      {busyKey === `approve:${request.id}` ? 'Approving…' : 'Approve supplier'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
