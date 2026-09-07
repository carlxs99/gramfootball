import { useEffect, useState } from "react";
import {
  CLAIM_CAP_HOURS,
  accrued,
  dailyYield,
  formatGram,
  streakBonus,
  vaultFill,
} from "@/lib/economy";
import { claimYield, collectionStats, playerLevel, usePlayer } from "@/lib/store";

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
  const stats = collectionStats(player.owned);
  const level = playerLevel(player.xp);

  function onClaim() {
    const res = claimYield();
    if (!res) return;
    setNow(Date.now());
    setFlash(`+${formatGram(res.total)} GRAM`);
    window.setTimeout(() => setFlash(null), 2200);
  }

  return (
    <section className="border border-line/70 bg-panel/90 p-5 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--ink)_7%,transparent)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-dim">
            Available balance
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="size-2 rounded-full bg-gram shadow-[0_0_10px_var(--gram)]" />
            <span className="font-mono text-[28px] font-bold leading-none">
              {player.gram.toFixed(2)}
            </span>
            <span className="self-end text-[10px] font-bold text-dim">GRAM</span>
          </div>
        </div>
        <div className="rounded-sm border border-gram/20 bg-gram/8 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-gram">
          System active
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-line/60 pt-4">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">Daily production</div>
          <div className="mt-1 font-mono text-lg font-bold text-gram">+{formatGram(rate)}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">Ready to claim</div>
          <div className="mt-1 font-mono text-lg font-bold text-ink">{formatGram(pending)}</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden bg-void">
        <div
          className="h-full bg-gram transition-[width] duration-700"
          style={{ width: `${Math.round(fill * 100)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[8px] font-bold uppercase tracking-wider text-dim">
        <span>{Math.round(fill * 100)}% of {CLAIM_CAP_HOURS}h</span>
        <span>Streak {player.streak}d{bonus > 0 ? ` · +${Math.round(bonus * 100)}%` : ""}</span>
      </div>

      <button
        type="button"
        onClick={onClaim}
        disabled={!ready}
        className="mt-4 min-h-12 w-full rounded-md bg-gram py-3 font-display text-[13px] font-bold uppercase tracking-[0.12em] text-void shadow-[0_8px_24px_-12px_var(--gram)] transition-transform active:scale-[0.98] disabled:opacity-35"
      >
        {flash ?? "Claim earnings"}
      </button>

      <div className="mt-4 grid grid-cols-2 border-t border-line/60 pt-4">
        <div className="border-r border-line/60 pr-4">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-dim">Collection</div>
          <div className="mt-1 font-mono text-base font-bold">{stats.percent}% <span className="text-[9px] text-dim">{stats.found}/{stats.total}</span></div>
        </div>
        <div className="pl-4">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-dim">Player level</div>
          <div className="mt-1 font-mono text-base font-bold">LVL {level}</div>
        </div>
      </div>
    </section>
  );
}
