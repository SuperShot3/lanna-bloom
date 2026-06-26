-- Append checkout-recovery unsubscribe link to abandoned_checkout template.

UPDATE public.email_templates
SET
  html_template = html_template || $footer$
    <p style="font-size: 12px; color: #6f624c; margin: 20px 0 0 0; text-align: center;">
      Don't want checkout reminders?
      <a href="{{recovery_unsubscribe_url}}" style="color: #967a4d;">Unsubscribe</a>.
    </p>$footer$,
  text_template = COALESCE(text_template, '') || $footertxt$

Don't want checkout reminders? Unsubscribe: {{recovery_unsubscribe_url}}$footertxt$
WHERE template_key = 'abandoned_checkout';
