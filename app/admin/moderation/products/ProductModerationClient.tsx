'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  approveBouquetAction,
  rejectBouquetAction,
  approveProductAction,
  rejectProductAction,
  needsChangesProductAction,
} from './actions';
import type { Bouquet } from '@/lib/bouquets';
import type { ModerationProduct } from '@/lib/sanity';

type ProductModerationClientProps = {
  initialBouquets: Bouquet[];
  initialProducts: ModerationProduct[];
};

export function ProductModerationClient({
  initialBouquets,
  initialProducts,
}: ProductModerationClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [needsChangesId, setNeedsChangesId] = useState<string | null>(null);
  const [needsChangesNote, setNeedsChangesNote] = useState('');

  async function handleApproveBouquet(id: string) {
    setLoading(id);
    const result = await approveBouquetAction(id);
    setLoading(null);
    if (result.error) alert(result.error);
    else window.location.reload();
  }

  async function handleRejectBouquet(id: string) {
    setLoading(id);
    const result = await rejectBouquetAction(id);
    setLoading(null);
    if (result.error) alert(result.error);
    else window.location.reload();
  }

  async function handleApproveProduct(id: string) {
    setLoading(id);
    const result = await approveProductAction(id);
    setLoading(null);
    if (result.error) alert(result.error);
    else window.location.reload();
  }

  async function handleRejectProduct(id: string) {
    setLoading(id);
    const result = await rejectProductAction(id);
    setLoading(null);
    if (result.error) alert(result.error);
    else window.location.reload();
  }

  async function handleNeedsChanges(id: string) {
    if (!needsChangesNote.trim()) {
      alert('Please enter a note for the partner');
      return;
    }
    setLoading(id);
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

  return (
    <div className="admin-v2-orders">
      <header className="admin-v2-header">
        <div>
          <h1 className="admin-v2-title">Product Moderation</h1>
          <p className="admin-v2-hint">
            {total} item{total !== 1 ? 's' : ''} pending review
          </p>
        </div>
        <div className="admin-v2-header-actions">
          <Link href="/admin" className="admin-v2-btn admin-v2-btn-outline">
            Back
          </Link>
          <a href="/api/auth/signout?callbackUrl=/admin/login" className="admin-v2-btn admin-v2-btn-outline">
            Log out
          </a>
        </div>
      </header>

      {initialBouquets.length > 0 && (
        <section className="admin-moderation-section">
          <h2 className="admin-moderation-section-title">Bouquets (flowers)</h2>
          <div className="admin-moderation-grid">
            {initialBouquets.map((b) => (
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
                  <p className="admin-moderation-card-meta">฿{b.sizes?.[0]?.price ?? 0}+</p>
                </div>
                <div className="admin-moderation-card-actions">
                  <button
                    type="button"
                    className="admin-v2-btn admin-v2-btn-primary admin-v2-btn-sm"
                    disabled={!!loading}
                    onClick={() => handleApproveBouquet(b.id)}
                  >
                    {loading === b.id ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="admin-v2-btn admin-v2-btn-outline admin-v2-btn-sm"
                    disabled={!!loading}
                    onClick={() => handleRejectBouquet(b.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {initialProducts.length > 0 && (
        <section className="admin-moderation-section">
          <h2 className="admin-moderation-section-title">Products (non-flowers)</h2>
          <div className="admin-moderation-grid">
            {initialProducts.map((p) => (
              <div key={p.id} className="admin-moderation-card">
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
                  </p>
                </div>
                <div className="admin-moderation-card-actions">
                  <button
                    type="button"
                    className="admin-v2-btn admin-v2-btn-primary admin-v2-btn-sm"
                    disabled={!!loading}
                    onClick={() => handleApproveProduct(p.id)}
                  >
                    {loading === p.id ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="admin-v2-btn admin-v2-btn-outline admin-v2-btn-sm"
                    disabled={!!loading}
                    onClick={() => setNeedsChangesId(needsChangesId === p.id ? null : p.id)}
                  >
                    Needs changes
                  </button>
                  <button
                    type="button"
                    className="admin-v2-btn admin-v2-btn-outline admin-v2-btn-sm"
                    disabled={!!loading}
                    onClick={() => handleRejectProduct(p.id)}
                  >
                    Reject
                  </button>
                </div>
                {needsChangesId === p.id && (
                  <div className="admin-moderation-needs-changes">
                    <input
                      type="text"
                      placeholder="Note for partner (required)"
                      value={needsChangesNote}
                      onChange={(e) => setNeedsChangesNote(e.target.value)}
                      className="admin-v2-input"
                    />
                    <button
                      type="button"
                      className="admin-v2-btn admin-v2-btn-primary admin-v2-btn-sm"
                      disabled={!!loading || !needsChangesNote.trim()}
                      onClick={() => handleNeedsChanges(p.id)}
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <p className="admin-v2-empty">No items pending moderation.</p>
      )}
    </div>
  );
}
