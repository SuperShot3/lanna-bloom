'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { CatalogIcon } from '@/components/icons';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { translations, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Short catalog nav — only categories we currently sell. */
const CATALOG_NAV_ITEMS = [
  { id: 'flowers', label: (lang: Locale) => translations[lang].catalog.topCategoryFlowers },
  { id: 'roses', label: (lang: Locale) => lang === 'th' ? 'ช่อกุหลาบ' : 'Rose Bouquets' },
  { id: 'orchids', label: (lang: Locale) => lang === 'th' ? 'ช่อกล้วยไม้' : 'Orchid Arrangements' },
  { id: 'toys', label: (lang: Locale) => translations[lang].catalog.topCategoryPlushyToys },
  { id: 'balloons', label: (lang: Locale) => translations[lang].catalog.topCategoryBalloons },
  { id: 'candy', label: (lang: Locale) => translations[lang].home.productSectionSweets },
] as const;

type CatalogNavId = (typeof CATALOG_NAV_ITEMS)[number]['id'];

function catalogNavHref(catalogHref: string, lang: Locale, id: CatalogNavId): string {
  switch (id) {
    case 'flowers':
      return catalogHref;
    case 'roses':
      return `/${lang}/collections/roses-chiang-mai`;
    case 'orchids':
      return `/${lang}/collections/orchids-chiang-mai`;
    case 'toys':
      return `${catalogHref}${buildCatalogSearchString({ topCategory: 'plushy_toys' })}`;
    case 'balloons':
      return `${catalogHref}${buildCatalogSearchString({ topCategory: 'balloons' })}`;
    case 'candy':
      return `${catalogHref}${buildCatalogSearchString({ topCategory: 'food_sweets' })}`;
  }
}

function useActiveCatalogNavId(): CatalogNavId | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const topCategory = searchParams?.get('topCategory') ?? '';

  if (pathname?.endsWith('/collections/roses-chiang-mai')) return 'roses';
  if (pathname?.endsWith('/collections/orchids-chiang-mai')) return 'orchids';
  if (topCategory === 'plushy_toys') return 'toys';
  if (topCategory === 'balloons') return 'balloons';
  if (topCategory === 'food_sweets') return 'candy';
  if (!topCategory || topCategory === 'flowers') return 'flowers';
  return null;
}

export function CatalogNavDropdown({
  lang,
  catalogHref,
  label,
  pathActive = false,
}: {
  lang: Locale;
  catalogHref: string;
  label: string;
  /** True when the current path is under /catalog (ignoring query). */
  pathActive?: boolean;
}) {
  const activeId = useActiveCatalogNavId();
  const active = pathActive && activeId != null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 uppercase tracking-wide text-[#1A3C34] hover:text-[#C5A059] transition-colors outline-none',
            active && 'text-[#C5A059]',
          )}
          aria-label={label}
        >
          <span>{label}</span>
          <ChevronDown className="size-3.5 opacity-70" strokeWidth={2} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[120] min-w-[12rem] border-stone-200 bg-[#FDFCF8] text-[#1A3C34] shadow-lg shadow-[#1A3C34]/8"
      >
        {CATALOG_NAV_ITEMS.map((item) => {
          const isActive = pathActive && activeId === item.id;
          return (
            <DropdownMenuItem key={item.id} asChild>
              <Link
                href={catalogNavHref(catalogHref, lang, item.id)}
                className={cn(
                  'cursor-pointer text-sm font-medium normal-case tracking-normal',
                  isActive && 'bg-[#C5A059]/12 text-[#C5A059]',
                )}
              >
                {item.label(lang)}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CatalogMobileNav({
  lang,
  catalogHref,
  label,
  pathActive = false,
  onNavigate,
}: {
  lang: Locale;
  catalogHref: string;
  label: string;
  pathActive?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activeId = useActiveCatalogNavId();
  const active = pathActive && activeId != null;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className={cn(
          'nav-item nav-item--mobile w-full justify-between',
          active && 'nav-item--active',
        )}
        aria-expanded={open}
        aria-controls="mobile-catalog-submenu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="nav-item__icon" aria-hidden>
            <CatalogIcon size={22} />
          </span>
          <span className="nav-item__label">{label}</span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-stone-400 transition-transform duration-200',
            open && 'rotate-180 text-[#C5A059]',
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <OverlayReveal open={open} className="pl-2">
        <div id="mobile-catalog-submenu" className="flex flex-col gap-0.5 pb-1 pt-1">
          {CATALOG_NAV_ITEMS.map((item) => {
            const isActive = pathActive && activeId === item.id;
            return (
              <Link
                key={item.id}
                href={catalogNavHref(catalogHref, lang, item.id)}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-sm font-medium text-[#1A3C34] transition-colors hover:bg-[#C5A059]/10 hover:text-[#C5A059]',
                  isActive && 'bg-[#C5A059]/12 text-[#C5A059]',
                )}
                onClick={onNavigate}
              >
                {item.label(lang)}
              </Link>
            );
          })}
        </div>
      </OverlayReveal>
    </div>
  );
}
