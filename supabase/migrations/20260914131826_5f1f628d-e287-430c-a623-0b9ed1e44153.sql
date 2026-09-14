CREATE TABLE public.channel_post_runs (
  week_key text PRIMARY KEY,
  post_index integer NOT NULL,
  message_id bigint,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.channel_post_runs TO service_role;

ALTER TABLE public.channel_post_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to channel post runs"
ON public.channel_post_runs
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);