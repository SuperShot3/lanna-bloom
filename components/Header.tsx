'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Locale, locales, translations } from '@/lib/i18n';
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
  CartIcon,
  HomeIcon,
  SearchIcon,
  InfoIcon,
  PhoneIcon,
  MapIcon,
  MenuIcon,
  StorefrontIcon,
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
import { useCheckoutStickyHeader } from '@/contexts/CheckoutStickyHeaderContext';
import { useMobileCartHeaderCollapse } from '@/hooks/useMobileCartHeaderCollapse';
import { CheckoutCompactHeaderBar } from '@/components/checkout/CheckoutCompactHeaderBar';
import { isCatalogProductDetailPath } from '@/lib/catalogProductPath';

const SCROLL_THRESHOLD = 10;
const MOBILE_BREAKPOINT = 768;
const localePathPrefixPattern = new RegExp(`^/(${locales.join('|')})(?=/|$)`);
const DEFAULT_DELIVERY_DESTINATION_ID: DeliveryDestinationId = 'CHIANG_MAI';

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
  const contactHref = `/${lang}/contact`;
  const infoHref = `/${lang}/info`;
  const trackOrderHref = `/${lang}/track-order`;
  const customOrderHref = `/${lang}/custom-order`;
  const t = translations[lang].nav;
  const { count: cartCount, lastAddEventId } = useCart();
  const deliveryPickerCopy = getDeliveryPickerCopy(lang);

  const isCartPage = pathname === cartHref || pathname === `${cartHref}/`;
  const isProductDetailPage = isCatalogProductDetailPath(basePath);
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
  const { payload: checkoutStickyPayload, setCollapseMode } = useCheckoutStickyHeader();
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

  const mobileCartCheckoutHeader = isMobile && isCartPage && checkoutStickyPayload != null;
  const mobilePdpScrollHeader = isMobile && isProductDetailPage;
  const mobileScrollHeaderCollapse = mobileCartCheckoutHeader || mobilePdpScrollHeader;
  const headerCollapseMode = useMobileCartHeaderCollapse({
    enabled: mobileScrollHeaderCollapse,
    menuOpen,
    onModeChange: mobileCartCheckoutHeader ? setCollapseMode : undefined,
  });

  useEffect(() => {
    const hideBottomSticky = mobileCartCheckoutHeader && headerCollapseMode === 'compact';
    document.body.classList.toggle('cart-checkout-header-compact', hideBottomSticky);
    return () => document.body.classList.remove('cart-checkout-header-compact');
  }, [mobileCartCheckoutHeader, headerCollapseMode]);

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
        className={`fixed w-full z-50 border-b overflow-x-clip transition-[top,colors] duration-300 ${mobileCartCheckoutHeader ? 'site-header--cart-checkout' : ''} ${mobilePdpScrollHeader ? 'site-header--pdp-scroll' : ''} ${hasTopPromoBanner ? 'top-[calc(2.25rem+env(safe-area-inset-top,0px))]' : 'top-0'} ${glassNavClass}`}
        data-scrolled={isScrolled}
        data-header-mode={mobileScrollHeaderCollapse ? headerCollapseMode : undefined}
      >
        {mobileCartCheckoutHeader && checkoutStickyPayload ? (
          <CheckoutCompactHeaderBar payload={checkoutStickyPayload} lang={lang} />
        ) : null}
        <div
          className="site-header__full max-w-7xl mx-auto h-20 flex items-center justify-between gap-2 sm:gap-4 md:grid-none"
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
                src="/logo_icon_64.png"
                alt=""
                width={40}
                height={40}
                className="w-10 h-10 shrink-0 object-contain rounded-full bg-transparent"
              />
              <span className="site-header__brand-text font-[family-name:var(--font-family-display)] text-[clamp(1rem,4vw,1.5rem)] font-semibold tracking-tight text-[#1A3C34] leading-none truncate max-w-[45vw] sm:max-w-none">
                Lanna Bloom
              </span>
            </Link>
            {!isMobile && (
              <nav
                className="hidden md:flex items-center gap-8 font-medium text-sm tracking-wide uppercase"
                aria-label="Main"
              >
                <Suspense
                  fallback={
                    <span className="inline-flex items-center gap-1 uppercase tracking-wide text-[#1A3C34]">
                      {t.catalog}
                    </span>
                  }
                >
                  <CatalogNavDropdown
                    lang={lang}
                    catalogHref={catalogHref}
                    label={t.catalog}
                    pathActive={basePath === '/catalog' || basePath.startsWith('/catalog/')}
                  />
                </Suspense>
                <Suspense
                  fallback={
                    <span className="inline-flex items-center gap-1 uppercase tracking-wide text-[#1A3C34]">
                      {t.occasions}
                    </span>
                  }
                >
                  <OccasionsNavDropdown
                    lang={lang}
                    catalogHref={catalogHref}
                    label={t.occasions}
                  />
                </Suspense>
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
          <div className="relative z-[2] flex h-11 items-center gap-0.5 sm:gap-2 md:gap-3 shrink-0">
            <div className="hidden md:block">
              <DeliveryProvincePicker
                lang={lang}
                value={selectedDeliveryDestination}
                valueLabel={selectedDeliveryName}
                copy={deliveryPickerCopy}
                variant="desktop"
                onChange={handleDeliveryDestinationChange}
              />
            </div>
            <Link
              href={cartHref}
              className="relative order-1 flex h-11 w-11 shrink-0 items-center justify-center text-[#1A3C34] md:order-3"
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
            <div className="order-2 md:order-2">
              <LanguageSwitcher
                currentLang={lang}
                pathBase={basePath || '/'}
                variant="dropdown"
              />
            </div>
            <button
              type="button"
              className="order-3 flex h-11 w-11 shrink-0 items-center justify-center text-[#1A3C34] md:hidden"
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
          menuOpen ? 'visible pointer-events-auto' : 'hidden pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
          <div
            className="absolute inset-0 bg-[#1A3C34]/25 transition-opacity duration-250"
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
                  pathActive={basePath === '/catalog' || basePath.startsWith('/catalog/')}
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
                icon={<StorefrontIcon name="edit-note" size={22} />}
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
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            {copy.current}
          </p>
          {select}
        </div>
      </div>
    </section>
  );
}
