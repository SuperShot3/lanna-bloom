---
name: clean-policy-legal-document-ui
description: >-
  Improves Lanna Bloom policy, legal, and operational-rule pages into a clean,
  trustworthy document UI (typography, hierarchy, lists, tables, callouts).
  Use when creating or improving Delivery Policy, Refund & Return, Cancellation,
  Terms & Conditions, Privacy Policy, Cookie Policy, Payment Policy, Order Policy,
  same-day delivery rules, customer instructions, service conditions, legal notices,
  or FAQ-style operational rules — not marketing landing pages, catalog, or
  promotional info articles.
---

# Skill: Clean Policy & Legal Document UI

## Purpose

Use this skill whenever creating or improving pages that contain formal informational text rather than marketing content.

Typical examples:

* Delivery Policy
* Refund & Return Policy
* Cancellation Policy
* Terms & Conditions
* Privacy Policy
* Payment Policy
* Order Policy
* Same-Day Delivery Rules
* Customer Instructions
* Service Conditions
* Legal Notices
* FAQ-style operational rules

The goal is to make these pages look **clean, trustworthy, professional, and easy for normal customers to read**.

These are NOT marketing landing pages.

Do not add unnecessary promotional sections, illustrations, cards everywhere, gradients, giant hero sections, decorative icons, or AI-looking design elements.

---

# Main Rule

Treat the document like a professionally typeset online policy document.

The text itself is the main element.

The design should help people:

1. understand what the document is about;
2. scan sections quickly;
3. find important rules;
4. read comfortably on mobile;
5. identify warnings, exceptions, and important information;
6. trust that the page belongs to a legitimate business.

---

# Preserve the Content

Unless explicitly asked to rewrite the text:

* Do NOT change legal meaning.
* Do NOT remove conditions.
* Do NOT invent new rules.
* Do NOT make promises that are not present in the source.
* Do NOT turn precise rules into vague marketing language.
* Do NOT add fake legal terminology.
* Do NOT make the policy sound unnecessarily aggressive.

Minor formatting changes are allowed.

You may fix obvious spacing, punctuation, heading capitalization, or formatting inconsistencies when necessary.

If wording appears legally important or ambiguous, preserve it rather than guessing.

---

# Overall Page Style

Use a restrained, modern document layout.

Preferred structure:

**Page header**

Document title

Short optional description if one already exists.

Optional metadata such as:

* Last updated
* Effective date

Then the main document.

The document should normally sit inside a centered reading column.

Recommended maximum content width:

`720px–860px`

Do not stretch paragraphs across the entire desktop screen.

Use generous whitespace around the document.

---

# Typography

Typography should feel like a good modern documentation website.

Priorities:

* excellent readability;
* clear heading hierarchy;
* comfortable line spacing;
* strong contrast;
* consistent spacing.

Recommended body text:

`16px–18px`

Recommended line height:

`1.6–1.75`

Paragraph width should remain comfortable for reading.

Avoid:

* very small gray text;
* thin fonts;
* excessive uppercase;
* giant headings;
* excessive font-weight changes;
* decorative fonts;
* centered body text.

Body text should normally be left aligned.

---

# Heading Hierarchy

Use semantic HTML:

`h1` — document title

`h2` — major sections

`h3` — subsections when genuinely needed

Do not create headings only for visual decoration.

Headings must make the document easy to scan.

Example:

# Delivery Policy

## Delivery Areas

## Same-Day Delivery

## Delivery Time

## Recipient Availability

## Failed Delivery Attempts

## Delivery Fees

## Contact

---

# Section Spacing

Sections should be visually separated primarily with whitespace.

Do not automatically put every section inside a card.

Preferred:

Heading

Paragraph / list

Whitespace

Next heading

A subtle divider may occasionally be used between major sections.

Avoid creating a page containing 10–15 floating boxes.

---

# Lists

When several rules belong together, convert them into clean bullet or numbered lists when this does not alter the meaning.

Good use cases:

* requirements;
* conditions;
* delivery steps;
* exceptions;
* items that cannot be returned;
* customer responsibilities.

Maintain comfortable spacing between list items.

Do not make lists overly compact.

---

# Important Information

Important information can be visually highlighted, but highlights must remain restrained.

Use a simple callout box for things such as:

* Important
* Please note
* Same-day order deadline
* Non-refundable conditions
* Delivery limitations
* Safety information
* Required customer action

A callout should normally contain:

optional short label

1–3 short paragraphs or a small list

Use subtle background/border treatment.

Do NOT use huge warning banners unless the information is genuinely critical.

Do NOT use emojis as legal/policy icons unless explicitly requested.

---

# Tables

Use tables only when the information genuinely benefits from comparison.

Examples:

* delivery zones and fees;
* cancellation periods;
* refund eligibility;
* service time windows.

Tables must:

* work on mobile;
* have clear headers;
* use sufficient cell padding;
* avoid excessive borders;
* be horizontally scrollable on small screens if necessary.

Do not use a table simply to make a document look more designed.

---

# Mobile Design

Mobile readability is extremely important.

On small screens:

