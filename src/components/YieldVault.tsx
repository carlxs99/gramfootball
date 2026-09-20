import { useEffect, useState } from "react";
import {
  CLAIM_CAP_HOURS,
  accrued,
  dailyYield,
  formatGram,
  vaultFill,
} from "@/lib/economy";
import { claimYield, collectionStats, playerLevel, usePlayer } from "@/lib/store";
import gramLogo from "@/assets/gram-logo.webp";
import { useT } from "@/lib/i18n";
import { showRewardedAd } from "@/lib/ads";
import { Trophy } from "lucide-react";

const PENDING_CLAIM_KEY = "gram-football.pending-ad-claim";
const AD_TIMEOUT_MS = 120_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      window.setTimeout(() => reject(new Error("Ad timed out")), ms),
    ),
  ]);
}

export function YieldVault() {
  const t = useT();
  const player = usePlayer();
  const [now, setNow] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const rate = dailyYield(player.owned);
  const pending = now ? accrued(player.owned, player.lastClaimAt, now) : 0;
  const fill = now ? vaultFill(player.lastClaimAt, now) : 0;
  const ready = pending > 0;
  const stats = collectionStats(player.owned);
  const level = playerLevel(player.xp);

  async function onClaim() {
    if (busy) return;
    setBusy(true);
    try {
      await showRewardedAd();
    } catch {
      // Ad failed to load or was dismissed early: continue with the claim.
    }
    const res = await claimYield().catch((e: unknown) => {
      setFlash(e instanceof Error ? e.message : t("vault.failed"));
      window.setTimeout(() => setFlash(null), 2200);
      return null;
    });
    setBusy(false);
    if (!res) return;
    setNow(Date.now());
    setFlash(`+${formatGram(res.total)} GRAM`);
    window.setTimeout(() => setFlash(null), 2200);
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 pl-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] sm:p-5 sm:pl-6">
      {/* Cyan accent strip */}
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      {/* Pitch-line decals */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full border-2 border-dim/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-4 -left-5 size-16 border-b-2 border-l-2 border-dim/10"
      />

      {/* Header */}
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-dim">
            {t("vault.available")}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <img
              src={gramLogo}
              alt="GRAM"
              className="size-6 self-center rounded-full shadow-[0_0_10px_rgba(0,152,234,0.45)] sm:size-7"
            />
            <span className="font-display text-2xl font-bold leading-none tracking-tight tabular-nums text-ink sm:text-3xl">
              {player.gram.toFixed(4)}
            </span>
            <span className="font-display text-sm font-bold uppercase text-gram">
              GRAM
            </span>
          </div>
        </div>
        <div className="rounded-sm border border-gram/30 bg-gram/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight text-gram">
          {t("vault.active")}
        </div>
      </div>

      {/* Tactical stats grid */}
      <div className="relative mt-3 grid grid-cols-2 gap-4 border-y border-line/60 py-2.5 sm:mt-4 sm:py-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
            {t("vault.daily")}
          </div>
          <div className="mt-1 font-display text-sm font-semibold text-yield">
            +{formatGram(rate)}{" "}
            <span className="text-[10px] text-dim">{t("common.perDay")}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
            {t("vault.ready")}
          </div>
          <div className="mt-1 font-display text-sm font-semibold tabular-nums text-gram">
            {pending.toFixed(6)}
          </div>
        </div>
      </div>

      {/* 24h progress */}
      <div className="relative mt-3 sm:mt-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gram to-amber-400"
              style={{ width: `${(fill * 100).toFixed(3)}%` }}
            />
          </div>
          <div className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-dim">
            {t("vault.progress", { p: Math.round(fill * 100), h: CLAIM_CAP_HOURS })}
          </div>
        </div>
      </div>

      {/* Slanted claim button */}
      <button
        type="button"
        onClick={onClaim}
        disabled={!ready || busy}
        className="group relative mt-3 block h-10 w-full sm:mt-4 sm:h-12"
      >
        <div
          aria-hidden
          className="absolute inset-0 -skew-x-12 translate-x-1 rounded-sm bg-primary shadow-[0_8px_24px_-12px_var(--gram)] transition-transform group-active:translate-x-0 group-disabled:bg-secondary group-disabled:shadow-none"
        />
        <span className="relative flex h-full items-center justify-center font-display text-[13px] font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors group-disabled:text-muted-foreground">
          {flash ?? t("vault.claim")}
        </span>
      </button>

      {/* Footer stats */}
      <div className="relative mt-3 flex items-center justify-between gap-3 border-t border-line/60 pt-2 sm:mt-4 sm:pt-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="flex items-baseline gap-1.5">
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-dim">
              {t("vault.collection")}
            </span>
            <span className="text-xs font-bold text-ink sm:text-sm">
              {stats.percent}%
            </span>
            <span className="text-[9px] text-dim">
              {stats.found}/{stats.total}
            </span>
          </span>
          <span aria-hidden className="h-3 w-px bg-line sm:h-6" />
          <span className="flex items-baseline gap-1.5">
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-dim">
              {t("vault.level")}
            </span>
            <span className="font-display text-xs font-bold text-gram sm:text-sm">
              LVL {level}
            </span>
          </span>
        </div>
        <Trophy aria-hidden className="size-4 shrink-0 text-dim opacity-20 sm:size-8" />
      </div>
    </section>
  );
}
