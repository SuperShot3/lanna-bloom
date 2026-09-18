-- Customer Rewards (Phase 1): the only functions allowed to write credit_transactions.
--
-- Why not the CAS-on-unique-constraint pattern used by welcome_codes.redeemed_at?
-- That pattern works for a single-row state flip (unredeemed -> redeemed) but not
-- for balance arithmetic: two concurrent callers can each read the same SUM(amount),
-- each conclude a redemption is valid, and each insert a negative row — no unique
-- constraint catches that. Each function below takes a Postgres advisory
-- transaction lock keyed on the customer id for the duration of the (implicit,
-- single-statement) transaction, which serializes all balance-changing operations
-- per customer without needing app-level multi-statement transactions (which this
-- codebase does not use anywhere).
--
-- All four are REVOKEd from PUBLIC/anon/authenticated and GRANTed to service_role
-- only, so a customer can never issue or redeem credit even if a raw RPC request
-- reached Supabase — this is DB-level enforcement, not just app logic.

CREATE OR REPLACE FUNCTION public.issue_credit(
  p_customer_id uuid,
  p_amount numeric,
  p_campaign_id uuid,
  p_expires_at timestamptz,
  p_created_by text,
  p_max_issue_per_reward numeric,
  p_max_customer_balance numeric,
  p_notes text DEFAULT NULL
) RETURNS public.credit_transactions
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance numeric;
  v_row public.credit_transactions;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('credit:' || p_customer_id::text, 0));

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > p_max_issue_per_reward THEN
    RAISE EXCEPTION 'invalid_or_over_reward_limit' USING ERRCODE = 'P0004';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_balance
    FROM public.credit_transactions WHERE customer_id = p_customer_id;

  IF v_balance + p_amount > p_max_customer_balance THEN
    RAISE EXCEPTION 'exceeds_max_balance' USING ERRCODE = 'P0005';
  END IF;

  INSERT INTO public.credit_transactions
    (customer_id, type, amount, campaign_id, expires_at, created_by, notes)
  VALUES (p_customer_id, 'issue', p_amount, p_campaign_id, p_expires_at, p_created_by, p_notes)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_credit_redemption(
  p_customer_id uuid,
  p_amount numeric,
  p_checkout_draft_id uuid,
  p_max_spend_per_order numeric
) RETURNS public.credit_transactions
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.credit_transactions;
  v_balance numeric;
  v_row public.credit_transactions;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('credit:' || p_customer_id::text, 0));

  -- Idempotent replay: the same checkout draft already has a reservation.
  SELECT * INTO v_existing FROM public.credit_transactions
    WHERE checkout_draft_id = p_checkout_draft_id AND type = 'redeem';
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount > p_max_spend_per_order THEN
    RAISE EXCEPTION 'exceeds_per_order_limit' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_balance
    FROM public.credit_transactions WHERE customer_id = p_customer_id;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO public.credit_transactions
    (customer_id, type, amount, checkout_draft_id, created_by)
  VALUES (p_customer_id, 'redeem', -p_amount, p_checkout_draft_id, 'system:create-checkout-session')
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_credit_redemption_to_order(
  p_transaction_id uuid,
  p_order_id text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.credit_transactions
    SET order_id = p_order_id
    WHERE id = p_transaction_id AND type = 'redeem' AND order_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_credit_transaction(
  p_transaction_id uuid,
  p_created_by text
) RETURNS public.credit_transactions
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_orig public.credit_transactions;
  v_row public.credit_transactions;
BEGIN
  SELECT * INTO v_orig FROM public.credit_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0007';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('credit:' || v_orig.customer_id::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE reversed_transaction_id = p_transaction_id AND type IN ('reversal', 'expire')
  ) THEN
    RAISE EXCEPTION 'already_reversed' USING ERRCODE = 'P0006';
  END IF;

  INSERT INTO public.credit_transactions
    (customer_id, type, amount, campaign_id, order_id, reversed_transaction_id, created_by)
  VALUES (
    v_orig.customer_id, 'reversal', -v_orig.amount, v_orig.campaign_id, v_orig.order_id,
    p_transaction_id, p_created_by
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_credit(uuid, numeric, uuid, timestamptz, text, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_credit_redemption(uuid, numeric, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_credit_redemption_to_order(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_credit_transaction(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.issue_credit(uuid, numeric, uuid, timestamptz, text, numeric, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_credit_redemption(uuid, numeric, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_credit_redemption_to_order(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_credit_transaction(uuid, text) TO service_role;

COMMENT ON FUNCTION public.issue_credit IS 'Only path that may create an issue row. service_role only.';
COMMENT ON FUNCTION public.reserve_credit_redemption IS 'Only path that may create a redeem row. Idempotent per checkout_draft_id. service_role only.';
COMMENT ON FUNCTION public.attach_credit_redemption_to_order IS 'CAS: links a redemption to the now-real order once payment is confirmed. service_role only.';
COMMENT ON FUNCTION public.reverse_credit_transaction IS 'Creates an offsetting reversal row; used for refunds/cancellations and corrections. service_role only.';
