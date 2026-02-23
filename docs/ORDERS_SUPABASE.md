# Orders on Supabase (Primary Store)

Supabase is the primary order store for Lanna Bloom. Blob is optional fallback during rollout and can be removed after stability.

## Env Vars (Vercel)

| Variable | Required | Default | Description |
|----------|----------|--------|-------------|
| `SUPABASE_URL` | Yes (for Supabase primary) | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for Supabase primary) | — | Service role key. **Never expose to client.** |
| `ORDERS_PRIMARY_STORE` | No | `supabase` when Supabase configured | `supabase` or `blob` |
| `ORDERS_READ_FALLBACK` | No | `none` | `none` (Supabase only) or `blob` (legacy fallback) |
| `BLOB_READ_WRITE_TOKEN` | When `ORDERS_READ_FALLBACK=blob` | — | Vercel Blob token |

## Architecture

- **Single source of truth:** Supabase. All create/read/update goes through the order router.
- **No Blob by default:** `ORDERS_READ_FALLBACK` defaults to `none`. Set `ORDERS_READ_FALLBACK=blob` only for legacy migration fallback.
- **Rollback:** Set `ORDERS_PRIMARY_STORE=blob` to restore Blob-only behavior.

## Fulfillment Status

Customer-facing order status (new, confirmed, preparing, dispatched, delivered, cancelled, issue) is stored in Supabase and editable from Admin. The Stripe webhook updates only payment fields and never overwrites fulfillment_status.

## Idempotency

Stripe webhook events are recorded in `stripe_events` to prevent double-processing. Duplicate events return 200 without re-processing.

## Migration from Blob

1. Run Supabase migration: `supabase/migrations/20250220000000_orders_supabase_primary.sql`
2. Run migration script: `npx tsx scripts/migrate_blob_orders_to_supabase.ts`
3. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ORDERS_PRIMARY_STORE=supabase`
4. Deploy. Supabase is the single source of truth; no Blob fallback by default.

## Files

- `lib/orders/` — Store abstraction (router, blobStore, supabaseStore)
- `lib/orders.ts` — Public API re-exports
- `app/api/stripe/webhook/route.ts` — Idempotent payment updates
