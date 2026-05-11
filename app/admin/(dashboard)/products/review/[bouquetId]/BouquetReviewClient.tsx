'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ProductGallery } from '@/components/ProductGallery';
import type { Bouquet, BouquetStatus } from '@/lib/bouquets';
import { approveBouquetAction, rejectBouquetAction } from '@/app/admin/(dashboard)/moderation/products/actions';

const STATUS_LABELS: Record<BouquetStatus, string> = {
  pending_review: 'Pending review',
  approved: 'Live',
  rejected: 'Rejected',
};

type BouquetReviewClientProps = {
  bouquet: Bouquet;
};

export function BouquetReviewClient({ bouquet }: BouquetReviewClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<BouquetStatus>(bouquet.status ?? 'pending_review');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const price = bouquet.sizes[0]?.price ?? 0;
  const catalogHref = `/en/catalog/${bouquet.slug}`;

  async function handleApprove() {
    setError('');
    setSuccess('');
    setLoading('approve');
    const result = await approveBouquetAction(bouquet.id);
    setLoading(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStatus('approved');
    setSuccess('Approved and made live in the catalog.');
    router.refresh();
  }

  async function handleReject() {
    setError('');
    setSuccess('');
    setLoading('reject');
    const result = await rejectBouquetAction(bouquet.id);
    setLoading(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStatus('rejected');
    setSuccess('Rejected. This bouquet remains hidden from the public catalog.');
    router.refresh();
  }

  return (
    <div className="admin-product-detail-content">
      {error ? <div className="admin-product-detail-error">{error}</div> : null}
      {success ? <div className="admin-product-detail-success">{success}</div> : null}

      <div className="admin-product-detail-layout">
        <div className="admin-product-detail-gallery">
          <ProductGallery
            images={bouquet.images}
            imageAlts={bouquet.imageAlts}
            name={bouquet.nameEn}
            productId={bouquet.id}
          />
        </div>

        <div className="admin-product-detail-right">
          <div className="admin-product-detail-action-card-wrapper">
            <div className="admin-product-detail-action-card">
              <h3 className="admin-product-detail-action-card-title">Review actions</h3>
              <p className="admin-hint">
                Only owner/admin roles can approve this bouquet. Approval changes its Sanity status to approved and makes it
                available to catalog queries.
              </p>
              <div className="admin-product-detail-action-buttons">
                {status !== 'approved' ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-moderation-btn-loading admin-product-detail-btn-full"
                    disabled={!!loading}
                    onClick={handleApprove}
                  >
                    {loading === 'approve' ? (
                      <>
                        <span className="admin-moderation-spinner" aria-hidden />
                        Publishing...
                      </>
                    ) : (
                      'Approve and make live'
                    )}
                  </button>
                ) : (
                  <Link className="admin-btn admin-btn-primary admin-product-detail-btn-full" href={catalogHref} target="_blank">
                    View live catalog page
                  </Link>
                )}

                {status !== 'rejected' ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-moderation-btn-loading admin-product-detail-btn-full"
                    disabled={!!loading}
                    onClick={handleReject}
                  >
                    {loading === 'reject' ? (
                      <>
                        <span className="admin-moderation-spinner" aria-hidden />
                        Saving...
                      </>
                    ) : (
                      'Reject'
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="admin-product-detail-info">
            <div className="admin-product-detail-meta">
              <span className={`admin-product-detail-status status-${status}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
              {bouquet.featuredPopular ? <span className="admin-product-detail-category">Popular</span> : null}
            </div>

            <h2 className="admin-product-detail-title">{bouquet.nameEn}</h2>
            {bouquet.nameTh ? <p className="admin-product-detail-subtitle">{bouquet.nameTh}</p> : null}
            <div className="admin-product-detail-price">฿{price.toLocaleString()}</div>

            <div className="admin-product-detail-section">
              <h3>Description</h3>
              <p>{bouquet.descriptionEn || 'No English description.'}</p>
              {bouquet.descriptionTh ? <p>{bouquet.descriptionTh}</p> : null}
            </div>

            <div className="admin-product-detail-section">
              <h3>Composition</h3>
              <p>{bouquet.compositionEn || 'No English composition.'}</p>
              {bouquet.compositionTh ? <p>{bouquet.compositionTh}</p> : null}
            </div>

            <div className="admin-product-detail-section">
              <h3>Catalog tags</h3>
              <ul className="admin-product-detail-attrs">
                {bouquet.presentationFormats?.length ? <li>Formats: {bouquet.presentationFormats.join(', ')}</li> : null}
                {bouquet.flowerTypes?.length ? <li>Flowers: {bouquet.flowerTypes.join(', ')}</li> : null}
                {bouquet.colors?.length ? <li>Colors: {bouquet.colors.join(', ')}</li> : null}
                {bouquet.occasion?.length ? <li>Occasions: {bouquet.occasion.join(', ')}</li> : null}
                {bouquet.deliveryOptions?.length ? <li>Delivery: {bouquet.deliveryOptions.join(', ')}</li> : null}
              </ul>
            </div>

            <div className="admin-product-detail-section">
              <h3>Sanity details</h3>
              <ul className="admin-product-detail-attrs">
                <li>ID: {bouquet.id}</li>
                <li>Slug: {bouquet.slug}</li>
                <li>Status: {STATUS_LABELS[status] ?? status}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
