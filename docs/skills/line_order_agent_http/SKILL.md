---
name: line_order_agent_http
description: Call Lanna Bloom backend for LINE ordering (draft, handoff URL, catalog search, order status, payment notifications).
---

# LINE order agent — HTTP contract (skill)

Use this skill when you (the agent) need to call the **Lanna Bloom shop backend** to support LINE ordering.

This file is designed to be **actionable without guessing**: it includes exact endpoints, JSON bodies, response shapes, and the required calling sequence.

## Non-negotiable behavior rules (customer-facing)

- **Never invent** prices, stock, delivery fees, payment results, handoff tokens, or order statuses.
- **Never tell the customer you cannot show/link a cart.**
- If the user asks for cart/checkout/link: **ensure a draft exists** (`upsertDraft`), then call `getHandoffUrl`, then send the returned **`url` on its own line**.
- `lang` must match your reply language: **`en`** or **`th`**.

## Base URL + auth (mandatory)

- **Base**: `https://lannabloom.shop` (no trailing slash)
- **Headers** (every agent→shop call below):

```http
Authorization: Bearer <LINE_AGENT_SECRET>
Content-Type: application/json
```

Notes:
- The shop returns **401** for invalid/missing bearer token.
- If the shop is missing server env `LINE_AGENT_SECRET`, it may return **503**.
- Do not reveal secrets in chat.

## Endpoint 1: tool actions

All actions below are sent to:

- **POST** `/api/agent/line`

Body is always JSON with an `action` string plus fields per action.

### Action: `upsertDraft`

Purpose: store/replace the user’s **order intent** as a temporary draft (not a real order).

#### Request

```json
{
  "action": "upsertDraft",
  "lineUserId": "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "draft": {
    "items": [
      {
        "bouquetId": "string (required)",
        "slug": "string (required)",
        "nameEn": "string (required; must be a string)",
        "nameTh": "string (required; must be a string)",
        "size": { "key": "string (required)", "price": 0 },
        "addOns": { "cardType": null, "cardMessage": "", "wrappingPreference": null }
      }
    ],
    "form": {},
    "lang": "en"
  }
}
```

Draft validation requirements (server-enforced):
- `lineUserId` is required.
- `draft.items` must be a **non-empty array**.
- Each item must have at minimum: `bouquetId`, `slug`, `size.key`, `size.price`, and `addOns`.

Practical guidance:
- If you don’t have enough info to construct valid `draft.items[]`, ask short clarifying questions (e.g., bouquet + size).
- `draft.form` is optional and partial; you may omit it or send `{}`.

#### Response (success)

```json
{ "ok": true, "expiresAt": "2026-01-01T00:00:00.000Z" }
```

#### Errors (common)

- `400 { "error": "lineUserId is required" }`
- `400 { "error": "Invalid draft body" }`
- `400 { "error": "draft.items must be a non-empty array" }`
- `400 { "error": "Invalid draft item (need bouquetId, slug, size.key, size.price, addOns)" }`

### Action: `getHandoffUrl`

Purpose: generate a **browser URL** that loads the cart using a `handoff` token.

#### Request

```json
{ "action": "getHandoffUrl", "lineUserId": "U...", "lang": "en" }
```

Rules:
- `lineUserId` is required.
- `lang` is optional; if missing or invalid, backend defaults to `"en"`.

#### Response (success)

```json
{
  "ok": true,
  "url": "https://lannabloom.shop/en/cart?handoff=TOKEN",
  "handoffToken": "TOKEN"
}
```

Customer message rule:
- Send `url` **on its own line** with brief instructions above/below it.
- **Never invent** `handoffToken` or a handoff URL.

### Action: `searchCatalog`

Purpose: help the agent find products/slugs by keyword.

#### Request

```json
{ "action": "searchCatalog", "query": "rose", "limit": 10 }
```

Rules:
- `query` may be an empty string (will return default results per backend implementation).
- `limit` is optional; backend clamps to max **30** and defaults to **15**.

#### Response (success)

```json
{ "ok": true, "items": [] }
```

Notes:
- Item shape is backend-defined (agent should treat it as read-only facts).

### Action: `getOrderStatus`

Purpose: show recent order summaries for a LINE user (read-only facts from backend).

#### Request

```json
{ "action": "getOrderStatus", "lineUserId": "U..." }
```

#### Response (success)

```json
{
  "ok": true,
  "orders": [
    {
      "orderId": "LB-...",
      "orderUrl": "https://lannabloom.shop/.../order/...",
      "paymentStatus": "string",
      "fulfillmentStatus": "string",
      "grandTotal": 1234,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

Rules:
- If `orders` is empty, say you don’t see any recent orders for this LINE user yet and offer the cart link flow again.
- Do not embellish status values; repeat them plainly.

### Unknown actions

If you send an invalid action:

```json
{ "error": "Unknown action" }
```

## Endpoint 2: payment notifications (poll + ack)

After Stripe marks an order paid, the backend queues rows (the website itself does **not** call LINE). The agent should poll, push message via LINE, then acknowledge.

### GET `/api/agent/line/pending-payment-notifications`

Optional query: `limit` (default **50**, min 1, max 100).

Response:

```json
{
  "ok": true,
  "notifications": [
    {
      "id": "uuid",
      "orderId": "LB-…",
      "lineUserId": "U…",
      "orderUrl": "https://…/order/…",
      "suggestedText": "Payment received. Order LB-…. View details: https://…",
      "createdAt": "…"
    }
  ]
}
```

### POST `/api/agent/line/pending-payment-notifications`

Body (preferred):

```json
{ "ids": ["uuid", "…"] }
```

Response:

```json
{ "ok": true, "acknowledged": 2 }
```

## Required calling logic (happy path)

When the user wants to order / asks for cart / asks for checkout link:

1. **Build a minimal valid `draft`** with at least 1 `items[]` entry meeting validation (bouquetId, slug, nameEn, nameTh, size.key, size.price, addOns).
2. Call **`upsertDraft`** with `lineUserId` and that `draft`.
3. Call **`getHandoffUrl`** with the same `lineUserId` and correct `lang`.
4. Send the returned `url` to the user (URL on its own line).

When the user asks “what flowers do you have?” / “do you have roses?”:

1. Call **`searchCatalog`** with a short keyword.
2. Present a short list of matching items and ask which one they want.
3. Once chosen, proceed with the cart link flow above.

When the user asks “is my order paid?” / “order status?”:

1. Call **`getOrderStatus`** with `lineUserId`.
2. Summarize the most recent order(s) using returned fields only.

## If a shop API call fails / returns nothing

If any shop API call:
- fails (network/timeout), or
- returns non-`ok`, or
- returns an empty/missing body unexpectedly,

then do all of the following:

1. Append one line to `memory/shop-api-log.md` (timestamp, action, result, note). **No secrets.**
2. Apologize briefly and provide manual fallback cart URL:
   - `https://lannabloom.shop/en/cart` or `https://lannabloom.shop/th/cart`
3. **Never invent** handoff tokens/URLs.

## Implementation source of truth (repo)

If this contract ever drifts, update it to match:

- `app/api/agent/line/route.ts` (actions + validation + responses)
- `app/api/agent/line/pending-payment-notifications/route.ts`
- `lib/line-draft/types.ts` and `lib/line-draft/validate.ts`

