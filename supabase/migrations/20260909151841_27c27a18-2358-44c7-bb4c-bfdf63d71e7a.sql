REVOKE ALL ON FUNCTION public.apply_player_progress(bigint, jsonb, numeric, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_player_progress(bigint, jsonb, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_player_progress(bigint, jsonb, numeric, jsonb) TO service_role;