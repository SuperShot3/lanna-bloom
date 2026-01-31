# To DO 

Can image of choses flowers chages according size option that choosen by user.

categories such us romatic and gifts are empty we can filled them with affilate products 

Header is still to big 

on iphone is not well centred as category want to make it different way. 

Button choose button is not good 

create contact social media (how customer will contact us via facebook or phone coz WhatsApp need new number i dont have)

create design for small stiker that can be placed in bar or something to promte website. 

talk to seller tommorow

Descriptuion 

# Data Base access 

go to localhost:3000/studio - use gmail adress 


# Lanna Bloom

A mobile-first e-commerce site for selling flowers online, inspired by Flowwow. Orders are placed via messengers (LINE, WhatsApp, Telegram, Facebook)—no checkout flow.

## Features

- **Two languages**: English (EN) and Thai (TH), with instant switching via `/en` and `/th` URLs
- **Mobile-first**: Responsive layout, touch-friendly category grid and product cards
- **Pages**: Home (hero + category grid), Catalog (bouquet grid), Product (gallery, size selector, messenger order buttons)
- **Messenger ordering**: Pre-filled message opens in LINE, WhatsApp, Telegram, or Facebook
- **SEO-friendly**: Next.js App Router, semantic HTML, static generation
- **CMS-ready**: Bouquet data in `lib/bouquets.ts`; replace with API/CMS later

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **CSS** (variables, no framework)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You’ll be redirected to `/en`. Use the header to switch to `/th` or open `/th` directly.

## Sanity Studio (CMS)

The app includes Sanity Studio at **[/studio](http://localhost:3000/studio)** for managing bouquets (images, descriptions, prices).

1. **Env**: `.env.local` should have:
   - `NEXT_PUBLIC_SANITY_PROJECT_ID=moaf1lxq`
   - `NEXT_PUBLIC_SANITY_DATASET=production`
   - `SANITY_API_WRITE_TOKEN` — required for partner registration and partner bouquet uploads (create a token with Editor/Admin in [sanity.io/manage](https://www.sanity.io/manage) → API → Tokens)

2. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
   Then open [http://localhost:3000/studio](http://localhost:3000/studio).

3. **CORS**: In [sanity.io/manage](https://www.sanity.io/manage) → your project → **API** → **CORS origins**, add `http://localhost:3000` with **Allow credentials** so the Studio can talk to the Content Lake.

4. **Schema**: The **Bouquet** document type has: slug, name (EN/TH), description (EN/TH), composition (EN/TH), category, partner (optional reference), status (pending_review / approved — only approved show on the public catalog), images (gallery), and sizes (S/M/L/XL with price, description, preparation time, availability). The **Partner** document type is used for the partner registration flow; approve partners in Studio to give them dashboard access.

## Updating the catalog (new flowers)

When you add or edit flowers in Sanity Studio:

- **Development** (`npm run dev`): Refresh the catalog page (`/en/catalog` or `/th/catalog`) — new bouquets appear right away.
- **Production**: The site revalidates catalog and product pages **every 60 seconds**. New flowers show up within about a minute. No rebuild needed.
- **Immediate update**: To force a full refresh without waiting, run `npm run build` and redeploy.

Product URLs use the **slug** you set in Sanity (e.g. `/en/catalog/red-roses`). New slugs work as soon as the catalog list updates; no code changes required.

## Partner Registration & Upload

- **Public entry**: Header link “Register as a Partner” → `/[lang]/partner/register`.
- **Registration**: Form (shop name, contact, phone, LINE/WhatsApp, address, city) saves a **Partner** document in Sanity with status `pending_review`. After submit, the success page shows a dashboard link (active once approved).
- **Approval**: In Sanity Studio, open **Partner** documents and set status to **Approved** (or **Disabled**). Only approved partners can use the dashboard.
- **Partner dashboard**: `/[lang]/partner/dashboard/[partnerId]` — list of the partner’s bouquets and “Add bouquet”. Each new or edited bouquet has status `pending_review`; only **approved** bouquets appear on the public catalog (approve in Studio on the Bouquet document).
- **Bouquet form**: Name (EN/TH), description, composition, category, 1–3 images, sizes (S/M/L/XL with price, description, preparation time, availability). Images are uploaded to Sanity; on edit, leaving image fields empty keeps existing images.

## Project Structure

```
app/
  layout.tsx          # Root layout, fonts, meta
  page.tsx            # Redirects to /en
  globals.css         # Design tokens (pastels, typography)
  [lang]/
    layout.tsx        # Lang layout + Header
    page.tsx          # Home: Hero + CategoryGrid
    catalog/
      page.tsx        # Catalog grid (optional ?category=)
      [slug]/
        page.tsx      # Product: gallery, size, messenger CTAs
components/
  Header.tsx          # Logo, nav, LanguageSwitcher, MessengerLinks
  LanguageSwitcher.tsx
  MessengerLinks.tsx  # Header messenger icons
  Hero.tsx
  CategoryGrid.tsx
  BouquetCard.tsx
  ProductGallery.tsx
  SizeSelector.tsx
  MessengerOrderButtons.tsx  # Product page: order via LINE/WhatsApp/etc.
  ProductOrderBlock.tsx      # Wraps SizeSelector + MessengerOrderButtons
lib/
  i18n.ts             # Locales, translations (EN/TH)
  bouquets.ts          # Bouquet data (replace with CMS)
  messenger.ts         # Deep links + pre-filled message builder
```

## Configuration

- **Messenger links**: Edit `lib/messenger.ts` (phone, LINE @, Telegram user, Facebook page) and header links in `components/MessengerLinks.tsx`.
- **Bouquet data**: Edit `lib/bouquets.ts` or later plug in a headless CMS.
- **Translations**: Add or change strings in `lib/i18n.ts`.

## Design

- Soft pastels, rounded cards, minimal shadows
- Typography: DM Sans (UI), Cormorant Garamond (headings)
- Colors: cream background, accent gold/beige, muted text

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. **Push your code to GitHub** (if you haven’t already):
   ```bash
   git add .
   git commit -m "Prepare for Vercel"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Import the project in Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in (GitHub).
   - Click **Add New** → **Project** and import your repository.
   - Vercel will detect Next.js; leave **Build Command** as `npm run build` and **Output Directory** as default.

3. **Add environment variables**
   - In the project import screen (or later: **Project** → **Settings** → **Environment Variables**), add:
     - `NEXT_PUBLIC_SANITY_PROJECT_ID` = your Sanity project ID (e.g. `moaf1lxq`)
     - `NEXT_PUBLIC_SANITY_DATASET` = `production`
   - Apply to **Production**, **Preview**, and **Development** if you use Vercel previews.

4. **Deploy**
   - Click **Deploy**. After the build finishes, you’ll get a URL like `https://your-project.vercel.app`.

5. **Sanity CORS (required for Studio on production)**
   - In [sanity.io/manage](https://www.sanity.io/manage) → your project → **API** → **CORS origins**:
   - Add your Vercel URL, e.g. `https://your-project.vercel.app`, with **Allow credentials** enabled.
   - This lets the embedded Studio at `https://your-project.vercel.app/studio` work correctly.

6. **Optional: custom domain**
   - In Vercel: **Project** → **Settings** → **Domains** → add your domain.
   - Add that domain to Sanity CORS origins as well (e.g. `https://lannabloom.com`).
