'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { GiftIcon } from '@/components/icons';
import { CATALOG_OCCASION_CHIPS } from '@/lib/catalogCategories';
import { translations, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const OCCASION_CHIPS = CATALOG_OCCASION_CHIPS.filter((chip) => chip.value !== '');

function occasionHref(catalogHref: string, value: string) {
  return `${catalogHref}?occasion=${value}`;
}

function useActiveOccasion() {
  const searchParams = useSearchParams();
  const occasion = searchParams?.get('occasion') ?? '';
  return OCCASION_CHIPS.some((chip) => chip.value === occasion) ? occasion : null;
}

export function OccasionsNavDropdown({
  lang,
  catalogHref,
  label,
}: {
  lang: Locale;
  catalogHref: string;
  label: string;
}) {
  const tCatalog = translations[lang].catalog;
  const activeOccasion = useActiveOccasion();
  const active = Boolean(activeOccasion);

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
        {OCCASION_CHIPS.map((chip) => {
          const isActive = activeOccasion === chip.value;
          return (
            <DropdownMenuItem key={chip.value} asChild>
              <Link
                href={occasionHref(catalogHref, chip.value)}
                className={cn(
                  'cursor-pointer text-sm font-medium normal-case tracking-normal',
                  isActive && 'bg-[#C5A059]/12 text-[#C5A059]',
                )}
              >
                {tCatalog[chip.labelKey]}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OccasionsMobileNav({
  lang,
  catalogHref,
  label,
  onNavigate,
}: {
  lang: Locale;
  catalogHref: string;
  label: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const tCatalog = translations[lang].catalog;
  const activeOccasion = useActiveOccasion();
  const active = Boolean(activeOccasion);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className={cn(
          'nav-item nav-item--mobile w-full justify-between',
          active && 'nav-item--active',
        )}
        aria-expanded={open}
        aria-controls="mobile-occasions-submenu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="nav-item__icon" aria-hidden>
            <GiftIcon size={22} />
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
        <div id="mobile-occasions-submenu" className="flex flex-col gap-0.5 pb-1 pt-1">
          {OCCASION_CHIPS.map((chip) => {
            const isActive = activeOccasion === chip.value;
            return (
              <Link
                key={chip.value}
                href={occasionHref(catalogHref, chip.value)}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-sm font-medium text-[#1A3C34] transition-colors hover:bg-[#C5A059]/10 hover:text-[#C5A059]',
                  isActive && 'bg-[#C5A059]/12 text-[#C5A059]',
                )}
                onClick={onNavigate}
              >
                {tCatalog[chip.labelKey]}
              </Link>
            );
          })}
        </div>
      </OverlayReveal>
    </div>
  );
}
