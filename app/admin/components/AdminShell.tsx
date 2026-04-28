'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { MissingCogsNotice } from './MissingCogsNotice';

const NAV_ITEMS = [
  { href: '/admin/orders', label: 'Orders', icon: 'shopping_bag' },
  { href: '/admin/emails', label: 'Emails', icon: 'mail' },
  { href: '/admin/accounting', label: 'Accounting', icon: 'account_balance_wallet' },
  { href: '/admin/partners/applications', label: 'Partners', icon: 'group' },
  { href: '/admin/moderation/products', label: 'Product Moderation', icon: 'verified_user' },
  { href: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  return (
    <div className="admin-shell">
      <MissingCogsNotice />
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
          <Link
            href="/admin/accounting/info"
            className="admin-shell-nav-link admin-shell-nav-link-info"
          >
            <span className="material-symbols-outlined admin-shell-icon">info</span>
            <span>Accounting info</span>
          </Link>
          <Link
            href="/admin/settings/collections"
            className="admin-shell-nav-link admin-shell-nav-link-info"
          >
            <span className="material-symbols-outlined admin-shell-icon">settings</span>
            <span>Collection settings</span>
          </Link>
          <a
            href="/api/auth/signout?callbackUrl=/admin/login"
            className="admin-shell-nav-link admin-shell-nav-link-logout"
          >
            <span className="material-symbols-outlined admin-shell-icon">logout</span>
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
          {userEmail ? (
            <div className="admin-shell-header-user" title={userEmail}>
              <span className="material-symbols-outlined admin-shell-icon admin-shell-header-user-icon">
                account_circle
              </span>
              <span className="admin-shell-header-user-email">{userEmail}</span>
            </div>
          ) : null}
          <div className="admin-shell-header-spacer" />
          <Link
            href="/admin/settings/collections"
            className="admin-shell-header-logout"
            aria-label="Collection settings"
            title="Collection settings"
          >
            <span className="material-symbols-outlined admin-shell-icon">settings</span>
            <span>Settings</span>
          </Link>
          <a
            href="/api/auth/signout?callbackUrl=/admin/login"
            className="admin-shell-header-logout"
          >
            <span className="material-symbols-outlined admin-shell-icon">logout</span>
            <span>Sign out</span>
          </a>
        </header>
        <main className="admin-shell-content">{children}</main>
      </div>
    </div>
  );
}
