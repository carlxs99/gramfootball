import type { SVGProps } from "react";

export type FootballNavIconKind = "home" | "packs" | "album" | "wallet" | "more";

type FootballNavIconProps = SVGProps<SVGSVGElement> & { kind: FootballNavIconKind };

export function FootballNavIcon({ kind, ...props }: FootballNavIconProps) {
  const artwork = {
    home: <><path d="M4.5 14.5 16 5l11.5 9.5" /><path d="M7 13v12h18V13" /><circle cx="16" cy="17.5" r="4.2" /><path d="m16 15.2 2.2 1.6-.85 2.6h-2.7l-.85-2.6Z" /><path d="M16 15.2v-2.3M18.2 16.8l2.1-.7M17.35 19.4l1.3 1.9M14.65 19.4l-1.3 1.9M13.8 16.8l-2.1-.7" /></>,
    packs: <><path d="M7 9h18l2 4-2.3 11H7.3L5 13Z" /><path d="M6 13h20M10 9l1.4-3h9.2L22 9" /><circle cx="16" cy="18.5" r="3.2" /><path d="m16 15.3 1.8 1.3-.7 2.1h-2.2l-.7-2.1Z" /></>,
    album: <><rect x="7" y="5" width="18" height="22" rx="2" /><path d="M11 5v22M15 10h6v7h-6zM15 21h6" /></>,
    wallet: <><path d="M5 10h20a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2Z" /><path d="m7 10 2-4h13l2 4M20 15h8v6h-8a3 3 0 0 1 0-6Z" /><circle cx="21" cy="18" r="1" fill="currentColor" stroke="none" /></>,
    more: <><path d="M5 7h22v18H5z" /><circle cx="16" cy="16" r="4" /><path d="M5 12h5v8H5M27 12h-5v8h5M16 7v5M16 20v5" /></>,
  }[kind];

  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <g className="football-nav-icon__art" strokeWidth="2">{artwork}</g>
    </svg>
  );
}