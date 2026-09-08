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
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-12" style={{ background: "linear-gradient(to top, var(--void) 0%, var(--void) 40%, transparent 100%)" }}>
      <div className="soft-card flex items-center justify-between rounded-2xl px-1.5 py-1.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-dim transition-all"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className:
                  "bg-panel2 text-rare shadow-[inset_0_0_0_1px_var(--line)]",
              }}
            >
              <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
              <span className="text-[8px] font-extrabold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>

  );
}
