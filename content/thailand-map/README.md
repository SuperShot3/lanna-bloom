# Thailand map assets

| File | Use |
|------|-----|
| `thailand-provinces.topojson` | National province coverage map (GADM-style `NAME_1`) |
| `chiang-mai-amphoes.topojson` | Chiang Mai amphoe fee finder (Leaflet) |
| `lamphun-amphoes.topojson` | Lamphun amphoe fee finder (Leaflet) |

## Amphoe TopoJSON (`*-amphoes.topojson`)

- Source: [OpenGISData-Thailand](https://github.com/chingchai/OpenGISData-Thailand) `districts.geojson`
- Filter by province `pro_code` (`50` Chiang Mai, `51` Lamphun)
- Properties used: `amp_code`, `amp_en`, `amp_th`, `pro_code`
- Topology object name must be `districts` (Leaflet client expects this)
- Simplified with Mapshaper (Douglas–Peucker) for storefront payload size
- Served by `/api/maps/{province_code}-amphoes`

Do not commit the full national OpenGIS `districts.geojson`.
