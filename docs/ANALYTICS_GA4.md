# GA4 Analytics – Implementation Summary

## 1. Audit (current setup)

| Item | Status |
|------|--------|
| **GA4 initialized** | `components/GoogleAnalytics.tsx` – Script loads gtag.js and runs `gtag('config', GA_MEASUREMENT_ID, { currency: 'THB' })` |
| **Measurement ID** | `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` or fallback `G-KBRBDXFBM1` (single ID; no separate dev/prod in code) |
| **Environment** | One ID used for all; use different `NEXT_PUBLIC_GA_MEASUREMENT_ID` per env (e.g. dev property) if needed |
| **Consent / cookie banner** | Not present in codebase; no Consent Mode implementation |
| **Events before changes** | `messenger_click`, `click_line` / `click_whatsapp` / `click_telegram`, `view_item`, `add_to_cart`, `begin_checkout`, `ads_conversion_Success_Page_1` (success page only) |

**Google Tag Manager (optional)**  
Set `NEXT_PUBLIC_USE_GTM=true` to load GTM instead of direct gtag. Events are pushed to `dataLayer`; the app does **not** load gtag, so there is no duplicate tracking. In GTM, add a GA4 Configuration tag (your Measurement ID) and GA4 Event tags (or a single tag with triggers) that fire on the same event names and pass the pushed parameters through to GA4. Container ID defaults to `GTM-T4JGL85T`; override with `NEXT_PUBLIC_GTM_ID`.

---

## 2. Files edited / created

| File | Change |
|------|--------|
| **lib/analytics.ts** | Rewritten: GA4 item schema (`item_variant`), all ecommerce helpers, `trackViewItemList`, `trackSelectItem`, `trackRemoveFromCart`, `trackViewCart`, `trackAddShippingInfo`, `trackPurchase` (localStorage dedupe), `trackContactClick`, `trackLanguageChange`; in-memory dedupe for list/cart/view_item; dev-only `console.debug` |
| **components/GoogleAnalytics.tsx** | Client component: `gtag('config', ..., { currency: 'THB' })`, added `GA4PageView` to send `page_view` on App Router route change |
| **components/CatalogWithFilters.tsx** | `useEffect` to fire `trackViewItemList('catalog', items)` on load with visible bouquets |
| **components/BouquetCard.tsx** | On card link click (non-swipe): `trackSelectItem('catalog', item)` |
| **app/[lang]/catalog/[slug]/ProductPageClient.tsx** | `trackViewItem` items include `item_variant` (size label) |
| **components/ProductOrderBlock.tsx** | `trackAddToCart` items include `item_variant: selectedSize.label` |
| **app/[lang]/cart/CartPageClient.tsx** | `trackViewCart` + `trackBeginCheckout` once per cart view; `trackRemoveFromCart` on remove button; `trackAddShippingInfo` when district (and delivery tier) set |
| **app/[lang]/checkout/success/CheckoutSuccessClient.tsx** | After order fetch: `trackPurchase(orderId, value, items)` (deduped by `localStorage`: `lanna-bloom_sent_purchase_{orderId}`); kept `ads_conversion_Success_Page_1` |
| **components/LanguageSwitcher.tsx** | `onClick` on language link: `trackLanguageChange(alternativeLang)` |
| **docs/ANALYTICS_GA4.md** | This file (audit, checklist, event table) |

---

## 3. How to verify in GA4 DebugView + Tag Assistant

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
   - [ ] **purchase** – Fires once on success page per order; params: `transaction_id`, `value`, `currency`, `items[]`. Refresh success page: no second `purchase` (localStorage dedupe).
   - [ ] **contact_click** – Fires when clicking LINE/WhatsApp/Telegram (header, success, etc.); params: `channel`, `page_path` (and optional `bouquet_id` if ever added).
   - [ ] **language_change** – Fires when clicking the language switcher; params: `language`, `page_path`.
   - [ ] **messenger_click** / **click_line** / **click_whatsapp** / **click_telegram** – Still fire as before for existing reports.
   - [ ] **ads_conversion_Success_Page_1** – Still fires on success page for Google Ads.

3. **Currency**
   - All ecommerce events use **THB** (config default + per-event `currency: 'THB'`).

---

## 4. Event → Where it fires → Key params

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
| **purchase** | Checkout success page after order created (once per orderId) | `transaction_id`, `value`, `currency`, `items[]` |
| **contact_click** | LINE / WhatsApp / Telegram button click | `channel`, `page_path`, optional `bouquet_id` |
| **language_change** | Language switcher click | `language`, `page_path` |
| **messenger_click** | Same as contact buttons (legacy) | `channel`, `page_location`, `link_url` |
| **click_line** / **click_whatsapp** / **click_telegram** | Same as contact buttons | Same as `messenger_click` |
| **ads_conversion_Success_Page_1** | Checkout success page (Google Ads) | `transaction_id`, `value`, `currency` |

---

## 5. Dedupe and reliability

- **In-memory (session):** `view_item` (by `item_id`), `view_item_list` (by list name), `view_cart` (once), so re-renders or filter changes don’t double-fire.
- **Cart page:** Refs (`beginCheckoutFiredRef`, `viewCartFiredRef`, `addShippingInfoFiredRef`) ensure one fire per cart view / shipping step.
- **Purchase:** `localStorage` key `lanna-bloom_sent_purchase_{orderId}`; refresh on success page does not re-send `purchase`.
- **Dev:** `NODE_ENV === 'development'` enables `console.debug('[GA4]', eventName, eventParams)` in `lib/analytics.ts`.
