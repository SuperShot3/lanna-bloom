---
name: blog-content-writer
description: Create SEO-optimized flower shop content—info MDX articles and `/guides/` bouquet guides—with natural product promotion and bilingual EN/TH when requested. Use for posts, guides, SEO copy, FAQs, slugs, OG fields, alt text, Sanity-ready blocks, or implementation handoffs matching `birthday-flower-gift` and info patterns.
---

# Blog Content Writer

## Purpose

Produce polished, ready-to-paste blog content for the flower shop website that ranks well, reads easily, and naturally promotes products from the same website.

Default output mode is webpage-ready content blocks for editorial entry or handoff to developers, not a long plain chat article.

**Customer-facing copy blocks** (what readers see): do not include JSON, code, schema markup, or developer-only noise inside those blocks.

**Implementation handoffs** (when shipping a page in this repo): may name existing files, components, and slugs so work maps cleanly to `app/[lang]/guides/` or `content/info/`—keep that material in clearly labeled implementation sections, not mixed into hero/body prose meant for shoppers.

## Core Rules

- Write for customers first and search engines second.
- Default language is English. Provide Thai when the user asks for Thai or bilingual.
- Tone: warm, elegant, helpful, trustworthy, and gently sales-friendly.
- Make the article scannable: short paragraphs, descriptive headings, useful lists.
- Promote relevant website products as helpful recommendations, never as hard-sell ads.
- Use the focus keyword naturally in the title, intro, one heading, and the conclusion.
- Avoid keyword stuffing, exaggerated claims, fake guarantees, and generic filler.
- Do not invent prices, stock, delivery times, discounts, or product availability.
- Do not put JSON, raw schema, unexplained code, or developer-only notes **inside customer-facing prose blocks**; implementation sections may reference repo filenames and slugs when handing off a page build.
- If important information is missing, ask short questions before writing.
- Default to **Webpage Build Mode** (section-by-section page output).
- Do not return only one long text block unless the user explicitly asks for text-only.
- For on-site articles and guides, reuse existing page patterns and UI primitives from this repository (guide routes under `app/[lang]/guides/`, info/MDX, catalog-driven cards, shared FAQ, global styles). Do not invent article-specific components unless the user asks for new UI.

## Webpage Build Mode (Default)

Unless the user asks for a different format, always deliver the blog as a publish-ready webpage structure:

- Page metadata block (SEO + social)
- Hero block
- Intro block
- Body section blocks (H2/H3 + short paragraphs)
- Product surfaces in context (MDX `CatalogProductCard` rows **or** guide bouquet sections with `BouquetCard` + Recommended callout)
- FAQ accordion content
- Final CTA block (messenger/contact actions **last** on guides)

The goal is to make output easy to map to page sections—whether those sections live in Sanity, MDX, or a typed guide module in the repo. Keep each block clearly labeled.

**Pick the right ship pattern:**

| Goal | Primary pattern |
|------|------------------|
| Long-form article under `/info/`, MDX body, inline catalog cards | Info article: `articles.ts` + `content/info/[slug].*.mdx` + `<CatalogProductCard slug="..." />` |
| Occasion / comparison guide under `/guides/`, multiple real bouquets beside copy | Guide page: `app/[lang]/guides/[slug]/page.tsx` + Sanity slugs + `BouquetCard` + `GuideFaq` |

Do not return only freeform chat prose when the user asks to create a page.

### Reuse Site UI, Do Not Invent Article-Only Components

When the task is to ship an article or guide page on the website, prefer reusing existing layouts, components, and CSS patterns from this codebase. Do not introduce parallel blog-only cards, buttons, or section styles unless the user explicitly asks for a new design system.

