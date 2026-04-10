# GA4 / GTM codebase audit: non-GTM sources of purchase events

**Date:** 2026-03-16  
**Scope:** Audit of how GA4 events (especially purchase) are sent: client (GTM) vs server (Measurement Protocol), and source of purchase during manual-order flow.

---

## Summary (updated after Stripe-first checkout)

- **Purchase for revenue:** **Measurement Protocol only** — `sendPurchaseForOrder` from Stripe webhook, `sync-checkout-session` (same idempotency), admin mark-paid, and admin payment-status. **No** `purchase` push from `app/order/[orderId]/page.tsx` (removed `OrderPaidConversionTracker`).
- **Other ecommerce events** (cart, `add_payment_info`, etc.) still use **dataLayer → GTM** (`lib/analytics/gtag.ts`).

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
| Direct purchase send not using GTM | **Server:** Stripe webhook, sync-checkout-session, mark-paid, payment-status → `sendPurchaseForOrder` → Measurement Protocol. **Client:** `trackPurchase` / dataLayer still exists in `lib/analytics/gtag.ts` for potential GTM use but order success page no longer calls it for paid orders. |
| Config/event send for GA4 or Google tag | Client: no GA4 measurement ID or gtag config; only `NEXT_PUBLIC_GTM_ID` for GTM. Server: `GA4_MEASUREMENT_ID` and `GA4_MEASUREMENT_API_SECRET` for Measurement Protocol (see `lib/ga4/measurementProtocol.ts`). |

---

## 2. How purchase reaches GA4 (client vs server)

A `purchase` event can reach GA4 in two ways:

1. **Client (dataLayer → GTM):** App pushes `{ event: 'purchase', ... }` to `window.dataLayer` (in `lib/analytics/gtag.ts`). A GTM tag (e.g. GA4 Event, trigger: Custom Event = `purchase`) fires and sends to GA4. This happens when the user visits the order success page and the order is confirmed paid (e.g. after Stripe redirect or after admin marked paid).
2. **Server (Measurement Protocol):** When an order becomes paid (Stripe webhook `checkout.session.completed` / `checkout.session.async_payment_succeeded`, or admin “Mark as paid”, or admin payment-status set to PAID), the backend calls `sendPurchaseForOrder` → `sendPurchaseToGA4` in `lib/ga4/measurementProtocol.ts`, which POSTs to GA4’s Measurement Protocol. No page visit required.

So for **manual-order** flow: if the admin marks the order paid, the **server** will send one purchase via Measurement Protocol. If the user then visits the order success page and the app’s client gate treats the order as “Stripe paid” (e.g. due to `order.stripeSessionId`), the **client** may also push purchase to dataLayer (GTM → GA4), which can lead to duplicate purchase events in GA4. The recommended fix is to tighten the client gate so purchase is only pushed when the success page has Stripe context from the URL (`session_id` + `stripeStatus === 'paid'`).

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
| `components/OrderPaidPurchaseTracker.tsx` (on order page when paid) | Client: only place that calls `trackPurchase`; runs when order payment is confirmed (Supabase PAID or legacy paid). |
| `app/order/[orderId]/page.tsx` | Renders OrderPaidPurchaseTracker when order is paid; no direct analytics. |
| `lib/ga4/measurementProtocol.ts` | Server: sends `purchase` to GA4 via Measurement Protocol (env: `GA4_MEASUREMENT_ID`, `GA4_MEASUREMENT_API_SECRET`). |
| `lib/ga4/sendPurchaseForOrder.ts` | Server: idempotent send (atomic `ga4_purchase_sent` in DB); used by Stripe webhook, mark-paid, payment-status routes. |
| `app/api/stripe/webhook/route.ts` | Calls `sendPurchaseForOrder` on checkout.session.completed / async_payment_succeeded. |
| `app/api/admin/orders/[order_id]/mark-paid/route.ts` | Calls `sendPurchaseForOrder` when admin marks order paid. |
| `app/api/admin/orders/[order_id]/payment-status/route.ts` | Calls `sendPurchaseForOrder` when payment status is set to PAID. |

---

## 6. GTM double-check

In GTM Preview, for a manual-order success load:

1. Confirm which tags fire (GA4 Configuration, GA4 Event, etc.).
2. If a “purchase” event appears in GA4, check whether it’s from:
   - A tag with trigger “Custom Event = purchase” (then the app did push `purchase` to dataLayer), or  
   - Another trigger (e.g. Page View, or “Custom Event = generate_lead” with event name overridden to `purchase`).  

That will confirm whether the issue is (A) app pushing purchase when it shouldn’t, or (B) a GTM tag misconfiguration.
