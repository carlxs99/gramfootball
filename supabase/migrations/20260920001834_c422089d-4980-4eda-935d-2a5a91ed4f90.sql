CREATE OR REPLACE FUNCTION public.process_ton_deposit(
  p_telegram_id bigint,
  p_tx_hash text,
  p_lt bigint,
  p_amount numeric,
  p_memo text,
  p_from_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur jsonb;
  bal numeric;
  nxt numeric;
BEGIN
  IF p_amount <= 0 OR p_tx_hash IS NULL OR length(trim(p_tx_hash)) = 0 THEN
    RAISE EXCEPTION 'invalid deposit';
  END IF;

  INSERT INTO public.ton_deposits (telegram_id, tx_hash, lt, amount, memo, from_address)
  VALUES (p_telegram_id, p_tx_hash, p_lt, p_amount, p_memo, p_from_address)
  ON CONFLICT (tx_hash) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('credited', false);
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = p_telegram_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player not found';
  END IF;

  bal := COALESCE((cur->>'gram')::numeric, 0);
  nxt := round(bal + p_amount, 6);
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(nxt));

  UPDATE public.players
  SET state = cur
  WHERE telegram_id = p_telegram_id;

  RETURN jsonb_build_object('credited', true, 'gram', nxt);
END;
$$;

REVOKE ALL ON FUNCTION public.process_ton_deposit(bigint, text, bigint, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_ton_deposit(bigint, text, bigint, numeric, text, text) TO service_role;