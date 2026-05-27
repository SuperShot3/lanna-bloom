# Catalog migration runbook — Sanity → Supabase

Operational steps to cut over Lanna Bloom’s **product catalog** from Sanity to Supabase. Application code already reads/writes Supabase by default; this runbook covers **schema**, **data import**, **env**, and **smoke tests**.

## Prerequisites

- Supabase project with **orders** already on Supabase (same `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` as production).
- Sanity project still reachable for **one-time import** (read token).
- Node 18+, `npm install` (includes devDependency `@sanity/client` for import only).

## What was retired

| Retired | Replacement |
|---------|-------------|
| Sanity Studio (`/studio`, `sanity.config.ts`) | Admin dashboard (`/admin`) — product moderation, bouquet review |
| Sanity runtime reads/writes in app | `lib/catalogReads.ts`, `lib/catalogWrite.ts`, Supabase tables + Storage |
| Partner dashboard (`/[lang]/partner/dashboard`, login, products) | Redirects to home or `/[lang]/partner/apply` (application form only) |
| `SANITY_API_WRITE_TOKEN` in production | Only needed locally/Vercel **once** for `npm run import-catalog` |

`lib/sanity.ts` remains as a **rename facade** (e.g. `getBouquetsFromSanity` → Supabase). Do not re-enable `CATALOG_READ_SOURCE=sanity` or `CATALOG_WRITE_SOURCE=sanity` — the app will error.

---

## Step 1 — Apply Supabase migrations

Creates `catalog_*` tables, RLS (service role only), and public Storage bucket `catalog`.

**Files:**

- `supabase/migrations/20260526120000_catalog_tables.sql`
- `supabase/migrations/20260526120001_catalog_storage_bucket.sql`
- `supabase/migrations/20260526123000_catalog_cms_foundation.sql` (CMS images, revisions)
- `supabase/migrations/20260527120000_catalog_pricing_type.sql` (`pricing_type` replaces `product_kind`)

### Option A — Supabase Dashboard (recommended if CLI not installed)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run the full contents of `20260526120000_catalog_tables.sql`, then `20260526120001_catalog_storage_bucket.sql`.
3. Confirm tables: `catalog_partners`, `catalog_bouquets`, `catalog_products`, `catalog_site_settings`, `catalog_slug_registry`.
4. Confirm bucket: **Storage** → bucket `catalog` (public read).

### Option B — Supabase CLI

Install CLI: https://supabase.com/docs/guides/cli

```bash
cd /path/to/flower-shop
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

If the repo has **no** `supabase/config.toml` or `supabase link` was never run, use **Option A** or run `supabase init` + `supabase link` first.

### Pricing model cutover (`pricing_type`)

After base catalog migrations, apply `20260527120000_catalog_pricing_type.sql`, then normalize JSON:

```bash
npm run catalog-audit-pricing    # optional: counts by pricing_type, flags customTiers
npm run migrate-catalog-pricing:dry-run
npm run migrate-catalog-pricing
```

Bouquet pricing in admin uses **`single_price`**, **`size_based`** (S/M/L/XL), or **`stem_count`**. Main gallery images use `catalog_product_images` without `variant_key`; optional overrides use `variant_key` = `s`/`m`/`l`/`xl` or `stem_{count}`.

---

## Step 2 — Environment variables

### Local (`.env.local`)

Copy from `.env.example`. Required for import and runtime:

| Variable | Required | Notes |
|----------|----------|--------|
| `SUPABASE_URL` | Yes | Same project as orders |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only; never `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Import only | Deprecated after cutover |
| `NEXT_PUBLIC_SANITY_DATASET` | Import only | Usually `production` |
| `SANITY_API_WRITE_TOKEN` | Import only | Read access to Sanity API |

Optional (defaults are correct for cutover):

| Variable | Default | Notes |
|----------|---------|--------|
| `CATALOG_READ_SOURCE` | Supabase | Do **not** set to `sanity` |
| `CATALOG_WRITE_SOURCE` | Supabase | Do **not** set to `sanity` |

### Vercel (Production / Preview)

Set in project **Settings → Environment Variables**:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already required for orders)
- **Remove** or leave unset: `NEXT_PUBLIC_SANITY_*`, `SANITY_API_WRITE_TOKEN` after import completes
- Do **not** set `CATALOG_*_SOURCE=sanity`

Redeploy after env changes.

---

## Step 3 — Import catalog data

Script: `scripts/archive/import-catalog-from-sanity.ts`  
Idempotent: upserts by `legacy_sanity_id`; skips image re-upload when `images` JSONB already populated.

