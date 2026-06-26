import 'server-only';

import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getOrderBySubmissionToken } from '@/lib/orders';
import { getStripeServerConfig, createStripeServerClient } from '@/lib/stripe/server';
import { sendOutboxViaResend } from './sendOutboxEmail';
import { renderTemplate } from './renderTemplate';
import {
  buildCheckoutRecoveryUrl,
  cancelCheckoutAbandonment,
  claimCheckoutAbandonmentEmailSend,
  releaseCheckoutAbandonmentEmailClaim,
  type CheckoutAbandonmentRow,
} from '@/lib/checkout/abandonedCheckout';
import { getBaseUrl } from '@/lib/orders';
import {
  getDefaultSocialLinks,
  getEmailBrandHeaderHtml,
  getSocialFooterHtml,
} from './socialFooter';

type EmailTemplate = {
  template_key: string;
  subject_template: string;
  html_template: string;
  text_template: string | null;
  is_active: boolean;
};

async function loadTemplate(key: string): Promise<EmailTemplate | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from('email_templates')
    .select('template_key, subject_template, html_template, text_template, is_active')
    .eq('template_key', key)
    .maybeSingle();
  return (data as EmailTemplate | null) ?? null;
}

async function isStripeSessionStillUnpaid(
  stripe: Stripe,
  stripeSessionId: string
): Promise<boolean> {
  try {
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
    if (session.payment_status === 'paid') return false;
    return true;
  } catch (e) {
    console.error('[abandonedCheckoutCron] Stripe retrieve failed', {
      stripeSessionId,
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

function buildTemplateVariables(row: CheckoutAbandonmentRow): Record<string, string> {
  const base = getBaseUrl().replace(/\/$/, '');
  const links = getDefaultSocialLinks();
  const lang = row.lang === 'th' ? 'th' : 'en';
  const name = row.customer_name?.trim() || 'there';
  return {
    customer_name: name,
    cart_restore_url: buildCheckoutRecoveryUrl(lang, row.recovery_token),
    website_url: base,
    brand_header: getEmailBrandHeaderHtml(links),
    social_footer: getSocialFooterHtml(links),
  };
}

/**
 * One cron run: send due abandoned-checkout recovery emails.
 */
export async function runAbandonedCheckoutEmailCron(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  if (!supabase) {
    return { sent: 0, skipped: 0, errors: ['Supabase not configured'] };
  }

  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return { sent: 0, skipped: 0, errors: ['Stripe not configured'] };
  }
  const stripe = createStripeServerClient(stripeConfig.secretKey);

  const now = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from('checkout_abandonments')
    .select(
      'id, stripe_session_id, submission_token, recovery_token, customer_email, customer_name, lang, payload_json, recovery_email_scheduled_for, recovery_email_sent_at, cancelled_at, expires_at'
    )
    .is('recovery_email_sent_at', null)
    .is('cancelled_at', null)
    .lte('recovery_email_scheduled_for', now)
    .limit(50);

  if (error || !rows) {
    return { sent: 0, skipped: 0, errors: [error?.message ?? 'load failed'] };
  }

  const tpl = await loadTemplate('abandoned_checkout');
  if (!tpl || !tpl.is_active) {
    return { sent: 0, skipped: 0, errors: ['Missing or inactive template abandoned_checkout'] };
  }

  let sent = 0;
  let skipped = 0;

  for (const raw of rows as CheckoutAbandonmentRow[]) {
    const expiresAt = raw.expires_at ? new Date(raw.expires_at) : null;
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      await cancelCheckoutAbandonment({ stripeSessionId: raw.stripe_session_id });
      skipped += 1;
      continue;
    }

    const submissionToken = raw.submission_token?.trim() ?? '';
    if (submissionToken) {
      const existing = await getOrderBySubmissionToken(submissionToken);
      if (existing?.status === 'paid') {
        await cancelCheckoutAbandonment({ stripeSessionId: raw.stripe_session_id });
        skipped += 1;
        continue;
      }
    }

    const stillUnpaid = await isStripeSessionStillUnpaid(stripe, raw.stripe_session_id);
    if (!stillUnpaid) {
      await cancelCheckoutAbandonment({ stripeSessionId: raw.stripe_session_id });
      skipped += 1;
      continue;
    }

    const claimed = await claimCheckoutAbandonmentEmailSend(raw.id);
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const vars = buildTemplateVariables(raw);
    const lang = raw.lang === 'th' ? 'th' : 'en';
    const subjectTemplate =
      lang === 'th'
        ? 'ช่อดอกไม้ของคุณยังรออยู่ — ชำระเงินต่อได้ที่นี่'
        : tpl.subject_template;
    const rendered = renderTemplate(
      subjectTemplate,
      tpl.html_template,
      tpl.text_template,
      vars
    );

    const { data: outbox, error: insE } = await supabase
      .from('email_outbox')
      .insert({
        order_id: null,
        customer_email: raw.customer_email.trim(),
        customer_name: raw.customer_name?.trim() || null,
        email_type: 'abandoned_checkout',
        subject: rendered.subject,
        html_body: rendered.html,
        text_body: rendered.text || null,
        status: 'draft',
        created_by: 'cron',
      })
      .select('id')
      .single();

    if (insE || !outbox) {
      await releaseCheckoutAbandonmentEmailClaim(raw.id);
      errors.push(`Outbox ${raw.id}: ${insE?.message ?? 'insert failed'}`);
      continue;
    }

    const outId = (outbox as { id: string }).id;
    const send = await sendOutboxViaResend(outId, 'cron');

    if (send.ok) {
      sent += 1;
    } else {
      await releaseCheckoutAbandonmentEmailClaim(raw.id);
      errors.push(`Send ${outId}: ${'error' in send ? send.error : 'failed'}`);
    }
  }

  return { sent, skipped, errors };
}
