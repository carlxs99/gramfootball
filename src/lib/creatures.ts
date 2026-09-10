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
  kind: "creature";
  id: string;
  number: number;
  name: string;
  rarity: Rarity;
  description: string;
  stats: { atk: number; def: number; spd: number };
  /** Base GRAM produced per day at level 1. */
  dailyGram: number;
};

export type Trainer = {
  kind: "trainer";
  id: string;
  number: number;
  name: string;
  rarity: Rarity;
  description: string;
  specialty: string;
  stats: { atk: number; def: number; spd: number };
  /** Base GRAM produced per day at level 1. */
  dailyGram: number;
};

export type CollectibleCard = Creature | Trainer;

const RAW: Array<[Rarity, string, string, [number, number, number], number]> = [
  [
    "common",
    "Spriggo",
    "A sprout-born wanderer that hums when the soil is happy.",
    [24, 30, 28],
    0.00045,
  ],
  [
    "common",
    "Flamy",
    "A pocket ember that never quite learned to sit still.",
    [32, 18, 34],
    0.0013,
  ],
  [
    "common",
    "Aquaff",
    "Breathes bubbles that carry the smell of distant tides.",
    [26, 28, 30],
    0.0007,
  ],
  ["common", "Rocko", "Sleeps as a boulder, wakes as a very grumpy boulder.", [30, 40, 14], 0.0002],
  ["common", "Breezi", "Rides thermals and steals unattended hats.", [22, 20, 42], 0.002],
  ["common", "Lumby", "Glows softly enough to read a map by.", [20, 26, 26], 0.00035],
  ["rare", "Thornax", "Its briar mane sharpens with every fight survived.", [48, 46, 34], 0.007],
  ["rare", "Voltrix", "Runs the length of a storm cloud in a single blink.", [52, 32, 58], 0.013],
  ["rare", "Aquarion", "Commands tidepools like a small, patient king.", [44, 52, 38], 0.009],
  ["rare", "Pyron", "Its heartbeat keeps forge fires burning overnight.", [56, 38, 40], 0.018],
  ["rare", "Frostel", "Leaves lace-thin frost sigils wherever it rests.", [40, 54, 42], 0.011],
  ["rare", "Terradon", "Old stone given legs and a stubborn temper.", [50, 60, 26], 0.022],
  ["epic", "Inferion", "Wears a crown of collapsing fire.", [78, 58, 62], 0.045],
  ["epic", "Stormwing", "Rides the stormline and never lands twice.", [72, 56, 84], 0.065],
  ["epic", "Glaciera", "Her breath rewrites the shape of a valley.", [66, 82, 54], 0.035],
  ["epic", "Venomara", "Every scale carries a different poison.", [80, 52, 70], 0.055],
  ["epic", "Solaris", "Carries a fragment of a young sun.", [84, 60, 58], 0.08],
  ["epic", "Abyssor", "Surfaces once a century, briefly.", [76, 78, 48], 0.09],
  ["mythic", "Drakoryn", "Its roar cracks the sky into panes of light.", [112, 96, 88], 0.18],
  ["mythic", "Celestia", "Walks a staircase of stars only she can see.", [98, 104, 102], 0.135],
  ["mythic", "Netherion", "Born from the seam between two worlds.", [118, 88, 94], 0.22],
  ["mythic", "Chronox", "Remembers tomorrow more clearly than today.", [92, 100, 120], 0.27],
  ["mythic", "Titanox", "A mountain that decided to travel.", [124, 126, 54], 0.16],
  ["mythic", "Astralyn", "Trails a comet like a ribbon.", [104, 92, 116], 0.2],
  ["legendary", "Elyndor", "The first creature ever named.", [168, 152, 140], 0.65],
  ["legendary", "Draconis", "Its wings are folded storms.", [186, 148, 132], 0.55],
  ["legendary", "Aetherion", "Made of the light between stars.", [174, 158, 166], 0.8],
  ["legendary", "Volcanox", "Sleeps beneath the oldest caldera.", [192, 170, 108], 0.45],
  ["legendary", "Lunareth", "Pulls the tide with a single glance.", [158, 176, 150], 0.35],
  [
    "legendary",
    "Zeraphon",
    "Said to close the world when it opens its eyes.",
    [180, 164, 158],
    0.9,
  ],
];

