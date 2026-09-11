import type { CollectibleCard } from "@/lib/creatures";

const scenes = import.meta.glob<string>("../assets/scenes/*.webp", {
  eager: true,
  import: "default",
  query: "?url",
});

const SCENE: Record<string, string> = Object.fromEntries(
  Object.entries(scenes).map(([path, url]) => [
    path.split("/").at(-1)?.replace(".webp", "") ?? path,
    url,
  ]),
);

type Biome =
  | "fire"
  | "water"
  | "nature"
  | "storm"
  | "ice"
  | "cosmic"
  | "earth"
  | "shadow"
  | "light"
  | "wind"
  | "arcane"
  | "forge";

/** Keyword buckets, checked in order (most specific first). */
const KEYWORDS: Array<[Biome, string[]]> = [
  ["ice", ["ice", "frost", "glaci", "snow", "frozen", "winter", "chill", "rime", "cryo", "polar"]],
  ["fire", ["fire", "flame", "ember", "lava", "magma", "volcan", "blaze", "burn", "inferno", "pyro", "cinder", "ash", "scorch", "solar", "sun"]],
  ["water", ["water", "ocean", "sea", "wave", "tide", "abyss", "aqua", "coral", "reef", "river", "rain", "deep", "marine", "fish", "kraken", "mist"]],
  ["storm", ["storm", "thunder", "lightning", "volt", "electr", "spark", "shock", "static", "current", "arc"]],
  ["nature", ["forest", "leaf", "leaves", "vine", "root", "seed", "sprout", "bloom", "flower", "moss", "grove", "garden", "petal", "thorn", "bramble", "fern", "wood", "grass", "spore", "jungle", "poison", "venom", "toxic"]],
  ["cosmic", ["star", "cosmos", "cosmic", "astral", "celest", "nebula", "galax", "moon", "lunar", "constellation", "void star", "eclipse", "comet", "orbit", "sky god"]],
  ["earth", ["rock", "stone", "boulder", "mountain", "earth", "quarry", "sand", "desert", "dune", "crystal", "gem", "granite", "titan", "terra", "cave", "canyon"]],
  ["shadow", ["shadow", "dark", "night", "nether", "void", "grim", "phantom", "ghost", "spectre", "specter", "wraith", "curse", "dusk", "gloom", "obsidian", "onyx", "black"]],
  ["light", ["light", "radian", "holy", "dawn", "aurora", "prism", "shine", "glow", "halo", "divine", "bright", "gold"]],
  ["wind", ["wind", "breeze", "gale", "air", "sky", "cloud", "feather", "wing", "flight", "soar", "fly", "gust", "aero", "bird"]],
  ["forge", ["forge", "iron", "steel", "metal", "gear", "machine", "anvil", "hammer", "clock", "chrono", "mech", "armor", "smith", "blade"]],
  ["arcane", ["arcane", "rune", "magic", "spell", "mystic", "sigil", "enchant", "ancient", "ritual", "eldritch", "aether", "ether", "psychic", "mind", "dream"]],
];

const cache = new Map<string, string>();

function detect(card: CollectibleCard): Biome {
  const hay = `${card.name} ${card.description} ${"specialty" in card ? card.specialty : ""}`.toLowerCase();
  for (const [biome, words] of KEYWORDS) {
    if (words.some((w) => hay.includes(w))) return biome;
  }
  return "arcane";
}

/** Full-bleed illustrated scene behind a card's artwork. */
export function sceneFor(card: CollectibleCard): string | undefined {
  const hit = cache.get(card.id);
  if (hit) return hit;
  const url = SCENE[detect(card)];
  if (url) cache.set(card.id, url);
  return url;
}
