/**
 * Nationality grouping for card emblems.
 *
 * Display names in football-cards.ts are written region by region. This module
 * records which region every card belongs to so the flag drawn on the card
 * matches the origin of its name instead of being picked at random.
 *
 * Flag palettes stay fictional (no real federation flag is reproduced) except
 * for the East Asian regions, where CardEmblems draws a recognisable flag.
 */

export type CardRegion =
  | "iberia-latam"
  | "west-africa"
  | "east-southern-africa"
  | "japan"
  | "korea"
  | "china"
  | "arab-north-africa"
  | "nordics"
  | "central-east-europe"
  | "western-europe"
  | "south-asia"
  | "southeast-asia"
  | "caribbean"
  | "latam"
  | "balkans-caucasus"
  | "anglophone"
  | "oceania"
  | "italy-greece"
  | "turkey-central-asia"
  | "cosmopolitan";

const GROUPS: Record<CardRegion, string[]> = {
  "iberia-latam": [
    "spriggo", "flamy", "aquaff", "rocko", "breezi", "lumby", "mossbit",
    "cindervix", "nimbusail", "pebblo",
    "pell-quarry", "neris-tide", "lyra-cove", "corin-vale", "nyra-dusk",
    "aurek-dawn",
  ],
  "west-africa": [
    "sparkit", "dewlin", "grubby", "wispet", "emberling", "sandpaw",
    "cloudlet", "frostbud",
    "mira-vale", "dorn-ash", "vance-grimm", "cael-orbis", "ryn-halcyon",
    "zephyra-kaine",
  ],
  "east-southern-africa": [
    "tufty", "bloomkin", "pebbleaf", "snoot", "fizzlet", "puddlin",
    "cinderpup", "mistlet", "rooty", "zappit", "sproutle", "emberkit",
    "seraphine-ward",
  ],
  japan: ["dewfin", "gravlet", "whiffle", "thornax", "tovin-spark", "ivy-marrow", "theo-kade"],
  korea: ["glimmet", "voltkit", "voltrix", "bram-holt", "auria-stell"],
  china: ["barkle", "frostip", "murkle"],
  "arab-north-africa": [
    "aquarion", "pyron", "frostel", "terradon", "prismite", "rillkin",
    "tempestra", "quillrex", "marshalor", "blazefang",
    "sasha-fern", "kira-flint", "nia-solace", "riven-arc",
  ],
  nordics: [
    "gustorm", "ironmole", "coralynx", "duskmoth", "vinequill", "shockrill",
    "bramblorn", "cindral", "tidefang", "glacivar",
    "onyx-bale", "thea-solaine",
  ],
  "central-east-europe": [
    "stonewake", "voltania", "sylvane", "emberix", "aquilon", "duskrill",
    "thistlefang", "scorchmane", "brinewarden", "hailspur",
    "elara-prism",
  ],
  "western-europe": [
    "granithor", "arcvane", "bloomhart", "ashlyn", "currentil", "nocturne",
    "quartzil", "zephyrl", "inferion", "stormwing",
    "ivo-lantern", "sylvi-moss", "orin-sable",
  ],
  "south-asia": [
    "glaciera", "venomara", "solaris", "abyssor", "corallume", "cryowl",
    "magmora", "pyrolisk", "tidewrath", "verdanox",
    "sable-wren",
  ],
  "southeast-asia": [
    "stormhoof", "obsidra", "zephyrion", "emberwyrm", "pyrantis", "aurelox",
    "verdakar", "cryostar", "thundraq", "nyxarath",
  ],
  caribbean: ["corvantis", "seismyr"],
  latam: [
    "luxaria", "vortessa", "pyroclast", "gildmane", "thornarch", "rimeclaw",
    "voltrion", "shadowbind",
  ],
  "balkans-caucasus": [
    "skyharrow", "tremordon", "prismara", "drakoryn", "celestia", "netherion",
    "chronox", "titanox", "astralyn", "noctyss",
    "brakk-forge", "rhea-lantern",
  ],
  anglophone: [
    "mooncrest", "aeonclaw", "umbraflux", "selenova", "terravyn", "voidmaw",
    "crystalyx", "riftara", "kaelthrix", "umbraleth",
  ],
  oceania: [
    "solvarion", "tempestryx", "noctivane", "aetheros", "draviel", "chryselis",
    "morvanth", "zephareth", "ferrovax", "nyxvaleth",
  ],
  "italy-greece": [
    "heliora", "galestryx", "verdanthe", "obsidrake", "elyndor", "draconis",
    "aetherion", "volcanox", "lunareth", "zeraphon",
    "sela-nyx", "dax-ferrow", "isolde-vane",
  ],
  "turkey-central-asia": [
    "nebulume", "auroryx", "solaphyr", "solmourn", "thalassion", "ignivar",
    "nocturnyx", "valkoreth", "sundralis", "nyxareon",
    "marek-kel",
  ],
  cosmopolitan: [
    "terravorn", "aquilaris", "ignarath", "voidrakon", "stellareth",
    "umbrakhan", "aurenvel", "solmareth", "kaervoth", "pelagorath",
  ],
};

