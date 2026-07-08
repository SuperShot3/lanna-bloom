# Analytics — GTM, GA4, Google Ads

Client-side analytics architecture. **Do not add direct `gtag` calls** — the app pushes to `window.dataLayer`; GTM owns transport.

## Architecture

| Rule | Detail |
|------|--------|
| Transport | GTM only (`NEXT_PUBLIC_GTM_ID`) |
| Production only | GTM loads when `NODE_ENV === 'production'` and GTM id is set |
| No fallback IDs | No hardcoded GA/GTM ids in source |
| Pageviews | Owned by GTM (History Change / config tag), not pushed from app code |
| Loader | `components/GoogleAnalytics.tsx` |
| Event helpers | `lib/analytics.ts` → `lib/analytics/gtag.ts` (`pushToDataLayer`) |

## Canonical `purchase` (paid web checkout)

**Where (primary):** `components/order/OrderPageClient.tsx` on `/order/{id}?token=…&track_purchase=1`

**Cart flow:**

1. Customer returns from Stripe to `/lanna-order-thank-you?session_id=...` (thank-you is a **resolver only** — does not push `purchase`)
2. Client polls `GET /api/stripe/order-status`
3. Response has `status: 'paid'`, `orderId`, and public `token`
4. Thank-you redirects to `/order/{id}?token=…&track_purchase=1&session_id=…`
5. Order page calls `trackCheckoutPurchase` in `lib/analytics/gtag.ts`

**Pay-from-order:** Stripe `success_url` already lands on `/order/...?track_purchase=1` (`stripeOrderSuccessUrl`) — same order-page fire path.

**Shape:** `dataLayer.push({ ecommerce: null })` then `dataLayer.push({ event: 'purchase', ecommerce: { transaction_id, value, currency, items }, ... })` with root-level mirror of `transaction_id`, `value`, `currency`, `items` for GTM variables.

**Dedupe (source of truth — server claim + confirm):** Before pushing, `trackCheckoutPurchase` calls
`POST /api/orders/[orderId]/claim-purchase` (public token required) which atomically sets
`orders.ga4_purchase_claimed`. After a successful dataLayer push, it **awaits**
`POST /api/orders/[orderId]/confirm-purchase` (with 500ms / 2s / 5s retries) to set
`orders.ga4_purchase_sent` and `orders.google_ads_conversion_sent` (browser GTM fires both GA4
and Ads from the same `purchase` event). Only the first browser globally gets `shouldTrack: true`
on claim. Server Measurement Protocol fallback runs when `ga4_purchase_sent` is still false after
`GA4_PURCHASE_FALLBACK_DELAY_MS` (and `GA4_PURCHASE_CLAIMED_GRACE_MS` when claimed). Google Ads
Conversion Upload API fallback runs when `google_ads_conversion_sent` is still false after the same
delay window (independent sent flag — GA4 MP can succeed while Ads upload skips when no click ID).
`localStorage` key `lanna_purchase_fired_<orderId>` (also reads legacy `sent_purchase_<orderId>`)
+ in-memory guard remain as secondary browser-level protection only.

**Ad click IDs:** `gclid` / `gbraid` / `wbraid` captured from URL into cookies (~90 days,
`SameSite=Lax`) and sessionStorage; attached to checkout session requests for MP attribution.

**Timing:** `waitForGtmConsentThen` defers push briefly for GTM/consent ordering. The claim runs
after GTM is confirmed loaded, immediately before the push (minimizes claimed-but-not-pushed loss).

**Legacy recovery:** `purchase_tracked=0` on the order page still triggers the same fire path (older thank-you redirects). A plain paid order view never fires `purchase`; `view_order_status`-style events are fine, `purchase` is not.

**GTM triggers:** Use Custom Event `purchase` only — do not use Page URL contains `checkout` / `complete` / `success` (matches `checkout.stripe.com`). If a purchase tag previously ANDed Page Path equals `/lanna-order-thank-you`, **broaden or remove that path filter** so `/order/...` fires (manual GTM check — no app GTM JSON).

**Legacy:** `/{lang}/checkout/complete` redirects to `/lanna-order-thank-you` — no purchase on legacy page.

**No duplicate revenue:** Browser `purchase` remains primary; server MP fallback uses the same
`transaction_id` (order id) and only fires when `ga4_purchase_sent` is false after the delay window.

### Measurement Protocol sender notes

