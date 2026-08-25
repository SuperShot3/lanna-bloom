import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { buildAlternates } from '@/lib/seo/alternates';
import {
  openGraphLocale,
  websiteOpenGraph,
  websiteTwitter,
} from '@/lib/seo/shareMetadata';

export const HOME_SEO = {
  en: {
    title: 'Buy Flowers Online in Chiang Mai | Same-Day Delivery – Lanna Bloom',
    description:
      'Buy flowers online in Chiang Mai with secure card payment. Choose a bouquet, add your message, and arrange same-day delivery to homes, hotels, condos, hospitals, or villas.',
  },
  th: {
    title: 'ซื้อดอกไม้ออนไลน์ในเชียงใหม่ | จัดส่งวันเดียว – Lanna Bloom',
    description:
      'ซื้อดอกไม้ออนไลน์ในเชียงใหม่ ชำระด้วยบัตรอย่างปลอดภัย เลือกช่อ ใส่ข้อความ และจัดส่งวันเดียวถึงบ้าน โรงแรม คอนโด โรงพยาบาล หรือวิลล่า',
  },
  'zh-hk': {
    title: '網上購買清邁鮮花 | 即日配送 – Lanna Bloom',
    description:
      '在清邁網上訂購鮮花，以信用卡安全付款。選擇花束、加上訊息，即可安排即日送達住宅、酒店、公寓、醫院或別墅。',
  },
} as const;

export function homeSeoForLang(lang: Locale): { title: string; description: string } {
  if (lang === 'th') return HOME_SEO.th;
  if (lang === 'zh-hk') return HOME_SEO['zh-hk'];
  return HOME_SEO.en;
}

/** Canonical locale-homepage metadata. Query params are never included. */
export async function generateHomePageMetadata(langParam: string): Promise<Metadata> {
  if (!isValidLocale(langParam)) return {};
  const lang = langParam as Locale;
  const base = getBaseUrl();
  const { title, description } = homeSeoForLang(lang);
  const alternates = buildAlternates({ lang, pathSuffix: '' });
  const canonical =
    typeof alternates.canonical === 'string' ? alternates.canonical : `${base}/${lang}`;
  return {
    title,
    description,
    alternates,
    openGraph: websiteOpenGraph({
      title,
      description,
      url: canonical,
      locale: openGraphLocale(lang),
    }),
    twitter: websiteTwitter({ title, description }),
  };
}