### 3a — Dry run (no writes)

```bash
npm run import-catalog:dry-run
```

Or explicitly:

```bash
npx tsx scripts/archive/import-catalog-from-sanity.ts --dry-run
```

On Windows, `npm run import-catalog -- --dry-run` may **not** pass `--dry-run` to the script; prefer `import-catalog:dry-run` or `npx tsx` above.

Expect a summary: partner/bouquet/product counts and `(no writes performed)`.

### 3b — Full import

```bash
npm run import-catalog
```

This downloads images from Sanity CDN and uploads to Supabase Storage bucket `catalog`. May take several minutes.

**Known data issue:** Sanity partners may reference deleted Supabase Auth users. The import script nulls invalid `supabase_user_id` values and logs a warning.

### 3c — Verify in Supabase

SQL Editor (sample checks):

```sql
SELECT count(*) FROM catalog_partners;
SELECT count(*) FROM catalog_bouquets WHERE status = 'approved';
SELECT count(*) FROM catalog_products WHERE moderation_status = 'live';
SELECT hero_image, jsonb_array_length(hero_carousel_images) FROM catalog_site_settings WHERE id = 'default';
```

Spot-check Storage: objects under `bouquets/`, `products/`, `partners/`, `site-settings/`.

### 3d — Homepage hero only (if catalog is already imported)

If bouquets/products are already in Supabase but `catalog_site_settings` hero fields are empty:

```bash
npm run import-hero:dry-run
npm run import-hero
```

Or use **Admin → Products → Homepage hero → Import from Sanity** (same logic; requires Sanity env vars in `.env.local`).

Manage hero images ongoing at `/admin/products/hero`.

---

## Step 4 — Smoke test checklist

Replace `BASE` with your site URL (`http://localhost:3000` locally or `https://lannabloom.shop`).

| Check | URL / action |
|-------|----------------|
| Home hero / carousel | `BASE/en` — images load (Supabase Storage URLs, not `cdn.sanity.io`) |
| Catalog listing | `BASE/en/catalog` |
| Bouquet PDP | Open a known slug from Sanity, e.g. `BASE/en/catalog/deep-romance` |
| Product PDP | e.g. plushy/balloon slug |
| Popular section | Home page “popular” strip |
| Google Merchant feed | `BASE/feeds/google.txt` — image URLs valid |
| Admin moderation | `BASE/admin` → products / moderation (login required) |
| Studio redirect | `BASE/studio` → redirects to `/admin` |
| Partner dashboard retired | `BASE/en/partner/dashboard/any` → redirects to home |
| Partner apply | `BASE/en/partner/apply` still works |
| Checkout (staging) | Add item to cart → checkout with Stripe test keys |

---

## Step 5 — Deploy

1. Migrations applied on **production** Supabase.
2. Full import run against **production** Supabase (or import on staging first, then repeat for prod).
3. Vercel env: Supabase keys set; Sanity import vars removed after success.
4. Deploy main branch; confirm smoke tests on production.

---

## Rollback

There is **no** Sanity read path in runtime anymore.

1. **Code:** `git revert` the catalog migration commit(s) and redeploy a branch that still used Sanity (if such a commit exists on `main`).
2. **Data:** Supabase catalog tables remain; reverting code does not delete them.
3. **Do not** set `CATALOG_READ_SOURCE=sanity` on current `main` — the app blocks it and will not read Sanity.

For a partial rollback during investigation, restore a Vercel deployment from before cutover; fix forward on Supabase is usually faster than re-enabling Sanity.

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `Missing env var` on import | Fill `.env.local` per Step 2 |
| `relation "catalog_*" does not exist` | Run Step 1 migrations |
| FK `catalog_partners_supabase_user_id_fkey` | Re-run import with latest script (orphan user IDs nulled) |
| Images 404 | Confirm `catalog` bucket exists and is public; re-run import for missing rows |
| Empty catalog on site | Confirm `SUPABASE_*` on Vercel; check `catalog_bouquets.status = 'approved'` |
| `CATALOG_READ_SOURCE=sanity` error | Remove var; run import |

---

## Optional — export Sanity backup

Before decommissioning Sanity:

```bash
npx tsx scripts/archive/export-catalog.ts
```

(Requires same Sanity env vars as import.)

---

## Related docs

- [ORDERS_SUPABASE.md](ORDERS_SUPABASE.md) — orders (same Supabase project)
- [ai_context/02_ARCHITECTURE_MAP.md](../ai_context/02_ARCHITECTURE_MAP.md) — catalog module locations
