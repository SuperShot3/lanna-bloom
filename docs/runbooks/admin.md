# Admin Runbooks

## Add admin user

### Option 1: Seed script (recommended)

1. Set env vars (one-time, never commit):
   ```
   ADMIN_SEED_EMAIL=admin@example.com
   ADMIN_SEED_PASSWORD=your_secure_password
   ```
2. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
3. Run: `npm run seed-admin`
4. Remove `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` from env after use.

### Option 2: SQL with pre-hashed password

1. Generate bcrypt hash locally:
   ```bash
   node -e "require('bcryptjs').hash('your_password', 10).then(console.log)"
   ```
2. In Supabase SQL Editor:
   ```sql
   INSERT INTO public.admin_users (email, name, password_hash, role, is_active)
   VALUES ('admin@example.com', 'Admin', '<hash_from_step_1>', 'OWNER', true)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
   ```

---

## Disable dual-write

Set in environment (Vercel or `.env.local`):

```
SUPABASE_DUAL_WRITE_ENABLED=false
```

New orders will no longer be written to Supabase. Legacy orders remain in Vercel Blob. Admin v2 will show only orders already in Supabase.

---

## Troubleshoot missing orders

1. **Check legacy vs Supabase**: Call `GET /api/admin/verify-supabase` while logged into admin-v2 (session cookie). Compare `legacyOnly` and `supabaseOnly` in the response.
2. **Single order**: `GET /api/admin/verify-supabase?orderId=LB-2026-xxx` to compare one order.
3. **Dual-write enabled?** Ensure `SUPABASE_DUAL_WRITE_ENABLED=true`.
4. **Supabase env vars**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
5. **Check server logs**: Look for `[supabase]` errors during order creation or Stripe webhook.

---

## Stripe webhook troubleshooting

1. **Logs**: Check Vercel logs or `stripe listen` output for `[stripe/webhook]` messages.
2. **Idempotency**: Webhook returns `{ received: true }` for already-processed orders (e.g. already paid). Stripe will not retry.
3. **Retries**: Stripe retries on 4xx/5xx. We return 500 on internal errors so Stripe retries.
4. **Signature**: Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint (e.g. `whsec_...` for live, different for `stripe listen`).
5. **Local testing**: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the printed webhook secret.

---

## Peak day checklist

Before a busy day (e.g. Valentine's, Mother's Day):

- [ ] Verify Stripe webhook endpoint is reachable (Stripe Dashboard → Webhooks)
- [ ] Confirm `SUPABASE_DUAL_WRITE_ENABLED=true` in production
- [ ] Test admin login at `/admin-v2/login`
- [ ] Run health check: `GET /api/health/orders` (dev or with `HEALTH_CHECK_ENABLED=true`)
- [ ] Ensure `BLOB_READ_WRITE_TOKEN` is set for order storage
- [ ] Check Resend/email config if order notifications are used
