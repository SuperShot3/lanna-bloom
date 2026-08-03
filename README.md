# Lanna Bloom

A mobile-first flower shop for selling bouquets online. Customers browse the catalog, add items to the cart, pay via Stripe Checkout, and get a shareable order-tracking link plus a pre-filled message for LINE, WhatsApp, or Telegram.

For the current, verified architecture (source of truth for AI agents and contributors), see [`ai_context/00_START_HERE.md`](ai_context/00_START_HERE.md).

# Social
- **Facebook:** https://www.facebook.com/profile.php?id=61587782069439
- **Instagram:** https://www.instagram.com/lannabloomchiangmai/

## Features

- **Two languages** — English and Thai via `/en` and `/th` URLs; language switcher in the header
- **Catalog** — Bouquets, plush toys, balloons, and gifts read from the Supabase catalog tables; categories, product pages with gallery and size selector
- **Cart & checkout** — Add to cart, delivery area and date, contact info; Stripe Checkout is the primary payment flow, with server-side recomputed totals
- **Order tracking** — Each order gets a public tracking URL (e.g. `https://lannabloom.shop/order/LB-2026-xxxx?token=...`); Supabase is the primary order store
- **Messenger** — Pre-filled “order via LINE / WhatsApp / Telegram” from product page and cart; contact links in the header
- **Partner applications** — `/[lang]/partner/apply`: a Thai-first application form; admins review and approve/reject applications in `/admin/partners/applications` (no self-service partner dashboard)
- **Admin** — `/admin`: dashboard with orders, status updates, costs, accounting (income/expenses), product/catalog moderation, and remove (RBAC with NextAuth). Money-flow reference: **docs/ACCOUNTING_AND_EXPENSES.md**.
- **Campaign Builder Assistant** — Owner-controlled wizard for planning, validating, and creating paused Google Ads Search campaigns

## Campaign Builder Assistant

The Campaign Builder Assistant is available in `/admin/marketing` under the **Campaign Builder** tab. It guides the owner through six reviewable steps: location, audience and landing page, ad groups, keywords, negative keywords, and responsive search ad copy with a daily budget.

The assistant can generate territory-aware suggestions with AI when `OPENAI_API_KEY` is configured. Without AI, it remains usable with rule-based suggestions and manual editing. Reusable guidance can be saved for future campaigns, and every step must be reviewed and approved before creation.

Safety controls include supported-market targeting, English-only campaigns, exact and phrase-match keywords, cross-city negative keywords, server-side validation, a maximum daily budget, and an optional dry run. Live creation requires owner access and configured Google Ads credentials. Campaigns, ad groups, and ads are always created **paused** so they can be checked in Google Ads before activation.

For architecture, APIs, persistence, safety boundaries, known technical debt, and a ready-to-copy planning prompt for another AI, see **[Campaign Builder Assistant — AI Technical Handoff](docs/CAMPAIGN_BUILDER_ASSISTANT.md)**.

## Tech stack

- **Next.js 14** (App Router)
- **React 18**, **TypeScript**
- **Supabase** (catalog, orders, admin data, partner applications, email outbox)
- **Stripe Checkout** (payments)
- **CSS** (variables, no framework)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000); you’ll be redirected to `/en`. Use the header to switch to `/th`.

### Environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
|---------|---------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase project (catalog, orders, admin data — server only) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase URL/anon key (customer order pages, `next/image` allowlist) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Checkout and webhook |
| `NEXT_PUBLIC_APP_URL` | Live site URL for order links (e.g. `https://www.lannabloom.shop`) |
| `AUTH_SECRET` | Required for admin login (NextAuth) |

See `.env.example` for the full list and comments. For order/catalog architecture, see `ai_context/00_START_HERE.md` and `docs/ORDERS_SUPABASE.md`.

## Orders and cart

- **Cart** — `/[lang]/cart`: delivery area/zone, date, contact name and phone, contact method; checkout hands off to Stripe Checkout.
- **Pay** — Stripe Checkout is the primary payment flow; the server recomputes totals and creates the order only after a confirmed payment.
- **Order tracking** — After payment, the customer is redirected to a tracking link (e.g. `https://lannabloom.shop/order/LB-2026-xxxx?token=...`). Supabase is the single source of truth for orders; see `docs/ORDERS_SUPABASE.md`.
- **Admin** — Open `/admin`, sign in with email/password (seed admin users via `scripts/seed-admin.ts`). Accounting reference: **docs/ACCOUNTING_AND_EXPENSES.md**.

## Catalog updates

Catalog and product pages revalidate every 60 seconds (ISR); admin edits to bouquets/products/hero images in `/admin` show on the storefront within about a minute, with no rebuild needed.

## Partner applications

- **Apply** — `/[lang]/partner/apply`: a Thai-first application form that writes to the Supabase `partner_applications` table.
- **Admin review** — `/admin/partners/applications`: admins approve or reject applications manually. There is no partner login or self-service partner dashboard.

## Project structure

```
app/
  [lang]/           # Locale routes (/en, /th)
    page.tsx        # Home: Hero + PopularSection
    catalog/        # Catalog grid and product pages
    cart/           # Cart
    checkout/       # Stripe Checkout handoff + confirmation-pending
    partner/apply/  # Partner application form (no dashboard)
  order/[orderId]/  # Public order tracking page (no locale; requires ?token=)
  admin/            # Admin dashboard (orders, catalog, accounting, RBAC)
  api/stripe/       # Checkout session + webhook
  api/orders/       # Public order status API
components/         # Header, Hero, BouquetCard, ProductOrderBlock, etc.
lib/
  i18n.ts           # Translations (EN/TH)
  catalogReads.ts   # Supabase catalog read layer
  orders/           # Order types and Supabase-backed order store
  messenger.ts      # LINE, WhatsApp, Telegram URLs and message builder
```

## Analytics (GA4 via GTM)

GA4 ecommerce events are pushed from `lib/analytics.ts` into `dataLayer`, and GTM owns transport plus pageviews in production. **Key events** (mark in GA4 Admin → Events):

| Event | Where it fires |
|-------|----------------|
| **purchase** | **GA4 revenue (default):** `/{lang}/checkout/complete` (post-Stripe) → `dataLayer` → GTM. Optional server MP documented in `docs/ANALYTICS_GA4.md` |
| **generate_lead** | Success page after Place Order when the order is still unpaid |

Do **not** mark `contact_click` or `messenger_click` as primary key events. See `docs/ANALYTICS_GA4.md` for the full event inventory, GTM setup, and validation checklist.

## Configuration

- **Messenger (LINE, WhatsApp, Telegram)** — Edit `lib/messenger.ts`: phone number, LINE OA ID and lin.ee link, and (optionally) Facebook page. Header contact icons and “order via” buttons use these.
- **Translations** — All UI strings are in `lib/i18n.ts` (EN and TH).

## Design

- Soft pastels, cream background, accent gold/beige
- Typography: DM Sans (UI), Cormorant Garamond (headings)
- Mobile-first; sticky header with burger menu when scrolled

## Build and deploy

```bash
npm run build
npm start
```

### Deploy to Vercel

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Add environment variables (see table above): Supabase, Stripe, and `NEXT_PUBLIC_APP_URL` (your live URL) are required for checkout and orders to work.
3. Run the Supabase migrations in `supabase/migrations/` against your project before first deploy.
4. Optional: add a custom domain in Vercel and set `NEXT_PUBLIC_APP_URL` to that domain.

For order storage details, see **docs/ORDERS_SUPABASE.md**.
