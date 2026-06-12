# Admin, accounting, and email

Internal ops surfaces under `/admin`. Requires NextAuth (`AUTH_SECRET`, seeded admin user).

## Admin areas

| Area | Route / API | Notes |
|------|-------------|-------|
| Dashboard / orders | `app/admin/(dashboard)/orders/` | Status, costs, delivery board |
| Accounting | `app/admin/(dashboard)/accounting/` | Income, expenses, transfers, overview |
| Expenses | `app/admin/(dashboard)/expenses/` | Manual expenses + receipts |
| Products | `app/admin/(dashboard)/products/`, moderation | Publish / moderate partner products |
| Partners | `app/admin/partners/applications` | Approve applications |
| Email Control Center | `app/admin/(dashboard)/emails/` | Templates, outbox, preview, test send |
| Settings | `app/admin/(dashboard)/settings/` | Collections, config |

Admin APIs: `app/api/admin/**` — always verify session + RBAC.

## Accounting model (short)

| Concept | Meaning |
|---------|---------|
| Income record | Sale revenue — auto on paid website order or manual entry |
| Expense | Spend — manual or **auto-synced** from order Costs & Profit |
| Money location | Stripe balance, bank, cash, other — see `lib/accounting/incomeRecords.ts` |

**Synced expenses:** Saving order costs (`PATCH .../costs`) upserts `flowers` + `delivery` expense rows linked to `order_id`.

**Do not confuse:** customer `delivery_fee` (revenue) vs shop `delivery_cost` (expense).

Env: `ACCOUNTING_MANUAL_PAID_INCOME_DEFERRED` — when true, manual bank/QR mark-paid does not auto-create income.

## Email Control Center

All **automated** customer/marketing/lifecycle email must use:

1. Template in Supabase `email_templates` (`template_key`) — add via migration when new.
2. Render via `lib/email/renderTemplate.ts` with `{{brand_header}}` + `{{social_footer}}`.
3. Insert `email_outbox` row, send via `lib/email/sendOutboxEmail.ts` (`sendOutboxViaResend`).

Avoid one-off hardcoded HTML via Resend except rare admin-only operational alerts.

New template variables → update preview mocks:

- `app/api/admin/emails/preview/route.ts`
- `app/api/admin/emails/test-send/route.ts`

Order emails: `lib/orderEmail.ts`, variables from `lib/email/variablesFromOrder.ts`.

## Receipt and proof upload pipeline

**Goal:** iPhone-friendly receipt photos (~150 KB target) for Supabase free-tier storage.

| Bucket | Use |
|--------|-----|
| `receipts` | Expense receipt photos |
| `proofs` | Accounting proof images / PDFs |

**Client flow:** compress images → `multipart/form-data` POST.

| File | Role |
|------|------|
| `lib/receiptUploadLimits.ts` | `MAX_RECEIPT_UPLOAD_BYTES`, PDF caps — single source of truth |
| `lib/receiptImageCompress.ts` | Resize, JPEG ladder, HEIC (`heic2any`) |
| `lib/isReceiptImageFile.ts` | MIME empty on iOS |
| `lib/prepareProofFileForUpload.ts` | Image vs PDF for proofs |

**API enforcement (must match client caps):**

| Route | Bucket |
|-------|--------|
| `app/api/admin/expenses/[id]/receipts/route.ts` | receipts |
| `app/api/admin/expenses/upload-receipt/route.ts` | receipts |
| `app/api/admin/accounting/upload-proof/route.ts` | proofs |

**Client entry points:** `ExpenseDetailClient`, `NewExpenseForm`, `CostsAndProfitCard`, `ManualIncomeForm`, `AccountingShellClient`.

**Behaviors:**

- If `file.size <= maxBytes`, original may upload without resize (see `compressReceiptImageForUpload`).
- PDF proofs: size check only, no client compression.
- API must reject oversize even if client skips compression.

**Unrelated storage:** Vercel Blob for custom order reference images (`lib/customOrder/uploadReferenceImage.ts`); Sanity CDN for catalog images.

## RBAC

- `lib/adminRbac.ts` — role checks for sensitive admin actions.
- Audit: `lib/auditLog.ts` where wired.

## Deep dive

- [docs/ACCOUNTING_AND_EXPENSES.md](../docs/ACCOUNTING_AND_EXPENSES.md)
- [docs/ADMIN_V2_COSTS.md](../docs/ADMIN_V2_COSTS.md)
- [docs/ADMIN_V2_TEST_CHECKLIST.md](../docs/ADMIN_V2_TEST_CHECKLIST.md)
- [docs/runbooks/admin.md](../docs/runbooks/admin.md)
- [docs/NEWSLETTER_MVP.md](../docs/NEWSLETTER_MVP.md)
