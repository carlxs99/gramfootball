import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CircleDot } from "lucide-react";
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
    <div className="app-grid relative mx-auto min-h-dvh w-full max-w-[520px] overflow-hidden border-x border-line/40 bg-void font-body text-ink">

      <header className="relative z-20 flex items-center justify-between border-b border-line/40 px-5 pb-4 pt-5">
        <Link to="/" className="leading-none">
          <div className="font-display text-[16px] font-bold">CREATURE PACKS</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-dim">
            Command center
          </div>
        </Link>
        {showBalance && (
          <div className="flex items-center gap-2 rounded-md border border-line bg-panel/80 px-3 py-2">
            <CircleDot size={13} className="text-gram" aria-hidden="true" />
            <span className="font-mono text-xs font-bold text-ink">{player.gram.toFixed(2)}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-dim">GRAM</span>
          </div>
        )}
      </header>

      <main className="relative z-10 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
