# First-party Google Ads attribution

Lanna Bloom records Google Ads click ids on the site, attaches them to Stripe-paid orders, and can import those purchases into the **existing** Google Ads website conversion via the Data Manager API.

This path is **independent** of GTM → GA4 → Ads. Do not turn off the live browser `purchase` tag.

## What the app does

1. **Capture** — storefront middleware sets HttpOnly `lanna_vid` + `lanna_attr` cookies when the URL has `gclid` / `gbraid` / `wbraid` or UTMs. Client capture (`captureAnalyticsContext`) also stores click ids and UTMs and POSTs `/api/attribution/touch`.
2. **Persist** — `attribution_sessions` (one row per visitor). Last Google Ads click wins for 90 days. A later organic/direct visit does **not** clear click ids.
3. **Checkout** — `create-checkout-session` and pay-from-order re-read cookies (body ids are untrusted hints) and store `orders.attribution_id` plus denormalized `gclid|gbraid|wbraid`.
4. **Paid** — after Stripe marks the order paid, a `google_ads_offline_conversions` row is inserted (`pending` if there is a click id and `grand_total > 0`, otherwise `not_applicable`). Unique on `order_id`.
5. **Import** — cron `/api/cron/google-ads-offline-conversions` every 5 minutes calls Data Manager `events:ingest` when OAuth + conversion action id are configured. Otherwise rows stay `pending`.
6. **Admin** — Marketing → Diagnostics shows **Paid orders from Google Ads** (our DB) and a paid-order table with import status.

## Account setup (not done in the repo)

1. Keep Vercel `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_CUSTOMER_ID`.
2. Enable **Data Manager API** on the Google Cloud project that owns the OAuth client. Redirect URI stays `/api/admin/marketing/google-ads/oauth/callback`.
3. Deploy this code, then **Owner → Reconnect Google Ads** once (scope is now `adwords` + `datamanager`). Consent screen should be **In production**.
4. Set `GOOGLE_ADS_PURCHASE_CONVERSION_ACTION` to the existing website purchase conversion (`customers/…/conversionActions/…` or the numeric id). Confirm the GTM Ads tag sends `ecommerce.transaction_id` = Lanna order id.
5. Accept customer data terms in Google Ads if prompted.
6. After go-live, check 2–3 real paid Google-ad orders: Stripe → Diagnostics → Google Ads. Expect **one** conversion per order. If two, the GTM tag is missing `transaction_id` — fix that mapping, or temporarily point ingest at a Secondary action.
7. Do not backfill old orders on day 1.

Apply migration `supabase/migrations/20260821160000_first_party_ads_attribution.sql`.

## Validation

- Land on `/en/?gclid=test` (or a real Ads preview URL). Confirm `lanna_vid` / `lanna_attr` cookies (HttpOnly).
- Complete a paid checkout. Diagnostics should show the order as Google Ads = Yes when a click id was stored.
- Cron (or `Authorization: Bearer $CRON_SECRET` GET `/api/cron/google-ads-offline-conversions`) moves `pending` → `sent` when Data Manager is connected.
- Organic/direct paid orders stay `not_applicable` and are not uploaded.

## Rollback / fail-open

If Data Manager scope or `GOOGLE_ADS_PURCHASE_CONVERSION_ACTION` is missing, capture + DB + Diagnostics still work; nothing is sent to Google. Middleware can be narrowed; client cookies remain a fallback. Parked Measurement Protocol and `UploadClickConversions` stay unused.

## Optional later: Postgres connector

View `google_ads_offline_conversion_export` is PII-free (order id, paid_at, value, currency, click ids, status) for a possible Data Manager PostgreSQL connection. The live path is the API ingest cron, not that connector.
