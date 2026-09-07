import { useEffect, useState } from "react";
import {
  CLAIM_CAP_HOURS,
  accrued,
  dailyYield,
  formatGram,
  streakBonus,
  vaultFill,
} from "@/lib/economy";
import { claimYield, usePlayer } from "@/lib/store";

export function YieldVault() {
  const player = usePlayer();
  const [now, setNow] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const rate = dailyYield(player.owned);
  const pending = now ? accrued(player.owned, player.lastClaimAt, now) : 0;
  const fill = now ? vaultFill(player.lastClaimAt, now) : 0;
  const bonus = streakBonus(player.streak + 1);
  const ready = pending >= 0.0001;

  function onClaim() {
    const res = claimYield();
    if (!res) return;
    setNow(Date.now());
    setFlash(`+${formatGram(res.total)} GRAM`);
    window.setTimeout(() => setFlash(null), 2200);
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-gram/35 bg-gradient-to-b from-gram/10 to-panel p-4">
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gram/20 blur-3xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-gram">
            Daily production
          </div>
          <div className="mt-1 font-display text-2xl font-bold leading-none">
            {formatGram(pending)} <span className="text-sm text-dim">GRAM</span>
          </div>
        </div>
        <div className="text-right font-mono text-[9px] uppercase tracking-widest text-dim">
          <div>{formatGram(rate)} / day</div>
          <div className="mt-1">
            Streak {player.streak}d {bonus > 0 ? `· +${Math.round(bonus * 100)}%` : ""}
          </div>
        </div>
      </div>

      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gram via-epic to-mythic transition-[width] duration-700"
          style={{ width: `${Math.round(fill * 100)}%` }}
        />
      </div>
      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-dim">
        Vault fills in {CLAIM_CAP_HOURS}h · {Math.round(fill * 100)}% full
      </div>

      <button
        type="button"
        onClick={onClaim}
        disabled={!ready}
        className="relative mt-3 min-h-12 w-full rounded-xl bg-gradient-to-b from-gram to-rare py-3.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-void disabled:opacity-40"
      >
        {flash ?? "Claim GRAM"}
      </button>

      {rate === 0 && (
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-dim">
          Your creatures mine GRAM every day. Open a pack to start producing.
        </p>
      )}
    </div>
  );
}
