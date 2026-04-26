/** Template keys in `email_templates` (migrations and admin). */
export const EMAIL_TEMPLATE_KEYS = [
  'order_received',
  'payment_confirmed',
  'payment_failed',
  'order_delivered',
  'review_request',
  'reminder_7_days',
  'reminder_3_days',
  'reminder_1_day',
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];
