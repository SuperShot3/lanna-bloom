# Google Ads purchase conversion (Stripe trigger)

Goal: Record a **purchase** conversion in Google Ads when a customer completes Stripe checkout, so Google Ads can attribute and optimize.

## Options

### Option 1: Import from GA4 (no code change)

- **How:** Stripe webhook already sends a `purchase` event to GA4 via Measurement Protocol. Link your GA4 property to Google Ads and import that event as a conversion.
- **Steps:**
  1. Google Ads → **Goals** → **Conversions** → **New conversion action** → **Import** → **Google Analytics 4 property**.
  2. Select the GA4 property and the **purchase** event.
  3. Create the conversion action (name e.g. "Purchase", value = Use value from GA4).
- **Pros:** No code change; works for all paid orders (Stripe + manual if you send them to GA4).
- **Cons:** Attribution is via GA4; server-side events may not always get the same session/click context as a browser tag.

### Option 2: Fire conversion from browser (recommended for best attribution)

- **How:** When the user lands on the **order confirmation page** after Stripe (same session as the ad click), the app can push a dedicated event to the dataLayer. GTM fires a **Google Ads Conversion** tag on that event.
- **Current code:** `trackGoogleAdsPurchase` in `lib/analytics/gtag.ts` can push `google_ads_purchase` to the dataLayer if you call it from a client component (e.g. paid order page). It is **not** wired by default — GA4 **purchase** revenue uses Measurement Protocol (`sendPurchaseForOrder`). For Option 2, call `trackGoogleAdsPurchase` where you want browser attribution, or use **Option 1** (GA4 import).

**GTM setup (Option 2):**

1. **Variables**
   - Data Layer Variable: `value` (Data Layer Variable Name = `value`).
   - Data Layer Variable: `transaction_id` (Data Layer Variable Name = `transaction_id`).
   - Data Layer Variable: `currency` (Data Layer Variable Name = `currency`).

2. **Trigger**
   - Custom Event.
   - Event name: `google_ads_purchase`.

3. **Tag**
   - Google Ads Conversion Tracking.
   - Conversion ID and Conversion Label from your Google Ads conversion action.
   - Conversion value: `{{value}}` (or fixed value if you prefer).
   - Transaction ID: `{{transaction_id}}` (optional, for deduplication in Google Ads).
   - Trigger: the `google_ads_purchase` trigger.

4. In Google Ads, create the conversion action (Website → Use Google Tag Manager) and copy the Conversion ID and Label into the tag.

### Option 3: Both (optional)

- Use **Option 1** to count all purchases (including manual/backend-only).
- Use **Option 2** so Stripe-paid sessions get a browser conversion for better click attribution. In Google Ads, use **one** conversion action for “Purchase” (either import or tag), or create two and use only one for bidding to avoid double-counting.

## Summary

| Approach              | Trigger        | Where it fires | Best for                    |
|-----------------------|----------------|----------------|-----------------------------|
| Import from GA4       | Stripe webhook | Server → GA4   | Counting all paid orders    |
| Browser (dataLayer)   | Order page load| Browser → GTM  | Best attribution for ads   |

Recommendation: set up **Option 2** (browser event + GTM Google Ads tag) so Stripe purchases are attributed to Google Ads in the same session. Optionally also import GA4 purchase for reporting consistency.
