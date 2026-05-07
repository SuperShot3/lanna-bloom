# Security Audit — Lanna Bloom

Defensive audit based on **local codebase inspection only** (no runtime tests, no payments, no destructive actions). Framework: **Next.js App Router** (`app/`). Routing: file-based routes + `middleware.ts` matcher for `/admin`. Admin authentication: **NextAuth** (`auth.ts`) with credentials against Supabase `admin_users`. Partner area: **Supabase Auth** (anon key + cookie session) in `lib/supabase/partnerAuthServer.ts` / `partnerAuth.ts`, plus Sanity-backed partner documents under `app/[lang]/partner/`. Primary order store: **Supabase** via service role in `lib/supabase/server.ts` (`getSupabaseAdmin`).

**Review note:** Issue blocks below were re-checked against the current repository (code-only). Each finding includes a **Status** (`OPEN`, `FIXED`, `PARTIALLY FIXED`, `NEEDS MANUAL TEST`, `UNCLEAR`).

## Project Map

| Area | Key paths |
|------|-----------|
| Framework / routing | `app/`, `middleware.ts`, `next.config.js` |
| API routes | `app/api/**/route.ts` (51 route modules) |
| Admin UI | `app/admin/**`, `app/api/admin/**` |
| Checkout / orders | `lib/checkout/`, `lib/orders/`, `app/api/orders/`, `app/api/stripe/`, `app/order/[orderId]/` |
| Stripe | `lib/stripe/server.ts`, `lib/stripePricing.ts`, `app/api/stripe/*/route.ts`, `lib/checkout/fulfillStripeCheckout.ts` |
| Supabase | `lib/supabase/server.ts`, `lib/supabase/adminQueries.ts`, `lib/orders/supabaseStore.ts`, `supabase/migrations/` |
| Auth / RBAC | `auth.ts`, `lib/adminRbac.ts` (`requireAuth`, `requireRole`) |
| Uploads / storage | `app/api/admin/expenses/upload-receipt/route.ts`, `app/api/admin/accounting/upload-proof/route.ts`, `lib/customOrder/uploadReferenceImage.ts`; buckets defined in migrations (e.g. `receipts`, `proofs`) |
| Email / templates | `lib/orderEmail.ts`, `lib/email/` (e.g. `outbox.ts`, `reminderCron.ts`), `supabase/migrations/*email*` |
| Partner dashboard | `app/[lang]/partner/**`, `lib/supabase/partnerAuth*.ts`, Sanity product/bouquet flows under partner paths |
| CMS | `sanity/`, `app/studio/[[...index]]/page.tsx`, `lib/sanity.ts` |

---

## Resolved Issues

*(No items moved here: none of the previously documented Critical/High findings are fully remediated in the current codebase as of this review.)*

---

## Critical Issues

### 1. Customer order page exposes full order by URL alone (IDOR)

- **Problem:** The server component loads the complete order with the service-role data path **without** requiring `public_token` in the URL or any ownership check.
- **Why it is dangerous:** Anyone who knows or guesses an `order_id` can view PII (names, phones, address, items, messages, pricing) in the HTML response.
- **File path:** `app/order/[orderId]/page.tsx`
- **Exact code area:** `const order = await getOrderById(normalized);` (uses `lib/orders/router.ts` → `supabaseStore.supabaseGetOrderById` with `getSupabaseAdmin()`).
- **Suggested fix:** Resolve the order only after validating `searchParams.token` against `orders.public_token`, or use exclusively `getOrderByIdWithPublicToken` when `public_token` is set on the row; return 404 for missing/invalid token. Align with `app/api/orders/[orderId]/route.ts`, which already enforces a token for full detail.
- **How to test locally:** With a known `orderId` and its `public_token`, open `/order/<orderId>` without `?token=`; it should return 404. Then open `/order/<orderId>?token=<public_token>`; it should render.

### Status: FIXED

**Fix summary:** `app/order/[orderId]/page.tsx` now requires a valid `?token=<public_token>` and uses `getOrderByIdWithPublicToken(orderId, token)` only. Any missing/empty/invalid token (or mismatch) returns a 404 via `notFound()` so PII is never rendered on `/order/<orderId>` without the secret token.

**Exact files changed:**
- `app/order/[orderId]/page.tsx`
- `app/api/stripe/order-status/route.ts`
- `app/api/stripe/create-checkout-session-for-order/route.ts`
- `app/api/admin/orders/[order_id]/mark-paid/route.ts`
- `app/admin/(dashboard)/orders/[order_id]/page.tsx`
- `app/[lang]/checkout/complete/CheckoutCompleteClient.tsx`
- `app/[lang]/checkout/confirmation-pending/ConfirmationPendingClient.tsx`
- `app/[lang]/checkout/confirmation-pending/page.tsx`
- `app/[lang]/cart/CartPageClient.tsx`
- `app/[lang]/custom-order/CustomOrderPageClient.tsx`
- `components/OrderPendingConfirmation.tsx`
- `lib/stripe/postStripePaymentSuccess.ts`
- `lib/orderNotification.ts`
- `lib/orderEmail.ts`
- `lib/email/outbox.ts`
- `lib/email/variablesFromOrder.ts`

**Local test steps (no payments needed):**
- With a real existing `orderId` and its `public_token` from Supabase:
  - Visit `http://localhost:3000/order/<orderId>` → **returns 404** (no UI, no PII).
  - Visit `http://localhost:3000/order/<orderId>?token=<public_token>` → **order page renders normally**.
- Re-check customer journeys that navigate to the order page:
  - Checkout complete redirect now includes `?token=<public_token>`.
  - Email links generated after payment success now include `?token=<public_token>`.

**Behavior change:** `/order/<orderId>` without `?token=` now returns **404**.

---

### 2. Order lookup API returns `public_token` to anonymous clients

