-- Multiple receipt images per expense (supports 3+ images).

CREATE TABLE IF NOT EXISTS public.expense_receipt_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expense_receipt_images_expense_path_key UNIQUE (expense_id, file_path)
);

CREATE INDEX IF NOT EXISTS expense_receipt_images_expense_id_idx
  ON public.expense_receipt_images (expense_id, created_at DESC);

ALTER TABLE public.expense_receipt_images ENABLE ROW LEVEL SECURITY;

-- Backfill existing single receipt path values into the new table.
INSERT INTO public.expense_receipt_images (expense_id, file_path, file_name)
SELECT
  e.id,
  e.receipt_file_path,
  split_part(e.receipt_file_path, '/', array_length(string_to_array(e.receipt_file_path, '/'), 1))
FROM public.expenses e
WHERE e.receipt_file_path IS NOT NULL
ON CONFLICT (expense_id, file_path) DO NOTHING;
