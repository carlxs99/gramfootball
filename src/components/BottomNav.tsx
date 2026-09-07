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
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] border-t border-line/60 bg-void/95 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 backdrop-blur-xl">
      <div className="flex items-stretch justify-between">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
          <Link
            key={item.to}
            to={item.to}
            className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1.5 rounded-md py-1 text-dim transition-colors"
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "text-gram bg-gram/8" }}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
          );
        })}
      </div>
    </nav>
  );
}
