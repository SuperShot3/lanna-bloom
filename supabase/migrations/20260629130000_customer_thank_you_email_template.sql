-- Add a general customer thank-you email as a normal Email Control Center template.

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
  'customer_thank_you',
  'Customer thank-you',
  'Thank you for choosing Lanna Bloom',
  'We are grateful to be part of your special moment.',
$html$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width" />
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 600px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
    We are grateful to be part of your special moment.
  </div>

  {{brand_header}}

  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 22px; overflow: hidden; box-shadow: 0 18px 48px rgba(44,36,21,0.10);">
    <div style="background: #f7efe1; border-bottom: 1px solid #eadfcd; padding: 18px 26px;">
      <p style="margin: 0; color: #967a4d; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;">
        Lanna Bloom
      </p>
    </div>

    <div style="padding: 28px 26px 26px;">
      <p style="font-size: 18px; margin: 0 0 10px 0;">Hi {{customer_name}},</p>

      <h1 style="font-size: 29px; line-height: 1.22; margin: 0 0 16px 0; color: #2c2415; letter-spacing: -0.02em;">
        Thank you for choosing Lanna Bloom
      </h1>

      <p style="margin: 0 0 16px 0; font-size: 16px;">
        We are truly grateful for your order and for trusting us to help deliver something meaningful.
      </p>

      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Whether the flowers were sent for love, celebration, comfort, or a thoughtful surprise, we hope they brought beauty and joy to the moment.
      </p>

      <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 16px; padding: 18px; margin: 24px 0;">
        <p style="margin: 0 0 7px 0; color: #967a4d; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;">
          A small note from us
        </p>
        <p style="margin: 0; font-size: 15px; color: #5c4a32;">
          Every order helps support local florists here in Chiang Mai. Thank you for being part of our growing Lanna Bloom story.
        </p>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0 14px 0; width: 100%;">
        <tr>
          <td style="border-radius: 999px; background: #967a4d; text-align: center; box-shadow: 0 6px 16px rgba(150,122,77,0.22);">
            <a href="{{website_url}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 15px 24px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px;">
              Visit Lanna Bloom
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size: 15px; margin: 22px 0 0 0;">
        Warmly,<br>
        <strong>The Lanna Bloom Team</strong>
      </p>
    </div>
  </div>

  <div style="margin-top: 24px;">
    {{social_footer}}
  </div>
</body>
</html>$html$,
$text$Hi {{customer_name}},

Thank you for choosing Lanna Bloom.

We are truly grateful for your order and for trusting us to help deliver something meaningful.

Whether the flowers were sent for love, celebration, comfort, or a thoughtful surprise, we hope they brought beauty and joy to the moment.

Every order helps support local florists here in Chiang Mai. Thank you for being part of our growing Lanna Bloom story.

Visit Lanna Bloom: {{website_url}}

Warmly,
The Lanna Bloom Team$text$,
  true
)
ON CONFLICT (template_key) DO UPDATE
SET
  template_name = EXCLUDED.template_name,
  subject_template = EXCLUDED.subject_template,
  preview_text = EXCLUDED.preview_text,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  is_active = EXCLUDED.is_active,
  updated_at = now();