const EXPANSION: Array<[Rarity, string, string, [number, number, number], number]> = [
  ["common", "Mossbit", "A moss-eared burrower that can hear roots growing.", [22, 31, 29], 0.0005],
  [
    "common",
    "Cindervix",
    "Its ember tail warms lost travelers through the night.",
    [31, 20, 35],
    0.0015,
  ],
  [
    "common",
    "Nimbusail",
    "A gentle sky ray that glides between young clouds.",
    [23, 25, 40],
    0.001,
  ],
  [
    "rare",
    "Prismite",
    "A crystal beetle whose shell splits moonlight into signals.",
    [46, 58, 32],
    0.012,
  ],
  ["rare", "Rillkin", "A playful river guardian armored in polished shells.", [42, 50, 46], 0.01],
  [
    "rare",
    "Tempestra",
    "A thunder lynx that pounces between lightning strikes.",
    [55, 35, 61],
    0.02,
  ],
  ["epic", "Corallume", "Its branching crown restores color to silent reefs.", [68, 74, 58], 0.05],
  ["epic", "Cryowl", "An ice owl whose gaze can still an avalanche.", [70, 67, 78], 0.07],
  ["epic", "Magmora", "A volcanic ram that tempers stone beneath its hooves.", [86, 72, 50], 0.085],
  ["mythic", "Noctyss", "A void serpent woven from the shadow of eclipses.", [116, 91, 108], 0.24],
  [
    "mythic",
    "Mooncrest",
    "A lunar kirin that leaves constellations in fresh snow.",
    [101, 112, 105],
    0.19,
  ],
  [
    "mythic",
    "Aeonclaw",
    "A time mantis that strikes between one second and the next.",
    [122, 84, 119],
    0.26,
  ],
  [
    "legendary",
    "Nebulume",
    "A star whale carrying newborn galaxies across the upper sky.",
    [170, 180, 142],
    0.6,
  ],
  [
    "legendary",
    "Auroryx",
    "An aurora dragon whose scales sing in seven colors.",
    [184, 160, 172],
    0.75,
  ],
  [
    "legendary",
    "Solaphyr",
    "The radiant firebird said to ignite every first dawn.",
    [190, 154, 178],
    0.85,
  ],
];

