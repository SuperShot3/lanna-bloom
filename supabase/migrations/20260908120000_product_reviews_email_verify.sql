-- Require email confirmation before a product review reaches admin.
-- Legacy rows get a unique placeholder email and keep their current status.

ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS author_email text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verify_token_hash text,
  ADD COLUMN IF NOT EXISTS verify_expires_at timestamptz;

UPDATE public.product_reviews
SET
  author_email = 'legacy-' || id::text || '@internal.invalid',
  email_verified_at = COALESCE(email_verified_at, created_at)
WHERE author_email IS NULL OR btrim(author_email) = '';

ALTER TABLE public.product_reviews
  ALTER COLUMN author_email SET NOT NULL;

ALTER TABLE public.product_reviews
  ALTER COLUMN order_id TYPE text USING (
    CASE WHEN order_id IS NULL THEN NULL ELSE order_id::text END
  );

ALTER TABLE public.product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_status_check;

ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_status_check
  CHECK (status IN ('pending_email', 'pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_one_active_per_email
  ON public.product_reviews (bouquet_id, author_email)
  WHERE status IN ('pending_email', 'pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_product_reviews_verify_token_hash
  ON public.product_reviews (verify_token_hash)
  WHERE verify_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_reviews_author_email
  ON public.product_reviews (author_email);

COMMENT ON COLUMN public.product_reviews.author_email IS
  'Normalized lowercase email. Never shown on the storefront. Used for confirmation and verified-purchase matching.';
COMMENT ON COLUMN public.product_reviews.verify_token_hash IS
  'SHA-256 of the one-time confirm token. Null after confirmation or expiry cleanup.';
COMMENT ON COLUMN public.product_reviews.order_id IS
  'Set after email confirmation when a paid delivered order for this bouquet matches the email. Text to match orders.order_id.';

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
  'product_review_verify',
  'Product review email confirmation',
  'Confirm your Lanna Bloom review',
  'Please confirm your review of {{bouquet_name}}',
$verifyhtml$<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /></head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  {{brand_header}}
  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 24px;">
    <h1 style="font-size: 24px; line-height: 1.3; margin: 0 0 14px 0; color: #2c2415;">Confirm your review</h1>
    <p style="margin: 0 0 14px 0;">Hi {{customer_name}},</p>
    <p style="margin: 0 0 14px 0;">Please confirm your review of <strong>{{bouquet_name}}</strong>. This helps us keep reviews real. Your email is never shown on the product page.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0 14px 0; width: 100%;">
      <tr>
        <td style="border-radius: 8px; background: #967a4d; text-align: center;">
          <a href="{{verify_url}}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px;">Confirm review</a>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 10px 0; font-size: 13px; color: #6f624c;">This link expires in 48 hours. If you did not write a review, you can ignore this email.</p>
    <p style="margin: 0; font-size: 13px; color: #6f624c;">If the button does not work, copy this link:<br />{{verify_url}}</p>
  </div>
  <div style="margin-top: 24px;">{{social_footer}}</div>
</body></html>$verifyhtml$,
$verifytxt$Confirm your Lanna Bloom review

Hi {{customer_name}},

Please confirm your review of {{bouquet_name}}. Your email is never shown on the product page.

Confirm here: {{verify_url}}

This link expires in 48 hours. If you did not write a review, you can ignore this email.

Lanna Bloom
{{website_url}}$verifytxt$,
  true
)
ON CONFLICT (template_key) DO NOTHING;
