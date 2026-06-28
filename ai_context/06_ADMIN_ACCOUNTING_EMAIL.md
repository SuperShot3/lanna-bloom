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
| Marketing | `app/admin/(dashboard)/marketing/` | Google Ads insights, **Diagnostics** (orders vs GA4 vs Ads), funnel, recommendations, Campaign Builder |

Admin APIs: `app/api/admin/**` — always verify session + RBAC.

## Marketing Campaign Builder

Owner-only workflow at `/admin/marketing` → **Campaign Builder** tab:

1. Describe campaign in natural language (English Search only).
2. Answer follow-up questions (territory, budget, `/en/` landing page).
3. Review generated draft: keyword groups, negative keywords, ad copy.
4. Validate / dry run → create **paused** Search campaign in Google Ads.

Server modules: `lib/marketing/campaignBuilder/`  
APIs: `app/api/admin/marketing/campaign-drafts/*`, `app/api/admin/marketing/assets`  
Storage: `marketing_campaign_drafts` (service_role only; migration `20260628120000_marketing_campaign_drafts.sql`)

Safety: English-only copy/keywords, max daily budget (`CAMPAIGN_BUILDER_LIMITS`), owner-only mutations, audit via `marketing_apply_audit`.

## Marketing Diagnostics

Default tab at `/admin/marketing` → **Diagnostics**:

- **Reality check** — Supabase paid orders + revenue, GA4 purchases, Google Ads conversions, ad spend/clicks side-by-side.
- **Verdict** — rule-based diagnosis (tracking broken, checkout friction, paid underperforms, etc.) with next-step bullets.
- **Tracking health** — GA4 funnel zeros, purchase vs order alignment, Ads vs GA4 cross-check.

API: `GET /api/admin/marketing/diagnostics?days=14`  
Server: `lib/marketing/diagnostics.ts` (`buildDiagnosticsVerdict`, `fetchDiagnosticsReport`)

Funnel tab adds full checkout steps (`view_item` … `purchase`), step conversion rates, and paid landing pages from GA4. Ads tab shows ad groups, impressions, avg CPC, and a waste filter (spend with 0 conversions). Recommendations include funnel-leak rules when GA4 data is available.

Before trusting diagnostics in production, verify GTM purchase trigger, GA4 key events, and Ads conversion linking — see `docs/ANALYTICS_GA4.md` § Using admin Diagnostics.

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
