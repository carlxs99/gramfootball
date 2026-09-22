/**
 * Fictional flag + club crest emblems.
 *
 * Deterministic from the card id so a card always shows the same pair.
 * Everything is drawn with SVG: no real federation flag or club badge is used.
 */

import { REGION_BY_CARD, REGION_FLAGS, type CardRegion } from "@/lib/card-nationality";

const FLAGS: [string, string, string][] = [

  ["#1f6f3f", "#f4f4f4", "#c8102e"],
  ["#0b2a5b", "#f0c419", "#0b2a5b"],
  ["#c8102e", "#f4f4f4", "#1d3f8f"],
  ["#111827", "#c8102e", "#f4c430"],
  ["#0f766e", "#f4f4f4", "#0f766e"],
  ["#5b21b6", "#f4f4f4", "#f59e0b"],
  ["#b45309", "#f4f4f4", "#166534"],
  ["#1e3a8a", "#f4f4f4", "#1e3a8a"],
  ["#047857", "#f4f4f4", "#b91c1c"],
  ["#0369a1", "#f4f4f4", "#f59e0b"],
  ["#7f1d1d", "#f4c430", "#7f1d1d"],
  ["#134e4a", "#e2e8f0", "#0f172a"],
];

type NationalFlag = "china" | "japan" | "south-korea";

const EAST_ASIAN_FLAG: Partial<Record<CardRegion, NationalFlag>> = {
  japan: "japan",
  korea: "south-korea",
  china: "china",
};


function NationalFlag({ nation }: { nation: NationalFlag }) {
  if (nation === "japan") {
    return (
      <>
        <rect width="30" height="20" fill="#f4f4f4" />
        <circle cx="15" cy="10" r="5.4" fill="#bc002d" />
      </>
    );
  }

  if (nation === "south-korea") {
    return (
      <>
        <rect width="30" height="20" fill="#f4f4f4" />
        <path d="M10.7 10a4.3 4.3 0 0 1 8.6 0c-1.1-1.8-3.2-1.8-4.3 0s-3.2 1.8-4.3 0Z" fill="#cd2e3a" />
        <path d="M19.3 10a4.3 4.3 0 0 1-8.6 0c1.1 1.8 3.2 1.8 4.3 0s3.2-1.8 4.3 0Z" fill="#0047a0" />
        <path d="m5.2 5.5 3-2.2m-2.1 3.4 3-2.2m14.7 9.9-3 2.2m2.1-3.4-3 2.2M24 5.5l-3-2.2m2.1 3.4-3-2.2M6 14.5l3 2.2m-2.1-3.4 3 2.2" stroke="#111827" strokeWidth=".8" />
      </>
    );
  }

  return (
    <>
      <rect width="30" height="20" fill="#de2910" />
      <path d="m5.2 3 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L2 5.3 4.2 5Z" fill="#ffde00" />
      <circle cx="11" cy="4" r=".8" fill="#ffde00" />
      <circle cx="13" cy="7" r=".8" fill="#ffde00" />
      <circle cx="12.5" cy="11" r=".8" fill="#ffde00" />
      <circle cx="9.8" cy="13" r=".8" fill="#ffde00" />
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
  const flag = FLAGS[h % FLAGS.length] ?? FLAGS[0];
  const nationalFlag = NATIONAL_FLAG_BY_CARD[id];
  const crest = CRESTS[(h >> 5) % CRESTS.length] ?? CRESTS[0];
  const variant = (h >> 9) % 3;
  const crestVariant = (h >> 12) % 6;
  const clipId = `crest-${h}`;

  if (!flag || !crest) return null;

  return (
    <span className="creature-card-emblems" aria-hidden="true">
      <svg className="creature-card-flag" viewBox="0 0 30 20">
        {nationalFlag ? (
          <NationalFlag nation={nationalFlag} />
        ) : variant === 0 ? (
          <>
            <rect width="10" height="20" fill={flag[0]} />
            <rect x="10" width="10" height="20" fill={flag[1]} />
            <rect x="20" width="10" height="20" fill={flag[2]} />
          </>
        ) : variant === 1 ? (
          <>
            <rect width="30" height="6.67" fill={flag[0]} />
            <rect y="6.67" width="30" height="6.67" fill={flag[1]} />
            <rect y="13.34" width="30" height="6.66" fill={flag[2]} />
          </>
        ) : (
          <>
            <rect width="30" height="20" fill={flag[1]} />
            <rect width="30" height="7" fill={flag[0]} />
            <rect y="13" width="30" height="7" fill={flag[2]} />
          </>
        )}
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
