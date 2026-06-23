import { redirect } from 'next/navigation';

/** Legacy route — personal withdrawals live under Payouts. */
export default async function AccountingWithdrawalsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw !== undefined) q.set(key, raw);
  }
  const qs = q.toString();
  redirect(qs ? `/admin/accounting/payouts-transfers?${qs}` : '/admin/accounting/payouts-transfers');
}
