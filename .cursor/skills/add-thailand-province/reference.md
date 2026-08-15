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
| **Coverage page shoppable list** | `listShoppableCoverageAreas()` in `lib/delivery/coverageDisplay.ts` (MARKETS × province by `destination_id`) |
| **Shoppable summary** | `formatShoppableProvinceSummary` — dynamic only; no hardcoded market blurbs |
| **Coverage page copy** | Province **section** fields only (`{market}Title` / `{market}Intro` / `{market}Note`, CTA). Do **not** append the market to `mapHint`, `intro`, `areasTitle`, or meta — those stay Chiang Mai–core / generic. |
| **Named amphoes / localities (SEO)** | District helper + section on `app/[lang]/delivery-areas-thailand/page.tsx` (see Lamphun / Chiang Mai) |
| **Province shop CTA** | `btn-premium` **inside** that province section only — never in the page hero or shared browse row |
| Public provinces API | `app/api/provinces/` |
| Partner province list | Already from DB — `partner/apply` |
| Sitemap market URLs | `app/sitemap.ts` |

**Chiang Mai exception:** destination `CHIANG_MAI` uses the main catalog, not a `MARKETS` path slug.

## Tier C — Amphoe map

| Check | Where |
|-------|--------|
| TopoJSON | `content/thailand-map/{province}-amphoes.topojson` (committed; live map reads this only) |
| OpenGIS cache | `content/thailand-map/.cache/` — gitignored generate-once download; never commit national GeoJSON |
| Asset notes | `content/thailand-map/README.md` |
| API route | `app/api/maps/{province}-amphoes/route.ts` (serves local TopoJSON, not OpenGIS) |
| Metadata + `ampCode` | `lib/delivery/amphoeMapData.ts` or `{province}AmphoeMapData.ts` |
| Province registry | `lib/delivery/amphoeProvinces.ts` (examples: `chiang-mai`, `lamphun`, `chon-buri`, `phuket`, `prachuap-khiri-khan`, `krabi`, `surat-thani`) |
| Fee display | `lib/delivery/amphoeDisplayFees.ts` ← `zones.ts` + destination id |
| Drill-down list helpers | `lib/delivery/amphoeMapDrilldown.ts` |
| National map gates | `components/delivery/ThailandProvinceMap.tsx` |
| Public side list | `components/delivery/ThailandCoverageMapSection.tsx` |
| Intent embeds (if any) | `components/delivery/DeliveryDistrictMap.tsx` |
| Coverage SEO amphoe names | Must match metadata on delivery-areas page — **one pill list**, not districts + duplicate neighborhoods |
| City market polygons | Every checkout zone = clickable polygon + side-list row (Lamphun UX). Do not ship a parent amphoe with nested text. |
| `relatedCheckoutZoneIds` | Chiang Mai Mueang only — not a substitute for missing polygons |
| Tests | `lib/deliveryFees.test.ts` (amphoe codes), province tests |

**City-market example:** Pattaya is destination `PATTAYA` on province `chon-buri`. Hua Hin is destination `HUA_HIN` on province `prachuap-khiri-khan`. Ao Nang is destination `KRABI` on province `krabi`. Koh Samui is destination `SAMUI` on province `surat-thani`. Map only the checkout areas. Do not add the rest of the province.

## Validate command

```bash
npm run validate:province -- chiang-mai
npm run validate:province -- chiang-mai --amphoe
npm run validate:province -- lamphun --amphoe
npm run validate:province -- chon-buri --amphoe
npm run validate:province -- phuket
npm run validate:province -- phuket --amphoe
npm run validate:province -- prachuap-khiri-khan --amphoe
npm run validate:province -- krabi --amphoe
npm run validate:province -- surat-thani --amphoe
```

## Smoke tests after launch

1. `/admin/provinces` — select province, edit status, map highlights.
2. `/en/delivery-areas-thailand` — color, panel, catalog CTA if shoppable.
3. `/en/delivery-areas-thailand` — **Currently shoppable provinces** includes the new market; amphoe/locality names visible when required; **shop CTA is inside the province section** (`btn-premium`), not the hero.
4. Header destination / market links (Tier B).
5. Chiang Mai amphoe hover + click + list sync (always regression).
6. Other amphoe-capable provinces (Lamphun, Chon Buri / Pattaya, Phuket, Hua Hin, Krabi / Ao Nang, Koh Samui) still drill down correctly — each checkout area clickable, no nested non-clickable rows.
