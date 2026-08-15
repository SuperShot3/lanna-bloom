# Thailand map assets

| File | Use |
|------|-----|
| `thailand-provinces.topojson` | National province coverage map (GADM-style `NAME_1`) |
| `chiang-mai-amphoes.topojson` | Chiang Mai amphoe fee finder (Leaflet) |
| `lamphun-amphoes.topojson` | Lamphun amphoe fee finder (Leaflet) |
| `chon-buri-amphoes.topojson` | Pattaya checkout areas (Leaflet) — not all of Chon Buri |
| `phuket-amphoes.topojson` | Phuket listed checkout areas (Leaflet) — dissolved OpenGIS tambons |

## Amphoe TopoJSON (`*-amphoes.topojson`)

- Source: [OpenGISData-Thailand](https://github.com/chingchai/OpenGISData-Thailand) `districts.geojson` / `subdistricts.geojson`
- Filter by province `pro_code` (`50` Chiang Mai, `51` Lamphun, `20` Chon Buri, `83` Phuket)
- Chon Buri is **Pattaya areas only** (not Si Racha, Mueang Chon Buri, or the rest of Sattahip):
  - OpenGIS tambons: Na Kluea `200408`, Nong Prue `200402`, Na Chom Thian `200902`
  - Pattaya special-admin tambon `200409` is sliced by latitude into Central `200491`, South / Walking Street `200492`, Pratumnak `200493`, Jomtien `200494` so each checkout zone is a clickable map polygon
- Phuket is **listed checkout areas** (not 3 amphoe blobs). OpenGIS tambons are dissolved onto the 11 `ZONES_BY_DESTINATION.PHUKET` zones. Join keys are tambon codes (e.g. Town `830101`, Patong `830202`). OpenGIS has no Wichit (`830104`).
- Properties used: `amp_code`, `amp_en`, `amp_th`, `pro_code`
- Topology object name must be `districts` (Leaflet client expects this)
- Simplified with Mapshaper (Douglas–Peucker) for storefront payload size
- Served by `/api/maps/{province_code}-amphoes`

Do not commit the full national OpenGIS `districts.geojson` or `subdistricts.geojson`.

## OpenGIS cache (generate-once)

Download national OpenGIS files once into `content/thailand-map/.cache/` (gitignored). Reuse that cache when filtering a province; do not re-download on every generation. Live `/api/maps/{province}-amphoes` routes must read the committed TopoJSON only.
