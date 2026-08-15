# Guides / Info Articles — Add a New Article (EN + TH)

This is the **only** place to publish new articles on the website. Public URL: `/{lang}/info/{slug}`.

Use `flowers-for-men` or `flower-delivery-to-hotels-chiang-mai` as a current MDX example.

Do **not** create new `/guides/` routes (those URLs 301 to `/info/`). Do **not** add new bespoke TSX article pages. Two legacy comparison pages already exist (`birthday-flower-gift`, `perfect-bouquet-someone-special`); leave them unless you are editing those pages.

---

### Step 1: Add the article to the registry (EN + TH)

**File:** `app/[lang]/info/_data/articles.ts`

1. Open the file and find the `articles` array.
2. Add **one** new object with **both EN and TH fields**:

```ts
{
  slug: 'your-article-slug',          // URL-friendly, lowercase, hyphens
  title: 'Your Article Title',        // English title
  excerpt: 'Short description for cards and SEO (1–2 sentences).',
  titleTh: 'ชื่อบทความภาษาไทย',
  excerptTh: 'คำอธิบายสั้น ๆ ภาษาไทย (1–2 ประโยค) สำหรับการ์ดและ SEO',
  publishedAt: '2026-02-19T00:00:00.000Z', // ISO date
  featured: false,                    // true = shown in featured section at top
  cover: {
    type: 'gradient',
    gradientCss: 'linear-gradient(135deg, #f5e6e8 0%, #e8dfd0 50%, #e8f0ed 100%)',
    center: { kind: 'emoji', value: '🌸' },
  },
},
```

Cover options:

- Gradient: `type: 'gradient'`, `gradientCss`, `center: { kind: 'emoji', value: '🌸' }` (or `kind: 'text'`)
- Image: `type: 'image'`, `src: '/images/cover.jpg'`, `alt: 'Description'`

The sitemap reads this registry automatically. You do not need to edit `app/sitemap.ts`.

---

### Step 2: Create the English article body

**File:** `content/info/your-article-slug.en.mdx`

The page title is taken from the registry, so start with intro text. Use `##` and `###` headings. Promote products with `<CatalogProductCard slug="exact-catalog-slug" />`.

---

### Step 3: Create the Thai article body

**File:** `content/info/your-article-slug.th.mdx`

Keep the same structure as English (same headings order).

---

### Step 4: Register the slug for static generation

**File:** `app/[lang]/info/[slug]/page.tsx`

Add your slug to the slugs array inside `generateStaticParams`.

---

## Checklist

- `articles.ts` has one object with `title`/`titleTh` + `excerpt`/`excerptTh`
- `content/info/[slug].en.mdx` created
- `content/info/[slug].th.mdx` created
- slug added to `generateStaticParams`

To change which article is featured, set `featured: true` on that article and `featured: false` on the others. Only one should be `featured: true`.
