# SEO keyword map (Lanna Bloom)

Primary intent → one owner URL. Support pages link to the owner; they must not reuse the owner’s exact H1.

| Primary intent | Owner URL |
|---|---|
| Flower delivery Chiang Mai / buy flowers online CM | `/en` (homepage) · `/th` |
| Chiang Mai delivery areas & fees (map) | `/en/delivery-areas-chiang-mai` |
| Flower delivery {City} | `/en/{city}/flower-delivery` (active markets only) |
| Same-day flower delivery Chiang Mai | `/en/info/same-day-flower-delivery-chiang-mai` |
| Rose delivery Chiang Mai | `/en/collections/roses-chiang-mai` |
| Orchid delivery Chiang Mai | `/en/collections/orchids-chiang-mai` |
| Send flowers to Thailand from abroad / international card checkout | `/en/info/buy-flowers-online-chiang-mai-thailand` (same URL also covers CM-from-abroad) |
| Birthday flowers from abroad | `/en/info/birthday-flowers-chiang-mai-from-abroad` |
| Hotel delivery Chiang Mai | `/en/info/flower-delivery-to-hotels-chiang-mai` |
| Hospital delivery Chiang Mai | `/en/info/flower-delivery-to-hospitals-chiang-mai` |
| Delivery address guidance | `/en/info/flower-delivery-address-chiang-mai` |
| Product | `/en/catalog/{slug}` |

## Role split (do not duplicate)

- **Abroad how-to** (`buy-flowers-online-chiang-mai-thailand`) — overseas buyers: payment, recipient details, time zones, hotels/homes, advance ordering.
- **Delivery areas & fees** (`delivery-areas-chiang-mai`) — Chiang Mai interactive map and estimated fees; coverage list; other destinations; links to the abroad how-to for international customers. Old URL `/flower-delivery-thailand` 301s here.
- **Birthday from abroad** — birthday occasion only; link to the abroad how-to for general checkout questions.

## URL rules (current architecture)

- Chiang Mai commercial hub = locale homepage (`/en`, `/th`). **No** `/en/chiang-mai`.
- Expansion cities = `/{lang}/{city}/flower-delivery`.
- Products = `/{lang}/catalog/{slug}` (city selection at checkout / market session; no mass city-product duplicates in sitemap).
- Collections = `/{lang}/collections/{slug}` (Chiang Mai hubs first).
- Keep slug `buy-flowers-online-chiang-mai-thailand` (do not rename); title/H1 may say Thailand-from-abroad.

## City status

Controlled in `lib/delivery/markets.ts`:

- `active` → indexable + sitemap + nav
- `coming_soon` → `noindex,follow`, excluded from sitemap
- `disabled` → route unavailable

## Gated follow-up (Phase 3b)

Only after Search Console shows Chiang Mai terms stable on `/en`:

- Shift homepage title/H1 toward Thailand-wide brand positioning
- Keep a prominent Chiang Mai section
- Do **not** redirect `/en` → a city path
