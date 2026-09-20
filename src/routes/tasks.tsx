import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  Check,
  Gift,
  Goal,
  PackageOpen,
  Shirt,
  Trophy,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CustomTasks } from "@/components/CustomTasks";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { claimTask, usePlayer } from "@/lib/store";
import { TASKS, type TaskDef, type TaskGroup, taskState, tasksSummary } from "@/lib/tasks";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — GRAM Football" },
      {
        name: "description",
        content:
          "Complete collector tasks in GRAM Football — open packs, finish the album, build your referral network and claim GRAM rewards.",
      },
      { property: "og:title", content: "Tasks — GRAM Football" },
      { property: "og:description", content: "Collector missions that pay out in GRAM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const GROUPS: TaskGroup[] = ["starter", "collector", "economy", "social"];

function TaskIcon({ task }: { task: TaskDef }) {
  if (task.id.includes("pack")) return <PackageOpen aria-hidden="true" />;
  if (task.id.includes("invite") || task.id.includes("network")) return <Users aria-hidden="true" />;
  if (task.id.includes("legendary")) return <Trophy aria-hidden="true" />;
  if (task.id.includes("claim") || task.id.includes("mined"))
    return <BadgeDollarSign aria-hidden="true" />;
  if (task.id.includes("level")) return <Goal aria-hidden="true" />;
  return <Shirt aria-hidden="true" />;
}

function TasksPage() {
  const t = useT();
  const player = usePlayer();
  const summary = tasksSummary(player);

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
          {t("tasks.missions")}
        </p>
        <h1 className="mt-1 border-l-4 border-primary pl-3 font-display text-2xl font-extrabold uppercase italic leading-none">
          {t("tasks.title")}
        </h1>
      </div>

      <section className="px-5 pt-4">
        <div className="stadium-summary grid grid-cols-3 gap-2 rounded-lg p-3 text-center">
          <div>
            <div className="font-display text-lg font-extrabold text-gram">
              {summary.pending.toFixed(2)}
            </div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-dim">
              {t("tasks.ready")}
            </div>
          </div>
          <div>
            <div className="font-display text-lg font-extrabold">{summary.ready}</div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-dim">
              {t("tasks.completed")}
            </div>
          </div>
          <div>
            <div className="font-display text-lg font-extrabold">
              {summary.claimed}/{summary.total}
            </div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-dim">
              {t("tasks.claimedLabel")}
            </div>
          </div>
        </div>
      </section>

      <CustomTasks />

      {GROUPS.map((group) => {
        const items = TASKS.filter((t) => t.group === group);
        return (
          <section key={group} className="px-5 pt-5">
            <h2 className="flex items-center gap-2 font-display text-[11px] font-extrabold uppercase italic text-dim">
              <span className="h-px w-5 bg-primary" aria-hidden="true" />
              {t(`tasks.group.${group}`)}
            </h2>
            <div className="mt-2 space-y-2">
              {items.map((task) => {
                const s = taskState(task, player);
                return (
                  <article key={task.id} className="stadium-task-card rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className={`task-icon task-icon-${group}`}>
                        <TaskIcon task={task} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-sm font-extrabold uppercase italic leading-tight">
                          {t(`task.${task.id}.title`)}
                        </h3>
                        <p className="mt-0.5 text-[10px] leading-snug text-dim">
                          {t(`task.${task.id}.detail`)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-sm font-extrabold text-gram">
                          +{task.reward.toFixed(2)}
                        </div>
                        <div className="text-[8px] font-bold uppercase tracking-wider text-dim">
                          GRAM
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
                        <div
                          className="h-full rounded-full bg-primary transition-[width]"
                          style={{ width: `${s.percent}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[9px] font-bold text-dim">
                        {Math.min(Math.floor(s.value * 100) / 100, task.goal)}/{task.goal}
                      </span>
                      {s.claimed ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-panel2 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-dim">
                          <Check size={12} aria-hidden="true" /> {t("tasks.claimedLabel")}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!s.done}
                          onClick={() => {
                            void claimTask(task.id);
                          }}
                          className="task-claim-button min-h-8 shrink-0 px-3 text-[9px] font-extrabold uppercase italic"
                        >
                          <Gift size={12} aria-hidden="true" /> {t("tasks.claim")}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}
