# Google Ads purchase conversion (browser)

Goal: Record **purchase** in GA4 and (optionally) a **purchase** conversion in Google Ads when the customer returns from Stripe to **`/lanna-order-thank-you`**, with good session attribution.

## What the app pushes (source of truth)

On **`/lanna-order-thank-you?session_id=...&lang=en|th`**, after **`GET /api/stripe/order-status`** returns **`paid`** with **`purchase`**, **`OrderThankYouClient`** pushes to **`window.dataLayer`** via **`trackCheckoutPurchase`**:

- **`event`:** `purchase` (lowercase — standard GA4 name).
- **`ecommerce`:** `transaction_id`, `value`, `currency`, `items` (each item: `item_id`, `item_name`, `price`, `quantity`) — **only** these keys under `ecommerce`; no root `order_id`.
- **`user_data`** (optional): `email_address`, `phone_number` (E.164) when server returns them with proof-of-checkout.
- Immediately before: `dataLayer.push({ ecommerce: null })`.
- **Dedupe:** localStorage `lanna_purchase_fired_<orderId>` (also reads legacy `sent_purchase_<orderId>`) so a refresh does not fire again.
- **Timing:** Push runs after a short GTM/consent wait (`waitForGtmConsentThen` in `lib/analytics/gtag.ts`).

**GA4 revenue:** Configure GTM to send this same **`purchase`** event to GA4 (e.g. GA4 Event tag on Custom Event `purchase` with ecommerce mapping). Browser `purchase` is primary; server GA4 Measurement Protocol is a deduped fallback when `ga4_purchase_sent` stays false (see `docs/ANALYTICS_GA4.md`).

**Google Ads conversion:** Configure GTM to fire a Google Ads Conversion tag on the same **`purchase`** event. Browser confirm sets `google_ads_conversion_sent`. When the customer never returns to the thank-you page, the purchase-fallback cron may upload the conversion via the Google Ads Conversion Upload API if `google_ads_conversion_sent` stays false (see **Server upload fallback** below).

**Optional helper:** `trackCheckoutPurchase` in `lib/analytics/gtag.ts` is the single entry point for the browser `purchase` shape and dedupe.

## Setup (browser only)

- GTM **Custom Event** trigger **`purchase`** → GA4 Event tag + optional **Google Ads Conversion** tag. Read value and transaction id from **`ecommerce.*`** (Data Layer Variables).
- Fires after server confirms paid order on `/lanna-order-thank-you` or explicit recovery on `/order/...`. If the customer leaves before tracking completes, GA4 Measurement Protocol fallback may still record revenue server-side; Google Ads Conversion Upload API fallback may record the Ads conversion when click ID or hashed PII is available.

## GTM setup (browser `purchase`)

1. **Trigger**
   - Type: **Custom Event**.
   - Event name: **`purchase`**.
   - **Do not** use Page URL contains `checkout`, `complete`, `success`, `stripe`, or `payment` — those match Stripe Hosted Checkout (`checkout.stripe.com`) and cause false conversions.
   - Optional (extra safety): **AND** Page Path **equals** `/lanna-order-thank-you` — not sufficient alone.

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

## Server upload fallback (no thank-you return)

When the browser never confirms (`google_ads_conversion_sent` stays false), the **`/api/cron/ga4-purchase-fallback`** job may upload the purchase conversion via the [Google Ads Conversion Upload API](https://developers.google.com/google-ads/api/docs/conversions/upload-clicks).

**Env (server-only):**

| Variable | Purpose |
|----------|---------|
| `GOOGLE_ADS_PURCHASE_CONVERSION_ACTION` | Resource name, e.g. `customers/1234567890/conversionActions/987654321` (from Google Ads → Goals → Conversions) |
| Existing `GOOGLE_ADS_*` OAuth vars | Same credentials as admin Marketing Insights |

**Upload rules (`lib/analytics/googleAdsConversionUpload.ts`):**

- Runs only after the same delay/grace window as GA4 MP (`GA4_PURCHASE_FALLBACK_DELAY_MS`, `GA4_PURCHASE_CLAIMED_GRACE_MS`).
- Skips silently when `GOOGLE_ADS_PURCHASE_CONVERSION_ACTION` is not set.
- Skips (not fails) when there is no `gclid` / `gbraid` / `wbraid` **and** no usable hashed email or phone.
- Sends **one** click ID only — priority: `gclid` > `gbraid` > `wbraid`.
- Uses `paid_at` for conversion time, order total/currency for value, `order_id` for deduplication.
- Sets `google_ads_conversion_sent=true`, `google_ads_conversion_source=upload_api` only on API success.
- Never uploads when browser already confirmed (`google_ads_conversion_sent=true`).

**Dedupe columns on `orders`:**

| Column | Meaning |
|--------|---------|
| `ga4_purchase_sent` | GA4 delivered (browser or MP) |
| `google_ads_conversion_sent` | Google Ads delivered (browser or upload) |
| `google_ads_conversion_source` | `browser` \| `upload_api` |
