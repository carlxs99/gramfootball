import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OddsTable } from "@/components/OddsTable";
import { PackOpening } from "@/components/PackOpening";
import { PackImage } from "@/components/PackImage";
import { rarityBorder, rarityGlow, rarityText, rarityWash } from "@/components/rarity";
import { PACKS, type Pack } from "@/lib/packs";
import { usePlayer } from "@/lib/store";

export const Route = createFileRoute("/packs")({
  head: () => ({
    meta: [
      { title: "Pack shop — Creature Packs" },
      {
        name: "description",
        content:
          "Five booster packs from 0.5 to 10 GRAM, with the full drop rates shown before every purchase.",
      },
      { property: "og:title", content: "Pack shop — Creature Packs" },
      {
        property: "og:description",
        content: "Five booster packs priced in GRAM with transparent drop rates.",
      },
    ],
  }),
  component: PacksPage,
});

function PacksPage() {
  const player = usePlayer();
  const [selectedId, setSelectedId] = useState(PACKS[1]!.id);
  const [confirming, setConfirming] = useState<Pack | null>(null);
  const [opening, setOpening] = useState<Pack | null>(null);

  const pack = PACKS.find((p) => p.id === selectedId) ?? PACKS[0]!;
  const affordable = confirming ? player.gram >= confirming.price : false;

  return (
    <AppShell>
      <div className="px-4 pt-4">
        <h1 className="font-display text-2xl font-bold leading-none">Pack shop</h1>
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-dim">
          Tap a booster · rolls resolved server-side
        </p>
      </div>

      {/* Booster shelf */}
      <div className="-mx-1 mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2">
        {PACKS.map((p) => {
          const active = p.id === pack.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`min-h-11 shrink-0 snap-center rounded-2xl border p-2 transition-transform ${
                active
                  ? `${rarityBorder[p.tone]} ${rarityGlow[p.tone]} bg-panel scale-100`
                  : "border-white/10 bg-panel/60 scale-95 opacity-70"
              }`}
            >
              <PackImage pack={p} className="h-24 w-16" shine={active} />
              <div
                className={`mt-1 font-mono text-[8px] font-bold uppercase tracking-widest ${active ? rarityText[p.tone] : "text-dim"}`}
              >
                {p.name.replace(" Pack", "")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected booster */}
      <section className="px-4 pt-2">
        <div
          className={`rounded-[24px] border bg-gradient-to-b to-panel p-4 ${rarityBorder[pack.tone]} ${rarityWash[pack.tone]} ${rarityGlow[pack.tone]}`}
        >
          <div className="flex gap-4">
            <PackImage pack={pack} className="h-44 w-28 shrink-0" float eager />
            <div className="min-w-0 flex-1">
              <div className={`font-display text-xl font-bold leading-tight ${rarityText[pack.tone]}`}>
                {pack.name}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-dim">{pack.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="chip rounded-full px-2.5 py-1 font-mono text-[10px] font-bold text-ink">
                  {pack.cards} cards
                </span>
                <span className="chip rounded-full px-2.5 py-1 font-mono text-[10px] font-bold text-gram">
                  {pack.price} GRAM
                </span>
              </div>
              <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
                Legendary {pack.odds.legendary}%
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-dim">
              Drop rates per card
            </p>
            <OddsTable pack={pack} />
          </div>

          <button
            type="button"
            onClick={() => setConfirming(pack)}
            className="mt-4 min-h-12 w-full rounded-xl bg-gradient-to-b from-gram to-rare py-3.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-void active:scale-[0.99]"
          >
            Buy · {pack.price} GRAM
          </button>
        </div>
      </section>

      {/* Compare all */}
      <section className="px-4 pt-6">
        <h2 className="font-display text-sm font-semibold tracking-tight">All boosters</h2>
        <div className="mt-3 space-y-2">
          {PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-panel/70 p-2 text-left ${
                p.id === pack.id ? rarityBorder[p.tone] : "border-white/10"
              }`}
            >
              <PackImage pack={p} className="h-14 w-10 shrink-0" shine={false} />
              <div className="min-w-0 flex-1">
                <div className={`font-display text-sm font-bold ${rarityText[p.tone]}`}>
                  {p.name}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-dim">
                  {p.cards} cards · LEG {p.odds.legendary}%
                </div>
              </div>
              <span className="chip rounded-full px-2.5 py-1 font-mono text-[10px] font-bold text-gram">
                {p.price}
              </span>
            </button>
          ))}
        </div>
      </section>

      {confirming && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[520px] items-end bg-black/70 backdrop-blur-sm">
          <div className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border-t border-white/15 bg-panel p-5 pb-8 anim-rise">
            <div className="flex items-center gap-3">
              <PackImage pack={confirming} className="h-20 w-14 shrink-0" shine={false} />
              <div>
                <div className="font-display text-lg font-bold">Confirm purchase</div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-dim">
                  {confirming.name}
                </div>
              </div>
            </div>
            <dl className="mt-4 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <dt className="text-dim">Cards</dt>
                <dd>{confirming.cards}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dim">Price</dt>
                <dd className="text-gram">{confirming.price} GRAM</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dim">Balance</dt>
                <dd>{player.gram.toFixed(2)} GRAM</dd>
              </div>
            </dl>
            <div className="mt-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-dim">
                Drop rates per card
              </p>
              <OddsTable pack={confirming} />
            </div>
            <p className="mt-3 font-mono text-[9px] leading-relaxed text-dim">
              Payment runs on your GRAM balance. Telegram / on-chain checkout plugs in here later.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="min-h-12 flex-1 rounded-xl border border-white/15 py-3.5 font-display text-sm font-bold uppercase tracking-widest text-dim"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => {
                  const p = confirming;
                  setConfirming(null);
                  setOpening(p);
                }}
                className="min-h-12 flex-1 rounded-xl bg-gradient-to-b from-legendary to-mythic py-3.5 font-display text-sm font-bold uppercase tracking-widest text-void disabled:opacity-40"
              >
                {affordable ? "Pay & open" : "Low GRAM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {opening && <PackOpening pack={opening} onDone={() => setOpening(null)} />}
    </AppShell>
  );
}
