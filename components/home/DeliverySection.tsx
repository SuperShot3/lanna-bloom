import Image from 'next/image';
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
import type { MarketDeliveryCopy } from '@/lib/landingPages/marketHomeLanding';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { fillDeliveryFeeAmountPlaceholder } from '@/lib/delivery/coverageDisplay';
import { HOME_DELIVERY_IMAGE_SIZES } from '@/lib/catalog/catalogImage';

function RedCarChip() {
  return (
    <span
      className="inline-flex h-8 w-[4.75rem] shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md bg-[#C62828] px-1.5 shadow-sm"
      aria-hidden
    >
      <img
        src="/icons/storefront/red_car.svg"
        alt=""
        width={18}
        height={12}
        style={{ width: 18, height: 12, maxWidth: 18, maxHeight: 12 }}
        className="block shrink-0 object-contain brightness-0 invert"
      />
      <span className="text-[9px] font-bold tracking-wide leading-none text-white">
        RED CAR
      </span>
    </span>
  );
}

function GrabChip() {
  return (
    <span
      className="inline-flex h-8 w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#00B14F] px-2 shadow-sm"
      aria-hidden
    >
      <img
        src="/icons/storefront/grab.svg"
        alt=""
        width={40}
        height={14}
        style={{ width: 40, height: 14, maxWidth: 40, maxHeight: 14 }}
        className="block object-contain brightness-0 invert"
      />
    </span>
  );
}

