CREATE TABLE public.battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id bigint NOT NULL,
  guest_id bigint,
  wager numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  host_team jsonb NOT NULL DEFAULT '[]'::jsonb,
  guest_team jsonb NOT NULL DEFAULT '[]'::jsonb,
  battle jsonb NOT NULL DEFAULT '{}'::jsonb,
  winner_id bigint,
  turn_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.battles TO service_role;

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to battles"
  ON public.battles FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX battles_open_idx ON public.battles (status, created_at DESC);
CREATE INDEX battles_host_idx ON public.battles (host_id, created_at DESC);
CREATE INDEX battles_guest_idx ON public.battles (guest_id, created_at DESC);

CREATE TRIGGER battles_set_updated_at
  BEFORE UPDATE ON public.battles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();