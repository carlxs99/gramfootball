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
import gramLogo from "@/assets/gram-logo.png";
import { useT } from "@/lib/i18n";

export function YieldVault() {
  const t = useT();
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

  async function onClaim() {
    const res = await claimYield().catch((e: unknown) => {
      setFlash(e instanceof Error ? e.message : t("vault.failed"));
      window.setTimeout(() => setFlash(null), 2200);
      return null;
    });
    if (!res) return;
    setNow(Date.now());
    setFlash(`+${formatGram(res.total)} GRAM`);
    window.setTimeout(() => setFlash(null), 2200);
  }

  return (
    <section className="rounded-3xl border border-line bg-panel p-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-dim">
            {t("vault.available")}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <img src={gramLogo} alt="GRAM" className="size-6 rounded-full shadow-[0_0_10px_rgba(0,152,234,0.45)]" />
            <span className="text-[26px] font-extrabold leading-none tracking-tight">
              {player.gram.toFixed(2)}
            </span>
            <span className="self-end text-[10px] font-bold text-dim">GRAM</span>
          </div>
        </div>
        <div className="rounded-full border border-gram/20 bg-gram/8 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-gram">
          {t("vault.active")}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">{t("vault.daily")}</div>
          <div className="mt-1 text-base font-bold text-yield">+{formatGram(rate)} {t("common.perDay")}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">{t("vault.ready")}</div>
          <div className="mt-1 text-base font-bold text-ink">{formatGram(pending)}</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gram to-amber-400 transition-[width] duration-700"
          style={{ width: `${Math.round(fill * 100)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[8px] font-bold uppercase tracking-wider text-dim">
        <span>{t("vault.progress", { p: Math.round(fill * 100), h: CLAIM_CAP_HOURS })}</span>
        <span>{t("vault.streak", { d: player.streak })}{bonus > 0 ? ` · +${Math.round(bonus * 100)}%` : ""}</span>
      </div>

      <button
        type="button"
        onClick={onClaim}
        disabled={!ready}
        className="mt-4 min-h-12 w-full rounded-2xl bg-ink py-3 font-display text-[13px] font-bold uppercase tracking-[0.12em] text-panel shadow-[0_8px_24px_-12px_var(--ink)] transition-transform active:scale-[0.98] disabled:opacity-35"
      >
        {flash ?? t("vault.claim")}
      </button>

      <div className="mt-4 grid grid-cols-2 border-t border-line pt-4">
        <div className="border-r border-line pr-4">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-dim">{t("vault.collection")}</div>
          <div className="mt-1 text-sm font-bold">{stats.percent}% <span className="text-[9px] text-dim">{stats.found}/{stats.total}</span></div>
        </div>
        <div className="pl-4">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-dim">{t("vault.level")}</div>
          <div className="mt-1 text-sm font-bold">LVL {level}</div>
        </div>
      </div>
    </section>
  );
}
