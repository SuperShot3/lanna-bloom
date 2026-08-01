---
name: blog-content-writer
description: Create SEO-optimized flower shop content—info MDX articles and `/guides/` bouquet guides—with natural product promotion, honest local florist expertise, highly scannable structure, and bilingual EN/TH when requested. Use for posts, guides, SEO copy, FAQs, slugs, OG fields, alt text, Sanity-ready blocks, or implementation handoffs matching `birthday-flower-gift` and info patterns.
---

# Blog Content Writer

## Purpose

Produce polished, ready-to-paste blog content that genuinely helps flower shoppers, reads easily, demonstrates real local flower and delivery experience, and uses SEO to improve discovery without writing for rankings first.

Default output mode is webpage-ready content blocks for editorial entry or handoff to developers, not a long plain chat article.

**Customer-facing copy blocks** (what readers see): do not include JSON, code, schema markup, or developer-only noise inside those blocks.

**Implementation handoffs** (when shipping a page in this repo): may name existing files, components, and slugs so work maps cleanly to `app/[lang]/guides/` or `content/info/`—keep that material in clearly labeled implementation sections, not mixed into hero/body prose meant for shoppers.

## Primary Objectives

Every article must:

- Fully answer the reader's search query.
- Demonstrate real local flower and delivery experience (Chiang Mai specifics, not generic advice).
- Be easy to scan on desktop and mobile.
- Support relevant Lanna Bloom services and products naturally, never as a hard-sell ad.
- Avoid generic, repetitive, or obviously AI-generated writing.
- Never invent prices, availability, delivery areas, credentials, statistics, or cultural facts.

## Core Implementation Rules

- Default language is English. Provide Thai when the user asks for Thai or bilingual.
- If important information is missing, ask short questions before writing.
- Default to **Webpage Build Mode** (section-by-section page output). Do not return only one long text block unless the user explicitly asks for text-only.
- For on-site articles and guides, reuse existing page patterns and UI primitives from this repository (guide routes under `app/[lang]/guides/`, info/MDX, catalog-driven cards, shared FAQ, global styles). Do not invent article-specific components unless the user asks for new UI.
- Do not put JSON, raw schema, or unexplained code inside **customer-facing prose blocks**; implementation sections may reference repo filenames and slugs when handing off a page build.

## Google People-First Quality Standard

Apply these requirements before SEO optimization:

- **Why:** Create the page to help Lanna Bloom's existing or intended audience complete a real goal. Do not choose topics primarily for search traffic, trends, or perceived ranking gains.
- **Original value:** Add first-hand flower-shop experience, local Chiang Mai context, practical examples, original analysis, or a clearer decision framework. Never merely summarize or lightly rewrite competing pages.
- **Complete enough, not long for its own sake:** Answer the reader's likely follow-up questions so they should not need another search. Use the shortest length that satisfies the intent; Google has no preferred word count.
- **Trust first:** Verify factual claims, avoid unsupported certainty, and cite reliable primary sources for claims readers cannot reasonably verify from the page. Never invent first-hand experience, testing, customer evidence, credentials, or sources.
- **Who:** Include an accurate byline and author/reviewer background when readers would expect it (see **Trust and Expertise**). If author details are unavailable, use the default byline instead of fabricating credentials.
- **How:** Record meaningful sources, review steps, first-hand evidence, and production methods. Recommend an AI/automation disclosure when automation substantially generated the content or readers would reasonably ask how it was made.
- **Honest titles and freshness:** Use descriptive, non-sensational titles. Never change a publication/update date unless the content changed substantially.
- **Focused publishing:** Keep topics within the site's flower, gift, occasion, recipient, delivery, and Chiang Mai expertise. Do not support scaled, low-attention publishing across unrelated topics.
- **Page experience:** Structure content for mobile reading, accessibility, clear navigation, and unobtrusive product promotion. Content quality does not compensate for a poor overall page experience.
- **E-E-A-T:** Use experience, expertise, authoritativeness, and especially trust as a quality lens, not as a single ranking factor. Apply stronger sourcing and expert review to health, safety, financial, legal, or other YMYL-adjacent claims.

