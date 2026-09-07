import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { collectionScore, collectionStats, playerLevel, usePlayer } from "@/lib/store";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Creature Packs" },
      {
        name: "description",
        content:
          "Top 100 collectors ranked by collection score, legendaries owned, total creatures and player level.",
      },
      { property: "og:title", content: "Leaderboard — Creature Packs" },
      { property: "og:description", content: "Top 100 collectors of Creature Packs." },
    ],
  }),
  component: LeaderboardPage,
});

const CATEGORIES = [
  { id: "score", label: "🏆 Score" },
  { id: "legendary", label: "👑 Legendary" },
  { id: "creatures", label: "🔥 Creatures" },
  { id: "level", label: "⭐ Level" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const NAMES = [
  "Nova","Kryo","Sable","Orin","Vex","Lyra","Onyx","Mira","Cass","Rune","Zeph","Iris","Dax","Nyx",
  "Ember","Talon","Juno","Sol","Vail","Wren","Kai","Pyx","Astra","Rex","Halo","Dune","Echo","Fern",
  "Gale","Hex",
];

type Row = { name: string; score: number; legendary: number; creatures: number; level: number };

function seededRows(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < 100; i++) {
    const base = 100 - i;
    rows.push({
      name: `${NAMES[i % NAMES.length]}${((i * 7) % 90) + 10}`,
      score: base * 92 + ((i * 37) % 80),
      legendary: Math.max(0, Math.floor(base / 14)),
      creatures: Math.min(30, Math.max(1, Math.floor(base / 3.2))),
      level: Math.max(1, Math.floor(base / 4)),
    });
  }
  return rows;
}

export function LeaderboardPage() {
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

  const rows = useMemo(() => {
    const all = [...seededRows(), you];
    const key: Record<CategoryId, keyof Row> = {
      score: "score",
      legendary: "legendary",
      creatures: "creatures",
      level: "level",
    };
    const k = key[category];
    return all.sort((a, b) => (b[k] as number) - (a[k] as number)).slice(0, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, you.score, you.legendary, you.creatures, you.level, player.name]);

  const valueOf = (r: Row) =>
    category === "score"
      ? r.score.toLocaleString()
      : category === "legendary"
        ? `${r.legendary} LEG`
        : category === "creatures"
          ? `${r.creatures}/30`
          : `LVL ${r.level}`;

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <h1 className="font-display text-2xl font-bold leading-none">Leaderboard</h1>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.25em] text-dim">
          Global top 100
        </p>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
              category === c.id ? "chip text-gram" : "border border-white/10 text-dim"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-1.5 px-5">
        {rows.map((r, i) => {
          const isYou = r.name === player.name;
          return (
            <li
              key={`${r.name}-${i}`}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                isYou ? "border-gram/50 bg-gram/10" : "border-white/10 bg-panel/60"
              }`}
            >
              <span className="w-7 shrink-0 font-mono text-[11px] font-bold text-dim">
                {i + 1}
              </span>
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full font-display text-xs font-bold ${
                  i < 3 ? "bg-gradient-to-b from-legendary to-mythic text-void" : "bg-panel2 text-dim"
                }`}
              >
                {r.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
                {r.name}
                {isYou && (
                  <span className="ml-2 font-mono text-[8px] uppercase tracking-widest text-gram">
                    you
                  </span>
                )}
              </span>
              <span className="font-mono text-[11px] font-bold text-gram">{valueOf(r)}</span>
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}
