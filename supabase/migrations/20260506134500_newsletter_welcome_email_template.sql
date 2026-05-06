-- Add newsletter welcome template to Email Control Center.

INSERT INTO public.email_templates (
  template_key,
  template_name,
  subject_template,
  preview_text,
  html_template,
  text_template,
  is_active
)
VALUES (
  'newsletter_welcome',
  'Newsletter welcome (unique code)',
  'Welcome to Lanna Bloom — your 10% off code',
  'Your unique 10% off code inside',
$welcome$<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /></head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  {{brand_header}}
  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 24px;">
    <h1 style="font-size: 24px; line-height: 1.3; margin: 0 0 14px 0; color: #2c2415;">Welcome to Lanna Bloom 🌸</h1>
    <p style="margin: 0 0 14px 0;">As a small thank you, here is your discount code:</p>

    <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 10px; padding: 14px 16px; margin: 18px 0 18px 0;">
      <p style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 20px; font-weight: 700; letter-spacing: 0.6px; text-align: center; color: #2c2415;">
        {{welcome_code}}
      </p>
    </div>

    <p style="margin: 0 0 10px 0;">Use it at checkout to enjoy <strong>10% off</strong> your order.</p>
    <p style="margin: 0 0 18px 0;">We’re happy to have you with us and hope you find something beautiful for your special moment.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0 10px 0; width: 100%;">
      <tr>
        <td style="border-radius: 8px; background: #967a4d; text-align: center;">
          <a href="{{website_url}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px;">Shop now</a>
        </td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #6f624c; margin: 0; text-align: center;">Single use. Valid for 7 days.</p>
  </div>
  <div style="margin-top: 24px;">{{social_footer}}</div>
</body></html>$welcome$,
$welcometxt$Welcome to Lanna Bloom

As a small thank you, here is your discount code: {{welcome_code}}
Use it at checkout to enjoy 10% off your order.

We’re happy to have you with us and hope you find something beautiful for your special moment.

Visit our website: {{website_url}}

Lanna Bloom Support
080-331-3431
{{website_url}}$welcometxt$,
true
)
ON CONFLICT (template_key) DO NOTHING;

