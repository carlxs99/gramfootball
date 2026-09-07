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
        className="relative aspect-3/4 w-full overflow-hidden rounded-lg border border-white/10 bg-panel2"
      >
        <CreatureSigil creature={creature} hidden />
        <span className="absolute inset-0 grid place-items-center font-mono text-lg text-white/20">
          ?
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-3/4 w-full rounded-md border bg-gradient-to-b to-panel2 p-1 text-left ${rarityBorder[creature.rarity]} ${rarityWash[creature.rarity]} ${rarityGlow[creature.rarity]}`}
    >
      <div className="h-full w-full overflow-hidden rounded-sm bg-panel2">
        <CreatureSigil creature={creature} />
      </div>
      <span className="absolute inset-x-1 bottom-1 rounded-sm bg-void/85 px-1.5 py-1 backdrop-blur-sm">
        <span className={`block truncate text-[8px] font-bold ${rarityText[creature.rarity]}`}>
          {creature.name}
        </span>
        <span className="mt-0.5 block font-mono text-[7px] font-bold text-gram">
          +{formatGram(creature.dailyGram * levelMultiplier(level ?? 1))} GRAM/d
        </span>
      </span>
      {qty && qty > 1 ? (
        <span className="chip absolute right-1 top-1 rounded-full px-1.5 font-mono text-[8px] font-bold text-ink">
          x{qty}
        </span>
      ) : null}
    </button>
  );
}
