CREATE OR REPLACE FUNCTION public.claim_custom_task_reward(
  p_task_id uuid,
  p_telegram_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_row public.custom_tasks%ROWTYPE;
  progress_row public.custom_task_progress%ROWTYPE;
  cur jsonb;
  bal numeric;
  reward_value numeric;
BEGIN
  SELECT * INTO task_row
  FROM public.custom_tasks
  WHERE id = p_task_id AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task unavailable';
  END IF;

  INSERT INTO public.custom_task_progress (task_id, telegram_id, started_at)
  VALUES (p_task_id, p_telegram_id, now())
  ON CONFLICT (task_id, telegram_id) DO NOTHING;

  SELECT * INTO progress_row
  FROM public.custom_task_progress
  WHERE task_id = p_task_id AND telegram_id = p_telegram_id
  FOR UPDATE;

  IF progress_row.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'reward already claimed';
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = p_telegram_id AND banned = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player unavailable';
  END IF;

  reward_value := round(COALESCE(task_row.reward, 0), 6);
  IF reward_value < 0 OR reward_value > 1000 THEN
    RAISE EXCEPTION 'invalid reward';
  END IF;

  bal := round(COALESCE((cur->>'gram')::numeric, 0) + reward_value, 6);
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(bal), true);

  UPDATE public.players SET state = cur WHERE telegram_id = p_telegram_id;
  UPDATE public.custom_task_progress
  SET claimed_at = now(), updated_at = now()
  WHERE id = progress_row.id;

  RETURN jsonb_build_object('reward', reward_value, 'state', cur);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_custom_task_reward(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_custom_task_reward(uuid, bigint) TO service_role;