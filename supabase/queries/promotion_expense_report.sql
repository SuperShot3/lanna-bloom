-- Promotion expense report
-- Run in Supabase SQL Editor to see total promotion expense by promo code
-- Orders with referral_code and referral_discount are tracked; sum them for expense reporting

SELECT
  referral_code AS promo_code,
  COUNT(*) AS order_count,
  SUM(referral_discount) AS total_promotion_expense_thb,
  MIN(created_at) AS first_used,
  MAX(created_at) AS last_used
FROM public.orders
WHERE referral_code IS NOT NULL
  AND referral_discount IS NOT NULL
  AND referral_discount > 0
GROUP BY referral_code
ORDER BY total_promotion_expense_thb DESC;
