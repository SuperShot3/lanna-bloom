'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductGallery } from '@/components/ProductGallery';
import {
  approveProductAction,
  rejectProductAction,
  needsChangesProductAction,
  updateProductByAdminAction,
  deleteProductAction,
  updateCommissionAction,
} from '../actions';
import type { AdminProductDetail } from '@/lib/sanity';

const CATEGORY_LABELS: Record<string, string> = {
  balloons: 'Balloons',
  gifts: 'Gifts',
  money_flowers: 'Money Flowers',
  handmade_floral: 'Handmade Floral',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Pending',
  live: 'Live',
  needs_changes: 'Needs changes',
  rejected: 'Rejected',
};

type AdminProductDetailClientProps = { product: AdminProductDetail };

export function AdminProductDetailClient({ product }: AdminProductDetailClientProps) {
  const [commissionPercent, setCommissionPercent] = useState<string>(
    product.commissionPercent != null ? String(product.commissionPercent) : ''
  );
  const [adminNameEn, setAdminNameEn] = useState(product.adminOverrides?.nameEn ?? product.nameEn);
  const [adminNameTh, setAdminNameTh] = useState(product.adminOverrides?.nameTh ?? product.nameTh ?? '');
  const [adminDescEn, setAdminDescEn] = useState(product.adminOverrides?.descriptionEn ?? product.descriptionEn ?? '');
  const [adminDescTh, setAdminDescTh] = useState(product.adminOverrides?.descriptionTh ?? product.descriptionTh ?? '');
  const [adminChangeSummary, setAdminChangeSummary] = useState(product.adminChangeSummary ?? '');
  const [needsChangesNote, setNeedsChangesNote] = useState('');
  const [showNeedsChanges, setShowNeedsChanges] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canApprove =
    (product.moderationStatus === 'submitted' || product.moderationStatus === 'needs_changes' || product.moderationStatus === 'rejected') &&
    commissionPercent.trim() !== '' &&
    !Number.isNaN(Number(commissionPercent)) &&
    Number(commissionPercent) >= 0 &&
    Number(commissionPercent) <= 500;

  async function handleApprove() {
    if (!canApprove) return;
    setError(null);
    setLoading('approve');
    const result = await approveProductAction(product.id, Number(commissionPercent));
    setLoading(null);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  async function handleReject() {
    setError(null);
    setLoading('reject');
    const result = await rejectProductAction(product.id);
    setLoading(null);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  async function handleNeedsChanges() {
    if (!needsChangesNote.trim()) {
      setError('Please enter a note for the partner');
      return;
    }
    setError(null);
    setLoading('needsChanges');
    const result = await needsChangesProductAction(product.id, needsChangesNote);
    setLoading(null);
    if (result.error) {
      setError(result.error);
    } else {
      setShowNeedsChanges(false);
      setNeedsChangesNote('');
      window.location.reload();
    }
  }

  async function handleSaveAdminEdits() {
    setError(null);
    setLoading('saveAdminEdits');
    const formData = new FormData();
    formData.set('productId', product.id);
    formData.set('nameEn', adminNameEn);
    formData.set('nameTh', adminNameTh);
    formData.set('descriptionEn', adminDescEn);
    formData.set('descriptionTh', adminDescTh);
    formData.set('adminChangeSummary', adminChangeSummary);
    const result = await updateProductByAdminAction(formData);
    setLoading(null);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditCommission, setShowEditCommission] = useState(false);
  const [editCommissionValue, setEditCommissionValue] = useState<string>(
    product.commissionPercent != null ? String(product.commissionPercent) : ''
  );
  const router = useRouter();

  async function handleUpdateCommission() {
    const pct = Number(editCommissionValue);
    if (Number.isNaN(pct) || pct < 0 || pct > 500) {
      setError('Commission must be 0–500%');
      return;
    }
    setError(null);
    setLoading('updateCommission');
    const result = await updateCommissionAction(product.id, pct);
    setLoading(null);
    if (result.error) {
      setError(result.error);
    } else {
      setShowEditCommission(false);
      window.location.reload();
    }
  }

  async function handleDelete() {
    setError(null);
    setLoading('delete');
    const result = await deleteProductAction(product.id);
    setLoading(null);
    setShowDeleteConfirm(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push('/admin/moderation/products');
      router.refresh();
    }
  }

  const descEn = product.descriptionEn?.trim() || '—';
  const descTh = product.descriptionTh?.trim() || '—';

  const actionCard = (
    <div className="admin-product-detail-action-card">
      <h3 className="admin-product-detail-action-card-title">Actions</h3>
      {(product.moderationStatus === 'submitted' ||
        product.moderationStatus === 'needs_changes' ||
        product.moderationStatus === 'rejected') && (
        <div className="admin-product-detail-commission">
          <label htmlFor="commission">Commission (%) *</label>
          <input
            id="commission"
            type="number"
            min={0}
            max={500}
            step={0.5}
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            placeholder="0–500"
            className="admin-input"
          />
          <span className="admin-product-detail-commission-hint">
            Required before approving. Platform commission per sale.
          </span>
        </div>
      )}
      <div className="admin-product-detail-action-buttons">
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-moderation-btn-loading admin-product-detail-btn-full"
          disabled={!!loading}
          onClick={handleSaveAdminEdits}
        >
          {loading === 'saveAdminEdits' ? (
            <>
              <span className="admin-moderation-spinner" aria-hidden />
              Saving…
            </>
          ) : (
            'Save admin edits'
          )}
        </button>

        {(product.moderationStatus === 'submitted' ||
          product.moderationStatus === 'needs_changes' ||
          product.moderationStatus === 'rejected') && (
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-moderation-btn-loading admin-product-detail-btn-full"
            disabled={!canApprove || !!loading}
            onClick={handleApprove}
          >
            {loading === 'approve' ? (
              <>
                <span className="admin-moderation-spinner" aria-hidden />
                Saving…
              </>
            ) : (
              'Approve & deploy'
            )}
          </button>
        )}

        {(product.moderationStatus === 'submitted' ||
          product.moderationStatus === 'live' ||
          product.moderationStatus === 'rejected') && (
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-product-detail-btn-full"
            disabled={!!loading}
            onClick={() => setShowNeedsChanges(!showNeedsChanges)}
          >
            Needs changes
          </button>
        )}

        {(product.moderationStatus === 'submitted' ||
          product.moderationStatus === 'live' ||
          product.moderationStatus === 'needs_changes') && (
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-moderation-btn-loading admin-product-detail-btn-full"
            disabled={!!loading}
            onClick={handleReject}
          >
            {loading === 'reject' ? (
              <>
                <span className="admin-moderation-spinner" aria-hidden />
                Saving…
              </>
            ) : (
              'Reject'
            )}
          </button>
        )}

        <button
          type="button"
          className="admin-btn admin-btn-danger admin-product-detail-btn-full"
          disabled={!!loading}
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete product
        </button>
      </div>

      {showNeedsChanges && (
        <div className="admin-product-detail-needs-changes">
          <input
            type="text"
            placeholder="Note for partner (required)"
            value={needsChangesNote}
            onChange={(e) => setNeedsChangesNote(e.target.value)}
            className="admin-input"
          />
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-btn-sm admin-moderation-btn-loading"
            disabled={!!loading || !needsChangesNote.trim()}
            onClick={handleNeedsChanges}
          >
            {loading === 'needsChanges' ? (
              <>
                <span className="admin-moderation-spinner" aria-hidden />
                Sending…
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      )}

      {product.moderationStatus === 'live' && (
        <div className="admin-product-detail-commission-edit">
          {showEditCommission ? (
            <div className="admin-product-detail-commission">
              <label htmlFor="edit-commission">Commission (%)</label>
              <input
                id="edit-commission"
                type="number"
                min={0}
                max={500}
                step={0.5}
                value={editCommissionValue}
                onChange={(e) => setEditCommissionValue(e.target.value)}
                placeholder="0–500"
                className="admin-input"
              />
              <div className="admin-product-detail-commission-edit-btns">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary admin-btn-sm admin-moderation-btn-loading"
                  disabled={!!loading || editCommissionValue.trim() === ''}
                  onClick={handleUpdateCommission}
                >
                  {loading === 'updateCommission' ? (
                    <>
                      <span className="admin-moderation-spinner" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-outline admin-btn-sm"
                  disabled={!!loading}
                  onClick={() => {
                    setShowEditCommission(false);
                    setEditCommissionValue(product.commissionPercent != null ? String(product.commissionPercent) : '');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="admin-product-detail-commission-set">
              Commission: {product.commissionPercent != null ? `${product.commissionPercent}%` : '—'}
              <button
                type="button"
                className="admin-product-detail-commission-edit-btn"
                onClick={() => setShowEditCommission(true)}
              >
                Edit
              </button>
            </p>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="admin-product-detail-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="admin-product-detail-delete-modal-backdrop" onClick={() => setShowDeleteConfirm(false)} />
          <div className="admin-product-detail-delete-modal-content">
            <h3 id="delete-modal-title">Delete product</h3>
            <p>Are you sure you want to delete this product? This cannot be undone.</p>
            <div className="admin-product-detail-delete-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger admin-moderation-btn-loading"
                disabled={!!loading}
                onClick={handleDelete}
              >
                {loading === 'delete' ? (
                  <>
                    <span className="admin-moderation-spinner" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-product-detail-content">
      {error && (
        <div className="admin-product-detail-error">
          {error}
        </div>
      )}

      <div className="admin-product-detail-layout">
        <div className="admin-product-detail-gallery">
          <ProductGallery
            images={product.images}
            name={product.nameEn}
            productId={product.id}
          />
        </div>

        <div className="admin-product-detail-right">
          <div className="admin-product-detail-action-card-wrapper">
            {actionCard}
          </div>

          <div className="admin-product-detail-info">
            <div className="admin-product-detail-meta">
              <span className={`admin-product-detail-status status-${product.moderationStatus}`}>
                {STATUS_LABELS[product.moderationStatus] ?? product.moderationStatus}
              </span>
              <span className="admin-product-detail-category">
                {CATEGORY_LABELS[product.category] ?? product.category}
              </span>
            </div>

            <h2 className="admin-product-detail-title">{product.nameEn}</h2>
            {product.nameTh && (
              <p className="admin-product-detail-subtitle">{product.nameTh}</p>
            )}

            <div className="admin-product-detail-price">฿{product.price.toLocaleString()}</div>

            <div className="admin-product-detail-section admin-product-detail-admin-form">
              <div className="admin-product-detail-admin-form-header">
                <h3>Admin content adjustments</h3>
                {(product.adminLastEditedAt || product.adminLastEditedBy) && (
                  <p className="admin-product-detail-commission-hint">
                    Last edited{product.adminLastEditedBy ? ` by ${product.adminLastEditedBy}` : ''}{' '}
                    {product.adminLastEditedAt ? `(${new Date(product.adminLastEditedAt).toLocaleString()})` : ''}
                  </p>
                )}
              </div>

              <div className="admin-product-detail-admin-grid">
                <div className="admin-product-detail-admin-field">
                  <label className="admin-label" htmlFor="admin-name-en">Name (EN)</label>
                  <input
                    id="admin-name-en"
                    type="text"
                    className="admin-input"
                    value={adminNameEn}
                    onChange={(e) => setAdminNameEn(e.target.value)}
                    placeholder={product.nameEn}
                  />
                  <p className="admin-product-detail-admin-helper">
                    Original: <span className="admin-product-detail-admin-original">{product.nameEn}</span>
                  </p>
                </div>

                <div className="admin-product-detail-admin-field">
                  <label className="admin-label" htmlFor="admin-name-th">Name (TH)</label>
                  <input
                    id="admin-name-th"
                    type="text"
                    className="admin-input"
                    value={adminNameTh}
                    onChange={(e) => setAdminNameTh(e.target.value)}
                    placeholder={product.nameTh || 'Thai product name (optional)'}
                  />
                  {product.nameTh && (
                    <p className="admin-product-detail-admin-helper">
                      Original: <span className="admin-product-detail-admin-original">{product.nameTh}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="admin-product-detail-admin-grid">
                <div className="admin-product-detail-admin-field admin-product-detail-admin-field-full">
                  <label className="admin-label" htmlFor="admin-desc-en">Description (EN)</label>
                  <textarea
                    id="admin-desc-en"
                    className="admin-input"
                    value={adminDescEn}
                    onChange={(e) => setAdminDescEn(e.target.value)}
                    placeholder={descEn}
                    rows={4}
                  />
                  {descEn && (
                    <p className="admin-product-detail-admin-helper">
                      Original: <span className="admin-product-detail-admin-original">{descEn}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="admin-product-detail-admin-grid">
                <div className="admin-product-detail-admin-field admin-product-detail-admin-field-full">
                  <label className="admin-label" htmlFor="admin-desc-th">Description (TH)</label>
                  <textarea
                    id="admin-desc-th"
                    className="admin-input"
                    value={adminDescTh}
                    onChange={(e) => setAdminDescTh(e.target.value)}
                    placeholder={descTh}
                    rows={4}
                  />
                  {descTh && (
                    <p className="admin-product-detail-admin-helper">
                      Original: <span className="admin-product-detail-admin-original">{descTh}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="admin-product-detail-admin-grid">
                <div className="admin-product-detail-admin-field admin-product-detail-admin-field-full">
                  <label className="admin-label" htmlFor="admin-change-summary">Summary for partner</label>
                  <textarea
                    id="admin-change-summary"
                    className="admin-input"
                    value={adminChangeSummary}
                    onChange={(e) => setAdminChangeSummary(e.target.value)}
                    placeholder="Explain what was changed and why (shown to partner)"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {(product.preparationTime != null || product.occasion) && (
              <div className="admin-product-detail-section">
                <h3>Attributes</h3>
                <ul className="admin-product-detail-attrs">
                  {product.preparationTime != null && (
                    <li>Prep time: ~{product.preparationTime} min</li>
                  )}
                  {product.occasion && <li>Occasion: {product.occasion}</li>}
                </ul>
              </div>
            )}

            {product.customAttributes.length > 0 && (
              <div className="admin-product-detail-section">
                <h3>Custom attributes</h3>
                <ul className="admin-product-detail-attrs">
                  {product.customAttributes.map((a, i) => (
                    <li key={i}>
                      <strong>{a.key}:</strong> {a.value}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.slug && product.moderationStatus === 'live' && (
              <Link
                href={`/en/catalog/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-product-detail-catalog-link"
              >
                View in catalog →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
