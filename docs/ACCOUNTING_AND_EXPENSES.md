# Accounting, income, and expenses

Internal reference for how money-in / money-out works in **Lanna Bloom admin** (not tax or legal advice). Code paths change over time; this doc is the high-level contract staff and developers should align on.

## Related docs

- [ADMIN_V2_COSTS.md](ADMIN_V2_COSTS.md) — order **Costs & Profit** fields and PATCH API; synced expense rows from that flow.
- [ADMIN_V2_TEST_CHECKLIST.md](ADMIN_V2_TEST_CHECKLIST.md) — manual tests including costs card.
- [runbooks/admin.md](runbooks/admin.md) — admin setup and ops links.

## Concepts

| Concept | Meaning |
|--------|---------|
| **Income record** | Money received from a sale or adjustment. Created automatically when a **website order** is paid (Stripe etc.), or entered manually under Accounting → Income. |
| **Expense** | Money spent: entered on **Accounting → Expenses** or **auto-created** when saving order costs (see below). |
| **Money location (“Where the money is”)** | Buckets on the accounting overview: **Stripe balance**, **Bank account**, **Cash**, **Other**. Income is placed by payment method / money location; expenses reduce a bucket based on **expense payment method**. |

### Income → bucket (overview)

Implemented in `lib/accounting/incomeRecords.ts` (`effectiveIncomeLocation`):

- **Stripe (card/online)** → `stripe` (funds sit in Stripe until payout).
- **Cash** → `cash`.
- **Bank transfer / QR** → `bank`.
- Other manual combinations may use `money_location` → `other` when applicable.

### Expense → bucket (overview)

Same file aggregates expenses by **`expenses.payment_method`**:

- **Cash** → subtracted from the **Cash** row.
- **Bank account** (`bank_transfer`), **Card**, **QR payment** → subtracted from the **Bank account** row.
- Unknown / legacy values → treated as **bank** for aggregation.

**Important:** You cannot spend directly from the Stripe balance inside this system—record payouts via **transfers** (Accounting → Transfers) when money moves Stripe → bank. Operating costs paid from the shop bank should use **Bank account** (or QR/card) on the expense row.

### Synced vs manual expenses

**Synced from website orders (automatic)**

When staff saves **Costs & Profit** on an order (`PATCH /api/admin/orders/[order_id]/costs`), the API upserts **two** expense rows linked to `orders.order_id`:

| Category | Description pattern | Notes constant | Default `payment_method` |
|----------|---------------------|----------------|---------------------------|
| `flowers` | COGS (flowers) — order … | `Auto from order COGS` | `bank_transfer` |
| `delivery` | Delivery (driver) — order … | `Auto from order delivery cost` | `bank_transfer` |

Both represent costs typically paid via bank/transfer to suppliers or drivers. **Cash** remains available on the expense form for rare petty-cash / withdrawal spending—use it only when the payment truly left cash on hand.

**Manual**

- Any expense created from **Accounting → Expenses** (or edits to payment method on an existing row).
- **Off-website sales:** There is no checkout order. Record **one manual income** for the payment received and **one (or more) manual expenses** for COGS and other costs—same categories as above.

### Customer delivery fee vs delivery cost

- **`delivery_fee`** on the order — what the **customer** pays for delivery (revenue side).
- **`delivery_cost`** / synced **`delivery`** expense — what the shop **pays the driver** (cost). Do not confuse the two.

### Order profit card

On the order detail, **profit** is computed as roughly: total − COGS − delivery cost − payment fee (see `lib/costsUtils.ts`). That is **per-order margin**, separate from the global **net result** on the accounting overview (which uses all income and expense rows in the period).

## Files (for developers)

| Area | Location |
|------|-----------|
| Overview aggregation | `lib/accounting/incomeRecords.ts` — `getAccountingOverview` |
| Ledger rows | `lib/accounting/ledger.ts` |
| Costs PATCH + expense upsert | `app/api/admin/orders/[order_id]/costs/route.ts` |
| Sync note constants | `lib/expenses/expenseQueries.ts` — `ORDER_COSTS_FLOWERS_SYNC_NOTE`, `ORDER_COSTS_DELIVERY_SYNC_NOTE` |
| Admin help UI | `app/admin/(dashboard)/accounting/info/page.tsx` |

## Historical fix

Migration `20260503200000_delivery_expense_payment_bank_transfer.sql` sets **`payment_method = bank_transfer`** for existing auto-synced delivery rows that were stored as `cash`, so past data matches current behavior.
