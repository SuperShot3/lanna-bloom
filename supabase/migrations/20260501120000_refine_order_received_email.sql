-- Refine order-received customer email to match the delivered-email brand style.
-- This updates the editable default template used by the Email Control Center.

UPDATE public.email_templates
SET
  subject_template = 'Order confirmation {{order_id}} — Lanna Bloom',
  preview_text = 'Your order is in good hands at Lanna Bloom',
  html_template = $received$<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /></head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  {{brand_header}}
  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 24px;">
    <p style="font-size: 18px; margin: 0 0 12px 0;">Hi {{customer_name}},</p>
    <h1 style="font-size: 24px; line-height: 1.3; margin: 0 0 14px 0; color: #2c2415;">Thank you for your order</h1>
    <p style="margin: 0 0 16px 0;">Your order <strong>{{order_id}}</strong> has been received. We will prepare your flowers with care and keep your order details available online.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0 12px 0; width: 100%;">
      <tr>
        <td style="border-radius: 8px; background: #967a4d; text-align: center;">
          <a href="{{confirm_url}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px;">View your order details</a>
        </td>
      </tr>
    </table>

    <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
      <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #2c2415;">Delivery</h2>
      <p style="margin: 0 0 6px 0;"><strong>Date &amp; time:</strong> {{delivery_date}}</p>
      <p style="margin: 0;"><strong>Address:</strong> {{delivery_address}}</p>
    </div>

    <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
      <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #2c2415;">Order summary</h2>
      <p style="margin: 0 0 6px 0;"><strong>Item:</strong> {{product_name}}</p>
      <p style="margin: 0;"><strong>Total:</strong> {{total_price}}</p>
    </div>

    <p style="font-size: 15px; margin: 20px 0 0 0;">If you have any questions, please reply to this email or contact us via LINE, WhatsApp, or the contact details on our website.</p>
    <p style="font-size: 15px; margin: 12px 0 0 0;">Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.</p>
  </div>
  <div style="margin-top: 24px;">{{social_footer}}</div>
</body></html>$received$,
  text_template = $rectxt$Hi {{customer_name}},

Thank you for your order. Your order {{order_id}} has been received.

View your order details: {{confirm_url}}

Delivery
Date & time: {{delivery_date}}
Address: {{delivery_address}}

Order summary
Item: {{product_name}}
Total: {{total_price}}

If you have any questions, please reply to this email or contact us via LINE, WhatsApp, or the contact details on our website.

Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.
$rectxt$,
  updated_at = now()
WHERE template_key = 'order_received';
