# GA4 Analytics – Implementation Summary

## 1. Audit (current setup)

| Item | Status |
|------|--------|
| **GA4 initialized** | `components/GoogleAnalytics.tsx` – Script loads gtag.js and runs `gtag('config', GA_MEASUREMENT_ID, { currency: 'THB' })` |
| **Measurement ID** | `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` or fallback `G-KBRBDXFBM1` (single ID; no separate dev/prod in code) |
| **Environment** | One ID used for all; use different `NEXT_PUBLIC_GA_MEASUREMENT_ID` per env (e.g. dev property) if needed |
| **Consent / cookie banner** | Not present in codebase; no Consent Mode implementation |
| **Ecommerce funnel** | `view_item`, `view_item_list`, `select_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`, `generate_lead` |

**Google Tag Manager (optional)**  
Set `NEXT_PUBLIC_USE_GTM=true` to load GTM instead of direct gtag. Events are pushed to `dataLayer`; the app does **not** load gtag, so there is no duplicate tracking. In GTM, add a GA4 Configuration tag (your Measurement ID) and GA4 Event tags (or a single tag with triggers) that fire on the same event names and pass the pushed parameters through to GA4. Container ID defaults to `GTM-T4JGL85T`; override with `NEXT_PUBLIC_GTM_ID`.

---

## 2. Key events strategy (GA4 Admin)

**Primary key events** – Mark these in GA4 Admin → Data display → Events → toggle "Mark as key event":

| Event | When it fires | Purpose |
|-------|----------------|---------|
| **purchase** | Stripe success page, only when payment is confirmed (`status === 'paid'`) | Real revenue (card payment) |
| **generate_lead** | Success page after Place Order (bank transfer / PromptPay); order created via `/api/orders` | Lead / order created (awaiting bank transfer) |

**Do NOT mark as key events:** `contact_click`, `messenger_click`, `click_line`, `click_whatsapp`, `click_telegram` – these are tracked for optimization but are not primary conversions.

---

## 3. Files edited / created

| File | Change |
|------|--------|
| **lib/analytics.ts** | `trackAddPaymentInfo`, `trackGenerateLead`; `trackPurchase` only for Stripe; `trackGenerateLead` for bank transfer; localStorage dedupe for both |
| **app/[lang]/cart/CartPageClient.tsx** | `trackAddPaymentInfo` when user clicks "Pay with Stripe" |
| **app/[lang]/checkout/success/CheckoutSuccessClient.tsx** | Split: `trackPurchase` only when `sessionId && stripeStatus === 'paid'`; `trackGenerateLead` when `!sessionId` (Place Order flow) |

---

## 4. How to verify in GA4 DebugView + Tag Assistant

