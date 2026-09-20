-- lovable-cron-fallback-reviewed: TON offers no inbound webhook here; five-minute reconciliation gives automatic crediting with bounded cost.
CREATE OR REPLACE FUNCTION public.schedule_gram_football_deposit_scan(p_secret text, p_base_url text)
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
    RAISE EXCEPTION 'Invalid deposit scan base URL';
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'gram-football-deposit-scan';

  PERFORM cron.schedule(
    'gram-football-deposit-scan',
    '*/5 * * * *',
    format(
      $job$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$job$,
      v_base_url || '/api/public/wallet/scan-deposits',
      v_headers::text
    )
  );

  RETURN 'scheduled';
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_gram_football_deposit_scan(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_gram_football_deposit_scan(text, text) TO service_role;