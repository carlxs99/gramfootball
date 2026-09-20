import type { SVGProps } from "react";

export type FootballNavIconKind = "home" | "packs" | "album" | "wallet" | "more";

type FootballNavIconProps = SVGProps<SVGSVGElement> & { kind: FootballNavIconKind };

export function FootballNavIcon({ kind, ...props }: FootballNavIconProps) {
  const artwork = {
    home: <><path d="M5 19.5V11l5-4h12l5 4v8.5" /><path d="M8.5 20v-7h15v7M12 20v-4h8v4" /><circle cx="16" cy="11" r="2.2" /><path d="m14.5 9.5 1.5-1 1.5 1 .6 1.7-1.2 1.4h-1.8l-1.2-1.4Z" /></>,
    packs: <><path d="M8 8.5h16l2 4-2 12H8l-2-12Z" /><path d="M9.5 8.5 11 5.8h10l1.5 2.7M6 12.5h20" /><path d="m16 14 2.2 1.6-.8 2.6h-2.8l-.8-2.6Z" /><path d="m13.8 15.6-2 .5.2 2.4 2.6-.3M18.2 15.6l2 .5-.2 2.4-2.6-.3M14.6 18.2l-1 2.1 2.4 1.2 2.4-1.2-1-2.1" /></>,
    album: <><path d="M16 4.5 25 8v7.2c0 5.6-3.7 9.5-9 12.3-5.3-2.8-9-6.7-9-12.3V8Z" /><path d="M12 10.5h8v10h-8z" /><circle cx="16" cy="13.8" r="1.7" /><path d="M13.5 18.5c.7-1.3 1.5-1.9 2.5-1.9s1.8.6 2.5 1.9" /></>,
    wallet: <><path d="M6 10.5h18a2 2 0 0 1 2 2v11H8a2 2 0 0 1-2-2Z" /><path d="m7.5 10.5 2-4h11l2 4M20.5 15h7v5h-7a2.5 2.5 0 0 1 0-5Z" /><circle cx="21" cy="17.5" r=".6" fill="currentColor" stroke="none" /><path d="M13.2 14.5h3.4M13.2 17.5h3.4M13.2 20.5h3.4" /></>,
    more: <><path d="M5 7.5h22v17H5z" /><circle cx="16" cy="16" r="3.4" /><path d="M5 12h4v8H5M27 12h-4v8h4M16 7.5v5.1M16 19.4v5.1" /><circle cx="16" cy="16" r=".8" fill="currentColor" stroke="none" /></>,
  }[kind];

  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path className="football-nav-icon__crest" d="M16 1.8 28.5 6v11.2c0 6.1-4.8 10.9-12.5 13-7.7-2.1-12.5-6.9-12.5-13V6Z" />
      <g className="football-nav-icon__art" strokeWidth="1.45">{artwork}</g>
    </svg>
  );
}