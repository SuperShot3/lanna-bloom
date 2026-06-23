'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const SECTIONS = [
  {
    id: 'overview',
    href: '/admin/accounting/overview',
    label: 'Overview',
    icon: 'account_balance_wallet',
  },
  {
    id: 'expenses',
    href: '/admin/accounting/expenses',
    label: 'Expenses',
    icon: 'receipt_long',
  },
  {
    id: 'income',
    href: '/admin/accounting/income',
    label: 'Income Records',
    icon: 'payments',
  },
  {
    id: 'payouts-transfers',
    href: '/admin/accounting/payouts-transfers',
    label: 'Payouts',
    icon: 'swap_horiz',
  },
  {
    id: 'ledger',
    href: '/admin/accounting/ledger',
    label: 'Ledger',
    icon: 'table_rows',
  },
] as const;

export type AccountingSectionId = (typeof SECTIONS)[number]['id'];

export interface AccountingSectionCounts {
  expenses?: number;
  income?: number;
  transfers?: number;
  ledger?: number;
}

function accountingSectionFromPath(pathname: string): AccountingSectionId {
  if (pathname.startsWith('/admin/accounting/overview')) return 'overview';
  if (pathname.startsWith('/admin/accounting/expenses')) return 'expenses';
  if (pathname.startsWith('/admin/accounting/payouts-transfers')) return 'payouts-transfers';
  if (pathname.startsWith('/admin/accounting/ledger')) return 'ledger';
  if (pathname.startsWith('/admin/accounting/income')) return 'income';
  return 'overview';
}

/** Keep date-range query params only (shared across Accounting sections). */
function periodParamsOnly(sp: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  for (const key of ['dateFrom', 'dateTo', 'period'] as const) {
    const v = sp.get(key);
    if (v) next.set(key, v);
  }
  return next;
}

function navHref(sectionHref: string, sp: URLSearchParams): string {
  const qs = periodParamsOnly(sp).toString();
  return qs ? `${sectionHref}?${qs}` : sectionHref;
}

interface Props {
  counts?: AccountingSectionCounts;
  mobilePanelChildren?: ReactNode;
  mode?: 'both' | 'desktop' | 'mobile';
}

export function AccountingSectionSwitcher({ counts, mobilePanelChildren, mode = 'both' }: Props) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();
  const active = accountingSectionFromPath(pathname);
  const activeSection = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];
  const selectValue = activeSection.href;
  const [mobileOpen, setMobileOpen] = useState(false);
  const showDesktop = mode !== 'mobile';
  const showMobile = mode !== 'desktop';

  return (
    <>
      {showDesktop ? (
      <div className="admin-accounting-switch-desktop" aria-hidden={false}>
        <nav className="admin-accounting-tabs" aria-label="Accounting sections">
          {SECTIONS.map((section) => {
            const activeHere = active === section.id;
            const count =
              section.id === 'expenses'
                ? counts?.expenses
                : section.id === 'income'
                  ? counts?.income
                  : section.id === 'payouts-transfers'
                    ? counts?.transfers
                    : section.id === 'ledger'
                      ? counts?.ledger
                      : undefined;
            return (
              <Link
                key={section.id}
                href={navHref(section.href, sp)}
                prefetch={false}
                className={`admin-accounting-tab${activeHere ? ' admin-accounting-tab-active' : ''}`}
                aria-current={activeHere ? 'page' : undefined}
              >
                <span className="material-symbols-outlined">{section.icon}</span>
                {section.label}
                {typeof count === 'number' && count > 0 && (
                  <span className="admin-accounting-tab-count">{count}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      ) : null}

      {showMobile ? (
      <div className={`admin-accounting-switch-mobile${mobileOpen ? ' admin-accounting-switch-mobile-open' : ''}`}>
        <button
          type="button"
          className="admin-accounting-mobile-section-toggle"
          aria-expanded={mobileOpen}
          aria-controls="admin-accounting-section-panel"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="admin-accounting-mobile-section-copy">
            <span className="material-symbols-outlined" aria-hidden>
              {activeSection.icon}
            </span>
            <strong>{activeSection.label}</strong>
          </span>
        </button>
        {mobileOpen ? (
          <div id="admin-accounting-section-panel" className="admin-accounting-mobile-section-panel">
            <select
              id="admin-accounting-section-select"
              className="admin-select admin-accounting-section-select"
              aria-label="Accounting section"
              value={selectValue}
              onChange={(e) => {
                setMobileOpen(false);
                router.push(navHref(e.target.value, sp));
              }}
            >
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.href}>
                  {section.label}
                </option>
              ))}
            </select>
            {mobilePanelChildren}
          </div>
        ) : null}
      </div>
      ) : null}
    </>
  );
}
