import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import {
  SAME_DAY_ORDER_CUTOFF_MIN,
  DELIVERY_WINDOW_START_MIN,
  DELIVERY_WINDOW_END_MIN,
  formatMinutesAsClockTime,
} from '@/lib/deliveryHours';
import { StorefrontIcon } from '@/components/icons';
import { fillDeliveryTimePlaceholders } from '@/components/home/homeLandingContent';

export function DeliverySection({ lang }: { lang: Locale }) {
  const t = translations[lang].homeLanding.delivery;
  const cutoff = formatMinutesAsClockTime(SAME_DAY_ORDER_CUTOFF_MIN);
  const window = `${formatMinutesAsClockTime(DELIVERY_WINDOW_START_MIN)}–${formatMinutesAsClockTime(DELIVERY_WINDOW_END_MIN)}`;

  return (
    <section
      id="home-delivery"
      className="py-12 sm:py-16 lg:py-20 bg-stone-50 scroll-mt-24"
      aria-labelledby="home-delivery-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="home-reveal-item mb-8 md:mb-10 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#C5A059] mb-3">
            {t.eyebrow}
          </p>
          <h2
            id="home-delivery-title"
            className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] leading-tight"
          >
            {t.title}
          </h2>
        </div>

        <div className="home-reveal-stagger space-y-5">
          <div className="home-reveal-item relative overflow-hidden rounded-3xl bg-[#1A3C34] text-stone-50 p-6 sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#C5A059]/15 blur-2xl"
            />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-[#C5A059]">
                <StorefrontIcon name="schedule" size={22} />
              </div>
              <h3 className="font-[family-name:var(--font-family-display)] text-2xl">
                {t.sameDayTitle}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 max-w-md">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-wider text-stone-300/80 mb-1">
                  {t.cutoffTag}
                </p>
                <p className="font-[family-name:var(--font-family-display)] text-2xl sm:text-3xl text-[#C5A059]">
                  {cutoff}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-wider text-stone-300/80 mb-1">
                  {t.windowTag}
                </p>
                <p className="font-[family-name:var(--font-family-display)] text-2xl sm:text-3xl text-[#C5A059]">
                  {window}
                </p>
              </div>
            </div>
            <p className="text-stone-200/90 text-sm leading-relaxed mb-4 max-w-3xl">
              {fillDeliveryTimePlaceholders(t.sameDayText)}
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 mb-6 max-w-3xl">
              <p className="text-[11px] uppercase tracking-wider text-stone-300/80 mb-1.5">
                {t.methodTitle}
              </p>
              <p className="text-stone-100 text-sm leading-relaxed">{t.methodText}</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link
                href={`/${lang}/info/delivery-policy`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C5A059] hover:text-[#d9b876] transition-colors"
              >
                {t.policyCta}
                <StorefrontIcon name="arrow-forward" size={16} />
              </Link>
              <Link
                href={`/${lang}/refund-replacement`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-300 hover:text-[#C5A059] transition-colors"
              >
                {t.refundCta}
                <StorefrontIcon name="arrow-forward" size={16} />
              </Link>
            </div>
          </div>

          <div className="home-reveal-item rounded-2xl border border-stone-200/80 bg-white px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[#1A3C34]/5 flex items-center justify-center text-[#1A3C34]">
                  <StorefrontIcon name="location-on" size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-family-display)] text-lg sm:text-xl text-[#1A3C34] leading-snug mb-1">
                    {t.areasTitle}
                  </h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    {t.areasIntro}{' '}
                    <span className="text-stone-400">{t.areasNote}</span>
                  </p>
                </div>
              </div>
              <Link
                href={`/${lang}/delivery-areas-thailand`}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 self-start sm:self-center text-sm font-semibold text-[#1A3C34] hover:text-[#C5A059] transition-colors sm:pl-2"
              >
                {t.deliveryAreasCta}
                <StorefrontIcon name="arrow-forward" size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
