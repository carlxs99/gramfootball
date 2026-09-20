CREATE OR REPLACE FUNCTION public.settle_pending_payout(p_payout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payout public.pending_payouts%ROWTYPE;
  cur jsonb;
  bal numeric;
  nxt numeric;
BEGIN
  SELECT * INTO payout
  FROM public.pending_payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'missing');
  END IF;

  IF payout.paid_at IS NOT NULL THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'already_paid');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE telegram_id = payout.telegram_id AND banned = true
  ) THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'banned');
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = payout.telegram_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.pending_payouts
    SET attempts = attempts + 1, last_error = 'player not found'
    WHERE id = p_payout_id;
    RETURN jsonb_build_object('settled', false, 'reason', 'player_not_found');
  END IF;

  bal := COALESCE((cur->>'gram')::numeric, 0);
  nxt := round(bal + payout.amount, 6);
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(nxt));

  UPDATE public.players
  SET state = cur
  WHERE telegram_id = payout.telegram_id;

  UPDATE public.pending_payouts
  SET paid_at = now(), last_error = NULL
  WHERE id = p_payout_id;

  RETURN jsonb_build_object('settled', true, 'gram', nxt);
EXCEPTION WHEN OTHERS THEN
  UPDATE public.pending_payouts
  SET attempts = attempts + 1, last_error = left(SQLERRM, 500)
  WHERE id = p_payout_id;
  RETURN jsonb_build_object('settled', false, 'reason', 'failed');
END;
$$;

REVOKE ALL ON FUNCTION public.settle_pending_payout(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_pending_payout(uuid) TO service_role;