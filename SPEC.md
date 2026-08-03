# Lanna Bloom — Page Structure, UI Layout & UX

> Updated to match the current app. For the authoritative, continuously-verified architecture
> reference, read `ai_context/00_START_HERE.md` and the other `ai_context/*.md` files.

## 1. Page Structure

| Route | Purpose |
|-------|--------|
| `/` | Redirects to `/en` (default locale) |
| `/en`, `/th` | Home (EN / TH) |
| `/en/catalog`, `/th/catalog` | Catalog grid; filterable by category, flower type, occasion, etc. |
| `/en/catalog/[slug]`, `/th/catalog/[slug]` | Product page (bouquet, plush toy, balloon, or gift) |
| `/en/cart`, `/th/cart` | Cart and delivery details |
| `/en/checkout/...`, `/th/checkout/...` | Stripe Checkout handoff + confirmation-pending |
| `/en/partner/apply`, `/th/partner/apply` | Partner application form (Thai-first UI) — no login, no dashboard |
| `/order/[orderId]` | Public order tracking page (no locale prefix; requires `?token=`) |
| `/admin/partners/applications` | Admin: approve/reject partner applications |
| `/admin/moderation/products` | Admin: approve/reject submitted products |
| `/admin` | Admin dashboard: orders, catalog, accounting, marketing, RBAC |

**Language:** Content switches by URL (`/en` vs `/th`). Next.js client navigation keeps the app instant when using `<Link>`.

---

## 2. UI Layout Description

### Home Page
- **Header (global):** Logo (Lanna Bloom, 60×50px; smaller when scrolled), Nav (Home | Catalog | Partner apply), Language switcher (EN | TH), Messenger icons (LINE, WhatsApp, Telegram). Sticky; compact “scrolled” state; burger menu on mobile when scrolled.
- **Hero:** Centered headline + subline; primary CTA “Choose a bouquet” → catalog; trust line (e.g. same-day delivery Chiang Mai).
- **Category grid:** 2 columns on mobile, 4 on tablet/desktop. Each tile: icon + label; links to catalog (all or filtered). Categories: All bouquets, Roses, Mixed, Mono, Flowers in a box, Romantic, Birthday, Sympathy.

### Catalog Page
- **Title:** “Our bouquets” (or Thai equivalent).
- **Grid:** Responsive 1 → 2 → 3 columns. Each card: image, name, “from ฿X”, “View details” → product page. Data read from Supabase catalog tables (ISR, revalidate 60s).

### Product Page
- **Breadcrumb:** Home / Catalog / [Bouquet name].
- **Layout:** Two-column on desktop (gallery left, info right); stacked on mobile.
- **Gallery:** Main image + thumbnails; click to change main image.
- **Info block:** Name, description, “Composition” section.
- **Order block:** (1) **Delivery form** — select delivery area (Chiang Mai districts) and delivery date. (2) **Size selector** — S / M / L / XL with price and description. (3) **Messenger order buttons** — Order via LINE, WhatsApp, Telegram, Facebook. Pre-filled message includes bouquet name, size, and (when provided) delivery address and date.

### Partner Flow (current — application only, no partner login)
- **A) Apply** — `/[lang]/partner/apply`: Form (shop name, contact, email, LINE, phone, address, district, delivery, categories, samples). Submit → Supabase `partner_applications` (status: pending).
- **B) Admin Review** — `/admin/partners/applications`: Admin approves or rejects the application directly; there is no auto-created partner login/account.
- **C) Products** — Admins add/edit catalog products (bouquets, plush toys, balloons, gifts) directly in `/admin`; there is no partner-facing product-add flow or partner dashboard.
- **D) Moderation** — `/admin/moderation/products`: Approve/Reject submitted products. **Catalog** reads only approved/live items from Supabase.

### Header behavior
- **Sticky** with subtle shadow; “scrolled” state: reduced height, frosted background, smaller logo (30×36px).
- **Mobile (≤600px):** When scrolled, desktop nav is replaced by a **burger**; opening it shows full-screen overlay with Home, Catalog, Partner apply, language switcher, and messenger links.

---

## 3. Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Header** | Logo (60×50px, smaller when scrolled), nav links (i18n), LanguageSwitcher, MessengerLinks. Sticky; scrolled state; burger menu on mobile when scrolled. |
| **LanguageSwitcher** | EN | TH links; keeps current path, only changes `lang` segment. |
| **MessengerLinks** | Icon links to LINE, WhatsApp, Telegram (header). |
| **Hero** | Headline, subline, CTA → catalog, trust line. Uses i18n. |
| **CategoryGrid** | Grid of category cards; links to `/[lang]/catalog` or `?category=…`. |
| **BouquetCard** | Image, name, “from ฿”, “View details”; link to product. |
| **ProductGallery** | Main image + thumbnails; state for active image. |
| **DeliveryForm** | Delivery area (Chiang Mai districts from `lib/delivery-areas.ts`) and delivery date. Optional postal-code hint. Outputs district + date for messenger message. |
| **SizeSelector** | S/M/L/XL buttons; price + description per size; `onSelect` callback. |
| **MessengerOrderButtons** | LINE, WhatsApp, Telegram, Facebook CTAs; build pre-filled message from bouquet name, selected size, and optional delivery address/date; open in new tab. |
| **ProductOrderBlock** | Client wrapper: DeliveryForm state, SizeSelector, MessengerOrderButtons. |
| **SocialLinks** | Social links component (available for footer or other use). |
| **PartnerApplyForm** | Partner application form; server action → Supabase `partner_applications`. |
| **BouquetForm / ProductForm (admin)** | Admin-only add/edit forms for bouquets and other product categories; server actions write directly to Supabase catalog tables via `lib/catalogWrite.ts`. |

