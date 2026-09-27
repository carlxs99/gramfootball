CREATE OR REPLACE FUNCTION public.reserve_withdrawal(p_telegram_id bigint, p_amount numeric, p_fee numeric, p_net numeric, p_to_address text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur jsonb; bal numeric; nxt numeric; withdrawal_id uuid; pack_count integer; xp_value numeric;
BEGIN
  IF p_amount <= 0 OR p_fee < 0 OR p_net <= 0 OR round(p_amount - p_fee, 4) <> round(p_net, 4) THEN RAISE EXCEPTION 'invalid withdrawal'; END IF;
  IF p_to_address IS NULL OR length(trim(p_to_address)) = 0 OR length(p_to_address) > 128 THEN RAISE EXCEPTION 'invalid withdrawal address'; END IF;
  SELECT COALESCE(state, '{}'::jsonb) INTO cur FROM public.players WHERE telegram_id = p_telegram_id AND banned = false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'player unavailable'; END IF;
  pack_count := greatest(0, floor(COALESCE((cur->>'packsOpened')::numeric, 0)))::integer;
  xp_value := greatest(0, COALESCE((cur->>'xp')::numeric, 0));
  IF least(pack_count, floor(xp_value / 10)::integer) < 1 THEN RAISE EXCEPTION 'first pack required'; END IF;
  bal := COALESCE((cur->>'gram')::numeric, 0);
  nxt := round(bal - p_amount, 6);
  IF nxt < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  INSERT INTO public.withdrawals (telegram_id, amount, fee, net, to_address, status) VALUES (p_telegram_id, p_amount, p_fee, p_net, trim(p_to_address), 'sending') RETURNING id INTO withdrawal_id;
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(nxt));
  UPDATE public.players SET state = cur WHERE telegram_id = p_telegram_id;
  RETURN jsonb_build_object('id', withdrawal_id, 'gram', nxt);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_withdrawal(bigint, numeric, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_withdrawal(bigint, numeric, numeric, numeric, text) TO service_role;