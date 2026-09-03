---
name: flower-content-writer
description: Create high-quality copy-paste-ready English and Thai bouquet wording for Lanna Bloom admin (unique IKEA-style name, title intro, Google-ready description, composition). Use when adding flowers, naming bouquets, writing PDP copy, composition lists, slugs, or image alt text — not JSON, code, pricing, delivery, stock, or technical output.
---

# Flower Content Writer

## Purpose

Write bouquet copy a person can paste into the Lanna Bloom **admin product editor**. Output is for customers, not developers. No schemas, SQL, code, JSON, or CMS jargon.

Every SKU must sound unlike the rest of the catalog. If two bouquets could swap names or descriptions and still fit, rewrite.

For a complete good vs bad sample, read [examples.md](examples.md) after the field rules.

## Core Rules

- Human-friendly text only. Exact bold labels below. No placeholders.
- Always EN + TH. Thai must read as native copy, not a translated English paragraph.
- **Never duplicate fields.** Title intro ≠ description ≠ composition ≠ name.
- Write only from given facts and what is visibly in the bouquet. Do not invent flowers, stem counts, vase life, prices, same-day delivery, or reviews.
- If facts are missing, ask the short questions at the bottom. For a quick draft, state **Assumptions** first, then write.
- Do not require the user to supply a finished name. Invent one from the facts.

## Workflow (do this order)

1. Lock **Composition** from the photo/facts (what is actually in the bouquet).
2. Invent **Product Name** from mood and character, not from the flower list.
3. Write **Title intro** as a 3–5 line teaser a shopper reads under the name.
4. Write **Description** as a full Product introduction. Do not recycle the title intro.
5. Add slug and alt. Skip team note and SEO lines unless asked.

## Field Map

### 1. Product Name EN / TH

IKEA-style: a short, memorable invented name. Not a catalog label.

- Prefer 1–3 words. Easy to say. Hint mood or character, not the shopping list.
- Reject names like `White Rose Bouquet`, `12 Red Roses`, `Pink Mixed Flowers`, `Elegant Orchid Bouquet`.
- Do not put flower counts or wrapping in the name. Composition already does that.
- Thai: a natural Thai name with the same character, or keep the English name if it is meant as a brand-like word. Do not dump transliteration (`ไวท์ โรส บูเก้`).
- If other catalog names are in the request, do not collide with them.

### 2. Title intro EN / TH

Sits **under the name**. About **3–5 short lines**. Shown in full. No ellipsis. No “read more”.

- Speak to the shopper: who it is for, when to send it, how the arrangement feels.
- Not a flower inventory. Not a truncated description.
- Each line should earn its place. No filler, no slogan stack.
- Thai should match the feeling and roughly the length, not the English sentence order.

### 3. Description EN / TH

The **Product introduction** lower on the page. This is the quality-critical field.

**Length:** 120–180 words English. Thai of similar richness, not the same word count.

**Shape:** three short paragraphs with a blank line between them (the page keeps line breaks).

1. **Opening (also the search snippet).** 1–2 sentences. Name the bouquet’s character, the main flower or color in prose, and the gift moment. Must make sense if cut at ~160 characters. No keyword stuffing.
2. **The arrangement.** What this bouquet actually looks like: form (hand-tied, compact, garden, tall orchids), color temperature, how supporting flowers and greenery work. Specific, sensory, honest. If a flower is seasonal or may substitute, say so once, calmly.
3. **Why send it.** A specific recipient or occasion, plus one practical florist note (Chiang Mai heat, hotel delivery, “order ahead for [flower]”) only when it is true for this item. Close without hype.

Do not use bullets inside the description. Do not repeat the composition list. Do not promise nationwide same-day delivery.

### 4. Composition EN / TH

Comma-separated visible items only, main flower first, then supporting flowers, greenery, wrap or vessel.

Example: `White phalaenopsis orchids, ruscus, eucalyptus, cream wrap`

Not a paragraph. Same items in Thai, using natural Thai flower names.

## Optional Fields (only if asked)

- **Team note:** 1–3 sentences in a florist’s voice. Specific to this bouquet. Empty if not requested.
- **SEO title / SEO description:** SEO description is one sentence, ~150–160 characters, different from title intro. SEO title may be omitted (the page already adds the shop suffix).
- **Slug + alt:** slug from the unique English name. Alt describes the photo (flowers, colors), not the invented name alone.

## Quality Bar

**Pass only if all are true:**

- Swap test: this name and description would be wrong on a different bouquet.
- Opening of the description can stand alone as a Google snippet.
- Title intro could not be mistaken for the description or the composition.
- No banned phrases below.
- Thai sounds like a Thai florist wrote it.

**Banned (rewrite if any appear):**

- perfect for any occasion / for all occasions
- stunning, breathtaking, luxurious, premium (as empty adjectives)
- beautifully arranged / expertly crafted / handcrafted with love
- make it a gift they will never forget / from the heart
- in today’s fast-moving world / flowers have always been
- same-day flower delivery in Chiang Mai (unless the user confirmed it for this product)
- keyword stacks: `birthday flowers romantic bouquet flower delivery Chiang Mai`

Prefer concrete language: “soft blush ranunculus”, “a quiet thank-you”, “tall white orchids in a cream wrap”.

## Writing Voice

- Warm, elegant, calm. Helpful, not salesy.
- Simple English. Short sentences. Second person where it fits (“you”, “someone you love”).
- Specific over generic. Name the flower, the color, the shape.
- Mention Chiang Mai at most once, and only if it fits naturally.
- Never invent ratings, “best-selling”, or guaranteed vase life.

## Thai Voice

- Natural spoken-written Thai. polite but not stiff, not advertising Thai.
- Use real Thai flower names (กุหลาบ, กล้วยไม้ฟาแลน, ยูคาลิปตัส), not English left in Thai script unless the brand name stays English.
- Do not mirror English clause order. Rebuild the paragraph so it sounds native.
- Avoid calques: `ช่อดอกไม้พรีเมียมที่สวยงามอย่างลงตัว`.

## URL And Image

- Slug: lowercase, hyphens, from the unique English name.
- Alt: accessible photo description in EN and TH.

## Missing Information

Ask only what is still needed, in this order:

1. Flower type, main color, bouquet style (and a photo if possible).
2. Flowers, greenery, wrapping or vessel.
3. Occasion, recipient, or feeling.
4. Location, only if not Chiang Mai.

## Final Output Format

**Product Name - English:**

**Product Name - Thai:**

**Title intro - English:**

**Title intro - Thai:**

**Description - English:**

**Description - Thai:**

**Composition - English:**

**Composition - Thai:**

**Suggested URL Slug:**

**Suggested Image Alt Text - English:**

**Suggested Image Alt Text - Thai:**

Add Team note or SEO lines only when asked, with the same bold-label style.

## Final Self-Check

- Ready to paste into admin. No code, Sanity, SQL, or placeholders.
- EN + TH present. Thai is native, not machine-calqued.
- Name is IKEA-like and unique.
- Title intro is 3–5 lines, not a flower list, not a cut description.
- Description is 120–180 words EN, three paragraphs, snippet-safe opening, passes the swap test.
- Composition is a clean comma list in both languages.
- The four core fields do not copy each other.
- Slug is lowercase hyphenated. No banned phrases.
- Team note and SEO omitted unless requested.
