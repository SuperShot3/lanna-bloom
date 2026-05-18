import { notFound, redirect } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';

/**
 * Legacy Stripe success URL — redirect only. Purchase tracking lives on /lanna-order-thank-you.
 */
export default function CheckoutCompletePage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { session_id?: string };
}) {
  if (!isValidLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const sessionId = searchParams.session_id?.trim() ?? '';
  const qs = new URLSearchParams();
  qs.set('lang', lang);
  if (sessionId) {
    qs.set('session_id', sessionId);
  }
  redirect(`/lanna-order-thank-you?${qs.toString()}`);
}
