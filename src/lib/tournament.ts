/** Weekly referral tournament: shared (client + server) rules. */
import { CARDS, type CollectibleCard } from "./creatures";

export const TOURNAMENT_ADMIN_ID = 6334940213;

export type TournamentPrize =
  | { kind: "pack"; packId: string; name: string }
  | { kind: "card"; count: number };

/** 1st League, 2nd Academy, 3rd Kick-Off, 4th–10th one low-yield Bronze card. */
export function prizeFor(place: number): TournamentPrize | null {
  if (place === 1) return { kind: "pack", packId: "premium", name: "League Pack" };
  if (place === 2) return { kind: "pack", packId: "rookie", name: "Academy Pack" };
  if (place === 3) return { kind: "pack", packId: "basic", name: "Kick-Off Pack" };
  if (place >= 4 && place <= 10) return { kind: "card", count: 1 };
  return null;
}

/** The five Bronze cards with the lowest daily production. */
export const PRIZE_CARD_POOL: CollectibleCard[] = CARDS.filter((c) => c.rarity === "common")
  .slice()
  .sort((a, b) => a.dailyGram - b.dailyGram || a.id.localeCompare(b.id))
  .slice(0, 5);

/** Monday 00:00 UTC of the week that contains `at`. */
export function weekStart(at: Date = new Date()) {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

export function weekKeyOf(start: Date) {
  return start.toISOString().slice(0, 10);
}
