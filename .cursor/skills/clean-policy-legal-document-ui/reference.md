# Lanna Bloom — policy & legal pages

Use with the `clean-policy-legal-document-ui` skill. Paths are repo-root relative.

Read this file before editing. Inspect the live page and source; do not invent a second design system.

## Which skill

| Task | Skill |
|------|--------|
| Policy / legal / operational-rule **UI and structure** | this skill |
| Product names and descriptions | `flower-content-writer` |
| SEO / marketing info articles and `/guides/` | `blog-content-writer` |

`content/info/delivery-policy.*.mdx` is an operational policy even though it lives under `/info/`. Treat it with this skill, not as a marketing landing page.

Do not apply catalog, hero, or landing-page design patterns to these pages.

## Current policy routes

| Page | URL | Implementation |
|------|-----|----------------|
| Privacy | `/{lang}/privacy` | `app/[lang]/privacy/page.tsx` + `privacyPolicyContent.ts` |
| Terms | `/{lang}/terms` | `app/[lang]/terms/page.tsx` (inline EN/TH) |
| Cookies | `/{lang}/cookies` | `app/[lang]/cookies/page.tsx` (inline EN/TH) |
| Refund / replacement / cancellation | `/{lang}/refund-replacement` | `app/[lang]/refund-replacement/` + `lib/i18n.ts` `refundPolicy` |
| Delivery policy | `/{lang}/info/delivery-policy` | `content/info/delivery-policy.{en,th}.mdx` via `app/[lang]/info/[slug]/page.tsx` |

Footer and checkout already link several of these. Keep URLs stable.

## Existing visual system — reuse first

Legal pages already share global CSS, not React `Policy*` components:

- Wrapper: `.policy-page` > `.container` (content column `max-width: 42rem` ≈ 672px)
- Styles: `app/globals.css` — search `/* Legal / policy pages`
- Classes: `.policy-title`, `.policy-last-updated`, `.policy-intro`, `.policy-section`, `.policy-heading`, `.policy-subheading`, `.policy-text`, `.policy-note`, `.policy-list`, `.policy-link-inline`, `.policy-back`, `.policy-link`
- Table pattern: `.policy-data-summary*` on the privacy page
- Tokens: `--text`, `--text-muted`, `--border`, `--accent`, `--radius`, `--font-family-display` / `--font-serif`

When adding shared pieces (`PolicyCallout`, `PolicyNavigation`, and so on):

1. Extend the existing `.policy-*` language in `globals.css`.
2. Extract React wrappers only if several pages need the same markup.
3. Do not copy large CSS into page-level styled-jsx or new CSS modules.

Info-article chrome (`article.module.css`, `IntentLandingPage`, `ArticleCta`, product cards, gradient covers, emoji covers) is for marketing guides. Do not pull that chrome onto privacy, terms, cookies, or refund pages. For delivery-policy, prefer document typography over promotional CTAs, covers, and carousels unless the user explicitly asks to keep them.

## Workflow

1. Identify the page type (standalone `.policy-page` vs info MDX).
2. Inspect current markup, CSS, copy source, and locale files.
3. Improve typography, hierarchy, lists, tables, callouts, and spacing.
4. Preserve legal meaning, URLs, metadata, and translation keys.
5. Keep EN/TH in sync. Refund copy also exists in other locales in `lib/i18n.ts` — do not drop keys.
6. Run the Final Quality Check in `SKILL.md`.

## Copy sources

| Page | Where the words live |
|------|----------------------|
| Privacy | `app/[lang]/privacy/privacyPolicyContent.ts` |
| Terms / cookies | JSX strings in the page files |
| Refund | `lib/i18n.ts` → `translations[locale].refundPolicy` |
| Delivery policy | `content/info/delivery-policy.en.mdx` and `.th.mdx` plus registry excerpt in `app/[lang]/info/_data/articles.ts` |

Do not replace translated strings with hard-coded English.

## Out of scope unless asked

- Changing checkout, Stripe, or refund **business logic**
- Inventing new legal rules or coverage claims
- Nationwide same-day promises
- Marketing heroes, flower photos, or product grids on policy pages
