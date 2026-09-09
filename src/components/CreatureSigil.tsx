import type { CollectibleCard } from "@/lib/creatures";
import { CREATURE_ART } from "@/lib/creature-art";

/** Original creature artwork on a rarity-tinted dark backdrop. */
export function CreatureSigil({
  creature,
  hidden = false,
  eager = false,
}: {
  creature: CollectibleCard;
  hidden?: boolean;
  eager?: boolean;
}) {
  const art = CREATURE_ART[creature.id];

  if (hidden) {
    return (
      <div className="relative grid h-full w-full place-items-center overflow-hidden bg-panel2" aria-label="Undiscovered card">
        <span className="absolute size-3/5 rounded-full bg-ink/5 blur-xl" />
        <span className="relative block size-1/2 rounded-[45%_55%_48%_52%] bg-dim/15 shadow-[0_10px_18px_-10px_var(--dim)]" />
      </div>
    );
  }

  return (
    <div className="creature-sigil relative h-full w-full overflow-hidden">
      {art ? (
        <img
          src={art}
          alt={creature.name}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          width={512}
          height={512}
          className="creature-art-image"
        />
      ) : null}
    </div>
  );
}
