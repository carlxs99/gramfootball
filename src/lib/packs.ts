import { BY_RARITY, RARITIES, type Rarity } from "./creatures";

export type Pack = {
  id: string;
  name: string;
  price: number;
  cards: number;
  odds: Record<Rarity, number>;
  tone: Rarity;
  tagline: string;
};

export const PACKS: Pack[] = [
  {
    id: "basic",
    name: "Basic Pack",
    price: 1,
    cards: 3,
    tone: "common",
    tagline: "Where every collection starts.",
    // common-dominant: mostly Common, a sprinkle of better pulls.
    odds: { common: 75, rare: 19, epic: 5, mythic: 0.9, legendary: 0.1 },
  },
  {
    id: "premium",
    name: "Premium Pack",
    price: 3,
    cards: 4,
    tone: "rare",
    tagline: "Better foil, better odds.",
    // rare-dominant: Rare is the single most likely tier.
    odds: { common: 38, rare: 45, epic: 14, mythic: 2.5, legendary: 0.5 },
  },
  {
    id: "epic",
    name: "Epic Pack",
    price: 7,
    cards: 5,
    tone: "epic",
    tagline: "Epic is the star of this pack.",
    // epic-dominant: Epic is the single most likely tier.
    odds: { common: 20, rare: 30, epic: 42, mythic: 6.5, legendary: 1.5 },
  },
  {
    id: "mythic",
    name: "Mythic Pack",
    price: 16,
    cards: 6,
    tone: "mythic",
    tagline: "Mythic leads the pull.",
    // mythic-dominant: Mythic is the single most likely tier.
    odds: { common: 12, rare: 25, epic: 28, mythic: 32, legendary: 3 },
  },
  {
    id: "legendary",
    name: "Legendary Pack",
    price: 35,
    cards: 8,
    tone: "legendary",
    tagline: "Legendary leads the pull.",
    // legendary-dominant: Legendary is the single most likely tier.
    // Note: Legendary creatures produce the most GRAM, so this pack pays back
    // faster (~24 days) than the cheaper packs (~30-45 days).
    odds: { common: 15, rare: 18, epic: 20, mythic: 22, legendary: 25 },
  },
];

export const PACKS_BY_ID: Record<string, Pack> = Object.fromEntries(PACKS.map((p) => [p.id, p]));

/**
 * Local pack roll used only by the browser sandbox preview. Real players are
 * always resolved on the server (see game.functions.ts).
 */
export function rollPack(packId: string): string[] {
  const pack = PACKS_BY_ID[packId];
  if (!pack) throw new Error("Unknown pack");
  const rollRarity = (): Rarity => {
    const roll = Math.random() * 100;
    let acc = 0;
    for (const r of RARITIES) {
      acc += pack.odds[r];
      if (roll < acc) return r;
    }
    return "common";
  };
  return Array.from({ length: pack.cards }, () => {
    const pool = BY_RARITY[rollRarity()];
    return pool[Math.floor(Math.random() * pool.length)]!.id;
  });
}
