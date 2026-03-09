'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Locale, translations } from '@/lib/i18n';
import { useCart } from '@/contexts/CartContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavItem } from './NavItem';
import { CartIcon, HomeIcon, SearchIcon } from './icons';

const SCROLL_THRESHOLD = 10;
const MOBILE_BREAKPOINT = 768;

export function Header({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const basePath = pathname?.replace(/^\/(en|th)/, '') || '';
  const homeHref = `/${lang}`;
  const catalogHref = `/${lang}/catalog`;
  const occasionsHref = `/${lang}/catalog`;
  const partnersHref = `/${lang}#partners`;
  const reviewsHref = `/${lang}/reviews`;
  const cartHref = `/${lang}/cart`;
  const contactHref = `/${lang}/contact`;
  const infoHref = `/${lang}/info`;
  const trackOrderHref = `/${lang}/track-order`;
  const t = translations[lang].nav;
  const { count: cartCount } = useCart();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const glassNavClass = isScrolled
    ? 'bg-[rgba(253,252,248,0.9)] backdrop-blur-xl border-stone-200'
    : 'bg-[rgba(253,252,248,0.8)] backdrop-blur-xl border-stone-200';

  return (
    <>
      <header
        className={`fixed w-full z-50 border-b transition-colors duration-300 ${glassNavClass}`}
        data-scrolled={isScrolled}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6 md:gap-8">
            <Link
              href={homeHref}
              className="flex items-center gap-2.5 group min-h-[40px]"
              aria-label={t.home}
            >
              <Image
                src="/logo_icon_64.png"
                alt=""
                width={40}
                height={40}
                className="w-10 h-10 shrink-0 object-contain rounded-full bg-transparent"
              />
              <span className="font-[family-name:var(--font-family-display)] text-2xl font-semibold tracking-tight text-[#1A3C34] leading-none">
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
                  href={partnersHref}
                  label={t.ourPartners}
                  active={false}
                  variant="pill"
                  className="!bg-transparent !border-0 text-[#1A3C34] hover:text-[#C5A059] transition-colors !p-0 !min-h-0"
                />
                <NavItem
                  href={reviewsHref}
                  label={t.reviews}
                  active={basePath === '/reviews'}
                  variant="pill"
                  className="!bg-transparent !border-0 text-[#1A3C34] hover:text-[#C5A059] transition-colors !p-0 !min-h-0"
                />
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4 ml-[5px]">
            {!isMobile && (
              <Link
                href={catalogHref}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-all"
              >
                <span className="material-symbols-outlined text-xl">search</span>
                <span>{t.search}</span>
              </Link>
            )}
            <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
            <Link
              href={cartHref}
              className="relative p-2 text-[#1A3C34]"
              aria-label={t.cart}
              title={t.cart}
            >
              <span className="material-symbols-outlined text-2xl mt-[5px]">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#C5A059] text-white text-[10px] flex items-center justify-center rounded-full mt-[5px]">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            {isMobile && (
              <button
                type="button"
                className="p-2 text-[#1A3C34]"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {isMobile && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className={`fixed inset-0 z-[110] pointer-events-none invisible transition-[visibility] duration-250 ${
            menuOpen ? 'pointer-events-auto visible' : ''
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
            className="absolute top-0 right-0 bottom-0 w-[min(280px,85vw)] bg-[#FDFCF8] shadow-[-4px_0_24px_rgba(26,60,52,0.12)] p-14 px-6 flex flex-col gap-6 transform transition-transform duration-250"
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
                active={basePath === '/catalog'}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={occasionsHref}
                label={t.occasions}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={partnersHref}
                label={t.ourPartners}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={reviewsHref}
                label={t.reviews}
                active={basePath === '/reviews'}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={infoHref}
                label={t.information}
                active={basePath === '/info'}
                variant="mobile"
                onClick={() => setMenuOpen(false)}
              />
              <NavItem
                href={contactHref}
                label={t.contactUs}
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
