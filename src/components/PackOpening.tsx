import { useEffect, useMemo, useState } from "react";
import { CARDS_BY_ID, type Rarity } from "@/lib/creatures";
import type { Pack } from "@/lib/packs";
import { purchasePack, type PullResult } from "@/lib/store";
import { CreatureCard } from "./CreatureCard";
import { PackImage } from "./PackImage";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  const [stage, setStage] = useState<Stage>("sealed");
  const [results, setResults] = useState<PullResult[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canAdvance, setCanAdvance] = useState(false);

  const current = results[index];
  const currentCreature = current ? CARDS_BY_ID[current.creatureId] : null;

  useEffect(() => {
    if (stage !== "reveal" || !current) return;
    setCanAdvance(false);
    const t = setTimeout(() => setCanAdvance(true), REVEAL_HOLD[current.rarity]);
    return () => clearTimeout(t);
  }, [stage, index, current]);

  async function handleOpen() {
    setStage("ripping");
    try {
      const applied = await purchasePack(pack.id, pack.price);
      setResults(applied);
      setTimeout(() => {
        setIndex(0);
        setStage("reveal");
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("open.error"));
      setStage("sealed");
    }
  }

  function next() {
    if (!canAdvance) return;
    if (index + 1 >= results.length) setStage("summary");
    else setIndex((i) => i + 1);
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[520px] flex-col overflow-y-auto bg-dark/98 backdrop-blur-xl">
      {stage !== "reveal" && (
        <button
          type="button"
          onClick={onDone}
          className="absolute right-4 top-4 z-20 text-[10px] font-bold uppercase tracking-widest text-white/50"
        >
          {t("common.close")}
        </button>
      )}

      {(stage === "sealed" || stage === "ripping") && (
        <div className="relative flex min-h-full flex-1 flex-col items-center justify-center px-6 py-[max(env(safe-area-inset-top),24px)]">
          <Particles tone="bg-legendary/70" />
          <div className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-gradient-to-br from-legendary/40 via-mythic/40 to-gram/30 blur-3xl anim-pulse-glow" />
            <div className={stage === "ripping" ? "anim-shake" : ""}>
              <PackImage
                pack={pack}
                className="h-[min(16rem,42dvh)] w-44"
                float={stage === "sealed"}
                eager
              />
            </div>
            <div className="mt-3 text-center">
              <div className="font-display text-lg font-extrabold uppercase tracking-widest text-white">
                {pack.name.replace(" Pack", "")}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
                {pack.cards} {t("common.cards")}
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
            {stage === "ripping" ? t("open.ripping") : t("open.sealed")}
          </p>
          {error && <p className="mt-3 text-center text-xs text-mythic">{error}</p>}

          {stage === "sealed" && (
            <button
              type="button"
              onClick={handleOpen}
              className="mt-6 w-full rounded-2xl bg-gradient-to-b from-legendary to-mythic py-4 font-display text-base font-bold uppercase tracking-[0.25em] text-dark shadow-[0_10px_28px_-10px_var(--mythic)]"
            >
              {t("open.open")}
            </button>
          )}
        </div>
      )}

      {stage === "reveal" && currentCreature && (
        <button
          type="button"
          onClick={next}
          className="relative flex min-h-full flex-1 flex-col items-center justify-center px-5 py-6"
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

          <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/40">
            {index + 1} / {results.length}
          </span>

          <div key={index} className="relative mt-4 aspect-[0.7] w-[min(16rem,74vw)] anim-flip">
            <CreatureCard
              creature={currentCreature}
              level={current!.level}
              duplicate={current!.duplicate}
              size="reveal"
            />
          </div>

          <span className="mt-8 text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
            {canAdvance ? t("open.tap") : "…"}
          </span>
        </button>
      )}

      {stage === "summary" && (
        <div className="flex min-h-full flex-1 flex-col px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-[max(env(safe-area-inset-top),56px)]">
          <h2 className="font-display text-2xl font-extrabold text-white">{t("open.summary")}</h2>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
            {pack.name} · {results.length} {t("common.cards")} · −{pack.price} GRAM
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {results.map((r, i) => {
              const c = CARDS_BY_ID[r.creatureId];
              if (!c) return null;
              return (
                <div key={i} className="relative aspect-[0.7]">
                  <CreatureCard
                    creature={c}
                    level={r.level}
                    duplicate={r.duplicate}
                    size="summary"
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onDone}
            className="mt-6 w-full shrink-0 rounded-2xl bg-primary py-4 font-display text-sm font-bold uppercase tracking-[0.25em] text-primary-foreground transition-transform active:scale-[0.98]"
          >
            {t("open.continue")}
          </button>
        </div>
      )}
    </div>
  );
}