Default behavior:
- Map content to patterns that already exist: guide pages under `app/[lang]/guides/`, info/MDX articles under `content/info/` with `CatalogProductCard`, shared FAQ patterns, site header/footer, typography classes, and tokens from `app/globals.css` (guide-specific classes include `guide-page`, `guide-hero`, `guide-section`, `guide-bouquet-detail-*`, `guide-inline-callout`, `guide-highlights`, `guide-final-cta`, etc.).
- Promote products using the same building blocks shoppers see elsewhere: **guide pages** use `BouquetCard` fed by `getBouquetBySlugFromSanity` and the catalog slug; **info articles** use `CatalogProductCard` in MDX. Do not ship fake tiles or one-off product markup unless no primitive exists.
- If the skill mentions product cards, interpret that as wiring content to real components and **exact catalog slugs**, not as permission to design arbitrary HTML/CSS per post.
- Keep contact actions (LINE, WhatsApp, contact links, "message us") at the **bottom** of the article in the final CTA area (`MessengerOrderButtons` with `contactOnly` on guides, unless the user explicitly requests otherwise).

When adding or changing code:
- Extend existing components or page shells before creating new ones.
- Match naming, spacing, and link patterns (localized links like `/${lang}/catalog/...` and existing CTA tone).
- Keep canonical primitives explicit so future runs do not drift.

Exceptions:
- New UI is allowed only when the user requests a new layout, an A/B variant, or when no suitable primitive exists. In those cases, state the reason and keep the new surface area small.

Anti-patterns to avoid:
- Long bespoke CSS blocks duplicated per article when shared classes already exist.
- Hardcoded locale paths like `/en/...` where localized links `/${lang}/...` should be used.
- Fake product blocks that do not connect to real catalog slugs or the standard card components (`BouquetCard` on guides, `CatalogProductCard` on info MDX).
- **Wrong slugs** (hyphens, `and`, word order): if the card does not render, the slug almost certainly does not match Sanity—verify against live product URLs before locking copy.

### Implementation Constraints (Canonical Primitives)

Use these as first-choice implementation targets:

**Guides (product-led, bouquet-by-section layout)**  
- Route: `app/[lang]/guides/*/page.tsx`  
- Reference implementation: `app/[lang]/guides/birthday-flower-gift/page.tsx`  
- Metadata: `generateMetadata` (title, description, canonical, Open Graph) per locale via `params.lang`  
- Hero: `guide-hero` + `guide-eyebrow` + `guide-h1`  
- Intro band: `guide-intro-band` + `guide-section-lede` (optional screen-reader section title)  
- Body sections: `guide-section`, headings via `popular-title`, body via `guide-body-text`  
- Each promoted bouquet: a block with narrative copy + optional live **`BouquetCard`** (same tile as catalog) when Sanity returns data for the slug; recommended link + “Why it fits” callout in the **text column** (`guide-inline-callout` inside `guide-bouquet-detail-copy`), layout via `guide-bouquet-detail-layout` / `guide-bouquet-detail-aside`  
- Short “why this pick matches the section” line: `guide-match-note` below the two-column row  
- Quick comparison list: `guide-highlights` with links to `/${locale}/catalog/[slug]`  
- FAQ: `GuideFaq` (`app/[lang]/guides/flowers-chiang-mai/GuideFaq`) with `{ q, a }[]` items  
- Final CTA: `guide-final-cta` + primary browse link; **`MessengerOrderButtons`** last (`contactOnly`, `pageLocation` such as `"guide"`)  
- Data shape (conceptually): per bouquet—**slug** (canonical catalog slug), **heading** (H3), **paragraphs**, optional **subheading** / **subParagraphs**, **whyItFits** (callout), **sectionMatch** (match note), plus display fallback name if CMS name missing  

**Info articles (MDX + inline cards)**  
- Route: `app/[lang]/info/[slug]/page.tsx`  
- Registry: `app/[lang]/info/_data/articles.ts`  
- Body: `content/info/[slug].en.mdx`, `content/info/[slug].th.mdx`  
- Product promotion: `CatalogProductCard` in `app/[lang]/info/[slug]/CatalogProductCard.tsx`  

