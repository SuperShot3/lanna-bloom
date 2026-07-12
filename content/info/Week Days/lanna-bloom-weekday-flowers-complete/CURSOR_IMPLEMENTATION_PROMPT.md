# Cursor implementation prompt

Implement the Thai Weekday Flowers SEO cluster in the existing Lanna Bloom website.

## Constraints

- Inspect the current blog/content architecture before editing.
- Reuse existing components, typography, metadata utilities, schema helpers and routing patterns.
- Do not create a second Monday article. Find the existing Monday flowers page and preserve its URL.
- Create the pillar page and the missing Tuesday–Sunday pages.
- Map Markdown frontmatter fields to the application's existing content model.
- Replace internal-link placeholders with actual routes after pages are created.
- Add breadcrumb navigation and previous/next weekday navigation.
- Add Article or BlogPosting JSON-LD, BreadcrumbList and visible FAQ content.
- Add FAQPage JSON-LD only if consistent with the website's current SEO policy and visible FAQ content.
- Do not invent product availability, prices, delivery zones or same-day guarantees.
- Do not hotlink stock images. Leave the source URL in the CMS/editorial metadata until an image is downloaded and self-hosted.
- Preserve existing slugs and production content.
- Run lint, type checks and build checks before finishing.

## Pages

- Pillar: `00-pillar-page.md`
- Monday integration guidance: `01-monday-flowers.md`
- New articles: `02` through `07`
- Shared metadata: `seo-metadata.json`
- Linking plan: `internal-linking-plan.md`
