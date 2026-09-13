CREATE TABLE public.broadcast_runs (
  day date PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  lock_until timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false
);
CREATE TABLE public.broadcast_sends (
  day date NOT NULL,
  telegram_id bigint NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, telegram_id)
);
GRANT ALL ON public.broadcast_runs TO service_role;
GRANT ALL ON public.broadcast_sends TO service_role;
ALTER TABLE public.broadcast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_sends ENABLE ROW LEVEL SECURITY;