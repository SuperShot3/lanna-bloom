# Orders on Vercel (DEPRECATED)

> **Supabase is now the primary order store.** See [ORDERS_SUPABASE.md](ORDERS_SUPABASE.md) and [ROLLOUT_STEPS.md](ROLLOUT_STEPS.md). Blob remains as optional fallback during migration.

## Why the order link shows 404

On Vercel, orders are stored in **`/tmp`** when Blob is not configured. `/tmp` is **not shared** between serverless instances and is cleared on cold starts. So:

1. User places order → order is saved to one instance's `/tmp`.
2. User or shop opens the order link later → another instance (or a cold start) handles the request → that instance's `/tmp` has no orders → **404**.

To fix this, orders must be stored in a **shared, persistent store** (Vercel Blob).

## Fix: Add Vercel Blob

1. In **Vercel Dashboard**: open your project (e.g. flower shop / Lanna Bloom).
2. Go to the **Storage** tab (not Marketplace).
3. Click **Create Database** (or **Connect Store** / **Add Storage**).
4. Select **Blob** → **Continue**.
5. Name the store (e.g. `lannabloom-orders`) and create it. Choose which environments (Production, Preview, Development) get the token.
6. Vercel adds **`BLOB_READ_WRITE_TOKEN`** to the project automatically.
7. **Redeploy** the project (e.g. push a commit or Deployments → Redeploy).

After redeploy, new orders are stored in Blob. Order links (e.g. `https://www.lannabloom.shop/order/LB-2025-xxx`) will work for **new orders**. Old orders created when using `/tmp` are not in Blob and will still 404.

### Checklist if order link shows "Order not found" when you click it (WhatsApp / Telegram)

1. **Blob token** — `BLOB_READ_WRITE_TOKEN` must be set in **Vercel → Project → Settings → Environment Variables** (and in the same environment as the deployment: Production / Preview). If it is only in `.env.local`, the deployed app does not see it. Without Blob, orders are stored in `/tmp`, which is **not shared** between serverless instances, so the instance that opens the link often has no orders.
2. **Share link domain** — Set `NEXT_PUBLIC_APP_URL` to your **live site URL** (e.g. `https://www.lannabloom.shop` or `https://your-app.vercel.app`). The link sent in the message is built from this. If you don't set it, Vercel uses `VERCEL_URL` (e.g. `https://your-project.vercel.app`), which is fine if that's the URL you use; if you use a custom domain, set `NEXT_PUBLIC_APP_URL` so the link uses that domain.
3. **Redeploy** — After adding or changing env vars, trigger a new deployment.
4. **New order** — Test with an order placed **after** the redeploy. Old orders created when Blob was not configured were never written to Blob.
5. **Logs** — In Vercel → Deployment → Functions → select the serverless function that ran when you **placed** the order. You should see `[orders] Created LB-xxxx Blob`. If it says `file/tmp`, Blob is not in use. If you see `[orders] Blob not found` when **opening** the order link, see (6).

6. **"The requested blob does not exist" / Blob not found** — This usually means **write and read use different Blob stores**. On Vercel, the same token must be used for **all environments** that need to share orders:
   - In **Vercel Dashboard → Your project → Storage → your Blob store**, check which environments have the token (Production, Preview, Development).
   - If the order was placed on **Preview** (e.g. branch deploy) but the link is opened on **Production** (or vice versa), and only one environment has the token, the other store is empty and the blob is "not found".
   - **Fix:** When you created/connected the Blob store, add **`BLOB_READ_WRITE_TOKEN` to Production and Preview** (same token value). Then redeploy both. After that, orders written when placing (any env) and reads when opening the link (any env) use the same store.

## Why the cart is empty when the user comes back

After a **successful** order, the cart is **cleared on purpose** so the user starts with an empty cart for the next order. So:

- User places order → success page → cart is cleared.
- User leaves and comes back later → cart is empty.

That is expected. The cart is stored in the browser (localStorage) and is only cleared after a successful "Place Order".

---

## Admin: view and remove orders

To see current orders and remove them (e.g. after delivery):

1. **URL**  
   - Local: `http://localhost:3000/admin-v2`  
   - Production: `https://<your-domain>/admin-v2`  
   Example: `https://www.lannabloom.shop/admin-v2`  
   (Legacy `/admin/orders` redirects to `/admin-v2/orders`.)

2. **Setup**  
   - Set `AUTH_SECRET` in your environment (required for NextAuth).  
   - Set Supabase env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DUAL_WRITE_ENABLED=true`).  
   - Seed admin users: `ADMIN_SEED_EMAIL=... ADMIN_SEED_PASSWORD=... npm run seed-admin`  
   - Run migration: `supabase/migrations/20250218100000_admin_users_audit_logs.sql`

3. **Usage**  
   - Open the admin URL in the browser.  
   - Sign in with email and password.  
   - View orders, update status, edit costs, and use **Delivered — Remove** on the order detail page after delivery.
