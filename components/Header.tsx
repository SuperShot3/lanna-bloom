'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Locale, translations } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MessengerLinks } from './MessengerLinks';

const SCROLL_THRESHOLD = 10;
const MOBILE_BREAKPOINT = 600;

export function Header({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const basePath = pathname?.replace(/^\/(en|th)/, '') || '';
  const homeHref = `/${lang}`;
  const catalogHref = `/${lang}/catalog`;
  const partnerRegisterHref = `/${lang}/partner/register`;
  const t = translations[lang].nav;

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
              width={160}
              height={48}
              className="logo-img"
              priority
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
              href={partnerRegisterHref}
              className={basePath.startsWith('/partner') ? 'nav-link active' : 'nav-link nav-link--partner'}
            >
              {t.partnerRegister}
            </Link>
          </nav>
          {showActions && (
            <div className="header-actions">
              <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
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
              href={partnerRegisterHref}
              className={`mobile-menu-link ${basePath.startsWith('/partner') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {t.partnerRegister}
            </Link>
          </nav>
          <div className="mobile-menu-actions">
            <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
            <MessengerLinks />
          </div>
        </div>
      </div>

      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow);
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
          padding: 14px 20px;
          min-height: 60px;
          transition: min-height 0.25s ease, padding 0.25s ease;
        }
        .header--scrolled .header-inner {
          min-height: 48px;
          padding: 10px 20px;
        }
        .logo {
          display: flex;
          align-items: center;
        }
        .logo-img {
          height: 40px;
          width: auto;
          object-fit: contain;
          transition: height 0.25s ease;
        }
        .header--scrolled .logo-img {
          height: 32px;
        }
        .nav--desktop {
          display: flex;
          gap: 20px;
        }
        .nav-link {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-muted);
          transition: color 0.2s;
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
            padding: 12px 16px;
            min-height: 56px;
          }
          .header--scrolled .header-inner {
            min-height: 36px;
            padding: 6px 12px;
          }
          .logo-img {
            height: 36px;
          }
          .header--scrolled .logo-img {
            height: 22px;
          }
          .burger {
            width: 36px;
            height: 36px;
            min-width: 36px;
            min-height: 36px;
          }
          .header--scrolled .burger {
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
          }
          .burger-line {
            width: 18px;
          }
          .header--scrolled .burger-line {
            width: 16px;
          }
        }
        @media (min-width: 601px) {
          .burger {
            display: none;
          }
        }

        .mobile-menu {
          position: fixed;
          inset: 0;
          z-index: 99;
          pointer-events: none;
          visibility: hidden;
          transition: visibility 0.25s ease;
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
          padding: 72px 24px 24px;
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
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--text);
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
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
        @media (min-width: 601px) {
          .mobile-menu {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
