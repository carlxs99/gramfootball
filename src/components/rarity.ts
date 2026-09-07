import type { Rarity } from "@/lib/creatures";

export const rarityText: Record<Rarity, string> = {
  common: "text-common",
  rare: "text-rare",
  epic: "text-epic",
  mythic: "text-mythic",
  legendary: "text-legendary",
};

export const rarityBorder: Record<Rarity, string> = {
  common: "border-common/30",
  rare: "border-rare/40",
  epic: "border-epic/45",
  mythic: "border-mythic/50",
  legendary: "border-legendary/60",
};

export const rarityWash: Record<Rarity, string> = {
  common: "from-common/8",
  rare: "from-rare/12",
  epic: "from-epic/15",
  mythic: "from-mythic/18",
  legendary: "from-legendary/22",
};

export const rarityGlow: Record<Rarity, string> = {
  common: "shadow-[0_2px_8px_-4px_var(--common)]",
  rare: "shadow-[0_4px_14px_-4px_var(--rare)]",
  epic: "shadow-[0_6px_20px_-4px_var(--epic)]",
  mythic: "shadow-[0_8px_28px_-6px_var(--mythic)]",
  legendary: "shadow-[0_10px_40px_-6px_var(--legendary)]",
};
