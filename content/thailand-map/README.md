# Thailand map assets

| File | Use |
|------|-----|
| `thailand-provinces.topojson` | National province coverage map (GADM-style `NAME_1`) |
| `chiang-mai-amphoes.topojson` | Chiang Mai amphoe fee finder (Leaflet) |
| `lamphun-amphoes.topojson` | Lamphun amphoe fee finder (Leaflet) |
| `chon-buri-amphoes.topojson` | Pattaya / Bang Lamung amphoe fee finder (Leaflet) — not all of Chon Buri |

## Amphoe TopoJSON (`*-amphoes.topojson`)

- Source: [OpenGISData-Thailand](https://github.com/chingchai/OpenGISData-Thailand) `districts.geojson`
- Filter by province `pro_code` (`50` Chiang Mai, `51` Lamphun, `20` Chon Buri)
- Chon Buri is a **Bang Lamung-only** subset (`amp_code` `2004`) for the Pattaya market. Do not include Si Racha, Mueang Chon Buri, Sattahip, or other amphoes.
- Properties used: `amp_code`, `amp_en`, `amp_th`, `pro_code`
- Topology object name must be `districts` (Leaflet client expects this)
- Simplified with Mapshaper (Douglas–Peucker) for storefront payload size. Bang Lamung source geometry is already coarse (~84 vertices); conversion kept those vertices.
- Served by `/api/maps/{province_code}-amphoes`

Do not commit the full national OpenGIS `districts.geojson`.
