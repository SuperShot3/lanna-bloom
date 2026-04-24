# BUSINESS

## Brand
Lanna Bloom — mobile-first online flower shop for selling bouquets (English/Thai).

## Service area
Chiang Mai, Thailand (delivery area selection is based on Chiang Mai province districts).

## Main offerings
- Bouquets (catalog-managed; product pages include gallery and size selection)
- Gift add-ons: Teddy Bears
- Website-based ordering and support via LINE / WhatsApp /

## Delivery
- Customer selects a Chiang Mai district and a delivery date during checkout/cart flow
- Delivery time ranges exist internally by “tier” (near/mid/far) and “standard/priority”, but customer-facing guarantees require confirmation
- Shop address exists as a reference point only (not used for real distance calculation in v1)

## Pricing
- Bouquet pricing varies by bouquet and selected size (configured in catalog/CMS)
- Delivery fees, discounts, seasonal pricing, and “same-day delivery” promises require confirmation

## Payments
- Stripe handle payments 

## Order flow
- Browse catalog → choose bouquet and size → add to cart
- Enter delivery area (Chiang Mai district), delivery date, and contact details
- Place order → receive a success page with a shareable order link plus messenger buttons (LINE / WhatsApp / Telegram) with a pre-filled order message

## Customization
- Customers can choose bouquet size on website. 
- Customers can add optional add-ons and include a card message


## Customer communication rules
- Use only the business’s official channels/links in this repo for contact and reviews
- When sending product links, always use the live base URL (requires confirmation if not explicitly configured) and the URL patterns in the Links section
- When recommending specific items, use the repo catalog index (`content/catalog/catalog.json`) as the source of truth for slugs/URLs (generate it with `npm run export-catalog`)
- Never promise delivery times/fees, same-day delivery, stock availability, or payment options unless confirmed
- If details are missing (price, delivery fee, availability, payment method), ask for the order link/order ID or hand off for human confirmation



## Links
- Main site (base URL): https://lannabloom.shop
- Catalog: `https://lannabloom.shop/en/catalog` and `https://lannabloom.shop/th/catalog`
- Product page: `https://lannabloom.shop/en/catalog/<slug>` or `https://lannabloom.shop/th/catalog/<slug>` (slug comes from the catalog)
- Order link: `https://lannabloom.shop/order/<orderId>` (example format: `LB-2026-xxxx`)
- Facebook: https://www.facebook.com/profile.php?id=61587782069439
- Instagram: https://www.instagram.com/lannabloomchiangmai/
- Google reviews: https://g.page/r/CclGzPBur8RbEBM (leave a review: https://g.page/r/CclGzPBur8RbEBM/review)



