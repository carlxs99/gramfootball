CREATE OR REPLACE FUNCTION public.apply_player_progress(p_telegram_id bigint, p_state jsonb, p_gram_delta numeric, p_expect jsonb DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cur jsonb;
  bal numeric;
  nxt numeric;
  k text;
BEGIN
  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = p_telegram_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player not found';
  END IF;

  IF p_expect IS NOT NULL THEN
    FOR k IN SELECT jsonb_object_keys(p_expect) LOOP
      IF (cur -> k) IS DISTINCT FROM (p_expect -> k) THEN
        RAISE EXCEPTION 'stale state';
      END IF;
    END LOOP;
  END IF;

  bal := COALESCE((cur->>'gram')::numeric, 0);
  nxt := round(bal + COALESCE(p_gram_delta, 0), 6);

  IF nxt < 0 THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  cur := cur || COALESCE(p_state, '{}'::jsonb);
  cur := cur - 'gram';
  cur := jsonb_set(cur, '{gram}', to_jsonb(nxt));

  UPDATE public.players SET state = cur WHERE telegram_id = p_telegram_id;
  RETURN cur;
END;
$function$;