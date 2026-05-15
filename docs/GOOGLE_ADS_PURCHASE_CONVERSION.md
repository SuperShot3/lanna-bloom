# Google Ads purchase conversion (browser)

Goal: Record **purchase** in GA4 and (optionally) a **purchase** conversion in Google Ads when a customer lands on the paid order page, with good session attribution.

## What the app pushes (source of truth)

On the **paid** order page (`/order/[orderId]` with valid token), **`OrderPageClient`** pushes to **`window.dataLayer`**:

- **`event`:** `purchase` (lowercase — standard GA4 name).
- **`ecommerce`:** `transaction_id`, `value`, `currency`, `items` (each item: `item_id`, `item_name`, `price`, `quantity`) — **only** these keys under `ecommerce`; no root `order_id`.
- Immediately before: `dataLayer.push({ ecommerce: null })`.
- **Dedupe:** localStorage `sent_purchase_<orderId>` so a refresh does not fire again.
- **Timing:** Push is **immediate** (no wait for `gtm.js`); GTM processes the `dataLayer` queue when the container loads.

**GA4 revenue:** Configure GTM to send this same **`purchase`** event to GA4 (e.g. GA4 Event tag on Custom Event `purchase` with ecommerce mapping). This project does **not** send GA4 `purchase` from the server by default.

**Optional helper:** `trackCheckoutPurchase` in `lib/analytics/gtag.ts` matches the same payload and dedupe key if you need the same push from another client surface.

**Enhanced Conversions:** Configure user data in GTM separately (this push does not include `user_data`).

## Options

### Option 1: Browser only (current setup)

- **How:** GTM **Custom Event** trigger **`purchase`** → GA4 Event tag + optional **Google Ads Conversion** tag. Read value and transaction id from **`ecommerce.*`** (Data Layer Variables).
- **Pros:** Simple, one pipeline, strong same-session attribution.
- **Cons:** No GA4 `purchase` if the customer never opens the paid order page after paying.

### Option 2: Add Measurement Protocol later (server)

- **How:** Wire `sendPurchaseForOrder` from payment success paths and set `GA4_MEASUREMENT_ID` / `GA4_MEASUREMENT_API_SECRET`. See `docs/ANALYTICS_GA4.md` → *Optional: Measurement Protocol*.
- **Pros:** Can count every paid order even without a return visit.
- **Cons:** Must dedupe against browser `purchase` (same `transaction_id`) or disable one path to avoid double revenue in GA4.

### Option 3: Both browser + MP (advanced)

- Use **Option 1** for attribution and **Option 2** for coverage only if you implement **explicit** GA4 deduplication (same transaction id) or send **only one** of the two to GA4 for revenue.

## GTM setup (browser `purchase`)

1. **Trigger**
   - Type: Custom Event.
   - Event name: **`purchase`**.

2. **Variables (examples)**
   - Data Layer Variable: `ecommerce.value` (conversion value / revenue).
   - Data Layer Variable: `ecommerce.transaction_id` (order id for deduplication).
   - Data Layer Variable: `ecommerce.currency`.

3. **Tags**
   - **GA4:** Event tag (or GA4 + ecommerce) on **`purchase`**, mapped from `ecommerce.*`.
   - **Google Ads:** Conversion Tracking tag on **`purchase`**; map conversion value and transaction id from the variables above.

4. In Google Ads, create the conversion action (Website → Use Google Tag Manager) and copy the Conversion ID and Label into the tag.

## Summary

| Approach            | Trigger        | Where it fires        | Best for                                      |
|---------------------|----------------|------------------------|-----------------------------------------------|
| Browser (dataLayer) | `purchase`     | Paid order page → GTM | Default: GA4 + Ads attribution              |
| Measurement Protocol| Server (if wired) | Webhook / admin     | Optional: every paid order without pageview |

Recommendation: GTM **Custom Event** `purchase` → **GA4** + optional **Google Ads Conversion** using DL vars under `ecommerce.*`. Read **Troubleshooting** in `docs/ANALYTICS_GA4.md` if tags do not fire.
