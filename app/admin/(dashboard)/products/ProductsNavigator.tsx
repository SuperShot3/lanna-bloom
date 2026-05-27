'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { AdminCatalogIndex, AdminCatalogIndexItem } from '@/lib/catalog/types';
import { PRODUCT_CATEGORIES } from '@/lib/catalogCategories';
import { getCatalogShelfSyncDot } from './catalogShelfSyncDot';
import { useCatalogShelfDirty } from './CatalogShelfDirtyContext';

const CATEGORY_LABELS: Record<string, string> = {
  balloons: 'Balloons',
  plushy_toys: 'Toys & Plush',
  gifts: 'Gifts',
  money_flowers: 'Money Flowers',
  handmade_floral: 'Handmade Floral',
  food_sweets: 'Food & Sweets',
  wellness: 'Wellness',
  home_lifestyle: 'Home & Lifestyle',
  stationery: 'Stationery',
  baby_family: 'Baby & Family',
  fashion: 'Fashion & Accessories',
  seasonal: 'Seasonal',
  other: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending',
  approved: 'Live',
  rejected: 'Rejected',
  submitted: 'Pending',
  live: 'Live',
  needs_changes: 'Changes',
};

function itemHref(item: AdminCatalogIndexItem): string {
  return item.entityType === 'bouquet'
    ? `/admin/products/bouquet/${item.id}`
    : `/admin/products/product/${item.id}`;
}

