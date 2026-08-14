---
name: add-thailand-province
description: >-
  Open or activate a Thai province on Lanna Bloom (status-only, orderable market,
  or amphoe map drill-down). Use when adding a province, wiring destination/zones/nav,
  enabling catalog access, extending amphoe coverage beyond Chiang Mai, or mapping
  a city market (every checkout area must be a clickable polygon).
---

# Add Thailand Province

## Purpose

Make province launches repeatable and complete. Follow launch **tiers** in order. Do not invent a second website, checkout, or map stack.

After code changes, run:

```bash
npm run validate:province -- <province_code>
# amphoe claim:
npm run validate:province -- <province_code> --amphoe
```

## Before editing

1. Ask which **tier** (A / B / C) and the `province_code` (e.g. `chiang-rai`).
2. Read [`docs/thailand-expansion/README.md`](../../../docs/thailand-expansion/README.md) and this skill’s [`reference.md`](reference.md).
3. Inspect existing code for that province — do not duplicate registries.

## Launch tiers

| Tier | Meaning | Code? | Admin? |
|------|---------|-------|--------|
| **A — Status only** | Coming Soon → Pre-order / Next-day / Same-day / Unavailable | No (row already in seed) | Yes `/admin/provinces` |
| **B — Orderable market** | Customers can shop via destination + fees + nav/SEO | Yes | Then status/catalog in admin |
| **C — Amphoe map** | District polygons + fees on coverage map | Yes (generalize CM-only gates) | Status colors still from admin |

Most new opens are **A then B**. Use **C** when amphoe drill-down is required (today: Chiang Mai, Lamphun, Chon Buri / Pattaya).

## Out of scope (never do unless explicitly approved)

- Reintroduce Sanity for provinces
- Partner self-service dashboard
- Hardcoding map fee amounts outside `zones.ts` / `amphoeDisplayFees`
- Promising nationwide same-day delivery
- Creating a separate map or checkout per province

---

## Tier A — Status only

1. Confirm province exists in [`lib/provinces/seedRoster.ts`](../../../lib/provinces/seedRoster.ts).
2. Instruct the user to set status / catalog / cutoff / messages in **`/admin/provinces`**.
3. `destination_id` is **read-only in admin** — do not PATCH it; that is Tier B.
4. Run `npm run validate:province -- <code>` (expect status-only OK).
5. Spot-check public `/en/delivery-areas-thailand` map color vs admin.

## Tier B — Orderable market

Edit in this order:

1. **Seed** — set `destination_id` on the province row in `seedRoster.ts` (must match a `DeliveryDestinationId`).
2. **Migration** — regenerate or add a follow-up migration via [`scripts/generate-provinces-migration.ts`](../../../scripts/generate-provinces-migration.ts) / documented DB update so production `provinces.destination_id` matches.
3. **Destinations / markets** — [`lib/delivery/markets.ts`](../../../lib/delivery/markets.ts):
   - Add to `DELIVERY_DESTINATIONS` if new.
   - Add `MARKETS` entry (`pathSlug`, names, `status: 'active'`) for Header/Footer/sitemap (Chiang Mai uses main catalog — no market path slug).
4. **Zones / fees** — [`lib/delivery/zones.ts`](../../../lib/delivery/zones.ts): at least one zone under `ZONES_BY_DESTINATION` (`getZoneFee` is fee SoT).
5. **SEO landing** — market route `app/[lang]/(markets)/[market]/flower-delivery/` works once `MARKETS` is wired.
6. **Coverage page content (required)** — update [`lib/landingPages/flowerDeliveryThailand.ts`](../../../lib/landingPages/flowerDeliveryThailand.ts) + [`app/[lang]/delivery-areas-thailand/page.tsx`](../../../app/[lang]/delivery-areas-thailand/page.tsx):
   - Active `MARKETS` feed `listShoppableCoverageAreas()` (join by `destination_id`).
   - Summaries are **dynamic** (`status · categories · from ฿minFee`) via `formatShoppableProvinceSummary` — do **not** hardcode market blurbs like “Bouquet delivery only”.
   - Update customer copy (`mapHint`, `intro`, meta) so the province is named honestly (service level + fee floor).
   - If the province has named amphoes/localities for SEO, add a district helper (mirror `getLamphunDeliveryDistricts`) and a visible **province section** on the coverage page.
   - **Shop CTA placement:** put a `btn-premium` shop link **inside that province section** (title → intro → CTA → amphoe/locality list). Do **not** add province shop buttons to the page hero or the shared browse-link row. Mirror Chiang Mai (`/{lang}/catalog`) and Lamphun (`/{lang}/{slug}/flower-delivery`).
