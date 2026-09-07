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
    <div className="grid grid-cols-5 gap-1.5 text-[8px] font-bold">
      {RARITIES.map((r) => (
        <div
          key={r}
          className={`rounded-lg border py-1.5 text-center ${r === "legendary" ? "border-legendary/40 bg-legendary/5" : "border-line bg-panel2/50"}`}
        >
          <div className="text-dim">{SHORT[r]}</div>
          <div className={rarityText[r]}>{pack.odds[r]}%</div>
        </div>
      ))}
    </div>
  );
}
