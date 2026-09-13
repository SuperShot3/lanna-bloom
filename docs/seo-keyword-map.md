# SEO keyword map (Lanna Bloom)

Primary intent → one owner URL. Support pages link to the owner; they must not reuse the owner’s exact H1.

**Current SEO policy (Chiang Mai refocus):** Google should understand Lanna Bloom as a Chiang Mai florist with one catalog. Expansion cities remain shoppable delivery options. Their operational landings stay live for customers and ads but are **`noindex, follow`** until a city is a genuinely distinct offering.

| Primary intent | Owner URL |
|---|---|
| Flower delivery Chiang Mai / buy flowers online CM | `/en` (homepage) · `/th` |
| Thailand delivery areas & coverage (map) | `/en/delivery-areas-thailand` |
| Flower delivery {City} (Phuket, Bangkok, Samui, …) | **Not assigned.** Operational page `/{city}/flower-delivery` is noindex until `seoIndexable` is true. Do not create a parallel city catalog. |
| Same-day flower delivery Chiang Mai | `/en/info/same-day-flower-delivery-chiang-mai` |
| Rose delivery Chiang Mai | `/en/collections/roses-chiang-mai` |
| Orchid delivery Chiang Mai | `/en/collections/orchids-chiang-mai` |
| Send flowers to Thailand from abroad / international card checkout | `/en/info/buy-flowers-online-chiang-mai-thailand` (same URL also covers CM-from-abroad) |
| Birthday flowers from abroad | `/en/info/birthday-flowers-chiang-mai-from-abroad` |
| Thai Mother’s Day flowers / send Mother’s Day flowers Chiang Mai from abroad | `/en/info/thai-mothers-day-flowers-chiang-mai-from-abroad` |
| Hotel delivery Chiang Mai | `/en/info/flower-delivery-to-hotels-chiang-mai` |
| Hospital delivery Chiang Mai | `/en/info/flower-delivery-to-hospitals-chiang-mai` |
| Delivery address guidance | `/en/info/flower-delivery-address-chiang-mai` |
| Product | `/en/catalog/{slug}` |
| Catalog listing | `/en/catalog` (one URL; delivery region is the cookie, not the path) |

## Role split (do not duplicate)

- **Abroad how-to** (`buy-flowers-online-chiang-mai-thailand`) — overseas buyers: payment, recipient details, time zones, hotels/homes, advance ordering.
- **Delivery areas & fees** (`delivery-areas-thailand`) — Thailand coverage map with Chiang Mai amphoe zoom and estimated fees; coverage list; other destinations; links to the abroad how-to for international customers. Old URLs `/flower-delivery-thailand` and `/delivery-areas-chiang-mai` 301 here. This page stays indexable as location-neutral coverage, not as a city-keyword landing.
- **Birthday from abroad** — birthday occasion only; link to the abroad how-to for general checkout questions.
- **Thai Mother’s Day from abroad** — 12 August occasion, jasmine vs delivery bouquets, MOM10 timing; link to the abroad how-to for payment/Maps/checkout.
- **Same-day flower delivery Chiang Mai** (`/info/same-day-flower-delivery-chiang-mai`) — Chiang Mai same-day flowers only. Homepage and other pages must not reuse this H1 or the exact question “Do you offer same-day flower delivery?”.

## URL rules (current architecture)

- Chiang Mai commercial hub = locale homepage (`/en`, `/th`). **No** `/en/chiang-mai`.
- Expansion city landings = `/{lang}/{city}/flower-delivery` — **operational** (customers/ads). `noindex, follow` unless `seoIndexable` is true. Do not `robots.txt` Disallow. Do not 301 these URLs while they still serve customers/ads.
- Catalog listing = `/{lang}/catalog` only. Legacy `/{lang}/catalog/{city}` **308**s onto `/catalog` and sets the delivery-region cookie.
- Products = `/{lang}/catalog/{slug}` (city selection via delivery-region cookie + market session; no city×product duplicates in sitemap).
- Collections = `/{lang}/collections/{slug}` (Chiang Mai hubs first).
- Keep slug `buy-flowers-online-chiang-mai-thailand` (do not rename); title/H1 may say Thailand-from-abroad.
- Do not open new city articles, city collections, or sitemap entries for expansion markets.

## City status vs indexing

Controlled in `lib/delivery/markets.ts`:

- `active` → shoppable + nav. **Does not** imply Google indexing.
- `coming_soon` → `noindex,follow`, excluded from sitemap
- `disabled` → route unavailable
- `seoIndexable: true` (and `active`) → landing may be indexed and listed in the sitemap
- `seoIndexable` omitted or `false` → landing stays `noindex, follow` and out of the sitemap

All current expansion markets are shoppable and **not** `seoIndexable`.

## Re-index gate (later)

Bring a city back into Google Search only when it is a genuinely separate offering, for example:

- Meaningful local assortment (not the same catalog with a city name swapped)
- Local photos, reviews, or operational differences
- Unique content that is not a thin rewrite of Chiang Mai pages

Then: set that market’s `seoIndexable` to `true`, restore sitemap + indexable landing metadata **for that city only**. Active service must not auto-publish SEO.

## Search Console (after deploy)

Code cannot finish deindexing. After release:

1. Submit the updated sitemap in Search Console.
2. Confirm city landings, `/catalog/{city}`, and regional info articles are absent from the sitemap.
3. Watch indexed URL counts for `/{city}/flower-delivery` and `/catalog/{city}` drop.
4. Inspect leftover `/catalog/{city}/{slug}` URLs — they should already **308** to `/catalog/{slug}`.
5. Request indexing of `/{lang}`, `/{lang}/catalog`, key Chiang Mai articles (`same-day-flower-delivery-chiang-mai`) and collections.
6. Use Removals only as a short-term hide if a city URL still ranks while noindex is processing.
7. Expect weeks of lag. Do not flip `seoIndexable` because recovery is slow.
8. Queries such as `flower delivery Bangkok` may still show the homepage or main catalog; those pages must stay Chiang Mai-honest.

## Gated follow-up (Phase 3b)

Only after Search Console shows Chiang Mai terms stable on `/en`:

- Shift homepage title/H1 toward Thailand-wide brand positioning
- Keep a prominent Chiang Mai section
- Do **not** redirect `/en` → a city path
- Do **not** retitle `/en` to “Flower delivery Thailand” before that gate
