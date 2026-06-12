'use client';

import Link from 'next/link';
import { useState } from 'react';
import { confirmCatalogDeleteAction } from '@/app/admin/components/confirmDelete';
import {
  approveBouquetAction,
  deleteBouquetAction,
  deleteProductAction,
  needsChangesProductAction,
} from './actions';
import type { Bouquet } from '@/lib/bouquets';
import type { ModerationProduct } from '@/lib/catalog/types';

type AdminProduct = ModerationProduct & { slug?: string };

type ProductModerationClientProps = {
  initialBouquets: Bouquet[];
  /** Full bouquet list for Catalog tab (imported Sanity items are usually approved). */
  catalogBouquets?: Bouquet[];
  initialProducts: ModerationProduct[];
  allProducts: AdminProduct[];
  initialProductFilter?: 'pending' | 'all';
  section?: 'catalog' | 'moderation';
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Pending',
  live: 'Live',
  needs_changes: 'Needs changes',
  rejected: 'Rejected',
};

const BOUQUET_STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending',
  approved: 'Live',
  rejected: 'Rejected',
};

export function ProductModerationClient({
  initialBouquets,
  catalogBouquets,
  initialProducts,
  allProducts,
  initialProductFilter = 'pending',
  section = 'moderation',
}: ProductModerationClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [needsChangesId, setNeedsChangesId] = useState<string | null>(null);
  const [needsChangesNote, setNeedsChangesNote] = useState('');
  const [productFilter, setProductFilter] = useState<'pending' | 'all'>(initialProductFilter);

  const displayedProducts: AdminProduct[] =
    productFilter === 'pending'
      ? initialProducts.map((p) => ({ ...p, slug: allProducts.find((a) => a.id === p.id)?.slug }))
      : allProducts;

  const displayedBouquets =
    section === 'catalog' ? (catalogBouquets ?? initialBouquets) : initialBouquets;

  async function handleApproveBouquet(id: string) {
    setLoading(`approve-bouquet-${id}`);
    const result = await approveBouquetAction(id);
    setLoading(null);
    if (result.error) alert(result.error);
    else window.location.reload();
  }

  async function handleDeleteBouquet(id: string, name: string) {
    if (!confirmCatalogDeleteAction(name)) return;
    setLoading(`delete-bouquet-${id}`);
    const result = await deleteBouquetAction(id);
    setLoading(null);
    if (result.error) alert(result.error);
    else window.location.reload();
  }

  async function handleDeleteProduct(id: string, name: string) {
    if (!confirmCatalogDeleteAction(name)) return;
    setLoading(`delete-product-${id}`);
    const result = await deleteProductAction(id);
    setLoading(null);
    if (result.error) alert(result.error);
    else window.location.reload();
  }

  async function handleNeedsChanges(id: string) {
    if (!needsChangesNote.trim()) {
      alert('Please enter a note for the partner');
      return;
    }
    setLoading(`needs-changes-${id}`);
    const result = await needsChangesProductAction(id, needsChangesNote);
    setLoading(null);
    if (result.error) alert(result.error);
    else {
      setNeedsChangesId(null);
      setNeedsChangesNote('');
      window.location.reload();
    }
  }

  const total = initialBouquets.length + initialProducts.length;
  const sectionTitle = section === 'catalog' ? 'Catalog' : 'Moderation queue';
  const sectionHint =
    section === 'catalog'
      ? `${displayedBouquets.length} bouquet${displayedBouquets.length !== 1 ? 's' : ''}, ${allProducts.length} other product${allProducts.length !== 1 ? 's' : ''}`
      : productFilter === 'pending'
        ? `${total} item${total !== 1 ? 's' : ''} pending review`
        : `${allProducts.length} total partner products`;

  return (
    <div className="admin-orders">
      <header className="admin-header admin-products-section-header">
        <div>
          <h2 className="admin-accounting-section-title">{sectionTitle}</h2>
          <p className="admin-hint">{sectionHint}</p>
        </div>
      </header>

      {displayedBouquets.length > 0 && (
        <section className="admin-moderation-section">
          <h2 className="admin-moderation-section-title">Bouquets (flowers)</h2>
          <div className="admin-moderation-grid">
            {displayedBouquets.map((b) => (
              <div key={b.id} className="admin-moderation-card">
                <div className="admin-moderation-card-image">
                  {b.images?.[0] ? (
                    <img src={b.images[0]} alt="" width={120} height={120} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  ) : (
                    <div className="admin-moderation-placeholder">🌸</div>
                  )}
                </div>
                <div className="admin-moderation-card-info">
                  <strong>{b.nameEn}</strong>
                  <p className="admin-moderation-card-meta">
                    ฿{b.sizes?.[0]?.price ?? 0}+
                    {section === 'catalog' && b.status && (
                      <span className={`admin-moderation-status-badge status-${b.status}`}>
                        {BOUQUET_STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    )}
                  </p>
                  {section === 'catalog' && b.slug && (
                    <Link
                      href={`/en/catalog/${b.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-moderation-catalog-link"
                    >
                      View in catalog →
                    </Link>
                  )}
                </div>
                <div className="admin-moderation-card-actions">
                  <Link
                    href={`/admin/products/review/${b.id}`}
                    className="admin-btn admin-btn-primary admin-btn-sm"
                  >
                    {section === 'catalog' ? 'Edit' : 'Review'}
                  </Link>
                  {section === 'moderation' && (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm admin-moderation-btn-loading"
                        disabled={!!loading}
                        onClick={() => handleApproveBouquet(b.id)}
                      >
                        {loading === `approve-bouquet-${b.id}` ? (
                          <>
                            <span className="admin-moderation-spinner" aria-hidden />
                            Saving…
                          </>
                        ) : (
                          'Make live'
                        )}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-danger admin-btn-sm admin-moderation-btn-loading"
                        disabled={!!loading}
                        onClick={() => handleDeleteBouquet(b.id, b.nameEn)}
                      >
                        {loading === `delete-bouquet-${b.id}` ? (
                          <>
                            <span className="admin-moderation-spinner" aria-hidden />
                            Deleting…
                          </>
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="admin-moderation-section">
        <div className="admin-moderation-section-header">
          <h2 className="admin-moderation-section-title">Products (non-flowers)</h2>
          <div className="admin-moderation-tabs">
            <button
              type="button"
              className={`admin-moderation-tab ${productFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setProductFilter('pending')}
            >
              Pending ({initialProducts.length})
            </button>
            <button
              type="button"
              className={`admin-moderation-tab ${productFilter === 'all' ? 'active' : ''}`}
              onClick={() => setProductFilter('all')}
            >
              All ({allProducts.length})
            </button>
          </div>
        </div>
        <div className="admin-moderation-grid">
          {displayedProducts.map((p) => (
            <div key={p.id} className="admin-moderation-card admin-moderation-card-product">
              <Link href={`/admin/products/edit/${p.id}`} className="admin-moderation-card-link">
                <div className="admin-moderation-card-image">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" width={120} height={120} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  ) : (
                    <div className="admin-moderation-placeholder">🎁</div>
                  )}
                </div>
                <div className="admin-moderation-card-info">
                  <strong>{p.nameEn}</strong>
                  <p className="admin-moderation-card-meta">
                    {p.category} · ฿{p.price}
                    {productFilter === 'all' && (
                      <span className={`admin-moderation-status-badge status-${p.moderationStatus}`}>
                        {STATUS_LABELS[p.moderationStatus] ?? p.moderationStatus}
                      </span>
                    )}
                  </p>
                  {productFilter === 'all' && p.slug && (
                    <Link
                      href={`/en/catalog/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-moderation-catalog-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View in catalog →
                    </Link>
                  )}
                </div>
              </Link>
              <div className="admin-moderation-card-actions">
                <Link
                  href={`/admin/products/edit/${p.id}`}
                  className="admin-btn admin-btn-primary admin-btn-sm"
                >
                  {p.moderationStatus === 'submitted' ? 'Review' : 'Edit'}
                </Link>
                {(p.moderationStatus === 'submitted' || p.moderationStatus === 'live' || p.moderationStatus === 'rejected') && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-sm admin-moderation-btn-loading"
                    disabled={!!loading}
                    onClick={() => setNeedsChangesId(needsChangesId === p.id ? null : p.id)}
                  >
                    Needs changes
                  </button>
                )}
                {(p.moderationStatus === 'submitted' || p.moderationStatus === 'live' || p.moderationStatus === 'needs_changes') && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-danger admin-btn-sm admin-moderation-btn-loading"
                    disabled={!!loading}
                    onClick={() => handleDeleteProduct(p.id, p.nameEn)}
                  >
                    {loading === `delete-product-${p.id}` ? (
                      <>
                        <span className="admin-moderation-spinner" aria-hidden />
                        Deleting…
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                )}
              </div>
              {needsChangesId === p.id && (
                <div className="admin-moderation-needs-changes">
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
                    onClick={() => handleNeedsChanges(p.id)}
                  >
                    {loading === `needs-changes-${p.id}` ? (
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
            </div>
          ))}
        </div>
      </section>

      {section === 'moderation' && total === 0 && productFilter === 'pending' && (
        <p className="admin-empty">No items pending moderation.</p>
      )}
      {section === 'catalog' &&
        displayedBouquets.length === 0 &&
        productFilter === 'all' &&
        allProducts.length === 0 && (
          <p className="admin-empty">
            No catalog items yet. Run <code>npm run import-catalog</code> to copy Sanity data into Supabase.
          </p>
        )}
      {section === 'moderation' && productFilter === 'all' && allProducts.length === 0 && (
        <p className="admin-empty">No partner products yet.</p>
      )}
    </div>
  );
}
