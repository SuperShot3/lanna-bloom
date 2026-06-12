# Occasion Migration (string → array)

After deploying the multi-occasion schema, existing bouquet documents may still have `occasion` as a single string. The app handles both formats (backward compatible), but for consistency you can run this optional migration.

## When to run

- After deploying the updated Sanity schema
- After verifying the website works with both old and new data
- Optional: run when convenient; the site works without it

## Prerequisites

- `.env.local` with `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_WRITE_TOKEN`

## Run

```bash
npx tsx scripts/migrate_occasion_to_array.ts
```

## What it does

- Converts `occasion: "birthday"` → `occasion: ["birthday"]`
- Skips documents that already have `occasion` as an array
- Skips documents with no occasion
- Does not delete or overwrite existing arrays

## Safe to re-run

Yes. The script skips documents that are already migrated.
