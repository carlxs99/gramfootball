import { Link } from "@tanstack/react-router";

const ITEMS = [
  { to: "/", label: "Home", glyph: "▤" },
  { to: "/collection", label: "Collection", glyph: "▦" },
  { to: "/leaderboard", label: "Ranking", glyph: "▲" },
  { to: "/profile", label: "Profile", glyph: "◈" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] border-t border-white/10 bg-void/95 px-3 pb-5 pt-3 backdrop-blur">
      <div className="flex items-center justify-around">
        {ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex min-w-16 flex-col items-center gap-1 py-1 text-dim"
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "text-gram" }}
          >
            <span className="text-base leading-none">{item.glyph}</span>
            <span className="font-mono text-[8px] uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
