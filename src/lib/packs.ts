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
    id: "single",
    name: "Single Pack",
    price: 0.25,
    cards: 1,
    tone: "common",
    tagline: "One card, one chance.",
    // single-card entry pack: tuned so the average pull returns its 0.25 GRAM
    // price in ~45 days (1.5 months) at level 1, with duplicates and levels
    // accelerating that for active collectors.
    odds: { common: 81, rare: 15.8, epic: 2.9, mythic: 0.3, legendary: 0 },
  },
  {
    id: "basic",
    name: "Kick-Off Pack",
    price: 0.5,
    cards: 3,
    tone: "common",
    tagline: "Where every squad starts.",
    // common-dominant: mostly Common, a sprinkle of better pulls.
    odds: { common: 86.6, rare: 10.4, epic: 2.7, mythic: 0.3, legendary: 0 },
  },
  {
    id: "rookie",
    name: "Academy Pack",
    price: 1,
    cards: 3,
    tone: "rare",
    tagline: "Your first real signings.",
    // still common-heavy but a notably better Rare/Epic shot than Basic.
    odds: { common: 72.6, rare: 20.9, epic: 5.6, mythic: 0.8, legendary: 0.1 },
  },
  {
    id: "premium",
    name: "League Pack",
    price: 3,
    cards: 4,
    tone: "rare",
    tagline: "Better shirts, better odds.",
    // rare-dominant: Rare is the single most likely tier.
    odds: { common: 38.5, rare: 44.7, epic: 13.9, mythic: 2.5, legendary: 0.4 },
  },
  {
    id: "elite",
    name: "Derby Pack",
    price: 5,
    cards: 4,
    tone: "epic",
    tagline: "A serious step up the table.",
    // sits between Premium and Epic: Rare-led with a real Epic shot.
    odds: { common: 28, rare: 38, epic: 28, mythic: 5, legendary: 1 },
  },
  {
    id: "epic",
    name: "Gold Pack",
    price: 7,
    cards: 5,
    tone: "epic",
    tagline: "Gold players lead this pack.",
    // epic-dominant: Epic is the single most likely tier.
    odds: { common: 28.7, rare: 27, epic: 37.8, mythic: 5.3, legendary: 1.2 },
  },
  {
    id: "mythic",
    name: "Icon Pack",
    price: 16,
    cards: 6,
    tone: "mythic",
    tagline: "Icons lead the pull.",
    // mythic-dominant: Mythic is the single most likely tier.
    odds: { common: 25.9, rare: 22.1, epic: 24.7, mythic: 25, legendary: 2.3 },
  },
  {
    id: "ascendant",
    name: "Champions Night Pack",
    price: 24,
    cards: 6,
    tone: "mythic",
    tagline: "Rising past the icon line.",
    // sits between Mythic and Champion: clearly Mythic-led, with a Legendary
    // shot that lands between Mythic (13% per pack) and Champion (52%).
    odds: { common: 20, rare: 15, epic: 24.2, mythic: 36.6, legendary: 4.2 },
  },
  {
    id: "champion",
    name: "Treble Pack",
    price: 33,
    cards: 7,
    tone: "mythic",
    tagline: "For seasoned managers.",
    // mythic-leaning with a strong Legendary shot, sits between Mythic and Legendary.
    odds: { common: 24, rare: 15, epic: 21, mythic: 30, legendary: 10 },
  },
  {
    id: "legendary",
    name: "Legends Pack",
    price: 55,
    cards: 8,
    tone: "legendary",
    tagline: "Retired legends lead the pull.",
    // legendary-dominant: Legendary is the single most likely tier.
    // Priced higher so it no longer pays back faster than cheaper packs;
    // all tiers now land in a ~30-45 day payback window at level 1.
    odds: { common: 10, rare: 16, epic: 24, mythic: 30, legendary: 20 },
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
