import { memo } from "react";
import { CircleUserRound } from "lucide-react";
import type { CollectibleCard } from "@/lib/creatures";
import { RARITY_LABEL } from "@/lib/creatures";
import { CreatureCard } from "./CreatureCard";

export const CardTile = memo(function CardTile({
  creature,
  owned,
  qty,
  level,
  onClick,
}: {
  creature: CollectibleCard;
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
        aria-label={`Undiscovered ${RARITY_LABEL[creature.rarity]} card`}
        className={`album-slot album-slot-${creature.rarity}`}
      >
        <span className="album-slot-shine" aria-hidden="true" />
        <CircleUserRound className="album-slot-fig" strokeWidth={1.1} aria-hidden="true" />
        <span className="album-slot-q" aria-hidden="true">
          ?
        </span>
        <span className="album-slot-tag">{RARITY_LABEL[creature.rarity]}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-[0.7] w-full text-left transition-transform active:scale-[0.97]"
      aria-label={`View ${creature.name} card`}
    >
      <CreatureCard creature={creature} level={level ?? 1} qty={qty} size="album" />
    </button>
  );
}, (previous, next) =>
  previous.creature === next.creature &&
  previous.owned === next.owned &&
  previous.qty === next.qty &&
  previous.level === next.level,
);
