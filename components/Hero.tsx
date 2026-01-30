'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export function Hero({ lang }: { lang: Locale }) {
  const t = translations[lang].hero;
  const catalogHref = `/${lang}/catalog`;

  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden />
      <div className="container hero-inner">
        <h1 className="hero-headline">{t.headline}</h1>
        <p className="hero-subline">{t.subline}</p>
        <Link href={catalogHref} className="hero-cta">
          <span className="hero-cta-icon" aria-hidden>🌸</span>
          {t.cta}
        </Link>
        <p className="hero-trust">{t.trustLine}</p>
      </div>
      <style jsx>{`
        .hero {
          position: relative;
          padding: 32px 0 28px;
          text-align: center;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, var(--pastel-cream) 0%, var(--bg) 100%);
          pointer-events: none;
        }
        .hero-bg::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 140px;
          height: 140px;
          background: radial-gradient(circle at 70% 70%, rgba(196, 167, 125, 0.04) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-inner {
          position: relative;
          max-width: 480px;
          margin: 0 auto;
        }
        .hero-headline {
          font-family: var(--font-serif);
          font-size: clamp(1.625rem, 4.5vw, 2.25rem);
          font-weight: 600;
          line-height: 1.3;
          color: var(--text);
          margin: 0 0 8px;
          max-width: 12em;
          margin-left: auto;
          margin-right: auto;
        }
        .hero-subline {
          font-size: 0.95rem;
          font-weight: 400;
          color: var(--text-muted);
          line-height: 1.45;
          margin: 0 0 20px;
        }
        .hero-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          max-width: 320px;
          height: 50px;
          padding: 0 24px;
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 9999px;
          box-shadow: 0 4px 14px rgba(196, 167, 125, 0.35);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }
        .hero-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(196, 167, 125, 0.4);
        }
        .hero-cta:active {
          opacity: 0.96;
        }
        .hero-cta-icon {
          font-size: 1.2rem;
          line-height: 1;
        }
        .hero-trust {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 12px 0 0;
          font-weight: 400;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .hero-trust::before {
          content: '⭐';
          font-size: 0.85rem;
        }
        @media (min-width: 430px) {
          .hero {
            padding: 40px 0 32px;
          }
          .hero-cta {
            width: 90%;
          }
        }
        @media (min-width: 768px) {
          .hero {
            padding: 48px 0 40px;
          }
          .hero-cta {
            width: auto;
            min-width: 260px;
          }
        }
      `}</style>
    </section>
  );
}
