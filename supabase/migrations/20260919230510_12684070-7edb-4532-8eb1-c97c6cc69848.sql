REVOKE ALL ON FUNCTION public.apply_player_progress(bigint, jsonb, numeric, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.schedule_daily_broadcast(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_player_progress(bigint, jsonb, numeric, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.schedule_daily_broadcast(text, text) TO service_role;