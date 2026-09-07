import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CardTile } from "@/components/CardTile";
import { CreatureSigil } from "@/components/CreatureSigil";
import { rarityBorder, rarityText, rarityWash } from "@/components/rarity";
import { CREATURES, RARITIES, RARITY_LABEL } from "@/lib/creatures";
import { creatureYield, formatGram, levelMultiplier } from "@/lib/economy";
import { collectionStats, usePlayer } from "@/lib/store";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Collection — Creature Packs" },
      {
        name: "description",
        content:
          "Track every creature you have discovered, see silhouettes of the ones you are missing and level up duplicates.",
      },
      { property: "og:title", content: "Collection — Creature Packs" },
      {
        property: "og:description",
        content: "Your album of 30 original creatures across five rarities.",
      },
    ],
  }),
  component: CollectionPage,
});

function CollectionPage() {
  const player = usePlayer();
  const stats = collectionStats(player.owned);
  const [selected, setSelected] = useState<string | null>(null);
  const creature = CREATURES.find((c) => c.id === selected) ?? null;
  const entry = creature ? player.owned[creature.id] : undefined;

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <h1 className="font-display text-2xl font-bold leading-none">Collection</h1>
        <div className="mt-3 flex items-end justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
            {stats.found} of {stats.total} discovered
          </span>
          <span className="font-display text-xl font-bold text-gram">{stats.percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gram via-epic to-mythic"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5 text-center font-mono text-[9px]">
          {RARITIES.map((r) => (
            <div key={r} className="rounded-lg border border-white/10 bg-panel2/60 py-1.5">
              <div className={`font-bold ${rarityText[r]}`}>
                {stats.perRarity[r].found}/{stats.perRarity[r].total}
              </div>
              <div className="text-dim">{RARITY_LABEL[r].slice(0, 4)}</div>
            </div>
          ))}
        </div>
      </div>

      {RARITIES.map((r) => (
        <section key={r} className="px-5 pt-6">
          <div className="flex items-center justify-between">
            <span className={`font-display text-sm font-bold tracking-tight ${rarityText[r]}`}>
              {RARITY_LABEL[r]}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-dim">
              {stats.perRarity[r].found}/{stats.perRarity[r].total}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {CREATURES.filter((c) => c.rarity === r).map((c) => (
              <CardTile
                key={c.id}
                creature={c}
                owned={Boolean(player.owned[c.id])}
                qty={player.owned[c.id]?.qty}
                onClick={() => player.owned[c.id] && setSelected(c.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {creature && entry && (
        <div
          className="fixed inset-0 z-50 mx-auto flex max-w-[520px] items-end bg-black/70 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className={`w-full rounded-t-3xl border-t bg-gradient-to-b to-panel p-5 pb-9 anim-rise ${rarityBorder[creature.rarity]} ${rarityWash[creature.rarity]}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div className="w-24 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-panel2">
                <CreatureSigil creature={creature} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl font-bold leading-none">{creature.name}</div>
                <div
                  className={`mt-1 font-mono text-[9px] uppercase tracking-widest ${rarityText[creature.rarity]}`}
                >
                  #{String(creature.number).padStart(3, "0")} · {RARITY_LABEL[creature.rarity]}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-dim">{creature.description}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center font-mono text-[10px]">
              <div className="rounded-lg border border-white/10 py-2">
                <div className="text-dim">ATK</div>
                <div className="text-ink">{creature.stats.atk}</div>
              </div>
              <div className="rounded-lg border border-white/10 py-2">
                <div className="text-dim">DEF</div>
                <div className="text-ink">{creature.stats.def}</div>
              </div>
              <div className="rounded-lg border border-white/10 py-2">
                <div className="text-dim">SPD</div>
                <div className="text-ink">{creature.stats.spd}</div>
              </div>
              <div className="rounded-lg border border-white/10 py-2">
                <div className="text-dim">OWNED</div>
                <div className="text-ink">x{entry.qty}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-dim">
                <span>Level {entry.level}</span>
                <span>{entry.xp % 100}/100 XP</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gram to-mythic"
                  style={{ width: `${entry.xp % 100}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-[9px] text-dim">
                Duplicates feed this creature's XP and raise its level.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-gram/30 bg-gram/5 px-3 py-2.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-dim">
                  Produces · lvl {entry.level} (x{levelMultiplier(entry.level).toFixed(2)})
                </span>
                <span className="font-display text-sm font-bold text-gram">
                  {formatGram(creatureYield(creature.id, entry))} GRAM / day
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-5 w-full rounded-xl border border-white/15 py-3.5 font-display text-sm font-bold uppercase tracking-widest text-dim"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
