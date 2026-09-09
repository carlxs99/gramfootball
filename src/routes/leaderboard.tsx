import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { collectionScore, collectionStats, playerLevel, usePlayer } from "@/lib/store";
import { CARDS } from "@/lib/creatures";
import { useT } from "@/lib/i18n";
import { fetchLeaderboard } from "@/lib/player.functions";
import {
  collectionScore as scoreOf,
  collectionStats as statsOf,
  playerLevel as levelOf,
} from "@/lib/progress";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Monsters CCJ" },
      {
        name: "description",
        content:
          "Top 100 collectors ranked by collection score, legendaries owned, total cards and player level.",
      },
      { property: "og:title", content: "Leaderboard — Monsters CCJ" },
      { property: "og:description", content: "Top 100 collectors of Monsters CCJ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const CATEGORIES = [
  { id: "score", emoji: "🏆", accent: "var(--legendary)" },
  { id: "legendary", emoji: "👑", accent: "var(--mythic)" },
  { id: "creatures", emoji: "🔥", accent: "var(--epic)" },
  { id: "level", emoji: "⭐", accent: "var(--rare)" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

type Row = { name: string; score: number; legendary: number; creatures: number; level: number };

const PODIUM = [
  { medal: "🥇", h: "h-24", frame: "var(--legendary)", delay: "0.08s" },
  { medal: "🥈", h: "h-16", frame: "var(--common)", delay: "0s" },
  { medal: "🥉", h: "h-12", frame: "var(--epic)", delay: "0.16s" },
] as const;

function LeaderboardPage() {
  const t = useT();
  const player = usePlayer();
  const [category, setCategory] = useState<CategoryId>("score");
  const stats = collectionStats(player.owned);

  const you: Row = {
    name: player.name,
    score: collectionScore(player.owned),
    legendary: stats.perRarity.legendary.found,
    creatures: stats.found,
    level: playerLevel(player.xp),
  };

  const [live, setLive] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((players) => {
        if (cancelled) return;
        const mapped = players.map((p) => {
          const st = (p.state ?? {}) as {
            owned?: Record<string, { qty: number; level: number; xp: number }>;
            xp?: number;
          };
          const owned = st.owned ?? {};
          const s = statsOf(owned);
          return {
            name: p.name,
            score: scoreOf(owned),
            legendary: s.perRarity.legendary.found,
            creatures: s.found,
            level: levelOf(Number(st.xp ?? 0)),
          } as Row;
        });
        setLive(mapped.filter((r) => r.score > 0));
      })
      .catch(() => setLive([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const all = [...live.filter((r) => r.name !== you.name), you];
    const key: Record<CategoryId, keyof Row> = {
      score: "score",
      legendary: "legendary",
      creatures: "creatures",
      level: "level",
    };
    const k = key[category];
    return all.sort((a, b) => (b[k] as number) - (a[k] as number)).slice(0, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, live, you.score, you.legendary, you.creatures, you.level, player.name]);

  const valueOf = (r: Row) =>
    category === "score"
      ? r.score.toLocaleString()
      : category === "legendary"
        ? `${r.legendary} LEG`
        : category === "creatures"
          ? `${r.creatures}/${CARDS.length}`
          : `LVL ${r.level}`;

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <h1 className="font-display text-2xl font-extrabold leading-none tracking-tight">
          {t("rank.title")}
        </h1>
        <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.25em] text-dim">
          {t("rank.sub")}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 px-5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`min-h-9 min-w-0 rounded-full px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
              category === c.id ? "bg-ink text-panel" : "border border-line text-dim"
            }`}
          >
            {t(`rank.${c.id}`)}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-1.5 px-5">
        {rows.map((r, i) => {
          const isYou = r.name === player.name;
          return (
            <li
              key={`${r.name}-${i}`}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm ${
                isYou ? "border-gram/50 bg-gram/5" : "border-line bg-panel"
              }`}
            >
              <span className="w-7 shrink-0 text-[11px] font-bold text-dim">{i + 1}</span>
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full font-display text-xs font-bold ${
                  i < 3
                    ? "bg-gradient-to-b from-legendary to-mythic text-dark"
                    : "bg-panel2 text-dim"
                }`}
              >
                {r.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-sm font-bold">
                {r.name}
                {isYou && (
                  <span className="ml-2 text-[8px] font-bold uppercase tracking-widest text-gram">
                    {t("rank.you")}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold text-gram">{valueOf(r)}</span>
            </li>
          );
        })}
        {rows.length <= 1 && (
          <li className="rounded-2xl border border-line bg-panel px-3 py-4 text-center text-[11px] font-semibold text-dim">
            {t("rank.empty")}
          </li>
        )}
      </ol>
    </AppShell>
  );
}
