CREATE TABLE public.market_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id bigint NOT NULL,
  seller_name text,
  card_id text NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  buyer_id bigint,
  sold_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX market_listings_status_idx ON public.market_listings (status, created_at DESC);
CREATE INDEX market_listings_seller_idx ON public.market_listings (seller_id, status);

GRANT ALL ON public.market_listings TO service_role;

ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to market listings"
ON public.market_listings FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE TRIGGER market_listings_updated_at
BEFORE UPDATE ON public.market_listings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();