1. **DebugView**
   - In GA4: **Admin → DebugView** (or **Configure → DebugView**).
   - Add `?debug_mode=true` to the URL of your site (or set the debug_mode parameter in gtag config in dev).
   - Alternatively use [Google Tag Assistant](https://tagassistant.google.com/) (Chrome) and enable “Connect to GA4”.
   - Navigate: home → catalog → product → add to cart → cart → remove item → set delivery district → place order → success.
   - In DebugView, confirm events appear within a few seconds and check parameter names/values.

2. **Checklist**
   - [ ] **page_view** – Fires on initial load and when changing route (e.g. `/en`, `/en/catalog`, `/en/catalog/slug`, `/en/cart`, `/en/checkout/success`).
   - [ ] **view_item_list** – Fires once when opening catalog with at least one product; params: `item_list_id` / `item_list_name`, `items[]`, `currency`.
   - [ ] **select_item** – Fires when clicking a bouquet card (not on swipe); params: `item_list_id`, `items[]`.
   - [ ] **view_item** – Fires once per product page; params: `items[]` (with `item_variant`), `currency`, `value`.
   - [ ] **add_to_cart** – Fires when clicking “Add to cart” on product page; params: `items[]` (with `item_variant`), `value`, `currency`.
   - [ ] **view_cart** – Fires once when opening cart with items; params: `items[]`, `value`, `currency`.
   - [ ] **remove_from_cart** – Fires when clicking remove on cart line; params: `items[]`, `value`, `currency`.
   - [ ] **begin_checkout** – Fires once when cart page with items is viewed; params: `items[]`, `value`, `currency`.
   - [ ] **add_shipping_info** – Fires once when user has selected delivery district (and tier); params: `shipping_tier`, `items[]`, `value`, `currency`.
   - [ ] **add_payment_info** – Fires when user clicks "Pay with Stripe"; params: `payment_type: 'card'`, `items[]`, `value`, `currency`.
   - [ ] **purchase** – Fires **only** on Stripe success when payment confirmed; params: `transaction_id`, `value`, `currency`, `items[]`. No duplicate on refresh.
   - [ ] **generate_lead** – Fires **only** on success page after Place Order (bank transfer); params: `order_id`, `value`, `currency`, `items[]`. No duplicate on refresh.
   - [ ] **contact_click** – Fires when clicking LINE/WhatsApp/Telegram (header, success, etc.); params: `channel`, `page_path` (and optional `bouquet_id` if ever added).
   - [ ] **language_change** – Fires when clicking the language switcher; params: `language`, `page_path`.
   - [ ] **messenger_click** / **click_line** / **click_whatsapp** / **click_telegram** – Still fire as before for existing reports.
   - [ ] **ads_conversion_Success_Page_1** – Still fires on success page for Google Ads.

3. **Currency**
   - All ecommerce events use **THB** (config default + per-event `currency: 'THB'`).

---

## 5. Event → Where it fires → Key params

| Event name | Where it fires | Key params |
|------------|----------------|------------|
| **page_view** | Every route change (App Router client nav) | `page_path`, `page_location` |
| **view_item_list** | Catalog page load (once per session for list “catalog”) | `item_list_id`, `item_list_name`, `items[]`, `currency` |
| **select_item** | Click on a bouquet card in catalog | `item_list_id`, `items[]` (one item), `currency` |
| **view_item** | Product detail page load (once per product per session) | `items[]` (with `item_variant`), `value`, `currency` |
| **add_to_cart** | “Add to cart” on product page | `items[]` (with `item_variant`), `value`, `currency` |
| **view_cart** | Cart page with items (once per session) | `items[]`, `value`, `currency` |
| **remove_from_cart** | “Remove” on a cart line | `items[]` (removed item), `value`, `currency` |
| **begin_checkout** | Cart page with items (once per cart view) | `items[]`, `value`, `currency` |
| **add_shipping_info** | User has selected delivery district (once) | `shipping_tier`, `items[]`, `value`, `currency` |
| **add_payment_info** | User clicks "Pay with Stripe" (card payment) | `payment_type`, `items[]`, `value`, `currency` |
| **purchase** | Success page, **Stripe only** (payment confirmed) | `transaction_id`, `value`, `currency`, `items[]` |
| **generate_lead** | Success page, **Place Order only** (bank transfer) | `order_id`, `value`, `currency`, `items[]` |
| **contact_click** | LINE / WhatsApp / Telegram button click | `channel`, `page_path`, optional `bouquet_id` |
| **language_change** | Language switcher click | `language`, `page_path` |
| **messenger_click** | Same as contact buttons (legacy) | `channel`, `page_location`, `link_url` |
| **click_line** / **click_whatsapp** / **click_telegram** | Same as contact buttons | Same as `messenger_click` |
| **ads_conversion_Success_Page_1** | Checkout success page (Google Ads) | `transaction_id`, `value`, `currency` |

---

## 6. Dedupe and reliability

- **In-memory (session):** `view_item` (by `item_id`), `view_item_list` (by list name), `view_cart` (once), so re-renders or filter changes don’t double-fire.
- **Cart page:** Refs (`beginCheckoutFiredRef`, `viewCartFiredRef`, `addShippingInfoFiredRef`) ensure one fire per cart view / shipping step.
- **Purchase:** `localStorage` key `lanna-bloom_sent_purchase_{orderId}`; fires **only** for Stripe confirmed payment. Refresh does not re-send.
- **Generate lead:** `localStorage` key `lanna-bloom_sent_generate_lead_{orderId}`; fires **only** for Place Order (bank transfer). Refresh does not re-send.
- **Dev:** `NODE_ENV === 'development'` enables `console.debug('[GA4]', eventName, eventParams)` in `lib/analytics.ts`.
