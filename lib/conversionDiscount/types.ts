export type DiscountAnalyticsEventName =
  | 'discount_eligible'
  | 'discount_popup_shown'
  | 'discount_popup_closed'
  | 'discount_offer_activated'
  | 'discount_timer_expired'
  | 'discount_added_to_cart'
  | 'discount_checkout_started'
  | 'discount_purchase_completed';

export interface VisitorState {
  visitor_id: string;
  first_visit_at: number;
  last_visit_at: number;
  visit_count: number;
  session_started_at: number;
  product_view_count: number;
  viewed_product_ids: string[];
  cart_has_items: boolean;
  checkout_started: boolean;
  purchase_completed: boolean;
  discount_offer_shown: boolean;
  discount_offer_started_at: number | null;
  discount_offer_expires_at: number | null;
  discount_offer_used: boolean;
  discount_offer_activated: boolean;
  pill_dismissed: boolean;
  /** Dedupe analytics within the current offer window. */
  analytics_fired: DiscountAnalyticsEventName[];
}

export type IntentRule = (state: VisitorState, now: number) => boolean;

export type VisitorType = 'new' | 'returning';
