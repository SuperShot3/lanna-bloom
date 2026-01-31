import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { PartnerRegisterForm } from './PartnerRegisterForm';

export default function PartnerRegisterPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const t = translations[lang as Locale].partner;

  return (
    <div className="partner-page">
      <div className="container">
        <h1 className="partner-title">{t.registerTitle}</h1>
        <p className="partner-subline">{t.registerSubline}</p>
        <PartnerRegisterForm lang={lang as Locale} />
      </div>
    </div>
  );
}
