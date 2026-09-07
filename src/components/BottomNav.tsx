import { Link } from "@tanstack/react-router";

const ITEMS = [
  { to: "/", label: "Home", glyph: "⌂" },
  { to: "/packs", label: "Shop", glyph: "◭" },
  { to: "/collection", label: "Album", glyph: "▦" },
  { to: "/leaderboard", label: "Rank", glyph: "▲" },
  { to: "/profile", label: "You", glyph: "◈" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] border-t border-white/10 bg-void/95 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-2.5 backdrop-blur">
      <div className="flex items-stretch justify-between">
        {ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-dim"
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "text-gram bg-white/5" }}
          >
            <span className="text-[15px] leading-none">{item.glyph}</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.15em]">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