**Shared**  
- Shared styling baseline: `app/globals.css`  

Only create new UI primitives when the user explicitly requests new UI or no existing primitive can satisfy the requirement.

## Information To Collect

Check whether these details are available before writing:

- Blog topic, angle, or existing blog post to reproduce
- Target reader and search intent (informational, comparison, transactional)
- Primary SEO keyword
- Secondary or related keywords
- Website products to promote, including product name and URL when possible
- Target location, if local SEO matters
- Target word count (if not given, default to 800-1200 words)
- Language: English, Thai, or bilingual
- Occasion, season, recipient type, or customer problem to focus on

If only a few details are missing, ask only for those. If the user wants a quick draft, make reasonable assumptions and clearly label them as **Assumptions** before the final output.

## Readability Targets

- Sentences mostly under 20 words.
- Paragraphs of 2-4 sentences.
- Use H2 every 200-300 words for scannability.
- Use bullets only when they help comparison or decision-making.
- Bold key phrases sparingly to guide skimmers.
- Prefer concrete advice over vague statements.
- Use active voice and second person ("you") where natural.

## SEO Requirements

Every complete blog draft must include:

- SEO title, around 50-60 characters
- Meta description, around 140-160 characters
- URL slug in lowercase with hyphens, based on the focus keyword
- Focus keyword
- 3-6 related keywords
- Short excerpt for blog listings
- Clear H1, H2, and H3 headings
- At least 2 internal product callouts
- 1-2 internal links to relevant category or pillar pages, when applicable
- FAQ section with 3-5 practical questions
- Image alt text suggestions for the featured image and at least 2 in-article images
- Open Graph title and description for social sharing

Use the focus keyword in the H1, the introduction, one H2 when natural, and the conclusion. Use related keywords in subheadings and body text. Never repeat the same keyword unnaturally.

## Product Promotion Rules

- Recommend 2-5 relevant products per article.
- Place product mentions where they genuinely help the reader choose flowers.
- Use descriptive anchor text such as "romantic red rose bouquet", not "click here".
- Give a short, specific reason why each product fits the blog topic.
- Keep product callouts brief and useful, never paragraphs of marketing.
- If a product URL is missing, write the product name clearly so the user can link it later.
- Do not state composition, color, price, size, delivery, or stock unless the user provides it.

Use this **Recommended** block in editorial copy (same messaging appears in guides as `guide-inline-callout` beside the bouquet card):

> **Recommended:** [Product Name](catalog URL or leave blank for later)
> Why it fits: [One specific reason tied to the blog topic, occasion, or recipient.]

**Guide pages:** Place this pair in the **left column** under section body copy; the live **`BouquetCard`** sits in the **right column** when the slug resolves from Sanity. Add a separate short line for editorial clarity:

**Section match note:** [One sentence—who or what occasion this section targets—maps to `guide-match-note` / `sectionMatch`.]

## Website Product Card Elements

When inserting promoted products, mirror the website product-card style using these fields:

- Product Name - English (`nameEn`)
- Product Name - Thai (`nameTh`) when available
- Product URL - English (`urlEn`)
- Product URL - Thai (`urlTh`) when Thai or bilingual output is requested
- Product Category (`category`) such as `roses`, `mixed`, `mono`, `gifts`
- Product Type (`type`) such as `bouquet`, `product`, `plushyToy`

Use these editorial blocks so implementation matches the site:

**Product Card (info / MDX path):**
- Name (EN): [Product name from catalog]
- Name (TH): [Thai name or "N/A"]
- Category: [category]
- Type: [type]
- URL (EN): [full URL]
- URL (TH): [full URL for Thai or "N/A"]
- Why this product matches this section: [One short reader-focused reason]

