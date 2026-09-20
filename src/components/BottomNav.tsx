import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  Coins,
  Goal,
  Handshake,
  PackageOpen,
  PanelsTopLeft,
  Shield,
  Trophy,
  UserRoundCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

/** Primary items always visible in the bar */
const PRIMARY: NavItem[] = [
  { to: "/", label: "nav.home", icon: Goal },
  { to: "/packs", label: "nav.shop", icon: PackageOpen },
  { to: "/collection", label: "nav.album", icon: Shield },
  { to: "/wallet", label: "nav.wallet", icon: Coins },
];

/** Secondary items accessible via the More floating menu */
const SECONDARY: NavItem[] = [
  { to: "/market", label: "nav.market", icon: BadgeDollarSign },
  { to: "/tasks", label: "nav.tasks", icon: ClipboardCheck },
  { to: "/referrals", label: "nav.invite", icon: UsersRound },
  { to: "/leaderboard", label: "nav.rank", icon: Trophy },
  { to: "/profile", label: "nav.you", icon: UserRoundCog },
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
      <div className="pointer-events-auto relative flex items-center justify-between rounded-2xl border border-panel/10 bg-void/85 px-1.5 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-md">
        {PRIMARY.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-dim transition-all"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className: "bg-gram/10 text-gram shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
              }}
            >
              <span className="football-nav-icon" aria-hidden="true">
                <Icon size={19} strokeWidth={2.1} />
              </span>
              <span className="text-[8px] font-extrabold">{t(item.label)}</span>
            </Link>
          );
        })}

        {/* More button */}
        <Button
          ref={moreBtnRef}
          type="button"
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`relative h-auto min-h-12 flex-1 flex-col gap-0.5 rounded-xl px-0.5 py-1.5 text-dim shadow-none transition-all hover:bg-transparent hover:text-dim ${open ? "bg-gram/10 text-gram shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : ""}`}
        >
          <span className="football-nav-icon" aria-hidden="true">
            <PanelsTopLeft size={19} strokeWidth={2.1} />
          </span>
          <span className="text-[8px] font-extrabold">{t("nav.more")}</span>
        </Button>

        {/* Floating menu — anchored to the card so it sits flush against the bar */}
        {open && (
          <div
            ref={menuRef}
            className="pointer-events-auto absolute bottom-full right-0 w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-surface shadow-2xl shadow-black/50"
          >
            {SECONDARY.map((item, i) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${active ? "bg-panel2 text-ink" : "text-dim hover:text-ink"} ${i > 0 ? "border-t border-[var(--line)]" : ""}`}
                >
                  <span className="football-menu-icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={2.1} />
                  </span>
                  <span className="font-bold">{t(item.label)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
