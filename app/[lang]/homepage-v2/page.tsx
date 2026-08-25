import type { Metadata } from 'next';
import { HomepageV2 } from '@/components/home/HomepageV2';
import { generateHomePageMetadata } from '@/lib/seo/homePageMetadata';
import { HOMEPAGE_EXPERIMENT_LOCALE } from '@/lib/homepageExperiment/config';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { notFound } from 'next/navigation';

/** Same ISR window as the public locale homepage. */
export const revalidate = 60;

export function generateStaticParams() {
  return [{ lang: HOMEPAGE_EXPERIMENT_LOCALE }];
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  return generateHomePageMetadata(params.lang);
}

/** Internal rewrite target for HomepageV2. Public URL stays `/{lang}`. */
export default async function HomepageV2Page({
  params,
}: {
  params: { lang: string };
}) {
  if (!isValidLocale(params.lang) || params.lang !== HOMEPAGE_EXPERIMENT_LOCALE) {
    notFound();
  }
  return <HomepageV2 lang={params.lang as Locale} />;
}