**Bouquet guide section (guide path)** — one block per promoted bouquet:
- **Slug:** [exact catalog slug—must match Sanity/product URL]
- **Heading (H3):** [Section title]
- **Paragraphs:** [2–4 short paragraphs as array items]
- **Optional subheading + paragraphs:** [H4 + supporting lines when needed]
- **Why it fits:** [Recommended callout line]
- **Section match note:** [Who/when this pick fits—shown below the card row]
- **Fallback display name (EN):** [Stable English label if CMS name unavailable]

Selection rules:
- Pull product names and URLs from the website catalog when available.
- Match products by intent first (occasion, recipient, mood), then by flower/category.
- Prefer clean names without emoji in headings unless user asks to keep emoji.
- If two products are very similar, keep only one to avoid repetitive cards.
- Use 2–4 product sections in most posts; use 5 only for comparison-heavy topics.
- Reuse existing **`BouquetCard`** (guides) or **`CatalogProductCard`** (info MDX); do not design new card styles for a single article.
- For **info** articles implemented in MDX:
  - `<CatalogProductCard slug="product-slug" />`
  - Optional: `<CatalogProductCardGrid>` wrapping multiple cards.
- For **guides**, wire slugs in page data and fetch with `getBouquetBySlugFromSanity`; cards render only when data exists—Recommended links still work from copy.
- Ensure each product slug exists in the site catalog / Sanity before using it.

## Reproduce An Existing Blog Post

Use this workflow when the user provides an old or competitor blog post to reproduce:

1. Identify the original topic, intent, and useful facts.
2. Extract the focus keyword, supporting keywords, and target reader.
3. List the products promoted in the original (or that should be promoted).
4. Plan a fresh outline with stronger structure and clearer headings.
5. Rewrite the article with original wording, not sentence-by-sentence paraphrase.
6. Improve readability, keyword placement, and product recommendations.
7. Add any missing SEO fields from the **SEO Requirements** section.
8. Run the **Final Self-Check** before delivering.

## Design Improvement Pass

When the source article feels weak, outdated, or hard to read, apply this upgrade pass before finalizing:

1. Replace vague headings with clear benefit-driven headings.
2. Rewrite long blocks into short paragraphs and scannable lists.
3. Add a stronger opening hook that states who the article helps and why.
4. Insert product cards at natural decision points, not random positions.
5. Add a quick comparison section when readers need help choosing options.
6. Tighten CTA language so it sounds helpful, not pushy.
7. Ensure visual rhythm: heading → short body → product surface (**card or guide row**) → short body.
8. End with a clean conclusion and a next-step CTA.

Design quality guardrails:
- No paragraph should exceed about 90 words.
- Avoid more than two dense text sections in a row without a list, subheading, or card.
- Each H2 should solve one clear reader question.
- Keep style and tone consistent from intro to CTA.
- If bilingual, keep section parity so Thai and English have the same structure.
- At the end, run a visual alignment check and ensure hero content, CTA rows, product-card blocks, and section containers are centered according to the existing page pattern.

## Final Output Format

Use this exact structure. Provide Thai blocks only when Thai or bilingual is requested.

**SEO Title - English:**
[Search-friendly title, 50-60 characters]

**SEO Title - Thai:**
[Natural Thai title]

**Meta Description - English:**
[140-160 characters, includes focus keyword once, ends with a soft call to action]

**Meta Description - Thai:**
[Natural Thai meta description with the same intent]

**Suggested URL Slug:**
[lowercase-words-separated-by-hyphens]

**Focus Keyword:**
[Primary keyword]

**Related Keywords:**
[Comma-separated list, 3-6 items]

**Excerpt - English:**
[1-2 sentence summary for blog listing]

**Excerpt - Thai:**
[Natural Thai summary]

**Open Graph Title:**
[Social-friendly title, can differ from SEO title]

**Open Graph Description:**
[Short, engaging description for social shares]

**Featured Image Alt Text - English:**
[Descriptive alt text including main flower, color, and occasion]

**Featured Image Alt Text - Thai:**
[Natural Thai descriptive phrase]

