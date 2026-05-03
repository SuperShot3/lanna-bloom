# Admin — Editable Costs & Profit

## Overview

The order detail page (`/admin/orders/[order_id]`) includes a **Costs & Profit** card with editable cost fields and calculated profit.

Full accounting behavior (income vs expenses, money buckets): [ACCOUNTING_AND_EXPENSES.md](ACCOUNTING_AND_EXPENSES.md).

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

- **Auth:** Same as admin (cookie or `x-admin-secret` header)
- **Body:** `{ cogs_amount?: number | null, delivery_cost?: number | null, payment_fee?: number | null }`
- **Validation:** Numeric >= 0, max 2 decimal places

## Env vars

No new env vars. Uses existing `ORDERS_ADMIN_SECRET` and Supabase config.

## Synced expense rows (Accounting)

Saving costs also **creates or updates** linked rows in `public.expenses` for internal bookkeeping:

| Trigger | `category` | `description` | `notes` | `payment_method` |
|---------|------------|---------------|---------|------------------|
| COGS saved | `flowers` | `COGS (flowers) — order {order_id}` | `Auto from order COGS` | `bank_transfer` |
| Positive `delivery_cost` | `delivery` | `Delivery (driver) — order {order_id}` | `Auto from order delivery cost` | `bank_transfer` |

Both rows set `linked_order_id` to the order id and use the order’s paid date (or created date) as expense `date`. Removing delivery cost to zero deletes the auto-synced delivery expense rows that match the delivery sync note.

For money-location behavior (how these hit Bank vs Cash on the overview), see **[ACCOUNTING_AND_EXPENSES.md](ACCOUNTING_AND_EXPENSES.md)**.

## Testing

See [ADMIN_V2_TEST_CHECKLIST.md](ADMIN_V2_TEST_CHECKLIST.md) for test checklist.