export const REGION_BY_CARD: Record<string, CardRegion> = Object.fromEntries(
  Object.entries(GROUPS).flatMap(([region, ids]) =>
    ids.map((id) => [id, region as CardRegion]),
  ),
);

/** Fictional flag palettes, grouped so every region reads as one nationality family. */
export const REGION_FLAGS: Record<CardRegion, [string, string, string][]> = {
  "iberia-latam": [
    ["#c8102e", "#f4c430", "#c8102e"],
    ["#0b6b3a", "#f4f4f4", "#c8102e"],
    ["#1d4ed8", "#f4f4f4", "#f59e0b"],
  ],
  "west-africa": [
    ["#0b7a3b", "#f4f4f4", "#c8102e"],
    ["#f4c430", "#0b7a3b", "#c8102e"],
    ["#0b7a3b", "#f4c430", "#111827"],
  ],
  "east-southern-africa": [
    ["#0b7a3b", "#111827", "#c8102e"],
    ["#046a38", "#f4c430", "#111827"],
    ["#0369a1", "#f4f4f4", "#0b7a3b"],
  ],
  japan: [["#f4f4f4", "#bc002d", "#f4f4f4"]],
  korea: [["#f4f4f4", "#0047a0", "#cd2e3a"]],
  china: [["#de2910", "#ffde00", "#de2910"]],
  "arab-north-africa": [
    ["#046a38", "#f4f4f4", "#c8102e"],
    ["#111827", "#f4f4f4", "#046a38"],
    ["#c8102e", "#f4f4f4", "#111827"],
  ],
  nordics: [
    ["#0b2a5b", "#f4f4f4", "#0b2a5b"],
    ["#c8102e", "#f4f4f4", "#1d3f8f"],
    ["#0369a1", "#f4f4f4", "#0369a1"],
  ],
  "central-east-europe": [
    ["#f4f4f4", "#c8102e", "#1d3f8f"],
    ["#1d3f8f", "#f4f4f4", "#c8102e"],
    ["#f4c430", "#1d3f8f", "#c8102e"],
  ],
  "western-europe": [
    ["#1d3f8f", "#f4f4f4", "#c8102e"],
    ["#111827", "#c8102e", "#f4c430"],
    ["#c8102e", "#f4c430", "#111827"],
  ],
  "south-asia": [
    ["#f59e0b", "#f4f4f4", "#0b7a3b"],
    ["#046a38", "#f4f4f4", "#046a38"],
    ["#7f1d1d", "#f4c430", "#0b6b3a"],
  ],
  "southeast-asia": [
    ["#c8102e", "#f4f4f4", "#1d3f8f"],
    ["#c8102e", "#f4c430", "#c8102e"],
    ["#0369a1", "#f4f4f4", "#c8102e"],
  ],
  caribbean: [
    ["#111827", "#f4c430", "#0b7a3b"],
    ["#0b6b3a", "#f4c430", "#111827"],
    ["#0369a1", "#f4f4f4", "#c8102e"],
  ],
  latam: [
    ["#f4c430", "#1d3f8f", "#c8102e"],
    ["#0369a1", "#f4f4f4", "#0369a1"],
    ["#046a38", "#f4f4f4", "#c8102e"],
  ],
  "balkans-caucasus": [
    ["#c8102e", "#1d3f8f", "#f4f4f4"],
    ["#7f1d1d", "#f4f4f4", "#7f1d1d"],
    ["#1d3f8f", "#f4c430", "#c8102e"],
  ],
  anglophone: [
    ["#0b2a5b", "#f4f4f4", "#c8102e"],
    ["#c8102e", "#f4f4f4", "#1d3f8f"],
    ["#111827", "#f4f4f4", "#0b2a5b"],
  ],
  oceania: [
    ["#0b2a5b", "#f4f4f4", "#0b2a5b"],
    ["#0f766e", "#f4f4f4", "#111827"],
    ["#1d3f8f", "#c8102e", "#f4f4f4"],
  ],
  "italy-greece": [
    ["#0b7a3b", "#f4f4f4", "#c8102e"],
    ["#0369a1", "#f4f4f4", "#0369a1"],
    ["#1d3f8f", "#f4f4f4", "#1d3f8f"],
  ],
  "turkey-central-asia": [
    ["#c8102e", "#f4f4f4", "#c8102e"],
    ["#0f766e", "#f4f4f4", "#f4c430"],
    ["#0369a1", "#f4c430", "#0369a1"],
  ],
  cosmopolitan: [
    ["#111827", "#20d8ea", "#f4c430"],
    ["#134e4a", "#e2e8f0", "#0f172a"],
    ["#5b21b6", "#f4f4f4", "#f59e0b"],
  ],
};
