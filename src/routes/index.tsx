import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Trophy } from "lucide-react";
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
    <AppShell showBalance={false}>
      <section className="px-5 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-dim">Central command</p>
            <h1 className="mt-1 font-display text-2xl font-bold">Collector overview</h1>
          </div>
          <div className="flex size-10 items-center justify-center rounded-md border border-line bg-panel">
            <span className="size-2 rounded-full bg-gram shadow-[0_0_10px_var(--gram)]" />
          </div>
        </div>
        <YieldVault />
      </section>

      {/* Latest pull */}
      {last && (
        <section className="mt-6 px-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-dim">Latest discovery</h2>
            <span className="font-mono text-[9px] text-dim">#{String(last.number).padStart(3, "0")}</span>
          </div>
          <Link to="/collection" className="flex items-center gap-4 border border-line/70 bg-panel/70 p-3">
            <div className="aspect-square w-16 shrink-0 overflow-hidden rounded-sm border border-line bg-panel2">
              <CreatureSigil creature={last} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-base font-bold">{last.name}</div>
              <div className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${rarityText[last.rarity]}`}>
                {RARITY_LABEL[last.rarity]}
              </div>
              <div className="mt-2 font-mono text-[10px] font-bold text-gram">
                +{formatGram(lastEntry ? creatureYield(last.id, lastEntry) : last.dailyGram)} GRAM / day
              </div>
            </div>
            <ArrowRight size={18} className="text-dim" aria-hidden="true" />
          </Link>
        </section>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 px-5">
        <Link to="/collection" className="border border-line/70 bg-panel/55 p-4">
          <Boxes size={19} className="text-gram" aria-hidden="true" />
          <div className="mt-5 font-mono text-xl font-bold">{stats.percent}%</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-dim">Album complete</div>
        </Link>
        <Link to="/leaderboard" className="border border-line/70 bg-panel/55 p-4">
          <Trophy size={19} className="text-legendary" aria-hidden="true" />
          <div className="mt-5 font-mono text-xl font-bold">TOP 100</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-dim">Global ranking</div>
        </Link>
      </section>
    </AppShell>
  );
}
