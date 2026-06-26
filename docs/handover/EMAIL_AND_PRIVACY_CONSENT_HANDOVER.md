# Handover — Abandoned checkout email + cookie/privacy consent

**Date:** 2026-06-25  
**Project:** Lanna Bloom Thailand (`flower_shop`, `lannabloom.shop`)  
**Locales in scope:** EN + TH (not RU storefront — RU copy is reference only)  
**Status:** Abandoned checkout **shipped**; privacy/cookie compliance **not yet done**

---

## Why this document exists

Two related conversations were merged here:

1. **Abandoned checkout recovery email** — built and working; legal/trust gap identified.
2. **Cookie consent banner** — implemented on EKB Flowers (Russia); needs porting to Thailand with GTM gating + PDPA-aligned copy.

**Important:** Cookie consent and email processing are **different legal bases**. One banner can cover both topics in copy, but accepting cookies does **not** automatically legalize all emails.

---

## Part 1 — What was built (abandoned checkout)

### Behaviour

| Step | What happens |
|------|----------------|
| Cart → Pay | If customer entered **email** on cart form, server inserts `checkout_abandonments` row |
| Schedule | Recovery email due **~30 min** later (`ABANDONED_CHECKOUT_DELAY_HOURS`, default `0.5`) |
| Cron | `/api/cron/send-abandoned-checkout-emails` every 30 min (`vercel.json`) |
| Email | ECC template `abandoned_checkout` → outbox → Resend |
| Link | `/{lang}/cart?recover={token}` restores **cart items + delivery/contact form** |
| Cancel | On successful payment (`fulfillStripeCheckout`) or expired/abandoned cleanup |

### Key files

| Area | Path |
|------|------|
| DB | `supabase/migrations/20260625130000_checkout_abandonments.sql` |
| Email template | `supabase/migrations/20260625130100_abandoned_checkout_email_template.sql` |
| Schedule / cancel | `lib/checkout/abandonedCheckout.ts` |
| Recovery API | `lib/checkout/checkoutRecovery.ts`, `app/api/cart/recover/route.ts` |
| Cron | `lib/email/abandonedCheckoutCron.ts`, `app/api/cron/send-abandoned-checkout-emails/route.ts` |
| Client | `hooks/useCheckoutRecoveryImport.ts`, `app/[lang]/cart/CartPageClient.tsx` |
| Template key | `lib/email/templates.ts` → `abandoned_checkout` |

### What is **not** gated today

- Abandoned recovery sends when **any email** is on the cart — **not** tied to `marketingEmailConsent`.
- `marketingEmailConsent` is only for *“occasional offers and review invitation”* (correct separation).
- Privacy policy and cart email hint do **not** mention checkout reminders yet.
- Recovery email has **no opt-out** link.

---

## Part 2 — Email compliance (PDPA / trust)

> Not legal advice. Have Thailand counsel review final copy.

### Classification

| Email | Typical basis | Needs marketing opt-in? |
|-------|---------------|-------------------------|
| Order confirmation | Contract / service | No |
| Payment failed | Service | No |
| **Abandoned checkout (1 reminder)** | Service / legitimate interest | Usually **no**, if disclosed + limited |
| Newsletter, offers, review invites | Marketing | **Yes** → `marketingEmailConsent` ✓ |

### Gap today

Cart copy (`lib/i18n.ts` → `cart.emailHint`):

> *“Optional — we email your order confirmation here.”*

Recovery email is **not** mentioned → transparency gap under PDPA “notice at collection”.

### Recommended fixes (priority order)

#### 2.1 Cart email hint (EN + TH)

**English** — replace or extend `cart.emailHint`:

```
Optional — for order confirmation. If checkout isn't completed, we may send one reminder to help you finish your order.
```

**Thai** (review with native speaker):

```
ไม่บังคับ — สำหรับยืนยันคำสั่งซื้อ หากยังชำระเงินไม่เสร็จ เราอาจส่งอีเมลเตือนครั้งเดียวเพื่อช่วยให้คุณชำระเงินต่อได้
```

#### 2.2 Privacy policy section

Add to `app/[lang]/privacy/page.tsx` under a new heading **“Checkout reminders”** / **“การเตือนการชำระเงิน”**:

**EN:**

