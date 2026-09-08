import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { usePlayer } from "@/lib/store";

export function AppShell({
  children,
  showBalance = true,
}: {
  children: ReactNode;
  showBalance?: boolean;
}) {
  const player = usePlayer();

  return (
    <div className="sky-bg relative mx-auto min-h-dvh w-full max-w-[520px] overflow-hidden font-body text-ink">
      <div className="prism-line absolute inset-x-0 top-0 z-30 h-0.5" />
      <header className="relative z-20 flex items-center justify-between px-5 pb-3 pt-5">
        <Link to="/" className="leading-none">
          <div className="font-display text-[16px] font-extrabold">CREATURE PACKS</div>
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-dim">Collector hub</div>
        </Link>
        {showBalance && (
          <div className="glossy-pill flex items-center gap-2 rounded-full px-3 py-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-gradient-to-tr from-gram to-amber-300 shadow-[0_0_10px_var(--gram)]">
              <span className="text-[8px] font-black text-dark">G</span>
            </span>
            <span className="text-sm font-bold text-ink">{player.gram.toFixed(2)}</span>
            <span className="text-[9px] font-bold text-dim">GRAM</span>
          </div>
        )}
      </header>


      <main className="relative z-10 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
