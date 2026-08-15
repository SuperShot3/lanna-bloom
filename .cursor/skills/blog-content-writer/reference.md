# Product lookup for `/info/` articles

Read this when choosing `CatalogProductCard` slugs. Catalog lives in Supabase, not in this repo—do not invent slugs and do not copy the last article.

## 1. Build the candidate pool

Do these lookups **before** writing MDX.

### Favorites / Popular picks (primary)

Homepage row titled **Popular picks** (Thai: **สินค้ายอดนิยม**).

- Live: `https://lannabloom.shop/en` (and `/{lang}` market homepages). Cards in that row are staff favorites.
- Code: `featuredPopular === true` on bouquets. Admin label: “Show as popular on homepage”. Loaded by `getCatalogPopularBouquets` in `lib/catalogReads.ts`.
- Storefront cue: “Popular” badge (`popularPickBadge`).

Fetch the homepage and collect those bouquet names + catalog slugs (`/{lang}/catalog/[slug]`).

### Top selling (secondary)

Items with a public sold count.

- Storefront cue: “X sold” / Thai “ขายแล้ว X” (`soldCount`). Shown only when paid units ≥ 5 (`MIN_PUBLIC_SOLD_COUNT` in `lib/catalog/paidSalesCountsLogic.ts`).
- Live: homepage Popular cards, catalog listing `https://lannabloom.shop/en/catalog`, and product pages.
- Prefer higher sold counts that still match the article topic.

### User-named products

If the user gives names or URLs, use those first. Resolve to **exact** catalog slugs and confirm the product page loads.

## 2. Match this article, not a generic set

From the pool, pick 4–6 that fit **this** topic. Examples:

| Article angle | Prefer from the pool |
| --- | --- |
| Romance, hotels, anniversaries | Popular/top-selling roses or mixed romantic bouquets |
| Birthday, congratulations, cheerful gifts | Sunflowers, mixed bright, pink—only if they are in the pool |
| Hospitals, sympathy, low fragrance | Mixed, softer colors, plants; skip heavy red-rose romance unless the reader asked for it |
| Men, office, respect | Orchids, sunflowers, lilies from the pool |
| Mother’s Day, thank-you | Pink, orchids, mixed from the pool |
| City delivery (Phuket, Samui, Hua Hin, Pattaya, …) | A **varied** mix from the pool (romantic + cheerful + mixed). Different cities must not share the same five slugs. |
| Teddy / gift add-ons | Top-selling plush or balloons from the catalog, not random flowers |

If the pool has nothing on-topic, widen to other live catalog items that match the intent, and say so in the Product Selection Log. Never pad with unrelated popular roses.

## 3. Do not repeat recent articles

```bash
rg 'CatalogProductCard slug=' content/info/*.en.mdx
```

- If a slug already appears in several recent posts, prefer a different Popular pick or top seller for the new article.
- City delivery articles must not all use: `red-rose-romance`, `gentle-pink-rose-bouquet`, `sunflower-bouquet`, `sunny-happiness-mix`, `rustic-rose-bouquet`.
- EN and TH files for the **same** slug should use the same product cards.

## 4. Verify slugs

Each slug must resolve on the live catalog:

`https://lannabloom.shop/en/catalog/[slug]`

Wrong hyphens, `and`, or word order will render a blank card. Copy the slug from the live URL, not from memory.

## 5. Product Selection Log (required in the handoff)

For every embedded card:

- Slug
- Name (EN)
- Source: `user` | `popular-pick` | `top-seller` (and `catalog-match` only if the pool had no fit)
- One-line reason it fits **this** article
