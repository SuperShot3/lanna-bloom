import type { Metadata } from 'next';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { buildPartnerPortalMetadata } from '@/lib/partnerSeo';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  return buildPartnerPortalMetadata(params.lang as Locale);
}

export default function PartnerSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
