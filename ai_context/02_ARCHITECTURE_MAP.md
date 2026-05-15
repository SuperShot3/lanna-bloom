# Architecture map

Where code lives in the Next.js App Router monorepo.

## Top-level routes

| Path | Purpose |
|------|---------|
| `app/[lang]/` | Localized storefront (`en`, `th`) |
| `app/order/[orderId]/` | Customer order status (token in query) |
| `app/admin/` | Staff dashboard + login |
| `app/api/` | Route handlers (Stripe, orders, admin, cron) |
| `app/studio/` | Sanity Studio embed |
| `app/task/[token]/` | Supplier task (neutral links) |
| `content/` | MDX info articles, guides |
| `sanity/` | Sanity schema/config |

## Storefront (`app/[lang]/`)

| Area | Path |
|------|------|
| Home | `(main)/` or locale root |
| Catalog | `catalog/`, `(markets)/[market]/catalog/` |
| Product | `catalog/[slug]/` |
| Cart | `cart/` |
| Checkout | `checkout/complete`, `checkout/success`, `checkout/confirmation-pending` |
| Info / SEO | `info/[slug]/`, guides |
| Partner | `partner/apply`, `partner/dashboard`, `partner/products/` |
| Static pages | `refund-replacement`, etc. |

Layouts: `app/[lang]/layout.tsx`, market layouts under `(markets)/`.

## APIs (`app/api/`)

| Prefix | Purpose |
|--------|---------|
| `stripe/` | Checkout session, webhook, order-status, sync |
| `orders/` | Public order fetch (token-gated) |
| `admin/` | Authenticated admin mutations |
| `bouquets/` | Catalog helpers |
| `cron/` | Scheduled jobs (e.g. reminders) |
| `health/` | Health checks |

## Admin (`app/admin/`)

| Area | Path |
|------|------|
| Login | `login/` |
| Dashboard shell | `(dashboard)/layout.tsx`, `AdminDashboardShell.tsx` |
| Orders | `(dashboard)/orders/` |
| Accounting | `(dashboard)/accounting/` |
| Expenses | `(dashboard)/expenses/` |
| Emails | `(dashboard)/emails/` |
| Products / moderation | `(dashboard)/products/`, `moderation/` |

Shared UI: `app/admin/components/`.

## Core `lib/` modules

| Module | Role |
|--------|------|
| `lib/orders/` | Order router, Supabase store, types, lifecycle |
| `lib/checkout/` | Drafts, fulfill Stripe, submission token |
| `lib/stripe/` | Server client, metadata, post-payment hooks |
| `lib/analytics/`, `lib/analytics.ts` | dataLayer events |
| `lib/ga4/` | Measurement Protocol (optional) |
| `lib/email/` | Templates, render, outbox, Resend send |
| `lib/accounting/` | Income, expenses sync, transfers, ledger |
| `lib/expenses/` | Expense queries, bills |
| `lib/supabase/` | Server client, admin/partner queries, order adapter |
| `lib/bouquets.ts`, `lib/sanity.ts` | Catalog reads |
| `lib/sanityWrite.ts` | Server writes (partners, products) |
| `lib/delivery/` | Zones, markets, fees, hours |
| `lib/partner/` | Partner session helpers |
| `lib/adminRbac.ts` | Admin permissions |
| `lib/i18n.ts` | Locale types/helpers |

## Auth

| File | Role |
|------|------|
| `auth.ts` | NextAuth config (admin) |
| `middleware.ts` | Protects `/admin`, `/studio` |
| `lib/partner/requirePartnerSession.ts` | Partner routes |

## Data stores

| Store | Used for |
|-------|----------|
| Supabase | Orders, admin, email outbox, partner auth, expenses, accounting |
| Sanity | Bouquets, products, partners (CMS) |
| Stripe | Payments |
| Supabase Storage | Receipts, proofs buckets |
| Vercel Blob | Optional legacy orders; custom order reference images |

## Components worth knowing

| Component | Role |
|-----------|------|
| `components/GoogleAnalytics.tsx` | GTM + consent |
| Header / cart / catalog cards | Under `components/` or colocated in `app/` |

## Config

| File | Role |
|------|------|
| `next.config.js` | Next config, `transpilePackages` (e.g. heic2any) |
| `.env.example` | Env documentation |
| `supabase/migrations/` | SQL migrations |

## Cross-cutting flows

See topic context files:

- Payments → [04_CHECKOUT_ORDERS_STRIPE.md](04_CHECKOUT_ORDERS_STRIPE.md)
- Security → [03_SECURITY_RULES.md](03_SECURITY_RULES.md)
- Analytics → [05_ANALYTICS_GTM_GA4_ADS.md](05_ANALYTICS_GTM_GA4_ADS.md)
- Admin → [06_ADMIN_ACCOUNTING_EMAIL.md](06_ADMIN_ACCOUNTING_EMAIL.md)
