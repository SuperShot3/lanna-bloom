'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin/orders', label: 'Orders', icon: 'shopping_bag' },
  { href: '/admin/partners/applications', label: 'Partners', icon: 'group' },
  { href: '/admin/moderation/products', label: 'Product Moderation', icon: 'verified_user' },
  { href: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Close menu"
        className="admin-shell-overlay"
        data-open={sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className="admin-shell-sidebar" data-open={sidebarOpen}>
        <div className="admin-shell-sidebar-header">
          <div className="admin-shell-logo">
            <span className="material-symbols-outlined admin-shell-logo-icon">dashboard</span>
            <div>
              <h1 className="admin-shell-logo-title">Admin Portal</h1>
              <p className="admin-shell-logo-version">v2.0.4</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="admin-shell-close"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined admin-shell-icon">close</span>
          </button>
        </div>
        <nav className="admin-shell-nav">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`admin-shell-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined admin-shell-icon">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-shell-sidebar-footer">
          <a
            href="/api/auth/signout?callbackUrl=/admin/login"
            className="admin-shell-nav-link admin-shell-nav-link-logout"
          >
            <span className="admin-shell-icon">logout</span>
            <span>Sign out</span>
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-shell-main">
        <header className="admin-shell-header">
          <button
            type="button"
            aria-label="Open menu"
            className="admin-shell-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined admin-shell-icon">menu</span>
          </button>
          <div className="admin-shell-header-spacer" />
          <a
            href="/api/auth/signout?callbackUrl=/admin/login"
            className="admin-shell-header-logout"
          >
            Sign out
          </a>
        </header>
        <main className="admin-shell-content">{children}</main>
      </div>
    </div>
  );
}
