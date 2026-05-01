-- Split auto-linked flower COGS expenses when the order also has delivery_cost:
-- flower expense amount := orders.cogs_amount; insert companion delivery expense.
--
-- Row filter: PATCH /costs uses notes = 'Auto from order COGS'. Legacy synced rows may
-- have NULL or whitespace-only notes; we normalize those without touching other wording.
-- BUG TO AVOID: COALESCE(trim(notes),'Auto from order COGS') = 'Auto...' treats *every*
-- NULL notes row as auto-sync — do not use that pattern.

WITH flower_sync AS (
  SELECT
    e.id AS expense_id,
    o.order_id,
    ROUND(o.cogs_amount::numeric, 2) AS cogs_amt
  FROM public.expenses e
  INNER JOIN public.orders o ON o.order_id = e.linked_order_id
  WHERE e.category = 'flowers'
    AND COALESCE(trim(e.notes::text), '') IN ('', 'Auto from order COGS')
    AND o.cogs_amount IS NOT NULL
    AND o.cogs_amount > 0
    AND o.delivery_cost IS NOT NULL
    AND o.delivery_cost > 0
)
UPDATE public.expenses e
SET
  amount = fs.cogs_amt,
  notes = 'Auto from order COGS',
  updated_at = now()
FROM flower_sync fs
WHERE e.id = fs.expense_id;

INSERT INTO public.expenses (
  amount,
  currency,
  date,
  category,
  description,
  payment_method,
  receipt_file_path,
  receipt_attached,
  created_by,
  notes,
  linked_order_id,
  bill_tracking,
  created_at,
  updated_at
)
SELECT
  ROUND(o.delivery_cost::numeric, 2),
  'THB',
  COALESCE(o.paid_at::date, o.created_at::date),
  'delivery',
  'Delivery (driver) — order ' || o.order_id,
  'cash',
  NULL,
  FALSE,
  e.created_by,
  'Auto from order delivery cost',
  o.order_id,
  jsonb_build_array(
    jsonb_build_object(
      'line_id', 'order:delivery',
      'label',
        'Payment to driver · '
          || trim(to_char(ROUND(o.delivery_cost::numeric, 2), 'FM999999990.00'))
          || ' THB',
      'vendor_bill_applicable', false,
      'transfer_to_shop', false,
      'bill_from_shop', false
    )
  ),
  now(),
  now()
FROM public.expenses e
INNER JOIN public.orders o ON o.order_id = e.linked_order_id
WHERE e.category = 'flowers'
  AND COALESCE(trim(e.notes::text), '') IN ('', 'Auto from order COGS')
  AND o.delivery_cost IS NOT NULL
  AND o.delivery_cost > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.expenses d
    WHERE d.linked_order_id = o.order_id
      AND d.category = 'delivery'
      AND COALESCE(trim(d.notes::text), '') = 'Auto from order delivery cost'
  );
