# Province launch — file checklist

Use with the `add-thailand-province` skill. Paths are repo-root relative.

## Tier A — Status only

| Check | Where |
|-------|--------|
| Province row exists | `lib/provinces/seedRoster.ts` |
| Live status / catalog / messages | `/admin/provinces` (Supabase `provinces`) |
| Map color updates | Shared `ThailandProvinceMap` (admin + public) |
| Do **not** change | `destination_id` via admin PATCH |

## Tier B — Orderable market

| Check | Where |
|-------|--------|
| `destination_id` on seed row | `lib/provinces/seedRoster.ts` |
| DB matches seed | migration / `scripts/generate-provinces-migration.ts` |
| Destination id union | `lib/delivery/markets.ts` → `DELIVERY_DESTINATIONS` |
| Nav / footer / sitemap market | `lib/delivery/markets.ts` → `MARKETS` (+ `getNavMarkets` / `getActiveMarkets`) |
| Header / Footer consumers | `components/Header.tsx`, `components/Footer.tsx` |
| Zones + fees | `lib/delivery/zones.ts` → `ZONES_BY_DESTINATION` |
| Market SEO page | `app/[lang]/(markets)/[market]/flower-delivery/` |
| Coverage / catalog href | `lib/delivery/coverageDisplay.ts`, shop access helpers |
| Public provinces API | `app/api/provinces/` |
| Partner province list | Already from DB — `partner/apply` |
| Sitemap market URLs | `app/sitemap.ts` |

**Chiang Mai exception:** destination `CHIANG_MAI` uses the main catalog, not a `MARKETS` path slug.

## Tier C — Amphoe map

| Check | Where |
|-------|--------|
| TopoJSON | `content/thailand-map/{province}-amphoes.topojson` |
| Asset notes | `content/thailand-map/README.md` |
| API route | `app/api/maps/...-amphoes/route.ts` |
| Metadata + `ampCode` | e.g. `lib/delivery/amphoeMapData.ts` pattern |
| Fee display | `lib/delivery/amphoeDisplayFees.ts` ← `zones.ts` |
| Drill-down list helpers | generalize `lib/delivery/chiangMaiMapDrilldown.ts` |
| National map gates | `components/delivery/ThailandProvinceMap.tsx` |
| Public side list | `components/delivery/ThailandCoverageMapSection.tsx` |
| Intent embeds (if any) | `components/delivery/DeliveryDistrictMap.tsx` |
| Tests | `lib/deliveryFees.test.ts` (amphoe codes), province tests |

## Validate command

```bash
npm run validate:province -- chiang-mai
npm run validate:province -- chiang-mai --amphoe
npm run validate:province -- phuket
```

## Smoke tests after launch

1. `/admin/provinces` — select province, edit status, map highlights.
2. `/en/delivery-areas-thailand` — color, panel, catalog CTA if shoppable.
3. Header destination / market links (Tier B).
4. Chiang Mai amphoe hover + click + list sync (always regression).
