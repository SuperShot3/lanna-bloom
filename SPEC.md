# Lanna Bloom — Page Structure, UI Layout & UX

## 1. Page Structure

| Route | Purpose |
|-------|--------|
| `/` | Redirects to `/en` (default locale) |
| `/en`, `/th` | Home (EN / TH) |
| `/en/catalog`, `/th/catalog` | Catalog grid; optional `?category=roses` etc. |
| `/en/catalog/[slug]`, `/th/catalog/[slug]` | Product page (e.g. `/en/catalog/classic-roses`) |
| `/en/partner/register`, `/th/partner/register` | Partner registration form |
| `/en/partner/register/success`, `/th/partner/register/success` | Post-registration thank-you; link to dashboard |
| `/en/partner/dashboard/[partnerId]`, `/th/partner/dashboard/[partnerId]` | Partner dashboard (list bouquets; status: pending / approved / disabled) |
| `/en/partner/dashboard/[partnerId]/bouquets/new`, …/edit/`[bouquetId]` | Add or edit a bouquet (approved partners only) |
| `/studio` (or `/studio/...`) | Sanity Studio — CMS for bouquets and partners |

**Language:** Content switches by URL (`/en` vs `/th`). Next.js client navigation keeps the app instant when using `<Link>`.

---

## 2. UI Layout Description

### Home Page
- **Header (global):** Logo (Lanna Bloom, 60×50px; smaller when scrolled), Nav (Home | Catalog | Register as a Partner), Language switcher (EN | TH), Messenger icons (LINE, WhatsApp, Telegram). Sticky; compact “scrolled” state; burger menu on mobile when scrolled.
- **Hero:** Centered headline + subline; primary CTA “Choose a bouquet” → catalog; trust line (e.g. same-day delivery Chiang Mai).
- **Category grid:** 2 columns on mobile, 4 on tablet/desktop. Each tile: icon + label; links to catalog (all or filtered). Categories: All bouquets, Roses, Mixed, Mono, Flowers in a box, Romantic, Birthday, Sympathy.

### Catalog Page
- **Title:** “Our bouquets” (or Thai equivalent).
- **Grid:** Responsive 1 → 2 → 3 columns. Each card: image, name, “from ฿X”, “View details” → product page. Data from Sanity (ISR, revalidate 60s).

### Product Page
- **Breadcrumb:** Home / Catalog / [Bouquet name].
- **Layout:** Two-column on desktop (gallery left, info right); stacked on mobile.
- **Gallery:** Main image + thumbnails; click to change main image.
- **Info block:** Name, description, “Composition” section.
- **Order block:** (1) **Delivery form** — select delivery area (Chiang Mai districts) and delivery date. (2) **Size selector** — S / M / L / XL with price and description. (3) **Messenger order buttons** — Order via LINE, WhatsApp, Telegram, Facebook. Pre-filled message includes bouquet name, size, and (when provided) delivery address and date.

### Partner Flow
- **Register:** Form (shop name, contact name, phone, LINE/WhatsApp, address, city). Submit → Sanity `partner` with `status: pending_review`; redirect to success page with dashboard link.
- **Success:** Thank-you message and link to `/[lang]/partner/dashboard/[partnerId]` (active after approval).
- **Dashboard:** If pending → “Pending approval”. If disabled → “Account disabled”. If approved → list of bouquets, “Add bouquet”, and edit links.
- **Add/Edit bouquet:** Form: name (EN/TH), description, composition, category, images (1–3), sizes (key, label, price, description, prep time, availability). New bouquets saved with `status: pending_review`; only approved bouquets appear on the public catalog.

### Header behavior
- **Sticky** with subtle shadow; “scrolled” state: reduced height, frosted background, smaller logo (30×36px).
- **Mobile (≤600px):** When scrolled, desktop nav is replaced by a **burger**; opening it shows full-screen overlay with Home, Catalog, Register as a Partner, language switcher, and messenger links.

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
| **PartnerRegisterForm** | Partner registration form; server action → Sanity. |
| **BouquetForm** | Add/Edit bouquet form (name, description, composition, category, images, sizes); server actions create/update via Sanity. |

**Data / lib:**
- **lib/i18n.ts** — Locales (EN, TH), all UI strings including partner and buyNow/delivery.
- **lib/bouquets.ts** — Bouquet/BouquetSize types; used by front-end and Sanity mapping.
- **lib/sanity.ts** — Sanity read client; `getBouquetsFromSanity`, `getBouquetBySlugFromSanity`, `getBouquetsByCategoryFromSanity`, `getPartnerById`, `getBouquetById`, `getBouquetsByPartnerId`. Image URL builder.
- **lib/sanityWrite.ts** — Sanity write client (server-only); `createPartner`, `uploadImageToSanity`, `createBouquet`, `updateBouquet`. Requires `SANITY_API_WRITE_TOKEN`.
- **lib/delivery-areas.ts** — Chiang Mai districts (EN/TH); `CITY_EN`, `CITY_TH`, `CHIANG_MAI_DISTRICTS`, postal-code search helper.
- **lib/messenger.ts** — Build LINE/WhatsApp/Telegram/Facebook URLs with pre-filled message; central place for phone/ID/handles.

---

## 4. UX Logic

- **Navigation:** All links are locale-aware (`/[lang]/...`). Switching language keeps the same page type (home, catalog, product, partner).
- **Catalog:** Data from Sanity; filtered by `?category=…`. ISR with `revalidate = 60` so new/updated bouquets appear without full rebuild.
- **Product:** User selects delivery area and date (optional), then size. “Order via …” uses current size and, when set, delivery address and date in the pre-filled message.
- **Messenger flow:** Click “Order via LINE” (etc.) → new tab with pre-filled text (e.g. “Hello! I want to order bouquet [Name], size [Size]. Delivery: [address]. Date: [date]”). No in-app checkout; completion in messenger.
- **Partner:** Register → pending_review. Admin approves in Sanity → partner can use dashboard to add/edit bouquets. Partner bouquets start as pending_review; only approved bouquets show in public catalog.
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

## 6. CMS & Backend (Sanity)

- **Studio:** Mounted at `/studio` (Next.js route `app/studio/[[...index]]/page.tsx`). Configure `sanity.config.ts` with project/dataset.
- **Schemas:** `bouquet` (slug, nameEn/Th, description, composition, category, partner ref, status, images, sizes), `partner` (shopName, contactName, phoneNumber, lineOrWhatsapp, shopAddress, city, status). Bouquet status: `pending_review` | `approved`; partner status: `pending_review` | `approved` | `disabled`.
- **Env:** `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`; `SANITY_API_WRITE_TOKEN` for partner registration and bouquet create/update.

---

## 7. SEO & Performance

- **ISR:** Catalog and product pages use `revalidate = 60`; static params for product slugs via `generateStaticParams`; `dynamicParams = true` for new slugs.
- **Meta:** Root layout sets default title/description; can be extended per page.
- **Semantic HTML:** `<header>`, `<nav>`, `<main>`, `<article>`, breadcrumb `<nav>`, heading hierarchy.
- **Images:** Next.js `Image` with `sizes`; Sanity image URLs via `lib/sanity.ts` builder.

---

## 8. Deployment & Run

- **Redirect:** `vercel.json` redirects `/` → `/en`.
- **Run:** `npm install` then `npm run dev`. Set in `.env.local`: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, and for partner/bouquet writes `SANITY_API_WRITE_TOKEN`. Configure messenger links/phone/IDs in `lib/messenger.ts` and `components/MessengerLinks.tsx`.
