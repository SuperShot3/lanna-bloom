# Analytics Runbook

## Architecture

- GTM is the only analytics transport for client-side events.
- The app only pushes structured events into `window.dataLayer`.
- Direct `gtag` is removed from the app code.
- Analytics load only in production.
- There are no fallback GA/GTM IDs in source.
- **Server-side purchase**: When an order is marked paid (admin “Mark as paid” or Stripe webhook), the backend sends a `purchase` event to GA4 via the Measurement Protocol. This does not require the user to revisit the order page. See [Mark as paid → GA4 purchase](#mark-as-paid--ga4-purchase) below.

## Mark as paid → GA4 purchase

When an order becomes paid (admin marks as paid or Stripe checkout completes), the backend sends a single `purchase` event to GA4 via the **Measurement Protocol** (idempotent: at most once per order).

**Triggers:**

- Admin: **Mark as paid** on an order (`PATCH /api/admin/orders/[order_id]/mark-paid`).
- Stripe: **checkout.session.completed** / **checkout.session.async_payment_succeeded** webhook.

**Required Vercel env vars:**

| Variable | Where to get it |
|----------|------------------|
| `GA4_MEASUREMENT_ID` | GA4 Admin → Data Streams → your web stream → Measurement ID (e.g. `G-XXXXXXXXXX`) |
| `GA4_MEASUREMENT_API_SECRET` | Same stream → “Measurement Protocol API secrets” → Create and copy the secret |

If either is missing, the app still works; the backend logs a warning and does not send the purchase event. The `orders` table columns `ga4_purchase_sent` and `ga4_purchase_sent_at` record that the event was sent (for idempotency).

**Relevant code:** `lib/ga4/sendPurchaseForOrder.ts`, `lib/ga4/measurementProtocol.ts`, mark-paid route, Stripe webhook route.

## Runtime Configuration

- Required client env var (for GTM): `NEXT_PUBLIC_GTM_ID`
- GTM loader lives in `components/GoogleAnalytics.tsx`
- Structured event helpers live in `lib/analytics.ts`
- dataLayer transport and purchase dedupe live in `lib/analytics/gtag.ts`

If `NEXT_PUBLIC_GTM_ID` is missing or `NODE_ENV !== 'production'`, the app does not load GTM.

## Consent Defaults

Consent Mode defaults are bootstrapped before GTM loads:

- `analytics_storage: granted`
- `ad_storage: denied`
- `ad_user_data: denied`
- `ad_personalization: denied`

This keeps analytics working now while leaving a clean upgrade path for a future consent banner.

## GTM Container Requirements

### Pageviews

The app does not push `page_view` from code. GTM owns pageviews.

Recommended setup:

1. GA4 Configuration tag on `All Pages`
2. SPA pageview handling via `History Change`
3. Do not add a Custom Event trigger for `page_view`

### Custom Event Triggers

Create GTM custom event triggers for:

- `view_item_list`
- `select_item`
- `view_item`
- `add_to_cart`
- `remove_from_cart`
- `view_cart`
- `begin_checkout`
- `add_shipping_info`
- `add_payment_info`
- `purchase`
- `generate_lead`
- `contact_click`
- `messenger_click`
- `language_change`
- home CTA event names such as `cta_home_top`

### Recommended Data Layer Variables

- `event`
- `items`
- `value`
- `currency`
- `transaction_id`
- `payment_type`
- `shipping_tier`
- `channel`
- `page_location`
- `page_path`
- `traffic_type`

## Event Inventory

| Event | Where it fires | Notes |
|------|----------------|-------|
| `page_view` | GTM-only, initial load + SPA route changes | App code does not emit it |
| `view_item_list` | Catalog load | Deduped by list name |
| `select_item` | Catalog card click | Uses structured ecommerce item payload |
| `view_item` | Product detail page load | Deduped by item id |
| `add_to_cart` | Product add to cart | Includes `items`, `value`, `currency` |
| `remove_from_cart` | Cart line removal | Includes removed item payload |
| `view_cart` | Cart page with items | Deduped once per session |
| `begin_checkout` | User starts order/payment flow | No longer fires on cart page view |
| `add_shipping_info` | Delivery info added | Triggered once shipping info is meaningfully present |
| `add_payment_info` | User clicks Stripe payment CTA | Includes `payment_type: 'card'` |
| `purchase` | Order is confirmed paid | Stripe success now; manual-payment success can also fire later when the success page sees confirmed payment |
| `generate_lead` | Manual-payment order created but not yet paid | Separate from revenue |
| `contact_click` | LINE / WhatsApp / Telegram click | Canonical contact event |
| `messenger_click` | Legacy messenger event | Kept for backward-compatible reporting |
| `language_change` | Language switcher | Includes `language` and `page_path` |

Removed legacy messenger events:

- `click_line`
- `click_whatsapp`
- `click_telegram`

## Revenue Tracking Rules

### Stripe

- `purchase` fires only after Stripe payment confirmation.
- `purchase_sent:{orderId}` in local storage prevents duplicates on refresh or back/forward.

### Manual Payment Methods

- `generate_lead` fires when the order is created but still unpaid.
- `purchase` fires later only if the success page fetch sees confirmed paid status from `/api/orders/[orderId]`.
- This keeps lead creation separate from recognized revenue.

## Messenger Conversion Rules

- Primary contact event: `contact_click`
- Legacy reporting event: `messenger_click`
- Do not mark both as primary conversions in GA4 or Google Ads.

Recommended GA4 key event setup:

- Primary: `purchase`
- Secondary / observation only: `generate_lead`, `contact_click`

## Internal Traffic Exclusion

Internal traffic exclusion is still handled through `traffic_type: 'internal'`.

Relevant files:

- `app/layout.tsx`
- `components/InternalTrafficBootstrap.tsx`
- `lib/cookies.ts`

The head inline script sets the internal staff cookie and pushes `traffic_type` before GTM loads. The client bootstrap pushes `traffic_type` again on SPA route changes.

### GTM / GA4 Setup For Internal Traffic

1. Create data layer variable `traffic_type`
2. Pass `traffic_type` as a GA4 event parameter
3. In GA4, define internal traffic where `traffic_type = internal`
4. Keep the internal traffic filter in `Testing` before making it `Active`

## Validation Checklist

### Browser DevTools

- Confirm no request to `gtag/js`
- Confirm GTM loads only in production
- Confirm `window.gtag` is not used
- Confirm `window.dataLayer` receives expected event objects
- Confirm `purchase_sent:{orderId}` appears after purchase
- Confirm `traffic_type: 'internal'` appears when using `?internal_user=true`

### GTM Preview

- Confirm one pageview path only on landing
- Confirm SPA route changes are handled by GTM pageview logic
- Confirm each custom event appears in the preview event stream
- Confirm expected GA4 tags fire for:
  - `view_item_list`
  - `select_item`
  - `view_item`
  - `add_to_cart`
  - `view_cart`
  - `begin_checkout`
  - `add_shipping_info`
  - `add_payment_info`
  - `purchase`
  - `generate_lead`
  - `contact_click`

### GA4 DebugView

- Confirm one initial `page_view`
- Confirm one `page_view` per SPA route change
- Confirm ecommerce events arrive with expected `items`, `value`, `currency`
- Confirm `begin_checkout` no longer fires on cart view
- Confirm `purchase` appears exactly once per paid order
- Confirm `generate_lead` appears only for unpaid manual-order creation

## Manual Test Flow

1. Open home, then navigate to catalog
2. Confirm GTM-generated `page_view`
3. Confirm `view_item_list`
4. Click a catalog card and confirm `select_item`
5. Open PDP and confirm `view_item`
6. Add to cart and confirm `add_to_cart`
7. Open cart and confirm `view_cart` only
8. Start checkout and confirm `begin_checkout`
9. Add shipping details and confirm `add_shipping_info`
10. Click Stripe payment CTA and confirm `add_payment_info`
11. Complete Stripe checkout and confirm one `purchase`
12. Create a manual-payment order and confirm `generate_lead`
13. Re-open the success page after the order is marked paid and confirm one `purchase`

## Audit: Purchase and GTM-Only

- **Purchase transport**: The app never calls `gtag('event', 'purchase', ...)` or any GA4 API. It only pushes `{ event: 'purchase', ... }` to `window.dataLayer`. GTM is the only system that sends purchase to GA4.
- **Single code path**: Purchase is pushed from `components/OrderPaidPurchaseTracker.tsx` when the user views the order details page (`/order/[orderId]`) and the order is confirmed paid (Stripe webhook or admin mark-paid). It calls `trackPurchase` from `lib/analytics.ts`, which delegates to `lib/analytics/gtag.ts` → `dataLayer.push(...)`. The confirmation-pending (checkout) page never fires purchase.
- **Duplicate guard**: (1) Success page uses `purchaseTrackedRef` and `wasPurchaseSent(orderId)` so we don’t call `trackPurchase` twice in one session or on revisit. (2) `gtag.ts` `trackPurchase` uses `purchase_sent:<orderId>` in localStorage and sessionStorage; it pushes at most once per orderId.
- **generate_lead**: `trackGenerateLead` only pushes `generate_lead` to dataLayer. It does not call or trigger any purchase logic.

## Files Controlling Analytics Logic

- `components/GoogleAnalytics.tsx`
- `app/layout.tsx`
- `components/InternalTrafficBootstrap.tsx`
- `lib/analytics.ts`
- `lib/analytics/gtag.ts`
- `components/CatalogWithFilters.tsx`
- `app/[lang]/catalog/[slug]/ProductPageClient.tsx`
- `app/[lang]/catalog/[slug]/ProductDetailClient.tsx`
- `components/ProductOrderBlock.tsx`
- `components/ProductOrderBlockForProduct.tsx`
- `components/GiftsCarousel.tsx`
- `app/[lang]/cart/CartPageClient.tsx`
- `components/OrderPaidPurchaseTracker.tsx` (on `app/order/[orderId]/page.tsx` when paid)
- `components/MessengerOrderButtons.tsx`
- `components/MessengerLinks.tsx`
- `components/OrderDetailsView.tsx`
- `components/Hero.tsx`
- `components/StickyHomeCta.tsx`
- `components/HomeBottomCta.tsx`
- `components/LanguageSwitcher.tsx`