const WAVE_THREE: Array<[Rarity, string, string, [number, number, number], number]> = [
  ["common", "Pebblo", "A pocket-sized cairn that rolls downhill for fun.", [28, 38, 16], 0.00025],
  ["common", "Sparkit", "Static clings to its fur until it sneezes.", [30, 19, 37], 0.0016],
  ["common", "Dewlin", "Collects morning dew in the cups of its ears.", [21, 29, 31], 0.0008],
  ["common", "Grubby", "Chews through fallen logs and leaves tidy tunnels.", [26, 33, 18], 0.0004],
  [
    "common",
    "Wispet",
    "A shy flicker of marshlight that follows kind travelers.",
    [19, 22, 39],
    0.0018,
  ],
  [
    "common",
    "Emberling",
    "Naps inside cold campfires and relights them by accident.",
    [33, 21, 30],
    0.0011,
  ],
  ["common", "Sandpaw", "Swims through dunes as if they were water.", [27, 27, 33], 0.0006],
  [
    "common",
    "Cloudlet",
    "A drifting puff that rains only on thirsty flowers.",
    [18, 24, 41],
    0.0014,
  ],
  ["common", "Frostbud", "Blooms once per winter, then hides for a year.", [23, 35, 22], 0.0003],
  ["rare", "Quillrex", "Fires bark quills that sprout wherever they land.", [54, 44, 36], 0.008],
  ["rare", "Marshalor", "A bog sentinel wearing a mantle of living reeds.", [43, 58, 30], 0.0095],
  ["rare", "Blazefang", "Its bite leaves a scar of warm light.", [59, 34, 47], 0.019],
  ["rare", "Gustorm", "Spins small cyclones to sort the leaves it likes.", [41, 39, 62], 0.016],
  ["rare", "Ironmole", "Tunnels through ore veins and hoards the shiny bits.", [49, 63, 24], 0.021],
  ["rare", "Coralynx", "Prowls shallow reefs on coral-plated paws.", [47, 51, 44], 0.012],
  ["rare", "Duskmoth", "Its wing dust makes torches burn violet.", [38, 42, 57], 0.0075],
  ["rare", "Vinequill", "Writes warnings on tree trunks with a thorned tail.", [45, 55, 33], 0.014],
  ["rare", "Shockrill", "A burrowing coil that hums before every storm.", [53, 37, 59], 0.0175],
  ["epic", "Pyrolisk", "Its stare turns dry grass into a wall of flame.", [82, 55, 66], 0.06],
  ["epic", "Tidewrath", "Drags whole harbors into a single slow wave.", [74, 80, 52], 0.075],
  ["epic", "Verdanox", "An ancient grove that walks on root-woven legs.", [69, 88, 45], 0.04],
  ["epic", "Stormhoof", "Gallops on thunderheads and lands as rain.", [77, 61, 86], 0.07],
  ["epic", "Obsidra", "Volcanic glass shaped into a patient predator.", [85, 74, 51], 0.05],
  ["epic", "Zephyrion", "Carves canyons with a single exhale.", [71, 59, 89], 0.085],
  ["epic", "Emberwyrm", "Coils around forges to keep the coals company.", [88, 63, 57], 0.037],
  ["mythic", "Umbraflux", "A living eclipse that swallows its own shadow.", [120, 90, 112], 0.25],
  ["mythic", "Selenova", "Her mane blooms with every phase of the moon.", [99, 118, 100], 0.17],
  ["mythic", "Terravyn", "Plates of continent shift across its back.", [128, 122, 60], 0.145],
  ["mythic", "Voidmaw", "Opens a doorway wherever it yawns.", [123, 86, 115], 0.23],
  ["mythic", "Crystalyx", "Refracts attacks into harmless rainbows.", [95, 127, 96], 0.155],
  ["mythic", "Riftara", "Stitches torn skies back together, slowly.", [107, 98, 124], 0.265],
  ["legendary", "Solmourn", "Guards the last light of a dying star.", [176, 166, 144], 0.5],
  ["legendary", "Thalassion", "The abyss chose it as a voice.", [166, 184, 138], 0.4],
  ["legendary", "Ignivar", "Every scale is a sealed eruption.", [194, 158, 126], 0.7],
  ["legendary", "Nocturnyx", "Night folds itself into the shape of wings.", [178, 168, 176], 0.88],
];

