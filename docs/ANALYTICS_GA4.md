# Analytics Runbook

## Architecture

- GTM is the only analytics transport for client-side events.
- The app only pushes structured events into `window.dataLayer`.
- Direct `gtag` is removed from the app code.
- Analytics load only in production.
- There are no fallback GA/GTM IDs in source.
- **GA4 `purchase` (authoritative for this project):** Fired from the **browser** on **`/lanna-order-thank-you`** after Stripe returns and `GET /api/stripe/order-status` reports `paid` with `purchase`. `OrderThankYouClient` calls `trackCheckoutPurchase` → `window.dataLayer` once per order; **GTM** forwards to GA4 (and optionally Google Ads). Dedupe: `lanna_purchase_fired_<orderId>` in **localStorage** (legacy `sent_purchase_*` read). The **paid** `/order/...` page does **not** push `purchase` for cart checkout (thank-you page fires first). GTM must use Custom Event `purchase`, not URL contains `checkout`. **No server-side GA4 purchase** (Measurement Protocol removed).

## Paid order: browser `purchase` (canonical)

**Source code:** `components/checkout/OrderThankYouClient.tsx` on `/lanna-order-thank-you` — when `order-status` returns `status: 'paid'`, `orderId`, and `purchase` (`value`, `currency`, `items`, optional `user_data` from the server). Calls `trackCheckoutPurchase` in `lib/analytics/gtag.ts`.

**Event `purchase`** — at most once per order id (`lanna_purchase_fired_<orderId>`). Sequence: `dataLayer.push({ ecommerce: null })` then `dataLayer.push({ event: 'purchase', ecommerce: { ... }, … })` where **`ecommerce`** contains `transaction_id`, `value`, `currency`, and `items` (each item: `item_id`, `item_name`, `price`, `quantity`). The same four fields are **also** mirrored at the **root** of the object (`transaction_id`, `value`, `currency`, `items`) so GTM Data Layer Variables that point at root-level keys (as used for `add_to_cart` / `begin_checkout`) still work on `purchase`. **Transport:** browser → `window.dataLayer` only — no app HTTP call to GTM or GA4 for these events. **`purchase`** is deferred briefly so GTM/consent can settle (`waitForGtmConsentThen` in `lib/analytics/gtag.ts`).

**Implementation:** `trackCheckoutPurchase` in `lib/analytics/gtag.ts` (called from `OrderThankYouClient` for cart Stripe checkout).

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
- **`purchase`** — **Custom Event** trigger for **GA4** (ecommerce / GA4 Event tag) and **Google Ads Conversion** as needed. Map fields from `ecommerce.*` (see **Purchase: browser → GTM** later in this doc). - when visit page complite
- `generate_lead`
- `contact_click`
- `messenger_click`
- `language_change`
- home CTA event names such as `cta_home_top`

### Recommended Data Layer Variables

- `event`
- `ecommerce` (object; on **`purchase`**: `ecommerce.transaction_id`, `ecommerce.value`, `ecommerce.currency`, `ecommerce.items` — same values also at **root** `transaction_id`, `value`, `currency`, `items` for GTM parity with funnel events)
- `items` (funnel events: root-level; **`purchase`**: also at root as a mirror of `ecommerce.items`)
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
| `purchase` | **`/lanna-order-thank-you`** **(browser)** | `OrderThankYouClient` → `trackCheckoutPurchase` → dataLayer → GTM → GA4 / Ads; dedupe `lanna_purchase_fired_<orderId>`. |
| `generate_lead` | Legacy / confirmation-pending manual flows | Separate from revenue; website checkout is Stripe-first |
| `contact_click` | LINE / WhatsApp / Telegram click | Canonical contact event |
| `messenger_click` | Legacy messenger event | Kept for backward-compatible reporting |
| `language_change` | Language switcher | Includes `language` and `page_path` |

Removed legacy messenger events:

- `click_line`
- `click_whatsapp`
- `click_telegram`

## Revenue Tracking Rules

### Stripe (and all paid orders)

