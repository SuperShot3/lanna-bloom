import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';
import { getMarketByPathSlug } from '@/lib/delivery/markets';
import { DeliveryMarketProvider } from '@/contexts/DeliveryMarketContext';
import { DeliveryMarketSessionBridge } from '@/components/DeliveryMarketSessionBridge';

export default function MarketLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string; market: string };
}) {
  if (!isValidLocale(params.lang)) notFound();
  const entry = getMarketByPathSlug(params.market);
  if (!entry) notFound();

  const market = {
    destinationId: entry.destinationId,
    pathSlug: entry.pathSlug,
    labelEn: entry.customerFacingNameEn,
    labelTh: entry.customerFacingNameTh,
  };

  return (
    <DeliveryMarketProvider
      destinationId={entry.destinationId}
      pathSlug={entry.pathSlug}
      labelEn={entry.customerFacingNameEn}
      labelTh={entry.customerFacingNameTh}
    >
      <DeliveryMarketSessionBridge market={market} />
      {children}
    </DeliveryMarketProvider>
  );
}