const TRAINER_RAW: Array<[Rarity, string, string, string, [number, number, number], number]> = [
  [
    "common",
    "Mira Vale",
    "Maps forgotten habitats by reading the language of leaves.",
    "Field Scout",
    [20, 34, 38],
    0.001,
  ],
  [
    "common",
    "Tovin Spark",
    "Keeps every expedition moving with ingenious storm-powered tools.",
    "Storm Mechanic",
    [35, 22, 40],
    0.005,
  ],
  [
    "rare",
    "Neris Tide",
    "Navigates hidden currents to reach creatures beyond the charted seas.",
    "Ocean Navigator",
    [48, 52, 46],
    0.015,
  ],
  [
    "rare",
    "Brakk Forge",
    "Crafts protective gear in furnaces fed by volcanic glass.",
    "Relic Smith",
    [58, 62, 28],
    0.03,
  ],
  [
    "epic",
    "Elara Prism",
    "Catalogues resonant crystals and the creatures drawn to their light.",
    "Crystal Archivist",
    [72, 68, 66],
    0.1,
  ],
  [
    "epic",
    "Cael Orbis",
    "Plots safe routes through meteor showers and shifting starways.",
    "Astral Cartographer",
    [67, 70, 81],
    0.15,
  ],
  [
    "epic",
    "Sylvi Moss",
    "Restores exhausted creatures with remedies gathered at dawn.",
    "Wilds Healer",
    [62, 85, 72],
    0.2,
  ],
  [
    "mythic",
    "Riven Arc",
    "Turns ancient field notes into flawless expedition strategies.",
    "Rune Strategist",
    [118, 96, 110],
    0.5,
  ],
  [
    "mythic",
    "Nyra Dusk",
    "Protects nocturnal sanctuaries without leaving a single footprint.",
    "Night Ranger",
    [126, 88, 124],
    1,
  ],
  [
    "legendary",
    "Aurek Dawn",
    "Unites rival guilds whenever the frontier faces its darkest hour.",
    "Guild Champion",
    [188, 174, 168],
    2,
  ],
  [
    "common",
    "Pell Quarry",
    "Reads cave echoes to find nesting grounds nobody has mapped.",
    "Cave Guide",
    [24, 36, 30],
    0.0015,
  ],
  [
    "common",
    "Ivo Lantern",
    "Carries supplies through the dark on routes only he trusts.",
    "Night Courier",
    [28, 26, 42],
    0.002,
  ],
  [
    "common",
    "Sasha Fern",
    "Keeps a seed vault that can regrow a burned valley.",
    "Seed Keeper",
    [21, 38, 27],
    0.0025,
  ],
  [
    "common",
    "Dorn Ash",
    "Holds camp together when storms last for days.",
    "Camp Warden",
    [37, 40, 20],
    0.004,
  ],
  [
    "rare",
    "Kira Flint",
    "Tracks ember trails across scorched ridgelines.",
    "Ember Tracker",
    [56, 44, 50],
    0.018,
  ],
  [
    "rare",
    "Onyx Bale",
    "Calms hostile creatures with nothing but patience.",
    "Beast Handler",
    [61, 57, 34],
    0.025,
  ],
  [
    "rare",
    "Lyra Cove",
    "Predicts tides three days before they turn.",
    "Tide Reader",
    [45, 55, 52],
    0.016,
  ],
  [
    "rare",
    "Vance Grimm",
    "Delves ruins that other expeditions refuse to enter.",
    "Ruin Delver",
    [63, 48, 45],
    0.028,
  ],
  [
    "epic",
    "Isolde Vane",
    "Summons controlled squalls to shield her team.",
    "Storm Caller",
    [74, 66, 79],
    0.13,
  ],
  [
    "epic",
    "Marek Kel",
    "Flies salvage runs through skies no one else risks.",
    "Sky Pilot",
    [69, 63, 88],
    0.11,
  ],
  [
    "epic",
    "Thea Solaine",
    "Her banners turn a scattered camp into an army.",
    "Sun Herald",
    [81, 74, 64],
    0.17,
  ],
  [
    "epic",
    "Ryn Halcyon",
    "Speaks to wild creatures in their own cadence.",
    "Beast Whisperer",
    [66, 82, 76],
    0.19,
  ],
  [
    "mythic",
    "Zephyra Kaine",
    "Seals rifts before anything on the other side notices.",
    "Void Warden",
    [124, 102, 116],
    0.65,
  ],
  [
    "mythic",
    "Orin Sable",
    "Keeps relics that rewrite what the guilds believe.",
    "Relic Archon",
    [112, 121, 98],
    0.85,
  ],
  [
    "legendary",
    "Seraphine Ward",
    "The frontier answers to her signal and nothing else.",
    "Frontier Sovereign",
    [182, 180, 172],
    2.2,
  ],
];

