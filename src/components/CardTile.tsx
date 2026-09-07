import type { Creature } from "@/lib/creatures";
import { formatGram, levelMultiplier } from "@/lib/economy";
import { CreatureSigil } from "./CreatureSigil";
import { rarityBorder, rarityGlow, rarityText, rarityWash } from "./rarity";

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
        className="relative aspect-3/4 w-full overflow-hidden rounded-xl border border-dashed border-line bg-panel2/60"
      >
        <CreatureSigil creature={creature} hidden />
        <span className="absolute inset-0 grid place-items-center text-lg font-bold text-dim/40">
          ?
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-3/4 w-full overflow-hidden rounded-xl border bg-panel p-1 text-left shadow-sm transition-transform active:scale-[0.97] ${rarityBorder[creature.rarity]} ${rarityGlow[creature.rarity]}`}
    >
      <div className="h-full w-full overflow-hidden rounded-lg bg-dark">
        <CreatureSigil creature={creature} />
      </div>
      <span className="absolute inset-x-1 bottom-1 rounded-md bg-panel/90 px-1.5 py-1 backdrop-blur-sm">
        <span className={`block truncate text-[8px] font-bold ${rarityText[creature.rarity]}`}>
          {creature.name}
        </span>
        <span className="mt-0.5 block text-[7px] font-bold text-gram">
          +{formatGram(creature.dailyGram * levelMultiplier(level ?? 1))} G/d
        </span>
      </span>
      {qty && qty > 1 ? (
        <span className="chip-light absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-ink">
          x{qty}
        </span>
      ) : null}
    </button>
  );
}
