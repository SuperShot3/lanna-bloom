'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
const NAV_ITEMS = [
  { href: '/admin/orders', label: 'Orders', icon: 'shopping_bag' },
  { href: '/admin/emails', label: 'Emails', icon: 'mail' },
  { href: '/admin/accounting/overview', label: 'Accounting', icon: 'account_balance_wallet' },
  { href: '/admin/partners/applications', label: 'Partners', icon: 'group' },
  { href: '/admin/provinces', label: 'Provinces', icon: 'map' },
  { href: '/admin/products', label: 'Products', icon: 'inventory_2' },
  { href: '/admin/marketing', label: 'Marketing', icon: 'campaign' },
  { href: '/admin/reviews', label: 'Reviews & Coupons', icon: 'reviews' },
  { href: '/admin/info-comments', label: 'Guide comments', icon: 'forum' },
] as const;

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingGuideComments, setPendingGuideComments] = useState(0);
  const [orderChatUnread, setOrderChatUnread] = useState(0);
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPendingCount() {
      try {
        const res = await fetch('/api/admin/info-comments?pendingCount=1', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { count?: unknown } | null;
        if (cancelled) return;
        const count = typeof data?.count === 'number' ? data.count : 0;
        setPendingGuideComments(count > 0 ? count : 0);
      } catch {
        /* ignore */
      }
    }
    loadPendingCount();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function loadChatUnread() {
      try {
        const res = await fetch('/api/admin/orders/chat-unread', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setOrderChatUnread(0);
          return;
        }
        const data = (await res.json().catch(() => null)) as { count?: unknown } | null;
        if (cancelled) return;
        const count = typeof data?.count === 'number' ? data.count : 0;
        setOrderChatUnread(count > 0 ? count : 0);
      } catch {
        if (!cancelled) setOrderChatUnread(0);
      }
    }
    loadChatUnread();
    const timer = setInterval(loadChatUnread, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname]);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  /** App Router can serve a cached RSC snapshot on soft navigation; refetch after each in-app route change. */
  const skipRefreshOnce = useRef(true);
  useEffect(() => {
    if (skipRefreshOnce.current) {
      skipRefreshOnce.current = false;
      return;
    }
    router.refresh();
  }, [pathname, searchParams?.toString() ?? '', router]);

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
      <aside
        className="admin-shell-sidebar"
        data-open={sidebarOpen}
        data-collapsed={sidebarCollapsed}
      >
          <div className="admin-shell-sidebar-header">
            <div className="admin-shell-logo">
              <span className="material-symbols-outlined admin-shell-logo-icon">dashboard</span>
              <div className="admin-shell-logo-text">
                <h1 className="admin-shell-logo-title">Admin Portal</h1>
                <p className="admin-shell-logo-version">v2.0.4</p>
              </div>
            </div>
            <button
              type="button"
              className="admin-shell-sidebar-collapse-btn"
              aria-label={sidebarCollapsed ? 'Expand admin menu' : 'Collapse admin menu'}
              aria-expanded={!sidebarCollapsed}
              onClick={toggleSidebarCollapsed}
            >
              <span className="material-symbols-outlined admin-shell-icon" aria-hidden>
                {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
            <button
              type="button"
              aria-label="Close menu"
              className="admin-shell-close"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined admin-shell-icon">close</span>
            </button>
          </div>
          <nav className="admin-shell-nav" aria-label="Admin sections">
            {NAV_ITEMS.map(({ href, label, icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              const showPendingBadge =
                href === '/admin/info-comments' && pendingGuideComments > 0;
              const showChatBadge = href === '/admin/orders' && orderChatUnread > 0;
              const badgeCount = showPendingBadge
                ? pendingGuideComments
                : showChatBadge
                  ? orderChatUnread
                  : 0;
              const showBadge = showPendingBadge || showChatBadge;
              const badgeText = badgeCount > 99 ? '99+' : String(badgeCount);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className={`admin-shell-nav-link ${isActive ? 'active' : ''}`}
                  title={
                    sidebarCollapsed
                      ? showBadge
                        ? `${label} (${badgeCount}${showPendingBadge ? ' pending' : ' unread'})`
                        : label
                      : undefined
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="admin-shell-nav-icon-wrap">
                    <span className="material-symbols-outlined admin-shell-icon">{icon}</span>
                    {showBadge && (
                      <span
                        className="admin-shell-nav-badge admin-shell-nav-badge--collapsed"
                        aria-hidden
                      >
                        {badgeText}
                      </span>
                    )}
                  </span>
                  <span className="admin-shell-nav-label">{label}</span>
                  {showBadge && (
                    <span
                      className="admin-shell-nav-badge"
                      aria-label={
                        showPendingBadge
                          ? `${pendingGuideComments} pending comments`
                          : `${orderChatUnread} unread order chats`
                      }
                    >
                      {badgeText}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="admin-shell-sidebar-footer">
            <Link
              href="/admin/accounting/info"
              prefetch={false}
              className="admin-shell-nav-link admin-shell-nav-link-info"
              title={sidebarCollapsed ? 'Accounting info' : undefined}
            >
              <span className="material-symbols-outlined admin-shell-icon">info</span>
              <span className="admin-shell-nav-label">Accounting info</span>
            </Link>
            <Link
              href="/admin/settings/collections"
              prefetch={false}
              className="admin-shell-nav-link admin-shell-nav-link-info"
              title={sidebarCollapsed ? 'Settings' : undefined}
            >
              <span className="material-symbols-outlined admin-shell-icon">settings</span>
              <span className="admin-shell-nav-label">Settings</span>
            </Link>
            <a
              href="/api/auth/signout?callbackUrl=/admin/login"
              className="admin-shell-nav-link admin-shell-nav-link-logout"
              title={sidebarCollapsed ? 'Sign out' : undefined}
            >
              <span className="material-symbols-outlined admin-shell-icon">logout</span>
              <span className="admin-shell-nav-label">Sign out</span>
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
              prefetch={false}
              className="admin-shell-header-logout"
              aria-label="Settings"
              title="Settings"
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