const WAVE_FOUR: Array<[Rarity, string, string, [number, number, number], number]> = [
  ["common", "Tufty", "A pollen-fluffed hopper that sneezes tiny flowers.", [20, 28, 32], 0.0009],
  ["common", "Bloomkin", "Opens its petal collar only for people it trusts.", [22, 32, 26], 0.0006],
  ["common", "Pebbleaf", "Half stone, half sapling, entirely stubborn.", [28, 36, 19], 0.0004],
  ["common", "Snoot", "Sniffs out buried GRAM shards by pure luck.", [25, 25, 30], 0.0011],
  ["common", "Fizzlet", "A soda-bright spark that pops when startled.", [30, 19, 36], 0.0016],
  ["common", "Puddlin", "Lives in one puddle and considers it an ocean.", [21, 30, 28], 0.0007],
  ["common", "Cinderpup", "Wags a tail of warm ash and singes the rugs.", [33, 22, 31], 0.0013],
  ["common", "Mistlet", "Appears at dawn, forgets to leave by noon.", [19, 27, 38], 0.0019],
  ["common", "Rooty", "Anchors itself to nap and pulls up half a garden.", [27, 38, 16], 0.0003],
  ["common", "Zappit", "Charges itself by rubbing against storm fences.", [31, 20, 39], 0.0021],
  ["rare", "Bramblorn", "Wears a crown of thorns it grew on purpose.", [51, 49, 35], 0.0105],
  ["rare", "Cindral", "Breathes low flame that hardens sand into glass.", [58, 36, 44], 0.0195],
  ["rare", "Tidefang", "Hunts the shallows on the turn of every tide.", [46, 50, 48], 0.013],
  ["rare", "Glacivar", "Its footprints stay frozen for a full season.", [42, 59, 39], 0.0115],
  ["rare", "Stonewake", "Wakes only when the mountain complains.", [52, 64, 25], 0.023],
  ["rare", "Voltania", "Braids loose lightning into a mane.", [55, 35, 61], 0.0185],
  ["rare", "Sylvane", "Guides lost saplings toward the light.", [44, 56, 37], 0.0085],
  ["rare", "Emberix", "Sheds sparks that map the safest path home.", [57, 40, 46], 0.016],
  ["rare", "Aquilon", "Rides the coldest current without shivering.", [48, 53, 50], 0.0145],
  ["rare", "Duskrill", "Sings at nightfall to keep predators polite.", [40, 45, 58], 0.0095],
  ["epic", "Pyrantis", "A siege-sized ember-shell with a furnace heart.", [86, 68, 54], 0.055],
  ["epic", "Aurelox", "Gilded fur that turns dawn into armor.", [75, 72, 70], 0.082],
  ["epic", "Verdakar", "Roots itself mid-battle and refuses to move.", [70, 90, 46], 0.042],
  ["epic", "Cryostar", "Its core is a snowflake that never melts.", [68, 84, 60], 0.048],
  ["epic", "Thundraq", "Each step lands a second before the sound.", [79, 60, 90], 0.092],
  ["epic", "Nyxarath", "Hunts in the gap between two heartbeats.", [87, 57, 74], 0.1],
  ["epic", "Corvantis", "A feathered strategist that plans three moves ahead.", [73, 66, 83], 0.078],
  ["epic", "Seismyr", "Reads the mood of the ground beneath it.", [83, 86, 44], 0.065],
  ["epic", "Luxaria", "Weaves light into shields for its allies.", [64, 88, 68], 0.058],
  ["epic", "Vortessa", "Spins a private storm wherever she rests.", [76, 64, 87], 0.11],
  ["mythic", "Kaelthrix", "Its scales record every battle it has survived.", [126, 98, 92], 0.24],
  ["mythic", "Umbraleth", "Steps out of shadows it has not cast yet.", [118, 92, 118], 0.29],
  ["mythic", "Solvarion", "Carries a sunrise it refuses to release.", [110, 108, 96], 0.33],
  ["mythic", "Tempestryx", "The storm follows because it asked politely.", [104, 94, 126], 0.38],
  ["mythic", "Noctivane", "Collects the dreams of sleeping mountains.", [97, 116, 104], 0.21],
  ["mythic", "Aetheros", "Breathes the thin air above the sky.", [101, 106, 120], 0.35],
  ["mythic", "Draviel", "A guardian wyrm bound to an unspoken oath.", [122, 114, 86], 0.27],
  ["mythic", "Chryselis", "Its shell holds a world halfway to hatching.", [92, 128, 98], 0.19],
  ["mythic", "Morvanth", "Ends duels by simply arriving.", [129, 100, 90], 0.42],
  ["mythic", "Zephareth", "Rides the jetstream like a quiet road.", [99, 96, 129], 0.31],
  ["legendary", "Valkoreth", "Its charge rewrites the shape of a battlefield.", [190, 162, 130], 0.6],
  ["legendary", "Sundralis", "Where it lands, winter ends early.", [172, 170, 148], 0.75],
  ["legendary", "Nyxareon", "The night keeps its secrets in that gaze.", [184, 156, 160], 0.95],
  ["legendary", "Terravorn", "An entire ridge learned how to run.", [196, 178, 104], 0.48],
  ["legendary", "Aquilaris", "The deep answers when it calls.", [164, 182, 142], 0.66],
  ["legendary", "Ignarath", "A dormant eruption wearing a crown.", [193, 160, 122], 0.72],
  ["legendary", "Voidrakon", "Folds distance into a single wingbeat.", [186, 154, 168], 1.1],
  ["legendary", "Stellareth", "Stitched together from retired constellations.", [170, 174, 158], 0.85],
  ["legendary", "Umbrakhan", "Rules the hours no clock records.", [188, 166, 152], 1.25],
  ["legendary", "Aurenvel", "The first light after the longest night.", [176, 180, 146], 0.9],
];

