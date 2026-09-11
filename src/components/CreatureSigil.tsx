import type { CollectibleCard, Rarity } from "@/lib/creatures";
import { CREATURE_ART } from "@/lib/creature-art";
import { sceneFor } from "@/lib/card-scene";

const BACKDROP: Record<Rarity, string> = {
  common: "from-common/20 via-dark2 to-dark",
  rare: "from-rare/25 via-dark2 to-dark",
  epic: "from-epic/30 via-dark2 to-dark",
  mythic: "from-mythic/30 via-dark2 to-dark",
  legendary: "from-legendary/35 via-dark2 to-dark",
};

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
  const scene = sceneFor(creature);

  if (hidden) {
    return (
      <div
        className={`relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-b ${BACKDROP[creature.rarity]}`}
        aria-label="Undiscovered card"
      >
        <span className="absolute size-3/5 rounded-full bg-ink/5 blur-xl" />
        {art ? (
          <img
            src={art}
            alt=""
            loading="lazy"
            decoding="async"
            width={512}
            height={512}
            className="relative z-10 h-[82%] w-[82%] object-contain brightness-0 opacity-55 drop-shadow-[0_8px_12px_var(--ink)]"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-b ${BACKDROP[creature.rarity]}`}
    >
      {scene ? (
        <>
          <img
            src={scene}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover opacity-80"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-dark/40 via-dark/10 to-dark/75" />
        </>
      ) : null}

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-3/5 w-3/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />

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
