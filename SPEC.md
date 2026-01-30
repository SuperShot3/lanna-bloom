# Lanna Bloom — Page Structure, UI Layout & UX

## 1. Page Structure

| Route | Purpose |
|-------|--------|
| `/` | Redirects to `/en` (default locale) |
| `/en` | Home (EN) |
| `/th` | Home (TH) |
| `/en/catalog`, `/th/catalog` | Catalog grid; optional `?category=roses` etc. |
| `/en/catalog/[slug]`, `/th/catalog/[slug]` | Product page (e.g. `/en/catalog/classic-roses`) |

**Language:** Content switches by URL (`/en` vs `/th`). No page reload needed when using `<Link>`; Next.js client navigation keeps the app feel instant.

---

## 2. UI Layout Description

### Home Page
- **Header (global):** Logo (left), Nav (Home | Catalog), Language switcher (EN | TH), Messenger icons (LINE, WhatsApp, Telegram, Facebook).
- **Hero:** Centered headline + subline; primary CTA button “Choose a bouquet” → catalog.
- **Category grid:** 2 columns on mobile, 4 on tablet/desktop. Each tile: icon + label; links to catalog (all or filtered by category). Categories: All bouquets, Roses, Mixed, Mono, Flowers in a box, Romantic, Birthday, Sympathy.

### Catalog Page
- **Title:** “Our bouquets” (or Thai equivalent).
- **Grid:** Responsive 1 → 2 → 3 columns. Each card: large square image, name, “from ฿X”, “View details” link → product page.

### Product Page
- **Breadcrumb:** Home / Catalog / [Bouquet name].
- **Layout:** Two-column on desktop (gallery left, info right); stacked on mobile.
- **Gallery:** Main image + thumbnails; click to change main image.
- **Info block:** Name, short description, “Composition” section (flower list).
- **Size selector:** S / M / L / XL tiles; each shows price and short description; selection updates price and description state.
- **Order block:** Four buttons — Order via LINE, WhatsApp, Telegram, Facebook. Each opens the messenger with pre-filled text: “Hello! I want to order bouquet [Name], size [Size]”.

---

## 3. Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Header** | Logo, nav links (i18n), LanguageSwitcher, MessengerLinks. Sticky; minimal shadow. |
| **LanguageSwitcher** | EN | TH links; keeps current path, only changes `lang` segment. |
| **MessengerLinks** | Icon-style links to LINE, WhatsApp, Telegram, Facebook (header). |
| **Hero** | Headline, subline, CTA → catalog. Uses i18n. |
| **CategoryGrid** | Grid of category cards; links to `/[lang]/catalog` or `?category=…`. |
| **BouquetCard** | Image, name, “from ฿”, “View details”; link to product. |
| **ProductGallery** | Main image + thumbnails; state for active image. |
| **SizeSelector** | S/M/L/XL buttons; shows price + description per size; `onSelect` callback. |
| **MessengerOrderButtons** | Four CTAs; build pre-filled message from bouquet name + selected size; open in new tab. |
| **ProductOrderBlock** | Client wrapper: holds selected size state, renders SizeSelector + MessengerOrderButtons. |

**Data / lib:**
- **lib/i18n.ts** — Locales (EN, TH), all UI strings.
- **lib/bouquets.ts** — Bouquet list; fields for name/description/composition/sizes/images; getBySlug, getByCategory. CMS-ready shape.
- **lib/messenger.ts** — Build LINE/WhatsApp/Telegram/Facebook URLs with pre-filled message; central place for phone/ID/handles.

---

## 4. UX Logic

- **Navigation:** All links are locale-aware (`/[lang]/...`). Switching language keeps the same “page type” (home, catalog, product).
- **Catalog filtering:** Home category tiles link to catalog with `?category=…`. Catalog page reads `searchParams.category` and filters bouquets (or shows all).
- **Product size:** User picks S/M/L/XL; price and description update immediately; “Order via …” always uses the current selection in the pre-filled message.
- **Messenger flow:** Click “Order via LINE” (etc.) → new tab with LINE (etc.) and message “Hello! I want to order bouquet [Name], size [Size]”. No checkout; order completion happens in the messenger.
- **Mobile-first:** Touch targets, single-column product layout on small screens, grid breakpoints for catalog and categories. No complex forms.

---

## 5. Design Tokens (globals.css)

- **Background:** `#fdfbf9`; **Surface:** `#ffffff`; **Text:** `#2d2a26`; **Muted:** `#6b6560`.
- **Accent:** `#c4a77d`; **Accent soft:** `#e8dfd0`.
- **Pastels:** pink, mint, cream for sections/cards.
- **Cards:** `border-radius: 16px`, light shadow; hover: slightly stronger shadow.
- **Fonts:** DM Sans (body/UI), Cormorant Garamond (headings).

---

## 6. SEO & Performance

- **Static generation:** Home and catalog and all product slugs have `generateStaticParams` where applicable; pages are pre-rendered.
- **Meta:** Root layout sets default title/description; can be extended per page.
- **Semantic HTML:** `<header>`, `<nav>`, `<main>`, `<article>`, breadcrumb `<nav>`, heading hierarchy.
- **Images:** Next.js `Image` with `sizes` for responsive loading; placeholder Unsplash URLs in data (replace with your CMS/assets).

---

## 7. Ready for Implementation

The codebase implements the above: run `npm install` then `npm run dev`. Configure messenger links and phone/IDs in `lib/messenger.ts` and `components/MessengerLinks.tsx`. Replace `lib/bouquets.ts` with API or CMS when scaling.
