import type { Rarity } from "@/lib/creatures";

export const rarityText: Record<Rarity, string> = {
  common: "text-common",
  rare: "text-rare",
  epic: "text-epic",
  mythic: "text-mythic",
  legendary: "text-legendary",
};

export const rarityBorder: Record<Rarity, string> = {
  common: "border-common/40",
  rare: "border-rare/40",
  epic: "border-epic/45",
  mythic: "border-mythic/50",
  legendary: "border-legendary/60",
};

export const rarityWash: Record<Rarity, string> = {
  common: "from-common/15",
  rare: "from-rare/20",
  epic: "from-epic/25",
  mythic: "from-mythic/30",
  legendary: "from-legendary/35",
};

export const rarityGlow: Record<Rarity, string> = {
  common: "shadow-[0_0_10px_-6px_var(--common)]",
  rare: "shadow-[0_0_16px_-6px_var(--rare)]",
  epic: "shadow-[0_0_22px_-6px_var(--epic)]",
  mythic: "shadow-[0_0_30px_-6px_var(--mythic)]",
  legendary: "shadow-[0_0_44px_-6px_var(--legendary)]",
};
