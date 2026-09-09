ALTER TABLE public.players ADD COLUMN IF NOT EXISTS ban_reason text;

CREATE TABLE IF NOT EXISTS public.player_ips (
  telegram_id bigint NOT NULL,
  ip text NOT NULL,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (telegram_id, ip)
);

CREATE INDEX IF NOT EXISTS player_ips_ip_idx ON public.player_ips (ip);

GRANT ALL ON public.player_ips TO service_role;

ALTER TABLE public.player_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to player ips"
ON public.player_ips FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);