'use client';

import { Fragment, useMemo, useState } from 'react';
import { AdminImageLightbox } from '@/app/admin/components/AdminImageLightbox';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { formatThb } from '@/lib/costsUtils';
import type { SoldProductHistoryGroup } from '@/lib/admin/soldProductsHistoryTypes';
import { SoldHistoryNotesEditor } from './SoldHistoryNotesEditor';
import { SoldHistoryImageGallery } from './SoldHistoryImageGallery';
import { SoldHistorySaleRow } from './SoldHistorySaleRow';

interface SoldProductsHistoryClientProps {
  groups: SoldProductHistoryGroup[];
  canEdit: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function SoldProductsHistoryClient({ groups, canEdit }: SoldProductsHistoryClientProps) {
  const [query, setQuery] = useState('');
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (!showOrphaned && g.is_orphaned) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [groups, query, showOrphaned]);

  function groupKey(group: SoldProductHistoryGroup): string {
    return `${group.entity_type}:${group.product_id}`;
  }

  function toggle(key: string) {
    setOpenKey((current) => (current === key ? null : key));
  }

  return (
    <div className="admin-sold-history">
      <div className="admin-page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="admin-title">Sold history</h1>
          <p className="admin-hint">
            Every product ever sold — sale price, sourcing shop, and images over time. Notes and the
            image gallery are admin-editable; the sale history itself is a read-only record.
          </p>
        </div>
      </div>

      <div className="admin-sold-history-filters">
        <label className="admin-form-group admin-sold-history-search">
          <span className="sr-only">Search products</span>
          <input
            type="search"
            className="admin-input"
            placeholder="Search by product name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="admin-sold-history-orphan-toggle">
          <input
            type="checkbox"
            checked={showOrphaned}
            onChange={(e) => setShowOrphaned(e.target.checked)}
          />
          Show products no longer in catalog
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="admin-hint">No sold products found.</p>
      ) : (
        <div className="admin-expenses-table-wrap">
          <table className="admin-expenses-table">
            <thead>
              <tr>
                <th></th>
                <th>Product</th>
                <th>Times sold</th>
                <th className="admin-expenses-col-amount">Last price</th>
                <th className="admin-expenses-col-amount">Last COGS</th>
                <th>Last shop</th>
                <th>Last sold</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((group) => {
                const key = groupKey(group);
                const open = openKey === key;
                return (
                  <Fragment key={key}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-outline"
                          onClick={() => toggle(key)}
                          aria-expanded={open}
                        >
                          {open ? 'Hide' : 'View'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {group.thumbnail_url ? (
                            <button
                              type="button"
                              className="admin-products-studio-item-thumb admin-sold-history-overview-thumb"
                              onClick={() => setLightboxSrc(group.thumbnail_url)}
                              aria-label={`View photo for ${group.name}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={group.thumbnail_url} alt="" />
                            </button>
                          ) : (
                            <span className="admin-products-studio-item-thumb">
                              <span className="material-symbols-outlined" aria-hidden>
                                image
                              </span>
                            </span>
                          )}
                          <span>
                            {group.name}
                            {group.is_orphaned ? (
                              <span className="admin-hint"> · no longer in catalog</span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td>{group.times_sold}</td>
                      <td className="admin-expenses-amount">{formatThb(group.last_sold_price)}</td>
                      <td className="admin-expenses-amount">{formatThb(group.last_cost)}</td>
                      <td>{group.last_shop_name ?? '—'}</td>
                      <td>{formatDate(group.last_sold_at)}</td>
                    </tr>
                    <tr>
                      <td colSpan={7} style={{ padding: 0, border: open ? undefined : 'none' }}>
                        <OverlayReveal open={open}>
                          <div className="admin-sold-history-detail">
                            <div className="admin-sold-history-detail-history">
                              <h4 style={{ marginTop: 0 }}>Sale history</h4>
                              {group.history.length === 0 ? (
                                <p className="admin-hint">No sales recorded.</p>
                              ) : (
                                <div className="admin-expenses-table-wrap">
                                  <table className="admin-expenses-table">
                                    <thead>
                                      <tr>
                                        <th></th>
                                        <th>Date</th>
                                        <th className="admin-expenses-col-amount">Price</th>
                                        <th className="admin-expenses-col-amount">COGS</th>
                                        <th>Shop</th>
                                        <th>Recipient</th>
                                        <th>Order</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.history.map((sale, idx) => (
                                        <SoldHistorySaleRow
                                          key={`${sale.order_id}-${sale.item_id}-${idx}`}
                                          sale={sale}
                                          canEdit={canEdit}
                                        />
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            <div className="admin-sold-history-detail-editable">
                              <SoldHistoryNotesEditor
                                entityType={group.entity_type}
                                entityId={group.product_id}
                                initialNotes={group.sold_history_notes}
                                canEdit={canEdit && !group.is_orphaned}
                              />
                              <SoldHistoryImageGallery
                                entityType={group.entity_type}
                                entityId={group.product_id}
                                images={group.sold_history_images}
                                canEdit={canEdit && !group.is_orphaned}
                              />
                              {group.is_orphaned ? (
                                <p className="admin-hint">
                                  This product is no longer in the catalog, so notes and images can’t
                                  be edited here.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </OverlayReveal>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lightboxSrc ? (
        <AdminImageLightbox src={lightboxSrc} alt="" onClose={() => setLightboxSrc(null)} />
      ) : null}
    </div>
  );
}
