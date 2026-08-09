import { redirect } from 'next/navigation';
import { isValidLocale, locales } from '@/lib/i18n';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

/** Legacy URL — permanently moved to /delivery-areas-thailand */
export default function DeliveryAreasChiangMaiRedirect({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isValidLocale(params.lang) ? params.lang : 'en';
  redirect(`/${lang}/delivery-areas-thailand`);
}
