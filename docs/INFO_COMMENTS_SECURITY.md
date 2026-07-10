# Guide comments security

This document describes how the guide comment and helpful-reaction feature is secured.

## SQL injection prevention

- All database access uses the Supabase JavaScript client with parameterized filters (`.eq()`, `.insert()`, `.update()`, `.in()`). No raw SQL or string concatenation with user input.
- `guide_slug`, `author_name`, `author_email`, `body`, and `visitor_token` are validated server-side in [`lib/info/guideComments/validate.ts`](../lib/info/guideComments/validate.ts) before any query runs.
- `guide_slug` must match an allowlist derived from [`app/[lang]/info/_data/articles.ts`](../app/[lang]/info/_data/articles.ts) plus bespoke guide slugs, and must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Comment `status` is never accepted from public clients. New comments are always inserted as `pending`. Admin PATCH only allows `approved` or `hidden`.
- Visitor tokens are hashed with SHA-256 before storage; only the hash is stored in the database.

## XSS prevention

- Comments are stored as plain text only. Markdown and HTML are not rendered.
- Public UI renders `authorName` and `body` via React text nodes (see [`GuideCommentList.tsx`](../app/[lang]/info/_components/GuideCommentList.tsx)). `dangerouslySetInnerHTML` is not used for user content.
- Comment text is not included in JSON-LD, page metadata, or hidden DOM.
- Validation tests confirm script-tag payloads pass through as inert text when rendered by React.

## Admin route protection

- Admin pages under `/admin/info-comments` are protected by NextAuth middleware ([`middleware.ts`](../middleware.ts)) and the admin dashboard layout.
- Admin API routes call `requireRole(['OWNER', 'MANAGER'])` from [`lib/adminRbac.ts`](../lib/adminRbac.ts) before any database operation:
  - `GET /api/admin/info-comments`
  - `PATCH /api/admin/info-comments/[id]`
  - `DELETE /api/admin/info-comments/[id]`
- Public users cannot approve, hide, delete, or list pending comments through any public endpoint.

## RLS and database policies

Migration: [`supabase/migrations/20260710140000_guide_comments.sql`](../supabase/migrations/20260710140000_guide_comments.sql)

- `guide_comments` and `guide_comment_reactions` have RLS enabled.
- `anon` and `authenticated` roles have **all privileges revoked** on both tables.
- Only `service_role` has `SELECT, INSERT, UPDATE, DELETE`.
- No RLS policies grant public Data API access. All public traffic goes through Next.js API routes using the service role server-side.

Public users can only (via API routes):

- Submit a new pending comment
- Submit one helpful reaction per comment per visitor token
- Read approved comments and public reaction counts

Public users cannot:

- Read pending or hidden comments
- Read author emails
- Update comment status or delete comments

## Rate limits and anti-spam

Implemented in [`lib/rateLimit.ts`](../lib/rateLimit.ts):

| Control | Limit |
|---------|-------|
| Comment submit (per IP) | 5 per 15 minutes |
| Comment submit (per visitor token hash) | 1 per 60 seconds |
| Helpful reaction (per IP) | 30 per minute |
| Comment read (per IP) | 60 per minute |

Additional protections:

- Honeypot fields (`company`, `website`, `url`, `phone_extra`) — bots get fake success without insert
- Length limits: name 200, email 254, body 2000 characters
- Duplicate detection: same slug + visitor hash + body within 10 minutes returns success without new row
- Invalid or unknown guide slugs return 404
- Generic user-facing errors on 500 responses; details logged server-side only

**IP storage tradeoff:** Client IPs are used only in-memory for rate limiting and are not persisted. Limits reset on server restart/deploy, consistent with other public endpoints in this project.

## CSRF and request safety

- Public write endpoints accept JSON `POST` without cookie-based auth (same pattern as newsletter and delivery-location requests).
- Admin mutations use NextAuth session cookies with existing SameSite protections.
- Public routes export only `GET` and `POST` as applicable. No open redirects or external fetch URLs are accepted from this feature.

## Data privacy

- `author_email` is optional and shown only in the admin moderation UI.
- Raw visitor tokens are not stored; only SHA-256 hashes are kept for cooldown, deduplication, and one-like-per-visitor enforcement.
- Raw IP addresses are not stored.

## Security tests performed

| Test | Result |
|------|--------|
| SQLi strings in name, email, body, slug | Rejected or stored safely; no SQL errors exposed |
| XSS payloads in name/body | Stored as plain text; React text rendering |
| Admin PATCH/DELETE while logged out | 401 Unauthorized |
| Public GET for unknown/SQLi slug | 404 |
| Rapid comment POSTs | 429 after limit |
| Rapid like POSTs | 429 after limit |
| Like on non-approved comment | 404 |
| Empty / overlong body | 400 validation error |
| Honeypot filled | 200 fake success, no insert |
| Public GET omits email; admin list includes email | Pass |
| Unit tests in `lib/info/guideComments/validate.test.ts` | Pass |

## Key files

- Validation: `lib/info/guideComments/`
- Public API: `app/api/info/comments/`
- Admin API: `app/api/admin/info-comments/`
- Admin UI: `app/admin/(dashboard)/info-comments/`
- Public UI: `app/[lang]/info/_components/GuideComments.tsx`
