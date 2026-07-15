import { permanentRedirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';

/**
 * Legacy URL — 301 to homepage (head-term owner for “flower delivery Chiang Mai”).
 * next.config.js also redirects; this covers App Router navigations.
 */
export default function FlowersChiangMaiRedirectPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isValidLocale(params.lang) ? params.lang : 'en';
  permanentRedirect(`/${lang}`);
}
