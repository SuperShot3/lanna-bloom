'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import { InfoIcon } from '@/components/icons';
import { translations, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Featured guides in the nav dropdown.
 * Same-day (conversion) + Sunday flowers (weekday culture) + hotels (tourist/expat)
 * — hospital stays on the hub but is no longer the only spotlight.
 */
const FEATURED_GUIDE_SLUGS = [
  'same-day-flower-delivery-chiang-mai',
  'sunday-flowers-thailand',
  'flower-delivery-to-hotels-chiang-mai',
] as const;

type FeaturedGuideSlug = (typeof FEATURED_GUIDE_SLUGS)[number];

const FEATURED_LABEL_KEY: Record<
  FeaturedGuideSlug,
  'guideNavSameDay' | 'guideNavSunday' | 'guideNavHotel'
> = {
  'same-day-flower-delivery-chiang-mai': 'guideNavSameDay',
  'sunday-flowers-thailand': 'guideNavSunday',
  'flower-delivery-to-hotels-chiang-mai': 'guideNavHotel',
};

function useActiveGuideSlug(lang: Locale): string | null {
  const pathname = usePathname() ?? '';
  const prefix = `/${lang}/info/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).replace(/\/$/, '');
  const slug = rest.split('/')[0] ?? '';
  return FEATURED_GUIDE_SLUGS.includes(slug as FeaturedGuideSlug) ? slug : null;
}

function featuredGuideHref(lang: Locale, slug: FeaturedGuideSlug): string {
  return `/${lang}/info/${slug}`;
}

export function GuidesNavDropdown({
  lang,
  infoHref,
  label,
  pathActive = false,
}: {
  lang: Locale;
  infoHref: string;
  label: string;
  /** True when the current path is under /info. */
  pathActive?: boolean;
}) {
  const t = translations[lang].nav;
  const activeSlug = useActiveGuideSlug(lang);
  const active = pathActive;

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
        className="z-[120] min-w-[14rem] border-stone-200 bg-[#FDFCF8] text-[#1A3C34] shadow-lg shadow-[#1A3C34]/8"
      >
        {FEATURED_GUIDE_SLUGS.map((slug) => {
          const isActive = activeSlug === slug;
          return (
            <DropdownMenuItem key={slug} asChild>
              <Link
                href={featuredGuideHref(lang, slug)}
                className={cn(
                  'cursor-pointer text-sm font-medium normal-case tracking-normal',
                  isActive && 'bg-[#C5A059]/12 text-[#C5A059]',
                )}
              >
                {t[FEATURED_LABEL_KEY[slug]]}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="bg-stone-200" />
        <DropdownMenuItem asChild>
          <Link
            href={infoHref}
            className={cn(
              'cursor-pointer text-sm font-semibold normal-case tracking-normal text-[#C5A059]',
              pathActive && !activeSlug && 'bg-[#C5A059]/12',
            )}
          >
            {t.seeAllGuides}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GuidesMobileNav({
  lang,
  infoHref,
  label,
  pathActive = false,
  onNavigate,
}: {
  lang: Locale;
  infoHref: string;
  label: string;
  pathActive?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const t = translations[lang].nav;
  const activeSlug = useActiveGuideSlug(lang);
  const active = pathActive;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className={cn(
          'nav-item nav-item--mobile w-full justify-between',
          active && 'nav-item--active',
        )}
        aria-expanded={open}
        aria-controls="mobile-guides-submenu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="nav-item__icon" aria-hidden>
            <InfoIcon size={22} />
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
        <div id="mobile-guides-submenu" className="flex flex-col gap-0.5 pb-1 pt-1">
          {FEATURED_GUIDE_SLUGS.map((slug) => {
            const isActive = activeSlug === slug;
            return (
              <Link
                key={slug}
                href={featuredGuideHref(lang, slug)}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-sm font-medium text-[#1A3C34] transition-colors hover:bg-[#C5A059]/10 hover:text-[#C5A059]',
                  isActive && 'bg-[#C5A059]/12 text-[#C5A059]',
                )}
                onClick={onNavigate}
              >
                {t[FEATURED_LABEL_KEY[slug]]}
              </Link>
            );
          })}
          <Link
            href={infoHref}
            className={cn(
              'rounded-lg px-3 py-2.5 text-sm font-semibold text-[#C5A059] transition-colors hover:bg-[#C5A059]/10',
              pathActive && !activeSlug && 'bg-[#C5A059]/12',
            )}
            onClick={onNavigate}
          >
            {t.seeAllGuides}
          </Link>
        </div>
      </OverlayReveal>
    </div>
  );
}