- GA4 **`purchase`** (revenue) is recorded when the customer reaches **`checkout/complete`** after Stripe and the browser pushes `purchase` to the dataLayer; GTM sends it to GA4.
- **Coverage gap:** If `purchaseAnalytics` is missing or validation fails, nothing is pushed on that screen; there is **no** server-side fallback.

### Manual Payment Methods

we do not have any 


## Purchase: browser → GTM

| Layer | Role | How |
|-------|------|-----|
| **Browser (dataLayer)** | GA4 `purchase` + optional Google Ads | `OrderThankYouClient` on `/lanna-order-thank-you` → `purchase` + `ecommerce.*`; dedupe `lanna_purchase_fired_<orderId>` |

**GTM rule:** Use a **GA4 Event** tag (or equivalent) on Custom Event **`purchase`**, reading `ecommerce.*`. For **Google Ads**, fire a conversion tag on the same event using DL variables `ecommerce.value`, `ecommerce.transaction_id`, `ecommerce.currency`.


Recommended GA4 key event setup:

- Primary: `purchase`
- Secondary / observation only: 'add_to_cart', "begin_checkout"

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
  - **`purchase`** (`/checkout/complete` after paid `order-status` if contain in url we set it up in gtm for both ga4 and gtm)
  - `generate_lead`
  - `contact_click`

### GA4 DebugView

- Confirm one initial `page_view`
- Confirm one `page_view` per SPA route change
- Confirm funnel ecommerce events use the expected `items`, `value`, `currency` (shape differs from paid-order **`purchase`**, which uses `ecommerce.items`)
- Confirm `begin_checkout` no longer fires on cart view
- Confirm GA4 **`purchase`** in **DebugView** when you complete checkout and land on **`/lanna-order-thank-you`** (same device/session as GTM).
- Confirm dataLayer **`purchase`** appears in **GTM Preview** at most once per order id on **`checkout/complete`** (refresh should not duplicate; `sent_purchase_<orderId>`). Reloading **`/order/...`** does not emit `purchase`.
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
11. Complete Stripe checkout; on **`/lanna-order-thank-you`** confirm **`purchase`** in GTM Preview / dataLayer and **GA4 DebugView** (GTM → GA4 tag).
12. Create a manual-payment order and confirm `generate_lead`
13. After `purchase` fired, open **`/order/...`** and confirm **`purchase`** does **not** fire again (dedupe); or reload `checkout/complete` and confirm no duplicate unless you cleared storage

## Troubleshooting (naming & GTM)

Use this list when “nothing fires” or “wrong variable is empty”:

1. **Trigger event name** for **`purchase`** must match **exactly** **`purchase`** (lowercase).
2. **Data Layer variables:** On **`purchase`**, use only `ecommerce.transaction_id`, `ecommerce.value`, `ecommerce.currency`, and `ecommerce.items`. Funnel events often use root `items` — do not reuse the same GTM variable for every event shape.
3. **No root `order_id`:** The app does not put `order_id` on the purchase object; use **`ecommerce.transaction_id`** for conversion deduplication in Google Ads.
4. **Dedupe:** `sent_purchase_<orderId>` in **localStorage** prevents a second browser **`purchase`** for the same order (refresh-safe). For QA, use a **new order**, incognito, or clear that key.
5. **Empty push:** If `purchaseAnalytics.items` is empty or `value` is invalid, `trackCheckoutPurchase` exits early and **nothing** is pushed. Check `GET /api/stripe/order-status` JSON when `status` is `paid`.
6. **GTM not loaded:** `components/GoogleAnalytics.tsx` loads GTM only when `NODE_ENV === 'production'` and `NEXT_PUBLIC_GTM_ID` is set; `/admin` skips the component.
7. **Tag Assistant / “missing” `purchase`:** Pushes may run before `gtm.js` loads; GTM still processes prior `dataLayer` entries once the container boots. If nothing fires, confirm **`NEXT_PUBLIC_GTM_ID`** matches the container (including `GTM-` prefix) and GTM loads in production (`components/GoogleAnalytics.tsx`).

## Audit: Purchase transport (browser-first)

