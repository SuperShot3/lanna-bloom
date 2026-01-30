'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export function Hero({ lang }: { lang: Locale }) {
  const t = translations[lang].hero;
  const catalogHref = `/${lang}/catalog`;

  return (
    <section className="hero">
      <div className="container hero-inner">
        <h1 className="hero-headline">{t.headline}</h1>
        <p className="hero-subline">{t.subline}</p>
        <Link href={catalogHref} className="hero-cta">
          {t.cta}
        </Link>
      </div>
      <style jsx>{`
        .hero {
          padding: 48px 0 56px;
          background: linear-gradient(180deg, var(--pastel-cream) 0%, var(--bg) 100%);
          text-align: center;
        }
        .hero-inner {
          max-width: 560px;
          margin: 0 auto;
        }
        .hero-headline {
          font-family: var(--font-serif);
          font-size: clamp(1.75rem, 5vw, 2.5rem);
          font-weight: 600;
          line-height: 1.25;
          color: var(--text);
          margin: 0 0 12px;
        }
        .hero-subline {
          font-size: 1rem;
          color: var(--text-muted);
          margin: 0 0 24px;
          line-height: 1.5;
        }
        .hero-cta {
          display: inline-block;
          padding: 14px 28px;
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hero-cta:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-hover);
        }
        @media (min-width: 768px) {
          .hero { padding: 64px 0 80px; }
        }
      `}</style>
    </section>
  );
}
