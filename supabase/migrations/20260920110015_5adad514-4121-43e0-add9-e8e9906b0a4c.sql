CREATE OR REPLACE FUNCTION public.schedule_gram_football_broadcasts(p_secret text, p_base_url text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_base_url text := rtrim(p_base_url, '/');
  v_headers jsonb := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || p_secret
  );
BEGIN
  IF p_secret IS NULL OR length(p_secret) < 32 THEN
    RAISE EXCEPTION 'Invalid cron secret';
  END IF;
  IF v_base_url !~ '^https://[a-zA-Z0-9.-]+$' THEN
    RAISE EXCEPTION 'Invalid broadcast base URL';
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('gram-football-daily-broadcast', 'gram-football-weekly-post');

  PERFORM cron.schedule(
    'gram-football-daily-broadcast',
    '0 * * * *',
    format(
      $job$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$job$,
      v_base_url || '/api/public/broadcast/daily',
      v_headers::text
    )
  );

  PERFORM cron.schedule(
    'gram-football-weekly-post',
    '15 * * * *',
    format(
      $job$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$job$,
      v_base_url || '/api/public/broadcast/weekly',
      v_headers::text
    )
  );

  RETURN 'scheduled';
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_gram_football_broadcasts(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_gram_football_broadcasts(text, text) TO service_role;