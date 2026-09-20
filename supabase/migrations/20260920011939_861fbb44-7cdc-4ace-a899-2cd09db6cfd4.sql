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