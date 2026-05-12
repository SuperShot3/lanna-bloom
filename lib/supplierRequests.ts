import { nanoid } from 'nanoid';
import type { CustomOrderDetails, Order } from '@/lib/orders';
import type { OrderSummaryItemRow } from '@/lib/admin/orderSummaryPlainText';
import {
  checkoutMapsUrl,
  customerDeliveryAddressRaw,
} from '@/lib/admin/orderSummaryPlainText';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import {
  destinationDisplayName,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { zoneLabel } from '@/lib/delivery/zones';

function resolveSupplierRequestBaseUrl(): string {
  const configuredSupplierUrl = process.env.SUPPLIER_REQUEST_BASE_URL?.trim();
  if (configuredSupplierUrl) return configuredSupplierUrl.replace(/\/+$/, '');

  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicAppUrl) return publicAppUrl.replace(/\/+$/, '');

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  }

  return 'http://localhost:3000';
}

export const SUPPLIER_REQUEST_BASE_URL = resolveSupplierRequestBaseUrl();

export const SUPPLIER_SHOPS = [
  { id: 'mod_dam', name: 'Mod Dam' },
  { id: 'kaset', name: 'Kaset' },
  { id: 'toi', name: 'Toi' },
] as const;

export type SupplierShopId = (typeof SUPPLIER_SHOPS)[number]['id'];

export type SupplierRequestStatus =
  | 'LINK_CREATED'
  | 'LINK_SENT'
  | 'LINK_OPENED'
  | 'WAITING_RESPONSE'
  | 'ACCEPTED'
  | 'ACCEPTED_WITH_CHANGES'
  | 'DECLINED'
  | 'APPROVED'
  | 'DISABLED'
  | 'EXPIRED';

export type SupplierResponseType = 'PREPARE' | 'PREPARE_WITH_CHANGES' | 'DECLINE';

export const SUPPLIER_ACTIVE_STATUSES: SupplierRequestStatus[] = [
  'LINK_CREATED',
  'LINK_SENT',
  'LINK_OPENED',
  'WAITING_RESPONSE',
];

export const SUPPLIER_RESPONDED_STATUSES: SupplierRequestStatus[] = [
  'ACCEPTED',
  'ACCEPTED_WITH_CHANGES',
  'DECLINED',
];

export const SUPPLIER_STATUS_LABELS_TH: Record<SupplierRequestStatus, string> = {
  LINK_CREATED: 'สร้างลิงก์แล้ว',
  LINK_SENT: 'ส่งลิงก์แล้ว',
  LINK_OPENED: 'ร้านเปิดดูแล้ว',
  WAITING_RESPONSE: 'รอคำตอบจากร้าน',
  ACCEPTED: 'ร้านรับทำ',
  ACCEPTED_WITH_CHANGES: 'ร้านรับทำพร้อมเงื่อนไข',
  DECLINED: 'ร้านปฏิเสธ',
  APPROVED: 'แอดมินยืนยันร้านนี้',
  DISABLED: 'ปิดลิงก์แล้ว',
  EXPIRED: 'ลิงก์หมดอายุ',
};

export const SUPPLIER_STATUS_LABELS_EN: Record<SupplierRequestStatus, string> = {
  LINK_CREATED: 'Link created',
  LINK_SENT: 'Link copied',
  LINK_OPENED: 'Shop opened',
  WAITING_RESPONSE: 'Waiting for response',
  ACCEPTED: 'Accepted',
  ACCEPTED_WITH_CHANGES: 'Accepted with changes',
  DECLINED: 'Declined',
  APPROVED: 'Approved',
  DISABLED: 'Disabled',
  EXPIRED: 'Expired',
};

export const SUPPLIER_RESPONSE_LABELS_TH: Record<SupplierResponseType, string> = {
  PREPARE: 'รับทำตามรายละเอียด',
  PREPARE_WITH_CHANGES: 'รับทำ แต่มีรายละเอียดต้องปรับ',
  DECLINE: 'ไม่สะดวกรับงานนี้',
};

export const SUPPLIER_RESPONSE_LABELS_EN: Record<SupplierResponseType, string> = {
  PREPARE: 'Accepted as requested',
  PREPARE_WITH_CHANGES: 'Accepted with changes',
  DECLINE: 'Declined',
};

export interface SupplierProductSnapshotItem {
  title: string;
  titleTh?: string | null;
  displayTitle: string;
  size?: string | null;
  sizeTh?: string | null;
  itemType?: string | null;
  imageUrl?: string | null;
  preparationTimeMinutes?: number | null;
}

export interface SupplierProductSnapshot {
  items: SupplierProductSnapshotItem[];
  customOrder?: {
    giftDescription?: string | null;
    occasion?: string | null;
    referenceImageUrl?: string | null;
    customerComments?: string | null;
  } | null;
}

