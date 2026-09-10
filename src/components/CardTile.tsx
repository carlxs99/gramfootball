import type { CollectibleCard } from "@/lib/creatures";
import { CreatureSigil } from "./CreatureSigil";
import { CreatureCard } from "./CreatureCard";

export function CardTile({
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
        className="relative aspect-[0.7] w-full overflow-hidden rounded-lg border border-dashed border-line bg-panel/55 p-1 shadow-sm"
      >
        <div className="h-full w-full overflow-hidden rounded-lg bg-panel2">
          <CreatureSigil creature={creature} hidden />
        </div>
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
}