SEO is allowed after these checks when it helps search engines discover and understand an already useful page.
Source of truth: [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Article Hierarchy

- Use only **one H1**. It must clearly describe the main search intent—no vague or overly creative titles that hide the subject.
- Write H2 headings that can be understood independently, out of context. Whenever possible, phrase them as real customer questions or specific topics (for example "Can hotels accept flowers before check-in?" rather than "Delivery considerations").
- Use H3 headings only for subsections, practical recommendations, or contextual calls to action—never to hit a heading-count target.

## Opening Section

Begin with a direct two- or three-sentence answer to the main question. The reader should understand the basic answer before scrolling.

Do not open with generic filler such as:

- "Flowers have been important for centuries."
- "In today's fast-moving world."
- "Choosing flowers can be difficult."
- "Flowers are a beautiful way to express emotions."

After the direct answer, place the hero image (`ArticleFigure`), then expand the topic in the sections that follow.

## Scannable Formatting

- Most paragraphs should contain one to three sentences; no paragraph should exceed about 90 words.
- Sentences mostly under 20 words. Use active voice and second person ("you") where natural.
- Never stack more than three or four plain paragraphs in a row without a visual or structural change. Rotate formats depending on the subject:
  - Short paragraphs (`p`)
  - Comparison or decision tables (markdown table, styled by `infoArticleTableMdxComponents`)
  - Bullet lists (`ul`/`li`)
  - Numbered instructions (`ArticleStepsBlock`)
  - Common-mistakes lists (plain bullets, see **Lists**)
  - Practical recommendation boxes (`ArticleChecklistBlock`)
  - A Chiang Mai florist's honest advice (plain H2 section)
  - Images (`ArticleFigure`)
  - Product cards (`ArticleProductPick` + `CatalogProductCard`, or `CatalogProductCardGrid`)
  - FAQs (H2 "FAQ" + H3 per question)
  - Calls to action
- Bold only the most important decision-making phrases. Do not bold entire paragraphs or repeatedly bold keywords for SEO.
- Use H2/H3 headings when they clarify distinct reader questions; do not add headings to meet a numeric cadence.

## Recommended Content Sequence

Use the elements below when they genuinely help the reader—do not force every item into a short article. Each item maps to something that already exists on the site; none require new UI.

1. **H1** — per Article Hierarchy.
2. **Author/reviewer line** — a short text line, not a separate box. See **Trust and Expertise** for the default wording.
3. **Publication date** — already automatic from `publishedAt` in `articles.ts` and shown in the page header; do not restate it in the body.
4. **Direct opening answer** — per Opening Section.
5. **Hero image** — `ArticleFigure`, placed right after the opening answer.
6. **Quick overview** (longer articles only) — an `ArticleChecklistBlock` (variant `default`) or short bullet list right after the hero image.
7. **Comparison or decision table** — real markdown table when it helps the reader choose (see **Tables**).
8. **Detailed H2 sections** — the article's main body.
9. **Supporting image** — an additional `ArticleFigure` mid-article, when it aids understanding.
10. **A Chiang Mai florist's honest advice** — see dedicated section below, when there is a genuine professional judgment to share.
11. **Common mistakes** — plain bullet list (see **Lists**), when readers commonly get something wrong.
12. **Numbered practical instructions** — `ArticleStepsBlock`, only when steps must happen in order.
13. **Relevant product recommendations** — `ArticleProductPick` + `CatalogProductCard`, or a `CatalogProductCardGrid` mid-article block (see **Product Promotion Rules**).
14. **Chiang Mai delivery information** — link to `delivery-policy` or `flower-delivery-address-chiang-mai` rather than restating policy details.
15. **Final CTA** — hand off `ctaLinks`/`ctaTitle` for the auto-rendered `ArticleCta`; don't hand-author a duplicate CTA block inside the MDX body unless it is intentionally different from the standard footer CTA.
16. **FAQ** — H2 "FAQ" + H3 per question (see **FAQ Section**).
17. **Optional reader offer** — only a real, active promo code (see **Optional Reader Offer**).
18. **Sources** — plain H2 "Sources" + link list, only when a claim needs citation.
19. **Related articles** — already automatic via `RelatedGuides`; do not author manually.

Not included: real breadcrumbs (the existing "← Guides" back link already serves this) and a jump-linked table of contents (headings don't have anchor IDs yet, so a TOC would not actually work). Rely on strong, scannable H2/H3s instead of promising jump navigation that doesn't function.

## Tables

Use a table when the visitor needs to compare options or make a decision. Tables must add information rather than repeat nearby paragraphs.

Good table subjects include:

- Occasion versus recommended flower
- Flower type versus meaning
- Flower type versus expected vase life
- Recipient versus appropriate bouquet style
- Delivery destination versus information required
- Budget level versus suitable arrangement
- Season versus likely flower availability

Keep mobile tables compact—three or four columns at most. Standard markdown tables (`| col | col |`) render automatically with `info-article-table` styling; no new component is needed.

## Lists

- Use bullet lists for independent facts, examples, or options.
- Use numbered lists only when steps must happen in a particular order (`ArticleStepsBlock`).
- When creating a common-mistakes section, explain both the mistake and why it matters, using this format:

> ✗ Entering only a hotel name without the guest's registered name — reception may be unable to identify the recipient.

## A Chiang Mai Florist's Honest Advice

Include this section when Lanna Bloom has a meaningful practical perspective to share. Use the heading:

`## A Chiang Mai florist's honest advice`

The section should:

- Make a clear professional judgment.
- Mention real local conditions or delivery experience.
- Explain trade-offs.
- Sometimes advise against an unsuitable option.
- Avoid automatically recommending the most expensive product.
- Avoid pretending that every flower is available year-round.

Possible subjects: seasonal availability, Chiang Mai heat, strong fragrances, hospital restrictions, hotel reception procedures, long-distance delivery, and bouquet durability.

## Local Chiang Mai Experience

Where relevant, discuss practical local considerations such as:

- Delivery to hotels and resorts
- Delivery to hospitals
- Delivery to condos and gated villages
- Recipient and hotel registration names
- Google Maps pins
- Same-day availability
- Chiang Mai weather
- Seasonal flower availability
- Deliveries to nearby areas
- Ordering from another country
- Secure international card payment
- English-speaking customer support

Only include local details that are directly relevant to the article.

## Information To Collect

Check whether these details are available before writing:

- Blog topic, angle, or existing blog post to reproduce
- Target reader and search intent (informational, comparison, transactional)
- Primary SEO keyword
- Secondary or related keywords
- Website products to promote, including product name and URL when possible
- Target location, if local SEO matters
- Any practical depth constraint; otherwise derive length from the reader's intent and topic complexity
- Language: English, Thai, or bilingual
- Occasion, season, recipient type, or customer problem to focus on
- Author/reviewer name, role, and relevant experience; never invent missing credentials
- First-hand business knowledge and reliable sources available for factual or non-obvious claims
- Whether a genuine local-experience angle ("honest advice") or a real, active promo code applies

If only a few details are missing, ask only for those. If the user wants a quick draft, make reasonable assumptions and clearly label them as **Assumptions** before the final output.

## Product Promotion Rules

- Show **4-6 products** per article as the standard range—not a hard quota; only recommend products that materially help the reader.
- Place product mentions where they genuinely help the reader choose flowers.
- Use descriptive anchor text such as "romantic red rose bouquet," not "click here."
- Give a short, specific reason why each product fits the blog topic, such as:
  - Best for hotel surprises
  - Suitable for same-day preparation
  - Longer-lasting choice
  - Lower-fragrance option
  - Premium romantic arrangement
  - Includes a teddy bear
- Keep product callouts brief and useful, never paragraphs of marketing.
- If a product URL is missing, write the product name clearly so the user can link it later.
- Do not state composition, color, price, size, delivery, or stock unless the user provides it.
- Do not insert unrelated products only to increase the number of product cards.
- Cadence: use a soft CTA after an early informational section, a product block near the middle, and one clear final CTA. Do not place "Order now" after every section.

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
- Use **4-6 product sections/cards** per article as the standard range.
- Reuse existing **`BouquetCard`** (guides) or **`CatalogProductCard`** (info MDX); do not design new card styles for a single article.
- For **info** articles implemented in MDX:
  - `<CatalogProductCard slug="product-slug" />`
  - Optional: `<CatalogProductCardGrid>` wrapping multiple cards for a mid-article comparison block.
- For **guides**, wire slugs in page data and fetch with `getBouquetBySlugFromSanity`; cards render only when data exists—Recommended links still work from copy.
- Ensure each product slug exists in the site catalog / Sanity before using it.

## Calls to Action

Calls to action must match the surrounding content. Examples:

- Explore bouquets suitable for hotel delivery
- View flowers available for same-day delivery
- Choose a birthday bouquet
- Check whether we deliver to your area
- Send flowers to Chiang Mai
- Ask us which seasonal flowers are freshest today

Follow the cadence from **Product Promotion Rules**: one soft CTA early, one product block mid-article, one clear final CTA. Avoid aggressive or repetitive sales language, and keep contact-channel actions (LINE, WhatsApp, "message us") at the **bottom** of the article in the final CTA area (`MessengerOrderButtons` with `contactOnly` on guides), unless the user explicitly requests otherwise.

## FAQ Section

Add **4-6 FAQs** when they answer genuine secondary questions. Each answer should:

- Give the answer in the first sentence.
- Usually stay between 40 and 80 words.
- Add information not already repeated elsewhere in the article.
- Reflect actual customer concerns.
- Avoid inserting keywords unnaturally.

Use questions related to ordering, delivery, flower availability, care, recipients, hotels, hospitals, payment, or suitable flower choices.

## Trust and Expertise

Identify the real author or reviewer. Default byline when no specific name is supplied:

> Written by the Lanna Bloom editorial team.
> Reviewed by the Lanna Bloom florist team in Chiang Mai.

Place this as a short text line near the intro or near the FAQ/final CTA area—not a separate visual box (no matching component exists yet).

Do not invent professional qualifications, years of experience, customer numbers, or awards. Where appropriate, explain that recommendations are based on experience preparing and delivering flowers in Chiang Mai.

## Research and Factual Accuracy

- Verify historical, botanical, medical, cultural, and safety claims using reliable sources.
- Provide sources for claims that are not based on Lanna Bloom's direct operational experience (see **Sources** in the Recommended Content Sequence).
- Do not present legends, flower symbolism, or cultural traditions as universal facts. Use wording such as:
  - Traditionally associated with
  - Commonly understood to represent
  - In some cultures
  - According to local tradition
  - Meanings can differ by country and occasion
- Do not invent exact percentages, lifespan claims, prices, or availability.

## Optional Reader Offer

A reader offer may appear near the end of selected commercial articles—only using a **real, currently active** promo code the user supplies (cross-check against the site's promo system in `lib/promo/`). Never invent a code, percentage, or expiry.

When included, it must state:

- Exact benefit
- Minimum order, when applicable
- Promo code
- Expiry date, when applicable
- Whether it can be combined with other promotions
- Whether delivery fees are included

Style it as an existing `blockquote` callout (`info-article-callout`)—no new component. Do not add a discount to every article; use offers only when commercially appropriate and trackable.

## Writing Style

Write in clear, natural international English. Use concrete advice instead of decorative language.

Prefer:

> "White lilies can have a strong fragrance, so check the hospital's flower policy before ordering."

Avoid:

> "Delicate blossoms dance gracefully through the timeless language of love."

Sound like a helpful local florist, not an encyclopedia, travel blogger, or aggressive salesperson.

- Open with the reader's need, occasion, or feeling, not with brand history.
- Use practical examples: occasions, recipients, color meanings, and seasons.
- Mention the target location naturally once if provided.
- Vary sentence openings to avoid a robotic rhythm.
- End sections with a forward-pointing line when it improves flow.
- Make product promotion feel like helpful guidance inside the article.
- For Thai output, write natural Thai phrasing, not literal word-for-word translation.

## Reproduce An Existing Blog Post

Use this workflow when the user provides an old or competitor blog post to reproduce:

1. Identify the original topic, intent, and useful facts.
2. Extract the focus keyword, supporting keywords, and target reader.
3. List the products promoted in the original (or that should be promoted).
4. Plan a fresh outline with stronger structure and clearer headings.
5. Rewrite the article with original wording, not sentence-by-sentence paraphrase.
6. Improve readability, keyword placement, and product recommendations.
7. Add any missing SEO fields from the **SEO Requirements** section below.
8. Run the **Final Self-Check** before delivering.

## Design Improvement Pass

When the source article feels weak, outdated, or hard to read, apply this upgrade pass before finalizing:

1. Replace vague headings with clear benefit-driven headings.
2. Rewrite long blocks into short paragraphs and scannable lists.
3. Add a stronger direct opening answer (see **Opening Section**).
4. Insert product cards at natural decision points, not random positions.
5. Add a quick comparison table when readers need help choosing options.
6. Tighten CTA language so it sounds helpful, not pushy.
7. End with a clean conclusion and a next-step CTA.

Additional guardrails:
- Keep style and tone consistent from intro to CTA.
- If bilingual, keep section parity so Thai and English have the same structure.
- At the end, run a visual alignment check and ensure hero content, CTA rows, product-card blocks, and section containers are centered according to the existing page pattern.

## Webpage Build Mode (Default)

Unless the user asks for a different format, always deliver the blog as a publish-ready webpage structure:

- Page metadata block (SEO + social)
- Hero block
- Direct opening answer + intro block
- Body section blocks (H2/H3 + short paragraphs, tables, lists, honest florist advice as needed)
- Product surfaces in context (MDX `CatalogProductCard` rows **or** guide bouquet sections with `BouquetCard` + Recommended callout)
- FAQ accordion content when genuine follow-up questions benefit the reader
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
- Each promoted bouquet: a block with narrative copy + optional live **`BouquetCard`** (same tile as catalog) when Sanity returns data for the slug; recommended link + "Why it fits" callout in the **text column** (`guide-inline-callout` inside `guide-bouquet-detail-copy`), layout via `guide-bouquet-detail-layout` / `guide-bouquet-detail-aside`  
- Short "why this pick matches the section" line: `guide-match-note` below the two-column row  
- Quick comparison list: `guide-highlights` with links to `/${locale}/catalog/[slug]`  
- FAQ: `GuideFaq` (`app/[lang]/guides/flowers-chiang-mai/GuideFaq`) with `{ q, a }[]` items  
- Final CTA: `guide-final-cta` + primary browse link; **`MessengerOrderButtons`** last (`contactOnly`, `pageLocation` such as `"guide"`)  
- Data shape (conceptually): per bouquet—**slug** (canonical catalog slug), **heading** (H3), **paragraphs**, optional **subheading** / **subParagraphs**, **whyItFits** (callout), **sectionMatch** (match note), plus display fallback name if CMS name missing  

**Info articles (MDX + inline cards)**  
- Route: `app/[lang]/info/[slug]/page.tsx`  
- Registry: `app/[lang]/info/_data/articles.ts`  
- Body: `content/info/[slug].en.mdx`, `content/info/[slug].th.mdx`  
- Product promotion: `CatalogProductCard` in `app/[lang]/info/[slug]/CatalogProductCard.tsx`  
- Tables: standard markdown tables, styled via `infoArticleTableMdxComponents`  
- Other in-body primitives already wired in `page.tsx`: `ArticleFigure`, `ArticleChecklistBlock` (variants `default`/`essential`/`recommended`/`tip`), `ArticleStepsBlock`, `ArticleProductPick`, `CatalogProductCardGrid`  
- Already automatic, do not hand-author: published date (from `publishedAt`), the "← Guides" back link, the final `ArticleCta` (fed by `ctaLinks`/`ctaTitle`), and `RelatedGuides`  
- Intentionally not built yet, do not promise them in copy: real breadcrumbs, a jump-linked table of contents (no heading anchor IDs), a dedicated author/reviewer visual box  

**Shared**  
- Shared styling baseline: `app/globals.css`  

Only create new UI primitives when the user explicitly requests new UI or no existing primitive can satisfy the requirement.

## SEO Requirements

Every complete blog draft must include:

- SEO title, around 50-60 characters
- Meta description, around 140-160 characters
- URL slug in lowercase with hyphens, based on the focus keyword
- Focus keyword
- 3-6 related keywords
- Short excerpt for blog listings
- A clear heading hierarchy: one H1, useful H2s, and H3s only where needed
- Relevant internal product callouts only where they improve the reader's decision
- 1-2 internal links to relevant category or pillar pages, when applicable
- FAQ section with 4-6 practical questions only when they add distinct value
- Image alt text suggestions for images actually included in the brief
- Open Graph title and description for social sharing
- Trust/provenance notes: author or reviewer, substantive sources, first-hand basis, and AI disclosure when reasonably expected

Use the focus keyword in prominent fields where accurate and natural; an exact match is not required in every section. Use related language to clarify the topic, never to satisfy a keyword quota.

## Internal Linking Guidance

- Link to 1-2 category or pillar pages when relevant (for example, a "red roses" category from a Valentine's article).
- Use descriptive anchor text matching the destination's topic.
- Do not add links to meet a density target; each link must help the reader verify a claim or continue a relevant task.
- If destination URLs are unknown, write the anchor text clearly and add a short note like _link to the red roses category_ in brackets so the user can fill it in.

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

**Trust & Provenance:**
- Author / reviewer: [Default byline from **Trust and Expertise**, or an accurate real name/role/experience if supplied]
- Sources / content basis: [Primary sources, first-hand evidence, and which claims they support]
- AI disclosure: [Include when AI substantially generated the content or readers would reasonably expect disclosure]

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
[For `/info/`: 4-6 **Product Card** blocks + MDX lines. For `/guides/`: one **Bouquet guide section** block per promoted bouquet with accurate slugs.]

**Output Mode:**
Webpage Build Mode

**Implementation Package** — choose **one** path (or both if the user asks for dual delivery):

**Path A — Info article (`/info/`):**
1. **Article Meta Draft** (for `articles.ts`): slug, title / titleTh, excerpt / excerptTh, publishedAt (ISO), featured, cover, ctaLinks (EN/TH labels + href), plus author/reviewer and disclosure needs for implementation.
2. **MDX Draft - English** (`[slug].en.mdx`).
3. **MDX Draft - Thai** (`[slug].th.mdx`) when Thai or bilingual is requested.

**Path B — Guide page (`/guides/`):**
1. **Route slug:** folder name under `app/[lang]/guides/[guide-slug]/`.
2. **Metadata draft:** browser title, meta description, Open Graph title/description (align with `generateMetadata` fields).
3. **Hero + intro:** eyebrow line, H1, intro lede (see classes in **Implementation Constraints**).
4. **Section outline:** H2s + body for mood/education blocks as needed.
5. **Bouquet sections:** one **Bouquet guide section** block per product (slug-accurate).
6. **Comparison snapshot:** bullet lines with mood labels + product links (optional but matches birthday guide pattern).
7. **FAQ:** 4-6 `GuideFaq` items (question + concise answer).
8. **Final CTA:** closing heading, short paragraph, primary catalog link line; note that **MessengerOrderButtons** belongs at the very end.

When the user asks to "create page", "create webpage," or points at `/info/` vs `/guides/`, output the matching package first, then optional editorial notes.

**Webpage Sections:**

### Hero Section
- H1: [H1 Blog Title]
- Subheading: [1-2 sentence value-focused subtitle]
- Primary CTA Label: [Example: Shop Romantic Bouquets]
- Primary CTA URL: [Category/product URL]

### Direct Opening Answer
[Two or three sentences answering the main question immediately—no generic intros.]

### Intro Section
[1-2 short sentences extending the hook. State the reader's goal or problem. Include the focus keyword naturally.]

### Content Section 1
- Heading (H2): [H2 Section, phrased as a real customer question where possible]
- Body:
[Helpful, specific content in short paragraphs.]

### Product Card Section 1
[Insert one Product Card block and matching MDX component line]
[Example MDX: <CatalogProductCard slug="red-rose-romance" />]

### Content Section 2
- Heading (H2): [H2 Section]
- Body:
[More helpful content. Use bullets, a table, or a common-mistakes list when they aid choice.]

### Optional Subsection
- Heading (H3): [H3 Subsection if needed]
- Body:
[Detail or example.]

### Optional: A Chiang Mai Florist's Honest Advice
[Genuine professional judgment, real local conditions, trade-offs—only when it applies.]

### Product Card Section 2
[Insert one Product Card block and matching MDX component line]
[Example MDX: <CatalogProductCard slug="sunflower-bouquet" />]

### Content Section 3
- Heading (H2): [H2 Section comparing options, occasions, or colors when relevant]
- Body:
[Practical guidance.]

### Optional: Common Mistakes
[✗ Mistake — why it matters, repeated for each mistake worth flagging.]

### FAQ Section

### [Question 1 a real customer asks]
[Clear, direct answer in the first sentence, 40-80 words total.]

### [Question 2]
[Clear answer.]

### [Question 3]
[Clear answer.]

### [Question 4]
[Clear answer.]

### Optional: Reader Offer
[Only with a real, active promo code—benefit, minimum order, code, expiry, stackability, delivery-fee inclusion.]

### Optional: Sources
[Plain link list, only when a claim needs citation beyond Lanna Bloom's operational experience.]

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
- Direct opening answer + lede: [2–3 sentences; focus keyword where natural]

#### Editorial Sections (H2 + body)
- Mood / how-to sections as needed (`popular-title` + `guide-body-text`)
- Optional: A Chiang Mai florist's honest advice section, when genuine

#### Meet the bouquets (repeat per product, 4-6 bouquets)
- Heading (H3): [from Bouquet guide section block]
- Body paragraphs (+ optional H4 subsection)
- **Recommended + Why it fits** (callout; lives in text column beside card on desktop)
- **Section match note** (one line below the layout row)
- *Implementation:* card appears when Sanity returns bouquet for slug; copy still links to `/${lang}/catalog/[slug]`

#### At-a-glance comparison (optional)
- Short intro line + bullet list (`guide-highlights`) linking each named bouquet

#### FAQ Section
- 4–6 practical Q&As for `GuideFaq`

#### Optional: Reader Offer
[Only with a real, active promo code.]

#### Final CTA Section
- Heading + supportive copy + browse link(s)
- LINE / WhatsApp row last (`MessengerOrderButtons`, contact-only)

## Missing Information Questions

When details are missing, ask in this order:

1. Is this for **`/info/`** (MDX article), **`/guides/`** (bouquet comparison guide), or editorial-only copy?
2. What is the blog topic, or which existing post should be reproduced?
3. What primary SEO keyword should the article target?
4. Which website products should be promoted, and do you have their **exact catalog slugs or URLs**?
5. Any specific location, occasion, season, or recipient type to focus on?
6. Should the output be English, Thai, or bilingual?
7. Preferred article length?
8. Is there a genuine local-experience angle ("honest advice") or a real, active promo code to feature?

## Final Self-Check

Before responding, verify:

- Output is ready to paste field-by-field (CMS) or section-by-section (guide handoff).
- Output is delivered as webpage sections (Hero, Direct Opening Answer, Intro, Content, product surfaces, FAQ, Final CTA), not one long chat text.
- There is only one H1, and every H2 has a clear purpose (many phrased as real customer questions).
- The direct answer appears in the first two to three sentences, before the hero image.
- The article is easy to scan: no wall of more than three or four plain paragraphs in a row; tables and lists are used where they genuinely add information.
- For **info** webpage requests: Implementation Package Path A is complete (Article Meta + EN/TH MDX when needed).
- For **guide** webpage requests: Implementation Package Path B includes metadata draft, all **Bouquet guide section** blocks with **correct slugs**, FAQ items, and final CTA + bottom messaging placement.
- Product surfaces use valid catalog slugs, follow the 4-6 count as a standard range, and each has a specific fit reason and match note—no products added solely to hit a count.
- SEO title, meta description, slug (as applicable), excerpt, focus keyword, and related keywords are present for the requested surface.
- Open Graph title and description are present when metadata is in scope.
- Contact / messenger prompts appear only in the **final** CTA area on guides and info articles unless the user asked otherwise.
- 1–2 internal category or pillar links are suggested where relevant.
- The FAQ has 4-6 items, each leading with the answer in the first sentence, adding information not already repeated, and reflecting real customer concerns.
- If included, the "Chiang Mai florist's honest advice" section makes a genuine judgment with trade-offs, and does not default to the priciest option or claim year-round availability.
- The page has a clear reader, purpose, and satisfying answer independent of search traffic.
- Original value or first-hand expertise is explicit; borrowed facts are verified, appropriately sourced, and cultural/symbolic claims use hedged language rather than stated as universal fact.
- Authorship/review details use the default byline (or accurate real credentials) and an AI/automation disclosure is included or flagged when readers would reasonably expect them.
- Title and dates are accurate, descriptive, and not manipulated for clicks or artificial freshness; the publication date is not restated manually in the body.
- Featured and in-article image alt texts are included when images are part of the brief.
- Focus keyword placement remains natural and never overrides clarity or accuracy.
- No invented prices, stock, delivery times, discounts, credentials, statistics, or cultural facts appear. Any reader offer uses a real, currently active promo code with all required fields.
- Customer-facing prose blocks contain no JSON, raw schema, or unexplained code fences.
- No placeholder text remains.
- Thai blocks are included when Thai or bilingual is requested, and they sound natural, with the same section structure as English.
- Layout guidance matches existing guide/info patterns (including guide two-column bouquet rows and bottom `MessengerOrderButtons` when applicable), and no breadcrumbs, jump-linked TOC, or dedicated author box are promised since they aren't built yet.
