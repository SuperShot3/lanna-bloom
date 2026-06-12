# Newsletter Signup MVP

Lightweight newsletter signup system using Supabase for storage and Resend for email notifications.

## What Was Implemented

1. **Supabase table** (`newsletter_subscribers`)
   - Stores email (lowercase), source, status, created_at
   - Unique constraint on email
   - Trigger ensures email is stored lowercase
   - RLS allows public insert; admin reads via service role

2. **API route** (`/api/newsletter`)
   - POST only, JSON body with `email`, optional `source`, optional honeypot fields
   - Validates email, trims and lowercases
   - Honeypot: if `company`, `website`, `url`, or `phone_extra` is filled, returns generic success silently
   - Handles duplicate emails gracefully ("You're already subscribed")
   - Sends Resend notification to business email on successful new insert only

3. **Footer form** (`components/Footer.tsx`)
   - Submits to `/api/newsletter`
   - Loading state, button text "Subscribing..." during submit
   - Success / already subscribed / error / invalid email messages
   - Clears email only on successful new subscription
   - Honeypot field (hidden), inline validation, accessible messaging

4. **Resend notification**
   - Subject: "New newsletter subscriber"
   - Body: subscriber email, source, created time, website name

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `RESEND_API_KEY` | Yes | Resend API key |
| `ORDERS_FROM_EMAIL` | Yes | From address for emails (e.g. `Lanna Bloom <orders@lannabloom.shop>`) |
| `NEWSLETTER_NOTIFY_EMAIL` | No* | Recipient for newsletter signup notifications. Falls back to `ORDERS_NOTIFY_EMAIL` if unset. |

\* If neither is set, no notification email is sent (subscriber is still stored).

## Running the Migration

Run the migration in Supabase:

1. Supabase Dashboard → SQL Editor
2. Paste and run: `supabase/migrations/20250308000000_newsletter_subscribers.sql`

Or via CLI: `supabase db push`

## Assumptions

- Reuses existing `RESEND_API_KEY` and `ORDERS_FROM_EMAIL` from order emails
- Notification recipient can be `ORDERS_NOTIFY_EMAIL` or `NEWSLETTER_NOTIFY_EMAIL`
- No unsubscribe flow in this MVP
- No admin dashboard for subscribers
- Honeypot field `company` is sent from the form (hidden from users)
