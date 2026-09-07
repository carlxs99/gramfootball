import { Link } from "@tanstack/react-router";
import { Album, House, ShoppingBag, Trophy, UserRound } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: House },
  { to: "/packs", label: "Shop", icon: ShoppingBag },
  { to: "/collection", label: "Album", icon: Album },
  { to: "/leaderboard", label: "Rank", icon: Trophy },
  { to: "/profile", label: "You", icon: UserRound },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-16" style={{ background: "linear-gradient(to top, var(--void) 0%, var(--void) 32%, transparent 100%)" }}>
      <div className="glossy-pill flex items-center justify-between rounded-full px-2 py-1.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-dim transition-all"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className:
                  "bg-gradient-to-b from-rare to-epic text-white shadow-[0_8px_16px_-8px_var(--epic)]",
              }}
            >
              <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
              <span className="text-[8px] font-extrabold uppercase tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>

    </nav>
  );
}
