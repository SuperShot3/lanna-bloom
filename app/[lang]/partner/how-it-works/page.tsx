import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { PartnerHowItWorksContent } from '@/components/partner/PartnerHowItWorksContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const t = translations[lang as Locale].partnerPortal.howItWorks;
  return {
    title: `${t.pageTitle} | Lanna Bloom`,
    description: t.metaDescription,
  };
}

export default async function PartnerHowItWorksPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;

  return (
    <div className="partner-page partner-how-it-works-page">
      <PartnerNav lang={locale} current="howItWorks" isLoggedIn={false} />
      <div className="container partner-how-it-works-container">
        <PartnerHowItWorksContent lang={locale} />
      </div>
    </div>
  );
}
