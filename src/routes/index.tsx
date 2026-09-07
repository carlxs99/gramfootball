import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MineCard } from "@/components/MineCard";
import { CardTile } from "@/components/CardTile";
import { CreatureSigil } from "@/components/CreatureSigil";
import { PackImage } from "@/components/PackImage";
import { rarityBorder, rarityText } from "@/components/rarity";
import { CREATURES, CREATURES_BY_ID, RARITY_LABEL } from "@/lib/creatures";
import { PACKS, PACKS_BY_ID } from "@/lib/packs";
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
    ],
  }),
  component: Home,
});

function Home() {
  const player = usePlayer();
  const stats = collectionStats(player.owned);
  const featured = PACKS_BY_ID["legendary"]!;
  const last = player.lastPull ? CREATURES_BY_ID[player.lastPull] : null;

  return (
    <AppShell>
      {/* Progress */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-dim">
          <span>Album</span>
          <span>
            {stats.found}/{stats.total} · {stats.percent}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gram via-epic to-mythic transition-[width] duration-500"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>

      {/* Production */}
      <section className="px-4 pt-5">
        <MineCard compact />
      </section>

      {/* Hero booster */}
      <section className="px-4 pt-5">
        <div className="relative overflow-hidden rounded-[24px] border border-legendary/40 bg-panel p-4 shadow-[inset_0_1px_0_#ffffff1f]">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-legendary/25 blur-3xl" />
          <div className="relative flex flex-col items-center">
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-legendary">
              Featured booster
            </span>
            <PackImage pack={featured} className="mt-2 h-52 w-36" float eager />
            <div className="mt-3 text-center">
              <div className="font-display text-xl font-bold leading-none">{featured.name}</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-dim">
                {featured.cards} cards · Legendary {featured.odds.legendary}%
              </div>
            </div>
            <Link
              to="/packs"
              className="mt-4 min-h-12 w-full rounded-xl bg-gradient-to-b from-legendary to-mythic py-3.5 text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-void shadow-[0_8px_22px_-8px_var(--mythic)]"
            >
              Open pack · {featured.price} GRAM
            </Link>
          </div>
        </div>
      </section>

      {/* Shelf */}
      <section className="pt-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="font-display text-sm font-semibold tracking-tight">Choose your booster</h2>
          <Link to="/packs" className="font-mono text-[9px] uppercase tracking-widest text-gram">
            Shop
          </Link>
        </div>
        <div className="mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1">
          {PACKS.map((p) => (
            <Link
              key={p.id}
              to="/packs"
              className={`w-24 shrink-0 snap-center rounded-2xl border bg-panel p-2 text-center ${rarityBorder[p.tone]}`}
            >
              <PackImage pack={p} className="h-28 w-full" />
              <div className={`mt-1.5 font-display text-[11px] font-bold ${rarityText[p.tone]}`}>
                {p.name.replace(" Pack", "")}
              </div>
              <div className="font-mono text-[10px] font-bold text-gram">{p.price} GRAM</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest pull */}
      <section className="px-4 pt-6">
        <h2 className="font-display text-sm font-semibold tracking-tight">Latest pull</h2>
        {last ? (
          <div className="mt-3 flex gap-3 rounded-2xl border border-white/10 bg-panel/70 p-3">
            <div className="relative w-16 shrink-0">
              <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg border border-white/15 bg-panel2">
                <CreatureSigil creature={last} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="font-display text-base font-bold leading-tight">{last.name}</div>
              <div
                className={`font-mono text-[9px] uppercase tracking-widest ${rarityText[last.rarity]}`}
              >
                #{String(last.number).padStart(3, "0")} · {RARITY_LABEL[last.rarity]}
              </div>
              <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-dim">
                {last.description}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[11px] leading-snug text-dim">
            No pulls yet. Rip your first booster and it lands here.
          </p>
        )}
      </section>

      {/* Album preview */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-tight">Your album</h2>
          <Link to="/collection" className="font-mono text-[9px] uppercase tracking-widest text-gram">
            See all
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {CREATURES.slice(0, 8).map((c) => (
            <CardTile
              key={c.id}
              creature={c}
              owned={Boolean(player.owned[c.id])}
              qty={player.owned[c.id]?.qty}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
