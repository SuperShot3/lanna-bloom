# Google Ads purchase conversion (browser)

Goal: Record a **purchase** conversion in Google Ads when a customer lands on the paid order page, with good session attribution.

## What the app pushes (source of truth)

On the **paid** order page (`/order/[orderId]` with valid token), **`OrderPageClient`** calls **`trackCheckoutPurchase`** (`lib/analytics/gtag.ts`), which pushes **one** dataLayer message:

- **`event`:** `purchase` (lowercase — standard GA4 name).
- **`ecommerce`:** `transaction_id`, `value`, `currency`, `items` (each item: `item_id`, `item_name`, `price`, `quantity`) — **only** these keys under `ecommerce`; no root `order_id`.
- Immediately before: `dataLayer.push({ ecommerce: null })`.
- **Dedupe:** localStorage `sent_purchase_<orderId>` so a refresh does not fire again.
- **Timing:** Push is **immediate** (no wait for `gtm.js`); GTM processes the `dataLayer` queue when the container loads.

**GA4:** `purchase` for **revenue** should come from **Measurement Protocol** on the server only. Use this browser event in GTM for **Google Ads** (map `ecommerce.*`), not a second GA4 Purchase tag — see `docs/ANALYTICS_GA4.md`. For **Enhanced Conversions**, configure user data in GTM separately (this push does not include `user_data`).

## Options

### Option 1: Import from GA4 (no GTM browser conversion required)

- **How:** Stripe webhook sends `purchase` to GA4 via Measurement Protocol. Link GA4 to Google Ads and import **purchase**.
- **Pros:** Counts all paid orders even if the customer never reopens the order page.
- **Cons:** Weaker same-session click attribution than a browser tag.

### Option 2: Fire conversion from browser (recommended for Ads attribution)

- **How:** GTM **Custom Event** trigger **`purchase`** → **Google Ads Conversion Tracking** tag. Read value and transaction id from the **ecommerce** object (Data Layer Variables).

**GTM setup (Option 2):**

1. **Trigger**
   - Type: Custom Event.
   - Event name: **`purchase`**.

2. **Variables (examples)**
   - Data Layer Variable: `ecommerce.value` (conversion value).
   - Data Layer Variable: `ecommerce.transaction_id` (transaction / order id for deduplication).
   - Data Layer Variable: `ecommerce.currency`.

3. **Tag**
   - Google Ads Conversion Tracking.
   - Map conversion value and transaction id from the variables above.

4. In Google Ads, create the conversion action (Website → Use Google Tag Manager) and copy the Conversion ID and Label into the tag.

### Option 3: Both (optional)

- Use **Option 1** for full coverage and **Option 2** for better Ads attribution on sessions that hit the order page. Avoid counting the same sale twice in Ads (one conversion action for bidding).

## Summary

| Approach            | Trigger        | Where it fires | Best for                  |
|---------------------|----------------|----------------|---------------------------|
| Import from GA4     | Stripe webhook | Server → GA4   | Counting all paid orders  |
| Browser (dataLayer) | `purchase`     | Browser → GTM  | Best attribution for ads  |

Recommendation: GTM **Custom Event** `purchase` → **Google Ads Conversion** only (DL vars under `ecommerce.*`). **Do not** add a GA4 Event tag for browser `purchase` while MP sends GA4 `purchase`. Read **Troubleshooting** in `docs/ANALYTICS_GA4.md` if tags do not fire.
