# GA4 / GTM codebase audit: non-GTM sources of purchase events

**Date:** 2025-03-11  
**Scope:** Strict audit for anything that can send GA4 events outside GTM, and exact source of purchase during manual-order flow.

---

## Summary

- **No direct GA4 senders in codebase.** There is no `gtag.js`, no GA4 measurement ID (e.g. G-KBRBDXFBM1), no Measurement Protocol, and no script that talks to GA4 except via GTM.
- **Purchase reaches GA4 only via dataLayer → GTM.** The app has a single code path that pushes `{ event: 'purchase', ... }` to `window.dataLayer`; GTM is the only thing that then sends to GA4.
- **Likely cause of purchase on manual-order flow:** The app’s **purchase gate** can treat some manual orders as “Stripe paid” and therefore **push purchase to dataLayer** even when the user never went through Stripe. GTM then sends that push to GA4. So the “non-GTM” source is not a second analytics sender; it is the **app incorrectly deciding to fire purchase** for manual orders. The fix is to tighten the gate so purchase is only pushed when the success page has Stripe context from the URL (e.g. `session_id` + paid status), not when the order object alone has Stripe IDs.

---

## 1. Searches performed

| Pattern | Result |
|--------|--------|
| `gtag(` | Only in `components/GoogleAnalytics.tsx`: `function gtag(){dataLayer.push(arguments);}` — no direct GA4 call, just dataLayer push. |
| `dataLayer.push(` | Used in: `GoogleAnalytics.tsx` (consent + GTM bootstrap), `InternalTrafficBootstrap.tsx`, `app/layout.tsx` (internal traffic), `lib/analytics/gtag.ts` (all events including purchase). All go to shared dataLayer; no direct GA4. |
| `G-KBRBDXFBM1` | No matches. |
| `googletagmanager.com/gtag` or `gtag/js` | No matches. Only GTM container script: `googletagmanager.com/gtm.js?id=...`. |
| `GoogleAnalytics` | Component name and docs only; no GA4 SDK or config. |
| `next/script` | Only in `GoogleAnalytics.tsx` for consent defaults and GTM loader. |
| Analytics script injection | No dynamic injection of gtag.js or GA4. |
| Direct purchase send not using GTM | Single purchase path: `OrderPaidPurchaseTracker` on `/order/[orderId]` (when paid) → `trackPurchase` (lib/analytics) → `lib/analytics/gtag.ts` → `dataLayer.push({ event: 'purchase', ... })`. No `gtag('event','purchase',...)` or Measurement Protocol. |
| Config/event send for GA4 or Google tag | No GA4 measurement ID or gtag config in repo. Only `NEXT_PUBLIC_GTM_ID` for GTM. |

---

## 2. Exact non-GTM “source” of purchase on manual-order flow

There is **no second sender** (e.g. direct gtag or server) in the codebase. The only way a `purchase` event gets to GA4 is:

1. App pushes `{ event: 'purchase', ... }` to `window.dataLayer` (in `lib/analytics/gtag.ts`).
2. A GTM tag (e.g. GA4 Event tag trigger: Custom Event = `purchase`) fires and sends to GA4.

So if GA4 shows a purchase during **manual-order** flow even though you’ve confirmed the GTM “purchase” tag doesn’t fire in that flow, then either:

- Another GTM tag is sending a purchase (e.g. GA4 Configuration with “Send ecommerce/dataLayer events”, or a tag that fires on something else but sends event name `purchase`), or  
- The app **is** pushing `purchase` to dataLayer in that flow (so a GTM tag **does** fire on it), because the app’s gate is treating the order as Stripe paid.

The codebase points to the second case as the main risk.

---

## 3. Why the app can push purchase for “manual” orders

**File:** `components/OrderPaidPurchaseTracker.tsx` (rendered on `app/order/[orderId]/page.tsx` when order is confirmed paid)

Purchase is gated by `stripePaidOrderId`, which is set only when:

```ts
isStripePaidOrder(order, sessionId ?? undefined, stripeStatus)
```

**Definition of `isStripePaidOrder`:**

