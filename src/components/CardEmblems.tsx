/**
 * Fictional flag + club crest emblems.
 *
 * Deterministic from the card id so a card always shows the same pair.
 * Everything is drawn with SVG: no real federation flag or club badge is used.
 */

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

const CRESTS: [string, string][] = [
  ["#0b2a5b", "#f4c430"],
  ["#7f1d1d", "#f4f4f4"],
  ["#134e4a", "#e2e8f0"],
  ["#312e81", "#a5b4fc"],
  ["#111827", "#f59e0b"],
  ["#14532d", "#f4f4f4"],
  ["#831843", "#fbcfe8"],
  ["#1e293b", "#38bdf8"],
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
  const flag = FLAGS[h % FLAGS.length]!;
  const crest = CRESTS[(h >> 5) % CRESTS.length]!;
  const variant = (h >> 9) % 3;

  return (
    <span className="creature-card-emblems" aria-hidden="true">
      <svg className="creature-card-flag" viewBox="0 0 30 20">
        {variant === 0 ? (
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
      <svg className="creature-card-crest" viewBox="0 0 24 26">
        <path
          d="M12 1 22 4v11c0 6-5 9-10 10C7 24 2 21 2 15V4Z"
          fill={crest[0]}
          stroke={crest[1]}
          strokeWidth="1.6"
        />
        <text
          x="12"
          y="16.5"
          textAnchor="middle"
          fill={crest[1]}
          fontSize="9.5"
          fontWeight="900"
          fontFamily="var(--font-display), sans-serif"
        >
          {initials}
        </text>
      </svg>
    </span>
  );
}
