-- Redesign order_delivered customer email: richer layout, Google Maps review CTA, important-dates visual block.

UPDATE public.email_templates
SET
  subject_template = 'Your flowers have been delivered',
  preview_text = 'Leave a Google Maps review and save important dates for next time',
  html_template = $delivered$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width" />
</head>

<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 600px; margin: 0 auto; padding: 16px; background: #fdfcf8;">

  {{brand_header}}

  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 18px; padding: 26px; box-shadow: 0 6px 22px rgba(44,36,21,0.06);">

    <p style="font-size: 18px; margin: 0 0 10px 0;">Hi {{customer_name}},</p>

    <h1 style="font-size: 26px; line-height: 1.3; margin: 0 0 14px 0; color: #2c2415;">
      Your flowers have been delivered
    </h1>

    <p style="margin: 0 0 18px 0; font-size: 16px;">
      Your order <strong>{{order_id}}</strong> has been delivered. We hope the flowers arrived beautifully and made someone's day special.
    </p>

    <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 12px; padding: 16px 18px; margin: 22px 0;">
      <h2 style="font-size: 17px; margin: 0 0 10px 0; color: #2c2415;">
        Order summary
      </h2>

      <p style="margin: 0 0 6px 0;"><strong>Item:</strong> {{product_name}}</p>
      <p style="margin: 0 0 6px 0;"><strong>Delivery date:</strong> {{delivery_date}}</p>
      <p style="margin: 0;"><strong>Total:</strong> {{total_price}}</p>
    </div>

    <!-- Google Review CTA Block -->
    <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 18px; padding: 22px 18px; margin: 30px 0; box-shadow: 0 6px 18px rgba(60,64,67,0.10); text-align: center;">

      <div style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 6px;">
        <span style="color:#4285F4;">G</span><span style="color:#DB4437;">o</span><span style="color:#F4B400;">o</span><span style="color:#4285F4;">g</span><span style="color:#0F9D58;">l</span><span style="color:#DB4437;">e</span>
        <span style="color:#5f6368; font-weight: 500;">Maps</span>
      </div>

      <div style="font-size: 22px; letter-spacing: 2px; color: #fbbc04; line-height: 1; margin-bottom: 12px;">
        ★★★★★
      </div>

      <h2 style="font-size: 22px; line-height: 1.35; margin: 0 0 8px 0; color: #2c2415;">
        Enjoyed your flowers?
      </h2>

      <p style="margin: 0 0 18px 0; font-size: 15px; color: #5f6368; font-family: Arial, sans-serif;">
        Your review helps others trust Lanna Bloom.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 10px auto; width: 100%;">
        <tr>
          <td style="border-radius: 999px; background: #1a73e8; text-align: center; box-shadow: 0 2px 6px rgba(26,115,232,0.25);">
            <a href="{{review_link}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 15px 24px; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif; font-weight: 700; font-size: 16px;">
              Leave a Google Maps Review
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size: 12px; color: #5f6368; margin: 8px 0 0 0; font-family: Arial, sans-serif;">
        Secure Google Maps link · Around 1 minute
      </p>

    </div>

    <!-- Important Dates Visual Block -->
    <div style="background: #fffaf3; border: 1px solid #eadfcd; border-radius: 18px; padding: 22px 18px; margin: 28px 0;">

      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 34px; line-height: 1; margin-bottom: 8px;">
          📅
        </div>

        <h2 style="font-size: 22px; line-height: 1.35; margin: 0 0 8px 0; color: #2c2415;">
          Remember special dates
        </h2>

        <p style="margin: 0; font-size: 15px; color: #6f624c;">
          Save important days once. We will remind you before they arrive.
        </p>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 18px 0;">
        <tr>
          <td style="width: 33.33%; padding: 6px;">
            <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 14px 8px; text-align: center;">
              <div style="font-size: 24px; margin-bottom: 6px;">🎂</div>
              <div style="font-size: 13px; color: #2c2415; font-weight: 600;">Birthdays</div>
            </div>
          </td>

          <td style="width: 33.33%; padding: 6px;">
            <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 14px 8px; text-align: center;">
              <div style="font-size: 24px; margin-bottom: 6px;">💍</div>
              <div style="font-size: 13px; color: #2c2415; font-weight: 600;">Anniversaries</div>
            </div>
          </td>

          <td style="width: 33.33%; padding: 6px;">
            <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 14px 8px; text-align: center;">
              <div style="font-size: 24px; margin-bottom: 6px;">🌹</div>
              <div style="font-size: 13px; color: #2c2415; font-weight: 600;">Special days</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 14px; padding: 14px 16px; margin: 16px 0 18px 0;">
        <p style="margin: 0; font-size: 14px; color: #6f624c; text-align: center;">
          We can also suggest bouquets when the date is coming.
        </p>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 10px 0; width: 100%;">
        <tr>
          <td style="border-radius: 999px; background: #967a4d; text-align: center; box-shadow: 0 3px 8px rgba(150,122,77,0.22);">
            <a href="{{important_dates_link}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px;">
              Save My Important Dates
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size: 12px; color: #6f624c; margin: 8px 0 0 0; text-align: center;">
        Takes less than 1 minute · You can unsubscribe anytime
      </p>

    </div>

    <p style="font-size: 15px; margin: 24px 0 0 0;">
      Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.
    </p>

  </div>

  <div style="margin-top: 24px;">
    {{social_footer}}
  </div>

</body>
</html>$delivered$,
  text_template = $deltxt$Hi {{customer_name}},

Your flowers have been delivered.

Your order {{order_id}} has been delivered. We hope the flowers arrived beautifully and made someone's day special.

Order summary
Item: {{product_name}}
Delivery date: {{delivery_date}}
Total: {{total_price}}

Enjoyed your flowers?
Your review helps others trust Lanna Bloom.
Leave a Google Maps review: {{review_link}}

Remember special dates
Save important days once. We will remind you before they arrive. We can also suggest bouquets when the date is coming.
Save my important dates: {{important_dates_link}}
Takes less than 1 minute. You can unsubscribe anytime.

Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.
$deltxt$,
  updated_at = now()
WHERE template_key = 'order_delivered';
