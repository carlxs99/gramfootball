import type { Creature } from "@/lib/creatures";
import { formatGram, levelMultiplier } from "@/lib/economy";
import { CreatureSigil } from "./CreatureSigil";
import { rarityText } from "./rarity";

const FRAME: Record<Creature["rarity"], string> = {
  common: "from-slate-200 via-white to-slate-300",
  rare: "from-sky-200 via-white to-blue-300",
  epic: "from-fuchsia-200 via-white to-violet-300",
  mythic: "from-rose-200 via-white to-pink-300",
  legendary: "from-amber-200 via-yellow-100 to-amber-300",
};

const RING: Record<Creature["rarity"], string> = {
  common: "shadow-[0_8px_18px_-10px_rgba(70,60,140,0.5)]",
  rare: "shadow-[0_10px_22px_-10px_var(--rare)]",
  epic: "shadow-[0_10px_24px_-10px_var(--epic)]",
  mythic: "shadow-[0_12px_26px_-10px_var(--mythic)]",
  legendary: "shadow-[0_14px_30px_-10px_var(--legendary)]",
};

export function CardTile({
  creature,
  owned,
  qty,
  level,
  onClick,
}: {
  creature: Creature;
  owned: boolean;
  qty?: number | undefined;
  level?: number | undefined;
  onClick?: (() => void) | undefined;
}) {
  if (!owned) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative aspect-[0.7] w-full overflow-hidden rounded-lg border border-dashed border-line bg-panel/55 p-1 shadow-sm"
      >
        <div className="h-full w-full overflow-hidden rounded-lg bg-panel2">
          <CreatureSigil creature={creature} hidden />
        </div>
        <span className="absolute inset-0 grid place-items-center text-lg font-bold text-dim/40">
          ?
        </span>
      </button>
    );
  }

  const yieldPerDay = formatGram(creature.dailyGram * levelMultiplier(level ?? 1));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-[0.7] w-full overflow-hidden rounded-lg bg-gradient-to-br p-[3px] text-left transition-transform active:scale-[0.97] ${FRAME[creature.rarity]} ${RING[creature.rarity]}`}
    >
      {creature.rarity === "legendary" ? (
        <span className="holo pointer-events-none absolute inset-0 rounded-xl opacity-25" />
      ) : null}

      {/* Inner card body */}
      <span className="relative flex h-full w-full flex-col overflow-hidden rounded-[5px] bg-panel">
        {/* Name row */}
        <span className="flex items-center justify-between gap-1 px-1.5 py-1">
          <span className={`truncate font-display text-[9px] font-extrabold ${rarityText[creature.rarity]}`}>
            {creature.name}
          </span>
          <span className="shrink-0 text-[7px] font-black text-dim">
            #{String(creature.number).padStart(2, "0")}
          </span>
        </span>

        {/* Art window */}
        <span className="relative mx-1.5 block flex-1 overflow-hidden rounded-[4px] border border-line bg-dark">
          <CreatureSigil creature={creature} />
        </span>

        {/* Footer stats */}
        <span className="flex items-center justify-between px-1.5 py-1.5">
          <span className="text-[7px] font-black uppercase tracking-wider text-dim">
            {creature.rarity}
          </span>
          <span className="text-[7px] font-black text-gram">+{yieldPerDay} G/d</span>
        </span>
      </span>

      {qty && qty > 1 ? (
        <span className="glossy-pill absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-ink">
          x{qty}
        </span>
      ) : null}
    </button>
  );
}
