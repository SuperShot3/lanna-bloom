import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getOccasionTarget } from './bangkokDate';
import { sendOutboxViaResend } from './sendOutboxEmail';
import { renderTemplate } from './renderTemplate';
import { getRecommendedBouquetForReminder } from './recommendBouquet';
import {
  buildReminderTemplateVariables,
  dayCountMatchesStage,
  stagesAllowedForPreference,
  templateKeyForStage,
  type ReminderRow,
} from './reminderVariables';

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

/**
 * One cron run: send all due reminder stages; returns a short summary.
 */
export async function runReminderEmailCron(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  if (!supabase) {
    return { sent: 0, skipped: 0, errors: ['Supabase not configured'] };
  }

  const { data: rows, error } = await supabase
    .from('customer_reminders')
    .select(
      'id, customer_name, customer_email, recipient_name, relationship, occasion_type, occasion_day, occasion_month, occasion_year, preferred_reminder_timing, consent_given, is_active, unsubscribe_token'
    )
    .eq('is_active', true)
    .eq('consent_given', true);

  if (error || !rows) {
    return { sent: 0, skipped: 0, errors: [error?.message ?? 'load failed'] };
  }

  let sent = 0;
  let skipped = 0;

  for (const raw of rows as ReminderRow[]) {
    const timing = (raw as { preferred_reminder_timing?: string }).preferred_reminder_timing ?? '7_and_3_days';
    const { occasionYear, daysLeft } = getOccasionTarget(
      raw.occasion_month,
      raw.occasion_day,
      raw.occasion_year
    );
    if (daysLeft < 0) {
      skipped += 1;
      continue;
    }

    const { data: fulfilled } = await supabase
      .from('reminder_email_logs')
      .select('id')
      .eq('reminder_id', raw.id)
      .eq('occasion_year', occasionYear)
      .not('created_order_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (fulfilled) {
      skipped += 1;
      continue;
    }

    const stage = dayCountMatchesStage(daysLeft);
    if (!stage) {
      skipped += 1;
      continue;
    }
    const allowed = stagesAllowedForPreference(timing);
    if (!allowed.includes(stage)) {
      skipped += 1;
      continue;
    }

    const { data: dupe } = await supabase
      .from('reminder_email_logs')
      .select('id')
      .eq('reminder_id', raw.id)
      .eq('occasion_year', occasionYear)
      .eq('reminder_stage', stage)
      .maybeSingle();
    if (dupe) {
      skipped += 1;
      continue;
    }

    const tkey = templateKeyForStage(stage);
    const tpl = await loadTemplate(tkey);
    if (!tpl || !tpl.is_active) {
      errors.push(`Missing template ${tkey}`);
      continue;
    }

    let product;
    try {
      product = await getRecommendedBouquetForReminder(
        raw.relationship ?? '',
        raw.occasion_type ?? ''
      );
    } catch (e) {
      errors.push(`Product fetch ${raw.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const vars = buildReminderTemplateVariables(raw, daysLeft, stage, product);
    const rendered = renderTemplate(tpl.subject_template, tpl.html_template, tpl.text_template, vars);

    const { data: outbox, error: insE } = await supabase
      .from('email_outbox')
      .insert({
        order_id: null,
        customer_email: raw.customer_email.trim(),
        customer_name: raw.customer_name.trim(),
        email_type: tkey,
        subject: rendered.subject,
        html_body: rendered.html,
        text_body: rendered.text || null,
        status: 'draft',
        created_by: 'cron',
      })
      .select('id')
      .single();

    if (insE || !outbox) {
      errors.push(`Outbox ${raw.id}: ${insE?.message ?? 'insert failed'}`);
      continue;
    }

    const outId = (outbox as { id: string }).id;
    const send = await sendOutboxViaResend(outId, 'cron');

    if (send.ok) {
      const insLog = await supabase.from('reminder_email_logs').insert({
        reminder_id: raw.id,
        occasion_year: occasionYear,
        reminder_stage: stage,
        email_outbox_id: outId,
        email_status: 'sent',
        created_order_id: null,
      });
      if (insLog.error) {
        errors.push(`Log ${outId}: ${insLog.error.message}`);
      } else {
        sent += 1;
      }
    } else {
      errors.push(`Send ${outId}: ${'error' in send ? send.error : 'failed'}`);
    }
  }

  return { sent, skipped, errors };
}
