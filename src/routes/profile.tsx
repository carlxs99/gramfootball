import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { dailyYield, formatGram } from "@/lib/economy";
import { YieldVault } from "@/components/YieldVault";
import { addGram, collectionScore, collectionStats, playerLevel, setName, usePlayer } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Creature Packs" },
      {
        name: "description",
        content:
          "Your collector profile: level, XP, creatures owned, legendaries, album completion and packs opened.",
      },
      { property: "og:title", content: "Profile — Creature Packs" },
      { property: "og:description", content: "Your Creature Packs collector profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const player = usePlayer();
  const stats = collectionStats(player.owned);
  const level = playerLevel(player.xp);
  const xpInLevel = player.xp % 500;

  const cells = [
    { label: "Cards", value: `${stats.found}/${stats.total}` },
    { label: "Trainers", value: `${stats.trainersFound}/10` },
    { label: "Album", value: `${stats.percent}%` },
    { label: "Packs opened", value: String(player.packsOpened) },
    { label: "Collection score", value: collectionScore(player.owned).toLocaleString() },
    { label: "GRAM", value: player.gram.toFixed(2) },
    { label: "GRAM / day", value: formatGram(dailyYield(player.owned)) },
    { label: "Total mined", value: formatGram(player.totalEarned) },
  ];

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <h1 className="font-display text-2xl font-extrabold leading-none tracking-tight">Profile</h1>
      </div>

      <div className="px-5 pt-5">
        <div className="rounded-3xl border border-line bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="holo absolute -inset-0.5 rounded-full opacity-80" />
              <div className="relative grid size-16 place-items-center rounded-full bg-dark font-display text-xl font-extrabold text-white">
                {player.name.slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0">
              <input
                value={player.name}
                onChange={(e) => setName(e.target.value.slice(0, 18))}
                className="w-full bg-transparent font-display text-xl font-extrabold outline-none"
                aria-label="Player name"
              />
              <div className="text-[9px] font-bold uppercase tracking-widest text-dim">
                ID {player.playerId} · Telegram avatar syncs once connected
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-dim">
              <span>Level {level}</span>
              <span>{xpInLevel}/500 XP</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gram via-epic to-mythic"
                style={{ width: `${(xpInLevel / 500) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-5 pt-4">
        {cells.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-panel p-3 shadow-sm">
            <div className="text-[9px] font-bold uppercase tracking-widest text-dim">{c.label}</div>
            <div className="mt-1 font-display text-lg font-extrabold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="px-5 pt-4">
        <YieldVault />
      </div>

      <div className="px-5 pt-5">
        <div className="rounded-3xl border border-gram/30 bg-gram/5 p-4">
          <div className="font-display text-sm font-bold">Top up GRAM</div>
          <p className="mt-1 text-[9px] leading-relaxed text-dim">
            Telegram / on-chain checkout is not wired yet. Until then you can add test GRAM to try
            the packs.
          </p>
          <button
            type="button"
            onClick={() => addGram(10)}
            className="mt-3 w-full rounded-2xl bg-ink py-3 font-display text-sm font-bold uppercase tracking-widest text-panel"
          >
            +10 test GRAM
          </button>
        </div>
      </div>
    </AppShell>
  );
}
