-- Abandoned checkout recovery email template (Email Control Center).

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
  'abandoned_checkout',
  'Abandoned checkout recovery',
  'Your bouquet is still waiting — finish checkout',
  'Pick up where you left off',
$abandoned$<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /></head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  {{brand_header}}
  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 24px;">
    <p style="font-size: 18px; margin: 0 0 12px 0;">Hi {{customer_name}},</p>
    <h1 style="font-size: 24px; line-height: 1.3; margin: 0 0 14px 0; color: #2c2415;">Your bouquet is still waiting</h1>
    <p style="margin: 0 0 16px 0;">You started checkout but didn’t finish payment. Your cart and delivery details are saved — tap below to continue where you left off.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0 10px 0; width: 100%;">
      <tr>
        <td style="border-radius: 8px; background: #967a4d; text-align: center;">
          <a href="{{cart_restore_url}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px;">Finish checkout</a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #6f624c; margin: 16px 0 0 0; text-align: center;">This link expires in a few days. If you already completed your order, you can ignore this email.</p>
  </div>
  <div style="margin-top: 24px;">{{social_footer}}</div>
</body></html>$abandoned$,
$abandonedtxt$Hi {{customer_name}},

Your bouquet is still waiting.

You started checkout but didn't finish payment. Your cart and delivery details are saved.

Finish checkout: {{cart_restore_url}}

This link expires in a few days. If you already completed your order, you can ignore this email.

Lanna Bloom Support
080-331-3431
{{website_url}}$abandonedtxt$,
true
)
ON CONFLICT (template_key) DO NOTHING;
