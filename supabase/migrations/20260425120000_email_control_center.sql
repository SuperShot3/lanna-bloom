-- Email templates, outbox, customer reminders, reminder logs (Lanna Bloom Email Control Center)

-- updated_at trigger helper (shared name pattern)
CREATE OR REPLACE FUNCTION public.set_email_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  template_name text NOT NULL,
  subject_template text NOT NULL,
  preview_text text,
  html_template text NOT NULL,
  text_template text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON public.email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_email_tables_updated_at();

-- 2) email_outbox
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  customer_email text NOT NULL,
  customer_name text,
  email_type text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  error_message text,
  created_by text,
  edited_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_outbox_status_check CHECK (status IN ('draft', 'scheduled', 'sent', 'failed', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_order_id ON public.email_outbox(order_id);
CREATE INDEX IF NOT EXISTS idx_email_outbox_customer_email ON public.email_outbox(customer_email);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON public.email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created_at ON public.email_outbox(created_at DESC);

DROP TRIGGER IF EXISTS email_outbox_updated_at ON public.email_outbox;
CREATE TRIGGER email_outbox_updated_at
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_email_tables_updated_at();

-- 3) customer_reminders
CREATE TABLE IF NOT EXISTS public.customer_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  recipient_name text NOT NULL,
  relationship text,
  occasion_type text NOT NULL,
  occasion_day int NOT NULL CHECK (occasion_day >= 1 AND occasion_day <= 31),
  occasion_month int NOT NULL CHECK (occasion_month >= 1 AND occasion_month <= 12),
  occasion_year int,
  preferred_budget text,
  preferred_flower_style text,
  preferred_reminder_timing text NOT NULL DEFAULT '7_and_3_days',
  consent_given boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  source_order_id text,
  is_active boolean NOT NULL DEFAULT true,
  unsubscribe_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_reminders_unsubscribe_token_uk UNIQUE (unsubscribe_token),
  CONSTRAINT customer_reminders_timing_check CHECK (preferred_reminder_timing IN (
    '7_and_3_days', '7_days_only', '3_days_only', 'all'
  ))
);
CREATE INDEX IF NOT EXISTS idx_customer_reminders_email ON public.customer_reminders(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_reminders_active ON public.customer_reminders(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_reminders_consent ON public.customer_reminders(consent_given) WHERE consent_given = true;

DROP TRIGGER IF EXISTS customer_reminders_updated_at ON public.customer_reminders;
CREATE TRIGGER customer_reminders_updated_at
  BEFORE UPDATE ON public.customer_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_email_tables_updated_at();

-- 4) reminder_email_logs
CREATE TABLE IF NOT EXISTS public.reminder_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.customer_reminders(id) ON DELETE CASCADE,
  occasion_year int NOT NULL,
  reminder_stage text NOT NULL,
  email_outbox_id uuid REFERENCES public.email_outbox(id) ON DELETE SET NULL,
  email_sent_at timestamptz NOT NULL DEFAULT now(),
  email_status text,
  created_order_id text,
  CONSTRAINT reminder_email_logs_stage_check CHECK (reminder_stage IN ('7_days', '3_days', '1_day')),
  CONSTRAINT reminder_email_logs_reminder_year_stage_uk UNIQUE (reminder_id, occasion_year, reminder_stage)
);
CREATE INDEX IF NOT EXISTS idx_reminder_email_logs_reminder ON public.reminder_email_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_email_logs_outbox ON public.reminder_email_logs(email_outbox_id);

COMMENT ON TABLE public.email_templates IS 'Editable Resend email templates; variables use {{name}} syntax.';
COMMENT ON TABLE public.email_outbox IS 'Prepared/sent email bodies for audit; exact HTML stored.';
COMMENT ON TABLE public.customer_reminders IS 'Important-dates form submissions; opt-in reminder emails only.';
COMMENT ON TABLE public.reminder_email_logs IS 'Deduplication log per reminder, year, and stage.';

