import { PACK_ART } from "@/lib/pack-art";
import type { Pack } from "@/lib/packs";

const AURA: Record<string, string> = {
  common: "bg-common/35",
  rare: "bg-rare/40",
  epic: "bg-epic/45",
  mythic: "bg-mythic/50",
  legendary: "bg-legendary/55",
};

export function PackImage({
  pack,
  className = "",
  float = false,
  shine = true,
  eager = false,
}: {
  pack: Pack;
  className?: string;
  float?: boolean;
  shine?: boolean;
  eager?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className={`pointer-events-none absolute inset-4 rounded-full blur-2xl anim-pulse-glow ${AURA[pack.tone]}`}
      />
      <div className={`relative h-full w-full ${float ? "anim-floaty" : ""}`}>
        <img
          src={PACK_ART[pack.id]}
          alt={`${pack.name} booster`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          className="h-full w-full object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.35)]"
        />
        {shine && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-45 sweep-shine" />
          </div>
        )}
      </div>
    </div>
  );
}
