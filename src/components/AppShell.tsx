import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { usePlayer } from "@/lib/store";
import logo from "@/assets/logo.png";
import gramLogo from "@/assets/gram-logo.png";

export function AppShell({
  children,
  showBalance = true,
}: {
  children: ReactNode;
  showBalance?: boolean;
}) {
  const player = usePlayer();

  return (
    <div className="sky-bg relative mx-auto min-h-dvh w-full max-w-[520px] overflow-x-clip font-body text-ink">
      <div className="prism-line absolute inset-x-0 top-0 z-30 h-0.5" />
      <header className="relative z-20 flex items-center justify-between gap-2 px-4 pb-3 pt-[max(env(safe-area-inset-top),20px)] sm:px-5">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 leading-none">
          <img src={logo} alt="Monsters CCJ logo" width={40} height={40} className="size-10 shrink-0 rounded-xl drop-shadow-[0_4px_10px_rgba(30,27,75,0.35)]" />
          <div>
            <div className="whitespace-nowrap font-display text-[15px] font-extrabold sm:text-[16px]">MONSTERS CCJ</div>
            <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-dim">Collector hub</div>
          </div>
        </Link>
        {showBalance && (
          <Link
            to="/wallet"
            className="glossy-pill flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 sm:gap-2 sm:px-3"
          >
            <img src={gramLogo} alt="GRAM" className="size-5 rounded-full shadow-[0_0_10px_rgba(0,152,234,0.45)]" />
            <span className="text-sm font-bold text-ink">{player.gram.toFixed(2)}</span>
            <span className="balance-label text-[9px] font-bold text-dim">GRAM</span>
          </Link>
        )}
      </header>


      <main className="relative pb-[calc(8.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
    </div>
  );
}
