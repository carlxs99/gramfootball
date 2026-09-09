import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Gift, Loader2 } from "lucide-react";
import { applyServerState } from "@/lib/store";
import { initData, webApp } from "@/lib/telegram";
import { claimCustomTask, listCustomTasks, startCustomTask, type CustomTaskView } from "@/lib/custom-tasks.functions";
import { useT } from "@/lib/i18n";

/** Admin-created tasks: join a channel/group, or open a bot and wait. */
export function CustomTasks() {
  const t = useT();
  const [tasks, setTasks] = useState<CustomTaskView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const reload = useCallback(() => {
    listCustomTasks({ data: { initData: initData() } })
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
    const app = webApp();
    if (app?.openTelegramLink && task.url.startsWith("https://t.me/")) app.openTelegramLink(task.url);
    else window.open(task.url, "_blank", "noopener");
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
      <h2 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-dim">{t("tasks.group.social")}</h2>
      {error ? <p className="mt-2 text-[10px] font-bold text-legend">{error}</p> : null}
      <div className="mt-2 space-y-2">
        {tasks.map((task) => {
          const started = task.startedAt ? Date.parse(task.startedAt) : 0;
          const remaining =
            task.kind === "bot" && started ? Math.max(0, Math.ceil(task.waitSeconds - (now - started) / 1000)) : 0;
          const canClaim = task.kind === "bot" ? Boolean(started) && remaining === 0 : Boolean(started);

          return (
            <article key={task.id} className="soft-card rounded-2xl p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-extrabold">{task.title}</h3>
                  {task.description ? (
                    <p className="mt-0.5 text-[10px] leading-snug text-dim">{task.description}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-sm font-extrabold text-gram">+{task.reward.toFixed(2)}</div>
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
                    <button
                      type="button"
                      onClick={() => void open(task)}
                      className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-panel2 text-[9px] font-extrabold uppercase tracking-wider text-rare transition-transform active:scale-95"
                    >
                      <ExternalLink size={12} aria-hidden="true" /> {t("tasks.open")}
                    </button>
                    <button
                      type="button"
                      disabled={!canClaim || busy === task.id}
                      onClick={() => void claim(task)}
                      className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-dark text-[9px] font-extrabold uppercase tracking-wider text-white transition-transform active:scale-95 disabled:bg-panel2 disabled:text-dim"
                    >
                      {busy === task.id ? (
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Gift size={12} aria-hidden="true" />
                      )}
                      {remaining > 0 ? `${remaining}s` : t("tasks.claim")}
                    </button>
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
