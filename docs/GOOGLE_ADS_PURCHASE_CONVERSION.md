# Google Ads purchase conversion (browser)

Goal: Record **purchase** in GA4 and (optionally) a **purchase** conversion in Google Ads when the customer completes Stripe checkout, with good session attribution.

## What the app pushes (source of truth)

Cart: Stripe → **`/lanna-order-thank-you`** (polls `order-status`, pushes **`purchase`**) → redirect to **`/order/{id}?token=…&purchase_tracked=0|1`**. Pay-from-order Stripe success URL includes `track_purchase=1` for order-page fallback. **`trackCheckoutPurchase`** pushes to **`window.dataLayer`**:

- **`event`:** `purchase` (lowercase — standard GA4 name).
- **`ecommerce`:** `transaction_id`, `value`, `currency`, `items` (each item: `item_id`, `item_name`, `price`, `quantity`) — **only** these keys under `ecommerce`; no root `order_id`.
- **`user_data`** (optional): `email_address`, `phone_number` (E.164) when available on the order.
- Immediately before: `dataLayer.push({ ecommerce: null })`.
- **Dedupe:** localStorage `lanna_purchase_fired_<orderId>` (also reads legacy `sent_purchase_<orderId>`) so a refresh does not fire again.
- **Timing:** Push runs after a short GTM/consent wait (`waitForGtmConsentThen` in `lib/analytics/gtag.ts`).

**GA4 revenue:** Configure GTM to send this same **`purchase`** event to GA4 (e.g. GA4 Event tag on Custom Event `purchase` with ecommerce mapping). Browser `purchase` is the only active path (Measurement Protocol cron disabled).

**Google Ads conversion:** Configure GTM to fire a Google Ads Conversion tag on the same **`purchase`** event.

**Optional helper:** `trackCheckoutPurchase` in `lib/analytics/gtag.ts` is the single entry point for the browser `purchase` shape and dedupe.

## Setup (browser only)

- GTM **Custom Event** trigger **`purchase`** → GA4 Event tag + optional **Google Ads Conversion** tag. Read value and transaction id from **`ecommerce.*`** (Data Layer Variables).
- Primary fire is on `/lanna-order-thank-you`; fallback on `/order/...?purchase_tracked=0` or `track_purchase=1`.

## GTM setup (browser `purchase`)

1. **Trigger**
   - Type: **Custom Event**.
   - Event name: **`purchase`**.
   - **Do not** use Page URL contains `checkout`, `complete`, `success`, `stripe`, or `payment` — those match Stripe Hosted Checkout (`checkout.stripe.com`) and cause false conversions.
   - Prefer Custom Event alone (no Page Path filter), or allow both `/lanna-order-thank-you` and `/order`.

2. **Variables (examples)**
   - Data Layer Variable: `ecommerce.value` (conversion value / revenue).
   - Data Layer Variable: `ecommerce.transaction_id` (order id for deduplication).
   - Data Layer Variable: `ecommerce.currency`.
   - Enhanced Conversions: `user_data.email_address`, `user_data.phone_number`.

3. **Tags**
   - **GA4:** Event tag (or GA4 + ecommerce) on **`purchase`**, mapped from `ecommerce.*`.
   - **Google Ads:** Conversion Tracking tag on **`purchase`**; map conversion value and transaction id from the variables above.

4. In Google Ads, create the conversion action (Website → Use Google Tag Manager) and copy the Conversion ID and Label into the tag.

**Legacy:** `/{lang}/checkout/complete` redirects to `/lanna-order-thank-you` — no purchase on the legacy page.

Recommendation: GTM **Custom Event** `purchase` → **GA4** + optional **Google Ads Conversion** using DL vars under `ecommerce.*`. Read **Troubleshooting** in `docs/ANALYTICS_GA4.md` if tags do not fire.

## Server upload fallback (parked)

Code for Google Ads Conversion Upload API still exists under `lib/analytics/`, but the cron is **not** scheduled. Live Ads purchase conversions rely on the browser `dataLayer` → GTM path above.

**Dedupe columns on `orders` (legacy / parked):**

| Column | Meaning |
|--------|---------|
| `ga4_purchase_sent` | Was set by claim/confirm or MP when that path was live |
| `google_ads_conversion_sent` | Was set by browser confirm or upload API |
| `google_ads_conversion_source` | `browser` \| `upload_api` |
