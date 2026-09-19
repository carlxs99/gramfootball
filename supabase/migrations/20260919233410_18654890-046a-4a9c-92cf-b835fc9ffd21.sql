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
