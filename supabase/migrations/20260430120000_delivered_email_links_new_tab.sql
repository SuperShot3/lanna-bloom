-- Make delivered-email CTAs open outside admin preview iframes and email webviews.

UPDATE public.email_templates
SET
  html_template = replace(
    replace(
      html_template,
      '<a href="{{important_dates_link}}" style="display: block;',
      '<a href="{{important_dates_link}}" target="_blank" rel="noopener noreferrer" style="display: block;'
    ),
    '<a href="{{review_link}}" style="display: block;',
    '<a href="{{review_link}}" target="_blank" rel="noopener noreferrer" style="display: block;'
  ),
  updated_at = now()
WHERE template_key = 'order_delivered';
