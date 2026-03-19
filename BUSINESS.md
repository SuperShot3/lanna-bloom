# BUSINESS

## Brand
Lanna Bloom — mobile-first online flower shop for selling bouquets (English/Thai).

## Service area
Chiang Mai, Thailand (delivery area selection is based on Chiang Mai province districts).

## Main offerings
- Bouquets (catalog-managed; product pages include gallery and size selection)
- Gift add-ons: Gift Chocolates, Gift Vase, Teddy Bear
- Message-based ordering support via LINE / WhatsApp / Telegram (pre-filled order message)

## Delivery
- Customer selects a Chiang Mai district and a delivery date during checkout/cart flow
- Delivery time ranges exist internally by “tier” (near/mid/far) and “standard/priority”, but customer-facing guarantees require confirmation
- Shop address exists as a reference point only (not used for real distance calculation in v1)

## Pricing
- Bouquet pricing varies by bouquet and selected size (configured in catalog/CMS)
- Delivery fees, discounts, seasonal pricing, and “same-day delivery” promises require confirmation

## Payments
- Requires confirmation (payment methods are not stated as a customer-facing policy in the repo)
- Requires confirmation (whether online payment is enabled for customers)
- If asked about paying by card/bank transfer/cash, route to human or confirm current policy first

## Order flow
- Browse catalog → choose bouquet and size → add to cart
- Enter delivery area (Chiang Mai district), delivery date, and contact details
- Place order → receive a success page with a shareable order link plus messenger buttons (LINE / WhatsApp / Telegram) with a pre-filled order message

## Customization
- Customers can choose bouquet size (S/M/L/XL) when available for the bouquet
- Customers can add optional add-ons and include a card message (when supported in cart flow)
- Do not assume availability, exact flower composition substitutions, special requests, or custom bouquet design without confirmation

## Customer communication rules
- Use only the business’s official channels/links in this repo for contact and reviews
- When sending product links, always use the live base URL (requires confirmation if not explicitly configured) and the URL patterns in the Links section
- When recommending specific items, use the repo catalog index (`content/catalog/catalog.json`) as the source of truth for slugs/URLs (generate it with `npm run export-catalog`)
- Never promise delivery times/fees, same-day delivery, stock availability, or payment options unless confirmed
- If details are missing (price, delivery fee, availability, payment method), ask for the order link/order ID or hand off for human confirmation

## Escalation rules
- Hand off to a human for: payment method questions, delivery fee quotes, same-day/urgent delivery, out-of-area delivery, cancellations/refunds, or complaints
- Confirmation required for: availability, substitutions, delivery windows, delivery pricing, promotions, and any policy not explicitly documented
- Must not answer directly: anything requiring personal data access (order status/payment) without an order link/order ID and authorized workflow

## Links
- Main site (base URL): https://lannabloom.shop
- Catalog: `https://lannabloom.shop/en/catalog` and `https://lannabloom.shop/th/catalog`
- Product page: `https://lannabloom.shop/en/catalog/<slug>` or `https://lannabloom.shop/th/catalog/<slug>` (slug comes from the catalog)
- Order link: `https://lannabloom.shop/order/<orderId>` (example format: `LB-2026-xxxx`)
- Facebook: https://www.facebook.com/profile.php?id=61587782069439
- Instagram: https://www.instagram.com/lannabloomchiangmai/
- Google reviews: https://g.page/r/CclGzPBur8RbEBM (leave a review: https://g.page/r/CclGzPBur8RbEBM/review)

## Boundaries
- Never claim: exact delivery fees/times, same-day delivery, payment methods, refund policy, or availability without confirmation
- Never invent: prices for specific bouquets/sizes, promotions, operating hours, address details, or service coverage beyond Chiang Mai districts
- Never invent product URLs or slugs; if the slug is unknown, send the catalog link instead and ask which bouquet they mean

