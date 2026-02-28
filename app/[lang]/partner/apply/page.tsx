import { redirect, notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId } from '@/lib/sanity';
import { ApplyWizard } from './ApplyWizard';

export default async function PartnerApplyPage({
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

  return (
    <div className="partner-page partner-apply-page">
      <PartnerNav lang={lang as Locale} current="apply" isLoggedIn={false} />
      <div className="container">
        <ApplyWizard lang={lang as Locale} />
      </div>
    </div>
  );
}
