# Supabase Dual-Write

Dual-write keeps legacy Blob/JSON storage as the primary source of truth while populating Supabase in parallel for Admin Dashboard v2 and improved customer tracking.

## Env Vars (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes (for dual-write) | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for dual-write) | Service role key. **Never expose to client.** |
| `SUPABASE_DUAL_WRITE_ENABLED` | No (default: false) | Set to `true` to enable dual-write |
| `SUPABASE_LOG_LEVEL` | No | `info` or `debug` for verbose logging |

## Production Verification (3–5 Steps)

1. Add env vars in Vercel (Production + Preview): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DUAL_WRITE_ENABLED=true`
2. Deploy with dual-write enabled
3. Place one bank-transfer order and one Stripe test order
4. Call `GET /api/admin/verify-supabase` while logged into admin-v2 (session cookie); confirm both sources match
5. Check Vercel function logs for `[supabase] order upsert ok`

### Single Order Verification

`GET /api/admin/verify-supabase?orderId=LB-2026-xxx` — compare legacy vs Supabase for one order.

## Rollback

Set `SUPABASE_DUAL_WRITE_ENABLED=false` in Vercel and redeploy. No code changes required. Legacy flow continues unchanged.

## Required Supabase Schema

Ensure these tables exist with the expected columns:

**orders:** `order_id` (PK), `public_token`, `customer_name`, `customer_email`, `phone`, `address`, `district`, `delivery_window`, `delivery_date`, `order_status`, `payment_status`, `stripe_session_id`, `stripe_payment_intent_id`, `paid_at`, `items_total`, `delivery_fee`, `grand_total`, `created_at`, `recipient_name`, `recipient_phone`, `contact_preference`, `referral_code`, `referral_discount`

**order_items:** `order_id` (FK), `bouquet_id`, `bouquet_title`, `size`, `price`, `image_url_snapshot`

**order_status_history:** `order_id`, `from_status`, `to_status`, `created_at`

## Architecture

- **Legacy:** Primary. All reads (order details, API, success page) use `getOrderById` from Blob/file.
- **Supabase:** Parallel write only. Best-effort; if Supabase fails, order still completes.
- **Kill switch:** When `SUPABASE_DUAL_WRITE_ENABLED` is false, no Supabase writes occur.

## Admin Dashboard v2

The Admin Dashboard v2 at `/admin-v2` reads orders from Supabase. See [ADMIN_V2_TEST_CHECKLIST.md](ADMIN_V2_TEST_CHECKLIST.md) for manual testing.

## Files

- `lib/supabase/server.ts` — server-only Supabase admin client
- `lib/supabase/orderAdapter.ts` — dual-write adapter, payment sync helpers
- `lib/orders.ts` — calls `dualWriteOrder` after `createOrder` / `createPendingOrder`
- `app/api/stripe/webhook/route.ts` — calls `syncSupabasePaymentSuccess` / `syncSupabasePaymentFailed`
- `app/api/admin/verify-supabase/route.ts` — verification endpoint (admin-v2 session required)
