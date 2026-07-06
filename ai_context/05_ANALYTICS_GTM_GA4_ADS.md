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

**Where:** `components/checkout/OrderThankYouClient.tsx` on `/lanna-order-thank-you`

**When:**

1. Customer returns from Stripe with `?session_id=...`
2. Client polls `GET /api/stripe/order-status`
3. Response has `status: 'paid'`, `orderId`, and `purchase` (server-built analytics payload)
4. Client calls `trackCheckoutPurchase` in `lib/analytics/gtag.ts`

**Shape:** `dataLayer.push({ ecommerce: null })` then `dataLayer.push({ event: 'purchase', ecommerce: { transaction_id, value, currency, items }, ... })` with root-level mirror of `transaction_id`, `value`, `currency`, `items` for GTM variables.

**Dedupe (source of truth — server claim):** Before pushing, `trackCheckoutPurchase` calls
`POST /api/orders/[orderId]/claim-purchase` (public token required) which atomically sets
`orders.ga4_purchase_sent` / `ga4_purchase_sent_at`. Only the first caller globally gets
`shouldTrack: true`; everyone else (other browser, device, admin view, shared link) gets
`shouldTrack: false` and must not push. Claim failures fail closed (no push).
`localStorage` key `lanna_purchase_fired_<orderId>` (also reads legacy `sent_purchase_<orderId>`)
+ in-memory guard remain as secondary browser-level protection only.

**Timing:** `waitForGtmConsentThen` defers push briefly for GTM/consent ordering. The claim runs
after GTM is confirmed loaded, immediately before the push (minimizes claimed-but-not-pushed loss).

**Order page fallback (`/order/...`):** fires only on explicit recovery signals —
`purchase_tracked=0` (thank-you page could not track) or `track_purchase=1` (return from
pay-from-order Stripe checkout; added by `stripeOrderSuccessUrl`). A plain paid order view never
fires `purchase`; `view_order_status`-style events are fine, `purchase` is not.

**GTM triggers:** Use Custom Event `purchase` only — do not use Page URL contains `checkout` / `complete` / `success` (matches `checkout.stripe.com`). Optional AND: Page Path equals `/lanna-order-thank-you`.

**Legacy:** `/{lang}/checkout/complete` redirects to `/lanna-order-thank-you` — no purchase on legacy page.

**No server-side GA4 purchase:** Revenue `purchase` is browser → dataLayer → GTM only (no Measurement Protocol from webhooks).

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
- See [docs/GOOGLE_ADS_PURCHASE_CONVERSION.md](../docs/GOOGLE_ADS_PURCHASE_CONVERSION.md) for GTM variable mapping (`ecommerce.*`).

## Consent

- Consent Mode defaults bootstrapped before GTM in `GoogleAnalytics.tsx` (currently granted for analytics/ads storage).
- If adding a consent banner, update that script to match policy.

## Do not

- Fire `purchase` before server confirms paid order + valid `purchaseAnalytics` payload.
- Add server-side GA4 `purchase` (Measurement Protocol) alongside browser `purchase` without a dedupe design.
- Add duplicate Google Ads + GA4 purchase tags that both count revenue without GTM coordination.
- Push `page_view` from app code (conflicts with GTM SPA handling).

## Key files

| File | Role |
|------|------|
| `components/GoogleAnalytics.tsx` | GTM + consent bootstrap |
| `lib/analytics.ts` | Funnel event API |
| `lib/analytics/gtag.ts` | dataLayer transport, `trackCheckoutPurchase`, dedupe |
| `lib/analytics/buildPurchaseItemsFromOrder.ts` | Server line items for `order-status` |
| `app/lanna-order-thank-you/page.tsx` | Universal post-Stripe thank-you (lang via `?lang=`) |
| `app/api/stripe/order-status/route.ts` | Returns `purchase` (+ optional `user_data`) when paid + proof |
| `app/api/orders/[orderId]/claim-purchase/route.ts` | Atomic order-level purchase claim (server-side dedupe) |

## Deep dive

- [docs/ANALYTICS_GA4.md](../docs/ANALYTICS_GA4.md)
- [docs/GOOGLE_ADS_PURCHASE_CONVERSION.md](../docs/GOOGLE_ADS_PURCHASE_CONVERSION.md)
