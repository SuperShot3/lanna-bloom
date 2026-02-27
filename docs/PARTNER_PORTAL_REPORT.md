# Partner Portal — Findings and Updated Plan

## 1. What Was Found

### Production Plan Location
- **Primary:** [SPEC.md](SPEC.md) — Page structure, UI layout, partner flow, CMS, design tokens
- **Secondary:** [README.md](README.md) — Partner registration and dashboard summary
- **Cursor plan:** `.cursor/plans/lanna_bloom_partner_portal_397fe34b.plan.md` (earlier draft with Supabase products + sync — now superseded)

### Existing Partner Logic

| Location | Purpose |
|----------|---------|
| `app/[lang]/partner/register/page.tsx` | Partner registration page |
| `app/[lang]/partner/register/PartnerRegisterForm.tsx` | Form: shopName, contactName, phone, lineOrWhatsapp, address, city |
| `app/[lang]/partner/register/actions.ts` | Server action → `createPartner` (Sanity) → redirect to success |
| `app/[lang]/partner/register/success/page.tsx` | Thank-you + link to dashboard |
| `app/[lang]/partner/dashboard/[partnerId]/page.tsx` | Dashboard (no auth; uses partnerId in URL) |
| `app/[lang]/partner/dashboard/[partnerId]/bouquets/new/page.tsx` | Add bouquet form |
| `app/[lang]/partner/dashboard/[partnerId]/bouquets/[bouquetId]/edit/page.tsx` | Edit bouquet |
| `app/[lang]/partner/dashboard/[partnerId]/bouquets/actions.ts` | createBouquet, updateBouquet server actions |
| `app/[lang]/partner/dashboard/[partnerId]/bouquets/BouquetForm.tsx` | Bouquet form component |
| `lib/sanityWrite.ts` | createPartner, createBouquet, updateBouquet, uploadImageToSanity |
| `lib/sanity.ts` | getPartnerById, getBouquetsByPartnerId, getBouquetById |
| `sanity/schemas/partner.ts` | Partner: shopName, contactName, phoneNumber, lineOrWhatsapp, shopAddress, city, status |
| `sanity/schemas/bouquet.ts` | Bouquet: slug, nameEn/Th, composition, category, partner ref, status, images, sizes |

### What Needs to Change

1. **Apply flow:** Replace register → Sanity with apply → Supabase. New route `/[lang]/partner/apply`.
2. **Supabase:** Add `partner_applications` table (no `partner_products`). Add Supabase Auth for partners.
3. **Sanity partner:** Add `supabaseUserId` field. Partner created on admin approve (not on apply).
4. **Admin:** Add `/admin/partners/applications` for application approval. Add `/admin/moderation/products` for product moderation.
5. **Partner dashboard:** Auth-based. Resolve partner by `supabaseUserId` in Sanity. Route: `/[lang]/partner` or `/[lang]/partner/dashboard`.
6. **Add product:** Write directly to Sanity. Flowers → bouquet (existing). Non-flowers → new product schema with `moderationStatus`.
7. **Catalog:** Read only Sanity items where `moderationStatus="live"` (or bouquet `status="approved"`).
8. **Remove/deprecate:** Old register flow; dashboard with partnerId in URL.

---

## 2. Updated Production Plan

The primary plan is [SPEC.md](../SPEC.md). Key updates applied:
- Routes: `/partner/apply`, `/partner`, `/partner/products/new`, `/admin/partners/applications`, `/admin/moderation/products`
- Data: Supabase = applications + auth only. Sanity = partners + products. No sync.
- Partner schema: add `supabaseUserId`
- Product schema: new `product` type with `moderationStatus`

---

## 3. Implementation Checklist (Ordered Steps)

1. **Supabase migration** — Create `partner_applications` table (id, created_at, shop_name, contact_name, email, line_id, phone, instagram, facebook, address, district, lat, lng, self_deliver, delivery_zones, delivery_fee_note, categories, prep_time, cutoff_time, max_orders_per_day, sample_photo_urls, experience_note, status, admin_note, user_id, sanity_partner_id). No partner_products table.

2. **Supabase Auth** — Add @supabase/ssr (or use existing client). Partner login page. Session helpers for partner routes.

3. **Partner apply page** — `/[lang]/partner/apply`. Form → insert Supabase partner_applications. Thai-first UI. Add email field. Redirect to success/confirmation.

4. **Admin applications** — `/admin/partners/applications`. List applications, filter by status. Approve action: create Supabase user, create Sanity partner (with supabaseUserId), update application row.

5. **Sanity partner schema** — Add `supabaseUserId` (string) to partner. Extend createPartner in sanityWrite to accept supabaseUserId.

6. **Sanity getPartnerBySupabaseUserId** — Add to lib/sanity.ts. Used by dashboard.

7. **Partner dashboard** — `/[lang]/partner`. Auth guard. Resolve partner by supabaseUserId. Show status, contact shortcuts (LINE, call, maps). Product list (bouquets + products).

8. **Add product (flowers)** — Reuse BouquetForm. Route: `/[lang]/partner/products/new` with category=flowers or separate flowers path. Write to Sanity bouquet.

9. **Sanity product schema** — New `product` type: slug, nameEn, nameTh, categoryKey (balloons|gifts|money_flowers|handmade_floral), structuredAttributes (object), customAttributes (array), images, partner ref, moderationStatus (submitted|live|needs_changes|rejected), adminNote.

10. **Add product (non-flowers)** — ProductForm for balloons, gifts, etc. Write directly to Sanity with moderationStatus: submitted.

11. **Admin product moderation** — `/admin/moderation/products`. Fetch Sanity products where moderationStatus=submitted. Approve/Reject/Needs changes actions.

12. **Catalog** — Extend to read products with moderationStatus=live. Bouquets already filtered by status=approved.

13. **Redirect/deprecate** — Redirect `/partner/register` to `/partner/apply`. Update Header nav link. Optionally keep old dashboard for backward compat or remove.
