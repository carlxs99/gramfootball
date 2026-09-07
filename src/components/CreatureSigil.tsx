import type { Creature, Rarity } from "@/lib/creatures";

const PALETTE: Record<Rarity, [string, string, string]> = {
  common: ["#8b93a8", "#5c6478", "#c3cadb"],
  rare: ["#4f8cff", "#1b3f8f", "#9fc6ff"],
  epic: ["#b061ff", "#5a1e8f", "#e2bfff"],
  mythic: ["#ff5fb0", "#7a1a52", "#ffc3e2"],
  legendary: ["#ffcf4a", "#a15c00", "#fff0b8"],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic original artwork per creature — no external art, no franchises. */
export function CreatureSigil({ creature, hidden = false }: { creature: Creature; hidden?: boolean }) {
  const h = hash(creature.id);
  const [c1, c2, c3] = PALETTE[creature.rarity];
  const arms = 5 + (h % 4);
  const rot = h % 360;
  const petals = Array.from({ length: arms }, (_, i) => (360 / arms) * i);
  const wobble = 12 + (h % 18);
  const eye = 6 + (h % 6);

  return (
    <svg viewBox="0 0 100 133" className="h-full w-full" role="img" aria-label={creature.name}>
      <defs>
        <radialGradient id={`bg-${creature.id}`} cx="50%" cy="40%">
          <stop offset="0%" stopColor={c2} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#120c22" />
        </radialGradient>
        <linearGradient id={`fg-${creature.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c3} />
          <stop offset="55%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="100" height="133" fill={`url(#bg-${creature.id})`} />
      {!hidden && (
        <g transform={`translate(50 62) rotate(${rot})`} fill={`url(#fg-${creature.id})`}>
          {petals.map((a, i) => (
            <ellipse
              key={i}
              rx={7 + (i % 3) * 2}
              ry={26 + wobble - i}
              transform={`rotate(${a}) translate(0 -14)`}
              opacity={0.55 + (i % 3) * 0.15}
            />
          ))}
          <circle r={eye + 8} fill="#120c22" opacity="0.6" />
          <circle r={eye} fill={c3} />
          <circle r={eye / 2.4} fill="#120c22" />
        </g>
      )}
      {hidden && (
        <g transform="translate(50 62)" fill="#ffffff" opacity="0.08">
          <circle r="24" />
          <rect x="-6" y="18" width="12" height="26" rx="6" />
        </g>
      )}
    </svg>
  );
}