```ts
function isStripePaidOrder(
  order,
  sessionId,      // from URL ?session_id=...
  stripeStatus    // 'processing' | 'paid' | 'payment_failed' | null
): boolean {
  if (!order || !isPaidOrder(order)) return false;
  const hasStripeContext = Boolean(sessionId && stripeStatus === 'paid');
  const hasStripePayment = Boolean(order.stripeSessionId || order.paymentIntentId);
  return hasStripeContext || hasStripePayment;
}
```

- **Manual order:** User places order via “Place Order” (bank/PromptPay). Redirect is to  
  `/{lang}/checkout/confirmation-pending?orderId=...` or `/order/[orderId]` when paid  
  So **no `session_id`** in URL → `sessionId` is undefined.
- If the **order** returned by `/api/orders/[orderId]` has `stripeSessionId` or `paymentIntentId` set (e.g. from an old Stripe attempt, migration, or bug), then:
  - `hasStripeContext` = false (no session_id in URL),
  - `hasStripePayment` = **true**,
  - so `isStripePaidOrder` = true once the order is paid.
- Then `stripePaidOrderId` is set, the purchase `useEffect` runs, and **`trackPurchase()` is called** → **dataLayer gets `event: 'purchase'`** → GTM sends it to GA4.

So the “exact non-GTM source” of that purchase is: **the app’s purchase gate relying on `order.stripeSessionId` / `order.paymentIntentId`**, which can be set for orders that were completed as manual (bank) from the user’s perspective. The **transport** to GA4 is still GTM; the **wrong decision to send** is in the app.

---

## 4. Recommended fix (so manual orders never push purchase)

- **Require Stripe context from the success page URL** before allowing purchase to be pushed:
  - Only fire purchase when **`sessionId` is present and `stripeStatus === 'paid'`** (i.e. user arrived from Stripe redirect and payment is confirmed).
  - Do **not** treat an order as “Stripe paid” for analytics solely because `order.stripeSessionId || order.paymentIntentId` is set.

Concretely: change the gate so that `stripePaidOrderId` is set only when:

- `sessionId` is truthy, and  
- `stripeStatus === 'paid'`, and  
- `order` is paid and has the required fields.

Remove the `hasStripePayment` leg from `isStripePaidOrder` for the purpose of **firing purchase** (or introduce a separate “allow purchase” check that requires `sessionId` + `stripeStatus === 'paid'`). That way, manual-order flow (no `session_id` in URL) never pushes purchase to dataLayer, and GTM will never send purchase for that flow.

---

## 5. File reference

| File | Role |
|------|------|
| `components/GoogleAnalytics.tsx` | Loads GTM only; defines `gtag` as `dataLayer.push(arguments)`. No GA4 script. |
| `app/layout.tsx` | Pushes `traffic_type: 'internal'` to dataLayer when internal cookie set. No purchase. |
| `components/InternalTrafficBootstrap.tsx` | Pushes `traffic_type: 'internal'` on route change. No purchase. |
| `lib/analytics/gtag.ts` | All events (including purchase) via `dataLayer.push`. No gtag.js, no GA4 ID. |
| `lib/analytics.ts` | Re-exports and wraps gtag helpers; `trackPurchase` → gtag `trackPurchase`. |
| `components/OrderPaidPurchaseTracker.tsx` (on order page when paid) | Only place that calls `trackPurchase`; runs only when order payment is confirmed (Supabase PAID or legacy paid). |
| `app/order/[orderId]/page.tsx` | No analytics; no purchase. |
| No API routes | No server-side GA4 or Measurement Protocol. |

---

## 6. GTM double-check

In GTM Preview, for a manual-order success load:

1. Confirm which tags fire (GA4 Configuration, GA4 Event, etc.).
2. If a “purchase” event appears in GA4, check whether it’s from:
   - A tag with trigger “Custom Event = purchase” (then the app did push `purchase` to dataLayer), or  
   - Another trigger (e.g. Page View, or “Custom Event = generate_lead” with event name overridden to `purchase`).  

That will confirm whether the issue is (A) app pushing purchase when it shouldn’t, or (B) a GTM tag misconfiguration.
