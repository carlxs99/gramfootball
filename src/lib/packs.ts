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
    price: 0.5,
    cards: 3,
    tone: "common",
    tagline: "Where every collection starts.",
    // common-dominant: mostly Common, a sprinkle of better pulls.
    odds: { common: 75, rare: 19, epic: 5, mythic: 0.9, legendary: 0.1 },
  },
  {
    id: "rookie",
    name: "Rookie Pack",
    price: 1,
    cards: 3,
    tone: "rare",
    tagline: "A bigger first pull.",
    // still common-heavy but a notably better Rare/Epic shot than Basic.
    odds: { common: 60, rare: 30, epic: 8, mythic: 1.6, legendary: 0.4 },
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
    id: "elite",
    name: "Elite Pack",
    price: 5,
    cards: 4,
    tone: "epic",
    tagline: "A serious step up.",
    // sits between Premium and Epic: Rare-led with a real Epic shot.
    odds: { common: 28, rare: 38, epic: 28, mythic: 5, legendary: 1 },
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
    id: "ascendant",
    name: "Ascendant Pack",
    price: 22,
    cards: 6,
    tone: "mythic",
    tagline: "Rising past the mythic line.",
    // sits between Mythic and Champion: stronger Mythic and Legendary shots.
    odds: { common: 10, rare: 20, epic: 26, mythic: 35, legendary: 9 },
  },
  {
    id: "champion",
    name: "Champion Pack",
    price: 30,
    cards: 7,
    tone: "mythic",
    tagline: "For seasoned hunters.",
    // mythic-leaning with a strong Legendary shot, sits between Mythic and Legendary.
    odds: { common: 8, rare: 16, epic: 24, mythic: 38, legendary: 14 },
  },
  {
    id: "legendary",
    name: "Legendary Pack",
    price: 50,
    cards: 8,
    tone: "legendary",
    tagline: "Legendary leads the pull.",
    // legendary-dominant: Legendary is the single most likely tier.
    // Priced higher so it no longer pays back faster than cheaper packs;
    // all tiers now land in a ~30-45 day payback window at level 1.
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
