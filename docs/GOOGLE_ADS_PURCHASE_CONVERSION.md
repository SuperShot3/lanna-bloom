# Google Ads purchase conversion (Stripe trigger)

Goal: Record a **purchase** conversion in Google Ads when a customer completes checkout, with good session attribution.

## What the app pushes (source of truth)

On the **paid** order page (`/order/[orderId]` with valid token), **`OrderPageClient`** calls **`trackCheckoutPurchase`** (`lib/analytics/gtag.ts`), which pushes **one** dataLayer message:

- **`event`:** `google_ads_purchase` (exact string; GTM Custom Event trigger must match).
- **Root keys:** `order_id`, `transaction_id` (same value as `order_id`), `value`, `currency`.
- **`user_data`:** `{ email_address?, phone_number? }` (normalized; may be empty).
- **`ecommerce`:** `{ items: [{ item_id, item_name, price, quantity }, ...] }`.
- GTM also receives `eventCallback` / `eventTimeout` on this push for tag sequencing.

The default order page **does not** push a separate **`purchase`** dataLayer event. GA4 **`purchase`** is expected from **Measurement Protocol** unless you map this event to GA4 in GTM (see `docs/ANALYTICS_GA4.md`).

## Options

### Option 1: Import from GA4 (no GTM browser conversion required)

- **How:** Stripe webhook sends a `purchase` event to GA4 via Measurement Protocol. Link GA4 to Google Ads and import **purchase**.
- **Pros:** Counts all paid orders even if the customer never reopens the order page.
- **Cons:** Weaker same-session click attribution than a browser tag.

### Option 2: Fire conversion from browser (recommended for Ads attribution)

- **How:** GTM listens for **`google_ads_purchase`** and fires **Google Ads Conversion Tracking** (and optionally a GA4 Event tag).
- **Current code:** `OrderPageClient` → **`trackCheckoutPurchase`** only.

**GTM setup (Option 2):**

1. **Variables**
   - Data Layer Variable: `value` (name = `value`).
   - Data Layer Variable: `currency` (name = `currency`).
   - Data Layer Variable: `order_id` (name = `order_id`) **or** `transaction_id` (name = `transaction_id`) — both are set to the same order id.

2. **Trigger**
   - Custom Event.
   - Event name: **`google_ads_purchase`**.

3. **Tag**
   - Google Ads Conversion Tracking.
   - Conversion value: `{{value}}`.
   - Transaction ID: `{{transaction_id}}` or `{{order_id}}` (dedupe in Google Ads).

4. In Google Ads, create the conversion action (Website → Use Google Tag Manager) and copy the Conversion ID and Label into the tag.

### Option 3: Both (optional)

- Use **Option 1** for full coverage and **Option 2** for better Ads attribution on sessions that hit the order page. Avoid counting the same sale twice in Ads (one conversion action for bidding).

## Summary

| Approach              | Trigger        | Where it fires | Best for                    |
|-----------------------|----------------|----------------|-----------------------------|
| Import from GA4       | Stripe webhook | Server → GA4   | Counting all paid orders    |
| Browser (dataLayer)   | Order page load| Browser → GTM  | Best attribution for ads   |

Recommendation: set up **Option 2** (GTM on **`google_ads_purchase`**) for Google Ads, keep **Measurement Protocol** for GA4 `purchase`, and read **Troubleshooting** in `docs/ANALYTICS_GA4.md` if tags do not fire.
