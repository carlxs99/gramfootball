import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CollectibleCard } from "@/lib/creatures";
import { CircleUserRound } from "lucide-react";
import { sceneFor } from "@/lib/card-scene";
import { CREATURE_ART, CREATURE_MEDIUM, CREATURE_THUMBNAILS } from "@/lib/creature-art";

/** Original artwork layered over its own illustrated environment. */
export const CreatureSigil = memo(function CreatureSigil({
  creature,
  hidden = false,
  eager = false,
  thumbnail = false,
  scene: withScene = true,
}: {
  creature: CollectibleCard;
  hidden?: boolean;
  eager?: boolean;
  thumbnail?: boolean;
  scene?: boolean;
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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const art = sources[Math.min(index, sources.length - 1)];
  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [creature.id]);
  // Browsers do not fire onLoad for images already decoded from cache when the
  // element mounts, so read the element state once instead of preloading a copy.
  useEffect(() => {
    if (thumbnail) return;
    const image = imgRef.current;
    if (image?.complete && image.naturalWidth > 0) setLoaded(true);
  }, [art, thumbnail]);
  const scene = withScene ? sceneFor(creature) : undefined;

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

      {/* Low-res version of the same portrait keeps the frame filled while the
          sharper file decodes, so opening a card no longer flashes empty. */}
      {!thumbnail && thumb && art !== thumb ? (
        <img
          src={thumb}
          alt=""
          aria-hidden="true"
          decoding="async"
          width={320}
          height={480}
          className={`creature-art-image creature-art-image-loaded creature-art-preview ${loaded ? "creature-art-preview-done" : ""}`}
        />
      ) : null}

      {art ? (
        <img
          ref={imgRef}
          src={art}
          alt={creature.name}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          onError={() => setIndex((i) => (i + 1 < sources.length ? i + 1 : i))}
          onLoad={thumbnail ? undefined : () => setLoaded(true)}
          width={thumbnail ? 320 : 640}
          height={thumbnail ? 480 : 960}
          className={`creature-art-image ${thumbnail || loaded ? "creature-art-image-loaded" : ""}`}
        />
      ) : (
        <span className="grid h-full w-full place-items-center">
          <CircleUserRound aria-hidden="true" className="size-2/5 text-ink/25" strokeWidth={1.25} />
        </span>
      )}
    </div>
  );
});
