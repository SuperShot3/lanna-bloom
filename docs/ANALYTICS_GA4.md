# Analytics Runbook

## Architecture

- GTM is the only analytics transport for client-side events.
- The app only pushes structured events into `window.dataLayer`.
- Direct `gtag` is removed from the app code.
- Analytics load only in production.
- There are no fallback GA/GTM IDs in source.
- **GA4 `purchase` (authoritative):** Sent by **Measurement Protocol** when the order is marked paid (Stripe webhook, admin mark paid, etc.). Idempotent in DB. See [Mark as paid → GA4 purchase](#mark-as-paid--ga4-purchase).
- **Browser `purchase` (dataLayer):** Pushed once per order on the paid order page (`trackCheckoutPurchase`). Use in GTM for **Google Ads** (and similar) only — **do not** attach a GA4 Event tag for `purchase` here if MP already sends GA4 `purchase`, or revenue doubles. Dedupe: `sent_purchase_<orderId>` in localStorage.

## Paid order: browser `purchase` (canonical)

**Source code:** `components/order/OrderPageClient.tsx` (when `paid === true` and there is at least one line item) → `trackCheckoutPurchase` in `lib/analytics/gtag.ts`.

**Event `purchase`** — at most once per order id (`sent_purchase_<orderId>`). Sequence: `dataLayer.push({ ecommerce: null })` then `pushToDataLayer('purchase', { ecommerce })` where **`ecommerce`** contains **only** `transaction_id`, `value`, `currency`, and `items` (each item: `item_id`, `item_name`, `price`, `quantity`). No root `order_id` or other purchase fields. **No** `eventCallback` / `eventTimeout` (immediate push; GTM drains the queue after load).

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

- Required client env var (for GTM): `NEXT_PUBLIC_GTM_ID` — must match the container id in GTM UI, including the **`GTM-`** prefix (same string passed to `googletagmanager.com/gtm.js?id=…` in `components/GoogleAnalytics.tsx`).
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
- **`purchase`** — **Custom Event** trigger for **Google Ads Conversion** (and optional non-GA4 tags). **Do not** add a GA4 Event tag for `purchase` here while MP sends GA4 `purchase` (double revenue).
- `generate_lead`
- `contact_click`
- `messenger_click`
- `language_change`
- home CTA event names such as `cta_home_top`

### Recommended Data Layer Variables

- `event`
- `ecommerce` (object; on **`purchase`**: only `ecommerce.transaction_id`, `ecommerce.value`, `ecommerce.currency`, `ecommerce.items`)
- `items` (funnel events; root-level — not the same path as `ecommerce.items` on **`purchase`**)
- `value` / `currency` / `transaction_id` (some funnel events expose these at root)
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
| `purchase` | Paid order page **(browser)** + GA4 **server** | **Browser:** `trackCheckoutPurchase` — Ads attribution only in GTM; dedupe `sent_purchase_<orderId>`. **Server:** MP `sendPurchaseForOrder` — **GA4 revenue source of truth**. |
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
- When the order later becomes **paid**, GA4 `purchase` is sent via **Measurement Protocol** only (same admin/Stripe paths as above).

## Purchase: server vs browser (GTM)

| Layer | Role | How |
|-------|------|-----|
| **Server (MP)** | GA4 `purchase` + revenue reporting | `sendPurchaseForOrder` when payment is confirmed; idempotent via `ga4_purchase_sent` |
| **Browser (dataLayer)** | Google Ads ROAS / click attribution | `trackCheckoutPurchase` → `purchase` + `ecommerce.*`; dedupe `sent_purchase_<orderId>` |

**GTM rule:** Fire **Google Ads Conversion** on Custom Event `purchase` using DL variables `ecommerce.value`, `ecommerce.transaction_id`, `ecommerce.currency`. **Disable** any GA4 Event tag that sends `purchase` from the browser while MP is enabled — that combination typically **doubles** GA4 revenue. Keep GA4 `purchase` **server-only** unless you have a documented exception.

Configure MP with `GA4_MEASUREMENT_ID` and `GA4_MEASUREMENT_API_SECRET` on the server.

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
- On a **paid** order page, confirm **`purchase`** appears (after `{ ecommerce: null }` immediately before it)
- If retesting the **same** order id, clear or use new storage key: `sent_purchase_<orderId>`
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
  - **`purchase`** (paid order page)
  - `generate_lead`
  - `contact_click`

### GA4 DebugView

- Confirm one initial `page_view`
- Confirm one `page_view` per SPA route change
- Confirm funnel ecommerce events use the expected `items`, `value`, `currency` (shape differs from paid-order **`purchase`**, which uses `ecommerce.items`)
- Confirm `begin_checkout` no longer fires on cart view
- Confirm GA4 **`purchase`** from **Measurement Protocol** for paid orders (DebugView / Admin; may not mirror the browser device if MP uses a different client id strategy).
- Confirm dataLayer **`purchase`** appears in **GTM Preview** at most once per order id when loading a **paid** order URL (refresh should not duplicate; `sent_purchase_<orderId>`).
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
11. Complete Stripe checkout; on the **paid** order page confirm **`purchase`** in GTM Preview / dataLayer. Confirm GA4 **`purchase`** via MP if configured (DebugView timing may lag; check `ga4_purchase_sent` / admin logs if needed).
12. Create a manual-payment order and confirm `generate_lead`
13. After the order is marked paid, open the paid order page again and confirm **`purchase`** does **not** duplicate (dedupe) unless you cleared storage

## Troubleshooting (naming & GTM)

Use this list when “nothing fires” or “wrong variable is empty”:

1. **Trigger event name** for the paid order page must match **exactly** **`purchase`** (lowercase).
2. **Data Layer variables:** On **`purchase`**, use only `ecommerce.transaction_id`, `ecommerce.value`, `ecommerce.currency`, and `ecommerce.items`. Funnel events often use root `items` — do not reuse the same GTM variable for every event shape.
3. **No root `order_id`:** The app does not put `order_id` on the purchase object; use **`ecommerce.transaction_id`** for conversion deduplication in Google Ads.
4. **Dedupe:** `sent_purchase_<orderId>` in **localStorage** prevents a second browser **`purchase`** for the same order (refresh-safe). For QA, use a **new order**, incognito, or clear that key.
5. **Empty push:** If the order has **no line items** and no fallback synthetic item, the effect exits early and **nothing** is pushed. Check `order.items` in the API response.
6. **GTM not loaded:** `components/GoogleAnalytics.tsx` loads GTM only when `NODE_ENV === 'production'` and `NEXT_PUBLIC_GTM_ID` is set; `/admin` skips the component.
7. **Tag Assistant / “missing” `purchase`:** Pushes may run before `gtm.js` loads; GTM still processes prior `dataLayer` entries once the container boots. If nothing fires, confirm **`NEXT_PUBLIC_GTM_ID`** matches the container (including `GTM-` prefix) and GTM loads in production (`components/GoogleAnalytics.tsx`).

## Audit: Purchase transport (client + server)

- **Browser (dataLayer → GTM):** Paid order page → **`trackCheckoutPurchase`** → **`purchase`** with **`ecommerce`** only (`transaction_id`, `value`, `currency`, `items`). **No** deferred GTM polling — the queue is processed when `gtm.js` loads.
- **Server (Measurement Protocol):** When an order becomes paid (Stripe webhook, admin “Mark as paid”, or admin payment-status → PAID), the backend sends GA4 **`purchase`** via **`lib/ga4/measurementProtocol.ts`** / **`sendPurchaseForOrder.ts`** (`app/api/stripe/webhook/route.ts`, mark-paid, payment-status routes).
- **Duplicate guard:** (1) **Browser `purchase`:** `sent_purchase_<orderId>` in localStorage. (2) **Server:** `ga4_purchase_sent` in the database for MP idempotency.
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
- `components/order/OrderPageClient.tsx` (paid order: `trackCheckoutPurchase` → `purchase`)
- `app/order/[orderId]/page.tsx`
- `components/MessengerOrderButtons.tsx`
- `components/MessengerLinks.tsx`
- `components/OrderDetailsView.tsx`
- `components/Hero.tsx`
- `components/StickyHomeCta.tsx`
- `components/HomeBottomCta.tsx`
- `components/LanguageSwitcher.tsx`
