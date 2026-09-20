UPDATE public.players
SET memo_tag = 'GF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
WHERE memo_tag IS NULL
   OR memo_tag !~ '^GF-[A-F0-9]{12}$';

CREATE UNIQUE INDEX IF NOT EXISTS players_memo_tag_unique
ON public.players (memo_tag)
WHERE memo_tag IS NOT NULL;