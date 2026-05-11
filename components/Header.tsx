'use client';

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Locale, locales, translations } from '@/lib/i18n';
import { useCart } from '@/contexts/CartContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavItem } from './NavItem';
import {
  CartIcon,
  HomeIcon,
  SearchIcon,
  CatalogIcon,
  GiftIcon,
  InfoIcon,
  PhoneIcon,
  MapIcon,
} from './icons';
import {
  MARKETS,
  destinationDisplayName,
  getMarketByPathSlug,
  isMarketPathSlug,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import {
  clearMarketSession,
  readMarketSession,
  writeMarketSession,
} from '@/lib/delivery/marketSession';

const SCROLL_THRESHOLD = 10;
const MOBILE_BREAKPOINT = 768;
const localePathPrefixPattern = new RegExp(`^/(${locales.join('|')})(?=/|$)`);
const DEFAULT_DELIVERY_DESTINATION_ID: DeliveryDestinationId = 'CHIANG_MAI';

export function Header({
  lang,
  hasPrimeHourBanner = false,
}: {
  lang: Locale;
  hasPrimeHourBanner?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = pathname?.replace(localePathPrefixPattern, '') || '';
  const pathParts = pathname?.split('/').filter(Boolean) ?? [];
  const maybeMarketSlug =
    pathParts[1] === 'catalog' && pathParts[2] ? pathParts[2] : pathParts[1];
  const activeMarket =
    maybeMarketSlug && isMarketPathSlug(maybeMarketSlug)
      ? getMarketByPathSlug(maybeMarketSlug)
      : null;
  const [sessionMarketSlug, setSessionMarketSlug] = useState<string | null>(null);
  const sessionMarket =
    sessionMarketSlug && isMarketPathSlug(sessionMarketSlug)
      ? getMarketByPathSlug(sessionMarketSlug)
      : null;
  const effectiveMarket = activeMarket ?? sessionMarket;
  const selectedDeliveryDestination =
    effectiveMarket?.destinationId ?? DEFAULT_DELIVERY_DESTINATION_ID;
  const selectedDeliveryName = destinationDisplayName(selectedDeliveryDestination, lang);
  const marketFlowerDeliveryHref = effectiveMarket
    ? `/${lang}/${effectiveMarket.pathSlug}/flower-delivery`
    : null;
  const homeHref = marketFlowerDeliveryHref ?? `/${lang}`;
  const catalogHref = effectiveMarket
    ? `/${lang}/catalog/${effectiveMarket.pathSlug}`
    : `/${lang}/catalog`;
  const occasionsHref = catalogHref;
  const cartHref = `/${lang}/cart`;
  const contactHref = `/${lang}/contact`;
  const infoHref = `/${lang}/info`;
  const trackOrderHref = `/${lang}/track-order`;
  const customOrderHref = `/${lang}/custom-order`;
  const t = translations[lang].nav;
  const { count: cartCount, lastAddEventId } = useCart();
  const deliveryPickerCopy = getDeliveryPickerCopy(lang);

  const isCartPage = pathname === cartHref || pathname === `${cartHref}/`;
  const isHomePage =
    pathname === homeHref ||
    pathname === `${homeHref}/` ||
    Boolean(
      marketFlowerDeliveryHref &&
        (pathname === marketFlowerDeliveryHref || pathname === `${marketFlowerDeliveryHref}/`)
    );

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Pulsation stays on the main (home) page until the user opens the cart.
  const [cartPulseAddId, setCartPulseAddId] = useState(0);

  useEffect(() => {
    const load = () => {
      const s = readMarketSession();
      setSessionMarketSlug(s?.pathSlug ?? null);
    };
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  useEffect(() => {
    const checkScroll = () => setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isScrolled) setMenuOpen(false);
  }, [isScrolled]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      setTouchStartX(null);
      setSwipeOffset(0);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (lastAddEventId === 0) return;
    if (isCartPage) return;
    // Keep pulsing until cart is opened.
    setCartPulseAddId(lastAddEventId);
  }, [lastAddEventId, isCartPage]);

  useEffect(() => {
    if (!isCartPage) return;
    // Stop once cart is opened.
    setCartPulseAddId(0);
  }, [isCartPage]);

  useEffect(() => {
    if (cartCount === 0) setCartPulseAddId(0);
  }, [cartCount]);

  const handleDeliveryDestinationChange = useCallback(
    (nextDestination: DeliveryDestinationId) => {
      if (nextDestination === DEFAULT_DELIVERY_DESTINATION_ID) {
        clearMarketSession();
        setSessionMarketSlug(null);
        setMenuOpen(false);
        router.push(`/${lang}/catalog`);
        return;
      }

      const market = MARKETS.find((m) => m.destinationId === nextDestination);
      if (!market) {
        clearMarketSession();
        setSessionMarketSlug(null);
        setMenuOpen(false);
        router.push(`/${lang}/catalog`);
        return;
      }

      writeMarketSession({
        destinationId: market.destinationId,
        pathSlug: market.pathSlug,
      });
      setSessionMarketSlug(market.pathSlug);
      setMenuOpen(false);
      router.push(`/${lang}/${market.pathSlug}/flower-delivery`);
    },
    [lang, router]
  );

  const glassNavClass = isScrolled
    ? 'bg-[rgba(253,252,248,0.9)] backdrop-blur-xl border-stone-200'
    : 'bg-[rgba(253,252,248,0.8)] backdrop-blur-xl border-stone-200';

  return (
    <>
      <header
        className={`fixed w-full z-50 border-b transition-[top,colors] duration-300 overflow-x-clip ${hasPrimeHourBanner ? 'top-[calc(2.25rem+env(safe-area-inset-top,0px))]' : 'top-0'} ${glassNavClass}`}
        data-scrolled={isScrolled}
      >
        <div
          className="max-w-7xl mx-auto h-20 flex items-center justify-between gap-2 sm:gap-4"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div className="flex items-center gap-2 md:gap-8 min-w-0 flex-1">
            <Link
              href={homeHref}
              className="flex items-center gap-2 group min-h-[40px] min-w-0"
              aria-label={t.home}
            >
              <Image
                src="/logo_icon_64.png"
                alt=""
                width={40}
                height={40}
                className="w-10 h-10 shrink-0 object-contain rounded-full bg-transparent"
              />
              <span className="font-[family-name:var(--font-family-display)] text-[clamp(1rem,4vw,1.5rem)] font-semibold tracking-tight text-[#1A3C34] leading-none truncate max-w-[45vw] sm:max-w-none">
                Lanna Bloom
              </span>
            </Link>
            {!isMobile && (
              <nav
                className="hidden md:flex items-center gap-8 font-medium text-sm tracking-wide uppercase"
                aria-label="Main"
              >
                <NavItem
                  href={catalogHref}
                  label={t.catalog}
                  active={basePath === '/catalog' || basePath.startsWith('/catalog/')}
                  variant="pill"
                  className="!bg-transparent !border-0 text-[#1A3C34] hover:text-[#C5A059] transition-colors !p-0 !min-h-0"
                />
                <NavItem
                  href={occasionsHref}
                  label={t.occasions}
                  active={false}
                  variant="pill"
                  className="!bg-transparent !border-0 text-[#1A3C34] hover:text-[#C5A059] transition-colors !p-0 !min-h-0"
                />
                <NavItem
                  href={infoHref}
                  label={t.information}
                  active={basePath === '/info'}
                  variant="pill"
                  className="!bg-transparent !border-0 text-[#1A3C34] hover:text-[#C5A059] transition-colors !p-0 !min-h-0"
                />
                <NavItem
                  href={customOrderHref}
                  label={t.customOrder}
                  active={basePath === '/custom-order'}
                  variant="pill"
                  className="!bg-transparent !border-0 text-[#1A3C34] hover:text-[#C5A059] transition-colors !p-0 !min-h-0"
                />
              </nav>
            )}
          </div>
          <div className="flex h-11 items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
            {!isMobile && (
              <DeliveryProvincePicker
                lang={lang}
                value={selectedDeliveryDestination}
                valueLabel={selectedDeliveryName}
                copy={deliveryPickerCopy}
                variant="desktop"
                onChange={handleDeliveryDestinationChange}
              />
            )}
            <Suspense
              fallback={
                <HeaderSearchLink
                  href={`${catalogHref}?openSearch=1`}
                  label={t.search}
                  title={t.search}
                />
              }
            >
              <HeaderSearchControl
                lang={lang}
                basePath={basePath}
                catalogHref={catalogHref}
              />
            </Suspense>
            <div className="hidden md:block">
              <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
            </div>
            <Link
              href={cartHref}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center text-[#1A3C34]"
              aria-label={t.cart}
              title={t.cart}
            >
              <span className="material-symbols-outlined text-2xl leading-none relative z-10">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[#C5A059] text-[10px] text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
              {cartPulseAddId > 0 && cartCount > 0 && isHomePage && !isCartPage && (
                <span
                  key={`cart-pulse-${cartPulseAddId}`}
                  aria-hidden="true"
                  className="cart-helper-pulse cart-helper-pulse--visible"
                />
              )}
            </Link>
            {isMobile && (
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-[#1A3C34]"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
              >
                <span className="material-symbols-outlined text-2xl leading-none">menu</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {isMobile && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className={`fixed inset-0 z-[110] transition-[visibility] duration-250 ${
            menuOpen ? 'visible' : 'invisible pointer-events-none'
          }`}
          aria-hidden={!menuOpen}
        >
          <div
            className="absolute inset-0 bg-[#1A3C34]/25 opacity-0 transition-opacity duration-250"
            style={{ opacity: menuOpen ? 1 : 0 }}
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === 'Enter' && setMenuOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <div
            className="absolute top-0 right-0 bottom-0 w-[min(280px,85vw)] bg-[#FDFCF8] shadow-[-4px_0_24px_rgba(26,60,52,0.12)] pb-14 pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.25rem))] px-6 flex flex-col gap-6 transform transition-transform duration-250"
            style={{
              transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
            }}
            onTouchStart={(e) => {
              setTouchStartX(e.touches[0].clientX);
              setSwipeOffset(0);
            }}
            onTouchMove={(e) => {
              if (touchStartX === null) return;
              const delta = e.touches[0].clientX - touchStartX;
              if (delta > 0) setSwipeOffset(delta);
            }}
            onTouchEnd={() => {
              if (swipeOffset >= 60) setMenuOpen(false);
              setTouchStartX(null);
              setSwipeOffset(0);
            }}
          >
            <button
              type="button"
              className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-2xl text-stone-500 hover:text-[#1A3C34] hover:bg-[#F9F5F0] rounded-lg transition-colors"
              onClick={() => setMenuOpen(false)}
              aria-label={translations[lang].catalog.close}
            >
              ×
            </button>
            <DeliveryProvincePicker
              lang={lang}
              value={selectedDeliveryDestination}
              valueLabel={selectedDeliveryName}
              copy={deliveryPickerCopy}
              variant="mobile"
              onChange={handleDeliveryDestinationChange}
            />
            <section className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                {lang === 'th' ? 'ภาษา' : 'Language'}
              </p>
              <LanguageSwitcher
                currentLang={lang}
                pathBase={basePath || '/'}
                variant="flags"
                onNavigate={() => setMenuOpen(false)}
              />
            </section>
            <nav className="flex flex-col gap-2" aria-label="Main">
              <NavItem
                href={homeHref}
                label={t.home}
                icon={<HomeIcon size={22} />}
                active={basePath === ''}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={catalogHref}
                label={t.catalog}
                icon={<CatalogIcon size={22} />}
                active={basePath === '/catalog' || basePath.startsWith('/catalog/')}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={occasionsHref}
                label={t.occasions}
                icon={<GiftIcon size={22} />}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={infoHref}
                label={t.information}
                icon={<InfoIcon size={22} />}
                active={basePath === '/info'}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={customOrderHref}
                label={t.customOrder}
                icon={
                  <span className="material-symbols-outlined text-[22px] leading-none w-[22px] flex items-center justify-center">
                    edit_note
                  </span>
                }
                active={basePath === '/custom-order'}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={contactHref}
                label={t.contactUs}
                icon={<PhoneIcon size={22} />}
                active={basePath === '/contact'}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={trackOrderHref}
                label={t.trackOrder}
                icon={<SearchIcon size={18} />}
                active={basePath === '/track-order'}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
            </nav>
          </div>
        </div>
      )}
      <style jsx global>{`
        .header-search-trigger,
        .header-search-panel {
          will-change: transform, opacity;
          transition:
            width 220ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 220ms ease,
            transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 220ms ease;
        }
        .header-search-panel {
          animation: headerSearchExpand 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .header-search-trigger-label {
          display: none;
        }
        /* Hide browser-native search clear icon so only our custom clear button is shown. */
        :global(.header-search-panel input[type='search']::-webkit-search-cancel-button),
        :global(.header-search-panel input[type='search']::-webkit-search-decoration),
        :global(.header-search-panel input[type='search']::-webkit-search-results-button),
        :global(.header-search-panel input[type='search']::-webkit-search-results-decoration) {
          -webkit-appearance: none;
          appearance: none;
          display: none;
        }
        .header-search-trigger-label--query {
          display: inline-block;
          max-width: 16ch;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (min-width: 768px) {
          .header-search-trigger-label {
            display: inline-block;
            max-width: 18ch;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        @keyframes headerSearchExpand {
          from {
            opacity: 0;
            transform: translateX(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}

type DeliveryPickerCopy = {
  eyebrow: string;
  current: string;
  selectLabel: string;
};

function getDeliveryPickerCopy(lang: Locale): DeliveryPickerCopy {
  if (lang === 'th') {
    return {
      eyebrow: 'จัดส่งถึง',
      current: 'พื้นที่จัดส่งปัจจุบัน',
      selectLabel: 'เลือกพื้นที่จัดส่ง',
    };
  }

  return {
    eyebrow: 'Deliver to',
    current: 'Current delivery area',
    selectLabel: 'Choose delivery area',
  };
}

function DeliveryProvincePicker({
  lang,
  value,
  valueLabel,
  copy,
  variant,
  onChange,
}: {
  lang: Locale;
  value: DeliveryDestinationId;
  valueLabel: string;
  copy: DeliveryPickerCopy;
  variant: 'desktop' | 'mobile';
  onChange: (destination: DeliveryDestinationId) => void;
}) {
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const select = (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as DeliveryDestinationId)}
      aria-label={copy.selectLabel}
      style={
        variant === 'desktop'
          ? { width: `${Math.min(Math.max(valueLabel.length + 6, 14), 19)}ch` }
          : undefined
      }
      className={
        variant === 'desktop'
          ? 'min-w-0 max-w-[132px] cursor-pointer bg-transparent pr-0 text-xs font-semibold text-[#1A3C34] outline-none'
          : 'mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-[#1A3C34] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20'
      }
    >
      <option value={DEFAULT_DELIVERY_DESTINATION_ID}>
        {destinationDisplayName(DEFAULT_DELIVERY_DESTINATION_ID, lang)}
      </option>
      {MARKETS.map((market) => (
        <option key={market.destinationId} value={market.destinationId}>
          {lang === 'th' ? market.customerFacingNameTh : market.customerFacingNameEn}
        </option>
      ))}
    </select>
  );

  if (variant === 'desktop') {
    return (
      <label
        onClick={() => setIsDesktopExpanded(true)}
        onFocus={() => setIsDesktopExpanded(true)}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget;
          if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            setIsDesktopExpanded(false);
          }
        }}
        className={`hidden h-10 shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-stone-200 bg-white/70 px-2.5 text-[#1A3C34] transition-[max-width,background-color] duration-300 hover:bg-stone-50 lg:flex whitespace-nowrap ${
          isDesktopExpanded ? 'max-w-[240px]' : 'max-w-[180px]'
        }`}
      >
        <MapIcon size={16} className="shrink-0 text-[#C5A059]" />
        <span
          className={`shrink-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-400 transition-[max-width,opacity] duration-300 ${
            isDesktopExpanded ? 'max-w-[64px] opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          {copy.eyebrow}
        </span>
        {select}
      </label>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-[#F9F5F0] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#C5A059] shadow-sm">
          <MapIcon size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            {copy.current}
          </p>
          <p className="mt-1 truncate text-base font-semibold text-[#1A3C34]">{valueLabel}</p>
        </div>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-stone-500">{copy.selectLabel}</span>
        {select}
      </label>
    </section>
  );
}

function HeaderSearchLink({
  href,
  label,
  title,
  query,
}: {
  href: string;
  label: string;
  title: string;
  query?: string;
}) {
  return (
    <Link
      href={href}
      className="header-search-trigger flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-full border border-stone-200 px-0 text-sm font-medium text-[#1A3C34] transition-all hover:bg-stone-50 md:min-w-0 md:px-4"
      aria-label={label}
      title={title}
    >
      <span className="material-symbols-outlined text-2xl leading-none md:text-xl">
        search
      </span>
      <span className={`header-search-trigger-label ${query ? 'header-search-trigger-label--query' : ''}`}>
        {query || label}
      </span>
    </Link>
  );
}

function HeaderSearchControl({
  lang,
  basePath,
  catalogHref,
}: {
  lang: Locale;
  basePath: string;
  catalogHref: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? '';
  const isCatalogPage = basePath === '/catalog' || basePath.startsWith('/catalog/');
  const headerSearchOpen = isCatalogPage && searchParams?.get('openSearch') === '1';
  const headerSearchQuery = searchParams?.get('q') ?? '';
  const [searchDraft, setSearchDraft] = useState(headerSearchQuery);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const tNav = translations[lang].nav;
  const tCatalog = translations[lang].catalog;

  const searchHref = useMemo(() => {
    if (isCatalogPage) {
      const qs = new URLSearchParams(searchParamsString);
      qs.set('openSearch', '1');
      const query = qs.toString();
      return query ? `${catalogHref}?${query}` : catalogHref;
    }
    return `${catalogHref}?openSearch=1`;
  }, [catalogHref, isCatalogPage, searchParamsString]);

  useEffect(() => {
    setSearchDraft(headerSearchQuery);
  }, [headerSearchQuery]);

  const updateHeaderSearch = useCallback(
    (value: string) => {
      const qs = new URLSearchParams(searchParamsString);
      qs.set('openSearch', '1');
      const normalized = value.trim();
      if (normalized.length > 0) qs.set('q', value);
      else qs.delete('q');
      const next = qs.toString();
      router.replace(next ? `${catalogHref}?${next}` : catalogHref);
    },
    [catalogHref, router, searchParamsString]
  );

  const closeHeaderSearch = useCallback(
    (keepQuery = true) => {
      const qs = new URLSearchParams(searchParamsString);
      qs.delete('openSearch');
      if (keepQuery) {
        if (searchDraft.length > 0) qs.set('q', searchDraft);
        else qs.delete('q');
      } else {
        qs.delete('q');
      }
      const next = qs.toString();
      router.replace(next ? `${catalogHref}?${next}` : catalogHref);
    },
    [catalogHref, router, searchDraft, searchParamsString]
  );

  useEffect(() => {
    if (!headerSearchOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (searchPanelRef.current?.contains(target)) return;
      closeHeaderSearch(true);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [headerSearchOpen, closeHeaderSearch]);

  if (!headerSearchOpen) {
    return (
      <HeaderSearchLink
        href={searchHref}
        label={tNav.search}
        title={tNav.search}
        query={headerSearchQuery}
      />
    );
  }

  return (
    <div
      ref={searchPanelRef}
      className="header-search-panel flex h-11 items-center gap-1 rounded-full border border-stone-200 bg-white pl-2 pr-1 min-w-[210px] sm:min-w-[260px] md:min-w-[320px]"
    >
      <span className="material-symbols-outlined text-xl leading-none text-stone-500" aria-hidden>
        search
      </span>
      <input
        type="search"
        value={searchDraft}
        onChange={(e) => {
          const next = e.target.value;
          setSearchDraft(next);
          updateHeaderSearch(next);
        }}
        placeholder={tCatalog.searchPlaceholder}
        aria-label={tCatalog.searchPlaceholder}
        className="h-9 flex-1 min-w-0 border-0 bg-transparent text-sm text-[#1A3C34] outline-none"
        autoFocus
      />
      {searchDraft.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setSearchDraft('');
            updateHeaderSearch('');
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
          aria-label={tCatalog.clearFilters}
        >
          <span className="material-symbols-outlined text-lg leading-none">close</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => closeHeaderSearch(true)}
        className="flex h-9 items-center justify-center rounded-full px-2 text-xs font-semibold text-[#1A3C34] hover:bg-stone-100"
      >
        {tCatalog.close}
      </button>
    </div>
  );
}