> If you provide an email during checkout and do not complete payment, we may send **one** email within a few hours with a link to restore your cart and delivery details. The link expires after a few days. If you complete payment, you will not receive this reminder. For questions or to ask us not to send checkout reminders to your address, contact us via the Contact page.

**TH:**

> หากคุณกรอกอีเมลระหว่างชำระเงินแต่ยังชำระไม่เสร็จ เราอาจส่งอีเมลเตือน **หนึ่งฉบับ** ภายในไม่กี่ชั่วโมง พร้อมลิงก์เพื่อกู้คืนตะกร้าและรายละเอียดการจัดส่ง ลิงก์จะหมดอายุภายในไม่กี่วัน หากชำระเงินสำเร็จแล้ว คุณจะไม่ได้รับอีเมลนี้ หากต้องการไม่รับอีเมลเตือนการชำระเงิน กรุณาติดต่อเราผ่านหน้า Contact

#### 2.3 Recovery email opt-out line

Add to `abandoned_checkout` template (new migration or admin edit):

**EN footer line:**

> Don't want checkout reminders? Email us at [support email] or use our [Contact page]({{website_url}}/en/contact).

**TH:**

> ไม่ต้องการรับอีเมลเตือนการชำระเงิน? ติดต่อเราที่ [support email] หรือ [หน้าติดต่อ]({{website_url}}/th/contact)

Optional later: dedicated opt-out token/table (like `customer_reminders.unsubscribe_token`).

#### 2.4 Do **not** require `marketingEmailConsent` for recovery

That checkbox is for promos/reviews. Tying recovery to it would drop most reminders and mix transactional with marketing.

---

## Part 3 — Cookie consent banner (port from Russia / EKB)

**Source:** EKB Flowers Russia codebase (same patterns as Lanna Bloom family).  
**Target:** Thailand EN + TH, gate **GTM / GA4 / Clarity**, not cart cookies.

### Current Thailand state (broken vs policy)

| Item | Today |
|------|--------|
| `app/[lang]/cookies/page.tsx` | Says analytics/marketing only **with consent** |
| `components/GoogleAnalytics.tsx` | Consent Mode defaults = **`granted`** (loads GTM without ask) |
| `components/Footer.tsx` | Implied consent footer text (`cookieNotice`) |
| `components/MicrosoftClarity.tsx` | Loads unconditionally in `app/layout.tsx` |
| Cookie banner UI | **Not implemented** |
| `lib/cookies.ts` | Only generic get/set — no consent helpers |

### What the Russia version does

1. First visit (no `cookie_consent` cookie) → fixed bottom banner.
2. **Accept** or **Decline** → stored 365 days (`cookie_consent=accepted|rejected`).
3. **GTM / analytics scripts load only after Accept.**
4. All `dataLayer` pushes check `isAnalyticsAllowed()`.
5. `body.cookie-consent-banner-open` padding while banner visible.

### Architecture to implement

```
app/layout.tsx
  └── <CookieConsentProvider>
        ├── GoogleAnalytics      ← gate on consent
        ├── MicrosoftClarity     ← gate on consent
        └── children

components/MainSiteChrome.tsx
  └── <CookieConsentBanner lang={lang} />

lib/cookies/consent.ts           ← read/write cookie_consent
lib/analytics/isAnalyticsAllowed.ts
contexts/CookieConsentContext.tsx
components/legal/CookieConsentBanner.tsx
```

**Wire points in this repo:**

- Provider: `app/layout.tsx` (wrap `ThemeProvider` children or sit inside it).
- Banner: `components/MainSiteChrome.tsx` (comment on line 6 already mentions consent banner).
- Hide banner on same routes as chrome: `/partner/*`, `/checkout/confirmation-pending`, `/checkout/complete`.

### Files to copy or recreate (from Russia / EKB repo)

| File | Purpose |
|------|---------|
| `lib/cookies/consent.ts` | `readCookieConsent`, `setCookieConsent`, cookie name |
| `contexts/CookieConsentContext.tsx` | `status`, `hydrated`, `accept`, `reject` |
| `components/legal/CookieConsentBanner.tsx` | Banner UI + styled-jsx |
| `lib/analytics/isAnalyticsAllowed.ts` | `readCookieConsent() === 'accepted'` |

