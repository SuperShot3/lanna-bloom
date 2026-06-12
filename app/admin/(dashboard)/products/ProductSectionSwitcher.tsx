'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  { id: 'catalog', href: '/admin/products', label: 'Catalog', icon: 'inventory_2' },
  { id: 'hero', href: '/admin/products/hero', label: 'Homepage hero', icon: 'photo_library' },
  { id: 'moderation', href: '/admin/products/moderation', label: 'Moderation', icon: 'verified_user' },
  { id: 'new', href: '/admin/products/new', label: 'Add product', icon: 'add_shopping_cart' },
] as const;

export type ProductSectionId = (typeof SECTIONS)[number]['id'];

function productSectionFromPath(pathname: string): ProductSectionId {
  if (pathname.startsWith('/admin/products/new')) return 'new';
  if (pathname.startsWith('/admin/products/hero')) return 'hero';
  if (pathname.startsWith('/admin/products/moderation')) return 'moderation';
  if (pathname.startsWith('/admin/moderation/products')) return 'moderation';
  if (pathname === '/admin/products' || pathname.startsWith('/admin/products?')) return 'catalog';
  if (pathname.startsWith('/admin/products')) return 'catalog';
  return 'catalog';
}

export function ProductSectionSwitcher({ pendingCount }: { pendingCount?: number }) {
  const pathname = usePathname() ?? '';
  const active = productSectionFromPath(pathname);

  return (
    <nav className="admin-accounting-tabs admin-products-tabs" aria-label="Product sections">
      {SECTIONS.map((section) => {
        const activeHere = active === section.id;
        return (
          <Link
            key={section.id}
            href={section.href}
            prefetch={false}
            className={`admin-accounting-tab${activeHere ? ' admin-accounting-tab-active' : ''}`}
            aria-current={activeHere ? 'page' : undefined}
          >
            <span className="material-symbols-outlined">{section.icon}</span>
            {section.label}
            {section.id === 'moderation' && typeof pendingCount === 'number' && pendingCount > 0 && (
              <span className="admin-accounting-tab-count">{pendingCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
