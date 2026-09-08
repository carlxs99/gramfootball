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
      <div className="px-5 pt-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">Your archive</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold leading-none">My cards</h1>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-dim">
            {stats.found} of {stats.total} discovered
          </span>
          <span className="font-display text-xl font-extrabold text-gram">{stats.percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gram via-epic to-mythic"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-[9px] font-bold">
          {RARITIES.map((r) => (
            <div key={r} className="rounded-lg border border-line bg-panel py-1.5">
              <div className={rarityText[r]}>
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
            <span className="text-[9px] font-bold uppercase tracking-widest text-dim">
              {stats.perRarity[r].found}/{stats.perRarity[r].total}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {CREATURES.filter((c) => c.rarity === r).map((c) => (
              <CardTile
                key={c.id}
                creature={c}
                owned={Boolean(player.owned[c.id])}
                qty={player.owned[c.id]?.qty}
                level={player.owned[c.id]?.level}
                onClick={() => player.owned[c.id] && setSelected(c.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {creature && entry && (
        <div
          className="fixed inset-0 z-50 mx-auto flex max-w-[520px] items-end bg-dark/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className={`w-full rounded-t-3xl border-t bg-panel p-5 pb-9 anim-rise ${rarityBorder[creature.rarity]}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div className="w-24 shrink-0 overflow-hidden rounded-xl bg-dark">
                <CreatureSigil creature={creature} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl font-extrabold leading-none">{creature.name}</div>
                <div
                  className={`mt-1 text-[9px] font-bold uppercase tracking-widest ${rarityText[creature.rarity]}`}
                >
                  #{String(creature.number).padStart(3, "0")} · {RARITY_LABEL[creature.rarity]}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-dim">{creature.description}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              <div className="rounded-xl border border-line py-2">
                <div className="text-dim">ATK</div>
                <div className="text-ink">{creature.stats.atk}</div>
              </div>
              <div className="rounded-xl border border-line py-2">
                <div className="text-dim">DEF</div>
                <div className="text-ink">{creature.stats.def}</div>
              </div>
              <div className="rounded-xl border border-line py-2">
                <div className="text-dim">SPD</div>
                <div className="text-ink">{creature.stats.spd}</div>
              </div>
              <div className="rounded-xl border border-line py-2">
                <div className="text-dim">OWNED</div>
                <div className="text-ink">x{entry.qty}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-dim">
                <span>Level {entry.level}</span>
                <span>{entry.xp % 100}/100 XP</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gram to-mythic"
                  style={{ width: `${entry.xp % 100}%` }}
                />
              </div>
              <p className="mt-2 text-[9px] text-dim">
                Duplicates feed this creature's XP and raise its level.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-gram/30 bg-gram/5 px-3 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-dim">
                  Produces · lvl {entry.level} (x{levelMultiplier(entry.level).toFixed(2)})
                </span>
                <span className="font-display text-sm font-bold text-gram">
                  {formatGram(creatureYield(creature.id, entry))} G/day
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-5 w-full rounded-2xl border border-line py-3.5 font-display text-sm font-bold uppercase tracking-widest text-dim"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
