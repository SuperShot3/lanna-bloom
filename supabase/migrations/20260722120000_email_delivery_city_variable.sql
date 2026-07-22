-- Make thank-you / florists copy market-aware via {{delivery_city}}
-- (filled from orders.delivery_destination by buildOrderTemplateVariables).

UPDATE public.email_templates
SET
  html_template = replace(
    html_template,
    'supporting local florists in Chiang Mai',
    'supporting local florists in {{delivery_city}}'
  ),
  text_template = replace(
    text_template,
    'supporting local florists in Chiang Mai',
    'supporting local florists in {{delivery_city}}'
  ),
  updated_at = now()
WHERE template_key IN ('order_received', 'order_delivered')
  AND (
    html_template LIKE '%supporting local florists in Chiang Mai%'
    OR text_template LIKE '%supporting local florists in Chiang Mai%'
  );

UPDATE public.email_templates
SET
  html_template = replace(
    html_template,
    'small local flower business in Chiang Mai',
    'small local flower business in {{delivery_city}}'
  ),
  text_template = replace(
    text_template,
    'small local flower business in Chiang Mai',
    'small local flower business in {{delivery_city}}'
  ),
  updated_at = now()
WHERE template_key = 'order_delivered'
  AND (
    html_template LIKE '%small local flower business in Chiang Mai%'
    OR text_template LIKE '%small local flower business in Chiang Mai%'
  );

UPDATE public.email_templates
SET
  html_template = replace(
    html_template,
    'local florists here in Chiang Mai',
    'local florists here in {{delivery_city}}'
  ),
  text_template = replace(
    text_template,
    'local florists here in Chiang Mai',
    'local florists here in {{delivery_city}}'
  ),
  updated_at = now()
WHERE template_key = 'customer_thank_you'
  AND (
    html_template LIKE '%local florists here in Chiang Mai%'
    OR text_template LIKE '%local florists here in Chiang Mai%'
  );
