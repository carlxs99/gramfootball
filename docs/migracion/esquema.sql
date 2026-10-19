-- GRAM Football: estructura completa de la base de datos (todas las migraciones en orden).
-- Ejecutar una sola vez en la base de datos NUEVA y vacía antes de importar la copia.

-- ===== 20260919230510_12684070-7edb-4532-8eb1-c97c6cc69848.sql =====
REVOKE ALL ON FUNCTION public.apply_player_progress(bigint, jsonb, numeric, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.schedule_daily_broadcast(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_player_progress(bigint, jsonb, numeric, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.schedule_daily_broadcast(text, text) TO service_role;
-- ===== 20260919230742_c643b1c4-fd26-42e0-a8b6-1d09dc1791a3.sql =====
create table public.pending_payouts (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null,
  amount numeric not null check (amount > 0),
  reason text not null,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

grant all on public.pending_payouts to service_role;

alter table public.pending_payouts enable row level security;

create policy "No direct client access to pending_payouts"
  on public.pending_payouts for all using (false);

create index pending_payouts_unpaid_idx on public.pending_payouts (created_at) where paid_at is null;
-- ===== 20260919233410_18654890-046a-4a9c-92cf-b835fc9ffd21.sql =====
-- Wipe all user-generated data, keep bans
DELETE FROM public.withdrawals WHERE true;
DELETE FROM public.ton_deposits WHERE true;
DELETE FROM public.pending_payouts WHERE true;
DELETE FROM public.market_listings WHERE true;
DELETE FROM public.market_trades WHERE true;
DELETE FROM public.custom_task_progress WHERE true;
DELETE FROM public.battles WHERE true;
DELETE FROM public.broadcast_sends WHERE true;
DELETE FROM public.broadcast_runs WHERE true;
DELETE FROM public.channel_post_runs WHERE true;

-- keep network fingerprints only for banned accounts
DELETE FROM public.player_ips
WHERE telegram_id NOT IN (SELECT telegram_id FROM public.players WHERE banned);

-- remove every non-banned account
DELETE FROM public.players WHERE banned = false;

-- reset progress of banned accounts but keep the ban
UPDATE public.players
SET state = '{}'::jsonb,
    referred_by = NULL,
    ton_address = NULL,
    memo_tag = NULL,
    trusted = false,
    updated_at = now()
WHERE banned = true;

-- ===== 20260920000456_f5148d64-acf6-4021-a616-3600e174f316.sql =====
UPDATE public.players
SET memo_tag = 'GF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
WHERE memo_tag IS NULL
   OR memo_tag !~ '^GF-[A-F0-9]{12}$';

CREATE UNIQUE INDEX IF NOT EXISTS players_memo_tag_unique
ON public.players (memo_tag)
WHERE memo_tag IS NOT NULL;
-- ===== 20260920001754_7ade30e9-4d22-49ff-a1ad-55f464e32800.sql =====
CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_one_sending_per_player
ON public.withdrawals (telegram_id)
WHERE status = 'sending';
-- ===== 20260920001834_c422089d-4980-4eda-935d-2a5a91ed4f90.sql =====
CREATE OR REPLACE FUNCTION public.process_ton_deposit(
  p_telegram_id bigint,
  p_tx_hash text,
  p_lt bigint,
  p_amount numeric,
  p_memo text,
  p_from_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur jsonb;
  bal numeric;
  nxt numeric;
BEGIN
  IF p_amount <= 0 OR p_tx_hash IS NULL OR length(trim(p_tx_hash)) = 0 THEN
    RAISE EXCEPTION 'invalid deposit';
  END IF;

  INSERT INTO public.ton_deposits (telegram_id, tx_hash, lt, amount, memo, from_address)
  VALUES (p_telegram_id, p_tx_hash, p_lt, p_amount, p_memo, p_from_address)
  ON CONFLICT (tx_hash) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('credited', false);
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = p_telegram_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player not found';
  END IF;

  bal := COALESCE((cur->>'gram')::numeric, 0);
  nxt := round(bal + p_amount, 6);
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(nxt));

  UPDATE public.players
  SET state = cur
  WHERE telegram_id = p_telegram_id;

  RETURN jsonb_build_object('credited', true, 'gram', nxt);
END;
$$;

REVOKE ALL ON FUNCTION public.process_ton_deposit(bigint, text, bigint, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_ton_deposit(bigint, text, bigint, numeric, text, text) TO service_role;
-- ===== 20260920005609_d8e1732f-102e-47e0-b567-8b21516373b5.sql =====
CREATE OR REPLACE FUNCTION public.settle_pending_payout(p_payout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payout public.pending_payouts%ROWTYPE;
  cur jsonb;
  bal numeric;
  nxt numeric;
BEGIN
  SELECT * INTO payout
  FROM public.pending_payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'missing');
  END IF;

  IF payout.paid_at IS NOT NULL THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'already_paid');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE telegram_id = payout.telegram_id AND banned = true
  ) THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'banned');
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = payout.telegram_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.pending_payouts
    SET attempts = attempts + 1, last_error = 'player not found'
    WHERE id = p_payout_id;
    RETURN jsonb_build_object('settled', false, 'reason', 'player_not_found');
  END IF;

  bal := COALESCE((cur->>'gram')::numeric, 0);
  nxt := round(bal + payout.amount, 6);
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(nxt));

  UPDATE public.players
  SET state = cur
  WHERE telegram_id = payout.telegram_id;

  UPDATE public.pending_payouts
  SET paid_at = now(), last_error = NULL
  WHERE id = p_payout_id;

  RETURN jsonb_build_object('settled', true, 'gram', nxt);
EXCEPTION WHEN OTHERS THEN
  UPDATE public.pending_payouts
  SET attempts = attempts + 1, last_error = left(SQLERRM, 500)
  WHERE id = p_payout_id;
  RETURN jsonb_build_object('settled', false, 'reason', 'failed');
END;
$$;

REVOKE ALL ON FUNCTION public.settle_pending_payout(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_pending_payout(uuid) TO service_role;
-- ===== 20260920005753_c225556a-55d3-4608-8275-af04ede3023a.sql =====
CREATE OR REPLACE FUNCTION public.reserve_withdrawal(
  p_telegram_id bigint,
  p_amount numeric,
  p_fee numeric,
  p_net numeric,
  p_to_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur jsonb;
  bal numeric;
  nxt numeric;
  withdrawal_id uuid;
  pack_count integer;
  xp_value numeric;
BEGIN
  IF p_amount <= 0 OR p_fee < 0 OR p_net <= 0 OR round(p_amount - p_fee, 4) <> round(p_net, 4) THEN
    RAISE EXCEPTION 'invalid withdrawal';
  END IF;

  IF p_to_address IS NULL OR length(trim(p_to_address)) = 0 OR length(p_to_address) > 128 THEN
    RAISE EXCEPTION 'invalid withdrawal address';
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = p_telegram_id AND banned = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player unavailable';
  END IF;

  pack_count := greatest(0, floor(COALESCE((cur->>'packsOpened')::numeric, 0)))::integer;
  xp_value := greatest(0, COALESCE((cur->>'xp')::numeric, 0));
  IF least(pack_count, floor(xp_value / 30)::integer) < 1 THEN
    RAISE EXCEPTION 'first pack required';
  END IF;

  bal := COALESCE((cur->>'gram')::numeric, 0);
  nxt := round(bal - p_amount, 6);
  IF nxt < 0 THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  INSERT INTO public.withdrawals (telegram_id, amount, fee, net, to_address, status)
  VALUES (p_telegram_id, p_amount, p_fee, p_net, trim(p_to_address), 'sending')
  RETURNING id INTO withdrawal_id;

  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(nxt));
  UPDATE public.players SET state = cur WHERE telegram_id = p_telegram_id;

  RETURN jsonb_build_object('id', withdrawal_id, 'gram', nxt);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_withdrawal(bigint, numeric, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_withdrawal(bigint, numeric, numeric, numeric, text) TO service_role;
-- ===== 20260920011939_861fbb44-7cdc-4ace-a899-2cd09db6cfd4.sql =====
CREATE TABLE public.pending_card_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL REFERENCES public.players(telegram_id) ON DELETE CASCADE,
  card_id text NOT NULL,
  reason text NOT NULL UNIQUE,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

GRANT ALL ON public.pending_card_deliveries TO service_role;

ALTER TABLE public.pending_card_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to pending card deliveries"
ON public.pending_card_deliveries
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE INDEX pending_card_deliveries_unpaid_idx
ON public.pending_card_deliveries(created_at)
WHERE delivered_at IS NULL;

CREATE OR REPLACE FUNCTION public.settle_pending_card_delivery(p_delivery_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivery public.pending_card_deliveries%ROWTYPE;
  cur jsonb;
  owned jsonb;
  entry jsonb;
  qty integer;
BEGIN
  SELECT * INTO delivery
  FROM public.pending_card_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'missing');
  END IF;

  IF delivery.delivered_at IS NOT NULL THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'already_delivered');
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = delivery.telegram_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.pending_card_deliveries
    SET attempts = attempts + 1, last_error = 'player not found'
    WHERE id = p_delivery_id;
    RETURN jsonb_build_object('settled', false, 'reason', 'player_not_found');
  END IF;

  owned := COALESCE(cur->'owned', '{}'::jsonb);
  entry := owned->delivery.card_id;
  IF entry IS NULL OR jsonb_typeof(entry) <> 'object' THEN
    entry := jsonb_build_object('qty', 1, 'level', 1, 'xp', 0);
  ELSE
    qty := GREATEST(0, COALESCE((entry->>'qty')::integer, 0));
    entry := jsonb_set(entry, '{qty}', to_jsonb(qty + 1));
  END IF;

  owned := jsonb_set(owned, ARRAY[delivery.card_id], entry, true);
  cur := jsonb_set(cur, '{owned}', owned, true);

  UPDATE public.players SET state = cur WHERE telegram_id = delivery.telegram_id;
  UPDATE public.pending_card_deliveries
  SET delivered_at = now(), last_error = NULL
  WHERE id = p_delivery_id;

  RETURN jsonb_build_object('settled', true, 'state', cur);
EXCEPTION WHEN OTHERS THEN
  UPDATE public.pending_card_deliveries
  SET attempts = attempts + 1, last_error = left(SQLERRM, 500)
  WHERE id = p_delivery_id;
  RETURN jsonb_build_object('settled', false, 'reason', 'failed');
END;
$$;

REVOKE ALL ON FUNCTION public.settle_pending_card_delivery(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_pending_card_delivery(uuid) TO service_role;
-- ===== 20260920011956_fb9740aa-f0cf-49a1-87ac-da5753deef24.sql =====
CREATE OR REPLACE FUNCTION public.claim_custom_task_reward(
  p_task_id uuid,
  p_telegram_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_row public.custom_tasks%ROWTYPE;
  progress_row public.custom_task_progress%ROWTYPE;
  cur jsonb;
  bal numeric;
  reward_value numeric;
BEGIN
  SELECT * INTO task_row
  FROM public.custom_tasks
  WHERE id = p_task_id AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task unavailable';
  END IF;

  INSERT INTO public.custom_task_progress (task_id, telegram_id, started_at)
  VALUES (p_task_id, p_telegram_id, now())
  ON CONFLICT (task_id, telegram_id) DO NOTHING;

  SELECT * INTO progress_row
  FROM public.custom_task_progress
  WHERE task_id = p_task_id AND telegram_id = p_telegram_id
  FOR UPDATE;

  IF progress_row.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'reward already claimed';
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = p_telegram_id AND banned = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player unavailable';
  END IF;

  reward_value := round(COALESCE(task_row.reward, 0), 6);
  IF reward_value < 0 OR reward_value > 1000 THEN
    RAISE EXCEPTION 'invalid reward';
  END IF;

  bal := round(COALESCE((cur->>'gram')::numeric, 0) + reward_value, 6);
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(bal), true);

  UPDATE public.players SET state = cur WHERE telegram_id = p_telegram_id;
  UPDATE public.custom_task_progress
  SET claimed_at = now(), updated_at = now()
  WHERE id = progress_row.id;

  RETURN jsonb_build_object('reward', reward_value, 'state', cur);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_custom_task_reward(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_custom_task_reward(uuid, bigint) TO service_role;
-- ===== 20260920012010_a01ea97e-877b-43d8-94d1-aa1f2a485d28.sql =====
CREATE OR REPLACE FUNCTION public.credit_referral_commission(
  p_telegram_id bigint,
  p_level text,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur jsonb;
  ledger jsonb;
  old_amount numeric;
  new_amount numeric;
  bal numeric;
BEGIN
  IF p_level NOT IN ('l1', 'l2', 'l3') THEN
    RAISE EXCEPTION 'invalid referral level';
  END IF;
  IF p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'invalid commission amount';
  END IF;

  SELECT COALESCE(state, '{}'::jsonb) INTO cur
  FROM public.players
  WHERE telegram_id = p_telegram_id AND banned = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player unavailable';
  END IF;

  ledger := COALESCE(cur->'referralEarned', '{"l1":0,"l2":0,"l3":0}'::jsonb);
  old_amount := COALESCE((ledger->>p_level)::numeric, 0);
  new_amount := round(old_amount + p_amount, 6);
  ledger := jsonb_set(ledger, ARRAY[p_level], to_jsonb(new_amount), true);

  bal := round(COALESCE((cur->>'gram')::numeric, 0) + p_amount, 6);
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(bal), true);
  cur := jsonb_set(cur, '{referralEarned}', ledger, true);

  UPDATE public.players SET state = cur WHERE telegram_id = p_telegram_id;
  RETURN cur;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_referral_commission(bigint, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_referral_commission(bigint, text, numeric) TO service_role;
-- ===== 20260920021904_1f9a9925-8139-4b7b-a3e1-20d332210c28.sql =====
DROP TABLE IF EXISTS public.battles;
-- ===== 20260920110015_5adad514-4121-43e0-add9-e8e9906b0a4c.sql =====
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
-- ===== 20260920110325_b0175775-419a-4cbf-b0a4-390bd7e5498f.sql =====
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
-- ===== 20260927014510_a9d65e2a-0a68-40dd-8a20-4ae783cd90c0.sql =====
CREATE OR REPLACE FUNCTION public.reserve_withdrawal(p_telegram_id bigint, p_amount numeric, p_fee numeric, p_net numeric, p_to_address text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur jsonb; bal numeric; nxt numeric; withdrawal_id uuid; pack_count integer; xp_value numeric;
BEGIN
  IF p_amount <= 0 OR p_fee < 0 OR p_net <= 0 OR round(p_amount - p_fee, 4) <> round(p_net, 4) THEN RAISE EXCEPTION 'invalid withdrawal'; END IF;
  IF p_to_address IS NULL OR length(trim(p_to_address)) = 0 OR length(p_to_address) > 128 THEN RAISE EXCEPTION 'invalid withdrawal address'; END IF;
  SELECT COALESCE(state, '{}'::jsonb) INTO cur FROM public.players WHERE telegram_id = p_telegram_id AND banned = false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'player unavailable'; END IF;
  pack_count := greatest(0, floor(COALESCE((cur->>'packsOpened')::numeric, 0)))::integer;
  xp_value := greatest(0, COALESCE((cur->>'xp')::numeric, 0));
  IF least(pack_count, floor(xp_value / 10)::integer) < 1 THEN RAISE EXCEPTION 'first pack required'; END IF;
  bal := COALESCE((cur->>'gram')::numeric, 0);
  nxt := round(bal - p_amount, 6);
  IF nxt < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  INSERT INTO public.withdrawals (telegram_id, amount, fee, net, to_address, status) VALUES (p_telegram_id, p_amount, p_fee, p_net, trim(p_to_address), 'sending') RETURNING id INTO withdrawal_id;
  cur := jsonb_set(cur - 'gram', '{gram}', to_jsonb(nxt));
  UPDATE public.players SET state = cur WHERE telegram_id = p_telegram_id;
  RETURN jsonb_build_object('id', withdrawal_id, 'gram', nxt);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_withdrawal(bigint, numeric, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_withdrawal(bigint, numeric, numeric, numeric, text) TO service_role;
-- ===== 20260928212440_3095ea47-b347-47da-875e-34c147f860f3.sql =====
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
-- ===== 20260928213322_110b90c3-b01b-4c3f-8661-31dd8581d954.sql =====
ALTER TABLE public.referral_tournament_weeks ADD COLUMN IF NOT EXISTS announced_at TIMESTAMP WITH TIME ZONE;
