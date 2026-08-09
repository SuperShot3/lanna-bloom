# Lanna Bloom — Thailand Province Expansion Roadmap

## Objective

Build a reusable national expansion system that allows Lanna Bloom to activate new Thai provinces gradually without creating a separate technical project for every province.

The final operating workflow should be:

1. Add or activate a province.
2. Configure its service level.
3. Connect one or more partners.
4. Define supported products or categories.
5. Configure delivery timing and limitations.
6. Allow customers to select the province and access the correct catalog.
7. Display accurate coverage information.
8. Publish a commercial SEO page when real ordering is available.

The expansion should reduce operational stress and avoid promising capabilities before they are reliable.

## Opening a province (operator checklist)

Use the project skill **`.cursor/skills/add-thailand-province/`** when asking the agent to open or wire a province.

Validate wiring locally:

```bash
npm run validate:province -- <province_code>
npm run validate:province -- <province_code> --amphoe
```

Tiers: **A** admin status only → **B** destination + markets + zones + SEO → **C** amphoe map (generalize Chiang Mai pattern). See the skill and `reference.md` for exact files (Header, Footer, admin map, coverage page).

## Important principles

- One national website
- One shared catalog
- One checkout system
- One admin system
- Province-specific availability and delivery rules
- Gradual activation rather than instant full launch
- Clear customer communication
- No unsupported same-day promises
- Preserve existing Chiang Mai functionality

## Implementation order

Do not implement all features together.

Each feature must first be planned in Cursor Plan Mode, reviewed, approved, implemented, and tested before beginning the next feature.

---

# Feature 1 — Province Control

## Goal

Create a central province configuration that controls the operating status of each province.

## Required province controls

The administrator should be able to understand and manage:

- Province name
- Public service status
- Whether catalog access is enabled
- Delivery service level
- Minimum advance-order requirement
- Same-day cutoff when applicable
- Customer-facing delivery message
- Delivery limitations
- Available products or categories
- Connected partners
- Internal notes
- SEO page status

## Public statuses

The system should support statuses equivalent to:

- Coming Soon
- Pre-order Only
- Next-Day Delivery
- Same-Day Delivery
- Temporarily Unavailable

Cursor must first inspect whether existing delivery-area, city, province, service-zone, or location models can support this before proposing new structures.

## Finished result

An administrator can configure one test province without editing application code.

Province settings must later be reusable by:

- Delivery-date rules
- Catalog access
- Province selection
- Partner management
- Thailand coverage map
- SEO landing pages

Those later customer-facing features are not part of Feature 1 unless required for a minimal validation test.

## Feature 1 acceptance criteria

- Existing Chiang Mai behavior remains unchanged.
- One test province can be configured through the intended admin workflow.
- Province status can be changed without a deployment.
- Catalog access can be enabled or disabled by province configuration.
- Minimum delivery notice can be stored by province.
- Customer-facing province messaging can be stored.
- The design does not duplicate an existing location system.
- No map or SEO page is implemented yet.

---

# Feature 2 — Partner Workflow Simplification

## Goal

Make it fast for administrators to add, update, and find partners by province.

Do not rebuild the existing partner system from zero.

## Admin partner information

Review the current partner workflow and remove unnecessary duplication.

The final admin workflow should clearly manage:

- Business name
- Province
- Main contact person
- Phone
- LINE
- Email
- Social-media information entered only once
- Delivery coverage
- Product capabilities
- Same-day capability
- Next-day capability
- Partner status
- Internal notes

Partners should be searchable and filterable by province and capability.

## Public partner application

The public application should remain simple and mobile-friendly.

A new shop should initially provide only:

- Business name
- Province
- Preferred contact information
- Short message

Detailed operational information can be completed later by an administrator.

Provide a clear direct-email contact option for businesses that do not want to complete a longer form.

## Feature 2 acceptance criteria

- Admin can add a basic partner quickly.
- Duplicate fields are removed or consolidated.
- Social-media information is not requested repeatedly.
- A partner can be connected to a province.
- Partners can be filtered by province.
- Product and delivery capabilities are understandable.
- Public application remains simple on mobile.
- No partner login or partner dashboard is introduced.

---

# Feature 3 — Province-Level Delivery Rules

## Goal

Extend the existing same-day and next-day logic so delivery restrictions can apply to an entire province, not only to individual products.

## Final rule

The strictest valid delivery restriction must win.

Examples:

- Product supports same-day; province supports next-day: next-day.
- Product requires 48 hours; province supports same-day: 48 hours.
- Province is temporarily unavailable: ordering is disabled.
- Province is Coming Soon: checkout is unavailable.

## Province controls

The intended province-level delivery configuration should support:

- Same-day delivery
- Next-day delivery
- Minimum hours or days of advance notice
- Same-day cutoff
- Temporary unavailability
- Customer-facing explanation