- **Browser (dataLayer → GTM):** **`/lanna-order-thank-you`** → **`OrderThankYouClient`** → **`trackCheckoutPurchase`** pushes **`purchase`** with **`ecommerce`** (`transaction_id`, `value`, `currency`, `items`), after `{ ecommerce: null }`, after a short GTM/consent wait (`waitForGtmConsentThen`). No server-side GA4 purchase.
- **Duplicate guard (browser):** `lanna_purchase_fired_<orderId>` in localStorage (legacy `sent_purchase_*` read).
- **`generate_lead`:** `trackGenerateLead` only pushes `generate_lead`; it does not call purchase helpers.

## Files Controlling Analytics Logic

- `components/GoogleAnalytics.tsx`
- `app/layout.tsx`
- `components/InternalTrafficBootstrap.tsx`
- `lib/analytics.ts`
- `lib/analytics/gtag.ts`
- `lib/stripe/postStripePaymentSuccess.ts` (post-payment hooks; no GA4 purchase)
- `app/api/stripe/webhook/route.ts` (Stripe fulfillment; GA4 purchase is browser-only)
- `components/checkout/OrderThankYouClient.tsx` (browser `purchase` + dedupe)
- `components/CatalogWithFilters.tsx`
- `app/[lang]/catalog/[slug]/ProductPageClient.tsx`
- `app/[lang]/catalog/[slug]/ProductDetailClient.tsx`
- `components/ProductOrderBlock.tsx`
- `components/ProductOrderBlockForProduct.tsx`
- `components/GiftsCarousel.tsx`
- `app/[lang]/cart/CartPageClient.tsx`
- `app/[lang]/checkout/complete/CheckoutCompleteClient.tsx` (Stripe return: dataLayer `purchase` + `sent_purchase_*` dedupe)
- `app/api/stripe/order-status/route.ts` (`purchaseAnalytics` payload when paid + proof)
- `components/order/OrderPageClient.tsx` (Stripe sync UI only; **no** `purchase` push)
- `app/order/[orderId]/page.tsx`
- `components/MessengerOrderButtons.tsx`
- `components/MessengerLinks.tsx`
- `components/OrderDetailsView.tsx`
- `components/Hero.tsx`
- `components/StickyHomeCta.tsx`
- `components/HomeBottomCta.tsx`
- `components/LanguageSwitcher.tsx`

## Using admin Diagnostics

The **Diagnostics** tab at `/admin/marketing` compares three sources of truth for the selected period:

| Card | Source | What it means |
|------|--------|----------------|
| Paid orders | Supabase `orders` (`payment_status = PAID`, `paid_at` in range) | Real revenue — authoritative |
| GA4 purchases | GA4 Data API `purchase` event count | Browser tracking via GTM |
| Google Ads conversions | Google Ads API | Attribution window may differ from orders |
| Ad spend + clicks | Google Ads API | Traffic volume |

The **verdict banner** flags likely causes: broken Ads conversion tag, landing-page mismatch, checkout drop-off, missing purchase event, or paid traffic underperforming organic.

**Tracking health** checks mirror funnel zeros and GA4 purchases vs Supabase paid orders (~85% alignment is healthy).

### Manual checklist before trusting diagnostics

Code cannot fix tracking alone. Confirm in GTM / Ads / GA4 UI:

| Area | Check |
|------|-------|
| GTM | `NEXT_PUBLIC_GTM_ID` matches production container; **purchase** trigger is Custom Event `purchase` (not URL contains checkout); optional AND Page Path `/lanna-order-thank-you`; funnel event tags for `view_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`; one GA4 + one Ads tag on `purchase` |
| Google Ads | Purchase conversion linked to GTM; marked **Primary**; English campaigns use `/en/` final URLs |
| GA4 | Service account has Viewer on property; `purchase` marked key event; Realtime shows test purchase |
| Production test | GTM does not load locally; complete test order → thank-you page → check `lanna_purchase_fired_<orderId>` in localStorage |

If diagnostics says tracking is broken but GTM looks fine: test in production, disable ad blockers, confirm customer reaches `/lanna-order-thank-you?session_id=…` after Stripe.

See also [GOOGLE_ADS_PURCHASE_CONVERSION.md](./GOOGLE_ADS_PURCHASE_CONVERSION.md).