Reuse existing `lib/cookies.ts` (`getCookie` / `setCookie`).

### Global CSS (`app/globals.css`)

```css
body.cookie-consent-banner-open {
  padding-bottom: calc(168px + env(safe-area-inset-bottom, 0px));
}

@media (min-width: 768px) {
  body.cookie-consent-banner-open {
    padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  }
}
```

### GTM gating pattern

Replace unconditional load in `GoogleAnalytics.tsx`:

```tsx
'use client';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

export function GoogleAnalytics() {
  const { status, hydrated } = useCookieConsent();
  const consentAccepted = hydrated && status === 'accepted';
  // ... existing pathname / admin skip ...
  if (!consentAccepted) return null;
  // load GTM + set consent granted only after accept
}
```

**Also gate:** `lib/analytics.ts` / `lib/analytics/gtag.ts` → `pushToDataLayer` must call `isAnalyticsAllowed()` first.

**Change consent defaults:** When user clicks Accept, run `gtag('consent', 'update', { analytics_storage: 'granted', ... })`. On Decline, keep denied.

### Cookie details

| Property | Value |
|----------|-------|
| Name | `cookie_consent` |
| Values | `accepted` \| `rejected` |
| Max age | 365 days |
| Path | `/` |
| SameSite | `Lax` |
| Secure | production |

### UI design tokens (match Lanna Bloom)

| Token | Value |
|-------|-------|
| Background | `rgba(253, 252, 248, 0.98)` + `backdrop-filter: blur(8px)` |
| Primary CTA | `#1a3c34` bg, white text |
| Link hover | `#c5a059` |
| z-index | `100` |
| Position | fixed bottom bar, safe-area padding |

---

## Part 4 — i18n copy (ready to paste)

Add `cookieBanner` block to **EN** and **TH** in `lib/i18n.ts`.  
Russia reference exists at `russianTranslations.footer.cookieNotice` (~line 2672) — **do not copy verbatim** (mentions Yandex / implied consent).

### English (`cookieBanner`)

```ts
cookieBanner: {
  ariaLabel: 'Cookie consent',
  messageBeforeLink:
    'We use cookies and analytics (e.g. Google Analytics via Google Tag Manager) to understand how the site is used and to measure ads. Essential cookies for cart and checkout always run. For analytics and marketing measurement, choose Accept or Decline. See our',
  privacyLinkLabel: 'Privacy Policy',
  cookieLinkLabel: 'Cookie Policy',
  messageAfterLink: 'for details.',
  acceptLabel: 'Accept',
  rejectLabel: 'Decline',
  settingsLabel: 'Cookie settings', // optional: reopen banner later
},
```

### Thai (`cookieBanner`)

```ts
cookieBanner: {
  ariaLabel: 'การยินยอมใช้คุกกี้',
  messageBeforeLink:
    'เราใช้คุกกี้และเครื่องมือวิเคราะห์ (เช่น Google Analytics ผ่าน Google Tag Manager) เพื่อทำความเข้าใจการใช้งานเว็บไซต์และวัดผลโฆษณา คุกกี้ที่จำเป็นสำหรับตะกร้าและการชำระเงินจะทำงานเสมอ สำหรับการวิเคราะห์และการตลาด กรุณาเลือก ยอมรับ หรือ ปฏิเสธ ดูรายละเอียดใน',
  privacyLinkLabel: 'นโยบายความเป็นส่วนตัว',
  cookieLinkLabel: 'นโยบายคุกกี้',
  messageAfterLink: '',
  acceptLabel: 'ยอมรับ',
  rejectLabel: 'ปฏิเสธ',
  settingsLabel: 'ตั้งค่าคุกกี้',
},
```

### Optional: extend banner with email processing notice (single modal)

If legal prefers one privacy surface, add a second paragraph to the banner (EN):

```
We also process contact details you enter at checkout to fulfil orders and, if payment is not completed, to send one checkout reminder email.
```

TH:

```
เรายังประมวลผลข้อมูลติดต่อที่คุณกรอกระหว่างชำระเงินเพื่อดำเนินการสั่งซื้อ และหากชำระเงินไม่เสร็จ อาจส่งอีเมลเตือนการชำระเงินหนึ่งฉบับ
```

