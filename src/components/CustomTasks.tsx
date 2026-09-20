import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Gift, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyServerState } from "@/lib/store";
import { initData, webApp } from "@/lib/telegram";
import {
  claimCustomTask,
  listCustomTasks,
  startCustomTask,
  type CustomTaskView,
} from "@/lib/custom-tasks.functions";
import { useT } from "@/lib/i18n";

/** Admin-created tasks: join a channel/group, or open a bot and wait. */
export function CustomTasks() {
  const t = useT();
  const [tasks, setTasks] = useState<CustomTaskView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const reload = useCallback(() => {
    const data = initData();
    if (!data) {
      setTasks([]);
      return;
    }
    listCustomTasks({ data: { initData: data } })
      .then(setTasks)
      .catch(() => setTasks([]));
  }, []);

  useEffect(reload, [reload]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!tasks || tasks.length === 0) return null;

  const open = async (task: CustomTaskView) => {
    setError("");
    try {
      await startCustomTask({ data: { initData: initData(), taskId: task.id } });
    } catch {
      /* the link still opens */
    }
    let target: URL;
    try {
      target = new URL(task.url);
      if (target.protocol !== "https:") throw new Error("Unsafe task link");
    } catch {
      setError("This task link is not available");
      return;
    }
    const app = webApp();
    if (app?.openTelegramLink && target.hostname === "t.me") app.openTelegramLink(target.href);
    else window.open(target.href, "_blank", "noopener,noreferrer");
    reload();
  };

  const claim = async (task: CustomTaskView) => {
    setBusy(task.id);
    setError("");
    try {
      const res = await claimCustomTask({ data: { initData: initData(), taskId: task.id } });
      applyServerState(res.state);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not claim this reward");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="px-5 pt-5">
      <h2 className="flex items-center gap-2 font-display text-[11px] font-extrabold uppercase italic text-dim">
        <span className="h-px w-5 bg-primary" aria-hidden="true" />
        {t("tasks.group.social")}
      </h2>
      {error ? <p className="mt-2 text-[10px] font-bold text-legend">{error}</p> : null}
      <div className="mt-2 space-y-2">
        {tasks.map((task) => {
          const started = task.startedAt ? Date.parse(task.startedAt) : 0;
          const remaining =
            task.kind === "bot" && started
              ? Math.max(0, Math.ceil(task.waitSeconds - (now - started) / 1000))
              : 0;
          const canClaim =
            task.kind === "bot" ? Boolean(started) && remaining === 0 : Boolean(started);

          return (
            <article key={task.id} className="stadium-task-card rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="task-icon task-icon-social">
                  <Megaphone aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-extrabold uppercase italic leading-tight">{task.title}</h3>
                  {task.description ? (
                    <p className="mt-0.5 text-[10px] leading-snug text-dim">{task.description}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-sm font-extrabold text-gram">
                    +{task.reward.toFixed(2)}
                  </div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-dim">GRAM</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {task.claimed ? (
                  <span className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-panel2 text-[9px] font-extrabold uppercase tracking-wider text-dim">
                    <Check size={12} aria-hidden="true" /> {t("tasks.claimedLabel")}
                  </span>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void open(task)}
                      className="min-h-9 flex-1 text-[9px] font-extrabold uppercase italic text-primary"
                    >
                      <ExternalLink size={12} aria-hidden="true" /> {t("tasks.open")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canClaim || busy === task.id}
                      onClick={() => void claim(task)}
                      className="task-claim-button min-h-9 flex-1 text-[9px] font-extrabold uppercase italic"
                    >
                      {busy === task.id ? (
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Gift size={12} aria-hidden="true" />
                      )}
                      {remaining > 0 ? `${remaining}s` : t("tasks.claim")}
                    </Button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
