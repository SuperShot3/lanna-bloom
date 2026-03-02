'use client';

/**
 * Header refactor: All nav items use NavItem component with same DOM structure.
 * Root cause of icon+text wrapping: inconsistent markup (Home had icon+text, others text-only;
 * header-action-link used different classes). Fix: unified NavItem with flex, align-items:center,
 * white-space:nowrap on label. No internal scroll; responsive via hamburger at 600px.
 */
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
const MOBILE_BREAKPOINT = 600;

export function Header({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const basePath = pathname?.replace(/^\/(en|th)/, '') || '';
  const homeHref = `/${lang}`;
  const catalogHref = `/${lang}/catalog`;
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
    const checkScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isScrolled === false) setMenuOpen(false);
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

  const showBurger = isMobile; // Show hamburger on mobile regardless of scroll state
  const showActions = !showBurger;

  return (
    <>
      <header
        className={`header ${isScrolled ? 'header--scrolled' : ''}`}
        data-scrolled={isScrolled}
      >
        <div className="container header-inner">
          <Link href={homeHref} className="logo" aria-label={t.home}>
            <Image
              src="/logo_full_master.png"
              alt="Lanna Bloom"
              width={96}
              height={80}
              className="logo-img"
              priority
              sizes="(max-width: 600px) 80px, 96px"
            />
          </Link>
          {!isMobile && (
            <nav className="nav nav--desktop" aria-label="Main">
              <NavItem href={homeHref} label={t.home} icon={<HomeIcon size={18} />} active={basePath === ''} variant="pill" />
              <NavItem href={catalogHref} label={t.catalog} active={basePath === '/catalog'} variant="pill" />
              <NavItem href={infoHref} label={t.information} active={basePath === '/info'} variant="pill" />
              <NavItem href={contactHref} label={t.contactUs} active={basePath === '/contact'} variant="pill" />
            </nav>
          )}
          {showActions && (
            <div className="header-actions">
              <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
              <Link
                href={cartHref}
                className="header-cart-link"
                aria-label={t.cart}
                title={t.cart}
              >
                <span className="header-cart-icon-wrap">
                  <CartIcon size={24} className="header-cart-icon" />
                  {cartCount > 0 && (
                    <span className="header-cart-badge" aria-hidden>
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
              </Link>
              <NavItem href={trackOrderHref} label={t.trackOrder} icon={<SearchIcon size={18} />} active={basePath === '/track-order'} variant="action" />
            </div>
          )}
          {isMobile && (
            <div className="mobile-header-actions">
              <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
              <Link
                href={cartHref}
                className="mobile-header-cart-link"
                aria-label={t.cart}
                title={t.cart}
              >
                <span className="mobile-header-cart-icon-wrap">
                  <CartIcon size={22} className="mobile-header-cart-icon" />
                  {cartCount > 0 && (
                    <span className="mobile-header-cart-badge" aria-hidden>
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
              </Link>
              <NavItem href={trackOrderHref} label={t.trackOrder} icon={<SearchIcon size={18} />} active={basePath === '/track-order'} variant="action" className="nav-item--mobile-compact" />
              <button
                type="button"
                className="burger"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
              >
                <span className={`burger-line ${menuOpen ? 'burger-line--open' : ''}`} />
                <span className={`burger-line ${menuOpen ? 'burger-line--open' : ''}`} />
                <span className={`burger-line ${menuOpen ? 'burger-line--open' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </header>

      {isMobile && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className={`mobile-menu ${menuOpen ? 'mobile-menu--open' : ''}`}
          aria-hidden={!menuOpen}
        >
        <div
          className="mobile-menu-backdrop"
          onClick={() => setMenuOpen(false)}
          onKeyDown={(e) => e.key === 'Enter' && setMenuOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
        <div
          className="mobile-menu-panel"
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
          style={
            menuOpen && swipeOffset > 0
              ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' }
              : undefined
          }
        >
          <button
            type="button"
            className="mobile-menu-close"
            onClick={() => setMenuOpen(false)}
            aria-label={translations[lang].catalog.close}
          >
            <span aria-hidden>×</span>
          </button>
          <nav className="mobile-menu-nav" aria-label="Main">
            <NavItem href={homeHref} label={t.home} icon={<HomeIcon size={22} />} active={basePath === ''} variant="mobile" onClick={() => setMenuOpen(false)} />
            <NavItem href={catalogHref} label={t.catalog} active={basePath === '/catalog'} variant="mobile" onClick={() => setMenuOpen(false)} />
            <NavItem href={infoHref} label={t.information} active={basePath === '/info'} variant="mobile" onClick={() => setMenuOpen(false)} />
            <NavItem href={contactHref} label={t.contactUs} active={basePath === '/contact'} variant="mobile" onClick={() => setMenuOpen(false)} />
          </nav>
        </div>
      </div>
      )}

      <style jsx>{`
        /* Tweak header icons & pills here: */
        .header {
          --header-icon-offset-y: 0px; /* e.g. 2px or 4px to nudge icons down */
          --header-pill-bg: #ebe6e0; /* darker bg for Home/Track order - try #e8e2db or var(--pastel-cream) for lighter */
          --header-pill-bg-hover: #e0d9d0;
          position: sticky;
          top: 0;
          left: var(--visual-viewport-offset-left, 0);
          width: var(--visual-viewport-width, 100%);
          right: 0;
          z-index: 100;
          background: var(--surface);
          border-bottom: 1px solid transparent;
          padding-top: env(safe-area-inset-top);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
          overflow: visible;
        }
        .header--scrolled {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: saturate(180%) blur(16px);
          -webkit-backdrop-filter: saturate(180%) blur(16px);
          border-bottom-color: rgba(235, 230, 224, 0.5);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
        }
        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: nowrap;
          gap: 24px;
          padding: 0 24px;
          height: 64px;
          min-height: 64px;
          overflow: visible;
          transition: height 0.25s ease, padding 0.25s ease;
        }
        .header--scrolled .header-inner {
          height: 56px;
          min-height: 56px;
          padding: 0 24px;
        }
        .logo {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          height: 64px;
          overflow: visible;
          -webkit-tap-highlight-color: transparent;
          tap-highlight-color: transparent;
          -webkit-user-select: none;
          user-select: none;
          outline: none;
          box-shadow: none;
          background: transparent;
        }
        .logo:focus,
        .logo:active,
        .logo:focus-visible {
          outline: none;
          box-shadow: none;
          background: transparent;
        }
        .header--scrolled .logo {
          height: 56px;
        }
        .logo-img {
          display: block;
          height: 80px !important;
          width: 96px !important;
          object-fit: contain;
          object-position: left center;
          transition: height 0.25s ease, width 0.25s ease;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          box-shadow: none;
          pointer-events: none;
        }
        .header--scrolled .logo-img {
          height: 48px !important;
          width: 58px !important;
        }
        .nav--desktop {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          gap: 8px;
          flex: 1;
          justify-content: center;
          margin: 0 24px;
          min-width: 0;
        }
        /* NavItem: unified structure for all nav links. Root cause of wrap: inconsistent DOM + missing nowrap. */
        :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          white-space: nowrap;
          min-height: 44px;
          padding: 10px 14px;
          font-size: 0.9375rem;
          font-weight: 600;
          line-height: 1.2;
          color: var(--text-muted);
          text-decoration: none;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
          transition: color 0.2s, background 0.2s, border-color 0.2s;
        }
        :global(.nav-item):focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        :global(.nav-item__icon) {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.9;
        }
        :global(.nav-item__icon) svg {
          display: block;
        }
        :global(.nav-item__label) {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.nav-item--pill) {
          background: transparent;
          border-color: transparent;
        }
        :global(.nav-item--pill:hover) {
          color: var(--text);
        }
        :global(.nav-item--pill.nav-item--active) {
          background: var(--header-pill-bg);
          border-color: var(--border);
          color: var(--accent);
          font-weight: 700;
        }
        :global(.nav-item--pill.nav-item--active:hover) {
          background: var(--header-pill-bg-hover);
          border-color: var(--accent-soft);
        }
        :global(.nav-item--action) {
          padding: 8px 12px;
          font-size: 0.875rem;
          background: var(--header-pill-bg);
          border-color: var(--border);
        }
        :global(.nav-item--action:hover) {
          background: var(--header-pill-bg-hover);
          border-color: var(--accent-soft);
          color: var(--accent);
        }
        :global(.nav-item--action.nav-item--active) {
          background: var(--header-pill-bg-hover);
          border-color: var(--accent-soft);
          color: var(--accent);
          font-weight: 700;
        }
        :global(.nav-item--mobile-compact) {
          padding: 8px;
          min-width: 36px;
          min-height: 36px;
          justify-content: center;
        }
        :global(.nav-item--mobile-compact .nav-item__label) {
          display: none;
        }
        :global(.nav-item--mobile) {
          width: 100%;
          padding: 12px 0;
          min-height: 44px;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          border-radius: 0;
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--text);
          text-align: left;
          justify-content: flex-start;
        }
        :global(.nav-item--mobile:hover),
        :global(.nav-item--mobile.nav-item--active) {
          color: var(--accent);
        }
        :global(.nav-item--mobile):focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .header-actions {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          gap: 12px;
          flex-shrink: 0;
        }
        .header-cart-link {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .header-cart-link:hover {
          background: var(--pastel-cream);
          border-color: var(--accent-soft);
          color: var(--accent);
        }
        .header-cart-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }
        .header-cart-icon {
          flex-shrink: 0;
          display: block;
          height: 30px;
          transform: translateY(var(--header-icon-offset-y, 0));
        }
        .header-cart-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          color: #fff;
          font-size: 0.7rem;
          font-weight: 700;
          border-radius: 999px;
        }
        .mobile-header-cart-icon {
          transform: translateY(var(--header-icon-offset-y, 0));
        }
        .burger {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 44px;
          height: 44px;
          padding: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text);
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }
        .burger:hover {
          background: var(--pastel-cream);
        }
        .burger-line {
          display: block;
          width: 20px;
          height: 2px;
          background: currentColor;
          border-radius: 1px;
          transition: transform 0.25s ease, opacity 0.25s ease;
        }
        .burger-line--open:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .burger-line--open:nth-child(2) {
          opacity: 0;
        }
        .burger-line--open:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }
        .mobile-header-actions {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          flex-shrink: 0;
          gap: 8px;
        }
        .mobile-header-cart-link {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--pastel-cream);
          color: var(--text);
          transition: background 0.2s, transform 0.15s;
          text-decoration: none;
        }
        .mobile-header-cart-link:active {
          background: var(--accent-soft);
          transform: scale(0.95);
        }
        .mobile-header-cart-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
        }
        .mobile-header-cart-icon {
          flex-shrink: 0;
        }
        .mobile-header-cart-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 999px;
        }
        @media (min-width: 601px) {
          .mobile-header-actions {
            display: none;
          }
        }
        @media (min-width: 1201px) {
          .header-inner {
            max-width: none;
            width: 100%;
          }
        }
        @media (max-width: 600px) {
          .nav--desktop {
            display: none;
          }
          .header-actions {
            display: none !important;
          }
          .header-inner {
            padding: 0 16px;
            height: 48px;
            min-height: 48px;
          }
          .header--scrolled .header-inner {
            height: 44px;
            min-height: 44px;
            padding: 0 12px;
          }
          .logo {
            height: 48px;
          }
          .header--scrolled .logo {
            height: 44px;
          }
          .logo-img {
            height: 80px !important;
            width: 96px !important;
          }
          .header--scrolled .logo-img {
            height: 44px !important;
            width: 53px !important;
          }
          .burger {
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
          }
          .header--scrolled .burger {
            width: 28px;
            height: 28px;
            min-width: 28px;
            min-height: 28px;
          }
          .burger-line {
            width: 16px;
          }
          .header--scrolled .burger-line {
            width: 14px;
          }
          .mobile-header-actions {
            gap: 6px;
          }
          .mobile-header-cart-link {
            width: 32px;
            height: 32px;
          }
          .mobile-header-cart-icon-wrap {
            width: 20px;
            height: 20px;
          }
          .header--scrolled .mobile-header-cart-link {
            width: 30px;
            height: 30px;
          }
          .header--scrolled .mobile-header-cart-icon-wrap {
            width: 18px;
            height: 18px;
          }
        }
        @media (max-width: 400px) {
          .header-inner {
            padding: 0 12px;
          }
          .header--scrolled .header-inner {
            padding: 0 10px;
          }
          .header-actions {
            gap: 8px;
          }
        }
        @media (max-width: 360px) {
          .header-inner {
            padding: 0 10px;
          }
          .header--scrolled .header-inner {
            padding: 0 8px;
          }
        }
        @media (max-width: 350px) {
          .header-inner {
            padding: 0 8px;
          }
          .header--scrolled .header-inner {
            padding: 0 6px;
          }
          .header-actions {
            gap: 6px;
          }
          .header-cart-link {
            width: 36px;
            height: 36px;
          }
          .mobile-header-actions {
            gap: 4px;
          }
          .mobile-header-cart-link {
            width: 28px;
            height: 28px;
          }
          .mobile-header-cart-icon-wrap {
            width: 18px;
            height: 18px;
          }
          .logo-img {
            height: 70px !important;
            width: 84px !important;
          }
          .header--scrolled .logo-img {
            height: 40px !important;
            width: 48px !important;
          }
        }
        @media (min-width: 601px) {
          .burger {
            display: none;
          }
        }

        .mobile-menu {
          --header-icon-offset-y: 0px;
          --header-pill-bg: #ebe6e0;
          --header-pill-bg-hover: #e0d9d0;
          position: fixed;
          top: var(--visual-viewport-offset-top, 0);
          left: var(--visual-viewport-offset-left, 0);
          width: var(--visual-viewport-width, 100%);
          height: var(--visual-viewport-height, 100%);
          z-index: 110;
          pointer-events: none;
          visibility: hidden;
          transition: visibility 0.25s ease;
          transform: translateZ(0);
        }
        .mobile-menu--open {
          pointer-events: auto;
          visibility: visible;
        }
        .mobile-menu-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .mobile-menu--open .mobile-menu-backdrop {
          opacity: 1;
        }
        .mobile-menu-panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(280px, 85vw);
          background: var(--surface);
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
          padding: 52px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          transform: translateX(100%);
          transition: transform 0.25s ease;
          touch-action: none;
        }
        .mobile-menu-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          font-size: 1.75rem;
          font-weight: 400;
          line-height: 1;
          color: var(--text-muted);
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: color 0.2s, background 0.2s;
        }
        .mobile-menu-close:hover {
          color: var(--text);
          background: var(--pastel-cream, #f9f5f0);
        }
        .mobile-menu-close:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .mobile-menu--open .mobile-menu-panel {
          transform: translateX(0);
        }
        .mobile-menu-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        @media (min-width: 601px) {
          .mobile-menu {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
