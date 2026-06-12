'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ProductSectionSwitcher } from './ProductSectionSwitcher';

interface Props {
  children: ReactNode;
  pendingCount?: number;
}

function isProductSubRoute(pathname: string): boolean {
  return (
    pathname.includes('/admin/products/edit/') ||
    pathname.includes('/admin/products/review/') ||
    pathname.includes('/admin/moderation/products/')
  );
}

export function ProductsShellClient({ children, pendingCount }: Props) {
  const pathname = usePathname() ?? '';
  const showTabs = !isProductSubRoute(pathname);

  if (!showTabs) {
    return <>{children}</>;
  }

  return (
    <div className="admin-products">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Products</h1>
          <p className="admin-hint">Catalog, partner moderation, and new listings</p>
        </div>
      </header>
      <ProductSectionSwitcher pendingCount={pendingCount} />
      {children}
    </div>
  );
}
