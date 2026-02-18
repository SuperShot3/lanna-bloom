# Admin v2 — Editable Costs & Profit (Phase 2)

## Overview

The order detail page (`/admin-v2/orders/[order_id]`) includes a **Costs & Profit** card with editable cost fields and calculated profit.

## Columns (Supabase `orders` table)

| Column | Type | Description |
|--------|------|-------------|
| `cogs_amount` | numeric(12,2) | Cost of goods sold (editable) |
| `delivery_cost` | numeric(12,2) | Delivery cost (editable) |
| `payment_fee` | numeric(12,2) | Payment processing fee (editable) |
| `total_amount` | numeric(12,2) | Order total (display only; fallback: `grand_total`) |
| `updated_at` | timestamptz | Last cost update timestamp |

## Migration

If columns are missing, run in Supabase SQL Editor:

```sql
-- See supabase/migrations/20250218000000_add_order_cost_columns.sql
```

## API

**PATCH** `/api/admin/orders/[order_id]/costs`

- **Auth:** Same as admin-v2 (cookie or `x-admin-secret` header)
- **Body:** `{ cogs_amount?: number | null, delivery_cost?: number | null, payment_fee?: number | null }`
- **Validation:** Numeric >= 0, max 2 decimal places

## Env vars

No new env vars. Uses existing `ORDERS_ADMIN_SECRET` and Supabase config.

## Testing

See [ADMIN_V2_TEST_CHECKLIST.md](ADMIN_V2_TEST_CHECKLIST.md) — Phase 2 section.
