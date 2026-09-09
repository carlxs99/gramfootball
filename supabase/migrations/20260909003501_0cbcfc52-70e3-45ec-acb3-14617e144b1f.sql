CREATE TABLE public.players (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  photo_url TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by BIGINT,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX players_referred_by_idx ON public.players (referred_by);

GRANT ALL ON public.players TO service_role;

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER players_set_updated_at BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();