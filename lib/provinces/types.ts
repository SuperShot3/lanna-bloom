/**
 * Province configuration (Feature 1 — Thailand expansion).
 * Status, advance notice, and cutoff drive checkout date rules via Feature 3
 * (`lib/delivery/deliveryConstraints.ts` + create-checkout-session).
 * Fees remain in zones/markets.
 */

export const PROVINCE_STATUSES = [
  'coming_soon',
  'preorder_only',
  'next_day',
  'same_day',
  'temporarily_unavailable',
] as const;

export type ProvinceStatus = (typeof PROVINCE_STATUSES)[number];

export const SEO_PAGE_STATUSES = ['not_planned', 'planned', 'published'] as const;

export type SeoPageStatus = (typeof SEO_PAGE_STATUSES)[number];

export type ProvinceRow = {
  id: string;
  province_code: string;
  province_name_en: string;
  province_name_th: string;
  topojson_property_value: string | null;
  destination_id: string | null;
  status: ProvinceStatus;
  catalog_enabled: boolean;
  min_advance_notice_hours: number | null;
  same_day_cutoff_local: string | null;
  customer_message_en: string | null;
  customer_message_th: string | null;
  delivery_limitations_en: string | null;
  delivery_limitations_th: string | null;
  available_categories: string[] | null;
  seo_page_status: SeoPageStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Customer-safe projection — never includes internal_notes. */
export type PublicProvince = {
  province_code: string;
  province_name_en: string;
  province_name_th: string;
  topojson_property_value: string | null;
  status: ProvinceStatus;
  catalog_enabled: boolean;
  min_advance_notice_hours: number | null;
  same_day_cutoff_local: string | null;
  customer_message_en: string | null;
  customer_message_th: string | null;
  delivery_limitations_en: string | null;
  delivery_limitations_th: string | null;
  available_categories: string[] | null;
};

export type ProvinceUpdateInput = {
  status?: ProvinceStatus;
  catalog_enabled?: boolean;
  min_advance_notice_hours?: number | null;
  same_day_cutoff_local?: string | null;
  customer_message_en?: string | null;
  customer_message_th?: string | null;
  delivery_limitations_en?: string | null;
  delivery_limitations_th?: string | null;
  available_categories?: string[] | null;
  seo_page_status?: SeoPageStatus;
  internal_notes?: string | null;
};
