import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LayoutGrid, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CreatureSigil } from "@/components/CreatureSigil";
import { YieldVault } from "@/components/YieldVault";
import { rarityText } from "@/components/rarity";
import { CREATURES_BY_ID, RARITY_LABEL } from "@/lib/creatures";
import { creatureYield, formatGram } from "@/lib/economy";
import { collectionStats, usePlayer } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Creature Packs — Open packs, collect 30 original creatures" },
      {
        name: "description",
        content:
          "A Telegram mini app where you rip holographic packs with GRAM, pull original creatures across five rarities and complete your album.",
      },
      { property: "og:title", content: "Creature Packs — Collect them all" },
      {
        property: "og:description",
        content: "Rip holographic packs with GRAM and collect 30 original creatures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const player = usePlayer();
  const stats = collectionStats(player.owned);
  const last = player.lastPull ? CREATURES_BY_ID[player.lastPull] : null;
  const lastEntry = last ? player.owned[last.id] : undefined;

  return (
    <AppShell showBalance>
      {/* Featured latest pull — the hero card */}
      {last ? (
        <section className="px-5 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-dim">Latest discovery</h2>
            <span className="text-[9px] font-bold text-dim">#{String(last.number).padStart(3, "0")}</span>
          </div>
          <div className="relative">
            <div className={`pointer-events-none absolute -inset-0.5 rounded-[28px] blur-lg opacity-20 ${rarityText[last.rarity]}`} />
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] bg-gradient-to-b from-dark to-dark2 shadow-2xl">
              <div className="flex items-start justify-between p-5">
                <span className="chip rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: `var(--${last.rarity})` }}>
                  {RARITY_LABEL[last.rarity]}
                </span>
                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase text-white/40">Yield</div>
                  <div className="text-sm font-bold text-yield">
                    +{formatGram(lastEntry ? creatureYield(last.id, lastEntry) : last.dailyGram)} G/day
                  </div>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center px-6">
                <div className="relative w-40">
                  <div className={`pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-30`} style={{ background: `var(--${last.rarity})` }} />
                  <CreatureSigil creature={last} />
                </div>
              </div>
              <div className="px-5 pb-5">
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-white">{last.name}</h3>
                <p className="mt-1 text-[11px] text-white/40">Found in a booster pack</p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="px-5 pt-4">
          <Link
            to="/packs"
            className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-line bg-panel2/50 p-8 text-center"
          >
            <div className="text-sm font-bold text-dim">No creatures yet</div>
            <div className="mt-1 text-[11px] text-dim">Open your first pack to begin collecting</div>
          </Link>
        </section>
      )}

      {/* Claim earnings */}
      <section className="px-5 pt-5">
        <YieldVault />
      </section>

      {/* Quick stats */}
      <section className="mt-5 grid grid-cols-2 gap-3 px-5">
        <Link to="/collection" className="rounded-2xl border border-line bg-panel p-4 shadow-sm transition-transform active:scale-[0.98]">
          <LayoutGrid size={18} className="text-rare" aria-hidden="true" />
          <div className="mt-4 text-xl font-extrabold">{stats.percent}%</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-dim">Album complete</div>
        </Link>
        <Link to="/leaderboard" className="rounded-2xl border border-line bg-panel p-4 shadow-sm transition-transform active:scale-[0.98]">
          <Trophy size={18} className="text-legendary" aria-hidden="true" />
          <div className="mt-4 text-xl font-extrabold">TOP 100</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-dim">Global ranking</div>
        </Link>
      </section>
    </AppShell>
  );
}
