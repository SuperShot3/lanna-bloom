# Order Store Migration — Rollout Steps

## Pre-requisites

1. Supabase project with `orders`, `order_items`, `order_status_history` tables
2. Run migration: `supabase/migrations/20250220000000_orders_supabase_primary.sql` in Supabase SQL Editor
3. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in Vercel

## Phase 1: Migrate existing orders

```bash
# Local: ensure .env.local has BLOB_READ_WRITE_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npx tsx scripts/migrate_blob_orders_to_supabase.ts
```

Check output: Total, Upserted, Failed. Fix any failed orders if needed.

## Phase 2: Deploy with Supabase read-first

In Vercel → Project → Settings → Environment Variables, add:

| Variable | Value | Environments |
|----------|-------|--------------|
| `ORDERS_PRIMARY_STORE` | `supabase` | Production, Preview |
| `ORDERS_READ_FALLBACK` | `blob` | Production, Preview |

Deploy. Orders are read from Supabase first; Blob is fallback. Old Blob-only orders auto-backfill when loaded.

## Phase 3: Test

1. **Create order** — Place a test order (bank transfer or Stripe test)
2. **Immediate load** — Open `/order/LB-xxxx` in a new tab within 1–2 seconds. Should load fast.
3. **Stripe payment** — Use Stripe test card; verify order shows "Payment confirmed" after webhook
4. **Old order** — Open an order that existed only in Blob before migration. Should load and backfill to Supabase
5. **Admin** — Change fulfillment status to "dispatched"; refresh customer order page; status should update

## Phase 4: Optional dual-write to Blob (safety)

If you want new orders also written to Blob during rollout:

| Variable | Value |
|----------|-------|
| `ORDERS_DUAL_WRITE_BLOB` | `true` |

## Phase 5: Remove Blob fallback (after 3–7 days stable)

| Variable | Value |
|----------|-------|
| `ORDERS_READ_FALLBACK` | `none` |

Redeploy. Orders are now Supabase-only.

## Rollback (instant)

If issues occur, set:

| Variable | Value |
|----------|-------|
| `ORDERS_PRIMARY_STORE` | `blob` |

Redeploy. All reads/writes use Blob again. No code changes.
