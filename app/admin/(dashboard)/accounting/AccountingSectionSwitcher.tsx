'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
    label: 'Payouts & Transfers',
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
}

export function AccountingSectionSwitcher({ counts }: Props) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const sp = searchParams ?? new URLSearchParams();
  const active = accountingSectionFromPath(pathname);
  const selectValue = SECTIONS.find((s) => s.id === active)?.href ?? '/admin/accounting/overview';

  return (
    <>
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

      <div className="admin-accounting-switch-mobile">
        <label className="admin-hint" htmlFor="admin-accounting-section-select" style={{ display: 'block', marginBottom: 6 }}>
          Accounting section
        </label>
        <select
          id="admin-accounting-section-select"
          className="admin-select admin-accounting-section-select"
          aria-label="Accounting section"
          value={selectValue}
          onChange={(e) => router.push(navHref(e.target.value, sp))}
        >
          {SECTIONS.map((section) => (
            <option key={section.id} value={section.href}>
              {section.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
