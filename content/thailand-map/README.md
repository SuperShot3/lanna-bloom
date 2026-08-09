# Thailand map assets

| File | Use |
|------|-----|
| `thailand-provinces.topojson` | National province coverage map (GADM-style `NAME_1`) |
| `chiang-mai-amphoes.topojson` | Chiang Mai amphoe fee finder (Leaflet) |

## `chiang-mai-amphoes.topojson`

- Source: [OpenGISData-Thailand](https://github.com/chingchai/OpenGISData-Thailand) `districts.geojson`, filtered to `pro_code == "50"`
- Properties used: `amp_code`, `amp_en`, `amp_th`, `pro_code`
- Simplified with Mapshaper (Douglas–Peucker) for storefront payload size
- Served by `/api/maps/chiang-mai-amphoes`

Do not commit the full national OpenGIS `districts.geojson`.
