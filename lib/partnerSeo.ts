import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';

export const PARTNER_PORTAL_OG_IMAGE_PATH = '/logos/partner-portal.webp';

const PARTNER_PORTAL_COPY: Record<
  Locale,
  { title: string; description: string; imageAlt: string }
> = {
  en: {
    title: 'Lanna Bloom Partner Portal',
    description:
      'Apply to join the Lanna Bloom partner program. Sell gifts, flowers, and complementary products through our partner portal in Chiang Mai.',
    imageAlt: 'Lanna Bloom Partner Portal — flower delivery Thailand',
  },
  th: {
    title: 'พอร์ทัลพาร์ทเนอร์ Lanna Bloom',
    description:
      'สมัครเข้าร่วมโปรแกรมพาร์ทเนอร์ Lanna Bloom ขายของขวัญ ดอกไม้ และสินค้าเสริมผ่านพอร์ทัลพาร์ทเนอร์ในเชียงใหม่',
    imageAlt: 'พอร์ทัลพาร์ทเนอร์ Lanna Bloom — ส่งดอกไม้ทั่วไทย',
  },
  ru: {
    title: 'Партнёрский портал Lanna Bloom',
    description:
      'Подайте заявку в партнёрскую программу Lanna Bloom. Продавайте подарки, цветы и сопутствующие товары через партнёрский портал в Чиангмае.',
    imageAlt: 'Партнёрский портал Lanna Bloom — доставка цветов по Таиланду',
  },
  'zh-sg': {
    title: 'Lanna Bloom 合作伙伴门户',
    description:
      '申请加入 Lanna Bloom 合作伙伴计划。通过清迈合作伙伴门户销售礼品、鲜花和配套产品。',
    imageAlt: 'Lanna Bloom 合作伙伴门户 — 泰国鲜花配送',
  },
  'zh-hk': {
    title: 'Lanna Bloom 合作夥伴入口',
    description:
      '申請加入 Lanna Bloom 合作夥伴計劃。透過清邁合作夥伴入口銷售禮品、鮮花及配套產品。',
    imageAlt: 'Lanna Bloom 合作夥伴入口 — 泰國鮮花送遞',
  },
};

const OG_LOCALE: Partial<Record<Locale, string>> = {
  en: 'en_US',
  th: 'th_TH',
  ru: 'ru_RU',
  'zh-sg': 'zh_CN',
  'zh-hk': 'zh_HK',
};

export function buildPartnerPortalMetadata(
  lang: Locale,
  pathSuffix = ''
): Metadata {
  const copy = PARTNER_PORTAL_COPY[lang] ?? PARTNER_PORTAL_COPY.en;
  const base = getBaseUrl();
  const canonical = `${base}/${lang}/partner${pathSuffix}`;
  const ogImageUrl = `${base}${PARTNER_PORTAL_OG_IMAGE_PATH}`;

  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: 'Lanna Bloom',
      locale: OG_LOCALE[lang] ?? 'en_US',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1254,
          height: 1254,
          alt: copy.imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [ogImageUrl],
    },
  };
}
