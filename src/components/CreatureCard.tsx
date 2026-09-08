import type { CollectibleCard } from "@/lib/creatures";
import { RARITY_LABEL } from "@/lib/creatures";
import { formatGram, levelMultiplier } from "@/lib/economy";
import { CreatureSigil } from "./CreatureSigil";
import { rarityText } from "./rarity";

const FRAME: Record<CollectibleCard["rarity"], string> = {
  common: "creature-frame-common",
  rare: "creature-frame-rare",
  epic: "creature-frame-epic",
  mythic: "creature-frame-mythic",
  legendary: "creature-frame-legendary",
};

const TYPE: Record<CollectibleCard["rarity"], string> = {
  common: "EARTH",
  rare: "TIDE",
  epic: "ARCANE",
  mythic: "COSMIC",
  legendary: "PRIMORDIAL",
};

export function CreatureCard({
  creature,
  level = 1,
  qty,
  duplicate = false,
  size = "album",
}: {
  creature: CollectibleCard;
  level?: number;
  qty?: number | undefined;
  duplicate?: boolean;
  size?: "album" | "reveal" | "detail" | "summary";
}) {
  const compact = size === "album" || size === "summary";
  const isTrainer = creature.kind === "trainer";
  const hp = creature.stats.atk + creature.stats.def;
  const daily = formatGram(creature.dailyGram * levelMultiplier(level));

  return (
    <div
      className={`creature-card creature-card-${size} ${FRAME[creature.rarity]} ${isTrainer ? "trainer-card" : ""}`}
      aria-label={`${creature.name}, ${RARITY_LABEL[creature.rarity]}`}
    >
      <div className="creature-card-inner">
        <div className="creature-card-topline" />
        <header className="creature-card-header">
          <span className="creature-card-stage">{isTrainer ? "ALLY" : `LV.${level}`}</span>
          <strong className="creature-card-name">{creature.name}</strong>
           <span className="creature-card-hp"><b>{hp}</b> HP</span>
        </header>

        <div className="creature-card-art">
          <CreatureSigil creature={creature} />
          <span className="creature-card-number">#{String(creature.number).padStart(3, "0")}</span>
          {(creature.rarity === "epic" || creature.rarity === "mythic" || creature.rarity === "legendary") && (
            <span className="creature-card-foil" />
          )}
        </div>

        <div className="creature-card-meta">
          <span className={rarityText[creature.rarity]}>{RARITY_LABEL[creature.rarity]}</span>
          <span>{isTrainer ? "TRAINER CARD" : `${TYPE[creature.rarity]} CREATURE`}</span>
           <span>CP {creature.stats.atk + creature.stats.def + creature.stats.spd}</span>
        </div>

        {!compact ? (
          <div className="creature-card-body">
            <div className="creature-card-ability">
              <span className="creature-card-orb" />
              <div>
                <strong>{isTrainer ? creature.specialty : creature.rarity === "legendary" ? "Ancient Resonance" : "Gram Resonance"}</strong>
                <p>{creature.description}</p>
              </div>
               <b>{creature.stats.atk}</b>
            </div>
            <div className="creature-card-rule" />
             <div className="creature-card-yield"><span>DAILY YIELD</span><strong>+{daily} GRAM</strong></div>
             <footer className="creature-card-footer">
               <span>ATK {creature.stats.atk}</span><span>DEF {creature.stats.def}</span><span>SPD {creature.stats.spd}</span>
             </footer>
          </div>
        ) : (
          <div className="creature-card-compact-footer">
             <span>+{daily} G/d</span>
             <span>{creature.stats.atk} ATK</span>
          </div>
        )}
      </div>

      {creature.rarity === "legendary" ? <span className="creature-card-holo" /> : null}
      {qty && qty > 1 ? <span className="creature-card-qty">×{qty}</span> : null}
      {duplicate ? <span className="creature-card-duplicate">DUPLICATE</span> : null}
    </div>
  );
}