/**
 * Global production scale applied to every card's base daily GRAM.
 * Raw tuning values assume a ~15-25 day pack payback; the live economy targets
 * a ~30-60 day payback across every pack tier, with level and streak bonuses
 * pushing active collectors toward the lower end of that window.
 */
export const YIELD_SCALE = 0.45;

export const CREATURES: Creature[] = [...RAW, ...EXPANSION, ...WAVE_THREE].map(
  ([rarity, name, description, s, dailyGram], i) => ({
    kind: "creature",
    id: name.toLowerCase(),
    number: i + 1,
    name,
    rarity,
    description,
    stats: { atk: s[0], def: s[1], spd: s[2] },
    dailyGram: dailyGram * YIELD_SCALE,
  }),
);

export const TRAINERS: Trainer[] = TRAINER_RAW.map(
  ([rarity, name, description, specialty, s, dailyGram], i) => ({
    kind: "trainer",
    id: name.toLowerCase().replaceAll(" ", "-"),
    number: CREATURES.length + i + 1,
    name,
    rarity,
    description,
    specialty,
    stats: { atk: s[0], def: s[1], spd: s[2] },
    dailyGram: dailyGram * YIELD_SCALE,
  }),
);

export const CARDS: CollectibleCard[] = [...CREATURES, ...TRAINERS];

export const CREATURES_BY_ID: Record<string, Creature> = Object.fromEntries(
  CREATURES.map((c) => [c.id, c]),
);

export const CARDS_BY_ID: Record<string, CollectibleCard> = Object.fromEntries(
  CARDS.map((card) => [card.id, card]),
);

export const BY_RARITY: Record<Rarity, CollectibleCard[]> = RARITIES.reduce(
  (acc, r) => {
    acc[r] = CARDS.filter((card) => card.rarity === r);
    return acc;
  },
  {} as Record<Rarity, CollectibleCard[]>,
);
