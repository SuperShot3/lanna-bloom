-- Insert {{product_showcase}} (site-styled static card, see lib/email/productShowcaseBlock.ts)
-- into reminder templates only. Delivered emails should confirm delivery and promote reminders,
-- not show "buy again" product UI.

-- Reminders: replace flat image + confirm + choose with single pre-rendered block
UPDATE public.email_templates
SET
  html_template = replace(
    html_template,
    '  <p style="text-align: center; margin: 12px 0;"><img src="{{recommended_product_image}}" alt="" width="280" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e8e0d4;" /></p>
  <p><strong>{{recommended_product_name}}</strong> — {{recommended_product_price}}</p>
  <p style="text-align: center; margin: 20px 0;">
    <a href="{{confirm_url}}" style="display: inline-block; background: #967a4d; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Confirm this bouquet</a>
  </p>
  <p style="text-align: center;"><a href="{{choose_another_url}}" style="color: #967a4d;">Choose another bouquet</a></p>',
    '  {{product_showcase}}'
  ),
  updated_at = now()
WHERE template_key IN ('reminder_7_days', 'reminder_3_days', 'reminder_1_day')
  AND position('{{product_showcase}}' in html_template) = 0;