**In-Article Image Alt Text Suggestions:**
[2-4 descriptive alt texts in English, plus Thai when bilingual]

**Product Cards / Bouquet Sections To Embed:**
[For `/info/`: 2–4 **Product Card** blocks + MDX lines. For `/guides/`: one **Bouquet guide section** block per promoted bouquet with accurate slugs.]

**Output Mode:**
Webpage Build Mode

**Implementation Package** — choose **one** path (or both if the user asks for dual delivery):

**Path A — Info article (`/info/`):**
1. **Article Meta Draft** (for `articles.ts`): slug, title / titleTh, excerpt / excerptTh, publishedAt (ISO), featured, cover, ctaLinks (EN/TH labels + href).
2. **MDX Draft - English** (`[slug].en.mdx`).
3. **MDX Draft - Thai** (`[slug].th.mdx`) when Thai or bilingual is requested.

**Path B — Guide page (`/guides/`):**
1. **Route slug:** folder name under `app/[lang]/guides/[guide-slug]/`.
2. **Metadata draft:** browser title, meta description, Open Graph title/description (align with `generateMetadata` fields).
3. **Hero + intro:** eyebrow line, H1, intro lede (see classes in **Implementation Constraints**).
4. **Section outline:** H2s + body for mood/education blocks as needed.
5. **Bouquet sections:** one **Bouquet guide section** block per product (slug-accurate).
6. **Comparison snapshot:** bullet lines with mood labels + product links (optional but matches birthday guide pattern).
7. **FAQ:** 3–5 `GuideFaq` items (question + concise answer).
8. **Final CTA:** closing heading, short paragraph, primary catalog link line; note that **MessengerOrderButtons** belongs at the very end.

When the user asks to "create page", "create webpage," or points at `/info/` vs `/guides/`, output the matching package first, then optional editorial notes.

**Webpage Sections:**

### Hero Section
- H1: [H1 Blog Title]
- Subheading: [1-2 sentence value-focused subtitle]
- Primary CTA Label: [Example: Shop Romantic Bouquets]
- Primary CTA URL: [Category/product URL]

