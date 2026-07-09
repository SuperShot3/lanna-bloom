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

**Where (primary):** `components/checkout/OrderThankYouClient.tsx` on `/lanna-order-thank-you` after `order-status` returns paid + `purchase` payload.

**Where (fallback):** `components/order/OrderPageClient.tsx` on `/order/{id}?…&purchase_tracked=0` (thank-you failed to track) or `track_purchase=1` (pay-from-order Stripe success).

**Cart flow:**

1. Customer returns from Stripe to `/lanna-order-thank-you?session_id=...`
2. Client polls `GET /api/stripe/order-status`
3. Response has `status: 'paid'`, `orderId`, public `token`, and `purchase` payload
4. Thank-you calls `trackCheckoutPurchase` (browser `dataLayer` push) then redirects to `/order/{id}?token=…&purchase_tracked=0|1&session_id=…`
5. Order page retries only when `purchase_tracked=0` (or `track_purchase=1`)

**Pay-from-order:** Stripe `success_url` lands on `/order/...?track_purchase=1` (`stripeOrderSuccessUrl`) — order-page fallback fire path.

**Shape:** `dataLayer.push({ ecommerce: null })` then `dataLayer.push({ event: 'purchase', ecommerce: { transaction_id, value, currency, items }, ... })` with root-level mirror of `transaction_id`, `value`, `currency`, `items` for GTM variables.

**Dedupe (browser-only):** `localStorage` key `lanna_purchase_fired_<orderId>` (also reads legacy `sent_purchase_<orderId>`) + in-memory same-document guard. No server claim/confirm on the hot path.

**Timing:** `waitForGtmConsentThen` defers push briefly for GTM/consent ordering.

**GTM triggers:** Use Custom Event `purchase` only — do not use Page URL contains `checkout` / `complete` / `success` (matches `checkout.stripe.com`). Prefer no Page Path filter, or allow both `/lanna-order-thank-you` and `/order/...` (manual GTM check — no app GTM JSON).

**Legacy:** `/{lang}/checkout/complete` redirects to `/lanna-order-thank-you`.

### Measurement Protocol / claim-confirm (retired from hot path)

Server Measurement Protocol fallback, claim-purchase, and confirm-purchase APIs remain in the repo but are **not** scheduled or required for browser purchase. Re-enable only after browser GTM purchase is proven stable in production.

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
- Server Conversion Upload API / MP cron are **not** on the active path (browser-only hotfix).
- See [docs/GOOGLE_ADS_PURCHASE_CONVERSION.md](../docs/GOOGLE_ADS_PURCHASE_CONVERSION.md) for GTM variable mapping (`ecommerce.*`).

## Consent

- Consent Mode defaults bootstrapped before GTM in `GoogleAnalytics.tsx` (currently granted for analytics/ads storage).
- If adding a consent banner, update that script to match policy.

## Do not

- Fire `purchase` before server confirms paid order + valid `purchase` payload from `order-status`.
- Re-enable Measurement Protocol or claim/confirm on the hot path without proving browser GTM purchase first.
- Add duplicate Google Ads + GA4 purchase tags that both count revenue without GTM coordination.
- Push `page_view` from app code (conflicts with GTM SPA handling).

## Key files

| File | Role |
|------|------|
| `components/GoogleAnalytics.tsx` | GTM + consent bootstrap |
| `lib/analytics.ts` | Funnel event API |
| `lib/analytics/gtag.ts` | dataLayer transport, `trackCheckoutPurchase`, browser dedupe |
| `lib/analytics/buildPurchaseItemsFromOrder.ts` | Server line items for `order-status` |
| `app/lanna-order-thank-you/page.tsx` | Post-Stripe thank-you route |
| `components/checkout/OrderThankYouClient.tsx` | Primary browser `purchase` after paid `order-status` |
| `components/order/OrderPageClient.tsx` | Fallback browser `purchase` on `purchase_tracked=0` / `track_purchase=1` |
| `app/api/stripe/order-status/route.ts` | Returns `purchase` (+ optional `user_data`) when paid + proof |

## Deep dive

- [docs/ANALYTICS_GA4.md](../docs/ANALYTICS_GA4.md)
- [docs/GOOGLE_ADS_PURCHASE_CONVERSION.md](../docs/GOOGLE_ADS_PURCHASE_CONVERSION.md)
