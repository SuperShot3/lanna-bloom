import { auth } from '@/auth';
import {
  getDeliveryDestinations,
  getDistricts,
  getLatestSupplierRequestSummariesForOrders,
  getOpenDeliverySummary,
  getOrders,
} from '@/lib/supabase/adminQueries';
import { DELIVERY_DESTINATIONS } from '@/lib/delivery/markets';
import { DeliveryBoardClient } from './DeliveryBoardClient';
import { shopTodayYmd } from '@/lib/shopTime';
import { canAssignDriver, canChangeStatus } from '@/lib/adminRbac';
import { isOrderChatEnabled } from '@/lib/orderChat/enabled';
import { getBaseUrl } from '@/lib/siteUrl';
import { enrichDeliveryBoardOrderImages } from '@/lib/orders/enrichOrderItemImages';

interface PageProps {
  searchParams: Promise<{
    orderId?: string;
    recipientPhone?: string;
    q?: string;
    status?: string;
    payment?: string;
    district?: string;
    destination?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pipeline?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 80;
  const today = shopTodayYmd();
  const qTrim = params.q?.trim() ?? '';
  const searching = Boolean(qTrim);
  const pipelineOpen = params.pipeline === 'open';
  const paramDateFrom = params.dateFrom?.trim() || undefined;
  const paramDateTo = params.dateTo?.trim() || undefined;
  const hasBoardRange = !searching && !pipelineOpen && Boolean(paramDateFrom || paramDateTo);
  const boardDateFrom = hasBoardRange ? paramDateFrom || paramDateTo || today : today;
  const boardDateTo = hasBoardRange ? paramDateTo || paramDateFrom || today : today;

  let deliveryDateFrom: string | undefined;
  let deliveryDateTo: string | undefined;
  if (pipelineOpen) {
    deliveryDateFrom = undefined;
    deliveryDateTo = undefined;
  } else if (searching) {
    deliveryDateFrom = paramDateFrom;
    deliveryDateTo = paramDateTo;
  } else {
    deliveryDateFrom = boardDateFrom;
    deliveryDateTo = boardDateTo;
  }

  const filters = {
    orderId: params.orderId,
    recipientPhone: params.recipientPhone,
    q: params.q,
    orderStatus: pipelineOpen ? undefined : params.status,
    paymentStatus: pipelineOpen ? ('paid' as const) : (params.payment as 'paid' | 'unpaid' | undefined),
    district: params.district,
    deliveryDestination: params.destination,
    deliveryDateFrom,
    deliveryDateTo,
    openPipeline: pipelineOpen,
  };

  const [result, districts, destRows, openDeliverySummary] = await Promise.all([
    getOrders(filters, { page, pageSize }),
    getDistricts(),
    getDeliveryDestinations(),
    getOpenDeliverySummary(today),
  ]);

  const [supplierSummariesByOrderId, ordersWithCorrectThumbs] = await Promise.all([
    getLatestSupplierRequestSummariesForOrders(result.orders.map((o) => o.order_id)),
    enrichDeliveryBoardOrderImages(result.orders),
  ]);

  const deliveryDestinations = Array.from(
    new Set([...DELIVERY_DESTINATIONS, ...destRows])
  ).sort();

  return (
    <DeliveryBoardClient
      initialOrders={ordersWithCorrectThumbs}
      initialTotal={result.total}
      initialError={result.error}
      initialFilters={filters}
      boardDateFrom={boardDateFrom}
      boardDateTo={boardDateTo}
      searchDateFrom={searching ? paramDateFrom : undefined}
      searchDateTo={searching ? paramDateTo : undefined}
      searchAllDates={searching}
      pipelineOpen={pipelineOpen}
      openDeliverySummary={openDeliverySummary}
      initialPage={page}
      pageSize={pageSize}
      districts={districts}
      deliveryDestinations={deliveryDestinations}
      supplierSummariesByOrderId={supplierSummariesByOrderId}
      canEditStatus={canChangeStatus(role)}
      canAssignDriver={canAssignDriver(role)}
      orderChatEnabled={isOrderChatEnabled()}
      appBaseUrl={getBaseUrl()}
    />
  );
}
