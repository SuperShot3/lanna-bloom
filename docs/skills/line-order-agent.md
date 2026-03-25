# LINE order agent (OpenClaw) — backend tools

**Full agent behavior, role, and workflows:** [`../lanna-bloom-skill.md`](../lanna-bloom-skill.md).

The **website does not call the LINE Messaging API**. Only the **agent** talks to LINE. The site exposes business APIs and stores state (including **queued payment notifications** after Stripe marks an order paid).

## Authentication (website APIs)

All `/api/agent/line/*` routes use:

- **Header:** `Authorization: Bearer <LINE_AGENT_SECRET>`
- Env on Vercel: `LINE_AGENT_SECRET` (same secret configured on the agent).

## LINE Messaging API (agent host only)

- Set **`LINE_CHANNEL_ACCESS_TOKEN`** on the machine running OpenClaw (or your agent worker), **not** on the Next.js deployment.
- The agent uses it to `POST https://api.line.me/v2/bot/message/push` after it fetches pending work from the website.

## POST `/api/agent/line`

Actions: `upsertDraft`, `getHandoffUrl`, `searchCatalog`, `getOrderStatus` — see body shapes in [`app/api/agent/line/route.ts`](../../app/api/agent/line/route.ts).

## Payment-confirmed messages (poll + ack)

After Stripe webhook marks an order paid, if `line_user_id` is stored on the order, the website **inserts a row** (no LINE call). The agent **polls**, sends the chat message, then **acknowledges**.

### GET `/api/agent/line/pending-payment-notifications`

Optional query: `limit` (default 50).

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
      "suggestedText": "Payment received. Order …",
      "createdAt": "…"
    }
  ]
}
```

### POST `/api/agent/line/pending-payment-notifications`

Body:

```json
{ "ids": ["uuid", "…"] }
```

Marks those notifications delivered and updates admin “last LINE push” fields.

## Public handoff (browser)

- `GET /api/line-draft/resolve?token=<handoff>` — used by the cart page.

## Types / validation

- [`lib/line-draft/types.ts`](../../lib/line-draft/types.ts)
- [`lib/line-draft/validate.ts`](../../lib/line-draft/validate.ts)
- [`lib/line-notifications/pendingPayment.ts`](../../lib/line-notifications/pendingPayment.ts)

## Runtime logs (Vercel)

Each agent API request emits **one JSON line** to stdout with `"scope":"agent.line.api"` (search Logs for that string). Fields include `route`, `method`, `status`, `ms`, `action` (for `POST /api/agent/line`), redacted `lineUserId`, and a safe `error` / `extra` hint. Secrets are never logged.
