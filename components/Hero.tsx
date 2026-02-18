'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';

export function Hero({ lang }: { lang: Locale }) {
  const t = translations[lang].hero;
  const catalogHref = `/${lang}/catalog`;

  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden />
      <div className="container hero-inner">
        <h1 className="hero-big-headline">
          <span className="hero-big-line1">{t.bigHeadlineLine1}</span>
        </h1>
        <p className="hero-headline">{t.headline}</p>
        <p className="hero-subline">{t.subline}</p>
        <Link
          href={catalogHref}
          className="hero-cta"
          onClick={() => trackCtaClick('cta_home_top')}
        >
          {t.cta}
        </Link>
        <p className="hero-trust">{t.trustLine}</p>
      </div>
      <style jsx>{`
        .hero {
          position: relative;
          padding: 28px 0 24px;
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
        .hero-big-headline {
          font-family: var(--font-serif);
          font-weight: 700;
          line-height: 1.25;
          color: var(--text);
          margin: 0 0 12px;
          letter-spacing: 0.02em;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hero-big-line1 {
          font-size: clamp(1.5rem, 5vw, 2.5rem);
        }
        .hero-headline {
          font-family: var(--font-serif);
          font-size: clamp(1.25rem, 3.5vw, 1.5rem);
          font-weight: 600;
          line-height: 1.3;
          color: var(--text);
          margin: 0 0 6px;
        }
        .hero-subline {
          font-size: 0.95rem;
          font-weight: 400;
          color: var(--text-muted);
          line-height: 1.45;
          margin: 0 0 18px;
        }
        .hero-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          max-width: 320px;
          min-height: 50px;
          height: auto;
          padding: 14px 32px;
          box-sizing: border-box;
          background: var(--accent);
          color: #fff;
          font-weight: 700;
          font-size: 1.05rem;
          line-height: 1.2;
          border-radius: 9999px;
          border: 2px solid #a88b5c;
          box-shadow: 0 4px 0 #a88b5c, 0 6px 20px rgba(45, 42, 38, 0.2);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          text-decoration: none;
          appearance: none;
        }
        .hero-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #a88b5c, 0 8px 24px rgba(45, 42, 38, 0.25);
        }
        .hero-cta:focus-visible {
          outline: 3px solid var(--text);
          outline-offset: 3px;
        }
        .hero-cta:active {
          transform: translateY(1px);
          box-shadow: 0 2px 0 #a88b5c, 0 4px 12px rgba(45, 42, 38, 0.2);
          opacity: 0.98;
        }
        .hero-trust {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 10px 0 0;
          font-weight: 400;
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
