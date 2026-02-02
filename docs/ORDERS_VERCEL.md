# Orders on Vercel

## Why the order link shows 404

On Vercel, orders are stored in **`/tmp`** when KV is not configured. `/tmp` is **not shared** between serverless instances and is cleared on cold starts. So:

1. User places order → order is saved to one instance’s `/tmp`.
2. User or shop opens the order link later → another instance (or a cold start) handles the request → that instance’s `/tmp` has no orders → **404**.

To fix this, orders must be stored in a **shared, persistent store** (Vercel KV / Upstash Redis).

## Fix: Add Vercel KV (or Upstash Redis)

1. In **Vercel Dashboard**: open your project (e.g. flower shop / Lanna Bloom).
2. Go to **Storage** (or **Integrations**).
3. Create a **KV** or **Upstash Redis** database:
   - **Storage** → **Create Database** → **KV** (or use **Integrations** → **Upstash Redis**).
4. **Connect** the store to this project (link it to the project).
5. Vercel will add these env vars to the project:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
6. **Redeploy** the project (e.g. trigger a new deployment or push a commit).

After redeploy, new orders are stored in KV. Order links (e.g. `https://www.lannabloom.shop/order/LB-2025-xxx`) will work for **new orders**. Old orders created when using `/tmp` are not in KV and will still 404.

### Checklist if order links still 404 after adding KV

1. **Env vars in Vercel** — `KV_REST_API_URL` and `KV_REST_API_TOKEN` must be in **Vercel Dashboard → Your project → Settings → Environment Variables**. If they are only in `.env.local`, the deployed app does not see them.
2. **Redeploy** — After adding or changing env vars, trigger a new deployment (e.g. Deployments → … → Redeploy, or push a commit). The running app only gets the new vars after a deploy.
3. **New order** — Test with an order placed **after** the redeploy. Old order IDs were never written to KV and will always 404.
4. **Logs** — In Vercel, open a deployment → Functions → select the function that ran when you placed the order. You should see a log line like `[orders] Created LB-2026-xxx Redis`. If it says `file/tmp` instead of `Redis`, the app is not using Redis (env vars missing or wrong).

## Why the cart is empty when the user comes back

After a **successful** order, the cart is **cleared on purpose** so the user starts with an empty cart for the next order. So:

- User places order → success page → cart is cleared.
- User leaves and comes back later → cart is empty.

That is expected. The cart is stored in the browser (localStorage) and is only cleared after a successful “Place Order”.