7. **Partner apply** — already lists all DB provinces; no duplicate roster.
8. Run validate; test Header destination picker, coverage map, shoppable list, province-section CTAs, and admin edit for that province.
9. Finish messaging / catalog_enabled / timing in **`/admin/provinces`**.

## Tier C — Amphoe map drill-down

1. Complete Tier B for checkout fees first (amphoe fills derive from zones).
2. Generate amphoe TopoJSON **once** from OpenGIS (see **OpenGIS generate-once** below) → commit `content/thailand-map/{province}-amphoes.topojson` (see [`content/thailand-map/README.md`](../../../content/thailand-map/README.md)).
3. Add `/api/maps/...-amphoes` route that **serves the committed TopoJSON** (mirror Chiang Mai / Lamphun / Chon Buri). Never fetch OpenGIS at runtime.
4. Add amphoe metadata + `ampCode` join (mirror [`lamphunAmphoeMapData.ts`](../../../lib/delivery/lamphunAmphoeMapData.ts) / [`chonBuriAmphoeMapData.ts`](../../../lib/delivery/chonBuriAmphoeMapData.ts) / [`amphoeMapData.ts`](../../../lib/delivery/amphoeMapData.ts)).
5. Register the province in [`lib/delivery/amphoeProvinces.ts`](../../../lib/delivery/amphoeProvinces.ts) (shared gates — do **not** hard-code a single province in the map).
6. Wire fee display via [`amphoeDisplayFees.ts`](../../../lib/delivery/amphoeDisplayFees.ts) with the correct `destinationId`.
7. Keep `mode="admin"` working: amphoe click must not clear province selection used by the admin edit form.
8. Coverage page: one pill list from the same district helper as map metadata (see Tier B step 6). Do **not** add a second neighborhood list that duplicates checkout zones.
9. Run `npm run validate:province -- <code> --amphoe`.
10. Regression: Chiang Mai, Lamphun, and Chon Buri (Pattaya) hover, select, zoom, list sync on public page.

### City markets (required)

Some destinations are a **city market**, not a full-province amphoe map (example: Pattaya → province `chon-buri`, destination `PATTAYA`). Tier C still applies, with these extra rules:

- **Every checkout zone** in `ZONES_BY_DESTINATION` must be a first-class map district: **one clickable polygon + one side-list row**. Match Lamphun UX.
- Do **not** ship one parent amphoe blob (e.g. Bang Lamung) with nested non-clickable neighborhood text.
- `relatedCheckoutZoneIds` is for **Chiang Mai Mueang only**. It is not a substitute for missing polygons.
- Coverage pills must come from the map district helper (e.g. `getPattayaDeliveryDistricts`), not a second neighborhood helper.
- Do not map the rest of the province unless that market actually delivers there (Pattaya: no Si Racha / Mueang Chon Buri / rest of Sattahip).

### OpenGIS generate-once

- OpenGIS national `districts.geojson` / `subdistricts.geojson` is **generation-only**.
- Download once into `content/thailand-map/.cache/` (gitignored). Reuse the cache; do not re-download on every generation.
- Filter by `pro_code`, simplify with Mapshaper, commit **only** `{province}-amphoes.topojson`.
- Do **not** commit the national GeoJSON. Live map APIs read the committed TopoJSON only.

---

## Admin vs public map (alignment)

Shared component: [`ThailandProvinceMap.tsx`](../../../components/delivery/ThailandProvinceMap.tsx).

| | Admin `/admin/provinces` | Public `/delivery-areas-thailand` |
|--|--------------------------|-----------------------------------|
| Component | `mode="admin"` | `mode="public"` via coverage section |
| Geometry | Same national TopoJSON + amphoe overlay for capable provinces | Same |
| Colors | Province `status` | Same |
| “Map settings” | Province fields (status, catalog, cutoff, messages…) — **not** separate Leaflet config | Side panel + amphoe fee list |
| Amphoe fees list | Not shown (edit form is enough) | Yes — public coverage UX |
| Shoppable list / SEO names | N/A | `flowerDeliveryThailand.ts` + page sections |

After map UX changes, verify **both** admin map selection and public coverage page. Camera/hover/style fixes in the shared component apply to both modes.

---

## Done criteria

- Validate script passes for the claimed tier.
- Chiang Mai behavior unchanged unless Tier C intentionally touches shared gates.
- Customer messaging matches real service level (no false same-day).
- `/en/delivery-areas-thailand` lists the province under **Currently shoppable provinces** (via `listShoppableCoverageAreas`), shows amphoe/locality names when required, and places the **shop CTA inside the province section** (not the hero).
- City markets: every checkout zone is clickable on the map and listed once (no parent-amphoe + nested neighborhoods).
- User knows which remaining steps are **admin-only**.
