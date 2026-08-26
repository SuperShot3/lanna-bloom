# Thailand map assets

| File | Use |
|------|-----|
| `thailand-provinces.topojson` | National province coverage map (GADM-style `NAME_1`) |
| `chiang-mai-amphoes.topojson` | Chiang Mai amphoe fee finder (Leaflet) |
| `lamphun-amphoes.topojson` | Lamphun amphoe fee finder (Leaflet) |
| `chon-buri-amphoes.topojson` | Pattaya checkout areas (Leaflet) — not all of Chon Buri |
| `phuket-amphoes.topojson` | Phuket listed checkout areas (Leaflet) — dissolved OpenGIS tambons |
| `prachuap-khiri-khan-amphoes.topojson` | Hua Hin checkout areas (Leaflet) — not all of Prachuap Khiri Khan |
| `krabi-amphoes.topojson` | Ao Nang / Krabi listed checkout areas (Leaflet) — not all of Krabi |
| `surat-thani-amphoes.topojson` | Koh Samui listed checkout areas (Leaflet) — not all of Surat Thani |
| `bangkok-amphoes.topojson` | Bangkok listed checkout areas (Leaflet) — 50 khet dissolved onto 10 zones |

## Amphoe TopoJSON (`*-amphoes.topojson`)

- Source: [OpenGISData-Thailand](https://github.com/chingchai/OpenGISData-Thailand) `districts.geojson` / `subdistricts.geojson`
- Filter by province `pro_code` (`50` Chiang Mai, `51` Lamphun, `20` Chon Buri, `83` Phuket, `77` Prachuap Khiri Khan, `81` Krabi, `84` Surat Thani, `10` Bangkok)
- Chon Buri is **Pattaya areas only** (not Si Racha, Mueang Chon Buri, or the rest of Sattahip):
  - OpenGIS tambons: Na Kluea `200408`, Nong Prue `200402`, Na Chom Thian `200902`
  - Pattaya special-admin tambon `200409` is sliced by latitude into Central `200491`, South / Walking Street `200492`, Pratumnak `200493`, Jomtien `200494` so each checkout zone is a clickable map polygon
- Phuket is **listed checkout areas** (not 3 amphoe blobs). OpenGIS tambons are dissolved onto the 11 `ZONES_BY_DESTINATION.PHUKET` zones. Join keys are tambon codes (e.g. Town `830101`, Patong `830202`). OpenGIS has no Wichit (`830104`).
- Prachuap Khiri Khan is **Hua Hin listed areas only** (not Pran Buri, Sam Roi Yot, Mueang, or inland tambons Nong Phlap / Huai Sat Yai / Bueng Nakhon):
  - OpenGIS tambons: Hin Lek Fai `770703`, Thap Tai `770705`
  - Tambon Hua Hin `770701` is sliced by latitude into Center `770791` and Bo Fai / Airport `770792`
  - Tambon Nong Kae `770702` is sliced by latitude into Khao Takiab / Nong Kae `770793` and Hua Don `770794`
- Krabi is **Ao Nang listed areas only** (not Koh Lanta, Ao Luek, Khao Phanom, Nuea Khlong, or island fragments of tambon Ao Nang):
  - OpenGIS tambon Pak Nam `810101` is Krabi Town (OpenGIS has no Krabi Yai `810102`)
  - OpenGIS tambon Khao Thong `810106` is Khao Thong
  - Mainland tambon Ao Nang `810116` is sliced by latitude into Center `810191` and Noppharat Thara `810192`
  - Tambon Nong Thale `810117` is sliced by latitude into Klong Muang `810193` and Tubkaek `810194`
- Bangkok is **listed checkout areas** covering all 50 khet (not Nonthaburi, Samut Prakan, or Pathum Thani). OpenGIS subdistricts (`pro_code` 10) are dissolved onto the 10 `ZONES_BY_DESTINATION.BANGKOK` zones. Join keys are representative khet codes (e.g. Old City `1001`, Sukhumvit `1033`).
- Surat Thani is **Koh Samui listed areas only** (not Ko Pha-ngan, Don Sak, Mueang, tambon Na Mueang, Ang Thong National Park islands, or Koh Tan):
  - OpenGIS tambons: Ang Thong `840401` (mainland Na Thon only), Mae Nam `840407`
  - Lipa Noi `840402` + mainland Taling Ngam `840403` dissolve to Lipa Noi / Taling Ngam `840491`
  - Tambon Maret `840405` is sliced by latitude into Lamai `840492` and Hua Thanon `840493`
  - Tambon Bo Phut `840406` is sliced by longitude/latitude into Bo Phut / Fisherman `840494`, Bangrak / Choeng Mon `840495`, and Chaweng `840496`
- Properties used: `amp_code`, `amp_en`, `amp_th`, `pro_code`
- Topology object name must be `districts` (Leaflet client expects this)
- Simplified with Mapshaper (Douglas–Peucker) for storefront payload size
- Served by `/api/maps/{province_code}-amphoes`

Do not commit the full national OpenGIS `districts.geojson` or `subdistricts.geojson`.

## OpenGIS cache (generate-once)

Download national OpenGIS files once into `content/thailand-map/.cache/` (gitignored). Reuse that cache when filtering a province; do not re-download on every generation. Live `/api/maps/{province}-amphoes` routes must read the committed TopoJSON only.
