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

Per-line item costs and wholesale source live on `order_items`:

| Column | Type | Description |
|--------|------|-------------|
| `cost` | numeric(12,2) | What Lanna Bloom paid for this line |
| `source_shop_id` | text | Catalog partner id (`catalog_partners.id`) |
| `source_shop_name` | text | Snapshot of the partner shop name at save time |
| `purchase_photo_path` | text | Optional ops photo of this purchase (storage path) |

`source_shop_*` is the **buy-from** shop for COGS. It is separate from `orders.confirmed_shop_id` (who prepares / picks up the order). Shop is optional so Chiang Mai cost entry is not blocked.

The item **Photo** column always shows the catalog snapshot (`image_url_snapshot`). Add / replace / remove the iPhone ops photo on **this order’s History row**. That file is stored on the line (`purchase_photo_path`) and shown in History — it does not replace the catalog image. Click either thumb to open a full-size viewer. Uploaded photos are compressed like receipts (~150 KB) and stored under `order-item-photos/` in the `receipts` bucket — not catalog product images.

**History** lists paid, non-cancelled purchases of the same catalog product (`bouquet_id`), same size first. After you save a line cost, this order is included and labeled **This order**. History is item-level `order_items.cost` (Extra costs **COGS (฿)** alone on a multi-item order does not create a row).

## Migration

If columns are missing, run in Supabase SQL Editor:

```sql
-- See supabase/migrations/20250218000000_add_order_cost_columns.sql
-- Per-item source shop: supabase/migrations/20260821120000_order_items_source_shop.sql
-- Per-item purchase photo: supabase/migrations/20260821130000_order_items_purchase_photo.sql
```

## API

**PATCH** `/api/admin/orders/[order_id]/costs`

- **Auth:** Admin session (`OWNER` or `MANAGER`)
- **Body:** `{ cogs_amount?: number | null, delivery_cost?: number | null, payment_fee?: number | null, item_costs?: Array<{ id, cost, source_shop_id? }> }`
- **Validation:** Cost numeric >= 0, max 2 decimal places. `source_shop_id` must be a catalog partner id or empty/null (clears the shop). Shop name is snapshotted server-side from `catalog_partners`.

**GET** `/api/admin/orders/item-purchase-history?bouquet_id=&size=&current_order_id=`

- Paid `order_items.cost` for the same catalog id (same size first), including the current order after its line cost is saved.
- Shop = item `source_shop_*` when set, else the order’s confirmed supplier.
- Ops photo signed URL is returned on each row when `purchase_photo_path` is set.

**POST / GET / DELETE** `/api/admin/orders/[order_id]/items/[item_id]/purchase-photo`

- Attach, view (signed URL), or remove the ops photo for that line.
- Auth: `OWNER` or `MANAGER`. Max size matches receipt uploads.

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
