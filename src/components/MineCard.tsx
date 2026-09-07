import { useEffect, useState } from "react";
import { RARITY_LABEL } from "@/lib/creatures";
import { CLAIM_CAP_HOURS, computeYield, fmtGram, pendingGram } from "@/lib/economy";
import { claimYield, usePlayer } from "@/lib/store";
import { rarityText } from "./rarity";

export function MineCard({ compact = false }: { compact?: boolean }) {
  const player = usePlayer();
  const y = computeYield(player.owned);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const pending = pendingGram(y.perDay, player.lastClaimAt, now);
  const fill = y.capPerClaim > 0 ? Math.min(100, (pending / y.capPerClaim) * 100) : 0;
  const canClaim = pending >= 0.0001;

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-gram/30 bg-panel p-4">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gram/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-gram">
              Daily production
            </div>
            <div className="mt-1 font-display text-2xl font-bold leading-none">
              {fmtGram(y.perDay)}{" "}
              <span className="font-mono text-[10px] font-bold text-dim">GRAM / day</span>
            </div>
          </div>
          {y.bonusPercent > 0 && (
            <span className="rounded-full border border-legendary/40 bg-legendary/10 px-2 py-1 font-mono text-[9px] font-bold text-legendary">
              +{y.bonusPercent}% sets
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between font-mono text-[9px] uppercase tracking-widest text-dim">
          <span>Ready to claim</span>
          <span>
            cap {CLAIM_CAP_HOURS}h · {Math.round(fill)}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gram via-epic to-mythic transition-[width] duration-700"
            style={{ width: `${fill}%` }}
          />
        </div>

        <button
          type="button"
          disabled={!canClaim}
          onClick={() => claimYield(pending)}
          className={`mt-4 min-h-12 w-full rounded-xl py-3.5 font-display text-sm font-bold uppercase tracking-[0.18em] transition ${
            canClaim
              ? "bg-gradient-to-b from-gram to-rare text-void shadow-[0_8px_22px_-10px_var(--gram)]"
              : "border border-white/12 text-dim"
          }`}
        >
          {canClaim ? `Claim ${fmtGram(pending)} GRAM` : "Nothing to claim yet"}
        </button>

        {!compact && (
          <div className="mt-4">
            <div className="font-mono text-[9px] uppercase tracking-widest text-dim">
              Set bonuses
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5 text-center font-mono text-[9px]">
              {y.sets.map((s) => (
                <div
                  key={s.rarity}
                  className={`rounded-lg border py-1.5 ${
                    s.complete ? "border-legendary/40 bg-legendary/10" : "border-white/10 bg-panel2/60"
                  }`}
                >
                  <div className={`font-bold ${rarityText[s.rarity]}`}>
                    +{Math.round(s.bonus * 100)}%
                  </div>
                  <div className="text-dim">
                    {s.found}/{s.total}
                  </div>
                  <div className="text-dim">{RARITY_LABEL[s.rarity].slice(0, 4)}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-dim">
              Every copy produces, duplicates included. Complete a rarity for a permanent boost
              {y.master ? " · Master set +25% active" : ""}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
