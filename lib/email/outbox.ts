import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getOrderById, type Order } from '@/lib/orders';
import { renderTemplate } from './renderTemplate';
import { buildOrderTemplateVariables } from './variablesFromOrder';
import { sendOutboxViaResend } from './sendOutboxEmail';

export type EmailOutboxRow = {
  id: string;
  order_id: string | null;
  customer_email: string;
  customer_name: string | null;
  email_type: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  status: 'draft' | 'scheduled' | 'sent' | 'failed' | 'cancelled';
  scheduled_for: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  created_by: string | null;
  edited_by: string | null;
  created_at: string;
  updated_at: string;
};

type EmailTemplateRow = {
  template_key: string;
  subject_template: string;
  html_template: string;
  text_template: string | null;
  is_active: boolean;
};

async function getTemplate(key: string): Promise<EmailTemplateRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('email_templates')
    .select('template_key, subject_template, html_template, text_template, is_active')
    .eq('template_key', key)
    .maybeSingle();
  if (error || !data) return null;
  return data as EmailTemplateRow;
}

export async function getOrCreateDeliveredOutboxDraft(
  orderId: string,
  createdBy: string
): Promise<{
  outbox: EmailOutboxRow;
  missingVariables: string[];
  order: Order;
} | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const trimmed = orderId.trim();

  const { data: ometa } = await supabase
    .from('orders')
    .select('delivered_email_sent_at')
    .eq('order_id', trimmed)
    .maybeSingle();
  if (ometa && (ometa as { delivered_email_sent_at?: string | null }).delivered_email_sent_at) {
    return null; // delivered follow-up already sent; do not re-open a draft
  }

  const order = await getOrderById(trimmed);
  if (!order) return null;

  const email = order.customerEmail?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  const { data: existing } = await supabase
    .from('email_outbox')
    .select('*')
    .eq('order_id', trimmed)
    .eq('email_type', 'order_delivered')
    .in('status', ['draft', 'scheduled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { outbox: existing as EmailOutboxRow, missingVariables: [], order };
  }

  const tpl = await getTemplate('order_delivered');
  if (!tpl || !tpl.is_active) {
    return null;
  }

  const raw = buildOrderTemplateVariables(order);
  const rendered = renderTemplate(tpl.subject_template, tpl.html_template, tpl.text_template, raw);
  if (!rendered.subject || !rendered.html) {
    return null;
  }

  const { data: inserted, error } = await supabase
    .from('email_outbox')
    .insert({
      order_id: trimmed,
      customer_email: email,
      customer_name: order.customerName?.trim() ?? null,
      email_type: 'order_delivered',
      subject: rendered.subject,
      html_body: rendered.html,
      text_body: rendered.text || null,
      status: 'draft',
      created_by: createdBy,
    })
    .select()
    .single();

  if (error || !inserted) {
    console.error('[email outbox] insert draft failed:', error);
    return null;
  }

  return {
    outbox: inserted as EmailOutboxRow,
    missingVariables: rendered.missingVariables,
    order,
  };
}

/**
 * Renders a fresh preview (for modal) with current template + order, including missing-variable list.
 * Does not persist unless you save draft separately.
 */
export async function renderDeliveredPreviewForOrder(
  orderId: string
): Promise<{ subject: string; html: string; text: string; missingVariables: string[] } | null> {
  const order = await getOrderById(orderId.trim());
  if (!order) return null;
  const tpl = await getTemplate('order_delivered');
  if (!tpl) return null;
  const raw = buildOrderTemplateVariables(order);
  const rendered = renderTemplate(tpl.subject_template, tpl.html_template, tpl.text_template, raw);
  return {
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    missingVariables: rendered.missingVariables,
  };
}

export { sendOutboxViaResend };
