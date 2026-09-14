CREATE TABLE public.market_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id bigint NOT NULL,
  owner_name text,
  offer_card_id text NOT NULL,
  want_card_id text,
  want_rarity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  taker_id bigint,
  taker_card_id text,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.market_trades TO service_role;

ALTER TABLE public.market_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to trades" ON public.market_trades
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE INDEX market_trades_status_idx ON public.market_trades (status, created_at DESC);
CREATE INDEX market_trades_owner_idx ON public.market_trades (owner_id, status);

CREATE TRIGGER market_trades_set_updated_at
  BEFORE UPDATE ON public.market_trades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();