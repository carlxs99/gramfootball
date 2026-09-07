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
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
      <div className="flex items-center justify-between rounded-full border border-line/60 bg-panel/95 px-2 py-1.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 transition-all"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-ink text-panel shadow-lg shadow-ink/15" }}
            >
              <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
              <span className="text-[8px] font-extrabold uppercase tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
