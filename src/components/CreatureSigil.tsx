import type { CollectibleCard } from "@/lib/creatures";
import { sceneFor } from "@/lib/card-scene";
import { CREATURE_ART } from "@/lib/creature-art";

/** Original artwork layered over its own illustrated environment. */
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
        className="relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-b from-panel via-dark2 to-dark"
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
    <div className="creature-art-stage">
      {scene ? (
        <img
          src={scene}
          alt=""
          aria-hidden="true"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          className="creature-art-scene"
        />
      ) : null}
      <span className="creature-art-vignette" aria-hidden="true" />

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
