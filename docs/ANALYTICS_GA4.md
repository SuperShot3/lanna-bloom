# Analytics Runbook

## Architecture

- GTM is the only analytics transport for client-side events.
- The app only pushes structured events into `window.dataLayer`.
- Direct `gtag` is removed from the app code.
- Analytics load only in production.
- There are no fallback GA/GTM IDs in source.
- **Server-side GA4 `purchase`**: When an order is marked paid (admin “Mark as paid” or Stripe webhook), the backend sends a `purchase` event to GA4 via the Measurement Protocol. This does not require the user to revisit the order page. See [Mark as paid → GA4 purchase](#mark-as-paid--ga4-purchase) below.
- **Browser-side conversion event**: The app pushes **`google_ads_purchase`** only on the paid order page (not a separate dataLayer event named `purchase`). GTM should use a **Custom Event** trigger for `google_ads_purchase`. For GA4 revenue in the browser session, either rely on Measurement Protocol or add a **GA4 Event** tag in GTM on that same trigger (see [GA4 and `google_ads_purchase`](#ga4-and-google_ads_purchase) below).

## Paid order: `google_ads_purchase` dataLayer contract (canonical)

**Source code:** `components/order/OrderPageClient.tsx` (when `paid === true` and there is at least one line item) → `trackCheckoutPurchase` in `lib/analytics/gtag.ts`.

**Exact `event` name:** `google_ads_purchase` (lowercase, underscores).

**One pushed object includes** (plus `eventCallback` / `eventTimeout` used by GTM for tag sequencing):

| Key | Level | Description |
|-----|--------|-------------|
| `event` | root | Always `google_ads_purchase` |
| `order_id` | root | Trimmed order id |
| `transaction_id` | root | Same value as `order_id` (for tags that only read `transaction_id`) |
| `value` | root | Grand total (number) |
| `currency` | root | e.g. `THB` |
| `user_data` | root | `{ email_address?, phone_number? }` (normalized; may omit keys if empty) |
| `ecommerce` | root | `{ items: [...] }` — each item: `item_id`, `item_name`, `price`, `quantity` |

**Not used from the browser dataLayer:** an event named **`purchase`**. GA4 uses the event name **`purchase`** only on the **server** (Measurement Protocol). GTM triggers for the order page must listen for **`google_ads_purchase`**, not `purchase`.

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

### Stripe Dashboard (account emails)

Enable account notifications in **Stripe Dashboard → Settings → Emails** (e.g. successful payments, disputes). This is separate from app code.

## Consent Defaults

Consent Mode defaults are bootstrapped before GTM loads (see `components/GoogleAnalytics.tsx` — keep this doc in sync if that script changes):

- `analytics_storage: granted`
- `ad_storage: granted`
- `ad_user_data: granted`
- `ad_personalization: granted`

If you add a consent banner later, update that script so defaults match your policy.

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
- **`google_ads_purchase`** (paid order page — **primary** browser conversion payload for this site)
- `generate_lead`
- `contact_click`
- `messenger_click`
- `language_change`
- home CTA event names such as `cta_home_top`

Do **not** assume the app pushes a browser **`purchase`** event on the order page. GA4 `purchase` is normally from [Measurement Protocol](#mark-as-paid--ga4-purchase). Optionally add a GTM tag that maps `google_ads_purchase` → GA4 (below).

### Recommended Data Layer Variables

- `event`
- `order_id` (on `google_ads_purchase`)
- `items` (funnel events; not the same path as `ecommerce.items` on `google_ads_purchase`)
- `value`
- `currency`
- `transaction_id`
- `ecommerce` (object; use a **DL variable** version 2 / custom JS for `ecommerce.items` if needed)
- `user_data` (object; child keys `email_address`, `phone_number`)
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
| `begin_checkout` | User starts order/payment flow | Fires on cart page load (deduped per session) |
| `add_shipping_info` | Delivery info added | Triggered once shipping info is meaningfully present |
| `add_payment_info` | User continues to Stripe Checkout | Includes `payment_type: 'card'` (cart pay CTA) |
| `google_ads_purchase` | Paid order page `/order/[orderId]` | **`trackCheckoutPurchase`**: root `order_id`, `transaction_id`, `value`, `currency`, `user_data`, `ecommerce.items`. Dedupe: `google_ads_purchase_sent:<orderId>`. |
| `purchase` | GA4 **server** event name | **Measurement Protocol** when payment becomes paid (`sendPurchaseForOrder`). Not pushed from the default order page dataLayer (avoids double-counting if you also map `google_ads_purchase` → GA4). |
| `generate_lead` | Legacy / confirmation-pending manual flows | Separate from revenue; website checkout is Stripe-first |
| `contact_click` | LINE / WhatsApp / Telegram click | Canonical contact event |
| `messenger_click` | Legacy messenger event | Kept for backward-compatible reporting |
| `language_change` | Language switcher | Includes `language` and `page_path` |

Removed legacy messenger events:

- `click_line`
- `click_whatsapp`
- `click_telegram`

## Revenue Tracking Rules

### Stripe

- `purchase` is sent via Measurement Protocol when the webhook (or sync-checkout-session) confirms payment, idempotent via `ga4_purchase_sent` in the database.

### Manual Payment Methods

- `generate_lead` fires when the order is created but still unpaid.
- When the order later becomes **paid**, GA4 `purchase` is sent via **Measurement Protocol** (same Stripe/admin paths as above), not via a second browser event name you must add in code.
- Browser **`google_ads_purchase`** fires when the customer opens the **paid** order page (same payload rules as Stripe).

## GA4 and `google_ads_purchase`

**Default (recommended):** GA4 **`purchase`** is sent by **Measurement Protocol** when the backend confirms payment (`sendPurchaseForOrder`). Configure `GA4_MEASUREMENT_ID` and `GA4_MEASUREMENT_API_SECRET` on the server.

**Browser:** The app pushes **`google_ads_purchase`** only (not `purchase`) on the paid order page. Your **Google Ads** conversion tag should use a Custom Event trigger on **`google_ads_purchase`**.

**Optional — map the same push to GA4 in GTM:** Add a **Google Analytics: GA4 Event** tag, trigger **Custom Event** = `google_ads_purchase`, event name **`purchase`**, and map parameters from the data layer (`transaction_id`, `value`, `currency`, `ecommerce.items`). **Warning:** If Measurement Protocol already sends `purchase` for the same order, sending another `purchase` from the browser can **double-count** in GA4 unless you use a single reporting path or identical `transaction_id` and a documented dedupe approach. Prefer **one** primary source for GA4 purchase revenue unless you know what you are doing.

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
- On a **paid** order page, confirm **`google_ads_purchase`** appears (not necessarily `purchase`)
- If retesting the **same** order id, clear or use new storage keys: `google_ads_purchase_sent:<orderId>`
- Confirm `traffic_type: 'internal'` appears when using `?internal_user=true`

### GTM Preview

- Confirm one pageview path only on landing
- Confirm SPA route changes are handled by GTM pageview logic
- Confirm each custom event appears in the preview event stream
- Confirm expected GA4 funnel tags fire for:
  - `view_item_list`
  - `select_item`
  - `view_item`
  - `add_to_cart`
  - `view_cart`
  - `begin_checkout`
  - `add_shipping_info`
  - `add_payment_info`
  - **`google_ads_purchase`** (paid order page)
  - `generate_lead`
  - `contact_click`

### GA4 DebugView

- Confirm one initial `page_view`
- Confirm one `page_view` per SPA route change
- Confirm funnel ecommerce events use the expected `items`, `value`, `currency` (shape differs from `google_ads_purchase`, which uses `ecommerce.items`)
- Confirm `begin_checkout` no longer fires on cart view
- Confirm GA4 **`purchase`** appears **at most once** per paid order (usually **Measurement Protocol**; may not appear in DebugView tied to the browser device_id the same way as on-site events)
- Confirm **`google_ads_purchase`** appears in GTM Preview when loading a **paid** order URL with token
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
10. Click Stripe payment CTA and confirm `add_payment_info`
11. Complete Stripe checkout; on the **paid** order page confirm **`google_ads_purchase`** in GTM Preview / dataLayer. Confirm GA4 **`purchase`** via MP (DebugView timing may lag; check `ga4_purchase_sent` / admin logs if needed).
12. Create a manual-payment order and confirm `generate_lead`
13. After the order is marked paid, open the paid order page again and confirm **`google_ads_purchase`** does **not** duplicate (dedupe) unless you cleared storage

## Troubleshooting (naming & GTM)

Use this list when “nothing fires” or “wrong variable is empty”:

1. **Trigger event name** must match **exactly** `google_ads_purchase` (case-sensitive, underscores). Do not use `Google_Ads_Purchase` or `google-ads-purchase`. Do **not** use a GTM trigger on **`purchase`** for the order page — that name is the **GA4 server** event from Measurement Protocol, not a browser dataLayer event from this app.
2. **Data Layer variable names** on this event are **root-level** `order_id`, `transaction_id`, `value`, `currency`; line items are under **`ecommerce.items`**, not root `items`. Funnel events use root `items` — do not reuse the same GTM variable for both.
3. **`user_data`**: nested keys are `email_address` and `phone_number` (may be undefined if the customer did not provide them).
4. **Dedupe:** keys `google_ads_purchase_sent:<orderId>` in localStorage and sessionStorage prevent a second push for the same order on the same browser. For QA, use a **new order**, incognito, or clear those keys.
5. **Empty push:** If the order has **no line items** and no fallback synthetic item, the effect exits early and **nothing** is pushed. Check `order.items` in the API response.
6. **GTM not loaded:** `components/GoogleAnalytics.tsx` loads GTM only when `NODE_ENV === 'production'` and `NEXT_PUBLIC_GTM_ID` is set; `/admin` skips the component.
8. **GTM race (Tag Assistant):** If `manual_test_event` from the console appears but **`google_ads_purchase` does not**, the push may have run before `gtm.js` wired the container. The app **defers** `google_ads_purchase` until `window.google_tag_manager['GTM-…']` exists (or ~4s fallback) — see `runWhenGtmLikelyReady` in `lib/analytics/gtag.ts`. Ensure **`NEXT_PUBLIC_GTM_ID`** matches your container id (including `GTM-` prefix).

## Audit: Purchase transport (client + server)

- **Browser (dataLayer → GTM):** On the **paid** order page, `components/order/OrderPageClient.tsx` calls **`trackCheckoutPurchase`** → `lib/analytics/gtag.ts` → `dataLayer.push` with **`event: 'google_ads_purchase'`** and the root-level keys documented in **Paid order: `google_ads_purchase` dataLayer contract** above. Used for Google Ads (and optionally a GTM-authored GA4 tag). **Not** `OrderPaidPurchaseTracker.tsx` (that file does not exist — use `OrderPageClient` only).
- **Server (Measurement Protocol):** When an order becomes paid (Stripe webhook, admin “Mark as paid”, or admin payment-status → PAID), the backend sends GA4 **`purchase`** via **`lib/ga4/measurementProtocol.ts`** / **`sendPurchaseForOrder.ts`** (`app/api/stripe/webhook/route.ts`, mark-paid, payment-status routes).
- **Duplicate guard:** (1) **Browser:** `google_ads_purchase_sent:<orderId>` in localStorage + sessionStorage. (2) **Server:** `ga4_purchase_sent` in the database for MP idempotency.
- **`generate_lead`:** `trackGenerateLead` only pushes `generate_lead`; it does not call purchase helpers.

## Files Controlling Analytics Logic

- `components/GoogleAnalytics.tsx`
- `app/layout.tsx`
- `components/InternalTrafficBootstrap.tsx`
- `lib/analytics.ts`
- `lib/analytics/gtag.ts`
- `lib/ga4/measurementProtocol.ts` (server: GA4 Measurement Protocol)
- `lib/ga4/sendPurchaseForOrder.ts` (server: idempotent purchase send)
- `app/api/stripe/webhook/route.ts` (calls sendPurchaseForOrder on checkout.session.completed)
- `app/api/admin/orders/[order_id]/mark-paid/route.ts` (calls sendPurchaseForOrder)
- `app/api/admin/orders/[order_id]/payment-status/route.ts` (calls sendPurchaseForOrder when status → PAID)
- `components/CatalogWithFilters.tsx`
- `app/[lang]/catalog/[slug]/ProductPageClient.tsx`
- `app/[lang]/catalog/[slug]/ProductDetailClient.tsx`
- `components/ProductOrderBlock.tsx`
- `components/ProductOrderBlockForProduct.tsx`
- `components/GiftsCarousel.tsx`
- `app/[lang]/cart/CartPageClient.tsx`
- `components/order/OrderPageClient.tsx` (paid order: `trackCheckoutPurchase` → `google_ads_purchase`)
- `app/order/[orderId]/page.tsx`
- `components/MessengerOrderButtons.tsx`
- `components/MessengerLinks.tsx`
- `components/OrderDetailsView.tsx`
- `components/Hero.tsx`
- `components/StickyHomeCta.tsx`
- `components/HomeBottomCta.tsx`
- `components/LanguageSwitcher.tsx`