function matchesPath(pathname: string, item: AdminCatalogIndexItem): boolean {
  const prefix =
    item.entityType === 'bouquet'
      ? `/admin/products/bouquet/${item.id}`
      : `/admin/products/product/${item.id}`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

type NavigatorGroup = {
  id: string;
  title: string;
  items: AdminCatalogIndexItem[];
};

type Props = {
  index: AdminCatalogIndex;
  shelfCollapsed?: boolean;
  onNavigate?: () => void;
};

function showShelfStatusLabel(status: string): boolean {
  return status !== 'live' && status !== 'approved';
}

const LEAVE_UNSAVED_MESSAGE =
  'You have unsaved changes. They stay saved in this browser session if you open this product again. Leave anyway?';

export function ProductsNavigator({ index, shelfCollapsed = false, onNavigate }: Props) {
  const pathname = usePathname() ?? '';
  const { dirtyKeys, activePathHasUnsaved } = useCatalogShelfDirty();
  const searchParams = useSearchParams();
  const expandPending = searchParams?.get('group') === 'pending';
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filterItem = (item: AdminCatalogIndexItem) => {
      if (!q) return true;
      return (
        item.nameEn.toLowerCase().includes(q) ||
        (item.slug?.toLowerCase().includes(q) ?? false)
      );
    };

    const pending = [...index.bouquets, ...index.products].filter(
      (item) => item.isPending && filterItem(item)
    );

    const byCategory = new Map<string, AdminCatalogIndexItem[]>();
    for (const category of PRODUCT_CATEGORIES) {
      byCategory.set(category, []);
    }
    for (const product of index.products) {
      if (!filterItem(product)) continue;
      const bucket = byCategory.get(product.category ?? 'other') ?? byCategory.get('other')!;
      bucket.push(product);
    }

    const result: NavigatorGroup[] = [
      {
        id: 'flowers',
        title: 'Flowers',
        items: index.bouquets.filter(filterItem),
      },
    ];

    for (const category of PRODUCT_CATEGORIES) {
      const items = byCategory.get(category) ?? [];
      if (!items.length) continue;
      result.push({
        id: `category-${category}`,
        title: CATEGORY_LABELS[category] ?? category,
        items,
      });
    }

    if (pending.length) {
      result.push({ id: 'pending', title: 'Pending review', items: pending });
    }

    return result;
  }, [index, query]);

  function toggleGroup(id: string) {
    setCollapsed((current) => ({ ...current, [id]: !current[id] }));
  }

  function tryLeaveCurrentProduct(event: { preventDefault: () => void }): boolean {
    if (!activePathHasUnsaved(pathname)) return true;
    if (window.confirm(LEAVE_UNSAVED_MESSAGE)) return true;
    event.preventDefault();
    return false;
  }

  function isGroupOpen(group: NavigatorGroup): boolean {
    if (group.id === 'pending' && expandPending) return true;
    if (collapsed[group.id] === true) return false;
    if (collapsed[group.id] === false) return true;
    if (group.id === 'pending') return expandPending;
    return group.items.some((item) => matchesPath(pathname, item));
  }

  return (
    <div
      className="admin-products-studio-shelf-inner"
      data-collapsed={shelfCollapsed ? 'true' : undefined}
    >
      <div className="admin-products-studio-shelf-toolbar">
        {!shelfCollapsed ? (
          <label className="admin-products-studio-search">
            <span className="sr-only">Search products</span>
            <input
              type="search"
              className="admin-input"
              placeholder="Search name or slug…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        ) : null}
        <Link
          href="/admin/products/new"
          className="admin-btn admin-btn-primary admin-products-studio-add-btn"
          aria-label="Add product"
          title="Add product"
          onClick={(event) => {
            if (!tryLeaveCurrentProduct(event)) return;
            onNavigate?.();
          }}
        >
          <span className="material-symbols-outlined" aria-hidden>
            add
          </span>
        </Link>
      </div>

      <nav className="admin-products-studio-groups" aria-label="Product groups">
        <section className="admin-products-studio-group admin-products-studio-group-pinned">
          <Link
            href="/admin/products/hero"
            className={`admin-products-studio-hero-link ${pathname.startsWith('/admin/products/hero') ? 'active' : ''}`}
            title={shelfCollapsed ? 'Homepage hero' : undefined}
            onClick={() => onNavigate?.()}
          >
            <span className="material-symbols-outlined" aria-hidden>
              photo_library
            </span>
            {!shelfCollapsed ? <span>Homepage hero</span> : null}
          </Link>
        </section>
        {groups.map((group) => {
          const open = isGroupOpen(group);
          return (
            <section key={group.id} className="admin-products-studio-group">
              <button
                type="button"
                className="admin-products-studio-group-header"
                aria-expanded={open}
                title={shelfCollapsed ? group.title : undefined}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="admin-products-studio-group-title">{group.title}</span>
                <span className="admin-products-studio-group-count">{group.items.length}</span>
              </button>
              {open ? (
                <ul className="admin-products-studio-items">
                  {group.items.map((item) => {
                    const active = matchesPath(pathname, item);
                    const syncDot = getCatalogShelfSyncDot(item, dirtyKeys);
                    return (
                      <li key={`${item.entityType}-${item.id}`}>
                        <Link
                          href={itemHref(item)}
                          className={`admin-products-studio-item ${active ? 'active' : ''}`}
                          title={shelfCollapsed ? item.nameEn : undefined}
                          onClick={(event) => {
                            if (!active && !tryLeaveCurrentProduct(event)) return;
                            onNavigate?.();
                          }}
                        >
                          <span className="admin-products-studio-item-thumb">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt="" />
                            ) : (
                              <span className="material-symbols-outlined" aria-hidden>
                                image
                              </span>
                            )}
                          </span>
                          {!shelfCollapsed ? (
                            <span className="admin-products-studio-item-body">
                              <span className="admin-products-studio-item-text">
                                <span className="admin-products-studio-item-name">{item.nameEn}</span>
                                {showShelfStatusLabel(item.status) ? (
                                  <span
                                    className={`admin-products-studio-item-status status-${item.status}`}
                                  >
                                    {STATUS_LABELS[item.status] ?? item.status}
                                  </span>
                                ) : null}
                              </span>
                              <span
                                className={`admin-catalog-shelf-dot admin-catalog-shelf-dot--end ${syncDot.className}`}
                                title={syncDot.title}
                                aria-label={syncDot.title}
                              />
                            </span>
                          ) : (
                            <span
                              className={`admin-catalog-shelf-dot admin-catalog-shelf-dot--collapsed ${syncDot.className}`}
                              title={syncDot.title}
                              aria-label={syncDot.title}
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </nav>
    </div>
  );
}