**Data / lib:**
- **lib/i18n.ts** — Locales (EN, TH), all UI strings including partner and buyNow/delivery.
- **lib/bouquets.ts** — Bouquet/BouquetSize types; used by front-end and catalog mapping.
- **lib/catalogReads.ts** — Supabase catalog read layer; `getCatalogBouquets`, `getCatalogBouquetBySlug`, `getCatalogProductBySlug`, etc.
- **lib/catalogWrite.ts** — Supabase catalog write layer (server-only, admin only); create/update bouquets, products, and site settings.
- **lib/supabase/** — Supabase client; `partner_applications` CRUD; admin/order/catalog queries.
- **lib/delivery/** — Delivery destinations, zones, and per-zone fees (Chiang Mai + expansion cities).
- **lib/messenger.ts** — Build LINE/WhatsApp/Telegram/Facebook URLs with pre-filled message; central place for phone/ID/handles.

---

## 4. UX Logic

- **Navigation:** All links are locale-aware (`/[lang]/...`). Switching language keeps the same page type (home, catalog, product, partner).
- **Catalog:** Data from Supabase; filtered by `?category=…` and other facets. ISR with `revalidate = 60` so new/updated bouquets appear without full rebuild.
- **Product:** User selects delivery area/zone and date, then size or product options; can add to cart and pay via Stripe Checkout, or use “Order via …” messenger buttons as a supporting contact channel.
- **Messenger flow:** Click “Order via LINE” (etc.) → new tab with pre-filled text. This is a supporting contact channel, not the primary payment/order path (Stripe Checkout is primary).
- **Partner:** Apply → Supabase `partner_applications`. Admin manually reviews and approves/rejects; there is no partner login, and admins manage catalog products directly. Admin moderates submitted products; only live/approved items show in catalog.
- **Mobile-first:** Touch targets, single-column product layout on small screens, grid breakpoints, burger menu when header is scrolled.

---

## 5. Design Tokens (globals.css)

- **Background:** `#fdfbf9`; **Surface:** `#ffffff`; **Text:** `#2d2a26`; **Muted:** `#6b6560`.
- **Accent:** `#c4a77d`; **Accent soft:** `#e8dfd0`.
- **Pastels:** pink, mint, cream for sections/cards.
- **Cards:** `border-radius: 16px`, light shadow; hover: slightly stronger shadow.
- **Fonts:** DM Sans (body/UI), Cormorant Garamond (headings).
- **Logo:** Default 60×50px; scrolled state 36×30px (header). Sizes in `Header` styled-jsx and Next.js `Image` props.

---

## 6. CMS & Backend (Supabase)

- **Admin dashboard:** `/admin` (Next.js routes under `app/admin/(dashboard)/`). No separate CMS app — catalog, orders, and moderation are all managed from the same admin dashboard, gated by NextAuth + RBAC (`lib/adminRbac.ts`).
- **Tables (Supabase):** `catalog_bouquets`, `catalog_products` and related `catalog_*` tables (slug, nameEn/Th, category, structured attributes, images, pricing, `moderation_status`/`status`: `pending_review` | `approved` for bouquets, `submitted` | `live` | `needs_changes` | `rejected` for other products), `partner_applications`, plus orders/accounting/email tables. Catalog reads only approved/live rows.
- **Env:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only); `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public).

---

## 7. SEO & Performance

- **ISR:** Catalog and product pages use `revalidate = 60`; static params for product slugs via `generateStaticParams`; `dynamicParams = true` for new slugs.
- **Meta:** Root layout sets default title/description; can be extended per page.
- **Semantic HTML:** `<header>`, `<nav>`, `<main>`, `<article>`, breadcrumb `<nav>`, heading hierarchy.
- **Images:** Next.js `Image` with `sizes`; images served from Supabase Storage bucket `catalog` (URLs resolved via `lib/catalogReads.ts` / `lib/catalog/`).

---

## 8. Deployment & Run

- **Redirect:** `vercel.json` redirects `/` → `/en`.
- **Run:** `npm install` then `npm run dev`. Set in `.env.local`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and Stripe keys for checkout. Configure messenger links/phone/IDs in `lib/messenger.ts` and `components/MessengerLinks.tsx`.