- **Problem:** `supabaseLookupOrdersByPhone` and `supabaseLookupOrdersByOrderId` select `public_token` and the API returns it as `orderToken`. The cart UI builds links: `/order/<id>?token=<orderToken>`.
- **Why it is dangerous:** Combined with weak knowledge (phone digits, or partial order id like `LB-2026`), an attacker obtains the secret token and gains the same access as the customer to the full order page (especially critical while issue #1 exists).
- **File paths:** `lib/orders/supabaseStore.ts` (`supabaseLookupOrdersByPhone`, `supabaseLookupOrdersByOrderId`), `app/api/orders/lookup/route.ts`, `components/OrderLookupSection.tsx` (links with `order.orderToken`).
- **Suggested fix:** Do not return `public_token` from the lookup API. Instead require a second factor (e.g. OTP to phone/email, or exact order id + verified email) before issuing a one-time link or session. Alternatively, return only non-sensitive status and require token from the original confirmation email.
- **How to test locally:** POST `/api/orders/lookup` with a test phone or partial order id; inspect JSON for `orderToken`.

### Status: OPEN

**Evidence:**
- **Files checked:** `lib/orders/supabaseStore.ts`, `components/OrderLookupSection.tsx`
- **Functions checked:** `supabaseLookupOrdersByPhone`, `supabaseLookupOrdersByOrderId` — `.select('... public_token')` and map to `orderToken` (lines ~701–731, ~748–772); `OrderLookupSection` still builds `?token=` links (lines ~176–181).
- **What the code currently does:** Returns secret token to the browser after lookup; UI embeds it in URLs.
- **Why this status was chosen:** Unchanged from prior audit.

**Next action:** Remove `public_token` from select and response types; stop appending `token` in `OrderLookupSection` (or replace with server-issued signed short-lived link). Smallest incremental fix: omit `orderToken` from JSON and links; users rely on email link only.

**How to test on localhost:3000:** `POST http://localhost:3000/api/orders/lookup` with JSON `{"phone":"<digits>"}` or `{"orderId":"LB-…"}`; confirm response still contains `orderToken` on each hit.

---

### 3. `POST /api/orders` trusts client-supplied line item prices

- **Problem:** Validation recomputes `itemsTotal` from each item’s `price` field coming from the client (`validatePayload` in `app/api/orders/route.ts`).
- **Why it is dangerous:** An attacker can set arbitrary low prices; `grandTotal` and stored order pricing follow those values. Downstream flows that trust stored totals (e.g. pay-by-link for existing orders) can charge the wrong amount.
- **File path:** `app/api/orders/route.ts` — `itemsFromPayload` / `items.map` pricing and `payload.pricing` construction.
- **Suggested fix:** Reuse the same server-side catalog pricing as Stripe checkout (`computeOrderTotals` in `lib/stripePricing.ts` or equivalent) keyed by catalog ids/sizes/add-ons; reject mismatches between client hints and server prices.
- **How to test locally:** POST an order with a valid catalog item id but `price: 1` and confirm persisted `grand_total` / items reflect 1 THB.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/orders/route.ts`
- **Function checked:** `validatePayload` — `itemsFromPayload` uses `typeof i.price === 'number' ? i.price : 0` (lines ~171–175); `itemsTotal` and `payload.pricing` (lines ~252–256) derive from those client prices.
- **What the code currently does:** Server trusts per-item `price` from JSON for totals; catalog refs are validated but not repriced server-side.
- **Why this status was chosen:** No server-side repricing hook was added.

**Next action:** After `validateCatalogItemRef`, resolve official unit prices (same as `computeOrderTotals` / Sanity) and overwrite `price` on each line; 400 on mismatch if you want strict client/server parity.

**How to test on localhost:3000:** Send `POST http://localhost:3000/api/orders` with a valid item and `"price": 1`; inspect DB or response `orderId` row for `grand_total` reflecting the tampered total.

---

### 4. Pay-for-order session creation has no customer proof of ownership

- **Problem:** `POST /api/stripe/create-checkout-session-for-order` accepts `orderId` from the body, loads the order via `getOrderById`, and creates a Stripe Checkout Session.
- **Why it is dangerous:** Without a token or session binding, anyone can initiate checkout for another customer’s **unpaid** order (harassment, probing payment state, or locking idempotency keys depending on Stripe behavior).
- **File path:** `app/api/stripe/create-checkout-session-for-order/route.ts` (`POST`, body `orderId`).
- **Suggested fix:** Require `public_token` (or signed JWT) in the body or header matching `orders.public_token`, or bind to an authenticated customer session.
- **How to test locally:** Call the endpoint with a known unpaid `orderId` without being the customer; observe `url` in response.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/stripe/create-checkout-session-for-order/route.ts`
- **Route checked:** `POST` — parses `body.orderId` only (lines ~27–37); loads order via `getOrderById(orderId)` (line 41); no `token` field.
- **What the code currently does:** Creates a Checkout Session for any existing unpaid order id supplied by the client.
- **Why this status was chosen:** No ownership secret was added.

**Next action:** Require `publicToken` in body, compare to `getOrderPublicToken(orderId)` or DB row; reject on mismatch.

**How to test on localhost:3000:** `POST http://localhost:3000/api/stripe/create-checkout-session-for-order` with `{"orderId":"<unpaid LB id>"}` only; if Stripe is configured, response may still include `url`.

---

### 5. `GET /api/stripe/order-status` can return the full `order` object

- **Problem:** For paid/failed states the handler returns `NextResponse.json({ status, order, orderId })` where `order` is the full `Order` from `getOrderById`.
- **Why it is dangerous:** Anyone who obtains a Checkout `session_id` (referrer leak, shared link, browser history) can fetch rich PII from your API without an order token.
- **File path:** `app/api/stripe/order-status/route.ts` (branch around `status === 'paid' || status === 'payment_failed'`).
- **Suggested fix:** Return only non-sensitive fields needed for the success UI, or require order token / session cookie; never return full `Order` to anonymous callers.
- **How to test locally:** Call with a valid `session_id` after a test payment (do not run real payments if avoiding Stripe charges); inspect JSON for nested PII.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/stripe/order-status/route.ts`
- **Route checked:** `GET` — when `status === 'paid' || status === 'payment_failed'`, returns `{ status, order, orderId }` (lines 97–98); `order` comes from `getOrderById(orderId)` (line 77).
- **What the code currently does:** Exposes full order object to unauthenticated callers holding `session_id`.
- **Why this status was chosen:** Response shape unchanged.

**Next action:** Replace `order` with a DTO (e.g. `orderId`, `fulfillmentStatus`, item titles only) or require `Authorization` / signed cookie.

**How to test on localhost:3000:** After a **test-mode** checkout you already completed in dev, `GET http://localhost:3000/api/stripe/order-status?session_id=cs_test_...` and confirm whether fields like `phone`, `address` appear under `order`.

---

### 6. Sensitive Supabase tables without RLS in migrations (verify production)

- **Problem:** Migrations create `checkout_drafts` (`supabase/migrations/20260410120000_checkout_drafts.sql`) and email/reminder tables (`20260425120000_email_control_center.sql`: `email_templates`, `email_outbox`, `customer_reminders`, `reminder_email_logs`) **without** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in-repo.
- **Why it is dangerous:** If the Supabase project grants `SELECT`/`INSERT` to `anon` or `authenticated` on these tables (misconfiguration), **checkout draft payloads (pre-payment PII)** or **email bodies** could be exposed or tampered via PostgREST.
- **File paths:** Migrations above; app access via `lib/checkout/checkoutDrafts.ts` and admin email routes.
- **Suggested fix:** Enable RLS on these tables with **no** anon policies (service role only), matching `expenses` / `income_records` pattern. Confirm grants in Supabase Dashboard.
- **How to test locally:** In Supabase SQL: `\d+ checkout_drafts` / check “RLS enabled” and policy list for `anon`.

### Status: UNCLEAR

**Evidence:**
- **Files checked:** `supabase/migrations/20260410120000_checkout_drafts.sql`, `supabase/migrations/20260425120000_email_control_center.sql`, and `grep` across `supabase/migrations/*.sql` for `ENABLE ROW LEVEL` on `checkout_drafts`, `email_outbox`, `email_templates`, `customer_reminders`, `reminder_email_logs`.
- **Function / route checked:** N/A (DDL); app writes via `getSupabaseAdmin()` in `lib/checkout/checkoutDrafts.ts` etc.
- **What the code currently does:** Repo migrations **create** those tables but **do not** include `ALTER TABLE … ENABLE ROW LEVEL SECURITY` for them (unlike `expenses`, `orders`, etc.).
- **Why this status was chosen:** The **repository** does not prove production is locked down; RLS or revoked grants may have been applied manually in Supabase without a migration here.

**Next action:** In Supabase Dashboard (or `supabase db pull`), confirm RLS enabled and no broad `anon` policies. If missing, add a migration enabling RLS with zero public policies.

**How to test on localhost:3000:** N/A for Next app; use Supabase SQL editor against your **local** or **staging** project to inspect `pg_policies` / table RLS flags.

---

## High Issues

### Unauthenticated admin notification trigger (spam / noise)

- **Problem:** `POST /api/orders/[orderId]/notify-admin` has no auth; it calls `sendAdminNewOrderNotificationOnce(orderId)`.
- **Path:** `app/api/orders/[orderId]/notify-admin/route.ts`
- **Risk:** Email/workflow spam and resource abuse for arbitrary order IDs.
- **Fix:** Require `public_token` or rate-limit aggressively per IP + orderId and sign internal calls from your own frontend.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/orders/[orderId]/notify-admin/route.ts`
- **Route checked:** `POST` — only validates `orderId` param; calls `sendAdminNewOrderNotificationOnce(normalized)` with no auth (lines 14–21).
- **What the code currently does:** Any client can trigger the notification pipeline for any order id.
- **Why this status was chosen:** No shared secret, token, or session check added.

**Next action:** Require body/header `token` matching `public_token` for that order, or restrict to same-origin signed request from checkout completion page.

**How to test on localhost:3000:** `POST http://localhost:3000/api/orders/notify-admin/<anyExistingOrderId>` with empty body; observe `200` and logs/email side effects if configured.

---

### Reviews API inserts approved reviews with service role

- **Problem:** `app/api/reviews/route.ts` inserts into `customer_reviews` with `status: 'approved'` using `getSupabaseAdmin()`, bypassing the intended “pending” moderation flow in RLS policies.
- **Risk:** Spam, reputational damage, stored XSS if any consumer ever renders HTML unsafely (current React text rendering in `components/reviews/ReviewCard.tsx` escapes).
- **Fix:** Insert as `pending`; moderate in admin. Add CAPTCHA or proof of purchase.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/reviews/route.ts`
- **Function checked:** `POST` — `.insert({ name, comment, status: 'approved', rating: 5 })` (lines 46–48).
- **What the code currently does:** Immediately approves every submitted review via service role.
- **Why this status was chosen:** Insert payload unchanged.

**Next action:** Set `status: 'pending'` and surface moderation in `app/api/admin/reviews/*`.

**How to test on localhost:3000:** `POST http://localhost:3000/api/reviews` with JSON `{"name":"t","comment":"t"}`; check `customer_reviews` row `status` is `approved`.

---

### Admin UI gated only by login, not by role

- **Problem:** `middleware.ts` redirects unauthenticated users but does **not** enforce `OWNER` / `MANAGER` / `SUPPORT` per route.
- **Risk:** A `SUPPORT` user can load admin pages; combined with endpoints that only use `requireAuth`, they may perform sensitive reads.
- **Path:** `middleware.ts`; compare with `lib/adminRbac.ts` `requireRole`.

### Status: OPEN

**Evidence:**
- **File checked:** `middleware.ts`
- **Function checked:** Default `auth()` wrapper — only tests `req.auth?.user` for `/admin` paths (lines 13–16); no `role` checks.
- **What the code currently does:** Any authenticated admin user can load any `/admin/**` HTML route; API may still 403.
- **Why this status was chosen:** No role-based matcher added.

**Next action:** Extend middleware (or per-layout checks) to deny `SUPPORT` for accounting routes, or use Next.js route groups + `requireRole` in layouts.

**How to test on localhost:3000:** Sign in as a user with `SUPPORT` role in `admin_users`; browse `/admin` sections and note which pages render before API calls fail.

---

### CSV export allowed for any logged-in admin role

- **Problem:** `app/api/admin/orders/export/route.ts` uses `requireAuth()` only, not `requireRole`.
- **Risk:** `SUPPORT` accounts can export full customer PII CSV (see `getOrdersForExport` usage).
- **Fix:** `requireRole(['OWNER', 'MANAGER'])` or narrower.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/admin/orders/export/route.ts`
- **Route checked:** `GET` — `const authResult = await requireAuth();` (lines 15–17); no `requireRole`.
- **What the code currently does:** Any session from `admin_users` (any role) can export CSV after login.
- **Why this status was chosen:** Still `requireAuth`-only.

**Next action:** Replace with `requireRole(['OWNER', 'MANAGER'])`.

**How to test on localhost:3000:** As SUPPORT user, `GET http://localhost:3000/api/admin/orders/export` with session cookie; confirm whether CSV still downloads.

---

### Stripe webhook idempotency weak when DB insert fails

- **Problem:** `recordStripeEventIfNew` in `app/api/stripe/webhook/route.ts` returns `true` on non-unique violations (continues processing) and on thrown errors (`catch` returns `true`).
- **Risk:** Duplicate processing / duplicate side effects if `stripe_events` insert fails for transient reasons.
- **Fix:** On ambiguous errors, return 500 so Stripe retries; only skip when `23505` confirms duplicate.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/stripe/webhook/route.ts`
- **Function checked:** `recordStripeEventIfNew` (lines 54–71) — on insert `error` where `error.code !== '23505'`, logs and **returns `true`** (line 65); `catch` returns `true` (line 70); if `!supabase` returns `true` (line 56).
- **What the code currently does:** Proceeds with payment side effects even when idempotency row could not be claimed (except duplicate key).
- **Why this status was chosen:** Logic matches original audit.

**Next action:** On non-`23505` errors, return `500` from `POST` handler so Stripe retries; only return `200` after successful insert or confirmed duplicate.

**How to test on localhost:3000:** **NEEDS MANUAL TEST** — simulate `stripe_events` insert failure (e.g. revoke table permission temporarily in a dev DB) and replay the same event id; observe double fulfillment. *(Do not run against production.)*

---

## Medium Issues

### Custom-order reference image: public blob, loose content typing

- **Problem:** `lib/customOrder/uploadReferenceImage.ts` uploads to Vercel Blob with `access: 'public'` and `contentType: file.type || 'application/octet-stream'`; `app/api/custom-order/route.ts` only enforces 4 MB, not allowed MIME types.
- **Risk:** Hosting unexpected content at a public URL (e.g. misleading downloads). Lower XSS risk to your origin if URLs are only used as links/images with correct handling.
- **Fix:** Allowlist image MIME types; optionally serve via signed URLs or your CDN with `Content-Disposition: attachment` for non-images.

### Status: OPEN

**Evidence:**
- **Files checked:** `lib/customOrder/uploadReferenceImage.ts`, `app/api/custom-order/route.ts`
- **Functions checked:** `uploadCustomOrderReferenceImage`, `POST` handler — size check only for reference file (lines ~182–184 in `route.ts`); `put(..., { contentType: file.type || 'application/octet-stream' })` in upload helper.
- **What the code currently does:** Public blob URLs with client-supplied `Content-Type`; no MIME allowlist on custom-order route.
- **Why this status was chosen:** Unchanged.

**Next action:** Reject if `file.type` not in `image/jpeg`, `image/png`, etc., before `uploadCustomOrderReferenceImage`.

**How to test on localhost:3000:** Submit custom-order form with a non-image file renamed to `.jpg` and inspect Blob URL response headers/content.

---

### `GET /api/orders/[orderId]` metadata leak without token

- **Problem:** Without token, the API still returns payment/fulfillment fields (`privacyLimited: true` but exposes `payment_status`, etc.).
- **Path:** `app/api/orders/[orderId]/route.ts`
- **Fix:** Return generic “not found” or minimal public state without token.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/orders/[orderId]/route.ts`
- **Route checked:** `GET` — branch `if (!orderToken)` returns JSON including `payment_status`, `payment_method`, `paid_at`, `fulfillmentStatus` (lines 34–63).
- **What the code currently does:** Confirms order existence and exposes payment/fulfillment metadata without token.
- **Why this status was chosen:** Still returns those fields; not reduced to generic 404.

**Next action:** Return 404 without valid token, or only a boolean `exists` without payment fields.

**How to test on localhost:3000:** `GET http://localhost:3000/api/orders/<orderId>` with no `token` query; inspect JSON keys.

---

### `POST /api/stripe/sync-checkout-session` is public

- **Problem:** Any client with a valid `sessionId` can trigger fulfillment.
- **Risk:** Low if `session_id` stays secret; increases impact if leaked.
- **Fix:** Optional HMAC or short-lived nonce tied to checkout start.

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/stripe/sync-checkout-session/route.ts` (verified: no `requireAuth`; reads `sessionId` from JSON and calls Stripe + `fulfillPaidStripeCheckoutSession`).
- **Route checked:** `POST` — public.
- **What the code currently does:** Fulfillment sync for anyone who knows a paid session id.
- **Why this status was chosen:** By design for post-redirect; no extra binding added.

**Next action:** Optional signed body or server-stored nonce issued at session creation.

**How to test on localhost:3000:** With a valid `cs_test_...` session id from dev checkout, `POST /api/stripe/sync-checkout-session` from `curl` without cookies; confirm `200` and side effects.

---

### Sanity Studio mounted at `/studio` without Next middleware protection

- **Problem:** `middleware.ts` only matches `/admin`. `/studio` is public; access still depends on Sanity’s own login.
- **Path:** `app/studio/[[...index]]/page.tsx`, `sanity.config.ts`
- **Fix:** Optional: restrict `/studio` by IP, Basic Auth, or Vercel protection.

### Status: OPEN

**Evidence:**
- **Files checked:** `middleware.ts` (matcher only `/admin`), `app/studio/[[...index]]/page.tsx` (renders `<Studio />` without app-level gate).
- **What the code currently does:** `/studio` reachable without Next.js auth layer.
- **Why this status was chosen:** No middleware extension for `/studio`.

**Next action:** Add `/studio` to middleware with Basic Auth env or Vercel password protection.

**How to test on localhost:3000:** Open `http://localhost:3000/studio` logged out; Studio loads (Sanity login may still apply).

---

### No security headers in Next config

- **Problem:** `next.config.js` defines redirects/rewrites/images but no `headers()` for CSP, HSTS, etc.
- **Path:** `next.config.js`

### Status: OPEN

**Evidence:**
- **File checked:** `next.config.js` — exports `redirects`, `rewrites`, `experimental`, `images`; **no** `async headers()`.
- **What the code currently does:** App does not define CSP, `X-Frame-Options`, etc., in Next config.
- **Why this status was chosen:** Confirmed by file read.

**Next action:** Add `headers()` in `next.config.js` (and/or rely on Vercel `vercel.json` headers) for baseline security headers.

**How to test on localhost:3000:** `curl -I http://localhost:3000/en` and confirm absence of `Content-Security-Policy` etc. from the app (Vercel prod may differ).

---

### `next.config.js` `images.remotePatterns` allows any host

- **Problem:** `hostname: '**'` for http/https.
- **Risk:** If user-controlled image URLs reach `next/image`, this widens attack surface (SSRF-style fetches are mitigated by Next but still broad).
- **Path:** `next.config.js`

### Status: OPEN

**Evidence:**
- **File checked:** `next.config.js` lines 52–57 — `remotePatterns` includes `{ protocol: 'https', hostname: '**' }` and `{ protocol: 'http', hostname: '**' }`.
- **What the code currently does:** Allows `next/image` optimization for any remote host matching those patterns.
- **Why this status was chosen:** Broad wildcard still present.

**Next action:** Restrict to `cdn.sanity.io` and other known CDNs actually used in production.

**How to test on localhost:3000:** Grep codebase for `next/image` `src` props that might be user-controlled; attempt rendering with an arbitrary external URL if such a code path exists.

---

## Low Issues

### `GET /api/health/orders` exposes recent order ids when enabled

- **Path:** `app/api/health/orders/route.ts`

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/health/orders/route.ts` — when `NODE_ENV === 'development'` or `HEALTH_CHECK_ENABLED === 'true'`, selects `order_id, payment_status, paid_at` (lines ~24–28).
- **What the code currently does:** Returns recent order identifiers in JSON for health checks.
- **Why this status was chosen:** Behavior unchanged; acceptable in dev but risky if flag enabled in shared staging.

**Next action:** Keep disabled in production; scrub ids from response or require admin auth.

**How to test on localhost:3000:** `GET http://localhost:3000/api/health/orders` in development; confirm `order_id` values in JSON.

---

### `POST /api/newsletter` returns subscriber `id`

- **Path:** `app/api/newsletter/route.ts`

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/newsletter/route.ts` — success response includes `id: data?.id` (lines ~106–110).
- **What the code currently does:** Leaks internal UUID/row id to the client on subscribe.
- **Why this status was chosen:** Still returned.

**Next action:** Omit `id` from JSON or return only `success: true`.

**How to test on localhost:3000:** `POST /api/newsletter` with new email; inspect JSON for `id`.

---

### `GET /api/stripe/webhook` informational response

- **Path:** `app/api/stripe/webhook/route.ts`

### Status: OPEN

**Evidence:**
- **File checked:** `app/api/stripe/webhook/route.ts` — `GET()` returns JSON explaining POST+signing (lines ~81–85).
- **What the code currently does:** Public GET with low-sensitivity message.
- **Why this status was chosen:** Disclosure is minimal; still explicitly public.

**Next action:** Optional: return `404` for GET in production to reduce fingerprinting.

**How to test on localhost:3000:** `GET http://localhost:3000/api/stripe/webhook`.

---

## Safe / Looks Good

- **Stripe Checkout (cart flow):** `app/api/stripe/create-checkout-session/route.ts` validates payload, runs `computeOrderTotals` (`lib/stripePricing.ts`), recomputes referral/welcome discounts server-side, and builds Stripe line items from server totals — **does not trust client totals** for that path.
- **Webhook signature:** `app/api/stripe/webhook/route.ts` uses `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`; rejects missing signature.
- **Paid marking:** `lib/checkout/fulfillStripeCheckout.ts` returns `pending_payment` until `session.payment_status === 'paid'` or PaymentIntent succeeded; `markOrderPaidFromSession` runs only after that.
- **Cron route:** `app/api/cron/send-reminders/route.ts` checks `CRON_SECRET` via `Authorization: Bearer` or `x-cron-secret`.
- **Admin API pattern:** Most `app/api/admin/**` routes use `requireAuth` or `requireRole` from `lib/adminRbac.ts` with explicit roles (e.g. `OWNER`-only delete order).
- **Order token client for RLS:** `createSupabaseAnonWithOrderToken` in `lib/supabase/server.ts` sets `x-order-token` for token-scoped reads; aligns with `20260420133000_orders_rls_token_access.sql`.
- **Accounting/expense tables:** Migrations enable RLS with no anon policies for `expenses`, `income_records`, `accounting_transfers`, etc. (service role only).
- **Receipt upload:** `app/api/admin/expenses/upload-receipt/route.ts` enforces MIME allowlist and 500 KB limit; storage bucket migration marks `receipts` private with signed URL expectation.
- **Admin order emails:** `lib/orderEmail.ts` uses `escapeHtml` for dynamic fragments (e.g. `cardMessage`).

---

## API Route Inventory

Route-level remediation status is tracked in **Critical / High / Medium** sections above. Risk labels in the table describe original exposure, not post-fix state.

| Route | File path | Purpose | Auth required | Admin required | Risk level | Notes |
|-------|-----------|---------|---------------|----------------|------------|-------|
| GET/POST | `app/api/auth/[...nextauth]/route.ts` | NextAuth | Public | No | Low | Session for admin |
| POST | `app/api/newsletter/route.ts` | Subscribe | Public | No | Medium | Honeypot; returns row `id` |
| POST | `app/api/orders/route.ts` | Create order (legacy/catalog) | Public | No | **Critical** | Client-priced items |
| POST | `app/api/orders/lookup/route.ts` | Lookup orders by phone/id | Public | No | **Critical** | Returns `orderToken` |
| GET | `app/api/orders/[orderId]/route.ts` | Order JSON for UI | Public | No | High | Full order needs token; some leak without |
| POST | `app/api/orders/[orderId]/notify-admin/route.ts` | Trigger admin notify | Public | No | High | No auth |
| GET | `app/api/bouquets/route.ts` | Paginated catalog JSON | Public | No | Low | Sanity read |
| POST | `app/api/custom-order/route.ts` | Custom order + optional image | Public | No | Medium | Public blob upload |
| POST | `app/api/important-dates/route.ts` | Save reminder signup | Public | No | Medium | Inserts `customer_reminders` via service role |
| POST | `app/api/reviews/route.ts` | Submit review | Public | No | High | Auto-`approved` |
| POST | `app/api/stripe/create-checkout-session/route.ts` | Stripe session (cart) | Public | No | Low–Med | Server-priced; strong validation |
| POST | `app/api/stripe/create-checkout-session-for-order/route.ts` | Stripe session (existing order) | Public | No | **Critical** | No ownership proof |
| POST | `app/api/stripe/sync-checkout-session/route.ts` | Post-redirect fulfill | Public | No | Medium | Needs `sessionId` |
| GET | `app/api/stripe/order-status/route.ts` | Poll session + order | Public | No | **Critical** | Can return full `order` |
| POST | `app/api/stripe/webhook/route.ts` | Stripe webhooks | Public (verified by signature) | No | Low | Signature required |
| GET | `app/api/health/orders/route.ts` | DB smoke test | Public when enabled | No | Low–Med | Order ids in dev/flag |
| GET | `app/api/cron/send-reminders/route.ts` | Reminder cron | Secret header | No | Low | `CRON_SECRET` |
| GET | `app/api/admin/verify-supabase/route.ts` | Dev parity check | Yes | Any admin | Medium | `requireAuth` |
| GET | `app/api/admin/orders/export/route.ts` | CSV export | Yes | **Any role** | High | Should be restricted |
| GET | `app/api/admin/orders/missing-cogs/route.ts` | COGS report | Yes | OWNER/MANAGER | Low | `requireRole` |
| PATCH | `app/api/admin/orders/[order_id]/status/route.ts` | Order status | Yes | OWNER/MANAGER | Low | Audit log |
| PATCH | `app/api/admin/orders/[order_id]/fulfillment-status/route.ts` | Fulfillment | Yes | OWNER/MANAGER | Low | |
| PATCH | `app/api/admin/orders/[order_id]/payment-status/route.ts` | Payment flags | Yes | OWNER/MANAGER | Low | |
| PATCH | `app/api/admin/orders/[order_id]/mark-paid/route.ts` | Mark paid manual | Yes | OWNER/MANAGER | Medium | |
| PATCH | `app/api/admin/orders/[order_id]/costs/route.ts` | Order costs | Yes | OWNER/MANAGER | Medium | |
| DELETE | `app/api/admin/orders/[order_id]/remove/route.ts` | Remove order | Yes | OWNER only | Medium | |
| GET/POST | `app/api/admin/expenses/route.ts` | List/create expenses | Yes | OWNER/MANAGER | Low | |
| GET/PATCH/DELETE | `app/api/admin/expenses/[id]/route.ts` | Expense CRUD | Yes | OWNER/MANAGER | Low | |
| POST | `app/api/admin/expenses/upload-receipt/route.ts` | Upload receipt | Yes | OWNER/MANAGER | Low | Typed + size limit |
| GET | `app/api/admin/expenses/[id]/receipt-url/route.ts` | Signed URL | Yes | OWNER/MANAGER | Low | |
| GET/POST | `app/api/admin/expenses/[id]/receipts/route.ts` | Multi receipt | Yes | OWNER/MANAGER | Low | |
| DELETE | `app/api/admin/expenses/[id]/receipts/[receiptId]/route.ts` | Delete receipt | Yes | OWNER/MANAGER | Low | |
| POST | `app/api/admin/expenses/[id]/paper-bill-request/route.ts` | PDF request | Yes | OWNER/MANAGER | Low | |
| GET/POST | `app/api/admin/accounting/overview/route.ts` | Accounting overview | Yes | OWNER/MANAGER | Low | |
| GET/POST | `app/api/admin/accounting/income/route.ts` | Income list/create | Yes | OWNER/MANAGER | Low | |
| GET/PATCH/DELETE | `app/api/admin/accounting/income/[id]/route.ts` | Income record | Yes | OWNER/MANAGER | Low | |
| GET | `app/api/admin/accounting/income/[id]/proof-url/route.ts` | Proof URL | Yes | OWNER/MANAGER | Low | |
| POST | `app/api/admin/accounting/upload-proof/route.ts` | Upload proof | Yes | OWNER/MANAGER | Low | |
| POST | `app/api/admin/accounting/backfill-income/route.ts` | Backfill | Yes | OWNER only | Medium | |
| GET/POST | `app/api/admin/accounting/transfers/route.ts` | Transfers | Yes | OWNER/MANAGER | Low | |
| GET | `app/api/admin/accounting/transfers/[id]/attachment-url/route.ts` | Attachment URL | Yes | OWNER/MANAGER | Low | |
| GET/PATCH | `app/api/admin/emails/templates/route.ts` | Email templates | Yes | SUPPORT+ / PATCH MANAGER+ | Medium | Template HTML |
| GET/PATCH | `app/api/admin/emails/reminders/route.ts` | Reminder settings | Yes | Mixed | Medium | |
| GET | `app/api/admin/emails/outbox/route.ts` | Outbox list | Yes | SUPPORT+ | Medium | |
| GET/PATCH | `app/api/admin/emails/outbox/[id]/route.ts` | Outbox item | Yes | SUPPORT+ read; PATCH MANAGER+ | Medium | |
| POST | `app/api/admin/emails/outbox/[id]/send/route.ts` | Send outbox | Yes | OWNER/MANAGER | Medium | |
| POST | `app/api/admin/emails/outbox/[id]/cancel/route.ts` | Cancel outbox | Yes | OWNER/MANAGER | Low | |
| POST | `app/api/admin/emails/preview/route.ts` | Preview email | Yes | SUPPORT+ | Low | |
| POST | `app/api/admin/emails/test-send/route.ts` | Test send | Yes | OWNER/MANAGER | Medium | |
| POST | `app/api/admin/reviews/route.ts` | Admin review action | Yes | OWNER/MANAGER | Low | |
| DELETE | `app/api/admin/reviews/[id]/route.ts` | Delete review | Yes | OWNER/MANAGER | Low | |

---

## Stripe Flow Review

| Step | Behavior | Notes |
|------|----------|--------|
| Cart checkout | `POST /api/stripe/create-checkout-session` | Prices from `computeOrderTotals`; discounts recomputed; line items built in `buildStripeCheckoutLineItems` (`lib/stripe/checkoutStripeLineItems.ts`). **Strong path.** |
| Existing order pay | `POST /api/stripe/create-checkout-session-for-order` | Uses stored `order` rows; expansion destinations repriced in handler; others trust `order.pricing.grandTotal`. **Ownership not verified.** |
| Redirect sync | `POST /api/stripe/sync-checkout-session` | Retrieves session from Stripe; fulfills only if paid in Stripe. **Public** endpoint. |
| Poll | `GET /api/stripe/order-status` | Retrieves session; may fulfill; **returns full order** in some branches. |
| Webhook | `POST /api/stripe/webhook` | Verifies signature; records event id in `stripe_events` for idempotency; `fulfillPaidStripeCheckoutSession` gates on Stripe paid state; cart flow creates order after payment from draft. |

---

## Supabase / RLS Review

| Table / area | RLS in migrations | Public policies | Notes |
|--------------|-------------------|-----------------|-------|
| `orders`, `order_items`, `order_status_history` | Enabled | Token-scoped `SELECT` for `anon`/`authenticated` via `request_order_token()` | `20260420133000_orders_rls_token_access.sql` |
| `admin_users`, `audit_logs`, `stripe_events`, LINE tables, `order_notification_sent` | Enabled | None listed | Service role only |
| `expenses`, `income_records`, `accounting_transfers`, `expense_receipt_images`, `income_refunds`, `welcome_codes` | Enabled | None | Service role only |
| `customer_reviews` | Enabled | Public insert; read approved | Server route bypasses moderation |
| `newsletter_subscribers`, `partner_applications` | Enabled | Public insert | Expected |
| `checkout_drafts`, `email_templates`, `email_outbox`, `customer_reminders`, `reminder_email_logs` | **Not enabled in shown migrations** | **Unknown** | **Confirm in live project** (see Critical #6 **UNCLEAR**) |

---

## Admin Protection Review

- **Middleware:** `middleware.ts` — requires NextAuth session for `/admin` except `/admin/login`. **Does not** check `session.user.role`. **Status: OPEN** (see High Issues).
- **API:** Almost all `app/api/admin/*` use `requireAuth` or `requireRole` from `lib/adminRbac.ts`.
- **Gap:** `requireAuth`-only endpoints (export, verify-supabase) allow **any** `admin_users` role, including `SUPPORT`. **Status: OPEN** (export).
- **UI:** If pages assume “only owners see accounting,” that is **not** enforced at the edge; rely on API 403s and client hiding.

---

## Order Privacy Review

| Mechanism | Enforced? | Location | Status (this review) |
|---------|-----------|----------|----------------------|
| Token in URL for full order page | **No** | `app/order/[orderId]/page.tsx` uses `getOrderById` | **OPEN** |
| Token for API full JSON | Partially | `app/api/orders/[orderId]/route.ts` | Full detail requires token; **metadata leak without token OPEN** |
| Lookup leaks token | **Yes** | `app/api/orders/lookup` + `OrderLookupSection` | **OPEN** |
| Stripe `order-status` leaks full order | **Yes** | `app/api/stripe/order-status/route.ts` | **OPEN** |

---

## Upload Security Review

| Upload | Max size | Types | Bucket / access | Notes |
|--------|----------|-------|-----------------|-------|
| Expense receipt | 500 KB | jpeg, png, webp, heic | `receipts` private | `upload-receipt/route.ts`; migration allows PDF in bucket MIME list but route does not allow PDF |
| Income proof | 10 MB | jpeg, png, webp, heic, pdf | `proofs` private | `app/api/admin/accounting/upload-proof/route.ts` |
| Custom order reference | 4 MB | **Not restricted** | Vercel Blob **public** | `uploadCustomOrderReferenceImage.ts` — **OPEN** (Medium) |

---

## Security Headers Review

| Header | Present in `next.config.js`? | Status |
|--------|------------------------------|--------|
| Content-Security-Policy | No | **OPEN** |
| X-Frame-Options / frame-ancestors | No | **OPEN** |
| X-Content-Type-Options | No | **OPEN** |
| Referrer-Policy | No | **OPEN** |
| Permissions-Policy | No | **OPEN** |
| Strict-Transport-Security | No | **OPEN** |

*(Vercel may add some headers at platform level; they are not defined in this repo’s Next config.)*

---

## Environment Variables and Secrets

| Variable (from code patterns) | Expected exposure | Notes |
|-------------------------------|-------------------|-------|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Server only | `lib/stripe/server.ts` — not `NEXT_PUBLIC_` |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | Server only | `getSupabaseAdmin` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser (partner auth) | Expected; RLS must protect data |
| `AUTH_SECRET` | Server only | NextAuth |
| `CRON_SECRET` | Server/cron only | Cron route |
| `BLOB_READ_WRITE_TOKEN` | Server only | `uploadCustomOrderReferenceImage.ts` |
| `NEXT_PUBLIC_SANITY_*` | Public | Project/dataset ids are public by design |
| `SANITY_API_WRITE_TOKEN` | Server only | `lib/sanityWrite.ts` (scripts/admin) |

No `NEXT_PUBLIC_*` Stripe secret key found in grep patterns.

---

## Questions for Konstantin

1. **Supabase production:** For `checkout_drafts`, `email_outbox`, `email_templates`, `customer_reminders`, and `reminder_email_logs`, is **RLS enabled** and are **anon/authenticated** roles denied, matching the expenses pattern? The repo migrations create these tables without the RLS statements present for `orders`/`expenses`.

2. **Business intent:** Should **SUPPORT** users be allowed to **export full-order CSVs** (`/api/admin/orders/export`) and access **verify-supabase** output, or should those be **OWNER/MANAGER-only**?

---

## Current Priority Fix List

Only **OPEN** or **PARTIALLY FIXED** items. *(None are **PARTIALLY FIXED** in this review.)*

1. **Order page IDOR (full PII by `/order/[id]`)** — **Critical** — Files: `app/order/[orderId]/page.tsx`, optionally align with `lib/orders/router.ts` helpers — **Smallest safe fix:** Require `?token=` matching `public_token` before calling `getOrderById`; use `getOrderByIdWithPublicToken`. — **Test:** `http://localhost:3000/order/<id>` without token must not show PII.

2. **Lookup returns `public_token` / deep links** — **Critical** — Files: `lib/orders/supabaseStore.ts`, `app/api/orders/lookup/route.ts`, `components/OrderLookupSection.tsx` — **Smallest safe fix:** Stop selecting/returning `public_token`; remove `?token=` from lookup links. — **Test:** POST `/api/orders/lookup`; JSON must not include `orderToken`.

3. **`POST /api/orders` client-priced line items** — **Critical** — File: `app/api/orders/route.ts` (`validatePayload`) — **Smallest safe fix:** Compute each line price server-side from catalog (mirror `lib/stripePricing.ts`). — **Test:** POST with `price: 1` on expensive item; persisted totals must match server catalog.

4. **`create-checkout-session-for-order` no ownership** — **Critical** — File: `app/api/stripe/create-checkout-session-for-order/route.ts` — **Smallest safe fix:** Require body `publicToken` and verify against DB. — **Test:** POST with `orderId` only → 403; with valid token → session URL.

5. **`GET /api/stripe/order-status` returns full `order`** — **Critical** — File: `app/api/stripe/order-status/route.ts` — **Smallest safe fix:** Remove `order` from JSON; return minimal DTO. — **Test:** GET with `session_id`; response must not include phone/address.

6. **Supabase RLS for drafts/email/reminder tables** — **Unclear / verify** — Files: new migration under `supabase/migrations/`, plus Dashboard — **Smallest safe fix:** Enable RLS, no anon policies, align with `expenses`. — **Test:** Supabase SQL: confirm policies; attempt `anon` REST read (should fail).

7. **Unauthenticated `notify-admin`** — **High** — File: `app/api/orders/[orderId]/notify-admin/route.ts` — **Smallest safe fix:** Require matching `public_token` in body. — **Test:** POST without token → 401/403.

8. **Reviews auto-approved** — **High** — File: `app/api/reviews/route.ts` — **Smallest safe fix:** Insert `pending`. — **Test:** POST review; row `status` is `pending`.

9. **Admin middleware role blindness** — **High** — File: `middleware.ts` — **Smallest safe fix:** Deny `SUPPORT` for sensitive route prefixes or enforce in layouts. — **Test:** SUPPORT user hits accounting URL → redirect or 403.

10. **CSV export `requireAuth` only** — **High** — File: `app/api/admin/orders/export/route.ts` — **Smallest safe fix:** `requireRole(['OWNER','MANAGER'])`. — **Test:** SUPPORT → 403 on export.

11. **Webhook idempotency on DB errors** — **High** — File: `app/api/stripe/webhook/route.ts` (`recordStripeEventIfNew`) — **Smallest safe fix:** Non-23505 insert errors → `500` response. — **Test:** Manual fault injection in dev DB (see issue block).

12. **Custom-order public blob MIME** — **Medium** — Files: `app/api/custom-order/route.ts`, `lib/customOrder/uploadReferenceImage.ts` — **Smallest safe fix:** Allowlist image types before upload. — **Test:** POST non-image file → 400.

13. **`GET /api/orders/[orderId]` metadata without token** — **Medium** — File: `app/api/orders/[orderId]/route.ts` — **Smallest safe fix:** 404 without token. — **Test:** GET no token → no `payment_status`.

14. **Public `sync-checkout-session`** — **Medium** — File: `app/api/stripe/sync-checkout-session/route.ts` — **Smallest safe fix:** Signed nonce from session creation (larger change). — **Test:** `curl` with leaked `sessionId` documents current behavior.

15. **`/studio` ungated in Next** — **Medium** — Files: `middleware.ts`, optional `vercel.json` — **Smallest safe fix:** Protect `/studio` in middleware or hosting. — **Test:** Incognito `/studio`.

16. **No security headers in `next.config.js`** — **Medium** — File: `next.config.js` — **Smallest safe fix:** Add `headers()`. — **Test:** `curl -I localhost:3000`.

17. **`images.remotePatterns` wildcard** — **Medium** — File: `next.config.js` — **Smallest safe fix:** Narrow host list. — **Test:** Ensure catalog images still load.

18. **Health / newsletter / webhook GET (low)** — **Low** — Files: `app/api/health/orders/route.ts`, `app/api/newsletter/route.ts`, `app/api/stripe/webhook/route.ts` — **Smallest safe fix:** Scrub responses / return 404 for webhook GET in prod. — **Test:** Hit each endpoint and inspect body/headers.
