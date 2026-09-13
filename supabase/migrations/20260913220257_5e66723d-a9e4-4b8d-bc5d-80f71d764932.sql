ALTER TABLE public.players ADD COLUMN IF NOT EXISTS trusted boolean NOT NULL DEFAULT false;

UPDATE public.players p SET trusted = true
WHERE COALESCE((p.state->>'packsOpened')::int, 0) > 0
   OR EXISTS (SELECT 1 FROM public.ton_deposits d WHERE d.telegram_id = p.telegram_id)
   OR EXISTS (SELECT 1 FROM public.withdrawals w WHERE w.telegram_id = p.telegram_id);