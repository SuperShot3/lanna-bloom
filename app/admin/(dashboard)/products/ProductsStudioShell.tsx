'use client';

import { Suspense, useState, type ReactNode } from 'react';
import type { AdminCatalogIndex } from '@/lib/catalog/types';
import { CatalogShelfDirtyProvider } from './CatalogShelfDirtyContext';
import { ProductsNavigator } from './ProductsNavigator';

type Props = {
  index: AdminCatalogIndex;
  children: ReactNode;
};

export function ProductsStudioShell({ index, children }: Props) {
  const [shelfOpen, setShelfOpen] = useState(false);
  const [shelfCollapsed, setShelfCollapsed] = useState(false);

  return (
    <CatalogShelfDirtyProvider>
    <div className="admin-products-studio">
      <div className="admin-products-studio-toolbar">
        <button
          type="button"
          className="admin-products-studio-menu-btn"
          aria-label="Open product list"
          onClick={() => setShelfOpen(true)}
        >
          <span className="material-symbols-outlined" aria-hidden>
            menu
          </span>
        </button>
        <div>
          <h1 className="admin-products-studio-title">Products</h1>
          <p className="admin-hint">Catalog studio — select an item to edit</p>
        </div>
        {index.pendingCount > 0 ? (
          <span className="admin-products-studio-pending-badge">{index.pendingCount} pending</span>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Close product list"
        className="admin-products-studio-overlay"
        data-open={shelfOpen}
        onClick={() => setShelfOpen(false)}
      />

      <div className="admin-products-studio-layout">
        <aside
          className="admin-products-studio-shelf"
          data-open={shelfOpen}
          data-collapsed={shelfCollapsed}
        >
          <div className="admin-products-studio-shelf-header">
            <span className="admin-products-studio-shelf-title">Catalog</span>
            <button
              type="button"
              className="admin-products-studio-shelf-close"
              aria-label="Close product list"
              onClick={() => setShelfOpen(false)}
            >
              <span className="material-symbols-outlined" aria-hidden>
                close
              </span>
            </button>
          </div>
          <div className="admin-products-studio-shelf-body">
            <Suspense fallback={<p className="admin-hint">Loading list…</p>}>
              <ProductsNavigator
                index={index}
                shelfCollapsed={shelfCollapsed}
                onNavigate={() => setShelfOpen(false)}
              />
            </Suspense>
          </div>
          <button
            type="button"
            className="admin-products-studio-shelf-toggle"
            aria-label={shelfCollapsed ? 'Expand product list' : 'Collapse product list'}
            aria-expanded={!shelfCollapsed}
            onClick={() => setShelfCollapsed((v) => !v)}
          >
            <span className="material-symbols-outlined" aria-hidden>
              {shelfCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </aside>
        <main className="admin-products-studio-main">{children}</main>
      </div>
    </div>
    </CatalogShelfDirtyProvider>
  );
}
