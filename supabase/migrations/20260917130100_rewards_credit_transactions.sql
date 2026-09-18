-- Customer Rewards (Phase 1): append-only store-credit ledger.
-- Balance = SUM(amount) per customer. Rows are never edited/deleted; corrections
-- are new reversal rows so history stays fully visible.

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'THB',
  -- FK to reward_campaigns added once that table exists (Phase 5) — same
  -- evolutionary-migration style used elsewhere in this repo (e.g. orders).
  campaign_id uuid,
  order_id text REFERENCES public.orders(order_id),
  checkout_draft_id uuid,
  reversed_transaction_id uuid REFERENCES public.credit_transactions(id),
  expires_at timestamptz,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT credit_transactions_type_check CHECK (type IN ('issue', 'redeem', 'reversal', 'expire')),
  CONSTRAINT credit_transactions_amount_nonzero_check CHECK (amount <> 0),
  -- Sign convention enforced by type, so a stray negative "issue" or positive
  -- "redeem" can never slip into the ledger.
  CONSTRAINT credit_transactions_issue_positive_check CHECK (type <> 'issue' OR amount > 0),
  CONSTRAINT credit_transactions_redeem_negative_check CHECK (type <> 'redeem' OR amount < 0),
  CONSTRAINT credit_transactions_expire_negative_check CHECK (type <> 'expire' OR amount < 0),
  CONSTRAINT credit_transactions_reversal_needs_target_check CHECK (
    type NOT IN ('reversal', 'expire') OR reversed_transaction_id IS NOT NULL
  )
);

-- Idempotency: at most one active redemption reservation per checkout draft
-- (a retried create-checkout-session call for the same draft must not double-reserve).
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_checkout_draft_redeem_uk
  ON public.credit_transactions(checkout_draft_id)
  WHERE type = 'redeem';

-- At most one reversal/expiration per original transaction.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_reversed_target_uk
  ON public.credit_transactions(reversed_transaction_id)
  WHERE type IN ('reversal', 'expire');

CREATE INDEX IF NOT EXISTS idx_credit_tx_customer_id ON public.credit_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_campaign_id ON public.credit_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_order_id ON public.credit_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_expires_at ON public.credit_transactions(expires_at) WHERE expires_at IS NOT NULL;

-- Belt-and-suspenders immutability at the DB level, on top of no UPDATE grant
-- for anon/authenticated: forbid changing the financial facts of a row. The
-- only allowed "mutation" is attaching an order_id once it doesn't have one yet
-- (CAS, mirroring welcome_codes.redeemed_order_id).
CREATE OR REPLACE FUNCTION public.credit_transactions_forbid_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id <> OLD.customer_id
     OR NEW.type <> OLD.type
     OR NEW.amount <> OLD.amount
     OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
     OR (OLD.order_id IS NOT NULL AND NEW.order_id IS DISTINCT FROM OLD.order_id) THEN
    RAISE EXCEPTION 'credit_transactions rows are append-only; only a null order_id may be attached once';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS credit_transactions_forbid_mutation_trigger ON public.credit_transactions;
CREATE TRIGGER credit_transactions_forbid_mutation_trigger
  BEFORE UPDATE ON public.credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_transactions_forbid_mutation();

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- A customer may read only rows belonging to their own customers row.
-- No write policy at all — every write goes through the SECURITY DEFINER RPCs
-- (see 20260917130200_rewards_credit_rpcs.sql), which are themselves revoked
-- from anon/authenticated and granted to service_role only.
DROP POLICY IF EXISTS "credit_tx_self_read" ON public.credit_transactions;
CREATE POLICY "credit_tx_self_read"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
  );

-- Defense in depth: revoke the default anon/authenticated table grants and
-- re-grant only SELECT to authenticated (RLS narrows that further to own rows).
-- No INSERT/UPDATE/DELETE grant for anon/authenticated at all — every write goes
-- through the SECURITY DEFINER RPCs, themselves service_role only.
REVOKE ALL ON TABLE public.credit_transactions FROM anon, authenticated;
GRANT SELECT ON TABLE public.credit_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.credit_transactions TO service_role;

COMMENT ON TABLE public.credit_transactions IS
  'Append-only store-credit ledger. Balance = SUM(amount) per customer. Never UPDATE amount/type/customer_id; corrections are new reversal rows.';
