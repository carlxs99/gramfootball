import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CardTile } from "@/components/CardTile";
import { OddsTable } from "@/components/OddsTable";
import { CreatureSigil } from "@/components/CreatureSigil";
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
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.25em] text-dim">
          <span>Collection</span>
          <span>
            {stats.found} / {stats.total} · {stats.percent}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gram via-epic to-mythic transition-[width] duration-500"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>

      <section className="px-5 pt-5">
        <div className="relative">
          <div className="pointer-events-none absolute -inset-4 rounded-[28px] bg-gradient-to-br from-legendary/40 via-mythic/30 to-gram/20 blur-2xl anim-pulse-glow" />
          <div className="relative rounded-[22px] border border-legendary/40 bg-panel p-4 shadow-[inset_0_1px_0_#ffffff1f]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-legendary">
                Featured · Legendary
              </span>
              <span className="chip rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-legendary">
                {featured.cards}
              </span>
            </div>
            <div className="mt-3 rounded-[16px] border border-white/10 bg-panel2 p-3">
              <div className="relative overflow-hidden rounded-[12px]">
                <div className="holo pointer-events-none absolute inset-0 opacity-90" />
                <div className="relative aspect-3/4">
                  <div className="absolute inset-[3px] overflow-hidden rounded-[10px]">
                    <CreatureSigil creature={CREATURES_BY_ID["aetherion"]!} />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 sweep-shine" />
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="font-display text-xl font-bold leading-none">Aetherion</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-dim">
                    #027 · Legendary
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-dim">
                  <div>ATK 174</div>
                  <div>DEF 158</div>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <OddsTable pack={featured} />
            </div>
            <Link
              to="/packs"
              className="mt-3 block w-full rounded-xl bg-gradient-to-b from-legendary to-mythic py-3 text-center font-display text-sm font-bold uppercase tracking-widest text-void shadow-[0_8px_22px_-8px_var(--mythic)]"
            >
              Open Pack · {featured.price} GRAM
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold tracking-tight">Choose your pack</span>
          <Link to="/packs" className="font-mono text-[9px] uppercase tracking-widest text-gram">
            Odds
          </Link>
        </div>
        <div className="mt-3 -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
          {PACKS.map((p) => (
            <Link
              key={p.id}
              to="/packs"
              className={`shrink-0 rounded-xl border bg-panel px-3 py-2.5 text-left ${rarityBorder[p.tone]}`}
            >
              <div className={`font-display text-xs font-bold uppercase ${rarityText[p.tone]}`}>
                {p.name}
              </div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-dim">
                {p.cards} cards
              </div>
              <div className="mt-1 font-mono text-[11px] font-bold text-gram">{p.price} GRAM</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 pt-6">

        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold tracking-tight">Latest drop</span>
          <Link to="/packs" className="font-mono text-[9px] uppercase tracking-widest text-gram">
            All packs
          </Link>
        </div>
        {last ? (
          <div className="mt-3 flex gap-3">
            <div className="relative w-16 shrink-0">
              <div className="pointer-events-none absolute -inset-1 rounded-xl bg-epic/40 blur-md" />
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
              <p className="mt-1 text-[11px] leading-snug text-dim">{last.description}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] leading-snug text-dim">
            No pulls yet. Rip your first pack and this is where it lands.
          </p>
        )}
      </section>

      <section className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold tracking-tight">Your collection</span>
          <Link
            to="/collection"
            className="font-mono text-[9px] uppercase tracking-[0.25em] text-dim"
          >
            {stats.found} known
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2.5">
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
