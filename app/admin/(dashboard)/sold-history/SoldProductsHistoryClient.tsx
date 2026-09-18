'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminImageLightbox } from '@/app/admin/components/AdminImageLightbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { formatThb } from '@/lib/costsUtils';
import type { SoldProductHistoryGroup } from '@/lib/admin/soldProductsHistoryTypes';
import { SoldHistorySaleRow } from './SoldHistorySaleRow';
import { SoldHistoryMobileCard } from './SoldHistoryMobileCard';

const MINT_ICON = '#4C9A7C';

type Period = 'month' | 'last-month' | 'all';

const PERIOD_LABEL: Record<Period, string> = {
  month: 'this month',
  'last-month': 'last month',
  all: 'all time',
};

interface SoldProductsHistoryClientProps {
  groups: SoldProductHistoryGroup[];
  canEdit: boolean;
  /** When set (e.g. arrived via `?order=` from the Delivery board), scope the view to this order. */
  initialOrderId?: string | null;
  /** Period preselected on the Delivery board (`?period=`). */
  initialPeriod?: Period;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function saleInPeriod(paidAt: string | null, period: Period, now: Date): boolean {
  if (period === 'all') return true;
  if (!paidAt) return false;
  const d = new Date(paidAt);
  if (Number.isNaN(d.getTime())) return false;
  if (period === 'month') return isSameMonth(d, now);
  const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return isSameMonth(d, lastMonthRef);
}

export function SoldProductsHistoryClient({ groups, canEdit, initialOrderId, initialPeriod }: SoldProductsHistoryClientProps) {
  const orderFilter = initialOrderId?.trim() || null;

  const orderMatchedGroups = useMemo(() => {
    if (!orderFilter) return null;
    return groups
      .map((g) => ({ ...g, history: g.history.filter((s) => s.order_id === orderFilter) }))
      .filter((g) => g.history.length > 0);
  }, [groups, orderFilter]);

  const [query, setQuery] = useState('');
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(
    orderMatchedGroups && orderMatchedGroups.length === 1
      ? `${orderMatchedGroups[0].entity_type}:${orderMatchedGroups[0].product_id}`
      : null
  );
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(orderFilter ? 'all' : initialPeriod ?? 'month');

  const now = useMemo(() => new Date(), []);

  function groupKey(group: SoldProductHistoryGroup): string {
    return `${group.entity_type}:${group.product_id}`;
  }

  const filtered = useMemo(() => {
    if (orderMatchedGroups) return orderMatchedGroups;
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (!showOrphaned && g.is_orphaned) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [groups, query, showOrphaned, orderMatchedGroups]);

  const periodStatsByKey = useMemo(() => {
    const map = new Map<
      string,
      { count: number; lastPrice: number | null; lastCost: number | null; lastSoldAt: string | null }
    >();
    for (const g of groups) {
      if (period === 'all') {
        map.set(groupKey(g), {
          count: g.times_sold,
          lastPrice: g.last_sold_price,
          lastCost: g.last_cost,
          lastSoldAt: g.last_sold_at,
        });
        continue;
      }
      const sales = g.history.filter((s) => saleInPeriod(s.paid_at, period, now));
      map.set(groupKey(g), {
        count: sales.length,
        lastPrice: sales[0]?.price ?? null,
        lastCost: sales[0]?.cost ?? null,
        lastSoldAt: sales[0]?.paid_at ?? null,
      });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, period, now]);

  const mobileFiltered = useMemo(() => {
    if (period === 'all') return filtered;
    return filtered.filter((g) => (periodStatsByKey.get(groupKey(g))?.count ?? 0) > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, period, periodStatsByKey]);

  const summaryTotalSales = useMemo(
    () =>
      mobileFiltered.reduce((sum, g) => sum + (periodStatsByKey.get(groupKey(g))?.count ?? 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mobileFiltered, periodStatsByKey]
  );

  function toggle(key: string) {
    setOpenKey((current) => (current === key ? null : key));
  }

  return (
    <div className="admin-sold-history">
      {orderFilter ? (
        <div className="admin-sold-history-order-filter">
          <span>
            Showing sold history for order <strong>{orderFilter}</strong>
          </span>
          <Link href="/admin/sold-history" className="admin-link">
            Clear filter
          </Link>
        </div>
      ) : null}

      {/* Mobile: image-first card list */}
      <div className="flex flex-col gap-4 bg-white px-4 pb-6 pt-1 md:hidden">
        <div className="flex items-start justify-between gap-3 pt-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Products</h1>
            <p className="mt-0.5 text-[13px] text-gray-400">Sales and recent activity</p>
          </div>
          <label className="shrink-0">
            <span className="sr-only">Filter by period</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-full border border-gray-100 bg-white px-3 py-2 text-[12.5px] font-medium text-gray-600 shadow-[0_1px_3px_rgba(16,24,40,0.04)] outline-none"
            >
              <option value="month">This month</option>
              <option value="last-month">Last month</option>
              <option value="all">All time</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
            <span className="material-symbols-outlined shrink-0 text-gray-300" style={{ fontSize: 20 }} aria-hidden>
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-800 outline-none placeholder:text-gray-300"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Filter products"
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-500 shadow-[0_1px_3px_rgba(16,24,40,0.04)]"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden>
                  tune
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={showOrphaned}
                onCheckedChange={(checked) => setShowOrphaned(checked === true)}
              >
                Show products no longer in catalog
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
          <div className="flex items-center gap-2.5">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: MINT_ICON }}
              aria-hidden
            >
              inventory_2
            </span>
            <div>
              <div className="text-[15px] font-semibold leading-none text-gray-900">
                {mobileFiltered.length}
              </div>
              <div className="mt-1 text-[11px] leading-none text-gray-400">products</div>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-100" />
          <div className="flex items-center gap-2.5">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: MINT_ICON }}
              aria-hidden
            >
              trending_up
            </span>
            <div>
              <div className="text-[15px] font-semibold leading-none text-gray-900">
                {summaryTotalSales}
              </div>
              <div className="mt-1 text-[11px] leading-none text-gray-400">
                total sales {PERIOD_LABEL[period]}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {mobileFiltered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-gray-400">No sold products found.</p>
          ) : (
            mobileFiltered.map((group) => {
              const stats = periodStatsByKey.get(groupKey(group));
              return (
                <SoldHistoryMobileCard
                  key={groupKey(group)}
                  group={group}
                  canEdit={canEdit}
                  soldCount={stats?.count ?? group.times_sold}
                  lastPrice={stats?.lastPrice ?? group.last_sold_price}
                  lastCost={stats?.lastCost ?? group.last_cost}
                  lastSoldAt={stats?.lastSoldAt ?? group.last_sold_at}
                  onOpenLightbox={setLightboxSrc}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Desktop: table view */}
      <div className="hidden md:block">
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
      </div>

      {lightboxSrc ? (
        <AdminImageLightbox src={lightboxSrc} alt="" onClose={() => setLightboxSrc(null)} />
      ) : null}
    </div>
  );
}
