import type { Metadata } from 'next';
import { HomepageV2 } from '@/components/home/HomepageV2';
import { generateHomePageMetadata } from '@/lib/seo/homePageMetadata';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';

/** Regenerate every 60s so popular catalog items shuffle on each update */
export const revalidate = 60;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  return generateHomePageMetadata(params.lang);
}

export default async function HomePage({
  params,
}: {
  params: { lang: string };
}) {
  const lang: Locale = isValidLocale(params.lang) ? params.lang : 'en';
  return <HomepageV2 lang={lang} />;
}
