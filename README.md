# Lanna Bloom

A mobile-first flower shop for selling bouquets online. Customers browse the catalog, add items to the cart, and place orders with delivery details; the site generates a shareable order link and a pre-filled message for LINE, WhatsApp, or Telegram.

# Social
- **Facebook:** https://www.facebook.com/profile.php?id=61587782069439
- **Instagram:** https://www.instagram.com/lannabloomchiangmai/

## Features

- **Two languages** — English and Thai via `/en` and `/th` URLs; language switcher in the header
- **Catalog** — Bouquets from Sanity CMS; categories, product pages with gallery and size selector
- **Cart & orders** — Add to cart, delivery area and date, contact info; place order → success page with order link and messenger buttons
- **Order link** — Each order gets a public URL (e.g. `https://yoursite.com/order/LB-2026-xxxx`); stored in Vercel Blob so the link works when opened later
- **Messenger** — Pre-filled “order via LINE / WhatsApp / Telegram” from product page and cart; contact links in the header
- **Sanity Studio** — CMS at `/studio` for bouquets and partners; partner registration and dashboard (add/edit bouquets when approved)
- **Admin** — `/admin/orders`: list and remove orders (e.g. after delivery) using a secret

## Tech stack

- **Next.js 14** (App Router)
- **React 18**, **TypeScript**
- **Sanity** (catalog and partner data)
- **Vercel Blob** (order storage on Vercel)
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
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project (required for catalog and Studio) |
| `NEXT_PUBLIC_SANITY_DATASET` | Usually `production` |
| `SANITY_API_WRITE_TOKEN` | Sanity API token (partner registration and bouquet uploads) |
| `NEXT_PUBLIC_APP_URL` | Live site URL for order links (e.g. `https://www.lannabloom.shop`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (required on Vercel so order links work) |
| `ORDERS_ADMIN_SECRET` | Optional; required to use `/admin/orders` in production |

See `.env.example` for comments. For order-link troubleshooting (e.g. “Order not found”), see **docs/ORDERS_VERCEL.md**.

## Sanity Studio (CMS)

The app ships with Sanity Studio at **[/studio](http://localhost:3000/studio)** for managing bouquets and partners.

1. Set `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, and `SANITY_API_WRITE_TOKEN` in `.env.local`.
2. In [sanity.io/manage](https://www.sanity.io/manage) → your project → **API** → **CORS origins**, add `http://localhost:3000` with **Allow credentials** (and your production URL when deployed).
3. Run `npm run dev` and open [http://localhost:3000/studio](http://localhost:3000/studio).

**Bouquet** documents: slug, name (EN/TH), description, composition, category, images, sizes (price, label, description). Only **approved** bouquets appear on the catalog. **Partner** documents are used for the partner registration flow; approve partners in Studio to give them dashboard access.

## Orders and cart

- **Cart** — `/[lang]/cart`: delivery area (Chiang Mai districts), date, contact name and phone, contact method; “Place Order” creates an order and redirects to the success page.
- **Order link** — Generated after place order (e.g. `https://yoursite.com/order/LB-2026-xxxx`). Set `NEXT_PUBLIC_APP_URL` to your live URL so this link uses the correct domain. Stored in **Vercel Blob**; set `BLOB_READ_WRITE_TOKEN` for Production and Preview so the same store is used and the link works when opened.
- **Admin** — Open `/admin/orders`, enter the value of `ORDERS_ADMIN_SECRET`, then list or remove orders. See **docs/ORDERS_VERCEL.md** for full setup and “Order not found” fixes.

## Catalog updates

- **Development** — After changing bouquets in Studio, refresh the catalog page; changes appear immediately.
- **Production** — Catalog and product pages revalidate every 60 seconds; new or updated bouquets show within about a minute. No rebuild needed for content-only changes.

## Partner registration and dashboard

- **Register** — `/[lang]/partner/register` (link can be hidden from the main nav). Form creates a Partner in Sanity with status `pending_review`.
- **Dashboard** — `/[lang]/partner/dashboard/[partnerId]` (from success email/link). Approved partners can add and edit bouquets; new bouquets are `pending_review` until approved in Studio.

## Project structure

```
app/
  [lang]/           # Locale routes (/en, /th)
    page.tsx        # Home: Hero + CategoryGrid
    catalog/        # Catalog grid and product pages
    cart/           # Cart and place order
    checkout/success/
    partner/        # Register and dashboard
  order/[orderId]/  # Public order details page (no locale)
  admin/orders/     # Admin: list/remove orders
  api/orders/       # Create order, list (admin), delete (admin)
  studio/           # Sanity Studio
components/         # Header, Hero, BouquetCard, ProductOrderBlock, etc.
lib/
  i18n.ts           # Translations (EN/TH)
  sanity.ts         # Sanity read client
  orders.ts         # Order types and Blob/file storage
  messenger.ts      # LINE, WhatsApp, Telegram URLs and message builder
```

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
2. Add environment variables (see table above). For orders to work: set `BLOB_READ_WRITE_TOKEN` (Storage → Blob, attach to project; use same token for Production and Preview) and `NEXT_PUBLIC_APP_URL` (your live URL).
3. In Sanity → API → CORS origins, add your Vercel URL (and custom domain if used) with **Allow credentials** so Studio works.
4. Optional: add a custom domain in Vercel and set `NEXT_PUBLIC_APP_URL` to that domain.

For detailed order storage setup and “Order not found” troubleshooting, see **docs/ORDERS_VERCEL.md**.