## Customer behavior

The delivery-date interface should automatically prevent invalid date selection and explain why earlier dates are unavailable.

Example:

> Delivery in Chiang Rai currently requires at least one day of advance notice.

Province restrictions must also be enforced through existing server-side order and checkout validation.

## Feature 3 acceptance criteria

- Province rules affect available delivery dates.
- Product and province restrictions work together.
- The strictest rule wins consistently.
- Chiang Mai behavior remains correct.
- One test province can operate as next-day or preorder-only.
- Invalid dates cannot be forced through checkout.
- Customer-facing limitations are clearly explained.

## Feature 3 status — complete

Implemented decisions:

- Product speed uses catalog `delivery_options` tags only (`same_day` / `next_day`); no product-level hours column.
- Longer advance (48h+) is configured via province `min_advance_notice_hours`.
- `preorder_only` with null advance defaults to **48 hours**.
- Province lookup at checkout uses `destination_id` (`getProvinceByDestinationId`); missing row falls back to shop-hours-only.
- Enforcement: date UI + `create-checkout-session` (strictest of shop hours, province, product tags).

---

# Feature 4 — Province Selection and Catalog Access

## Goal

Allow customers to select and change the delivery province during the shopping journey.

## Expected access points

Province selection should eventually be available from:

- Delivery Areas page
- Province landing page
- Catalog
- A persistent header or location control
- Cart before checkout

The exact interface should be proposed after auditing the existing location-selection experience.

## Expected behavior

The selected province should remain available throughout the customer session.

When the province changes, recheck:

- Catalog access
- Product availability
- Category availability
- Delivery dates
- Delivery fees
- Same-day eligibility
- Cart compatibility

Do not silently remove unavailable cart items.

Explain:

- Which item is affected
- Why it is unavailable
- Whether additional delivery time would solve the problem
- Whether the customer must replace or remove it

## Feature 4 acceptance criteria

- Customers can enter the catalog for an enabled province.
- Customers can change province.
- Coming Soon provinces cannot complete checkout.
- Delivery information updates after province changes.
- Cart conflicts are clearly explained.
- The selected province persists through the intended session.
- Existing Chiang Mai orders continue working.

---

# Feature 5 — Thailand Delivery Coverage Map

## Goal

Transform the existing Delivery Areas page into a Thailand-wide interactive coverage experience.

The map must display real province configuration. It must not use separately maintained delivery claims.

## Customer information

When a customer selects a province, show:

- Current service status
- Same-day, next-day, or preorder availability
- Earliest expected delivery timing
- Available product categories
- Delivery limitations
- Coverage notes
- Button to access the relevant catalog
- Coming Soon or partner-recruitment message when applicable

A searchable or selectable province list must remain available because the map alone may be difficult to use on mobile.

## Feature 5 acceptance criteria

- Map information comes from province settings.
- Updating province settings updates public coverage information.
- Active provinces link into the correct catalog experience.
- Limitations are visible before ordering.
- Mobile users can use a province list as well as the map.
- The page does not imply that all Thailand is currently active.

---

# Feature 6 — Province SEO Landing Pages

## Goal

Create reusable commercial landing pages for provinces where Lanna Bloom genuinely accepts orders or preorders.

These are not ordinary blog articles.

Example URL patterns may include:

- `/en/chiang-rai-flower-delivery`
- `/en/lamphun-flower-delivery`
- `/en/lampang-flower-delivery`

Final URL architecture must be reviewed against the existing routing, canonical, locale, and hreflang implementation.

## Required page information

Each published page should accurately explain:

- Current ordering availability
- Delivery timing
- Available categories
- Advance-order requirements
- Delivery coverage
- Delivery fees or fee calculation
- Supported delivery destinations such as homes, hotels, hospitals, and offices
- Province-specific FAQ
- Link to the relevant catalog

Operational facts such as province status and delivery timing should come from province configuration where practical, not be duplicated manually in multiple pages.

## SEO quality rule

Do not create thin pages that only replace one province name with another.

Every indexed page must provide real customer value and reflect actual service capability.

## Feature 6 acceptance criteria

- Page claims match current province settings.
- Customers can continue directly into the correct catalog.
- Canonical and hreflang behavior remains correct.
- No unsupported same-day claims are published.
- Active, preorder, Coming Soon, and unavailable provinces are handled appropriately.
- Pages contain meaningful local and operational information rather than duplicated filler.

---

# Release process

After every feature:

1. Explain what changed.
2. Show the finished admin and customer flow.
3. List assumptions and known limitations.
4. Run relevant automated tests. Do not Build Project every time ask user to check.
6. Validate one controlled test province.
7. Update this roadmap with the completed status and important decisions.
8. Do not begin the next feature without explicit approval.
