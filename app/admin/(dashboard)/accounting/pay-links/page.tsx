import { AccountingShellClient } from '../AccountingShellClient';
import { PayLinksPanel } from '../PayLinksPanel';
import { listAdminPayLinks } from '@/lib/payLinks/listAdminPayLinks';

export default async function AdminPayLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentStatus?: string }>;
}) {
  const params = await searchParams;
  const statusRaw = params.paymentStatus;
  const paymentStatus =
    statusRaw === 'PAID' || statusRaw === 'NOT_PAID' || statusRaw === 'all' ? statusRaw : 'all';

  const result = await listAdminPayLinks({ paymentStatus });

  return (
    <AccountingShellClient periodLabel="Pay links" isAllTime>
      {result.error ? (
        <div className="admin-error">
          <p>
            <strong>Could not load pay links</strong>
          </p>
          <p>{result.error}</p>
        </div>
      ) : (
        <PayLinksPanel rows={result.rows} paymentStatus={paymentStatus} />
      )}
    </AccountingShellClient>
  );
}
