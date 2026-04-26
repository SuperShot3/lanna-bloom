-- Refine delivered-order customer email copy and add clear important-date reminder explanation.
-- This updates the editable default template used by the Email Control Center/outbox.

UPDATE public.email_templates
SET
  subject_template = 'Your flowers have been delivered',
  preview_text = 'Save future special days and leave a review',
  html_template = $delivered$<!DOCTYPE html>
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
  text_template = $deltxt$Hi {{customer_name}},

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
  updated_at = now()
WHERE template_key = 'order_delivered';
