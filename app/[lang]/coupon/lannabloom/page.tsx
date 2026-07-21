import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LannaBloomCouponPageClient } from '@/components/coupon/LannaBloomCouponPageClient';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { LANNA_BLOOM_COUPON_CODE } from '@/lib/promo/lannaBloomCoupon';

export const revalidate = 3600;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Lanna Bloom' };
  const lang = params.lang as Locale;
  const base = getBaseUrl();
  const canonical = `${base}/${lang}/coupon/lannabloom`;
  const title =
    lang === 'th'
      ? `คูปอง ${LANNA_BLOOM_COUPON_CODE} | Lanna Bloom`
      : `${LANNA_BLOOM_COUPON_CODE} coupon | Lanna Bloom`;
  const description =
    lang === 'th'
      ? 'ส่วนลดแบบจำนวนคงที่ — ฿300 / ฿400 / ฿500 ตามยอดสินค้า (ใช้ร่วมกับสินค้าลดราคาไม่ได้)'
      : 'Fixed discounts — ฿300 / ฿400 / ฿500 off by items subtotal. Not valid with already-discounted products.';
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
    },
  };
}

export default function LannaBloomCouponPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isValidLocale(params.lang)) notFound();
  return <LannaBloomCouponPageClient lang={params.lang as Locale} />;
}
