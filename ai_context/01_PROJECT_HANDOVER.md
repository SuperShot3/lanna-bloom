# Project handover

Business and product context for **Lanna Bloom** (Chiang Mai flower & gift delivery).

## Brand and audience

- **Name:** Lanna Bloom
- **Market:** Chiang Mai delivery; EN + TH customers
- **Site:** `lannabloom.shop` (production)
- **Social:** Facebook, Instagram (see README)

## Customer experience

| Journey | Summary |
|---------|---------|
| Browse | `/en` or `/th` → catalog from Sanity (approved bouquets/products only) |
| Product | Size selector, delivery area/date, add to cart |
| Cart | Delivery details, referral/welcome codes where configured |
| Pay | Stripe Checkout (card) — primary web flow |
| After pay | `/{lang}/checkout/complete` → order link with token |
| Order tracking | `/order/{orderId}?token=...` — status, messenger contact |
| Messengers | LINE / WhatsApp / Telegram pre-filled messages (header, product, cart) — secondary to Stripe checkout |

## Languages

- URL-based locales: `/en/*`, `/th/*`
- Language switcher preserves path where possible
- Sanity content often has EN + TH fields

## Partner portal

1. **Apply** — `/[lang]/partner/apply` → Supabase `partner_applications`
2. **Admin approve** — `/admin/partners/applications` → Supabase auth user + Sanity partner
3. **Dashboard** — `/[lang]/partner` (Supabase session)
4. **Add products** — flowers → bouquet; other categories → product (moderation)
5. **Moderation** — `/admin/moderation/products` → approve for catalog

Architecture: Supabase for apps/auth; Sanity for catalog documents; linked by `supabaseUserId` on partner.

## Admin (staff)

- `/admin` — orders, fulfillment status, costs & profit, accounting, expenses, emails, products, partners
- RBAC via NextAuth — seed with `scripts/seed-admin.ts`
- Not customer-facing

## Payments (current)

- **Stripe Checkout** for website orders (cart and pay-existing-order flows)
- Server creates Stripe line items from recomputed totals
- Orders persisted to Supabase after confirmed payment (cart flow)

Legacy README references to “place order → messenger only” or Vercel Blob-only storage are outdated for payments; use [04_CHECKOUT_ORDERS_STRIPE.md](04_CHECKOUT_ORDERS_STRIPE.md).

## Content

- **Catalog / guides / info:** Sanity + MDX under `content/`
- **Copy tasks:** use `.cursor/skills/flower-content-writer/` (products) and `blog-content-writer/` (articles/guides)

## Deep dive

- [SPEC.md](../SPEC.md) — page structure and UX layout
- [README.md](../README.md) — setup (verify payment sections against `ai_context`)
