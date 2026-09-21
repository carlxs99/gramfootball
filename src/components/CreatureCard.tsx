import type { CollectibleCard } from "@/lib/creatures";
import { RARITY_LABEL } from "@/lib/creatures";
import { formatGram, levelMultiplier } from "@/lib/economy";
import { useLang } from "@/lib/i18n";
import { cardDescription } from "@/lib/i18n.cards";
import { CardEmblems } from "./CardEmblems";
import { CreatureSigil } from "./CreatureSigil";

import { rarityText } from "./rarity";

const FRAME: Record<CollectibleCard["rarity"], string> = {
  common: "creature-frame-common",
  rare: "creature-frame-rare",
  epic: "creature-frame-epic",
  mythic: "creature-frame-mythic",
  legendary: "creature-frame-legendary",
};

const TIER: Record<CollectibleCard["rarity"], string> = {
  common: "BRONZE",
  rare: "SILVER",
  epic: "GOLD",
  mythic: "ICON",
  legendary: "LEGEND",
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
  const rating = Math.round((creature.stats.atk + creature.stats.def + creature.stats.spd) / 3);
  const daily = formatGram(creature.dailyGram * levelMultiplier(level));
  const position = creature.kind === "creature" ? (creature.position ?? "") : creature.specialty;
  const passing = Math.round((creature.stats.atk + creature.stats.spd) / 2);
  const dribbling = Math.round((creature.stats.atk * 2 + creature.stats.spd) / 3);
  const physical = Math.round((creature.stats.def * 2 + creature.stats.atk) / 3);
  const lang = useLang();
  const initials = creature.name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const description = cardDescription(lang, creature.id, creature.description);


  return (
    <div
      className={`creature-card creature-card-${size} ${FRAME[creature.rarity]} ${isTrainer ? "trainer-card" : ""}`}
      aria-label={`${creature.name}, ${RARITY_LABEL[creature.rarity]}`}
    >
      <div className="creature-card-inner">
        <div className="creature-card-art">
          <CreatureSigil creature={creature} thumbnail={compact} />
          {(creature.rarity === "epic" ||
            creature.rarity === "mythic" ||
            creature.rarity === "legendary") && <span className="creature-card-foil" />}
        </div>
        <div className="creature-card-rating">
          <strong>{rating}</strong>
          <span>{isTrainer ? "DT" : position || "JUG"}</span>
          <CardEmblems id={creature.id} initials={initials} />
        </div>

        <div className="creature-card-identity">
          <strong className="creature-card-name">{creature.name}</strong>
          <span className="creature-card-tier">{TIER[creature.rarity]} · LV.{level}</span>
        </div>
        <div className="creature-card-stats" aria-label="Player attributes">
          <span><b>{creature.stats.spd}</b> RIT</span>
          <span><b>{dribbling}</b> REG</span>
          <span><b>{creature.stats.atk}</b> TIR</span>
          <span><b>{creature.stats.def}</b> DEF</span>
          <span><b>{passing}</b> PAS</span>
          <span><b>{physical}</b> FIS</span>
        </div>
        <div className="creature-card-yield">
          <span className={rarityText[creature.rarity]}>{RARITY_LABEL[creature.rarity]}</span>
          <strong>+{daily} GRAM/D</strong>
        </div>
        {!compact ? <p className="creature-card-description">{description}</p> : null}
        <span className="creature-card-number">#{String(creature.number).padStart(3, "0")}</span>
      </div>

      {creature.rarity === "legendary" ? <span className="creature-card-holo" /> : null}
      {qty && qty > 1 ? <span className="creature-card-qty">×{qty}</span> : null}
      {duplicate ? <span className="creature-card-duplicate">DUPLICATE</span> : null}
    </div>
  );
}
