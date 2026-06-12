# Conversation handover — Supabase connectivity & migration

**Date:** 2026-06-10  
**Prior chat context:** Started in `zapret2-youtube-discord` repo (unrelated). Real app work is in this project (`flower_shop`).

---

## Original problem

- Running `npm run dev` locally could not fetch data from Supabase.
- Goal: migrate data from Supabase to another database.

---

## What we verified (network is fine)

```bash
curl -I "https://kwbffyojrdjlehdhpptf.supabase.co/rest/v1/"
```

**Result:** `HTTP/2 401` + `UNAUTHORIZED_MISSING_API_KEY`

| Meaning | Detail |
|---------|--------|
| Network works | Supabase is reachable from Mac (Cloudflare `DME` edge). No VPN/zapret needed. |
| 401 cause | Request had no `apikey` / `Authorization` header — auth issue, not blocking. |

Authenticated test:

```bash
curl "https://kwbffyojrdjlehdhpptf.supabase.co/rest/v1/TABLE_NAME?select=*&limit=5" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Use **service role key** only for local migration scripts (never in browser / `NEXT_PUBLIC_*`).

---

## This project — env status

**Project ref:** `kwbffyojrdjlehdhpptf`

`.env.local` already contains (confirmed present, values not copied here):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

See `.env.example` for full variable list and docs (`docs/ORDERS_SUPABASE.md`).

**If dev still fails after keys are set:**

1. Restart `npm run dev` after any `.env.local` change.
2. Check browser Network tab — `401` (key), `403` (RLS), CORS (fetch from browser vs server).
3. Confirm Supabase client reads `NEXT_PUBLIC_*` vars (grep `createClient` / `@supabase`).

---

## Migration options (preferred order)

### 1. Full Postgres dump (best)

Supabase Dashboard → **Project Settings → Database** → connection string.

```bash
pg_dump "postgresql://..." --no-owner --no-acl -f backup.sql
```

Import into target DB with `psql` or provider UI.

### 2. Supabase CLI

```bash
supabase login
supabase link --project-ref kwbffyojrdjlehdhpptf
supabase db dump -f backup.sql
```

### 3. Local Node script (table-by-table)

- Use `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`
- Run with `npx tsx scripts/...` — **not** through `npm run dev` / browser
- Project already uses Supabase for orders + catalog (see `.env.example`)

---

## Unrelated context (do not mix into this task)

- `zapret2-youtube-discord` is Windows-only DPI bypass — not needed for Supabase.
- Zapret runs per-device; router-wide needs Linux/OpenWrt zapret, not this Windows package.

---

## Suggested next steps for continuing agent

1. Reproduce the exact fetch error in `flower_shop` (browser vs API route vs script).
2. If `401` — trace where API key is missing in client/server code.
3. If `403` / empty data — check RLS policies (`supabase/migrations/`).
4. If migration is the goal — implement or run `pg_dump` / export script; define target DB.
5. Do **not** commit `.env.local` or paste service role keys into chat.

---

## Paste into new Cursor chat (short prompt)

```
Continue from docs/CONVERSATION_HANDOVER.md in flower_shop.

Problem: npm dev couldn't fetch from Supabase (kwbffyojrdjlehdhpptf). curl proved network OK; 401 was missing API key. .env.local already has SUPABASE_* and NEXT_PUBLIC_SUPABASE_*.

Help me: (1) fix any remaining fetch issue in dev, (2) migrate/export data to [TARGET DB].
```

Replace `[TARGET DB]` with your destination (e.g. Neon, Railway, local Postgres).
