CREATE TABLE public.custom_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('channel','group','bot')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  url text NOT NULL,
  chat_ref text,
  reward numeric NOT NULL DEFAULT 0 CHECK (reward >= 0),
  wait_seconds integer NOT NULL DEFAULT 15 CHECK (wait_seconds >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.custom_tasks TO service_role;
ALTER TABLE public.custom_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to custom tasks" ON public.custom_tasks
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER custom_tasks_set_updated_at
  BEFORE UPDATE ON public.custom_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.custom_task_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.custom_tasks(id) ON DELETE CASCADE,
  telegram_id bigint NOT NULL,
  started_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, telegram_id)
);

GRANT ALL ON public.custom_task_progress TO service_role;
ALTER TABLE public.custom_task_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to task progress" ON public.custom_task_progress
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER custom_task_progress_set_updated_at
  BEFORE UPDATE ON public.custom_task_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_custom_task_progress_player ON public.custom_task_progress (telegram_id);

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;