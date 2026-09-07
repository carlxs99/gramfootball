import { RARITIES } from "@/lib/creatures";
import type { Pack } from "@/lib/packs";
import { rarityText } from "./rarity";

const SHORT: Record<string, string> = {
  common: "COM",
  rare: "RAR",
  epic: "EPIC",
  mythic: "MYT",
  legendary: "LEG",
};

export function OddsTable({ pack }: { pack: Pack }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 font-mono text-[8px]">
      {RARITIES.map((r) => (
        <div
          key={r}
          className={`rounded-md border py-1 text-center ${r === "legendary" ? "border-legendary/40" : "border-white/10"}`}
        >
          <div className="text-dim">{SHORT[r]}</div>
          <div className={rarityText[r]}>{pack.odds[r]}%</div>
        </div>
      ))}
    </div>
  );
}
