import type { Rarity } from "./creatures";

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
    odds: { common: 70, rare: 23, epic: 6, mythic: 0.9, legendary: 0.1 },
  },
  {
    id: "premium",
    name: "Premium Pack",
    price: 3,
    cards: 4,
    tone: "rare",
    tagline: "Better foil, better odds.",
    odds: { common: 50, rare: 32, epic: 14, mythic: 3.5, legendary: 0.5 },
  },
  {
    id: "epic",
    name: "Epic Pack",
    price: 7,
    cards: 5,
    tone: "epic",
    tagline: "Half the pack is Epic or above.",
    odds: { common: 32, rare: 35, epic: 23, mythic: 8, legendary: 2 },
  },
  {
    id: "mythic",
    name: "Mythic Pack",
    price: 16,
    cards: 6,
    tone: "mythic",
    tagline: "Serious pulls only.",
    odds: { common: 15, rare: 30, epic: 30, mythic: 20, legendary: 5 },
  },
  {
    id: "legendary",
    name: "Legendary Pack",
    price: 35,
    cards: 8,
    tone: "legendary",
    tagline: "15% Legendary on every card.",
    odds: { common: 5, rare: 20, epic: 30, mythic: 30, legendary: 15 },
  },
];

export const PACKS_BY_ID: Record<string, Pack> = Object.fromEntries(PACKS.map((p) => [p.id, p]));
