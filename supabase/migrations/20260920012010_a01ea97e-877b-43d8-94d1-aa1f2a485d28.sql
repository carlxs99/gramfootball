CREATE OR REPLACE FUNCTION public.credit_referral_commission(
  p_telegram_id bigint,
  p_level text,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur jsonb;
  ledger jsonb;
  old_amount numeric;
  new_amount numeric;
  bal numeric;
BEGIN
  IF p_level NOT IN ('l1', 'l2', 'l3') THEN
    RAISE EXCEPTION 'invalid referral level';
  END IF;
  IF p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'invalid commission amount';
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = p_telegram_id AND banned = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player unavailable';
  END IF;

  ledger := COALESCE(cur->'referralEarned', '{"l1":0,"l2":0,"l3":0}'::jsonb);
  old_amount := COALESCE((ledger->>p_level)::numeric, 0);
  new_amount := round(old_amount + p_amount, 6);
  ledger := jsonb_set(ledger, ARRAY[p_level], to_jsonb(new_amount), true);

  bal := round(COALESCE((cur->>'gram')::numeric, 0) + p_amount, 6);
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(bal), true);
  cur := jsonb_set(cur, '{referralEarned}', ledger, true);

  UPDATE public.players SET state = cur WHERE telegram_id = p_telegram_id;
  RETURN cur;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_referral_commission(bigint, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_referral_commission(bigint, text, numeric) TO service_role;