-- Seed default templates (body placeholders; full HTML can be edited in admin)
INSERT INTO public.email_templates (template_key, template_name, subject_template, preview_text, html_template, text_template, is_active)
VALUES
  (
    'order_received',
    'Order received',
    'We received your order {{order_id}}',
    'Your order is in good hands at Lanna Bloom',
    '<p>Hi {{customer_name}},</p><p>We received your order <strong>{{order_id}}</strong>.</p><p>{{social_footer}}</p>',
    'We received your order {{order_id}}.',
    true
  ),
  (
    'payment_confirmed',
    'Payment confirmed',
    'Payment confirmed for order {{order_id}}',
    'Thank you for your payment',
    '<p>Hi {{customer_name}},</p><p>Payment for order <strong>{{order_id}}</strong> is confirmed.</p><p>{{social_footer}}</p>',
    'Payment confirmed for order {{order_id}}.',
    true
  ),
  (
    'payment_failed',
    'Payment failed',
    'Payment for order {{order_id}} could not be completed',
    'Please try again or contact us',
    '<p>Hi {{customer_name}},</p><p>We could not complete payment for <strong>{{order_id}}</strong>.</p><p>{{social_footer}}</p>',
    'Payment for order {{order_id}} could not be completed.',
    true
  ),
  (
    'order_delivered',
    'Order delivered',
    'Your flowers have been delivered',
    'Save future special days and leave a review',
$delivered$<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /></head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  {{brand_header}}
  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 24px;">
    <p style="font-size: 18px; margin: 0 0 12px 0;">Hi {{customer_name}},</p>
    <h1 style="font-size: 24px; line-height: 1.3; margin: 0 0 14px 0; color: #2c2415;">Your flowers have been delivered</h1>
    <p style="margin: 0 0 16px 0;">Your order <strong>{{order_id}}</strong> has been delivered. We hope the flowers arrived beautifully and made someone's day a little more special.</p>

    <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
      <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #2c2415;">Order summary</h2>
      <p style="margin: 0 0 6px 0;"><strong>Item:</strong> {{product_name}}</p>
      <p style="margin: 0 0 6px 0;"><strong>Delivery date:</strong> {{delivery_date}}</p>
      <p style="margin: 0;"><strong>Total:</strong> {{total_price}}</p>
    </div>

    <h2 style="font-size: 19px; line-height: 1.35; margin: 24px 0 10px 0; color: #2c2415;">A new reminder feature for future special days</h2>
    <p style="margin: 0 0 12px 0;">You can now save birthdays, anniversaries, Valentine's Day, Mother's Day, or any important date once, and Lanna Bloom will remind you by email before the day arrives.</p>
    <p style="margin: 0 0 18px 0;">The reminder can also include bouquet suggestions, so next time you do not need to remember the date or search from the beginning.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0 12px 0; width: 100%;">
      <tr>
        <td style="border-radius: 8px; background: #967a4d; text-align: center;">
          <a href="{{important_dates_link}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px;">Save important dates</a>
        </td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #6f624c; margin: 0 0 24px 0; text-align: center;">It takes less than 1 minute. You can unsubscribe anytime.</p>

    <div style="border-top: 1px solid #eadfcd; margin: 24px 0; padding-top: 20px;">
      <h2 style="font-size: 18px; line-height: 1.35; margin: 0 0 10px 0; color: #2c2415;">Did everything go well?</h2>
      <p style="margin: 0 0 16px 0;">If you were happy with your order, your review would really help our small local flower business in Chiang Mai.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0; width: 100%;">
        <tr>
          <td style="border-radius: 8px; background: #ffffff; border: 1px solid #d4c4a8; text-align: center;">
            <a href="{{review_link}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #967a4d; text-decoration: none; font-weight: 600; font-size: 15px;">Leave a review</a>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size: 15px; margin: 0;">Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.</p>
  </div>
  <div style="margin-top: 24px;">{{social_footer}}</div>
</body></html>$delivered$,
$deltxt$Hi {{customer_name}},

Your order {{order_id}} has been delivered. We hope the flowers arrived beautifully and made someone's day a little more special.

Order summary
Item: {{product_name}}
Delivery date: {{delivery_date}}
Total: {{total_price}}

A new reminder feature for future special days
You can now save birthdays, anniversaries, Valentine's Day, Mother's Day, or any important date once, and Lanna Bloom will remind you by email before the day arrives.

The reminder can also include bouquet suggestions, so next time you do not need to remember the date or search from the beginning.

Save important dates: {{important_dates_link}}

Did everything go well?
If you were happy with your order, your review would really help our small local flower business in Chiang Mai.

Leave a review: {{review_link}}

Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.
$deltxt$,
    true
  ),
  (
    'review_request',
    'Review request',
    'We would love your feedback — order {{order_id}}',
    'Share a quick review',
    '<p>Hi {{customer_name}},</p><p>How was your experience with order <strong>{{order_id}}</strong>?</p><p><a href="{{review_link}}">Leave a review</a></p><p>{{social_footer}}</p>',
    'Review: {{review_link}}',
    true
  ),
  (
    'reminder_7_days',
    'Reminder — 7 days',
    'A special date in 7 days: {{occasion_type}} for {{recipient_name}}',
    'Lanna Bloom reminder',
$rem7$<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family: Georgia, serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  <p>Hi {{customer_name}},</p>
  <p>In <strong>{{days_left}} days</strong> it is <strong>{{occasion_type}}</strong> for <strong>{{recipient_name}}</strong>{{relationship}}.</p>
  <p style="text-align: center; margin: 12px 0;"><img src="{{recommended_product_image}}" alt="" width="280" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e8e0d4;" /></p>
  <p><strong>{{recommended_product_name}}</strong> — {{recommended_product_price}}</p>
  <p style="text-align: center; margin: 20px 0;">
    <a href="{{confirm_url}}" style="display: inline-block; background: #967a4d; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Confirm this bouquet</a>
  </p>
  <p style="text-align: center;"><a href="{{choose_another_url}}" style="color: #967a4d;">Choose another bouquet</a></p>
  <p style="font-size: 12px; color: #666; margin-top: 24px;"><a href="{{unsubscribe_url}}">Unsubscribe from reminders</a></p>
  <div style="margin-top: 16px;">{{social_footer}}</div>
</body></html>$rem7$,
    'Reminder: {{days_left}} days until {{occasion_type}} for {{recipient_name}}. {{recommended_product_name}} {{recommended_product_price}}',
    true
  ),
  (
    'reminder_3_days',
    'Reminder — 3 days',
    '3 days to go: {{occasion_type}} for {{recipient_name}}',
    'Order flowers in time',
$rem3$<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family: Georgia, serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  <p>Hi {{customer_name}},</p>
  <p>Only <strong>{{days_left}} days</strong> until <strong>{{occasion_type}}</strong> for <strong>{{recipient_name}}</strong>{{relationship}}.</p>
  <p style="text-align: center; margin: 12px 0;"><img src="{{recommended_product_image}}" alt="" width="280" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e8e0d4;" /></p>
  <p><strong>{{recommended_product_name}}</strong> — {{recommended_product_price}}</p>
  <p style="text-align: center; margin: 20px 0;">
    <a href="{{confirm_url}}" style="display: inline-block; background: #967a4d; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Confirm this bouquet</a>
  </p>
  <p style="text-align: center;"><a href="{{choose_another_url}}" style="color: #967a4d;">Choose another bouquet</a></p>
  <p style="font-size: 12px; color: #666; margin-top: 24px;"><a href="{{unsubscribe_url}}">Unsubscribe from reminders</a></p>
  <div style="margin-top: 16px;">{{social_footer}}</div>
</body></html>$rem3$,
    'Reminder: {{days_left}} days. {{recommended_product_name}}',
    true
  ),
  (
    'reminder_1_day',
    'Reminder — 1 day',
    'Tomorrow: {{occasion_type}} for {{recipient_name}}',
    'Last chance to order',
$rem1$<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family: Georgia, serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  <p>Hi {{customer_name}},</p>
  <p><strong>Tomorrow</strong> is <strong>{{occasion_type}}</strong> for <strong>{{recipient_name}}</strong>{{relationship}}.</p>
  <p style="text-align: center; margin: 12px 0;"><img src="{{recommended_product_image}}" alt="" width="280" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e8e0d4;" /></p>
  <p><strong>{{recommended_product_name}}</strong> — {{recommended_product_price}}</p>
  <p style="text-align: center; margin: 20px 0;">
    <a href="{{confirm_url}}" style="display: inline-block; background: #967a4d; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Confirm this bouquet</a>
  </p>
  <p style="text-align: center;"><a href="{{choose_another_url}}" style="color: #967a4d;">Choose another bouquet</a></p>
  <p style="font-size: 12px; color: #666; margin-top: 24px;"><a href="{{unsubscribe_url}}">Unsubscribe from reminders</a></p>
  <div style="margin-top: 16px;">{{social_footer}}</div>
</body></html>$rem1$,
    'Tomorrow: {{occasion_type}}. {{recommended_product_name}}',
    true
  )
ON CONFLICT (template_key) DO NOTHING;
