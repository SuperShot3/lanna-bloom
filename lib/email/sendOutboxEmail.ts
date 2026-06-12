import 'server-only';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function getFromEmail(): string | null {
  return process.env.ORDERS_FROM_EMAIL?.trim() || null;
}

/** Trustpilot BCC on delivered email when customer opted in at checkout and env is set. */
async function getTrustpilotInviteBcc(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  emailType: string,
  orderId: string | null
): Promise<string[] | undefined> {
  if (emailType !== 'order_delivered' || !orderId) return undefined;
  const bcc = process.env.TRUSTPILOT_INVITE_BCC?.trim();
  if (!bcc || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bcc)) return undefined;

  const { data: orderRow } = await supabase
    .from('orders')
    .select('marketing_email_consent')
    .eq('order_id', orderId)
    .maybeSingle();

  if (!(orderRow as { marketing_email_consent?: boolean } | null)?.marketing_email_consent) {
    return undefined;
  }
  return [bcc];
}

/**
 * Sends a single outbox message via Resend, updates outbox + optional order delivered flag.
 */
export async function sendOutboxViaResend(
  outboxId: string,
  editedBy: string
): Promise<{ ok: true; providerMessageId: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  const from = getFromEmail();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!supabase || !apiKey || !from) {
    return { ok: false, error: 'Email is not configured' };
  }

  const { data: row, error: fErr } = await supabase
    .from('email_outbox')
    .select('*')
    .eq('id', outboxId)
    .in('status', ['draft', 'failed', 'scheduled'])
    .maybeSingle();

  if (fErr || !row) {
    return { ok: false, error: 'Outbox message not found or not sendable' };
  }

  const resend = new Resend(apiKey);
  const emailType = (row as { email_type: string }).email_type;
  const to = (row as { customer_email: string }).customer_email;
  const subject = (row as { subject: string }).subject;
  const html = (row as { html_body: string }).html_body;
  const text = (row as { text_body: string | null }).text_body ?? undefined;
  const orderId = (row as { order_id: string | null }).order_id;
  const bcc = await getTrustpilotInviteBcc(supabase, emailType, orderId);

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    ...(bcc ? { bcc } : {}),
    subject,
    html,
    text: text || undefined,
  });

  if (error) {
    const msg = typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message)
      : JSON.stringify(error);
    await supabase
      .from('email_outbox')
      .update({
        status: 'failed',
        error_message: msg,
        edited_by: editedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outboxId);
    return { ok: false, error: msg };
  }

  const providerId = (data as { id?: string } | null)?.id ?? null;
  const now = new Date().toISOString();

  await supabase
    .from('email_outbox')
    .update({
      status: 'sent',
      sent_at: now,
      provider_message_id: providerId,
      error_message: null,
      edited_by: editedBy,
      updated_at: now,
    })
    .eq('id', outboxId);

  if (emailType === 'order_delivered' && orderId) {
    await supabase
      .from('orders')
      .update({ delivered_email_sent_at: now, updated_at: now })
      .eq('order_id', orderId);
  }

  return { ok: true, providerMessageId: providerId ?? '' };
}