export interface SupplierPreparationSnapshot {
  deliveryDate?: string | null;
  deliveryWindow?: string | null;
  deliveryDestination?: string | null;
  deliveryDestinationLabelTh?: string | null;
  deliveryZone?: string | null;
  deliveryZoneLabelTh?: string | null;
  postalCode?: string | null;
  district?: string | null;
  deliveryNotes?: string | null;
  customTimePreference?: string | null;
  customTimeComments?: string | null;
}

export interface SupplierPickupSnapshot {
  orderRef: string;
  deliveryWhen: string;
  deliveryArea: string;
  googleMapsAvailable: boolean;
  addressAvailable: boolean;
}

export interface SupplierMessageCardSnapshot {
  cards: Array<{
    itemTitle: string;
    cardType?: string | null;
    wrappingOption?: string | null;
    cardMessage?: string | null;
    balloonText?: string | null;
  }>;
  customGreetingCard?: string | null;
}

export interface SupplierCatalogSnapshot {
  nameTh?: string | null;
  sizeTh?: string | null;
  preparationTimeMinutes?: number | null;
}

export interface SupplierSnapshotBundle {
  product_snapshot: SupplierProductSnapshot;
  preparation_snapshot: SupplierPreparationSnapshot;
  pickup_snapshot: SupplierPickupSnapshot;
  message_card_snapshot: SupplierMessageCardSnapshot;
}

export function findSupplierShop(shopId: string) {
  return SUPPLIER_SHOPS.find((shop) => shop.id === shopId);
}

export function generateSupplierPublicToken(): string {
  return nanoid(32);
}

export function buildSupplierRequestUrl(token: string): string {
  return `${SUPPLIER_REQUEST_BASE_URL}/task/${encodeURIComponent(token)}`;
}

export function isSupplierRequestStatus(value: string | null | undefined): value is SupplierRequestStatus {
  return Boolean(value && value in SUPPLIER_STATUS_LABELS_TH);
}

export function isActiveSupplierRequestStatus(status: string | null | undefined): boolean {
  return isSupplierRequestStatus(status) && SUPPLIER_ACTIVE_STATUSES.includes(status);
}

export function isRespondedSupplierRequestStatus(status: string | null | undefined): boolean {
  return isSupplierRequestStatus(status) && SUPPLIER_RESPONDED_STATUSES.includes(status);
}

export function isSupplierRequestExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() <= now.getTime();
}

export function isSupplierRequestPubliclyAvailable(
  status: string | null | undefined,
  expiresAt: string | null | undefined
): boolean {
  return isActiveSupplierRequestStatus(status) && !isSupplierRequestExpired(expiresAt);
}

export function supplierStatusLabelThai(status: string | null | undefined): string {
  return isSupplierRequestStatus(status) ? SUPPLIER_STATUS_LABELS_TH[status] : 'ไม่ทราบสถานะ';
}

export function supplierStatusLabelEnglish(status: string | null | undefined): string {
  return isSupplierRequestStatus(status) ? SUPPLIER_STATUS_LABELS_EN[status] : 'Unknown status';
}

export function supplierResponseLabelThai(responseType: string | null | undefined): string {
  if (
    responseType === 'PREPARE' ||
    responseType === 'PREPARE_WITH_CHANGES' ||
    responseType === 'DECLINE'
  ) {
    return SUPPLIER_RESPONSE_LABELS_TH[responseType];
  }
  return 'ยังไม่มีคำตอบ';
}

export function supplierResponseLabelEnglish(responseType: string | null | undefined): string {
  if (
    responseType === 'PREPARE' ||
    responseType === 'PREPARE_WITH_CHANGES' ||
    responseType === 'DECLINE'
  ) {
    return SUPPLIER_RESPONSE_LABELS_EN[responseType];
  }
  return 'No response yet';
}

function orderJsonPartial(order: SupabaseOrderRow): Partial<Order> | null | undefined {
  return order.order_json as Partial<Order> | null | undefined;
}

function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function deliveryDestinationLabelTh(destination: string | null | undefined): string | null {
  const value = destination?.trim();
  if (!value) return null;
  try {
    return destinationDisplayName(value as DeliveryDestinationId, 'th');
  } catch {
    return value;
  }
}

function deliveryZoneLabelTh(destination: string | null | undefined, zone: string | null | undefined): string | null {
  const dest = destination?.trim();
  const z = zone?.trim();
  if (!dest || !z) return null;
  return zoneLabel(dest as DeliveryDestinationId, z, 'th') ?? z;
}

