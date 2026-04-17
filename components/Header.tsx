'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Locale, translations } from '@/lib/i18n';
import { useCart } from '@/contexts/CartContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavItem } from './NavItem';
import {
  CartIcon,
  HomeIcon,
  SearchIcon,
  CatalogIcon,
  GiftIcon,
  UsersIcon,
  InfoIcon,
  PhoneIcon,
  MapIcon,
} from './icons';

const SCROLL_THRESHOLD = 10;
const MOBILE_BREAKPOINT = 768;

export function Header({
  lang,
  hasPrimeHourBanner = false,
}: {
  lang: Locale;
  hasPrimeHourBanner?: boolean;
}) {
  const pathname = usePathname();
  const basePath = pathname?.replace(/^\/(en|th)/, '') || '';
  const homeHref = `/${lang}`;
  const catalogHref = `/${lang}/catalog`;
  const occasionsHref = `/${lang}/catalog`;
  const partnerApplyHref = `https://www.lannabloom.shop/${lang}/partner/apply`;
  const cartHref = `/${lang}/cart`;
  const contactHref = `/${lang}/contact`;
  const infoHref = `/${lang}/info`;
  const trackOrderHref = `/${lang}/track-order`;
  const customOrderHref = `/${lang}/custom-order`;
  const t = translations[lang].nav;
  const { count: cartCount, lastAddEventId } = useCart();

  const isCartPage = pathname === cartHref || pathname === `${cartHref}/`;
  const isHomePage = pathname === homeHref || pathname === `${homeHref}/`;

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Pulsation stays on the main (home) page until the user opens the cart.
  const [cartPulseAddId, setCartPulseAddId] = useState(0);

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
                  active={basePath === '/catalog'}
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
                  href={partnerApplyHref}
                  label={t.becomePartner}
                  active={false}
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
            <Link
              href={catalogHref}
              className="flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-full border border-stone-200 px-0 text-sm font-medium text-[#1A3C34] transition-all hover:bg-stone-50 md:min-w-0 md:px-4"
              aria-label={t.search}
              title={t.search}
            >
              <span className="material-symbols-outlined text-2xl leading-none md:text-xl">
                search
              </span>
              <span className="hidden md:inline">{t.search}</span>
            </Link>
            <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
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
                active={basePath === '/catalog'}
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
                href={partnerApplyHref}
                label={t.becomePartner}
                icon={<UsersIcon size={22} />}
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
                href={infoHref}
                label={t.information}
                icon={<InfoIcon size={22} />}
                active={basePath === '/info'}
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
    </>
  );
}
