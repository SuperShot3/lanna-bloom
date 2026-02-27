'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductGallery } from '@/components/ProductGallery';
import {
  approveProductAction,
  rejectProductAction,
  needsChangesProductAction,
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
  const [needsChangesNote, setNeedsChangesNote] = useState('');
  const [showNeedsChanges, setShowNeedsChanges] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canApprove =
    (product.moderationStatus === 'submitted' || product.moderationStatus === 'needs_changes' || product.moderationStatus === 'rejected') &&
    commissionPercent.trim() !== '' &&
    !Number.isNaN(Number(commissionPercent)) &&
    Number(commissionPercent) >= 0 &&
    Number(commissionPercent) <= 100;

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

  const descEn = product.descriptionEn?.trim() || '—';
  const descTh = product.descriptionTh?.trim() || '—';

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

          <div className="admin-product-detail-section">
            <h3>Description (EN)</h3>
            <p className="admin-product-detail-desc">{descEn}</p>
          </div>
          <div className="admin-product-detail-section">
            <h3>Description (TH)</h3>
            <p className="admin-product-detail-desc">{descTh}</p>
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

          <div className="admin-product-detail-actions">
            {(product.moderationStatus === 'submitted' ||
              product.moderationStatus === 'needs_changes' ||
              product.moderationStatus === 'rejected') && (
              <>
                <div className="admin-product-detail-commission">
                  <label htmlFor="commission">Commission (%) *</label>
                  <input
                    id="commission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder="0–100"
                    className="admin-v2-input"
                  />
                  <span className="admin-product-detail-commission-hint">
                    Required before approving. Platform commission per sale.
                  </span>
                </div>
                <button
                  type="button"
                  className="admin-v2-btn admin-v2-btn-primary admin-moderation-btn-loading"
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
              </>
            )}

            {(product.moderationStatus === 'submitted' ||
              product.moderationStatus === 'live' ||
              product.moderationStatus === 'rejected') && (
              <button
                type="button"
                className="admin-v2-btn admin-v2-btn-outline"
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
                className="admin-v2-btn admin-v2-btn-outline admin-moderation-btn-loading"
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
          </div>

          {showNeedsChanges && (
            <div className="admin-product-detail-needs-changes">
              <input
                type="text"
                placeholder="Note for partner (required)"
                value={needsChangesNote}
                onChange={(e) => setNeedsChangesNote(e.target.value)}
                className="admin-v2-input"
              />
              <button
                type="button"
                className="admin-v2-btn admin-v2-btn-primary admin-v2-btn-sm admin-moderation-btn-loading"
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

          {product.moderationStatus === 'live' && product.commissionPercent != null && (
            <p className="admin-product-detail-commission-set">
              Commission: {product.commissionPercent}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