function deliveryAreaText(snapshot: SupplierPreparationSnapshot): string {
  const parts = [
    snapshot.deliveryDestinationLabelTh,
    snapshot.deliveryZoneLabelTh,
    snapshot.postalCode ? `รหัสไปรษณีย์ ${snapshot.postalCode}` : null,
    snapshot.district,
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.length ? parts.join(' · ') : 'ไม่ระบุพื้นที่';
}

function deliveryWhenText(order: SupabaseOrderRow): string {
  const date = nullIfBlank(order.delivery_date);
  const window = nullIfBlank(order.delivery_window);
  return [date, window].filter(Boolean).join(' · ') || 'ไม่ระบุเวลา';
}

export function buildSupplierSnapshots(
  order: SupabaseOrderRow,
  items: OrderSummaryItemRow[],
  catalogByItemId: Record<string, SupplierCatalogSnapshot> = {}
): SupplierSnapshotBundle {
  const orderJson = orderJsonPartial(order);
  const customOrderDetails = orderJson?.customOrderDetails as CustomOrderDetails | undefined;
  const delivery = orderJson?.delivery;
  const deliveryDestination =
    nullIfBlank(order.delivery_destination) ?? nullIfBlank(delivery?.deliveryDestination);
  const deliveryZone = nullIfBlank(order.delivery_zone) ?? nullIfBlank(delivery?.deliveryZoneId);
  const postalCode = nullIfBlank(order.postal_code) ?? nullIfBlank(delivery?.postalCode);
  const district = nullIfBlank(order.district) ?? nullIfBlank(delivery?.district);

  const productItems = items.map((item, index) => {
    const catalogKey = item.id != null ? String(item.id) : `${item.bouquet_id ?? 'item'}:${index}`;
    const catalog = catalogByItemId[catalogKey] ?? {};
    const title = nullIfBlank(item.bouquet_title) ?? `รายการที่ ${index + 1}`;
    const titleTh = nullIfBlank(catalog.nameTh);
    const size = nullIfBlank(item.size);
    const sizeTh = nullIfBlank(catalog.sizeTh);
    return {
      title,
      titleTh,
      displayTitle: titleTh ?? title,
      size,
      sizeTh,
      itemType: nullIfBlank(item.item_type),
      imageUrl: nullIfBlank(item.image_url_snapshot),
      preparationTimeMinutes: catalog.preparationTimeMinutes ?? null,
    };
  });

  const preparationSnapshot: SupplierPreparationSnapshot = {
    deliveryDate: nullIfBlank(order.delivery_date) ?? nullIfBlank(customOrderDetails?.deliveryDateLabel),
    deliveryWindow: nullIfBlank(order.delivery_window) ?? nullIfBlank(delivery?.preferredTimeSlot),
    deliveryDestination,
    deliveryDestinationLabelTh: deliveryDestinationLabelTh(deliveryDestination),
    deliveryZone,
    deliveryZoneLabelTh: deliveryZoneLabelTh(deliveryDestination, deliveryZone),
    postalCode,
    district,
    deliveryNotes: nullIfBlank(delivery?.notes),
    customTimePreference: nullIfBlank(customOrderDetails?.timePreference),
    customTimeComments: nullIfBlank(customOrderDetails?.timeComments),
  };

  const pickupSnapshot: SupplierPickupSnapshot = {
    orderRef: order.order_id,
    deliveryWhen: deliveryWhenText(order),
    deliveryArea: deliveryAreaText(preparationSnapshot),
    googleMapsAvailable: Boolean(checkoutMapsUrl(order)),
    addressAvailable: Boolean(customerDeliveryAddressRaw(order).trim()),
  };

  return {
    product_snapshot: {
      items: productItems,
      customOrder: customOrderDetails
        ? {
            giftDescription: nullIfBlank(customOrderDetails.giftDescription),
            occasion: nullIfBlank(customOrderDetails.occasion),
            referenceImageUrl: nullIfBlank(customOrderDetails.referenceImageUrl),
            customerComments: nullIfBlank(customOrderDetails.customerComments),
          }
        : null,
    },
    preparation_snapshot: preparationSnapshot,
    pickup_snapshot: pickupSnapshot,
    message_card_snapshot: {
      cards: items.map((item, index) => ({
        itemTitle: nullIfBlank(item.bouquet_title) ?? `รายการที่ ${index + 1}`,
        cardType: nullIfBlank(item.addOns?.cardType),
        wrappingOption: nullIfBlank(item.addOns?.wrappingOption),
        cardMessage: nullIfBlank(item.addOns?.cardMessage),
        balloonText: nullIfBlank(item.addOns?.balloonText),
      })),
      customGreetingCard: nullIfBlank(customOrderDetails?.greetingCard),
    },
  };
}
