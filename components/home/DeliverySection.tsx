import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { ZONES_BY_DESTINATION } from '@/lib/delivery/zones';
import {
  SAME_DAY_ORDER_CUTOFF_MIN,
  DELIVERY_WINDOW_START_MIN,
  DELIVERY_WINDOW_END_MIN,
  formatMinutesAsClockTime,
} from '@/lib/deliveryHours';
import { StorefrontIcon } from '@/components/icons';
import { fillDeliveryTimePlaceholders } from '@/components/home/homeLandingContent';

/** Real Chiang Mai zone labels, excluding the internal fallback zone. */
function chiangMaiAreaLabels(lang: Locale): string[] {
  return ZONES_BY_DESTINATION.CHIANG_MAI.filter((zone) => zone.id !== 'cm-unknown').map(
    (zone) => (lang === 'th' ? zone.labelTh : zone.labelEn)
  );
}

export function DeliverySection({ lang }: { lang: Locale }) {
  const t = translations[lang].homeLanding.delivery;
  const areas = chiangMaiAreaLabels(lang);
  const cutoff = formatMinutesAsClockTime(SAME_DAY_ORDER_CUTOFF_MIN);
  const window = `${formatMinutesAsClockTime(DELIVERY_WINDOW_START_MIN)}–${formatMinutesAsClockTime(DELIVERY_WINDOW_END_MIN)}`;

  return (
    <section
      className="py-16 sm:py-20 lg:py-24 bg-stone-50"
      aria-labelledby="home-delivery-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="home-reveal-item mb-10 md:mb-14 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#C5A059] mb-3">
            {t.eyebrow}
          </p>
          <h2
            id="home-delivery-title"
            className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-4 leading-tight"
          >
            {t.title}
          </h2>
          <p className="text-stone-500 leading-relaxed">{t.intro}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_3fr] lg:gap-8 home-reveal-stagger">
          <div className="home-reveal-item relative overflow-hidden rounded-3xl bg-[#1A3C34] text-stone-50 p-7 sm:p-9 flex flex-col">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#C5A059]/15 blur-2xl"
            />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-[#C5A059]">
                <StorefrontIcon name="schedule" size={22} />
              </div>
              <h3 className="font-[family-name:var(--font-family-display)] text-2xl">
                {t.sameDayTitle}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] uppercase tracking-wider text-stone-300/80 mb-1">
                  {t.cutoffTag}
                </p>
                <p className="font-[family-name:var(--font-family-display)] text-2xl sm:text-3xl text-[#C5A059]">
                  {cutoff}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] uppercase tracking-wider text-stone-300/80 mb-1">
                  {t.windowTag}
                </p>
                <p className="font-[family-name:var(--font-family-display)] text-2xl sm:text-3xl text-[#C5A059]">
                  {window}
                </p>
              </div>
            </div>
            <p className="text-stone-200/90 text-sm leading-relaxed mb-8">
              {fillDeliveryTimePlaceholders(t.sameDayText)}
            </p>
            <Link
              href={`/${lang}/info/delivery-policy`}
              className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[#C5A059] hover:text-[#d9b876] transition-colors"
            >
              {t.policyCta}
              <StorefrontIcon name="arrow-forward" size={16} />
            </Link>
          </div>

          <div className="home-reveal-item rounded-3xl border border-stone-200/80 bg-white p-7 sm:p-9 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[#1A3C34]/5 flex items-center justify-center text-[#1A3C34]">
                <StorefrontIcon name="location-on" size={22} />
              </div>
              <h3 className="font-[family-name:var(--font-family-display)] text-2xl text-[#1A3C34]">
                {t.areasTitle}
              </h3>
            </div>
            <p className="text-stone-500 text-sm leading-relaxed mb-4">{t.areasIntro}</p>
            <ul className="flex flex-wrap gap-2 mb-4">
              {areas.map((area) => (
                <li
                  key={area}
                  className="px-3.5 py-1.5 rounded-full border border-stone-200 bg-[#FDFCF8] text-stone-600 text-xs sm:text-sm"
                >
                  {area}
                </li>
              ))}
            </ul>
            <p className="text-stone-400 text-xs sm:text-sm mb-8">{t.areasNote}</p>
            <Link
              href={`/${lang}/flower-delivery-thailand`}
              className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3C34] hover:text-[#C5A059] transition-colors"
            >
              {t.thailandCta}
              <StorefrontIcon name="arrow-forward" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
