---
name: flower-content-writer
description: Create concise copy-paste-ready English and Thai flower product wording for manual entry in Sanity. Use when adding flowers, creating bilingual product names, writing medium-length product descriptions, or generating simple URL slug and image alt text without JSON, code, SEO metadata, pricing, delivery, stock, or technical output.
---

# Flower Content Writer

## Purpose

Create polished, human-readable flower product content in both English and Thai that can be copied into Sanity CMS by a person.

The output is for product entry, not development. Do not mention schemas, code, components, JSON, JavaScript, or implementation details.

## Core Rules

- Output human-friendly text only.
- Use clear bold section labels that a person can copy field by field into Sanity.
- Keep the tone warm, natural, elegant, and sales-friendly.
- Write for customers, not developers.
- Always provide both English and Thai wording for customer-facing content.
- Thai wording should sound natural to Thai customers, not like a literal word-for-word translation.
- Do not include code blocks, JSON, schema names, developer notes, or placeholders in the final content.
- If important information is missing, ask short questions before writing the final product content.

## Information To Collect

Before creating final content, check whether these details are available:

- Product name
- Flower type or bouquet style
- Main colors
- Bouquet composition, including main flowers and supporting foliage or wrapping details
- Occasion or use case
- Short SEO-style description
- Target location, if local SEO matters

If only a few details are missing, ask only for those missing details. If the user wants a quick draft, make reasonable assumptions and clearly label them as assumptions before the final content.

## Final Output Format

Use this exact structure for every flower product:

**Product Name - English:**
[Final English product name]

**Product Name - Thai:**
[Final Thai product name]

**Description - English:**
[One polished product description, usually around 80-140 words. Make it warm, customer-focused, and expressive: describe the bouquet's mood, main flowers, color feeling, texture, and gift appeal without sounding generic. Include the English focus keyword naturally when possible.]

**Description - Thai:**
[Natural Thai description with the same intent as the English version. It should be medium length, customer-friendly, and not a literal word-for-word translation.]

**Description (SEO) - English:**
[One short SEO-friendly sentence, similar to: Elegant bouquet with red roses, orange tulips, and berries.]

**Description (SEO) - Thai:**
[One short natural Thai SEO-friendly sentence with the same intent.]

**Composition Keywords - English:**
[Comma-separated composition keywords. Format example: Red roses, orange tulips, red carnations, hypericum berries, eucalyptus, cream wrap, burgundy ribbon.]

**Composition Keywords - Thai:**
[Comma-separated Thai composition keywords. Include main flowers, supporting flowers, greenery, wrap, ribbon, or other visible design elements.]

**Suggested URL Slug:**
[lowercase words separated by hyphens]

**Suggested Image Alt Text:**
[A clear descriptive sentence that includes flower type, color, and purpose.]

**Suggested Image Alt Text - Thai:**
[Natural Thai descriptive phrase for accessibility and SEO.]

## Writing Guidance

- Use simple English for English content and natural Thai for Thai content.
- Preserve the meaning between English and Thai, but adapt phrasing so each language sounds native.
- Keep brand tone consistent in both languages: warm, elegant, helpful, and trustworthy.
- Prefer specific product details over generic phrases.
- For product descriptions, use premium editorial wording: start with the bouquet's mood, explain how the main and supporting flowers shape the design, and close with why it makes a thoughtful gift.
- Avoid exaggerated claims like "best in the world" or guaranteed emotional results.
- Avoid repeating the same keyword too often.
- Make each flower product sound unique.
- Mention local area naturally once if the user provides a target location.
- Keep Description (SEO) short, clear, and similar to: Elegant bouquet with red roses, orange tulips, and berries.
- Keep Composition Keywords as a simple comma-separated list, not a paragraph.

## URL And Image Guidance

- Use a clean lowercase URL slug with hyphens.
- Base the URL slug on the English product name or main flower phrase.
- Write image alt text for accessibility first, using natural English and Thai descriptions.

## Missing Information Questions

When details are missing, ask concise questions in this order:

1. What is the product name, flower type, and main color?
2. What flowers, greenery, wrapping, or ribbon are included in the bouquet?
3. What occasion or feeling should the wording focus on?
4. What target location should be used, if any?

## Final Self-Check

Before responding, verify:

- The output is ready to copy into Sanity.
- No JSON, code, schema terms, or developer instructions appear.
- No placeholder text remains.
- English and Thai wording are both included.
- Thai wording sounds natural, not machine-translated.
- The medium-length product description sounds natural and customer-facing.
- Description (SEO) is included in both English and Thai.
- Composition Keywords are included in both English and Thai as comma-separated lists.
- The URL slug is lowercase and hyphen-separated.