export function DeliverySection({
  lang,
  catalogHref,
  copy,
  destinationId = 'CHIANG_MAI',
}: {
  lang: Locale;
  catalogHref?: string;
  copy?: MarketDeliveryCopy;
  destinationId?: DeliveryDestinationId;
}) {
  const t = translations[lang].homeLanding.delivery;
  const cutoff = formatMinutesAsClockTime(SAME_DAY_ORDER_CUTOFF_MIN);
  const window = `${formatMinutesAsClockTime(DELIVERY_WINDOW_START_MIN)}–${formatMinutesAsClockTime(DELIVERY_WINDOW_END_MIN)}`;
  const shopHref = catalogHref ?? `/${lang}/catalog`;
  const title = copy?.title ?? t.title;
  const timingTitle = copy?.timingTitle ?? t.sameDayTitle;
  const timingNote = copy?.timingNote ?? fillDeliveryTimePlaceholders(t.sameDayNote);
  const showCutoffWindow = copy?.showCutoffWindow ?? true;
  const methodText = copy?.methodText ?? t.methodText;
  const showLocalCourierBrands = copy?.showLocalCourierBrands ?? true;
  const areasTitle = copy?.areasTitle ?? t.areasTitle;
  const areasIntro = copy?.areasIntro ?? t.areasIntro;
  const areasNote = fillDeliveryFeeAmountPlaceholder(t.areasNote, destinationId, lang);

  return (
    <section
      id="home-delivery"
      className="home-cv-auto relative overflow-hidden scroll-mt-24 py-12 sm:py-16 lg:py-20"
      aria-labelledby="home-delivery-title"
      data-home-reveal
    >
      <Image
        src="/HeroImage/deliveytime_hero_image.webp"
        alt=""
        fill
        sizes={HOME_DELIVERY_IMAGE_SIZES}
        quality={65}
        loading="lazy"
        fetchPriority="low"
        className="object-cover object-center"
        aria-hidden
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#1A3C34]/55 via-[#1A3C34]/40 to-[#1A3C34]/65"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="home-reveal-item mb-8 md:mb-10 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#E8D5A3] mb-3">
            {t.eyebrow}
          </p>
          <h2
            id="home-delivery-title"
            className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-white leading-tight text-balance drop-shadow-sm"
          >
            {title}
          </h2>
        </div>

        <div className="home-reveal-stagger space-y-4 sm:space-y-5 max-w-xl">
          <div className="home-reveal-item rounded-3xl border border-white/45 bg-white/40 backdrop-blur-xl shadow-[0_12px_40px_-16px_rgba(26,60,52,0.35)] p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-white/50 flex items-center justify-center text-[#1A3C34]">
                <StorefrontIcon name="schedule" size={22} />
              </div>
              <h3 className="font-[family-name:var(--font-family-display)] text-2xl sm:text-3xl text-[#1A3C34] leading-snug">
                {timingTitle}
              </h3>
            </div>

            {showCutoffWindow ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#3d524c] mb-1">
                  {t.cutoffTag}
                </p>
                <p className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#8F7340] leading-none tabular-nums">
                  {cutoff}
                </p>
              </div>
              <div className="border-l border-[#1A3C34]/20 pl-3 sm:pl-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#3d524c] mb-1">
                  {t.windowTag}
                </p>
                <p className="font-[family-name:var(--font-family-display)] text-2xl sm:text-3xl text-[#8F7340] leading-tight tabular-nums">
                  {window}
                </p>
              </div>
            </div>
            ) : null}

            <div className={`${showCutoffWindow ? 'border-t border-[#1A3C34]/15 pt-3' : ''}`.trim()}>
              <p className="text-sm text-[#1A3C34] leading-relaxed">
                {timingNote}
              </p>
            </div>
          </div>

          <div className="home-reveal-item rounded-2xl border border-white/45 bg-white/40 backdrop-blur-xl shadow-[0_10px_32px_-16px_rgba(26,60,52,0.3)] px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#3d524c] mb-3">
              {t.methodTitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {showLocalCourierBrands ? (
              <div className="flex items-center gap-2 shrink-0">
                <RedCarChip />
                <GrabChip />
              </div>
              ) : null}
              <p className="text-sm text-[#1A3C34] leading-relaxed min-w-0 flex-1 basis-[12rem]">
                {methodText}
              </p>
            </div>
          </div>

          <div className="home-reveal-item flex flex-col gap-3 pt-1">
            <Link
              href={shopHref}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 self-start rounded-full bg-[#1A3C34] px-7 py-3.5 text-sm font-semibold !text-white hover:!text-white ring-1 ring-white/50 shadow-[0_12px_28px_-14px_rgba(26,60,52,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#234d43] hover:shadow-[0_16px_36px_-16px_rgba(26,60,52,0.75)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A059]"
            >
              {t.shopCollectionCta}
              <StorefrontIcon name="arrow-forward" size={16} className="text-white" />
            </Link>
            <div className="rounded-2xl border border-white/45 bg-white/40 backdrop-blur-md px-4 py-3 flex flex-wrap gap-x-5 gap-y-2">
              <Link
                href={`/${lang}/info/delivery-policy`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3C34] hover:text-[#8F7340] transition-colors"
              >
                {t.policyCta}
                <StorefrontIcon name="arrow-forward" size={16} />
              </Link>
              <Link
                href={`/${lang}/refund-replacement`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3C34] hover:text-[#8F7340] transition-colors"
              >
                {t.refundCta}
                <StorefrontIcon name="arrow-forward" size={16} />
              </Link>
            </div>
          </div>

          <div className="home-reveal-item rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md shadow-[0_10px_32px_-16px_rgba(26,60,52,0.28)] px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/50 flex items-center justify-center text-[#1A3C34]">
                  <StorefrontIcon name="location-on" size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-family-display)] text-lg sm:text-xl text-[#1A3C34] leading-snug mb-1">
                    {areasTitle}
                  </h3>
                  <p className="text-[#1A3C34] text-sm leading-relaxed">
                    {areasIntro}{' '}
                    <span className="text-[#3d524c]">{areasNote}</span>
                  </p>
                </div>
              </div>
              <Link
                href={`/${lang}/delivery-areas-thailand`}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 self-start sm:self-center text-sm font-semibold text-[#1A3C34] hover:text-[#8F7340] transition-colors sm:pl-2"
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
