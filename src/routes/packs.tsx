import { useRef, useState } from "react";
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
          "Five booster packs from 1 to 35 GRAM, with the full drop rates shown before every purchase.",
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
  const [drag, setDrag] = useState(0);
  const touch = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const pack = PACKS.find((p) => p.id === selectedId) ?? PACKS[0]!;
  const index = PACKS.findIndex((p) => p.id === pack.id);
  const affordable = confirming ? player.gram >= confirming.price : false;

  const goTo = (i: number) => {
    const next = PACKS[Math.min(PACKS.length - 1, Math.max(0, i))];
    if (next) setSelectedId(next.id);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touch.current = { x: t.clientX, y: t.clientY, active: true };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const start = touch.current;
    if (!t || !start?.active) return;
    const dx = t.clientX - start.x;
    if (Math.abs(dx) > Math.abs(t.clientY - start.y)) {
      setDrag(Math.max(-90, Math.min(90, dx)));
    }
  };
  const onTouchEnd = () => {
    const d = drag;
    setDrag(0);
    touch.current = null;
    if (d <= -40) goTo(index + 1);
    else if (d >= 40) goTo(index - 1);
  };

  return (
    <AppShell>
      <div className="px-5 pt-2 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">Booster selection</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold leading-none">Choose your pack</h1>
      </div>

      {/* Floating booster stage (swipeable) */}
      <section className="relative px-5 pt-3">
        <div className="ice-stage rounded-2xl px-2 pb-4 pt-2">
        <div
          className="relative flex h-64 touch-pan-y items-end justify-center select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          {PACKS.map((p, i) => {
            const offset = i - index + drag / 90;
            if (Math.abs(offset) > 2.4) return null;
            const dist = Math.abs(offset);
            const active = dist < 0.5;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                aria-label={p.name}
                className={`absolute bottom-2 ${drag === 0 ? "transition-all duration-300 ease-out" : ""}`}
                style={{
                  transform: `translateX(${offset * 78}px) scale(${1 - Math.min(dist, 2) * 0.13}) rotate(${offset * 5}deg)`,
                  zIndex: 10 - Math.round(dist),
                  opacity: 1 - Math.min(dist, 2) * 0.22,
                }}
              >
                <PackImage
                  pack={p}
                  className={`h-56 w-36 drop-float ${active && drag === 0 ? "anim-floaty" : ""}`}
                  shine={active}
                  eager={active}
                />
              </button>
            );
          })}
        </div>

        {/* Swipe dots */}
        <div className="mt-1 flex items-center justify-center gap-1.5">
          {PACKS.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-epic" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>
        </div>



        <div className="mt-3 text-center">
          <div className={`font-display text-2xl font-extrabold ${rarityText[pack.tone]}`}>
            {pack.name}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-dim">{pack.tagline}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="glossy-pill rounded-full px-3 py-1.5 text-[10px] font-bold text-ink">
              {pack.cards} cards
            </span>
            <span className="glossy-pill rounded-full px-3 py-1.5 text-[10px] font-bold text-gram">
              {pack.price} GRAM
            </span>
            <span className="glossy-pill rounded-full px-3 py-1.5 text-[10px] font-bold text-legendary">
              LEG {pack.odds.legendary}%
            </span>
          </div>
        </div>

        <div className={`soft-card mt-5 rounded-3xl p-4 ${rarityWash[pack.tone]} ${rarityGlow[pack.tone]} border ${rarityBorder[pack.tone]}`}>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-dim">
            Offering rates per card
          </p>
          <OddsTable pack={pack} />
        </div>

        <button
          type="button"
          onClick={() => setConfirming(pack)}
          className="mt-4 min-h-13 w-full rounded-2xl bg-gradient-to-b from-rare to-yield py-4 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-panel shadow-[0_14px_28px_-12px_var(--rare)] transition-transform active:scale-[0.98]"
        >
          Buy · {pack.price} GRAM
        </button>
      </section>


      {/* Compare all */}
      <section className="px-5 pt-6">
        <h2 className="font-display text-sm font-bold tracking-tight">All boosters</h2>
        <div className="mt-3 space-y-2">
          {PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`soft-card flex min-h-14 w-full items-center gap-3 rounded-2xl border p-2 text-left transition-all ${
                p.id === pack.id ? rarityBorder[p.tone] : "border-line"
              }`}
            >
              <PackImage pack={p} className="h-14 w-10 shrink-0" shine={false} />
              <div className="min-w-0 flex-1">
                <div className={`font-display text-sm font-bold ${rarityText[p.tone]}`}>
                  {p.name}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-dim">
                  {p.cards} cards · LEG {p.odds.legendary}%
                </div>
              </div>
              <span className="glossy-pill rounded-full px-2.5 py-1 text-[10px] font-bold text-gram">
                {p.price}
              </span>
            </button>
          ))}
        </div>
      </section>

      {confirming && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[520px] items-end bg-dark/60 backdrop-blur-sm">
          <div className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border-t border-line bg-panel p-5 pb-8 anim-rise">
            <div className="flex items-center gap-3">
              <PackImage pack={confirming} className="h-20 w-14 shrink-0" shine={false} />
              <div>
                <div className="font-display text-lg font-extrabold">Confirm purchase</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-dim">
                  {confirming.name}
                </div>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-[11px] font-bold">
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
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-dim">
                Drop rates per card
              </p>
              <OddsTable pack={confirming} />
            </div>
            <p className="mt-3 text-[9px] leading-relaxed text-dim">
              Payment runs on your GRAM balance. Telegram / on-chain checkout plugs in here later.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="glossy-pill min-h-12 flex-1 rounded-full py-3.5 font-display text-sm font-bold uppercase tracking-widest text-dim"
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
                className="min-h-12 flex-1 rounded-full bg-gradient-to-b from-rare to-epic py-3.5 font-display text-sm font-bold uppercase tracking-widest text-white disabled:opacity-40"
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
