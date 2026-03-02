-- Add rating and review_date to customer_reviews for admin-pasted Google reviews
ALTER TABLE public.customer_reviews
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS review_date date;

-- Constraint: rating 1-5 when set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_reviews_rating_check'
  ) THEN
    ALTER TABLE public.customer_reviews
      ADD CONSTRAINT customer_reviews_rating_check
      CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
  END IF;
END $$;

-- Default existing rows to 5 stars
UPDATE public.customer_reviews SET rating = 5 WHERE rating IS NULL;

COMMENT ON COLUMN public.customer_reviews.rating IS '1-5 stars, from Google or manual';
COMMENT ON COLUMN public.customer_reviews.review_date IS 'Original review date when pasted from Google';
