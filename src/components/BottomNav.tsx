import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Album,
  House,
  ShoppingBag,
  Wallet,
  MoreHorizontal,
  Swords,
  ListChecks,
  Trophy,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/lib/i18n";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

/** Primary items always visible in the bar */
const PRIMARY: NavItem[] = [
  { to: "/", label: "nav.home", icon: House },
  { to: "/packs", label: "nav.shop", icon: ShoppingBag },
  { to: "/collection", label: "nav.album", icon: Album },
  { to: "/wallet", label: "nav.wallet", icon: Wallet },
];

/** Secondary items accessible via the More floating menu */
const SECONDARY: NavItem[] = [
  { to: "/battle", label: "nav.battle", icon: Swords },
  { to: "/tasks", label: "nav.tasks", icon: ListChecks },
  { to: "/referrals", label: "nav.invite", icon: Users },
  { to: "/leaderboard", label: "nav.rank", icon: Trophy },
  { to: "/profile", label: "nav.you", icon: UserRound },
];

export function BottomNav() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  // Close the floating menu when navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && moreBtnRef.current && !moreBtnRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-12"
      style={{
        background: "linear-gradient(to top, var(--void) 0%, var(--void) 42%, transparent 100%)",
      }}
    >
      <div className="soft-card pointer-events-auto flex items-center justify-between rounded-2xl px-1.5 py-1.5">
        {PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-dim transition-all"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className: "bg-panel2 text-rare shadow-[inset_0_0_0_1px_var(--line)]",
              }}
            >
              <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
              <span className="text-[8px] font-extrabold">{t(item.label)}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          ref={moreBtnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-dim transition-all ${open ? "bg-panel2 text-rare shadow-[inset_0_0_0_1px_var(--line)]" : ""}`}
        >
          <MoreHorizontal size={18} strokeWidth={2.2} aria-hidden="true" />
          <span className="text-[8px] font-extrabold">{t("nav.more")}</span>
        </button>
      </div>

      {/* Floating menu */}
      {open && (
        <div
          ref={menuRef}
          className="pointer-events-auto absolute bottom-full right-3 mb-2 w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-panel shadow-2xl shadow-black/50"
        >
          {SECONDARY.map((item, i) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${active ? "bg-panel2 text-rare" : "text-dim hover:text-rare"} ${i > 0 ? "border-t border-[var(--line)]" : ""}`}
              >
                <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
                <span className="font-bold">{t(item.label)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
