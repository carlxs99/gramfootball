ALTER TABLE public.broadcast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to broadcast runs"
ON public.broadcast_runs
AS PERMISSIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct client access to broadcast sends"
ON public.broadcast_sends
AS PERMISSIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

GRANT ALL ON public.broadcast_runs TO service_role;
GRANT ALL ON public.broadcast_sends TO service_role;