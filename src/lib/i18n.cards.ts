// Card description translations. English lives in football-cards.ts.
import type { Lang } from "./i18n";
import { FOOTBALL_CARDS } from "./football-cards";

const ES: Record<string, string> = Object.fromEntries(
  Object.entries(FOOTBALL_CARDS).map(([id, info]) => [id, info.es]),
);

export const CARD_DESC: Partial<Record<Lang, Record<string, string>>> = {
  es: ES,
};

/** Description for a card in the active language, falling back to English. */
export function cardDescription(
  lang: Lang,
  id: string,
  fallback: string,
): string {
  return CARD_DESC[lang]?.[id] ?? fallback;
}
