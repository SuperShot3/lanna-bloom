import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId } from '@/lib/sanity';
import { PartnerLoginForm } from './PartnerLoginForm';

export default async function PartnerLoginPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const session = await getPartnerSession();
  if (session) {
    const partner = await getPartnerBySupabaseUserId(session.user.id);
    if (partner) redirect(`/${lang}/partner`);
  }

  const t = translations[lang as Locale].partnerPortal.login;
  const hiw = translations[lang as Locale].partnerPortal.howItWorks;

  return (
    <div className="partner-page partner-login-page">
      <PartnerNav lang={lang as Locale} current="login" isLoggedIn={false} />
      <div className="container">
        <div className="partner-login-card">
          <h1 className="partner-login-title">{t.title}</h1>
          <PartnerLoginForm lang={lang as Locale} />
          <p className="partner-login-hiw-hint">
            <Link href={`/${lang}/partner/how-it-works`}>{hiw.loginFooterHint}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
