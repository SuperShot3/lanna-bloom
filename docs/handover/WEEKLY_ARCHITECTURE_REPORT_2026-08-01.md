# Lanna Bloom — Weekly Architecture Report
Week of Jul 26 – Aug 1, 2026

> **Scope note:** This report is derived from the codebase and commit history only — it reflects
> what changed and the engineering intent behind it. It does not include revenue, traffic, or
> conversion numbers (GA4/Stripe/Ahrefs dashboards are the source for those). Read it as "what the
> platform can do now," not "how well it performed this week."

# Executive Summary

- This week was mostly **SEO/growth investment + tech-debt cleanup**, not new business capability. The two biggest threads: (1) finishing the long-running Sanity→Supabase migration by deleting all remaining Sanity code, and (2) a concentrated SEO push (canonical URLs, "People Also Ask" content, a new blog article, Core Web Vitals + Ahrefs tracking) ahead of a planned multi-city Thailand expansion.
- Secondary threads: a **Thai Mother's Day 2026 promo (MOM10)** was shipped as a time-boxed campaign, gift-card messaging was upgraded to support multiple named cards per order with an admin "copy" workflow, and catalog filtering UX was refined (price slider, flower-type layout).
- Why: the SEO/canonical work supports organic acquisition and prepares the site for indexing multi-city delivery pages; the Sanity removal eliminates dead code/risk left over from a completed migration; the promo and gift-card work are direct revenue/ops-efficiency levers around a seasonal peak (Thai Mother's Day, 12 Aug).

# Current Platform Status

Lanna Bloom is a bilingual (EN/TH) Next.js 14 App Router storefront hosted on Vercel, selling flowers/gifts with delivery centered on Chiang Mai and expanding to select Thai cities (Phuket, Hua Hin, Koh Samui, Krabi/Ao Nang, Pattaya). Supabase is now the **sole** system of record for catalog, orders, admin, and partner-application data (Sanity is fully gone — no code, no env vars, no dependency). Payments run through Stripe Checkout with server-side price/order recomputation; orders are created only after confirmed payment. Admin is a single Next.js app under `/admin` (NextAuth + RBAC) covering orders, catalog moderation, accounting, and marketing — there is no separate partner-facing dashboard. Analytics/observability now has three independent layers: GTM→GA4/Ads for business events, a new Core Web Vitals reporter into GTM/GA4, and Ahrefs Web Analytics for SEO traffic (Microsoft Clarity was removed).

# New Features

- **Thai Mother's Day 2026 campaign (MOM10):** date-bounded (27 Jul–13 Aug, Asia/Bangkok), 10% off items ≥ ฿1,500, with a dismissible site banner and countdown-aware activation logic.
- **Multi-card gift messages:** orders can now carry up to 3 distinct gift-card messages, each optionally tied to a specific item/bouquet name, with backward-compatible fallback to legacy single-message orders.
- **Admin "copy" tooling:** one-click copy-to-clipboard for order/gift-message summaries in admin and supplier-facing views, formatted for pasting into chat/ops tools.
- **Core Web Vitals reporting:** field CWV (LCP, INP, CLS, FCP, TTFB) now streams to GTM/GA4 in production, replacing ad-hoc/no visibility into real-user performance.
- **Ahrefs Web Analytics:** added as an independent SEO traffic tracker alongside GTM (Microsoft Clarity was retired the same week).
- **Referral/affiliate code generalization:** the discount-code engine now supports named affiliate partners with commission tracking (e.g., a Phuket-destination-restricted affiliate code), not just generic promo codes.
- **YouTube channel link + schema:** added to social links and site JSON-LD (Organization/SameAs).

# Database / Models

No schema migrations landed this week. The only structural change is a **cleanup of legacy Sanity-era types/exports** (`CatalogFilterParams` and related types moved off the old `lib/sanity.ts` facade onto their real Supabase-backed modules). Order records gained a slightly richer optional shape for gift-card messages (array of `{ text, itemTitle }` instead of a single free-text field), with full backward compatibility for older orders that only have the legacy field.

# Admin Panel

No new admin screens shipped this week. The order-detail and supplier-response views gained better gift-card-message display (multiple, item-labeled cards) and a copy-to-clipboard action for faster manual dispatch/communication with suppliers. Hero-image admin actions were trimmed of dead Sanity-import code paths.

# Partner System

No functional change to the partner flow this week — it remains **apply-only**: `/[lang]/partner/apply` writes to Supabase `partner_applications`, and admins approve/reject manually with no partner login or partner dashboard. The only related change was housekeeping: an internal scratch document describing an **old, superseded plan** (a Sanity-backed partner dashboard with partner logins and partner-submitted products) was deleted since it no longer reflects reality and could mislead future planning. There is currently no partner self-service portal, and no work is in flight to build one.

# Order Flow

No changes to the core order lifecycle (cart → Stripe Checkout → server-confirmed payment → order creation → fulfillment) or to payment/webhook trust boundaries. The only lifecycle-adjacent change is richer, more structured gift-card-message data attached to orders (multiple cards, each optionally linked to a specific item), which affects what displays in admin/customer/supplier views but not how or when an order is created or paid.

# Product Catalog

Catalog data continues to live entirely in Supabase; there is no remaining dependency on any external CMS. Filter UX was refined: the price-range slider now supports click/tap-anywhere-on-track to move the nearest handle (not just dragging the thumb), and flower-type filters were reorganized so they show as chips on desktop and move into the mobile filter sheet — a UX cleanup, not a data-model change. No changes to product availability rules, moderation statuses, or pricing logic beyond minor internal cleanup.

# SEO / Public Website

This was the heaviest area of work this week:
- **Canonical URL fixes:** root `/` now issues a **permanent** redirect to `/en` (was temporary), and Organization/WebSite JSON-LD now points at the canonical `/en` URL instead of the bare domain — closing a canonicalization gap.
- **"People Also Ask" content expansion:** several landing/info pages (buy-flowers-online, birthday-flowers-from-abroad, hospital/hotel delivery) were rewritten with FAQ-style content and structured data to target question-based search queries.
- **New blog article:** "Thai Flower Names & Secret Messages" (bilingual, with imagery) published as a new content asset.
- **Thailand-wide messaging update:** the `/flower-delivery-thailand` landing page and `llms.txt` (AI-assistant discovery file) were reworded to describe Lanna Bloom as **expanding** delivery across Thailand, with an explicit note that fees/same-day availability vary by destination city — language chosen to be accurate as multi-city rollout continues, rather than overpromising uniform national coverage.
- **Hreflang/alternates test coverage:** an automated SEO-architecture test suite was added to catch canonical/hreflang regressions going forward.
- **Product/PDP SEO:** product galleries got proper alt text and anchor-tag (crawlable) navigation; product JSON-LD gained additional structured fields.
- **Homepage messaging:** added a same-day delivery line referencing on-demand courier (Grab) capability.
- **Observability:** Core Web Vitals now report to GA4, Ahrefs Web Analytics added, Microsoft Clarity removed.

# APIs / Integrations

- **Ahrefs Web Analytics** added (client-side script, production-only, admin-excluded) — independent of GTM.
- **`web-vitals` (v6) library** added as a new dependency to power the Core Web Vitals reporter.
- **Microsoft Clarity integration removed** entirely (component and loader deleted).
- **All Sanity integration surface removed**: `@sanity/client`, `@sanity/image-url` packages, `lib/sanity.ts`, one-time import/export scripts, and related npm scripts (`import-catalog`, `import-hero`) are gone. There is no supported way to pull data from Sanity anymore — Supabase is the only catalog source, by code, not just by config flag.
- No changes to Stripe, Resend/email, or GTM/GA4 core integration this week beyond the additive Web Vitals event stream.

# Technical Debt

- **Resolved this week:** the multi-month Sanity→Supabase migration tail is now fully closed out — no dead code, no unused dependencies, no stale env vars referencing Sanity. The migration runbook was updated to explicitly mark itself historical/non-actionable.
- **Outstanding:** the codebase still carries some **legacy fallback logic** for older order shapes (e.g., single-string `cardMessage` vs. the new multi-entry gift-card-message format, per-item vs. order-level messages) — functional, but adds branching complexity that could be simplified once confidence is high that all live orders use the new shape.
- **Outstanding:** the referral/discount-code system is still a hand-maintained in-code allowlist (`DISCOUNT_CODES` map) mixing generic promos, seasonal campaigns, and named-affiliate commission logic in one file — workable at current scale, but will need a data-driven (DB-backed) redesign if the number of affiliates/campaigns grows.
- **Outstanding:** the Thailand multi-city expansion is currently expressed mostly through **content/SEO copy** ("expanding," fees vary by city) rather than through catalog/delivery-zone data structures that fully encode per-city rules — worth flagging if expansion accelerates.

# Next Priorities

- Monitor the Mother's Day (MOM10) campaign through its window (ends 13 Aug) and confirm order-volume/discount behavior matches expectations.
- Continue the SEO push: more "People Also Ask" content, additional city/keyword-targeted landing pages as multi-city delivery solidifies.
- Watch Core Web Vitals and Ahrefs data now that both are live, to catch performance or organic-traffic regressions early.
- Likely next cleanup candidate: consolidating legacy gift-card-message fallback paths once new-format adoption is confirmed across live orders.

# Advice for ChatGPT

- **This report has no revenue/traffic numbers.** Don't infer business performance from it — ask the user for GA4/Stripe/Ahrefs figures if a recommendation depends on outcomes rather than capabilities.
- **Sanity is completely gone.** Do not suggest reintroducing it, referencing `lib/sanity.ts`, or assuming any CMS other than Supabase exists for catalog data — this is now enforced in code, not just configuration.
- **There is no partner dashboard, partner login, or partner-submitted product flow**, and none is currently planned — the only partner touchpoint is a one-way application form reviewed manually by admins. An older internal plan describing a partner-login/dashboard system existed but was explicitly retired and deleted this week; don't resurface it as current-state.
- **Thailand delivery is explicitly "expanding," not uniform.** Chiang Mai is the reliable core; other cities (Phuket, Hua Hin, Koh Samui, Krabi/Ao Nang, Pattaya) have variable fees/same-day availability. Site copy was deliberately softened this week to avoid overpromising — factor this nuance into any national-scale product suggestions.
- **This was a "polish and consolidate" week, not a feature week.** Most effort went into SEO infrastructure, observability, and paying down migration debt rather than new business logic — useful context when judging development velocity or planning trade-offs.
- **Payment/order trust boundaries are untouched and should stay untouched**: Stripe remains the sole source of payment truth, orders are only created post-payment, and no changes this week altered that. Any future advice should continue to assume server-side price/discount recomputation and token-gated customer order access.
- **Promo/discount logic is currently code-based and hand-maintained**, not database-driven — useful to know if suggesting scaling up campaigns or affiliate programs.
