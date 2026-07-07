# Start here — Lanna Bloom

Read this file before substantive work. Use topic files below for depth; use `docs/` for full runbooks.

## What this is

**Lanna Bloom** — mobile-first flower and gift delivery (Chiang Mai focus). Bilingual storefront (`/en`, `/th`), Stripe web checkout, Supabase orders and **catalog**, admin ops. Partner **application** form only (dashboard and Sanity Studio retired).

Production site: `lannabloom.shop`. Social links live in `README.md`.

## Business and customer flow

| Area | Current behavior |
|------|------------------|
| Locales | URL-based English and Thai routes (`/en/*`, `/th/*`); language switcher preserves the current path where possible |
| Browse | Localized storefront and catalog read approved products from Supabase catalog tables |
| Product / cart | Product pages support size selection; cart collects delivery area/date and customer contact details |
| Pay | Primary web flow is Stripe Checkout; server recomputes totals and creates orders after confirmed payment |
| After pay | Thank-you flow resolves the paid checkout session and links to the customer order page |
| Order tracking | `/order/{orderId}?token=...` requires the public token and shows customer-facing status/contact options |
| Messenger | LINE / WhatsApp / Telegram links are supporting contact channels, not the primary payment/order authority |
| Partner flow | Public self-service partner dashboard is retired; `/[lang]/partner/apply` stores applications for admin review |

## Stack

| Layer | Technology |
|-------|------------|
| App | Next.js 14 App Router, React 18, TypeScript |
| Hosting | Vercel (paid plan — not Hobby) |
| Catalog | Supabase (`catalog_*` tables + `catalog` Storage bucket) |
| Orders / admin data | Supabase (paid plan; service role server-side only) |
| Payments | Stripe Checkout |
| Email | Resend + Email Control Center (templates + outbox) |
| Analytics | GTM → GA4 / Google Ads (client `dataLayer` only in production) |
| Admin auth | NextAuth (`/admin`) |

## Context index

| File | When to read |
|------|----------------|
| [02_ARCHITECTURE_MAP.md](02_ARCHITECTURE_MAP.md) | Routes, folders, key entry points |
| [03_SECURITY_RULES.md](03_SECURITY_RULES.md) | API changes, auth, tokens, env secrets |
| [04_CHECKOUT_ORDERS_STRIPE.md](04_CHECKOUT_ORDERS_STRIPE.md) | Cart, checkout, orders, Stripe webhook |
| [05_ANALYTICS_GTM_GA4_ADS.md](05_ANALYTICS_GTM_GA4_ADS.md) | dataLayer, `purchase`, GTM, Ads |
| [06_ADMIN_ACCOUNTING_EMAIL.md](06_ADMIN_ACCOUNTING_EMAIL.md) | Admin UI, expenses, accounting, emails |

## Where is X? (quick map)

| Topic | Primary locations |
|-------|-------------------|
| Cart / checkout UI | `app/[lang]/cart/`, `app/[lang]/checkout/` |
| Stripe APIs | `app/api/stripe/` |
| Order fulfillment | `lib/checkout/fulfillStripeCheckout.ts` |
| Order store | `lib/orders/` (router → Supabase) |
| Customer order page | `app/order/[orderId]/` |
| Public order API | `app/api/orders/[orderId]/route.ts` |
| Analytics push | `lib/analytics.ts`, `lib/analytics/gtag.ts` |
| GTM loader | `components/GoogleAnalytics.tsx` |
| Admin dashboard | `app/admin/(dashboard)/` |
| Admin APIs | `app/api/admin/` |
| Email templates / outbox | `lib/email/`, Supabase `email_templates` / `email_outbox` |
| Catalog (Supabase) | `lib/catalogReads.ts`, `lib/catalogWrite.ts`, `lib/sanity.ts` (facade), `app/[lang]/catalog/` |
| Partner apply | `app/[lang]/partner/apply/` |

## Env vars (names only — see `.env.example`)

**Never expose server secrets to the client.**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (order links, emails) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Orders, catalog, admin DB (server only) |
| `NEXT_PUBLIC_SUPABASE_*` | Optional; legacy partner auth (portal retired) |
| `NEXT_PUBLIC_SANITY_*`, `SANITY_API_WRITE_TOKEN` | **Import only** — one-time `npm run import-catalog` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments |
| `AUTH_SECRET` | Admin NextAuth |
| `RESEND_API_KEY`, `ORDERS_*_EMAIL` | Transactional email |
| `NEXT_PUBLIC_GTM_ID` | GTM container (production only) |
| `ORDERS_PRIMARY_STORE`, `ORDERS_READ_FALLBACK` | Order store routing (default Supabase) |

## Agent rules of thumb

1. **Inspect code** — README may be outdated for payments/storage; trust `lib/checkout/`, `lib/orders/`, and `docs/`.
2. **Server recomputes money** — never trust client prices, discounts, or payment status.
3. **Stripe confirms payment** — cart orders are created after paid checkout session.
4. **Analytics `purchase`** — browser on `/lanna-order-thank-you` after server confirms paid + `purchase` payload.
5. **Content copy** — use `.cursor/skills/` writers, not new giant prompts here.

## Catalog cutover

Product catalog (bouquets, add-ons, partners, homepage hero) lives in **Supabase**, not Sanity. One-time migration: [docs/CATALOG_MIGRATION_RUNBOOK.md](../docs/CATALOG_MIGRATION_RUNBOOK.md).

## Deep dive (`docs/`)

- [docs/CATALOG_MIGRATION_RUNBOOK.md](../docs/CATALOG_MIGRATION_RUNBOOK.md)
- [docs/ORDERS_SUPABASE.md](../docs/ORDERS_SUPABASE.md)
- [docs/ANALYTICS_GA4.md](../docs/ANALYTICS_GA4.md)
- [docs/GOOGLE_ADS_PURCHASE_CONVERSION.md](../docs/GOOGLE_ADS_PURCHASE_CONVERSION.md)
- [docs/ACCOUNTING_AND_EXPENSES.md](../docs/ACCOUNTING_AND_EXPENSES.md)
- [docs/ADMIN_V2_COSTS.md](../docs/ADMIN_V2_COSTS.md)