- Payload: `session_id` as integer (omit if invalid), `timestamp_micros`, dynamic `engagement_time_msec`.
- Host: `https://google-analytics.com` (override via `GA4_MP_ENDPOINT_HOST`; `GA4_MP_EU_ENDPOINT`).
- Non-prod: `/debug/mp/collect` only; refuse when `validationMessages` non-empty.
- Prod: validate-before-send default on (`GA4_MP_VALIDATE_BEFORE_SEND`), then `/mp/collect`.
- Failures always persist to `ga4_purchase_last_error`.

**Ops (one-time after deploy):** Reset 8 Jul 2026 maxed PAID rows (`ga4_purchase_attempts`, `ga4_purchase_mp_lock_at`, `ga4_purchase_last_error`, restore `ga4_purchase_fallback_run_after`) so the fixed sender can retry — see `docs/ANALYTICS_GA4.md`.

## Funnel events (secondary)

Pushed via `lib/analytics.ts`:

| Event | Typical use |
|-------|-------------|
| `view_item_list` | Catalog / list views (deduped per session) |
| `select_item` | Item selected from list |
| `view_item` | Product detail — **usually GA4 only** in GTM |
| `add_to_cart` | Add to cart |
| `remove_from_cart` | Remove from cart |
| `view_cart` | Cart page |
| `begin_checkout` | Checkout started |
| Messenger clicks | LINE / WhatsApp with `page_location` |

Configure matching **Custom Event** triggers in GTM.

## Google Ads

- Purchase conversion should listen to the same browser `purchase` dataLayer event (GTM tag).
- Browser confirm sets `google_ads_conversion_sent=true`, `google_ads_conversion_source=browser`.
- Server Conversion Upload API fallback (`lib/analytics/googleAdsConversionUpload.ts`) runs from the
  purchase-fallback cron when `google_ads_conversion_sent` is still false after the delay window.
  Requires `GOOGLE_ADS_PURCHASE_CONVERSION_ACTION` plus existing `GOOGLE_ADS_*` OAuth creds.
- See [docs/GOOGLE_ADS_PURCHASE_CONVERSION.md](../docs/GOOGLE_ADS_PURCHASE_CONVERSION.md) for GTM variable mapping (`ecommerce.*`) and upload rules.

## Consent

- Consent Mode defaults bootstrapped before GTM in `GoogleAnalytics.tsx` (currently granted for analytics/ads storage).
- If adding a consent banner, update that script to match policy.

## Do not

- Fire `purchase` before server confirms paid order + valid `purchaseAnalytics` payload.
- Do not add server-side GA4 `purchase` (Measurement Protocol) **alongside** a confirmed browser `purchase` without dedupe — fallback only when `ga4_purchase_sent` is false.
- Add duplicate Google Ads + GA4 purchase tags that both count revenue without GTM coordination.
- Push `page_view` from app code (conflicts with GTM SPA handling).

## Key files

| File | Role |
|------|------|
| `components/GoogleAnalytics.tsx` | GTM + consent bootstrap |
| `lib/analytics.ts` | Funnel event API |
| `lib/analytics/gtag.ts` | dataLayer transport, `trackCheckoutPurchase`, dedupe |
| `lib/analytics/buildPurchaseItemsFromOrder.ts` | Server line items for `order-status` |
| `app/lanna-order-thank-you/page.tsx` | Post-Stripe resolver → redirects to order with `track_purchase=1` |
| `components/checkout/OrderThankYouClient.tsx` | Resolver UI only (no `purchase` push) |
| `components/order/OrderPageClient.tsx` | Primary browser `purchase` on `track_purchase=1` |
| `app/api/stripe/order-status/route.ts` | Returns `purchase` (+ optional `user_data`) when paid + proof |
| `app/api/orders/[orderId]/claim-purchase/route.ts` | Atomic order-level purchase claim (browser dedupe) |
| `app/api/orders/[orderId]/confirm-purchase/route.ts` | Mark browser purchase delivered (`ga4_purchase_sent` + `google_ads_conversion_sent`) |
| `lib/analytics/ga4PurchaseFallback.ts` | Measurement Protocol + Ads upload fallback scheduler/processor |
| `lib/analytics/ga4MeasurementProtocol.ts` | GA4 MP `purchase` sender |
| `lib/analytics/googleAdsConversionUpload.ts` | Google Ads Conversion Upload API sender |

## Deep dive

- [docs/ANALYTICS_GA4.md](../docs/ANALYTICS_GA4.md)
- [docs/GOOGLE_ADS_PURCHASE_CONVERSION.md](../docs/GOOGLE_ADS_PURCHASE_CONVERSION.md)
