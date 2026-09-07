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
    <div className="relative mx-auto min-h-dvh w-full max-w-[520px] overflow-hidden bg-void font-body text-ink">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 60% at 50% -10%,#2a1c52 0%,transparent 60%),radial-gradient(90% 40% at 50% 40%,#3a1150 0%,transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute -left-10 top-24 h-40 w-40 rounded-full bg-mythic/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-10 h-40 w-40 rounded-full bg-gram/20 blur-3xl" />

      <header className="relative z-20 flex items-center justify-between px-5 pt-5">
        <Link to="/" className="leading-none">
          <div className="font-display text-[15px] font-bold tracking-tight">CREATURE PACKS</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-dim">
            collect them all
          </div>
        </Link>
        {showBalance && (
        <div className="chip flex items-center gap-1.5 rounded-full px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-gram shadow-[0_0_8px_var(--gram)]" />
          <span className="font-mono text-xs font-bold text-gram">{player.gram.toFixed(2)}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-dim">GRAM</span>
        </div>
        )}
      </header>

      <main className="relative z-10 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
