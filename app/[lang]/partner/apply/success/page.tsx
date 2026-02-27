import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { ClearDraft } from './ClearDraft';
import { RedirectCountdown } from './RedirectCountdown';

export default async function PartnerApplySuccessPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { id?: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const t = translations[lang as Locale].partner;

  return (
    <div className="partner-page">
      <ClearDraft />
      <div className="container">
        <div className="partner-success-box">
          <h1 className="partner-success-title">{t.successTitle}</h1>
          <p className="partner-success-message">{t.successMessage}</p>
          <RedirectCountdown lang={lang} redirectMessage={t.redirectInSeconds} />
          <Link href={`/${lang}`} className="partner-dashboard-link">
            {lang === 'th' ? 'กลับหน้าแรก' : 'Back to home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
