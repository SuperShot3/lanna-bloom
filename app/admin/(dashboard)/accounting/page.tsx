import { redirect } from 'next/navigation';

/** Legacy `?tab=` deep links redirect to nested routes (non-tab query params preserved). */
export default async function AdminAccountingIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const tab = typeof params.tab === 'string' ? params.tab : undefined;

  let targetPath = '/admin/accounting/overview';
  if (tab === 'expenses') targetPath = '/admin/accounting/expenses';
  else if (tab === 'income') targetPath = '/admin/accounting/income';
  else if (tab === 'transfers') targetPath = '/admin/accounting/payouts-transfers';
  else if (tab === 'ledger') targetPath = '/admin/accounting/ledger';

  const q = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (key === 'tab' || raw === undefined) continue;
    q.set(key, raw);
  }
  const qs = q.toString();
  redirect(qs ? `${targetPath}?${qs}` : targetPath);
}
