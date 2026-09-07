import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CreatureSigil } from "@/components/CreatureSigil";
import { PackImage } from "@/components/PackImage";
import { YieldVault } from "@/components/YieldVault";
import { rarityText } from "@/components/rarity";
import { CREATURES_BY_ID, RARITY_LABEL } from "@/lib/creatures";
import { PACKS } from "@/lib/packs";
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
  const [selectedId, setSelectedId] = useState("legendary");
  const featured = PACKS.find((p) => p.id === selectedId) ?? PACKS[0]!;

  return (
    <AppShell>
      {/* Vault dashboard */}
      <section className="px-4 pt-4">
        <YieldVault />
      </section>

      {/* Featured booster */}
      <section className="mt-7 flex flex-col items-center px-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 -m-6 rounded-full bg-gradient-to-tr from-gram/25 via-mythic/25 to-legendary/25 blur-2xl" />
          <PackImage pack={featured} className="relative h-60 w-40" float eager />
        </div>
        <div className="mt-4 text-center">
          <h1 className="font-display text-xl font-bold leading-none">{featured.name}</h1>
          <p
            className={`mt-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.28em] ${rarityText[featured.tone]}`}
          >
            {featured.cards} cards · Legendary {featured.odds.legendary}%
          </p>
        </div>
        <Link
          to="/packs"
          className="mt-5 min-h-12 rounded-full border border-gram/30 bg-gradient-to-r from-gram to-epic px-10 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-void shadow-[0_10px_30px_-12px_var(--gram)] transition-transform active:scale-95"
        >
          Open for {featured.price} GRAM
        </Link>
      </section>

      {/* Booster shelf */}
      <section className="mt-7">
        <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1">
          {PACKS.map((p) => {
            const active = p.id === featured.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-[74px] shrink-0 snap-center rounded-xl border bg-white/5 px-1.5 pb-2 pt-1.5 text-center transition-colors ${
                  active ? "border-gram/60 bg-gram/10" : "border-white/10"
                }`}
              >
                <PackImage pack={p} className="h-16 w-full" />
                <div
                  className={`mt-1.5 font-mono text-[8px] font-bold uppercase tracking-wider ${
                    active ? "text-gram" : "text-dim"
                  }`}
                >
                  {p.name.replace(" Pack", "")}
                </div>
                <div className="font-mono text-[9px] font-bold text-ink">{p.price}G</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Latest pull */}
      {last && (
        <section className="mt-6 px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
            <div className="aspect-3/4 w-11 shrink-0 overflow-hidden rounded-md border border-white/15 bg-panel2">
              <CreatureSigil creature={last} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-dim">
                Latest pull
              </div>
              <div className="mt-0.5 truncate font-display text-sm font-bold">{last.name}</div>
            </div>
            <span
              className={`font-mono text-[9px] font-bold uppercase tracking-widest ${rarityText[last.rarity]}`}
            >
              {RARITY_LABEL[last.rarity]}
            </span>
          </div>
        </section>
      )}

      {/* Album progress */}
      <section className="mt-6 px-4">
        <Link to="/collection" className="block">
          <div className="mb-2.5 flex items-end justify-between">
            <div>
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em]">
                Album progress
              </h2>
              <p className="mt-1 font-mono text-[10px] text-dim">
                {stats.found} / {stats.total} creatures found
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-gram">{stats.percent}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gram to-mythic shadow-[0_0_8px_-1px_var(--gram)] transition-[width] duration-500"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </Link>
      </section>
    </AppShell>
  );
}
