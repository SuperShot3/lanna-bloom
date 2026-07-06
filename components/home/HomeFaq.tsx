'use client';

import { useState } from 'react';
import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { StorefrontIcon } from '@/components/icons';
import type { HomeFaqItem } from '@/components/home/homeLandingContent';

/**
 * Homepage FAQ accordion. Answers are server-rendered in the initial HTML
 * so they stay crawlable and match the FAQPage JSON-LD injected by the page.
 */
export function HomeFaq({ lang, faq }: { lang: Locale; faq: HomeFaqItem[] }) {
  const t = translations[lang].homeLanding.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      className="py-16 sm:py-20 lg:py-24"
      aria-labelledby="home-faq-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div className="home-reveal-item lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#C5A059] mb-3">
              {t.eyebrow}
            </p>
            <h2
              id="home-faq-title"
              className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-4 leading-tight"
            >
              {t.title}
            </h2>
            <p className="text-stone-500 leading-relaxed max-w-md mb-6">{t.subtitle}</p>
            <Link
              href={`/${lang}/contact`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3C34] hover:text-[#C5A059] transition-colors"
            >
              {t.contactCta}
              <StorefrontIcon name="arrow-forward" size={16} />
            </Link>
          </div>

          <div className="home-reveal-item space-y-3">
            {faq.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={item.q}
                  className={`rounded-2xl border transition-colors duration-200 ${
                    isOpen
                      ? 'border-[#C5A059]/40 bg-white shadow-[0_16px_32px_-24px_rgba(26,60,52,0.35)]'
                      : 'border-stone-200 bg-white/60 hover:border-stone-300'
                  }`}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`home-faq-answer-${i}`}
                    id={`home-faq-question-${i}`}
                    onClick={() => toggle(i)}
                  >
                    <span className="font-semibold text-[#1A3C34] text-sm sm:text-base">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 ${
                        isOpen
                          ? 'rotate-180 border-[#C5A059]/50 text-[#C5A059]'
                          : 'border-stone-200 text-stone-400'
                      }`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3.5 5.25L7 8.75l3.5-3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  <div
                    id={`home-faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`home-faq-question-${i}`}
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-stone-500 text-sm sm:text-base leading-relaxed px-5 sm:px-6 pb-5 sm:pb-6 pr-14">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
