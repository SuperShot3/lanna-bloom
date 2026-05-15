# Start here — Lanna Bloom

Read this file before substantive work. Use topic files below for depth; use `docs/` for full runbooks.

## What this is

**Lanna Bloom** — mobile-first flower and gift delivery (Chiang Mai focus). Bilingual storefront (`/en`, `/th`), Stripe web checkout, Supabase orders, Sanity catalog, admin ops, partner portal.

## Stack

| Layer | Technology |
|-------|------------|
| App | Next.js 14 App Router, React 18, TypeScript |
| Hosting | Vercel |
| Catalog CMS | Sanity (`/studio`) |
| Orders / admin data | Supabase (service role server-side only) |
| Payments | Stripe Checkout |
| Email | Resend + Email Control Center (templates + outbox) |
| Analytics | GTM → GA4 / Google Ads (client `dataLayer` only in production) |
| Admin auth | NextAuth (`/admin`) |

## Context index

| File | When to read |
|------|----------------|
| [01_PROJECT_HANDOVER.md](01_PROJECT_HANDOVER.md) | Business, locales, partner flow, customer journeys |
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
| Catalog (Sanity) | `lib/bouquets.ts`, `lib/sanity.ts`, `app/[lang]/catalog/` |
| Partner portal | `app/[lang]/partner/`, `lib/partner/` |

## Env vars (names only — see `.env.example`)

**Never expose server secrets to the client.**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (order links, emails) |
| `NEXT_PUBLIC_SANITY_*` | Sanity project/dataset |
| `SANITY_API_WRITE_TOKEN` | Server writes to Sanity |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Orders, admin DB (server only) |
| `NEXT_PUBLIC_SUPABASE_*` | Partner portal client auth |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments |
| `AUTH_SECRET` | Admin NextAuth |
| `RESEND_API_KEY`, `ORDERS_*_EMAIL` | Transactional email |
| `NEXT_PUBLIC_GTM_ID` | GTM container (production only) |
| `ORDERS_PRIMARY_STORE`, `ORDERS_READ_FALLBACK` | Order store routing (default Supabase) |

## Agent rules of thumb

1. **Inspect code** — README may be outdated for payments/storage; trust `lib/checkout/`, `lib/orders/`, and `docs/`.
2. **Server recomputes money** — never trust client prices, discounts, or payment status.
3. **Stripe confirms payment** — cart orders are created after paid checkout session.
4. **Analytics `purchase`** — browser on `checkout/complete` after server confirms paid + `purchaseAnalytics`.
5. **Content copy** — use `.cursor/skills/` writers, not new giant prompts here.

## Deep dive (`docs/`)

- [docs/ORDERS_SUPABASE.md](../docs/ORDERS_SUPABASE.md)
- [docs/ANALYTICS_GA4.md](../docs/ANALYTICS_GA4.md)
- [docs/GOOGLE_ADS_PURCHASE_CONVERSION.md](../docs/GOOGLE_ADS_PURCHASE_CONVERSION.md)
- [docs/ACCOUNTING_AND_EXPENSES.md](../docs/ACCOUNTING_AND_EXPENSES.md)
- [docs/ADMIN_V2_COSTS.md](../docs/ADMIN_V2_COSTS.md)
