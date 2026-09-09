DROP FUNCTION IF EXISTS public.apply_player_progress(bigint, jsonb, numeric);
GRANT EXECUTE ON FUNCTION public.apply_player_progress(bigint, jsonb, numeric, jsonb) TO service_role;