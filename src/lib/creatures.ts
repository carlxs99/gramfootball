export type Rarity = "common" | "rare" | "epic" | "mythic" | "legendary";

export const RARITIES: Rarity[] = ["common", "rare", "epic", "mythic", "legendary"];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  mythic: "Mythic",
  legendary: "Legendary",
};

export const RARITY_XP: Record<Rarity, number> = {
  common: 10,
  rare: 25,
  epic: 60,
  mythic: 150,
  legendary: 400,
};

export type Creature = {
  id: string;
  number: number;
  name: string;
  rarity: Rarity;
  description: string;
  stats: { atk: number; def: number; spd: number };
  /** Base GRAM produced per day at level 1. */
  dailyGram: number;
};

const RAW: Array<[Rarity, string, string, [number, number, number], number]> = [
  ["common", "Spriggo", "A sprout-born wanderer that hums when the soil is happy.", [24, 30, 28], 0.001],
  ["common", "Flamy", "A pocket ember that never quite learned to sit still.", [32, 18, 34], 0.003],
  ["common", "Aquaff", "Breathes bubbles that carry the smell of distant tides.", [26, 28, 30], 0.0015],
  ["common", "Rocko", "Sleeps as a boulder, wakes as a very grumpy boulder.", [30, 40, 14], 0.0005],
  ["common", "Breezi", "Rides thermals and steals unattended hats.", [22, 20, 42], 0.005],
  ["common", "Lumby", "Glows softly enough to read a map by.", [20, 26, 26], 0.0008],
  ["rare", "Thornax", "Its briar mane sharpens with every fight survived.", [48, 46, 34], 0.015],
  ["rare", "Voltrix", "Runs the length of a storm cloud in a single blink.", [52, 32, 58], 0.03],
  ["rare", "Aquarion", "Commands tidepools like a small, patient king.", [44, 52, 38], 0.02],
  ["rare", "Pyron", "Its heartbeat keeps forge fires burning overnight.", [56, 38, 40], 0.04],
  ["rare", "Frostel", "Leaves lace-thin frost sigils wherever it rests.", [40, 54, 42], 0.025],
  ["rare", "Terradon", "Old stone given legs and a stubborn temper.", [50, 60, 26], 0.05],
  ["epic", "Inferion", "Wears a crown of collapsing fire.", [78, 58, 62], 0.1],
  ["epic", "Stormwing", "Rides the stormline and never lands twice.", [72, 56, 84], 0.15],
  ["epic", "Glaciera", "Her breath rewrites the shape of a valley.", [66, 82, 54], 0.08],
  ["epic", "Venomara", "Every scale carries a different poison.", [80, 52, 70], 0.12],
  ["epic", "Solaris", "Carries a fragment of a young sun.", [84, 60, 58], 0.18],
  ["epic", "Abyssor", "Surfaces once a century, briefly.", [76, 78, 48], 0.2],
  ["mythic", "Drakoryn", "Its roar cracks the sky into panes of light.", [112, 96, 88], 0.4],
  ["mythic", "Celestia", "Walks a staircase of stars only she can see.", [98, 104, 102], 0.3],
  ["mythic", "Netherion", "Born from the seam between two worlds.", [118, 88, 94], 0.5],
  ["mythic", "Chronox", "Remembers tomorrow more clearly than today.", [92, 100, 120], 0.6],
  ["mythic", "Titanox", "A mountain that decided to travel.", [124, 126, 54], 0.35],
  ["mythic", "Astralyn", "Trails a comet like a ribbon.", [104, 92, 116], 0.45],
  ["legendary", "Elyndor", "The first creature ever named.", [168, 152, 140], 1.5],
  ["legendary", "Draconis", "Its wings are folded storms.", [186, 148, 132], 1.2],
  ["legendary", "Aetherion", "Made of the light between stars.", [174, 158, 166], 1.8],
  ["legendary", "Volcanox", "Sleeps beneath the oldest caldera.", [192, 170, 108], 1.0],
  ["legendary", "Lunareth", "Pulls the tide with a single glance.", [158, 176, 150], 0.8],
  ["legendary", "Zeraphon", "Said to close the world when it opens its eyes.", [180, 164, 158], 2.0],
];

export const CREATURES: Creature[] = RAW.map(([rarity, name, description, s, dailyGram], i) => ({
  id: name.toLowerCase(),
  number: i + 1,
  name,
  rarity,
  description,
  stats: { atk: s[0], def: s[1], spd: s[2] },
  dailyGram,
}));

export const CREATURES_BY_ID: Record<string, Creature> = Object.fromEntries(
  CREATURES.map((c) => [c.id, c]),
);

export const BY_RARITY: Record<Rarity, Creature[]> = RARITIES.reduce(
  (acc, r) => {
    acc[r] = CREATURES.filter((c) => c.rarity === r);
    return acc;
  },
  {} as Record<Rarity, Creature[]>,
);
