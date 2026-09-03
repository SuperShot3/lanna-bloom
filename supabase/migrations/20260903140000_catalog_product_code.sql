-- Immutable public product codes (LB-001, LB-002, …) for every catalog item.
-- Assigned once at insert. UUID remains the internal primary key.

CREATE SEQUENCE public.catalog_product_code_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE TABLE public.catalog_product_codes (
  code text PRIMARY KEY CHECK (code ~ '^LB-[0-9]{3,}$'),
  entity_type text NOT NULL CHECK (entity_type IN ('bouquet', 'product')),
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

COMMENT ON TABLE public.catalog_product_codes IS
  'Global registry of public catalog product codes. Codes are never reused.';

ALTER TABLE public.catalog_product_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalog_product_codes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_product_codes TO service_role;

REVOKE ALL ON SEQUENCE public.catalog_product_code_seq FROM anon, authenticated;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.catalog_product_code_seq TO service_role;

ALTER TABLE public.catalog_bouquets
  ADD COLUMN IF NOT EXISTS product_code text;

ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS product_code text;

COMMENT ON COLUMN public.catalog_bouquets.product_code IS
  'Public product code (LB-001). Assigned once at insert; immutable. Distinct from id (uuid).';
COMMENT ON COLUMN public.catalog_products.product_code IS
  'Public product code (LB-001). Assigned once at insert; immutable. Distinct from id (uuid).';

CREATE OR REPLACE FUNCTION public.format_catalog_product_code(n integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT 'LB-' || CASE
    WHEN n < 10 THEN '00' || n::text
    WHEN n < 100 THEN '0' || n::text
    ELSE n::text
  END;
$$;

CREATE OR REPLACE FUNCTION public.next_catalog_product_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
  generated text;
BEGIN
  LOOP
    n := nextval('public.catalog_product_code_seq')::integer;
    generated := public.format_catalog_product_code(n);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.catalog_product_codes WHERE catalog_product_codes.code = generated
    );
  END LOOP;
  RETURN generated;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_catalog_product_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entity text;
BEGIN
  IF TG_TABLE_NAME = 'catalog_bouquets' THEN
    entity := 'bouquet';
  ELSIF TG_TABLE_NAME = 'catalog_products' THEN
    entity := 'product';
  ELSE
    RAISE EXCEPTION 'assign_catalog_product_code: unexpected table %', TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.product_code IS NOT NULL AND NEW.product_code IS DISTINCT FROM OLD.product_code THEN
      RAISE EXCEPTION 'product_code is immutable';
    END IF;
    IF NEW.product_code IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.product_code IS NULL OR btrim(NEW.product_code) = '' THEN
    NEW.product_code := public.next_catalog_product_code();
  ELSE
    NEW.product_code := btrim(NEW.product_code);
    IF NEW.product_code !~ '^LB-[0-9]{3,}$' THEN
      RAISE EXCEPTION 'invalid product_code format: %', NEW.product_code;
    END IF;
  END IF;

  INSERT INTO public.catalog_product_codes (code, entity_type, entity_id)
  VALUES (NEW.product_code, entity, NEW.id);

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.format_catalog_product_code(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.next_catalog_product_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_catalog_product_code() TO service_role;

-- Backfill existing rows in created_at order across both tables, then lock the sequence.
WITH ordered AS (
  SELECT
    entity_type,
    id,
    row_number() OVER (ORDER BY created_at ASC, entity_type ASC, id ASC) AS n
  FROM (
    SELECT 'bouquet'::text AS entity_type, id, created_at FROM public.catalog_bouquets
    UNION ALL
    SELECT 'product'::text, id, created_at FROM public.catalog_products
  ) items
),
coded AS (
  SELECT entity_type, id, public.format_catalog_product_code(n::integer) AS code
  FROM ordered
)
INSERT INTO public.catalog_product_codes (code, entity_type, entity_id)
SELECT code, entity_type, id FROM coded;

UPDATE public.catalog_bouquets b
SET product_code = c.code
FROM public.catalog_product_codes c
WHERE c.entity_type = 'bouquet' AND c.entity_id = b.id AND b.product_code IS NULL;

UPDATE public.catalog_products p
SET product_code = c.code
FROM public.catalog_product_codes c
WHERE c.entity_type = 'product' AND c.entity_id = p.id AND p.product_code IS NULL;

SELECT setval(
  'public.catalog_product_code_seq',
  GREATEST((SELECT COUNT(*)::bigint FROM public.catalog_product_codes), 1),
  (SELECT COUNT(*) > 0 FROM public.catalog_product_codes)
);

ALTER TABLE public.catalog_bouquets
  ALTER COLUMN product_code SET NOT NULL,
  ADD CONSTRAINT catalog_bouquets_product_code_key UNIQUE (product_code),
  ADD CONSTRAINT catalog_bouquets_product_code_format_check CHECK (product_code ~ '^LB-[0-9]{3,}$');

ALTER TABLE public.catalog_products
  ALTER COLUMN product_code SET NOT NULL,
  ADD CONSTRAINT catalog_products_product_code_key UNIQUE (product_code),
  ADD CONSTRAINT catalog_products_product_code_format_check CHECK (product_code ~ '^LB-[0-9]{3,}$');

CREATE TRIGGER catalog_bouquets_assign_product_code
  BEFORE INSERT OR UPDATE ON public.catalog_bouquets
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_catalog_product_code();

CREATE TRIGGER catalog_products_assign_product_code
  BEFORE INSERT OR UPDATE ON public.catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_catalog_product_code();
