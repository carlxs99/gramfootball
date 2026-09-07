import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CREATURES_BY_ID, RARITY_LABEL, type Rarity } from "@/lib/creatures";
import type { Pack } from "@/lib/packs";
import { openPack } from "@/lib/packs.functions";
import { applyPack, type PullResult } from "@/lib/store";
import { CreatureSigil } from "./CreatureSigil";
import { rarityBorder, rarityGlow, rarityText, rarityWash } from "./rarity";

type Stage = "sealed" | "ripping" | "reveal" | "summary";

const REVEAL_HOLD: Record<Rarity, number> = {
  common: 550,
  rare: 700,
  epic: 900,
  mythic: 1200,
  legendary: 1700,
};

function Particles({ count = 18, tone }: { count?: number; tone: string }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 9) * 0.22,
        dur: 1.6 + ((i * 13) % 12) / 10,
        size: 2 + (i % 3),
      })),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((p, i) => (
        <span
          key={i}
          className={`absolute bottom-10 rounded-full ${tone}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animation: `spark ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function PackOpening({ pack, onDone }: { pack: Pack; onDone: () => void }) {
  const roll = useServerFn(openPack);
  const [stage, setStage] = useState<Stage>("sealed");
  const [results, setResults] = useState<PullResult[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canAdvance, setCanAdvance] = useState(false);

  const current = results[index];
  const currentCreature = current ? CREATURES_BY_ID[current.creatureId]! : null;

  useEffect(() => {
    if (stage !== "reveal" || !current) return;
    setCanAdvance(false);
    const t = setTimeout(() => setCanAdvance(true), REVEAL_HOLD[current.rarity]);
    return () => clearTimeout(t);
  }, [stage, index, current]);

  async function handleOpen() {
    setStage("ripping");
    try {
      const res = await roll({ data: { packId: pack.id } });
      const applied = applyPack(res.price, res.pulls);
      setResults(applied);
      setTimeout(() => {
        setIndex(0);
        setStage("reveal");
      }, 900);
    } catch {
      setError("The pack could not be opened. Try again.");
      setStage("sealed");
    }
  }

  function next() {
    if (!canAdvance) return;
    if (index + 1 >= results.length) setStage("summary");
    else setIndex((i) => i + 1);
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[520px] flex-col bg-void/98 backdrop-blur-xl">
      {stage !== "reveal" && (
        <button
          type="button"
          onClick={onDone}
          className="absolute right-4 top-4 z-20 font-mono text-[10px] uppercase tracking-widest text-dim"
        >
          Close
        </button>
      )}

      {(stage === "sealed" || stage === "ripping") && (
        <div className="relative flex flex-1 flex-col items-center justify-center px-8">
          <Particles tone="bg-legendary/70" />
          <div className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-gradient-to-br from-legendary/40 via-mythic/40 to-gram/30 blur-3xl anim-pulse-glow" />
            <div
              className={`relative h-64 w-44 overflow-hidden rounded-2xl border border-white/20 ${stage === "ripping" ? "anim-shake" : "anim-floaty"}`}
            >
              <div className="holo absolute inset-0 opacity-90" />
              <div className="absolute inset-[3px] rounded-xl bg-void/70" />
              <div className="absolute inset-0 sweep-shine" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="font-display text-lg font-bold uppercase tracking-widest">
                  {pack.name.replace(" Pack", "")}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-dim">
                  {pack.cards} cards
                </span>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-dim">
            {stage === "ripping" ? "Sealing broken…" : "Sealed and humming"}
          </p>
          {error && <p className="mt-3 text-center text-xs text-mythic">{error}</p>}

          {stage === "sealed" && (
            <button
              type="button"
              onClick={handleOpen}
              className="mt-6 w-full rounded-xl bg-gradient-to-b from-legendary to-mythic py-4 font-display text-base font-bold uppercase tracking-[0.25em] text-void shadow-[0_10px_28px_-10px_var(--mythic)]"
            >
              Open
            </button>
          )}
        </div>
      )}

      {stage === "reveal" && currentCreature && (
        <button
          type="button"
          onClick={next}
          className="relative flex flex-1 flex-col items-center justify-center px-6"
        >
          {current!.rarity !== "common" && (
            <Particles
              count={current!.rarity === "legendary" ? 34 : current!.rarity === "mythic" ? 26 : 16}
              tone={
                current!.rarity === "legendary"
                  ? "bg-legendary"
                  : current!.rarity === "mythic"
                    ? "bg-mythic"
                    : "bg-epic"
              }
            />
          )}
          {(current!.rarity === "mythic" || current!.rarity === "legendary") && (
            <span
              key={`burst-${index}`}
              className={`pointer-events-none absolute h-56 w-56 rounded-full anim-burst ${current!.rarity === "legendary" ? "bg-legendary/40" : "bg-mythic/40"}`}
            />
          )}

          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-dim">
            {index + 1} / {results.length}
          </span>

          <div
            key={index}
            className={`relative mt-4 w-60 rounded-2xl border bg-gradient-to-b to-panel2 p-3 anim-flip ${rarityBorder[current!.rarity]} ${rarityWash[current!.rarity]} ${rarityGlow[current!.rarity]}`}
          >
            {current!.rarity === "legendary" && (
              <div className="holo pointer-events-none absolute -inset-[2px] rounded-2xl opacity-70" />
            )}
            <div className="relative overflow-hidden rounded-xl bg-panel2">
              <CreatureSigil creature={currentCreature} />
              {(current!.rarity === "epic" ||
                current!.rarity === "mythic" ||
                current!.rarity === "legendary") && (
                <div className="pointer-events-none absolute inset-0 sweep-shine" />
              )}
            </div>
            <div className="relative mt-3 flex items-end justify-between">
              <div>
                <div className="font-display text-xl font-bold leading-none">
                  {currentCreature.name}
                </div>
                <div
                  className={`mt-1 font-mono text-[9px] uppercase tracking-widest ${rarityText[current!.rarity]}`}
                >
                  #{String(currentCreature.number).padStart(3, "0")} ·{" "}
                  {RARITY_LABEL[current!.rarity]}
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-dim">
                <div>ATK {currentCreature.stats.atk}</div>
                <div>DEF {currentCreature.stats.def}</div>
              </div>
            </div>
            {current!.duplicate && (
              <span className="chip absolute -top-3 right-3 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold text-mythic">
                DUPLICATE
              </span>
            )}
          </div>

          <span className="mt-8 font-mono text-[9px] uppercase tracking-[0.3em] text-dim">
            {canAdvance ? "Tap to continue" : "…"}
          </span>
        </button>
      )}

      {stage === "summary" && (
        <div className="flex flex-1 flex-col px-5 pt-16">
          <h2 className="font-display text-2xl font-bold">Pack summary</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
            {pack.name} · {results.length} cards · −{pack.price} GRAM
          </p>
          <div className="mt-5 grid grid-cols-4 gap-2.5 overflow-y-auto">
            {results.map((r, i) => {
              const c = CREATURES_BY_ID[r.creatureId]!;
              return (
                <div
                  key={i}
                  className={`relative aspect-3/4 rounded-lg border bg-gradient-to-b to-panel2 p-1 ${rarityBorder[r.rarity]} ${rarityWash[r.rarity]}`}
                >
                  <div className="h-full w-full overflow-hidden rounded bg-panel2">
                    <CreatureSigil creature={c} />
                  </div>
                  <span
                    className={`absolute bottom-1 left-1 font-mono text-[8px] font-bold ${rarityText[r.rarity]}`}
                  >
                    {c.name}
                  </span>
                  {r.duplicate && (
                    <span className="absolute right-1 top-1 font-mono text-[7px] font-bold text-mythic">
                      DUP
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onDone}
            className="mt-auto mb-8 w-full rounded-xl bg-gradient-to-b from-gram to-rare py-4 font-display text-sm font-bold uppercase tracking-[0.25em] text-void"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
