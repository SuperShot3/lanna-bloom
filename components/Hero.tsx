'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';

const DEFAULT_HERO_IMAGE = 'public/HeroImage/heroimage.webp';

export function Hero({ lang, heroImageUrl }: { lang: Locale; heroImageUrl?: string }) {
  const t = translations[lang].hero;
  const catalogHref = `/${lang}/catalog`;
  const infoHref = `/${lang}/info`;
  const imageSrc = heroImageUrl || DEFAULT_HERO_IMAGE;

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C5A059]/10 text-[#C5A059] font-medium text-sm mb-6">
            <span className="material-symbols-outlined text-lg">verified</span>
            {t.badge}
          </div>
          <h1 className="font-[family-name:var(--font-family-display)] text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-[#1A3C34] dark:text-stone-50 mb-8">
            {t.headlineNew} <br />
            <span className="italic text-[#C5A059]">{t.headlineAccent}</span>
          </h1>
          <p className="text-lg text-stone-600 dark:text-stone-400 mb-10 max-w-lg leading-relaxed">
            {t.sublineNew}
          </p>
          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              href={catalogHref}
              onClick={() => trackCtaClick('cta_home_top')}
              className="px-8 py-4 bg-[#C5A059] text-[#1A3C34] font-semibold rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
            >
              {t.ctaBrowse}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href={infoHref}
              className="px-8 py-4 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-semibold rounded-full hover:bg-stone-50 dark:hover:bg-stone-700 transition-all"
            >
              {t.ctaHowItWorks}
            </Link>
          </div>
          <div className="bg-white/50 dark:bg-stone-900/50 backdrop-blur p-4 rounded-2xl border border-stone-200 dark:border-stone-800 inline-flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              {t.shopByOccasion}
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${catalogHref}?occasion=birthday`}
                className="px-4 py-2 text-sm bg-white dark:bg-stone-800 rounded-lg shadow-sm hover:ring-1 ring-[#C5A059] transition-all"
              >
                {t.occasionBirthday}
              </Link>
              <Link
                href={`${catalogHref}?occasion=anniversary`}
                className="px-4 py-2 text-sm bg-white dark:bg-stone-800 rounded-lg shadow-sm hover:ring-1 ring-[#C5A059] transition-all"
              >
                {t.occasionAnniversary}
              </Link>
              <Link
                href={`${catalogHref}?occasion=get_well`}
                className="px-4 py-2 text-sm bg-white dark:bg-stone-800 rounded-lg shadow-sm hover:ring-1 ring-[#C5A059] transition-all"
              >
                {t.occasionGetWell}
              </Link>
              <Link
                href={`${catalogHref}?occasion=congrats`}
                className="px-4 py-2 text-sm bg-white dark:bg-stone-800 rounded-lg shadow-sm hover:ring-1 ring-[#C5A059] transition-all"
              >
                {t.occasionNewBaby}
              </Link>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
            <Image
              src={imageSrc}
              alt="Beautiful boutique floral arrangement"
              width={600}
              height={750}
              className="w-full h-full object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="absolute -bottom-10 -left-10 bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-2xl border border-stone-100 dark:border-stone-700 max-w-xs animate-[bounce_3s_ease-in-out_infinite]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined text-2xl">schedule</span>
              </div>
              <div>
                <p className="font-bold text-sm">{t.expressDelivery}</p>
                <p className="text-xs text-stone-500">{t.expressArea}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#C5A059]">{t.availableNow}</span>
              <span>{t.avgDelivery}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
