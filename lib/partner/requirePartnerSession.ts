import 'server-only';

import { notFound, redirect } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId } from '@/lib/sanity';

export async function requirePartnerSession(lang: string) {
  if (!isValidLocale(lang)) notFound();

  const session = await getPartnerSession();
  if (!session) {
    redirect(`/${lang}/partner/login`);
  }

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) {
    redirect(`/${lang}/partner/login`);
  }

  return { lang: lang as Locale, session, partner };
}

export async function requirePartnerSessionForPartnerId(lang: string, urlPartnerId: string) {
  const { partner, session, lang: locale } = await requirePartnerSession(lang);
  if (partner.id !== urlPartnerId) notFound();
  return { lang: locale, session, partner };
}

