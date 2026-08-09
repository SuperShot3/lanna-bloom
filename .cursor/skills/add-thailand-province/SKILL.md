---
name: add-thailand-province
description: >-
  Open or activate a Thai province on Lanna Bloom (status-only, orderable market,
  or amphoe map drill-down). Use when adding a province, wiring destination/zones/nav,
  enabling catalog access, or extending amphoe coverage beyond Chiang Mai.
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

Most new opens are **A then B**. Use **C** only when amphoe drill-down is required (today: Chiang Mai only).

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
   - Add `MARKETS` entry (path slug, names, `status`) for Header/Footer/sitemap (Chiang Mai uses main catalog — no market path slug).
4. **Zones / fees** — [`lib/delivery/zones.ts`](../../../lib/delivery/zones.ts): at least one zone under `ZONES_BY_DESTINATION` (`getZoneFee` is fee SoT).
5. **SEO landing** — follow existing `app/[lang]/(markets)/[market]/flower-delivery/` pattern when the market is route-available.
6. **Partner apply** — already lists all DB provinces; no duplicate roster.
7. Run validate; test Header destination picker, coverage map, and admin edit for that province.
8. Finish messaging / catalog_enabled / timing in **`/admin/provinces`**.

## Tier C — Amphoe map drill-down

1. Complete Tier B for checkout fees first (amphoe fills derive from zones).
2. Filter OpenGIS districts by province `pro_code` → `content/thailand-map/{province}-amphoes.topojson` (see [`content/thailand-map/README.md`](../../../content/thailand-map/README.md)).
3. Add `/api/maps/...-amphoes` route (mirror Chiang Mai).
4. Add amphoe metadata + `ampCode` join (mirror [`lib/delivery/amphoeMapData.ts`](../../../lib/delivery/amphoeMapData.ts)).
5. **Generalize** hard-coded `chiang-mai` gates in:
   - [`ThailandProvinceMap.tsx`](../../../components/delivery/ThailandProvinceMap.tsx)
   - [`ThailandCoverageMapSection.tsx`](../../../components/delivery/ThailandCoverageMapSection.tsx)
   - Do **not** fork a second national map component.
6. Keep `mode="admin"` working: amphoe click must not clear province selection used by the admin edit form.
7. Run `npm run validate:province -- <code> --amphoe`.
8. Regression: Chiang Mai amphoe hover, select, zoom, list sync on public page.

---

## Admin vs public map (alignment)

Shared component: [`ThailandProvinceMap.tsx`](../../../components/delivery/ThailandProvinceMap.tsx).

| | Admin `/admin/provinces` | Public `/delivery-areas-thailand` |
|--|--------------------------|-----------------------------------|
| Component | `mode="admin"` | `mode="public"` via coverage section |
| Geometry | Same national TopoJSON + CM amphoe overlay | Same |
| Colors | Province `status` | Same |
| “Map settings” | Province fields (status, catalog, cutoff, messages…) — **not** separate Leaflet config | Side panel + amphoe fee list |
| Amphoe fees list | Not shown (edit form is enough) | Yes — public coverage UX |

After map UX changes, verify **both** admin map selection and public coverage page. Camera/hover/style fixes in the shared component apply to both modes.

---

## Done criteria

- Validate script passes for the claimed tier.
- Chiang Mai behavior unchanged unless Tier C intentionally touches shared gates.
- Customer messaging matches real service level (no false same-day).
- User knows which remaining steps are **admin-only**.
