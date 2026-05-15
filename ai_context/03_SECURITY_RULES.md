# Security rules

Non-negotiable trust boundaries for APIs, orders, and admin.

## Never trust the client for

- Line item prices, quantities, or product IDs used for charging
- Cart subtotals, delivery fees, discounts, referral amounts, or grand totals
- Payment status, order status, or fulfillment status
- User role, admin permissions, or order ownership
- `public_token` validity (must be verified server-side against the order)

**Server must recompute** pricing from catalog/checkout rules in API routes (e.g. `app/api/stripe/create-checkout-session/route.ts`).

## Secrets and keys

| Secret | Rule |
|--------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never in client bundles or `NEXT_PUBLIC_*`. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Server-only. |
| `SANITY_API_WRITE_TOKEN` | Server-only. |
| `AUTH_SECRET` | Admin session signing only. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Partner portal client only; RLS must protect data. |

## Admin access

- Routes under `/admin` (except login) require NextAuth session — see `middleware.ts` + `auth.ts`.
- Admin API routes must verify session/RBAC (`lib/adminRbac.ts`) — do not expose privileged mutations without auth.
- Admin password login is rate-limited (`lib/rateLimit.ts` — `isAdminPasswordLockedOut`).

## Customer order access

- `GET /api/orders/[orderId]` requires a valid `public_token` via `?token=` or `x-order-token` header.
- Invalid or missing token → **404** (not 401 with details) — see `app/api/orders/[orderId]/route.ts`.
- Order pages at `app/order/[orderId]/` must not leak PII without token.

## Stripe webhook

- Verify signature with `STRIPE_WEBHOOK_SECRET` before processing.
- Events recorded in `stripe_events` for idempotency — duplicates return 200 without re-processing (`docs/ORDERS_SUPABASE.md`).
- Do not trust client callbacks alone; Stripe `payment_status` / PaymentIntent status is authoritative.

## Checkout abuse

- `GET /api/stripe/order-status` is rate-limited per IP + session (`checkStripeOrderStatusRateLimit`).
- Optional `x-checkout-submission-token` pairs with server-side draft idempotency.

## Supabase

- Customer-facing order reads use token-aware patterns where applicable (`lib/supabase/server.ts` — `x-order-token` for RLS).
- Admin queries use service role via server modules — never from browser.

## When changing security-sensitive code

1. Read this file and [04_CHECKOUT_ORDERS_STRIPE.md](04_CHECKOUT_ORDERS_STRIPE.md).
2. Trace both happy path and attacker path (tampered body, missing token, replayed webhook).
3. Prefer 404 over leaking whether an order id exists.

## Deep dive

- [docs/ORDERS_SUPABASE.md](../docs/ORDERS_SUPABASE.md)
