/**
 * Nationality flag + fictional club crest emblems.
 *
 * The flag comes from the card's nationality (matched to its display name in
 * card-nationality.ts), so every card from the same country shows the same
 * flag. The crest stays fictional and deterministic from the card id.
 */

import { cardFlag, type FlagDesign } from "@/lib/card-nationality";

const FALLBACK_FLAG: FlagDesign = {
  layout: "v",
  colors: ["#1f6f3f", "#f4f4f4", "#c8102e"],
};

function FlagShape({ design }: { design: FlagDesign }) {
  const [a, b, c] = design.colors;

  if (design.layout === "v") {
    return (
      <>
        <rect width="10" height="20" fill={a} />
        <rect x="10" width="10" height="20" fill={b} />
        <rect x="20" width="10" height="20" fill={c} />
      </>
    );
  }

  if (design.layout === "h") {
    return (
      <>
        <rect width="30" height="6.67" fill={a} />
        <rect y="6.67" width="30" height="6.67" fill={b} />
        <rect y="13.34" width="30" height="6.66" fill={c} />
      </>
    );
  }

  if (design.layout === "band") {
    return (
      <>
        <rect width="30" height="20" fill={b} />
        <rect width="30" height="6.5" fill={a} />
        <rect y="13.5" width="30" height="6.5" fill={c} />
      </>
    );
  }

  if (design.layout === "cross") {
    return (
      <>
        <rect width="30" height="20" fill={a} />
        <rect x="9" width="5" height="20" fill={b} />
        <rect y="7.5" width="30" height="5" fill={b} />
        <rect x="10.2" y="8.7" width="2.6" height="2.6" fill={c} />
      </>
    );
  }

  if (design.layout === "disc") {
    return (
      <>
        <rect width="30" height="20" fill={a} />
        <circle cx="15" cy="10" r="5.2" fill={b} />
        <circle cx="15" cy="10" r="2.2" fill={c} />
      </>
    );
  }

  return (
    <>
      <rect width="30" height="20" fill={a} />
      <rect width="12" height="10" fill={c} />
      <path d="m6 2.4 1.1 2.4 2.6.3-1.9 1.8.5 2.5L6 8.2l-2.3 1.2.5-2.5-1.9-1.8 2.6-.3Z" fill={b} />
    </>
  );
}


const CRESTS: [string, string, string][] = [
  ["#092b45", "#20d8ea", "#f5d547"],
  ["#7a1624", "#f2d46b", "#f7f4ea"],
  ["#123f32", "#e9efe7", "#dfb842"],
  ["#292462", "#9ec9ff", "#f6cf4b"],
  ["#171b24", "#f0b72f", "#e8edf2"],
  ["#174f2b", "#f4f0df", "#df3b36"],
  ["#761b49", "#f2bfd8", "#f1d45b"],
  ["#173047", "#42c7dc", "#f1f4ed"],
];

function hash(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function CardEmblems({ id, initials }: { id: string; initials: string }) {
  const h = hash(id);
  const flag = cardFlag(id) ?? FALLBACK_FLAG;
  const crest = CRESTS[(h >> 5) % CRESTS.length] ?? CRESTS[0];
  const crestVariant = (h >> 12) % 6;
  const clipId = `crest-${h}`;

  if (!crest) return null;

  return (
    <span className="creature-card-emblems" aria-hidden="true">
      <svg className="creature-card-flag" viewBox="0 0 30 20">
        <FlagShape design={flag} />
      </svg>

      <svg className="creature-card-crest" viewBox="0 0 32 38">
        <defs>
          <clipPath id={clipId}>
            <path d="M16 2.4 29 6.7v14.5c0 8.1-6.5 12.7-13 14.5C9.5 33.9 3 29.3 3 21.2V6.7Z" />
          </clipPath>
        </defs>
        <path
          d="M16 1.2 30 5.8v15.4c0 8.8-7 13.8-14 15.7C9 35 2 30 2 21.2V5.8Z"
          fill={crest[2]}
          stroke={crest[2]}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.2 28 7.1v13.8c0 7.3-5.8 11.5-12 13.3C9.8 32.4 4 28.2 4 20.9V7.1Z"
          fill={crest[0]}
          stroke={crest[1]}
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <g clipPath={`url(#${clipId})`}>
          {crestVariant === 0 && (
            <>
              <path d="M8 4h5v31H8zm11 0h5v31h-5z" fill={crest[1]} opacity=".9" />
              <circle cx="16" cy="20" r="7.2" fill={crest[0]} stroke={crest[2]} strokeWidth="1" />
            </>
          )}
          {crestVariant === 1 && (
            <>
              <path d="M3 12h26v6H3zm0 12h26v6H3z" fill={crest[1]} opacity=".9" />
              <path d="M16 6.5 19 13l7 .8-5.2 4.7 1.4 6.8-6.2-3.5-6.2 3.5 1.4-6.8L6 13.8l7-.8Z" fill={crest[2]} />
            </>
          )}
          {crestVariant === 2 && (
            <>
              <path d="M2 7 30 34V23L12 4Z" fill={crest[1]} opacity=".92" />
              <path d="M2 18 21 37h8L4 11Z" fill={crest[2]} opacity=".85" />
            </>
          )}
          {crestVariant === 3 && (
            <>
              <path d="M4 7h24v9H4Z" fill={crest[1]} />
              <circle cx="16" cy="23" r="7.5" fill={crest[2]} />
              <path d="m16 17.5 3.3 2.4-1.3 3.9h-4l-1.3-3.9Z" fill={crest[0]} />
            </>
          )}
          {crestVariant === 4 && (
            <>
              <path d="M4 7h24v27H4Z" fill={crest[1]} opacity=".2" />
              <path d="M8 29V13l8-5 8 5v16l-8 5Z" fill={crest[1]} />
              <path d="m16 12 4.5 3v9L16 29l-4.5-5v-9Z" fill={crest[0]} />
            </>
          )}
          {crestVariant === 5 && (
            <>
              <path d="M4 7h24v8H4Z" fill={crest[1]} />
              <path d="M8 27 16 10l8 17-8 7Z" fill={crest[2]} />
              <circle cx="16" cy="22" r="4" fill={crest[0]} stroke={crest[1]} strokeWidth="1" />
            </>
          )}
        </g>
        <path d="M9 8.5h14" stroke={crest[2]} strokeWidth="1" strokeLinecap="round" opacity=".8" />
        {(crestVariant === 0 || crestVariant === 2 || crestVariant === 4) && (
          <text
            x="16"
            y="24"
            textAnchor="middle"
            fill={crest[2]}
            stroke={crest[0]}
            strokeWidth="1.6"
            paintOrder="stroke"
            fontSize="8.8"
            fontWeight="900"
            fontFamily="var(--font-display), sans-serif"
          >
            {initials}
          </text>
        )}
        <path d="m11 4.8 1.2-2.5 1.4 2.1L16 1l2.4 3.4 1.4-2.1L21 4.8" fill={crest[2]} stroke={crest[0]} strokeWidth=".65" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
