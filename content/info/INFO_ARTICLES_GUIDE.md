# Guides / Info Articles — Add a New Article (EN + TH)

This guide shows the **only** steps you need to add a new Info Article to the repo with **both languages from day one** (English + Thai). Use `how-to-order-flower-delivery-chiang-mai` as the reference example.

---

### Step 1: Add the article to the registry (EN + TH)

**File:** `app/[lang]/info/_data/articles.ts`

1. Open the file and find the `articles` array.
2. Add **one** new object with **both EN and TH fields**:

```ts
{
  slug: 'your-article-slug',          // URL-friendly, lowercase, hyphens (e.g. birthday-flowers)
  title: 'Your Article Title',        // English title
  excerpt: 'Short description for cards and SEO (1–2 sentences).', // English excerpt
  titleTh: 'ชื่อบทความภาษาไทย',        // Thai title
  excerptTh: 'คำอธิบายสั้น ๆ ภาษาไทย (1–2 ประโยค) สำหรับการ์ดและ SEO', // Thai excerpt
  publishedAt: '2026-02-19T00:00:00.000Z', // ISO date
  featured: false,                    // true = shown in featured section at top
  cover: {
    type: 'gradient',                 // cover style type (use "gradient" for now)
    gradientCss: 'linear-gradient(135deg, #f5e6e8 0%, #e8dfd0 50%, #e8f0ed 100%)', // CSS gradient string
    center: { kind: 'emoji', value: '🌸' }, // center icon (emoji)
  },
},
Cover options:

Gradient: type: 'gradient', gradientCss, center: { kind: 'emoji', value: '🌸' } (or kind: 'text')

Image: type: 'image', src: '/images/cover.jpg', alt: 'Description'

---

### Step 2: Create the English article body
File: content/info/your-article-slug.en.mdx

Create a new file in content/info/ named: [slug].en.mdx

The page title is taken from the registry, so start with intro text.

Use ## and ### headings.

Your intro paragraph here. No need to repeat the title.

## Section Heading

Content...

### Subsection

More content...

---

### Step 3: Create the Thai article body
File: content/info/your-article-slug.th.mdx

Create a new file in content/info/ named: [slug].th.mdx

Keep the same structure as English (same headings order).

ย่อหน้าเกริ่นนำ ไม่ต้องใส่ชื่อบทความซ้ำ

## หัวข้อหลัก

เนื้อหา...

### หัวข้อย่อย

เนื้อหาเพิ่มเติม...

---

### Step 4: Register the slug for static generation
File: app/[lang]/info/[slug]/page.tsx

Add your slug to the slugs array inside generateStaticParams:

const slugs = [
  'how-to-order-flower-delivery-chiang-mai',
  'rose-bouquets-chiang-mai',
  'same-day-flower-delivery-chiang-mai',
  'your-article-slug', // ← Add this
];

---

### Step 5: (Optional) Add to sitemap
File: app/sitemap.ts

Add the new article under each locale block if you want it indexed.

## Checklist
 articles.ts has one object with title/titleTh + excerpt/excerptTh

 content/info/[slug].en.mdx created

 content/info/[slug].th.mdx created

 slug added to generateStaticParams

 (optional) added to app/sitemap.ts


 1. Featured article (top section) Та которая самая большая ( изменить Феатуре на тру)
The article with featured: true is shown in the large section at the top.
File: app/[lang]/info/_data/articles.ts
{  slug: 'how-to-order-flower-delivery-chiang-mai',  // ...  
 featured: true,   // ← This one appears in the big section at top},
 {  slug: 'rose-bouquets-chiang-mai',  // ...  
   featured: false,  // ← Shown in the grid below},


To change which article is featured, set featured: true on that article and featured: false on the others. Only one should be featured: true.