import type { CollectibleCard } from "@/lib/creatures";
import { CircleUserRound } from "lucide-react";
import { sceneFor } from "@/lib/card-scene";
import { CREATURE_ART, CREATURE_THUMBNAILS } from "@/lib/creature-art";

/** Original artwork layered over its own illustrated environment. */
export function CreatureSigil({
  creature,
  hidden = false,
  eager = false,
  thumbnail = false,
}: {
  creature: CollectibleCard;
  hidden?: boolean;
  eager?: boolean;
  thumbnail?: boolean;
}) {
  const art = thumbnail
    ? (CREATURE_THUMBNAILS[creature.id] ?? CREATURE_ART[creature.id])
    : CREATURE_ART[creature.id];
  const scene = sceneFor(creature);

  if (hidden) {
    return (
      <div
        className="relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-b from-panel via-dark2 to-dark"
        aria-label="Undiscovered card"
      >
        <span className="absolute size-3/5 rounded-full bg-ink/5 blur-xl" />
        <CircleUserRound
          aria-hidden="true"
          className="relative z-10 size-2/5 text-ink/30"
          strokeWidth={1.25}
        />
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
          width={thumbnail ? 320 : 1280}
          height={thumbnail ? 480 : 1920}
          className="creature-art-image"
        />
      ) : null}
    </div>
  );
}
