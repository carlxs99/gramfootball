import { useEffect, useMemo, useState } from "react";
import type { CollectibleCard } from "@/lib/creatures";
import { CircleUserRound } from "lucide-react";
import { sceneFor } from "@/lib/card-scene";
import { CREATURE_ART, CREATURE_MEDIUM, CREATURE_THUMBNAILS } from "@/lib/creature-art";

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
  const thumb = CREATURE_THUMBNAILS[creature.id];
  const medium = CREATURE_MEDIUM[creature.id];
  const full = CREATURE_ART[creature.id];
  // Ordered fallbacks: if one size is missing or fails to decode we move to the
  // next one instead of leaving an empty card.
  const sources = useMemo(
    () => (thumbnail ? [thumb, medium, full] : [medium, full, thumb]).filter((src): src is string => Boolean(src)),
    [full, medium, thumb, thumbnail],
  );
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setIndex(0);
    const firstSource = sources[0];
    if (!firstSource) {
      setLoaded(false);
      return;
    }
    if (typeof window === "undefined") {
      setLoaded(true);
      return;
    }
    const cached = new window.Image();
    cached.src = firstSource;
    setLoaded(cached.complete);
  }, [creature.id, sources]);
  const art = sources[Math.min(index, sources.length - 1)];
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

      {!thumbnail && thumb ? (
        <img
          src={thumb}
          alt=""
          aria-hidden="true"
          decoding="async"
          width={320}
          height={480}
          className="creature-art-image"
        />
      ) : null}

      {art ? (
        <img
          key={art}
          src={art}
          alt={creature.name}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          onError={() => setIndex((i) => (i + 1 < sources.length ? i + 1 : i))}
          onLoad={() => setLoaded(true)}
          width={thumbnail ? 320 : 640}
          height={thumbnail ? 480 : 960}
          className={`creature-art-image ${loaded ? "creature-art-image-loaded" : ""}`}
        />
      ) : (
        <span className="grid h-full w-full place-items-center">
          <CircleUserRound aria-hidden="true" className="size-2/5 text-ink/25" strokeWidth={1.25} />
        </span>
      )}


    </div>
  );
}