* reduce outer page padding;
* keep body font readable;
* avoid horizontal overflow;
* allow tables to scroll if necessary;
* keep headings proportional;
* keep buttons full-width only when appropriate;
* maintain comfortable spacing.

Recommended mobile side padding:

`20px–24px`

Never reduce body text to tiny sizes just to fit content.

---

# Navigation

For longer documents, optionally create a small **On this page** navigation near the beginning.

Only use it when the page has enough sections to justify it.

Example:

On this page

* Delivery areas
* Delivery schedule
* Same-day orders
* Recipient availability
* Failed delivery
* Refunds

Each item should link to its section using anchors.

Do not add this to very short policies.

---

# Links

Links should be clearly identifiable but visually consistent with the website.

Use descriptive link text when possible.

Prefer:

`Read our Refund Policy`

instead of:

`Click here`

External and internal links should maintain accessibility and keyboard usability.

---

# Buttons

Policy pages should contain very few buttons.

Buttons may be used for genuine actions such as:

* Contact Us
* Track Order
* Return to Shop

Do not add multiple marketing CTAs throughout the document.

A policy page should not look like a sales funnel.

---

# Branding

Use the existing site's design system:

* existing fonts;
* existing brand colors;
* existing header/footer;
* existing border radius system;
* existing spacing conventions.

However, the policy document itself should remain visually neutral.

Branding should support the document rather than dominate it.

Do not introduce a new design language only for policy pages.

---

# Accessibility

Always maintain:

* semantic HTML;
* readable contrast;
* keyboard-accessible links;
* visible focus states;
* proper heading order;
* accessible tables;
* adequate touch targets.

Do not communicate important meaning through color alone.

---

# What to Avoid

Never automatically create:

* giant marketing hero sections;
* stock images;
* flower photos;
* decorative illustrations;
* gradients;
* glassmorphism;
* excessive shadows;
* animated backgrounds;
* testimonial sections;
* product carousels;
* promotional banners;
* fake badges;
* statistics;
* multiple colorful cards;
* unnecessary icons for every heading;
* excessive animations.

Do not make the page look like an AI-generated SaaS landing page.

The desired impression is:

**professional business document + excellent typography + simple modern web UI**

not:

**marketing template**

---

# Reusable Components

When implementing multiple policies on the same website, prefer reusable components such as:

* `PolicyLayout`
* `PolicyHeader`
* `PolicySection`
* `PolicyCallout`
* `PolicyTable`
* `PolicyList`
* `PolicyNavigation`
* `PolicyFooter`

Keep styling centralized so Delivery Policy, Refund Policy, Privacy Policy, Terms, etc. share the same visual language.

Do not duplicate large amounts of CSS between individual policy pages.

---

# Existing Website Integration

Before creating a new policy style:

1. Inspect the existing site's typography.
2. Inspect its container widths.
3. Inspect existing colors and CSS variables.
4. Reuse existing layout/header/footer components when possible.
5. Reuse the project's responsive breakpoints.
6. Avoid introducing unnecessary dependencies.

If Tailwind, CSS modules, styled-components, or another existing styling system is already used, follow the project's existing convention.

---

# Editing Existing Policy Pages

When asked to improve an existing page:

First inspect the current implementation.

Keep:

* existing URLs;
* important IDs;
* SEO metadata;
* structured data;
* localization architecture;
* working links;
* legal text;
* tracking functionality.

Improve primarily:

* typography;
* hierarchy;
* spacing;
* content width;
* lists;
* tables;
* callouts;
* responsiveness;
* consistency.

Do not unnecessarily rebuild working application logic.

---

# Localization

The layout must work with different languages.

Do not hard-code layout assumptions based only on English text length.

For multilingual pages:

* preserve translation keys;
* do not replace translated content with hard-coded English;
* allow headings and buttons to expand naturally;
* keep the same document hierarchy between languages whenever practical.

---

# SEO

Policy pages should have normal semantic HTML and appropriate metadata.

Use:

* one clear `h1`;
* logical `h2/h3` structure;
* meaningful page title;
* appropriate meta description where the project already supports it;
* canonical URL where applicable.

Do not keyword-stuff legal documents.

SEO must never reduce readability.

---

# Final Quality Check

Before considering the work complete, check:

* Is the document comfortable to read for several minutes?
* Can a customer understand the hierarchy within 5 seconds?
* Is the main content width reasonable?
* Are important rules easy to find?
* Does it work correctly on mobile?
* Are lists easier to understand than dense paragraphs?
* Are warnings noticeable without looking aggressive?
* Does it use the existing website design system?
* Did we preserve the original meaning?
* Did we avoid unnecessary marketing UI?
* Does the page look like it was intentionally designed rather than generated from a generic template?

If any answer is no, improve the implementation before finishing.

---

# Desired Visual Direction

Think of the visual quality of:

* high-quality documentation;
* professional service agreements;
* modern banking help pages;
* premium ecommerce policy pages;
* clean government/service information pages.

The final result should feel **simple, calm, credible, structured, and human-readable**.

When uncertain, choose **less decoration and better typography**.

## Additional resources

- For Lanna Bloom file paths, existing CSS classes, and which skill to use, see [reference.md](reference.md)
