import { Link } from "@tanstack/react-router";
import { Album, House, ListChecks, ShoppingBag, Trophy, Users, UserRound, Wallet } from "lucide-react";
import { useT } from "@/lib/i18n";

const ITEMS = [
  { to: "/", label: "nav.home", icon: House },
  { to: "/packs", label: "nav.shop", icon: ShoppingBag },
  { to: "/collection", label: "nav.album", icon: Album },
  { to: "/wallet", label: "nav.wallet", icon: Wallet },
  { to: "/tasks", label: "nav.tasks", icon: ListChecks },
  { to: "/referrals", label: "nav.invite", icon: Users },
  { to: "/leaderboard", label: "nav.rank", icon: Trophy },
  { to: "/profile", label: "nav.you", icon: UserRound },
] as const;


export function BottomNav() {
  const t = useT();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-12" style={{ background: "linear-gradient(to top, var(--void) 0%, var(--void) 42%, transparent 100%)" }}>
      <div className="soft-card pointer-events-auto flex items-center justify-between rounded-2xl px-1.5 py-1.5">
        {ITEMS.map((item) => {

          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-dim transition-all"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className:
                  "bg-panel2 text-rare shadow-[inset_0_0_0_1px_var(--line)]",
              }}
            >
              <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
              <span className="text-[7px] font-extrabold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>

  );
}
