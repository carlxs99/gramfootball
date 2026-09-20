CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_one_sending_per_player
ON public.withdrawals (telegram_id)
WHERE status = 'sending';