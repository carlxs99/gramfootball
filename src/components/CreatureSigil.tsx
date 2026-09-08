import type { CollectibleCard, Rarity } from "@/lib/creatures";
import { CREATURE_ART } from "@/lib/creature-art";

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

  if (hidden) {
    return (
      <div className="relative grid h-full w-full place-items-center overflow-hidden bg-panel2" aria-label="Undiscovered card">
        <span className="absolute size-3/5 rounded-full bg-ink/5 blur-xl" />
        <span className="relative block size-1/2 rounded-[45%_55%_48%_52%] bg-dim/15 shadow-[0_10px_18px_-10px_var(--dim)]" />
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-b ${BACKDROP[creature.rarity]}`}
    >
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
          className={`relative h-full w-full ${creature.kind === "trainer" ? "object-cover" : "object-contain"} drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]`}
        />
      ) : null}
    </div>
  );
}
