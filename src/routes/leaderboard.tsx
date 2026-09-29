import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { usePlayer } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fetchTournament } from "@/lib/player.functions";
import { showAdminEntry } from "@/lib/admin.functions";
import { initData } from "@/lib/telegram";
import { prizeFor } from "@/lib/tournament";
import { Crown, Gift, Package, Timer, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Weekly Referral Cup — GRAM Football" },
      {
        name: "description",
        content:
          "Invite friends every week to climb the Referral Cup. Top 3 win packs, places 4 to 10 win a card.",
      },
      { property: "og:title", content: "Weekly Referral Cup — GRAM Football" },
      { property: "og:description", content: "Top 10 inviters of the week win packs and cards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

type Row = { id: number; name: string; referrals: number; photoUrl: string | null };
type Data = Awaited<ReturnType<typeof fetchTournament>>;

function prizeLabel(place: number, card: string) {
  const p = prizeFor(place);
  if (!p) return null;
  return p.kind === "pack" ? p.name : card;
}

function Avatar({ row, className }: { row: Row; className: string }) {
  const [failed, setFailed] = useState(false);
  if (row.photoUrl && !failed)
    return (
      <img
        src={row.photoUrl}
        alt={row.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} object-cover`}
      />
    );
  return <span className={`${className} grid place-items-center`}>{row.name.slice(0, 1)}</span>;
}

function useCountdown(to: number | null, format: (parts: Record<string, string | number>) => string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!to) return "—";
  const s = Math.max(0, Math.floor((to - now) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return format({
    d,
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(sec).padStart(2, "0"),
  });
}

function LeaderboardPage() {
  const t = useT();
  const player = usePlayer();
  const [data, setData] = useState<Data | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const countdown = useCountdown(data?.endsAt ?? null, (parts) => t("leaderboard.countdown", parts));
  const myId = Number(String(player.playerId).replace(/^\D+/, "")) || 0;

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchTournament()
        .then((d) => alive && setData(d))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 30000);
    const init = initData();
    if (init)
      showAdminEntry({ data: { initData: init } })
        .then((r) => alive && setIsAdmin(r.visible))
        .catch(() => undefined);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const rows: Row[] = data?.rows ?? [];
  const myIndex = useMemo(() => rows.findIndex((r) => r.id === myId), [rows, myId]);
  const me = myIndex >= 0 ? rows[myIndex] : null;
  const podium = rows.slice(0, 3);

  return (
    <AppShell>
      <header className="leaderboard-header px-5 pt-5">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1 bg-primary" aria-hidden="true" />
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase leading-none text-foreground">
              {t("leaderboard.title")}
            </h1>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("leaderboard.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <section className="leaderboard-own mx-5 mt-4 rounded-lg px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Timer className="size-3.5 text-primary" aria-hidden="true" />
            {t("leaderboard.ends")}
          </span>
          <span className="font-display text-sm font-extrabold text-foreground">{countdown}</span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          <Gift className="size-3.5" aria-hidden="true" />
          {t("leaderboard.prizes")}
        </p>
        <ul className="mt-2 grid grid-cols-4 gap-2 text-center">
          {[1, 2, 3].map((p) => (
            <li key={p} className="rounded-md border border-border bg-secondary px-1 py-2">
              <Package className="mx-auto size-4 text-primary" aria-hidden="true" />
              <p className="mt-1 font-display text-xs font-extrabold text-foreground">#{p}</p>
              <p className="text-[9px] font-semibold leading-tight text-muted-foreground">
                {prizeLabel(p, t("leaderboard.bronzeCard"))}
              </p>
            </li>
          ))}
          <li className="rounded-md border border-border bg-secondary px-1 py-2">
            <Trophy className="mx-auto size-4 text-primary" aria-hidden="true" />
            <p className="mt-1 font-display text-xs font-extrabold text-foreground">#4–10</p>
            <p className="text-[9px] font-semibold leading-tight text-muted-foreground">
              {t("leaderboard.bronzeCard")}
            </p>
          </li>
        </ul>
        <p className="mt-2 text-[10px] text-muted-foreground">{t("leaderboard.rule")}</p>
      </section>

      {!isAdmin && (
        <div className="mx-5 mt-3 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-3">
          <span className="w-10 shrink-0 font-display text-base font-extrabold italic text-primary">
            {me ? `#${myIndex + 1}` : "—"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
              {t("leaderboard.yourPosition")}
            </p>
            <p className="truncate text-xs font-semibold uppercase text-foreground">{player.name}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-base font-extrabold text-foreground">{me?.referrals ?? 0}</p>
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-primary">
              {t("leaderboard.referrals")}
            </p>
          </div>
        </div>
      )}

      {podium.length > 0 && (
        <section
          className="leaderboard-podium mx-5 mt-6 px-3 pb-5 pt-7"
          aria-label={t("leaderboard.topThree")}
        >
          <div className="flex items-end justify-center gap-2">
            {[1, 0, 2].map((i) => {
              const r = podium[i];
              if (!r) return <div key={i} className="flex-1" />;
              return (
                <div key={r.id} className="anim-rise flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  {i === 0 ? <Crown className="size-5 text-primary" aria-hidden="true" /> : <span className="h-5" />}
                  <div className="relative">
                    <Avatar
                      row={r}
                      className={`shrink-0 overflow-hidden rounded-full bg-secondary font-display font-bold text-muted-foreground ${
                        i === 0 ? "size-16 text-lg" : "size-12 text-sm"
                      }`}
                    />
                    <span className="leaderboard-place absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 font-display text-[10px] font-extrabold italic">
                      {i + 1}
                    </span>
                  </div>
                  <span className="mt-1 w-full truncate text-center text-[10px] font-semibold uppercase text-foreground">
                    {r.name}
                  </span>
                  <span className="font-display text-xs font-bold text-primary">
                    {r.referrals} {t("leaderboard.referrals")}
                  </span>
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    {prizeLabel(i + 1, t("leaderboard.bronzeCard"))}
                  </span>
                  {r.id === myId && (
                    <span className="text-[8px] font-bold uppercase text-primary">
                      {t("leaderboard.you")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mx-5 mt-4">
        <ol className="divide-y divide-border">
          {rows.slice(3).map((r, i) => {
            const place = i + 4;
            const prize = prizeLabel(place, t("leaderboard.bronzeCard"));
            return (
              <li
                key={r.id}
                className={`grid min-h-12 grid-cols-[2.25rem_2rem_1fr_auto] items-center gap-2 px-2 py-2.5 ${
                  r.id === myId ? "leaderboard-row-you" : "bg-background"
                }`}
              >
                <span className="font-display text-sm font-extrabold italic text-muted-foreground">{place}</span>
                <Avatar
                  row={r}
                  className="size-7 shrink-0 overflow-hidden rounded-full bg-secondary font-display text-[10px] font-bold text-muted-foreground"
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-foreground">{r.name}</span>
                  {prize && <span className="block text-[9px] font-semibold text-primary">{prize}</span>}
                </span>
                <span className="flex items-center gap-1 font-display text-xs font-bold text-primary">
                  <Users className="size-3" aria-hidden="true" />
                  {r.referrals}
                </span>
              </li>
            );
          })}
          {data && rows.length === 0 && (
            <li className="px-3 py-7 text-center text-[11px] font-semibold text-muted-foreground">
              <Trophy className="mx-auto mb-2 size-6 text-primary" aria-hidden="true" />
              {t("leaderboard.empty")}
            </li>
          )}
        </ol>
      </section>

      {data && data.lastWeek.length > 0 && (
        <section className="mx-5 mt-6">
          <h2 className="font-display text-sm font-extrabold uppercase text-foreground">
            {t("leaderboard.lastWeek")}
          </h2>
          <ol className="mt-2 divide-y divide-border rounded-lg border border-border">
            {data.lastWeek.map((w) => (
              <li key={w.place} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="w-6 font-display font-extrabold italic text-primary">#{w.place}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{w.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {prizeLabel(w.place, t("leaderboard.bronzeCard"))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </AppShell>
  );
}
