-- Prepend Lanna Bloom logo block {{brand_header}} to HTML templates (see lib/email/socialFooter.ts).
-- Idempotent: skips rows that already include {{brand_header}}.

-- Fragment templates (no full <html>)
UPDATE public.email_templates
SET
  html_template = '{{brand_header}}' || html_template,
  updated_at = now()
WHERE template_key IN ('order_received', 'payment_confirmed', 'payment_failed', 'review_request')
  AND position('{{brand_header}}' in html_template) = 0;

-- order_delivered: logo below opening <body>
UPDATE public.email_templates
SET
  html_template = replace(
    html_template,
    '<body style="font-family: Georgia, ''Times New Roman'', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">',
    '<body style="font-family: Georgia, ''Times New Roman'', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">' || E'\n  {{brand_header}}'
  ),
  updated_at = now()
WHERE template_key = 'order_delivered'
  AND position('{{brand_header}}' in html_template) = 0;

-- Reminder full-page templates
UPDATE public.email_templates
SET
  html_template = replace(
    html_template,
    '<body style="font-family: Georgia, serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">',
    '<body style="font-family: Georgia, serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">' || E'\n  {{brand_header}}'
  ),
  updated_at = now()
WHERE template_key IN ('reminder_7_days', 'reminder_3_days', 'reminder_1_day')
  AND position('{{brand_header}}' in html_template) = 0;