This is **notice**, not a second checkbox — checkout email is service-related, not marketing.

### Footer `cookieNotice` — update after banner ships

Current footer text implies consent by staying on site. After banner exists, shorten footer to:

**EN:** `Cookie settings are in the banner above or via the link below.`

Or remove duplicate notice and link to `/${lang}/cookies` only.

---

## Part 5 — What does NOT need cookie consent

- Cart `localStorage` / session (essential).
- `is_internal_staff` cookie (`?internal_user=true` in `app/layout.tsx`).
- Order/checkout APIs, Stripe, Resend transactional email.
- Abandoned checkout **server-side** snapshot (not a browser cookie).

---

## Part 6 — Testing checklist

### Abandoned checkout

- [ ] Cart with email → abandon Stripe → cron sends email (or `ABANDONED_CHECKOUT_DELAY_HOURS=0.02` in dev).
- [ ] Recover link on clean browser → cart + form restored.
- [ ] Pay before cron → no email (`cancelled_at` set).
- [ ] Admin ECC preview/test-send `abandoned_checkout`.
- [ ] Expired token → 404 + toast.

### Cookie banner

- [ ] Clear cookies → banner shows; body padding applied.
- [ ] Decline → no GTM/Clarity network requests; `pushToDataLayer` no-ops.
- [ ] Accept → GTM loads; `add_to_cart` / `purchase` events fire.
- [ ] Reload → banner hidden; choice persisted.
- [ ] EN + TH copy; privacy/cookie links work.
- [ ] `/admin` still no analytics (existing skip).
- [ ] Partner / checkout-complete routes: no banner.

### Legal copy

- [ ] Cart email hint mentions checkout reminder.
- [ ] Privacy policy mentions checkout reminders.
- [ ] Cookie policy still accurate after GTM gating fix.

---

## Part 7 — Suggested implementation order

1. **Cookie consent banner** + GTM/Clarity gating + `isAnalyticsAllowed` (fixes biggest PDPA/cookie-policy mismatch).
2. **Privacy policy + cart email hint** (abandoned checkout transparency).
3. **Recovery email opt-out line** (template migration).
4. Optional: “Cookie settings” footer link to reopen banner.

---

## Paste into new Cursor chat

### A — Cookie banner only

```
Read docs/handover/EMAIL_AND_PRIVACY_CONSENT_HANDOVER.md Part 3.

Implement cookie consent for Lanna Bloom Thailand (EN + TH):
- Copy/recreate from Russia handover: lib/cookies/consent.ts, contexts/CookieConsentContext.tsx, components/legal/CookieConsentBanner.tsx, lib/analytics/isAnalyticsAllowed.ts
- Wire CookieConsentProvider in app/layout.tsx; mount banner in components/MainSiteChrome.tsx
- Gate GoogleAnalytics + MicrosoftClarity on consent; fix consent defaults (denied until Accept)
- Gate all pushToDataLayer / lib/analytics calls via isAnalyticsAllowed()
- Add cookieBanner i18n (EN + TH) from the handover doc
- Add body.cookie-consent-banner-open to globals.css
- Do not load marketing analytics before Accept
```

### B — Email compliance only

```
Read docs/handover/EMAIL_AND_PRIVACY_CONSENT_HANDOVER.md Part 2.

Update abandoned checkout transparency (no change to send logic):
- cart.emailHint EN + TH in lib/i18n.ts
- privacy page section on checkout reminders
- abandoned_checkout email template: add opt-out/contact line (new migration)
```

### C — Both (recommended)

```
Read docs/handover/EMAIL_AND_PRIVACY_CONSENT_HANDOVER.md fully.

Implement Part 3 (cookie banner + GTM gating) then Part 2 (email/privacy copy).
Follow existing Lanna Bloom patterns; locales EN + TH only.
```

---

## Related docs

- `ai_context/05_ANALYTICS_GTM_GA4_ADS.md` — purchase / dataLayer rules
- `ai_context/06_ADMIN_ACCOUNTING_EMAIL.md` — Email Control Center
- `.cursor/rules/email-control-center.mdc`
- `app/[lang]/cookies/page.tsx`, `app/[lang]/privacy/page.tsx`
- Plan: `.cursor/plans/abandoned_checkout_recovery_44cfaa1f.plan.md`
