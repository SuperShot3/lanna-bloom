/**
 * City-parameterized homepage copy for expansion market landings.
 * Chiang Mai homepage keeps its own strings; this module is for
 * `/{lang}/{city}/flower-delivery` only.
 */
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import type { ProvinceStatus, PublicProvince } from '@/lib/provinces/types';
import {
  fillDeliveryTimePlaceholders,
  type HomeFaqItem,
} from '@/components/home/homeLandingContent';
import { fillDeliveryFeeAmountPlaceholder } from '@/lib/delivery/coverageDisplay';
import {
  getLamphunDeliveryDistricts,
  getPattayaDeliveryDistricts,
  getPhuketDeliveryDistricts,
  type LocalizedLabel,
} from '@/lib/landingPages/flowerDeliveryThailand';

export function fillCityPlaceholders(text: string, city: string, areas = ''): string {
  return text.replaceAll('{city}', city).replaceAll('{areas}', areas);
}

export function getMarketLandingDistricts(
  destinationId: DeliveryDestinationId
): LocalizedLabel[] {
  if (destinationId === 'LAMPHUN') return getLamphunDeliveryDistricts();
  if (destinationId === 'PATTAYA') return getPattayaDeliveryDistricts();
  if (destinationId === 'PHUKET') return getPhuketDeliveryDistricts();
  return [];
}

export function formatDistrictList(
  districts: LocalizedLabel[],
  lang: Locale,
  limit = 6
): string {
  const names = districts
    .slice(0, limit)
    .map((d) => (lang === 'th' ? d.nameTh : d.nameEn))
    .filter(Boolean);
  return names.join(lang === 'th' ? ' ' : ', ');
}

export type MarketLandingTiming = 'same_day' | 'next_day' | 'preorder_only' | 'other';

export function timingFromProvinceStatus(
  status: ProvinceStatus | null | undefined
): MarketLandingTiming {
  if (status === 'same_day') return 'same_day';
  if (status === 'next_day') return 'next_day';
  if (status === 'preorder_only') return 'preorder_only';
  return 'other';
}

export type MarketDeliveryCopy = {
  title: string;
  timingTitle: string;
  timingNote: string;
  showCutoffWindow: boolean;
  methodText: string;
  showLocalCourierBrands: boolean;
  areasTitle: string;
  areasIntro: string;
};

export type MarketLocalCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  areasTitle: string;
  areasP1: string;
};

function customerMessage(
  province: PublicProvince | null | undefined,
  lang: Locale
): string {
  if (!province) return '';
  const raw =
    lang === 'th'
      ? province.customer_message_th || province.customer_message_en
      : province.customer_message_en || province.customer_message_th;
  return (raw ?? '').trim();
}

export function buildMarketDeliveryCopy(params: {
  lang: Locale;
  city: string;
  destinationId: DeliveryDestinationId;
  province: PublicProvince | null | undefined;
}): MarketDeliveryCopy {
  const { lang, city, destinationId, province } = params;
  const t = translations[lang].homeLanding.delivery;
  const timing = timingFromProvinceStatus(province?.status);
  const districts = getMarketLandingDistricts(destinationId);
  const areas = formatDistrictList(districts, lang);
  const message = customerMessage(province, lang);

  let timingTitle: string = t.sameDayTitle;
  let timingNote: string = fillDeliveryTimePlaceholders(t.sameDayNote);
  let showCutoffWindow = true;
  if (timing === 'next_day') {
    timingTitle = t.nextDayTitle;
    timingNote = message || fillDeliveryTimePlaceholders(t.nextDayNote);
    showCutoffWindow = false;
  } else if (timing === 'preorder_only') {
    timingTitle = t.preorderTitle;
    timingNote = message || fillDeliveryTimePlaceholders(t.preorderNote);
    showCutoffWindow = false;
  } else if (timing === 'other') {
    timingTitle = t.nextDayTitle;
    timingNote = message || fillDeliveryTimePlaceholders(t.nextDayNote);
    showCutoffWindow = false;
  } else if (message) {
    timingNote = message;
  }

  const areasIntro = areas
    ? fillCityPlaceholders(t.areasIntroNamed, city, areas)
    : fillCityPlaceholders(t.areasIntroGeneric, city);

  return {
    title: fillCityPlaceholders(t.titleMarket, city),
    timingTitle,
    timingNote,
    showCutoffWindow,
    methodText: t.methodTextLocal,
    showLocalCourierBrands: false,
    areasTitle: fillCityPlaceholders(t.areasTitleMarket, city),
    areasIntro,
  };
}

export function buildMarketLocalCopy(params: {
  lang: Locale;
  city: string;
  destinationId: DeliveryDestinationId;
}): MarketLocalCopy {
  const { lang, city, destinationId } = params;
  const t = translations[lang].homeLanding.local;
  const districts = getMarketLandingDistricts(destinationId);
  const areas = formatDistrictList(districts, lang);
  return {
    eyebrow: city,
    title: fillCityPlaceholders(t.titleMarket, city),
    intro: fillCityPlaceholders(t.introMarket, city),
    areasTitle: fillCityPlaceholders(t.areasTitleMarket, city),
    areasP1: areas
      ? fillCityPlaceholders(t.areasP1Named, city, areas)
      : fillCityPlaceholders(t.areasP1Generic, city),
  };
}

export function getMarketHomeFaqItems(params: {
  lang: Locale;
  city: string;
  destinationId: DeliveryDestinationId;
  province: PublicProvince | null | undefined;
}): HomeFaqItem[] {
  const { lang, city, destinationId, province } = params;
  const faq = translations[lang].homeLanding.faq;
  const timing = timingFromProvinceStatus(province?.status);
  const districts = getMarketLandingDistricts(destinationId);
  const areas = formatDistrictList(districts, lang, 8);
  const areasItem = areas ? faq.marketAreasNamed : faq.marketAreasGeneric;

  const timingItem =
    timing === 'same_day'
      ? faq.marketSameDayItem
      : timing === 'preorder_only'
        ? faq.marketPreorderItem
        : faq.marketNextDayItem;

  const raw: { q: string; a: string }[] = [
    faq.marketOrderItem,
    timingItem,
    areasItem,
    ...faq.marketSharedItems,
  ];

  return raw.map((item) => ({
    q: fillCityPlaceholders(item.q, city, areas),
    a: fillDeliveryFeeAmountPlaceholder(
      fillDeliveryTimePlaceholders(fillCityPlaceholders(item.a, city, areas)),
      destinationId,
      lang
    ),
  }));
}