### Intro Section
[Hook in 1-2 short sentences. State the reader's goal or problem. Include the focus keyword naturally.]

### Content Section 1
- Heading (H2): [H2 Section using a related keyword]
- Body:
[Helpful, specific content in short paragraphs.]

### Product Card Section 1
[Insert one Product Card block and matching MDX component line]
[Example MDX: <CatalogProductCard slug="red-rose-romance" />]

### Content Section 2
- Heading (H2): [H2 Section]
- Body:
[More helpful content. Use bullets only if they aid choice.]

### Optional Subsection
- Heading (H3): [H3 Subsection if needed]
- Body:
[Detail or example.]

### Product Card Section 2
[Insert one Product Card block and matching MDX component line]
[Example MDX: <CatalogProductCard slug="sunflower-bouquet" />]

### Content Section 3
- Heading (H2): [H2 Section comparing options, occasions, or colors when relevant]
- Body:
[Practical guidance.]

### FAQ Section

### [Question 1 a real customer asks]
[Clear, direct answer in 1-3 sentences.]

### [Question 2]
[Clear answer.]

### [Question 3]
[Clear answer.]

### Final CTA Section
- Heading: [Short closing heading]
- Body: [Short conclusion with natural focus keyword use]
- CTA Label: [Example: Browse Fresh Flower Bouquets]
- CTA URL: [Relevant category/product URL]
- Contact channel buttons: [Reserve for bottom only—on guides, `MessengerOrderButtons` after browse links]

---

### Guide Page Variant (`/guides/`) — match `birthday-flower-gift` patterns

Use when the deliverable is a comparison or occasion guide with multiple real bouquets.

#### Metadata (for developer handoff)
- Browser title, meta description, canonical path, OG title, OG description

#### Hero Section
- Eyebrow: [short line, e.g. occasion tag]
- H1: [Guide title]

#### Intro Band
- Lede: [2–3 sentences; focus keyword where natural]

#### Editorial Sections (H2 + body)
- Mood / how-to sections as needed (`popular-title` + `guide-body-text`)

#### Meet the bouquets (repeat per product)
- Heading (H3): [from Bouquet guide section block]
- Body paragraphs (+ optional H4 subsection)
- **Recommended + Why it fits** (callout; lives in text column beside card on desktop)
- **Section match note** (one line below the layout row)
- *Implementation:* card appears when Sanity returns bouquet for slug; copy still links to `/${lang}/catalog/[slug]`

#### At-a-glance comparison (optional)
- Short intro line + bullet list (`guide-highlights`) linking each named bouquet

#### FAQ Section
- 3–5 practical Q&As for `GuideFaq`

#### Final CTA Section
- Heading + supportive copy + browse link(s)
- LINE / WhatsApp row last (`MessengerOrderButtons`, contact-only)

## Writing Guidance

- Open with the reader's need, occasion, or feeling, not with brand history.
- Use practical examples: occasions, recipients, color meanings, and seasons.
- Mention the target location naturally once if provided.
- Vary sentence openings to avoid a robotic rhythm.
- End sections with a forward-pointing line when it improves flow.
- Make product promotion feel like helpful guidance inside the article.
- For Thai output, write natural Thai phrasing, not literal word-for-word translation.

## Internal Linking Guidance

- Link to 1-2 category or pillar pages when relevant (for example, a "red roses" category from a Valentine's article).
- Use descriptive anchor text matching the destination's topic.
- Do not over-link; one link per 150-250 words is a good ceiling.
- If destination URLs are unknown, write the anchor text clearly and add a short note like _link to the red roses category_ in brackets so the user can fill it in.

## Missing Information Questions

When details are missing, ask in this order:

1. Is this for **`/info/`** (MDX article), **`/guides/`** (bouquet comparison guide), or editorial-only copy?
2. What is the blog topic, or which existing post should be reproduced?
3. What primary SEO keyword should the article target?
4. Which website products should be promoted, and do you have their **exact catalog slugs or URLs**?
5. Any specific location, occasion, season, or recipient type to focus on?
6. Should the output be English, Thai, or bilingual?
7. Preferred article length?

## Final Self-Check

Before responding, verify:

- Output is ready to paste field-by-field (CMS) or section-by-section (guide handoff).
- Output is delivered as webpage sections (Hero, Intro, Content, product surfaces, FAQ, Final CTA), not one long chat text.
- For **info** webpage requests: Implementation Package Path A is complete (Article Meta + EN/TH MDX when needed).
- For **guide** webpage requests: Implementation Package Path B includes metadata draft, all **Bouquet guide section** blocks with **correct slugs**, FAQ items, and final CTA + bottom messaging placement.
- Product surfaces use valid catalog slugs: info articles reference `CatalogProductCard` slugs; guides list slugs that match Sanity/live URLs.
- SEO title, meta description, slug (as applicable), excerpt, focus keyword, and related keywords are present for the requested surface.
- Open Graph title and description are present when metadata is in scope.
- 2–4 promoted products (or sections) include specific fit reasons and match notes where the pattern calls for them.
- Contact / messenger prompts appear only in the **final** CTA area on guides and info articles unless the user asked otherwise.
- 1–2 internal category or pillar links are suggested where relevant.
- FAQs answer real customer questions in plain language.
- Featured and in-article image alt texts are included when images are part of the brief.
- Focus keyword appears naturally in title, intro, one heading, and conclusion where those elements exist.
- No invented prices, stock, delivery times, or discounts appear.
- Customer-facing prose blocks contain no JSON, raw schema, or unexplained code fences.
- No placeholder text remains.
- Thai blocks are included when Thai or bilingual is requested, and they sound natural.
- Layout guidance matches existing guide/info patterns (including guide two-column bouquet rows and bottom `MessengerOrderButtons` when applicable).
