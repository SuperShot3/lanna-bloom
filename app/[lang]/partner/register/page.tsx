import { redirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';

/** Redirect legacy /partner/register to /partner/apply */
export default function PartnerRegisterPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) {
    redirect('/en');
  }
  redirect(`/${lang}/partner/apply`);
}
