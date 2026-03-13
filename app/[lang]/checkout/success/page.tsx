import { redirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';

/**
 * Legacy route: redirect to confirmation-pending so all post-checkout behavior
 * lives in one place. No success UI or purchase logic here.
 */
export default async function CheckoutSuccessRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ orderId?: string; publicOrderUrl?: string; shareText?: string; session_id?: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) {
    redirect(`/${lang}/cart`);
  }
  const q = await searchParams;
  const search = new URLSearchParams();
  if (typeof q.orderId === 'string' && q.orderId.trim()) search.set('orderId', q.orderId.trim());
  if (typeof q.publicOrderUrl === 'string') search.set('publicOrderUrl', q.publicOrderUrl);
  if (typeof q.shareText === 'string') search.set('shareText', q.shareText);
  if (typeof q.session_id === 'string' && q.session_id.trim()) search.set('session_id', q.session_id.trim());
  redirect(`/${lang}/checkout/confirmation-pending?${search.toString()}`);
}
