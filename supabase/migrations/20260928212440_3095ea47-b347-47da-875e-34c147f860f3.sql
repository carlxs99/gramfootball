CREATE TABLE public.referral_tournament_results (
  week_key text NOT NULL,
  place integer NOT NULL,
  telegram_id bigint NOT NULL,
  name text,
  referrals integer NOT NULL DEFAULT 0,
  prize text NOT NULL,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_key, place)
);
GRANT ALL ON public.referral_tournament_results TO service_role;
ALTER TABLE public.referral_tournament_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to tournament results" ON public.referral_tournament_results FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.referral_tournament_weeks (
  week_key text PRIMARY KEY,
  closed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_tournament_weeks TO service_role;
ALTER TABLE public.referral_tournament_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to tournament weeks" ON public.referral_tournament_weeks FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.schedule_gram_football_tournament(p_secret text, p_base_url text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_base_url text := rtrim(p_base_url, '/');
  v_headers jsonb := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || p_secret);
BEGIN
  IF p_secret IS NULL OR length(p_secret) < 32 THEN RAISE EXCEPTION 'Invalid cron secret'; END IF;
  IF v_base_url !~ '^https://[a-zA-Z0-9.-]+$' THEN RAISE EXCEPTION 'Invalid base URL'; END IF;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'gram-football-referral-tournament';
  PERFORM cron.schedule('gram-football-referral-tournament', '5 * * * *',
    format($job$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$job$,
      v_base_url || '/api/public/tournament/close', v_headers::text));
  RETURN 'scheduled';
END; $$;
REVOKE ALL ON FUNCTION public.schedule_gram_football_tournament(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_gram_football_tournament(text, text) TO service_role;