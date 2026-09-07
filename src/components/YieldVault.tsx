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
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-dim">
            Available GRAM
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="size-5 rounded-full bg-gradient-to-br from-gram to-rare shadow-[0_0_10px_-2px_var(--gram)]" />
            <span className="font-display text-2xl font-bold leading-none">
              {player.gram.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-dim">
            Production
          </div>
          <div className="mt-1.5 font-mono text-sm font-bold leading-none text-gram">
            +{formatGram(rate)} / day
          </div>
          <div className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-dim">
            Streak {player.streak}d{bonus > 0 ? ` · +${Math.round(bonus * 100)}%` : ""}
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-dim">
        <span>Vault · {formatGram(pending)} ready</span>
        <span>
          {Math.round(fill * 100)}% of {CLAIM_CAP_HOURS}h
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gram to-epic transition-[width] duration-700"
          style={{ width: `${Math.round(fill * 100)}%` }}
        />
      </div>

      <button
        type="button"
        onClick={onClaim}
        disabled={!ready}
        className="mt-3.5 min-h-11 w-full rounded-xl bg-gradient-to-b from-gram to-rare py-3 font-display text-[13px] font-bold uppercase tracking-[0.18em] text-void transition-transform active:scale-[0.98] disabled:opacity-35"
      >
        {flash ?? "Claim earnings"}
      </button>

      {rate === 0 && (
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-dim">
          Your creatures mine GRAM every day. Open a pack to start producing.
        </p>
      )}
    </div>
  );
}
