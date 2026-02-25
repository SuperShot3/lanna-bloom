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

**select_item and catalog cards:** The `select_item` event is pushed from code when the user clicks anywhere on a bouquet card (the whole card is a link; the "View details" button was removed). Use a **Custom Event** trigger with event name `select_item` in GTM—do not rely on element-based click triggers. If you use element-based triggers, target `.card-link` or `[data-ga-select-item="catalog"]` instead of the removed `.card-cta`.

---

## 1b. Diagnosis: what caused duplicate conversions (2 clicks → 24 conversions)

| Cause | Location | Fix |
|-------|----------|-----|
| **ads_conversion_Success_Page_1** fired alongside purchase | `CheckoutSuccessClient.tsx` L83–86, `lib/analytics.ts` trackAdsConversion | Removed – use GA4 purchase only |
| **purchase** could fire twice (React Strict Mode double-mount) | `CheckoutSuccessClient.tsx` useEffect L76–123 | Dedupe: set `purchase_sent:{orderId}` in localStorage **before** send |
| **begin_checkout** / **add_shipping_info** refs reset on Strict Mode remount | `CartPageClient.tsx` L375–377, L465–475 | Module-level `sentEvents` dedupe in `lib/analytics.ts` |
| Multiple conversions imported to Google Ads | GA4 Admin | Mark **only** purchase as key event; Count = ONE |

---

## 2. Key events strategy (GA4 Admin)

**Primary key event (Google Ads Count = ONE)** – Mark **only** this in GA4 Admin → Data display → Events → toggle "Mark as key event":

| Event | When it fires | Purpose |
|-------|----------------|---------|
| **purchase** | Stripe success page, only when payment is confirmed (`status === 'paid'`) | Real revenue (card payment) – **ONLY** key event |

**Do NOT mark as key events:** `generate_lead`, `contact_click`, `messenger_click`, `click_line`, `click_whatsapp`, `click_telegram`, `begin_checkout`, `add_to_cart` – these are tracked for analytics but must not inflate conversion counts.

---

## 3. Files edited / created

| File | Change |
|------|--------|
| **lib/analytics/gtag.ts** | Core: `trackEvent`, `trackPurchase` with `purchase_sent:{orderId}` dedupe; `wasPurchaseSent` helper |
| **lib/analytics.ts** | Uses gtag helpers; `begin_checkout` / `add_shipping_info` session dedupe; removed `trackAdsConversion` |
| **components/GoogleAnalytics.tsx** | gtag init once in root layout; `window.gtag` assignment |
| **app/[lang]/cart/CartPageClient.tsx** | `trackAddPaymentInfo` when user clicks "Pay with Stripe" |
| **app/[lang]/checkout/success/CheckoutSuccessClient.tsx** | Split: `trackPurchase` only when `sessionId && stripeStatus === 'paid'`; `trackGenerateLead` when `!sessionId`; **removed** `trackAdsConversion` |

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
   - [ ] **select_item** – Fires when clicking anywhere on a bouquet card (whole card is the link; not on swipe); params: `item_list_id`, `items[]`.
   - [ ] **view_item** – Fires once per product page; params: `items[]` (with `item_variant`), `currency`, `value`.
   - [ ] **add_to_cart** – Fires when clicking “Add to cart” on product page; params: `items[]` (with `item_variant`), `value`, `currency`.
   - [ ] **view_cart** – Fires once when opening cart with items; params: `items[]`, `value`, `currency`.
   - [ ] **remove_from_cart** – Fires when clicking remove on cart line; params: `items[]`, `value`, `currency`.
   - [ ] **begin_checkout** – Fires once when cart page with items is viewed; params: `items[]`, `value`, `currency`.
   - [ ] **add_shipping_info** – Fires once when user has selected delivery district (and tier); params: `shipping_tier`, `items[]`, `value`, `currency`.
   - [ ] **add_payment_info** – Fires when user clicks "Pay with Stripe"; params: `payment_type: 'card'`, `items[]`, `value`, `currency`.
   - [ ] **purchase** – Fires **only** on Stripe success when payment confirmed; params: `transaction_id`, `value`, `currency`, `items[]`. No duplicate on refresh/back/forward.
   - [ ] **generate_lead** – Fires **only** on success page after Place Order (bank transfer); params: `order_id`, `value`, `currency`, `items[]`. No duplicate on refresh.
   - [ ] **contact_click** – Fires when clicking LINE/WhatsApp/Telegram (header, success, etc.); params: `channel`, `page_path` (and optional `bouquet_id` if ever added).
   - [ ] **language_change** – Fires when clicking the language switcher; params: `language`, `page_path`.
   - [ ] **messenger_click** / **click_line** / **click_whatsapp** / **click_telegram** – Still fire as before for existing reports.

3. **Currency**
   - All ecommerce events use **THB** (config default + per-event `currency: 'THB'`).

---

## 5. Event → Where it fires → Key params

| Event name | Where it fires | Key params |
|------------|----------------|------------|
| **page_view** | Every route change (App Router client nav) | `page_path`, `page_location` |
| **view_item_list** | Catalog page load (once per session for list “catalog”) | `item_list_id`, `item_list_name`, `items[]`, `currency` |
| **select_item** | Click anywhere on a bouquet card in catalog (whole card is clickable; no "View details" button) | `item_list_id`, `items[]` (one item), `currency` |
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

---

## 6. Dedupe and reliability

