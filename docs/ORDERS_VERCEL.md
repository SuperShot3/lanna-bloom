# Orders on Vercel

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
5. **Logs** — In Vercel → Deployment → Functions → select the serverless function that ran when you **placed** the order. You should see `[orders] Created LB-xxxx Blob`. If it says `file/tmp`, Blob is not in use. If you see `[orders] Blob read failed` when **opening** the order link, check that `BLOB_READ_WRITE_TOKEN` is set for that environment and redeploy.

## Why the cart is empty when the user comes back

After a **successful** order, the cart is **cleared on purpose** so the user starts with an empty cart for the next order. So:

- User places order → success page → cart is cleared.
- User leaves and comes back later → cart is empty.

That is expected. The cart is stored in the browser (localStorage) and is only cleared after a successful "Place Order".

---

## Admin: view and remove orders

To see current orders and remove them (e.g. after delivery):

1. **URL (link spelling)**  
   - Local: `http://localhost:3000/admin/orders`  
   - Production: `https://<your-domain>/admin/orders`  
   Example: `https://www.lannabloom.shop/admin/orders`

2. **Secret**  
   Set `ORDERS_ADMIN_SECRET` in your environment (e.g. in Vercel: Project → Settings → Environment Variables). Use a long random string; this is not the same as the Blob token.

3. **Usage**  
   - Open the admin URL in the browser.  
   - Enter the same value as `ORDERS_ADMIN_SECRET` in the input and click **Continue**.  
   - The page will list all orders (newest first). You can open each order's details link and, after delivery, use **Remove** to delete it from the list.

4. **Without a secret**  
   If `ORDERS_ADMIN_SECRET` is not set, in production the list/remove API returns 401 until you set the secret and use it on the page.
