-- Delivered emails should not show a product "buy again" showcase.
-- Product suggestions stay in reminder emails, where they are useful.

UPDATE public.email_templates
SET
  html_template = replace(
    replace(html_template, E'\n\n    {{product_showcase}}\n', E'\n'),
    E'\n  {{product_showcase}}\n',
    E'\n'
  ),
  updated_at = now()
WHERE template_key = 'order_delivered'
  AND position('{{product_showcase}}' in html_template) > 0;