- **In-memory (session):** `view_item` (by `item_id`), `view_item_list` (by list name), `view_cart` (once), so re-renders or filter changes don’t double-fire.
- **Cart page:** Refs (`beginCheckoutFiredRef`, `viewCartFiredRef`, `addShippingInfoFiredRef`) ensure one fire per cart view / shipping step.
- **Purchase:** `localStorage` key `purchase_sent:{orderId}`; fires **only** for Stripe confirmed payment. Refresh/back/forward does not re-send.
- **Generate lead:** `localStorage` key `lanna-bloom_sent_generate_lead_{orderId}`; fires **only** for Place Order (bank transfer). Refresh does not re-send.
- **Removed:** `ads_conversion_Success_Page_1` – was causing duplicate conversions in Google Ads. Use GA4 **purchase** only.
- **Dev:** `NODE_ENV === 'development'` enables `console.debug('[GA4]', eventName, eventParams)` in `lib/analytics/gtag.ts`.

---

## 7. Google Ads: "GA4 property not linked"

If you see **"Google Analytics 4 property not linked"** in Google Ads when setting up conversion tracking:

1. **Link GA4 to Google Ads** (required for importing conversions):
   - In **Google Ads**: Tools & Settings → Linked accounts → Google Analytics 4 properties
   - Or: Admin → Product links → Google Ads links
   - Select your GA4 property and complete the link
   - Enable "Import app and web metrics" (recommended)

2. **For "URL contains checkout/success"** conversion:
   - In **GA4**: Admin → Data display → Events → create or use a key event
   - Option A: Mark **purchase** or **generate_lead** as key event (recommended – these fire on success page)
   - Option B: Create a custom conversion: Event = `page_view`, Condition = `page_location` contains `checkout/success`
   - In **Google Ads**: Goals → Conversions → Link GA4 and import the conversion

3. **Verify**: After linking, allow up to 24–48 hours for data to flow. Use GA4 DebugView (`?debug_mode=true` on your site) to confirm events fire.

---

## 8. Test plan: confirm purchase fires once

### In GA4 DebugView / Realtime

1. Add `?debug_mode=true` to your site URL (e.g. `https://lannabloom.shop/en?debug_mode=true`).
2. In GA4: **Configure → DebugView**.
3. Complete a Stripe checkout (test mode).
4. On success page: confirm **one** `purchase` event with `transaction_id`, `value`, `items`.
5. **Refresh** the success page: confirm **no** second `purchase` event.
6. **Back** to success page (browser back): confirm **no** second `purchase` event.

### Manual dedupe check

1. Complete a purchase; note the orderId (e.g. `LB-2026-XXXXX`).
2. Open DevTools → Application → Local Storage.
3. Confirm key `purchase_sent:LB-2026-XXXXX` exists with value `1`.
4. Refresh success page; `purchase` should not fire again (check DebugView).

---

## 9. Internal traffic exclusion (GA4 / GTM)

Internal staff traffic is excluded from GA4 without IP filtering. Staff visit with `?internal_user=true` once; a first-party cookie marks them as internal; `traffic_type: "internal"` is pushed to `dataLayer` before GTM loads.

### Implementation

| File | Role |
|------|------|
| **lib/cookies.ts** | Cookie helpers: `setCookie`, `getCookie` |
| **components/InternalTrafficBootstrap.tsx** | Client component: URL param → cookie, route changes → dataLayer push |
| **app/layout.tsx** | Inline script in `<head>` (runs before GTM), bootstrap component before `<GoogleAnalytics />` |

### Ordering (why bootstrap runs before GTM)

1. **Head inline script** – Runs when the browser parses the document, before React hydrates and before any `next/script` (GTM uses `strategy="afterInteractive"`). It sets the cookie from `?internal_user=true` and pushes `{ traffic_type: "internal" }` to `dataLayer` if the cookie exists.
2. **InternalTrafficBootstrap** – Client component placed before `<GoogleAnalytics />` in the body. On SPA route changes, it pushes `traffic_type` to `dataLayer` so each virtual pageview carries the flag.
3. **GoogleAnalytics (GTM)** – Loads with `afterInteractive`. When GTM initializes, `dataLayer` already contains `traffic_type: "internal"` for internal users.

### GTM configuration steps

1. **Data Layer Variable**  
   - Variables → New → Data Layer Variable  
   - Name: `traffic_type`  
   - Data Layer Variable Name: `traffic_type`

2. **GA4 Configuration tag**  
   - In your GA4 Configuration tag (or GA4 pageview tag), add **Fields to Set** / **Event Parameters**:  
   - Parameter name: `traffic_type`  
   - Value: `{{traffic_type}}` (the variable above)

3. **GA4 Admin – Define internal traffic**  
   - Admin → Data Streams → Web → your stream → Configure tag settings  
   - Define internal traffic  
   - Rule: `traffic_type` equals `internal`

4. **GA4 Admin – Data Filters**  
   - Admin → Data Settings → Data Filters  
   - Set **Internal traffic** to **Testing** first, then **Active** once verified

### Local test steps

1. Visit `/?internal_user=true` (or `/en?internal_user=true`).
2. Open DevTools → Application → Cookies.
3. Confirm `is_internal_staff=true` exists (Path: `/`, SameSite: Lax).
4. In Console: `window.dataLayer` – confirm it includes `{ traffic_type: "internal" }`.
5. Navigate to another page (e.g. `/en/catalog`) – URL should no longer show `internal_user`.
6. In Console: `window.dataLayer` – confirm `traffic_type: "internal"` is still pushed on route change.
7. Clear the cookie and revisit without the param – `traffic_type` should not appear.
