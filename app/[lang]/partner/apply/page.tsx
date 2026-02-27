import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { ApplyWizard } from './ApplyWizard';

export default function PartnerApplyPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  return (
    <div className="partner-page partner-apply-page">
      <PartnerNav lang={lang as Locale} current="apply" />
      <div className="container">
        <ApplyWizard lang={lang as Locale} />
      </div>
    </div>
  );
}
