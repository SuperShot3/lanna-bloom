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
  const howToHref = `/${lang}/info/how-to-order-flower-delivery-chiang-mai`;
  const imageSrc = heroImageUrl || DEFAULT_HERO_IMAGE;

  return (
    <section className="relative pt-4 pb-8 sm:pt-6 sm:pb-10 md:pt-8 md:pb-12 lg:pt-12 lg:pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12 items-center">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C5A059]/10 text-[#C5A059] font-medium text-sm mb-2 sm:mb-3 md:mb-4">
            <span className="material-symbols-outlined text-lg">verified</span>
            {t.badge}
          </div>
          <h1 className="font-[family-name:var(--font-family-display)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-[#1A3C34] mb-3 sm:mb-4 md:mb-6">
            {t.headlineNew} <br />
            <span className="italic text-[#C5A059]">{t.headlineAccent}</span>
          </h1>
          <p className="text-base sm:text-lg text-stone-600 mb-4 sm:mb-6 md:mb-8 max-w-lg leading-relaxed">
            {t.sublineNew}
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8 md:mb-10">
            <Link
              href={catalogHref}
              onClick={() => trackCtaClick('cta_home_top')}
              className="hero-cta px-6 py-3 sm:px-8 sm:py-4 font-semibold rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
            >
              {t.ctaBrowse}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href={howToHref}
              className="px-6 py-3 sm:px-8 sm:py-4 bg-white border border-stone-200 font-semibold rounded-full hover:bg-stone-50 transition-all text-sm sm:text-base"
            >
              {t.ctaHowItWorks}
            </Link>
          </div>
          <div className="bg-white/50 backdrop-blur p-4 rounded-2xl border border-stone-200 inline-flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              {t.shopByOccasion}
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${catalogHref}?occasion=birthday`}
                className="px-4 py-2 text-sm bg-white rounded-lg shadow-sm hover:ring-1 ring-[#C5A059] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg text-[#C5A059]">cake</span>
                {t.occasionBirthday}
              </Link>
              <Link
                href={`${catalogHref}?occasion=anniversary`}
                className="px-4 py-2 text-sm bg-white rounded-lg shadow-sm hover:ring-1 ring-[#C5A059] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg text-[#C5A059]">favorite</span>
                {t.occasionAnniversary}
              </Link>
              <Link
                href={`${catalogHref}?occasion=get_well`}
                className="px-4 py-2 text-sm bg-white rounded-lg shadow-sm hover:ring-1 ring-[#C5A059] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg text-[#C5A059]">local_hospital</span>
                {t.occasionGetWell}
              </Link>
              <Link
                href={`${catalogHref}?occasion=congrats`}
                className="px-4 py-2 text-sm bg-white rounded-lg shadow-sm hover:ring-1 ring-[#C5A059] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg text-[#C5A059]">child_care</span>
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
          <div className="absolute bottom-4 left-4 lg:-bottom-10 lg:-left-10 bg-white p-4 lg:p-6 rounded-2xl shadow-2xl border border-stone-100 max-w-[calc(100%-2rem)] lg:max-w-xs animate-[bounce_3s_ease-in-out_infinite]">
            <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                <span className="material-symbols-outlined text-xl lg:text-2xl">schedule</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs lg:text-sm">{t.expressDelivery}</p>
                <p className="text-[10px] lg:text-xs text-stone-500 truncate">{t.expressArea}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] lg:text-xs font-medium gap-2">
              <span className="text-[#C5A059]">{t.availableNow}</span>
              <span className="truncate">{t.avgDelivery}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
