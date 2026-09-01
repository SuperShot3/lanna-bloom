'use client';

import { useState, useEffect, useRef, useCallback, Suspense, type FocusEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Locale, locales, translations } from '@/lib/i18n';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import { useCart } from '@/contexts/CartContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavItem } from './NavItem';
import {
  CatalogMobileNav,
  CatalogNavDropdown,
} from './CatalogNavDropdown';
import {
  OccasionsMobileNav,
  OccasionsNavDropdown,
} from './OccasionsNavDropdown';
import {
  GuidesMobileNav,
  GuidesNavDropdown,
} from './GuidesNavDropdown';
import {
  CartIcon,
  HomeIcon,
  SearchIcon,
  MapIcon,
  MenuIcon,
  InfoIcon,
} from './icons';
import {
  destinationDisplayName,
  getMarketByPathSlug,
  getNavMarkets,
  isMarketPathSlug,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import {
  MARKET_SESSION_CHANGE_EVENT,
  readMarketSession,
} from '@/lib/delivery/marketSession';
import {
  commitDeliveryDestination,
  DEFAULT_DELIVERY_DESTINATION_ID,
} from '@/lib/delivery/commitDeliveryDestination';
import { useCheckoutStickyHeader } from '@/contexts/CheckoutStickyHeaderContext';
import { useSmartStickyHeader } from '@/hooks/useSmartStickyHeader';
import { CheckoutCompactHeaderBar } from '@/components/checkout/CheckoutCompactHeaderBar';
import { CurrencySelector } from '@/components/CurrencyDisplay';
import { ThemeToggle } from '@/components/ThemeToggle';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/header/lockBodyScroll';

const localePathPrefixPattern = new RegExp(`^/(${locales.join('|')})(?=/|$)`);

type DeliveryPickerCopy = {
  eyebrow: string;
  current: string;
  selectLabel: string;
};

function getDeliveryPickerCopy(lang: Locale): DeliveryPickerCopy {
  if (lang === 'th') {
    return {
      eyebrow: 'จัดส่งถึง',
      current: 'เขตปัจจุบัน',
      selectLabel: 'เลือกเขตจัดส่ง',
    };
  }

  return {
    eyebrow: 'Deliver to',
    current: 'Current district',
    selectLabel: 'Choose delivery district',
  };
}

export function Header({
  lang,
  hasTopPromoBanner = false,
}: {
  lang: Locale;
  hasTopPromoBanner?: boolean;
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
  const cartHref = `/${lang}/cart`;
  const aboutHref = `/${lang}/about`;
  const deliveryAreasHref = `/${lang}/delivery-areas-thailand`;
  const infoHref = `/${lang}/info`;
  const trackOrderHref = `/${lang}/track-order`;
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { payload: checkoutStickyPayload, setCollapseMode } = useCheckoutStickyHeader();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Pulsation stays on the main (home) page until the user opens the cart.
  const [cartPulseAddId, setCartPulseAddId] = useState(0);

  useEffect(() => {
    const load = () => {
      const s = readMarketSession();
      setSessionMarketSlug(s?.pathSlug ?? null);
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener(MARKET_SESSION_CHANGE_EVENT, load);
    return () => {
      window.removeEventListener('focus', load);
      window.removeEventListener(MARKET_SESSION_CHANGE_EVENT, load);
    };
  }, []);

  const cartHasCheckoutPayload = isCartPage && checkoutStickyPayload != null;
  const {
    hidden: headerHidden,
    isScrolled,
    collapseMode: headerCollapseMode,
    isMobile,
  } = useSmartStickyHeader({
    variant: cartHasCheckoutPayload ? 'cart-compact' : 'hide',
    menuOpen,
    overlayOpen,
    onCollapseModeChange: cartHasCheckoutPayload ? setCollapseMode : undefined,
  });
  const mobileCartCheckoutHeader = isMobile && cartHasCheckoutPayload;

  useEffect(() => {
    const hideBottomSticky = mobileCartCheckoutHeader && headerCollapseMode === 'compact';
    document.body.classList.toggle('cart-checkout-header-compact', hideBottomSticky);
    return () => document.body.classList.remove('cart-checkout-header-compact');
  }, [mobileCartCheckoutHeader, headerCollapseMode]);

  useEffect(() => {
    const collapsed = headerHidden && !mobileCartCheckoutHeader;
    document.documentElement.classList.toggle('site-header-collapsed', collapsed);
    return () => document.documentElement.classList.remove('site-header-collapsed');
  }, [headerHidden, mobileCartCheckoutHeader]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    lockBodyScroll();
    return () => {
      document.removeEventListener('keydown', handleEscape);
      unlockBodyScroll();
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      setTouchStartX(null);
      setSwipeOffset(0);
    }
  }, [menuOpen]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    if (menuOpen) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
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
      const { pathSlug } = commitDeliveryDestination(nextDestination, {
        lang,
        navigate: !isCartPage,
        router,
      });
      setSessionMarketSlug(pathSlug);
      setMenuOpen(false);
    },
    [isCartPage, lang, router]
  );

  const handleOverlayOpenChange = useCallback((open: boolean) => {
    if (open) {
      setOverlayOpen(true);
      return;
    }
    const active = document.activeElement;
    if (headerRef.current?.contains(active)) return;
    if (
      active instanceof Element &&
      (active.closest('[data-radix-popper-content-wrapper]') ||
        active.closest('[data-header-overlay]'))
    ) {
      return;
    }
    setOverlayOpen(false);
  }, []);

  const handleHeaderBlurCapture = useCallback((event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    if (
      next instanceof Element &&
      (next.closest('[data-radix-popper-content-wrapper]') ||
        next.closest('[data-header-overlay]'))
    ) {
      return;
    }
    window.setTimeout(() => {
      const active = document.activeElement;
      if (headerRef.current?.contains(active)) return;
      if (
        active instanceof Element &&
        (active.closest('[data-radix-popper-content-wrapper]') ||
          active.closest('[data-header-overlay]'))
      ) {
        return;
      }
      setOverlayOpen(false);
    }, 0);
  }, []);

  const glassNavClass = isScrolled
    ? 'site-header--glass site-header--glass-scrolled'
    : isMobile
      ? 'site-header--glass site-header--glass-mobile'
      : 'site-header--glass';

  return (
    <>
      <header
        ref={headerRef}
        className={`site-header fixed w-full border-b ${menuOpen ? 'z-[111]' : 'z-50'} ${mobileCartCheckoutHeader ? 'site-header--cart-checkout' : ''} ${hasTopPromoBanner ? 'site-header--below-promo top-[calc(2.25rem+env(safe-area-inset-top,0px))]' : 'top-0'} ${glassNavClass}`}
        data-scrolled={isScrolled ? 'true' : 'false'}
        data-header-hidden={headerHidden && !mobileCartCheckoutHeader ? 'true' : 'false'}
        data-header-mode={mobileCartCheckoutHeader ? headerCollapseMode : undefined}
        onFocusCapture={() => setOverlayOpen(true)}
        onBlurCapture={handleHeaderBlurCapture}
      >
        {mobileCartCheckoutHeader && checkoutStickyPayload ? (
          <CheckoutCompactHeaderBar payload={checkoutStickyPayload} lang={lang} />
        ) : null}
        <div
          className="site-header__full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 md:grid-none"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div className="flex items-center gap-2 md:gap-8 min-w-0 flex-1 overflow-hidden">
            <Link
              href={homeHref}
              className="flex items-center gap-2 group min-h-[40px] min-w-0"
              aria-label={t.home}
            >
              <Image
                src={BRAND_LOGO_SRC}
                alt="Lanna Bloom logo"
                width={40}
                height={40}
                className="w-10 h-10 shrink-0 object-contain rounded-full bg-transparent"
              />
              <span className="site-header__brand-text font-[family-name:var(--font-family-display)] text-[clamp(1rem,4vw,1.5rem)] font-semibold tracking-tight text-[var(--text)] leading-none truncate max-w-[45vw] sm:max-w-none">
                Lanna Bloom
              </span>
            </Link>
            <nav
              className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 font-medium text-sm tracking-wide uppercase"
              aria-label="Main"
            >
                <Suspense
                  fallback={
                    <span className="inline-flex items-center gap-1 uppercase tracking-wide text-[var(--text)]">
                      {t.catalog}
                    </span>
                  }
                >
                  <CatalogNavDropdown
                    lang={lang}
                    catalogHref={catalogHref}
                    label={t.catalog}
                    pathActive={
                      basePath === '/catalog' ||
                      basePath.startsWith('/catalog/') ||
                      basePath.startsWith('/collections/')
                    }
                    onOpenChange={handleOverlayOpenChange}
                  />
                </Suspense>
                <Suspense
                  fallback={
                    <span className="inline-flex items-center gap-1 uppercase tracking-wide text-[var(--text)]">
                      {t.occasions}
                    </span>
                  }
                >
                  <OccasionsNavDropdown
                    lang={lang}
                    catalogHref={catalogHref}
                    label={t.occasions}
                    onOpenChange={handleOverlayOpenChange}
                  />
                </Suspense>
                <GuidesNavDropdown
                  lang={lang}
                  infoHref={infoHref}
                  label={t.information}
                  pathActive={basePath === '/info' || basePath.startsWith('/info/')}
                  onOpenChange={handleOverlayOpenChange}
                />
                <NavItem
                  href={deliveryAreasHref}
                  label={t.deliveryAreas}
                  active={basePath === '/delivery-areas-thailand'}
                  variant="pill"
                  className="!bg-transparent !border-0 text-[var(--text)] hover:text-[#C5A059] transition-colors !p-0 !min-h-0"
                />
                <NavItem
                  href={aboutHref}
                  label={t.aboutUs}
                  active={basePath === '/about'}
                  variant="pill"
                  className="!bg-transparent !border-0 text-[var(--text)] hover:text-[#C5A059] transition-colors !p-0 !min-h-0"
                />
            </nav>
          </div>
          <div className="relative z-[2] flex h-11 items-center gap-0.5 sm:gap-2 md:gap-3 shrink-0">
            <div className="hidden md:block">
              <DeliveryProvincePicker
                lang={lang}
                value={selectedDeliveryDestination}
                valueLabel={selectedDeliveryName}
                copy={deliveryPickerCopy}
                variant="desktop"
                onChange={handleDeliveryDestinationChange}
                onOpenChange={handleOverlayOpenChange}
              />
            </div>
            <div className="hidden sm:block">
              <CurrencySelector lang={lang} />
            </div>
            <Link
              href={cartHref}
              className="relative order-1 flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text)] md:order-3"
              aria-label={t.cart}
              title={t.cart}
            >
              <CartIcon size={24} className="relative z-10" />
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
            <div className="order-2 flex items-center">
              <ThemeToggle lang={lang} />
            </div>
            <div className="order-2 md:order-2">
              <LanguageSwitcher
                currentLang={lang}
                pathBase={basePath || '/'}
                variant="dropdown"
                onOpenChange={handleOverlayOpenChange}
              />
            </div>
            <button
              type="button"
              className="order-3 flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text)] md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <MenuIcon size={24} />
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        ref={menuRef}
        className={`fixed inset-0 z-[110] transition-[visibility] duration-250 md:hidden ${
          menuOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
          <div
            className="absolute inset-0 bg-[#1A3C34]/25 transition-opacity duration-250"
            style={{ opacity: menuOpen ? 1 : 0 }}
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === 'Enter' && setMenuOpen(false)}
            role="button"
            tabIndex={menuOpen ? 0 : -1}
            aria-label="Close menu"
          />
          <div
            className="absolute top-0 right-0 bottom-0 w-[min(280px,85vw)] bg-[var(--bg)] shadow-[-4px_0_24px_rgba(26,60,52,0.12)] pb-14 pt-[calc(3.5rem+env(safe-area-inset-top,0px)+0.75rem)] px-6 flex flex-col gap-6 transform transition-transform duration-250"
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
              className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-2xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--pastel-cream)] rounded-lg transition-colors"
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
            <CurrencySelector lang={lang} className="block w-full" variant="mobile" />
            <nav className="flex flex-col gap-2" aria-label="Main">
              <NavItem
                href={homeHref}
                label={t.home}
                icon={<HomeIcon size={22} />}
                active={basePath === ''}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <Suspense
                fallback={
                  <span className="nav-item nav-item--mobile">{t.catalog}</span>
                }
              >
                <CatalogMobileNav
                  lang={lang}
                  catalogHref={catalogHref}
                  label={t.catalog}
                  pathActive={
                    basePath === '/catalog' ||
                    basePath.startsWith('/catalog/') ||
                    basePath.startsWith('/collections/')
                  }
                  onNavigate={() => setMenuOpen(false)}
                />
              </Suspense>
              <Suspense
                fallback={
                  <span className="nav-item nav-item--mobile">{t.occasions}</span>
                }
              >
                <OccasionsMobileNav
                  lang={lang}
                  catalogHref={catalogHref}
                  label={t.occasions}
                  onNavigate={() => setMenuOpen(false)}
                />
              </Suspense>
              <GuidesMobileNav
                lang={lang}
                infoHref={infoHref}
                label={t.information}
                pathActive={basePath === '/info' || basePath.startsWith('/info/')}
                onNavigate={() => setMenuOpen(false)}
              />
              <NavItem
                href={deliveryAreasHref}
                label={t.deliveryAreas}
                icon={<MapIcon size={22} />}
                active={basePath === '/delivery-areas-thailand'}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={aboutHref}
                label={t.aboutUs}
                icon={<InfoIcon size={22} />}
                active={basePath === '/about'}
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
    </>
  );
}

function DeliveryProvincePicker({
  lang,
  value,
  valueLabel,
  copy,
  variant,
  onChange,
  onOpenChange,
}: {
  lang: Locale;
  value: DeliveryDestinationId;
  valueLabel: string;
  copy: DeliveryPickerCopy;
  variant: 'desktop' | 'mobile';
  onChange: (destination: DeliveryDestinationId) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const select = (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as DeliveryDestinationId)}
      onFocus={() => onOpenChange?.(true)}
      onBlur={() => onOpenChange?.(false)}
      aria-label={copy.selectLabel}
      style={
        variant === 'desktop'
          ? { width: `${Math.min(Math.max(valueLabel.length + 6, 14), 19)}ch` }
          : undefined
      }
      className={
        variant === 'desktop'
          ? 'min-w-0 max-w-[132px] cursor-pointer bg-transparent pr-0 text-xs font-semibold text-[var(--text)] outline-none'
          : 'mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text)] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20'
      }
    >
      <option value={DEFAULT_DELIVERY_DESTINATION_ID}>
        {destinationDisplayName(DEFAULT_DELIVERY_DESTINATION_ID, lang)}
      </option>
      {getNavMarkets().map((market) => (
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
        className={`hidden h-10 shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] px-2.5 text-[var(--text)] transition-[max-width,background-color] duration-300 hover:bg-[var(--muted)] lg:flex whitespace-nowrap ${
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
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--pastel-cream)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[#C5A059] shadow-sm">
          <MapIcon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {copy.current}
          </p>
          {select}
        </div>
      </div>
    </section>
  );
}
