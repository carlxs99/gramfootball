ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS ton_address text,
  ADD COLUMN IF NOT EXISTS memo_tag text;

UPDATE public.players SET memo_tag = 'MC' || telegram_id WHERE memo_tag IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_memo_tag_key ON public.players (memo_tag);

CREATE TABLE public.ton_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  tx_hash text NOT NULL UNIQUE,
  lt bigint,
  amount numeric NOT NULL,
  memo text,
  from_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ton_deposits TO service_role;
ALTER TABLE public.ton_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to deposits" ON public.ton_deposits FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE INDEX ton_deposits_telegram_id_idx ON public.ton_deposits (telegram_id, created_at DESC);

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  amount numeric NOT NULL,
  fee numeric NOT NULL,
  net numeric NOT NULL,
  to_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  tx_hash text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to withdrawals" ON public.withdrawals FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE INDEX withdrawals_telegram_id_idx ON public.withdrawals (telegram_id, created_at DESC);
CREATE TRIGGER withdrawals_set_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ton_scan_state (
  id text PRIMARY KEY,
  last_lt bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ton_scan_state TO service_role;
ALTER TABLE public.ton_scan_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to scan state" ON public.ton_scan_state FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE TRIGGER ton_scan_state_set_updated_at BEFORE UPDATE ON public.ton_scan_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();