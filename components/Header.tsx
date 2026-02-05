'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Locale, translations } from '@/lib/i18n';
import { useCart } from '@/contexts/CartContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MessengerLinks } from './MessengerLinks';
import { DeliveryModal } from './DeliveryModal';
import { CartIcon } from './icons';

const SCROLL_THRESHOLD = 10;
const MOBILE_BREAKPOINT = 600;

export function Header({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const basePath = pathname?.replace(/^\/(en|th)/, '') || '';
  const homeHref = `/${lang}`;
  const catalogHref = `/${lang}/catalog`;
  const cartHref = `/${lang}/cart`;
  const t = translations[lang].nav;
  const { count: cartCount } = useCart();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const deliveryTriggerRef = useRef<HTMLAnchorElement>(null);

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

  const showBurger = isMobile && isScrolled;
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
              width={60}
              height={50}
              className="logo-img"
              priority
              sizes="(max-width: 600px) 60px, 60px"
            />
          </Link>
          <nav className="nav nav--desktop" aria-label="Main">
            <Link
              href={homeHref}
              className={basePath === '' ? 'nav-link active' : 'nav-link'}
            >
              {t.home}
            </Link>
            <Link
              href={catalogHref}
              className={basePath === '/catalog' ? 'nav-link active' : 'nav-link'}
            >
              {t.catalog}
            </Link>
            <Link
              href="#delivery-info"
              ref={deliveryTriggerRef}
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setDeliveryModalOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={deliveryModalOpen}
            >
              {t.delivery}
            </Link>
          </nav>
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
              <MessengerLinks />
            </div>
          )}
          {showBurger && (
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
          )}
        </div>
      </header>

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
        <div className="mobile-menu-panel">
          <nav className="mobile-menu-nav" aria-label="Main">
            <Link
              href={homeHref}
              className={`mobile-menu-link ${basePath === '' ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {t.home}
            </Link>
            <Link
              href={catalogHref}
              className={`mobile-menu-link ${basePath === '/catalog' ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {t.catalog}
            </Link>
            <Link
              href="#delivery-info"
              className="mobile-menu-link"
              onClick={(e) => {
                e.preventDefault();
                setDeliveryModalOpen(true);
                setMenuOpen(false);
              }}
              aria-haspopup="dialog"
            >
              {t.delivery}
            </Link>
          </nav>
          <div className="mobile-menu-actions">
            <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
            <Link
              href={cartHref}
              className="mobile-menu-cart"
              onClick={() => setMenuOpen(false)}
              aria-label={t.cart}
            >
              <CartIcon size={22} />
              <span>{t.cart}</span>
              {cartCount > 0 && (
                <span className="mobile-menu-cart-badge" aria-hidden>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <MessengerLinks />
          </div>
        </div>
      </div>

      <DeliveryModal
        lang={lang}
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        triggerRef={deliveryTriggerRef}
      />

      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          left: var(--visual-viewport-offset-left, 0);
          width: var(--visual-viewport-width, 100%);
          right: 0;
          z-index: 100;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow);
          padding-top: env(safe-area-inset-top);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
          transition: background 0.25s ease, min-height 0.25s ease, box-shadow 0.25s ease;
        }
        .header--scrolled {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-bottom-color: rgba(235, 230, 224, 0.6);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
        }
        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 20px;
          min-height: 44px;
          transition: min-height 0.25s ease, padding 0.25s ease;
        }
        .header--scrolled .header-inner {
          min-height: 24px;
          padding: 5px 20px;
        }
        .logo {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          min-height: 0;
          max-height: 50px;
        }
        .header--scrolled .logo {
          max-height: 30px;
        }
        .logo-img {
          display: block;
          height: 50px !important;
          width: 60px !important;
          max-height: 50px;
          object-fit: contain;
          object-position: left center;
          transition: height 0.25s ease;
        }
        .header--scrolled .logo-img {
          height: 30px !important;
          width: 36px !important;
          max-height: 30px;
        }
        .nav--desktop {
          display: flex;
          gap: 20px;
        }
        .nav-link {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 8px 4px;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-muted);
          transition: color 0.2s;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
        }
        .nav-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: var(--radius-sm);
        }
        .nav-link:hover,
        .nav-link.active {
          color: var(--text);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-cart-link {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--pastel-cream);
          color: var(--text);
          transition: background 0.2s, transform 0.15s;
        }
        .header-cart-link:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
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
        @media (max-width: 600px) {
          .nav--desktop {
            display: none;
          }
          .header-inner {
            padding: 8px 16px;
            min-height: 40px;
          }
          .header--scrolled .header-inner {
            min-height: 18px;
            padding: 3px 12px;
          }
          .logo {
            max-height: 50px;
          }
          .header--scrolled .logo {
            max-height: 30px;
          }
          .logo-img {
            height: 50px !important;
            width: 60px !important;
            max-height: 50px;
          }
          .header--scrolled .logo-img {
            height: 30px !important;
            width: 36px !important;
            max-height: 30px;
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
        }
        @media (min-width: 601px) {
          .burger {
            display: none;
          }
        }

        .mobile-menu {
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
        }
        .mobile-menu--open .mobile-menu-panel {
          transform: translateX(0);
        }
        .mobile-menu-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mobile-menu-link {
          display: block;
          width: 100%;
          text-align: left;
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--text);
          padding: 12px 0;
          min-height: 44px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
          border-bottom: 1px solid var(--border);
        }
        .mobile-menu-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .mobile-menu-link.active {
          color: var(--accent);
        }
        .mobile-menu-actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: auto;
        }
        .mobile-menu-cart {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 0;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text);
          text-decoration: none;
          border-bottom: 1px solid var(--border);
        }
        .mobile-menu-cart:hover {
          color: var(--accent);
        }
        .mobile-menu-cart-badge {
          margin-left: auto;
          padding: 2px 8px;
          background: var(--accent);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: 999px;
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
