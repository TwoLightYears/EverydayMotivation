import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  spring,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
} from "remotion";

const inter = "Inter, system-ui, sans-serif";
const playfair = "'Playfair Display', Georgia, serif";

const fontCss = `
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: italic;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2');
}
`;

// ── Palette — taken from the concept's visual brief ─────────────────────
const INK = "#0A0E1A";           // night-sky ink / negative space
const VIOLET = "#7C6EE8";        // plasma edge (nitrogen recombination)
const HOT = "#FFFDF4";           // bolt hot core
const SAND = "#E6B776";          // silica sand
const GLASS = "#C88445";         // molten fulgurite glass

// derived tints/shades
const INK_DEEP = "#05070E";
const CLOUD = "#161B2E";
const VIOLET_SOFT = "#3E3577";
const GLASS_DARK = "#5A3B22";
const GRAY = "#8A8F99";

// ── Bolt path ───────────────────────────────────────────────────────────
// In a coordinate space anchored at the strike point (0,0). Positive Y is down.
// The bolt descends from y=-540 to y=0 (impact) with lateral jitter.
type Pt = { x: number; y: number };
const BOLT_TOP: Pt = { x: -18, y: -540 };
const BOLT: Pt[] = [
  { x: -18, y: -540 },
  { x: -4, y: -480 },
  { x: -30, y: -430 },
  { x: -8, y: -370 },
  { x: -38, y: -310 },
  { x: -12, y: -250 },
  { x: 16, y: -195 },
  { x: -6, y: -140 },
  { x: -22, y: -95 },
  { x: 6, y: -50 },
  { x: 0, y: 0 },
];

// Short forks off the bolt (each is a small polyline branching to the side)
const BOLT_FORKS: Pt[][] = [
  [
    { x: -30, y: -430 },
    { x: -60, y: -410 },
    { x: -90, y: -370 },
    { x: -110, y: -350 },
  ],
  [
    { x: -12, y: -250 },
    { x: 14, y: -230 },
    { x: 44, y: -220 },
    { x: 66, y: -200 },
  ],
  [
    { x: -22, y: -95 },
    { x: -46, y: -85 },
    { x: -70, y: -60 },
  ],
];

// ── Fulgurite branches (below impact, positive Y down) ─────────────────
// Each branch is a polyline in strike-local coords, starting at (0,0) or
// branching off a previous point. The trunk goes straight down; secondary
// roots split off with irregular jitter to look like flash-frozen tube glass.
const FULG_TRUNK: Pt[] = [
  { x: 0, y: 0 },
  { x: -6, y: 30 },
  { x: 8, y: 62 },
  { x: -4, y: 96 },
  { x: 12, y: 130 },
  { x: -2, y: 168 },
  { x: 10, y: 208 },
];
// Branches lean predominantly downward — gravity-following, not spider-legs.
const FULG_BRANCHES: { from: Pt; pts: Pt[]; w: number }[] = [
  {
    from: { x: 0, y: 0 },
    w: 9,
    pts: [
      { x: 0, y: 0 },
      { x: -14, y: 30 },
      { x: -30, y: 68 },
      { x: -44, y: 108 },
      { x: -55, y: 152 },
      { x: -60, y: 198 },
    ],
  },
  {
    from: { x: 0, y: 0 },
    w: 9,
    pts: [
      { x: 0, y: 0 },
      { x: 16, y: 32 },
      { x: 34, y: 68 },
      { x: 46, y: 112 },
      { x: 54, y: 156 },
      { x: 58, y: 202 },
    ],
  },
  {
    from: { x: -30, y: 68 },
    w: 5,
    pts: [
      { x: -30, y: 68 },
      { x: -46, y: 108 },
      { x: -60, y: 150 },
      { x: -72, y: 190 },
    ],
  },
  {
    from: { x: 34, y: 68 },
    w: 5,
    pts: [
      { x: 34, y: 68 },
      { x: 52, y: 108 },
      { x: 66, y: 152 },
      { x: 76, y: 194 },
    ],
  },
  {
    from: { x: 8, y: 62 },
    w: 4,
    pts: [
      { x: 8, y: 62 },
      { x: 20, y: 100 },
      { x: 28, y: 146 },
      { x: 30, y: 190 },
    ],
  },
  {
    from: { x: -4, y: 96 },
    w: 4,
    pts: [
      { x: -4, y: 96 },
      { x: -18, y: 132 },
      { x: -28, y: 172 },
      { x: -34, y: 210 },
    ],
  },
  {
    from: { x: 12, y: 130 },
    w: 3,
    pts: [
      { x: 12, y: 130 },
      { x: 4, y: 168 },
      { x: -6, y: 202 },
    ],
  },
];

// ── helpers ─────────────────────────────────────────────────────────────
const polylinePath = (pts: Pt[]): string =>
  pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

const polylineLen = (pts: Pt[]): number => {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return d;
};

// A gently curved cubic between two points, biased by a lateral wobble.
const smoothPolyPath = (pts: Pt[]): string => {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    d += ` Q ${mx.toFixed(2)} ${my.toFixed(2)} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
};

// Ejecta particles around the impact point — deterministic seeded scatter.
const EJECTA: { angle: number; dist: number; size: number; delay: number }[] =
  Array.from({ length: 26 }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const angle = -Math.PI + Math.PI * r; // -π..0 (upper half only? no — full)
    const angleReal = (i / 26) * Math.PI * 2 + r * 0.6;
    return {
      angle: angleReal,
      dist: 22 + r * 90,
      size: 1 + r * 2.4,
      delay: 0.02 + r * 0.15,
    };
  });

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Layout anchors (portrait 1080 × 1350)
  const STRIKE_X = 340;
  const HORIZON_Y = 720;

  // ── Timing ────────────────────────────────────────────────────────────
  // 0.00s  → flash + bolt begins drawing
  // 0.35s  → bolt reaches ground
  // 0.35s+ → halo bloom, ejecta bursts, fulgurite starts growing
  // ~2.0s  → all glass settled
  // 2s → 5s: steady state, faint pulse
  const FLASH_END = 0.18; // seconds
  const BOLT_END = 0.42;
  const FULG_END = 2.0;

  const tSec = frame / fps;

  const boltT = interpolate(tSec, [0.02, BOLT_END], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const flashT = interpolate(tSec, [0, FLASH_END, FLASH_END + 0.35], [0, 1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const haloT = interpolate(tSec, [BOLT_END - 0.05, BOLT_END + 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fulgT = interpolate(tSec, [BOLT_END, FULG_END], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ember pulse loop (post-strike, subtle)
  const emberCycle = ((frame % (fps * 3)) / (fps * 3)); // 0..1
  const ember = 0.55 + 0.45 * Math.sin(emberCycle * Math.PI * 2);

  // Type lockup animations
  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 0.9, fps * 1.7],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const roleOpacity = interpolate(
    frame,
    [fps * 0.2, fps * 0.8],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Bolt draw progress via strokeDashoffset
  const boltLen = polylineLen(BOLT);
  const boltDash = boltLen * (1 - boltT);

  // Fork draw progress — start after main bolt has passed their origin
  const forkProgress = (i: number): { len: number; offset: number } => {
    const origin = BOLT_FORKS[i][0];
    const idx = BOLT.findIndex((p) => p.x === origin.x && p.y === origin.y);
    const yFraction = idx >= 0 ? (BOLT[idx].y - BOLT[0].y) / (BOLT[BOLT.length - 1].y - BOLT[0].y) : 0.5;
    const forkStart = 0.02 + (BOLT_END - 0.02) * yFraction;
    const forkT = interpolate(tSec, [forkStart, forkStart + 0.12], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const len = polylineLen(BOLT_FORKS[i]);
    return { len, offset: len * (1 - forkT) };
  };

  // Fulgurite branch growth — trunk first, siblings staggered by distance below strike.
  type Grown = { len: number; offset: number; op: number };
  const grownBranch = (pts: Pt[], startDelayFrac: number): Grown => {
    const startT = BOLT_END + 0.02 + startDelayFrac * (FULG_END - BOLT_END);
    const endT = startT + 0.55;
    const g = interpolate(tSec, [startT, endT], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opacity = interpolate(tSec, [startT - 0.05, startT + 0.15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const len = polylineLen(pts);
    return { len, offset: len * (1 - g), op: opacity };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Base scene: sky, ground, glow ─────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK_DEEP} />
            <stop offset="55%" stopColor={INK} />
            <stop offset="100%" stopColor={CLOUD} />
          </linearGradient>
          <linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B2914" />
            <stop offset="35%" stopColor="#2A1C0E" />
            <stop offset="100%" stopColor="#120B05" />
          </linearGradient>
          <radialGradient id="cloudGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={VIOLET_SOFT} stopOpacity={0.55} />
            <stop offset="100%" stopColor={VIOLET_SOFT} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="impactHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HOT} stopOpacity={0.95} />
            <stop offset="30%" stopColor={VIOLET} stopOpacity={0.55} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="flash" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={HOT} stopOpacity={0.35} />
            <stop offset="40%" stopColor={VIOLET} stopOpacity={0.12} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
          </radialGradient>

          <filter id="boltGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b1" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* Sky */}
        <rect x={0} y={0} width={1080} height={HORIZON_Y} fill="url(#sky)" />

        {/* Atmospheric cloud base — a low, extra-wide, extremely soft band
            of luminance across the top of the sky. No hard silhouettes. */}
        <g filter="url(#softGlow)" opacity={0.9}>
          <ellipse cx={280} cy={165} rx={340} ry={26} fill={CLOUD} opacity={0.55} />
          <ellipse cx={560} cy={150} rx={420} ry={22} fill="#1C2238" opacity={0.5} />
          <ellipse cx={820} cy={175} rx={320} ry={24} fill="#181D33" opacity={0.5} />
          <ellipse cx={200} cy={110} rx={260} ry={16} fill="#12172A" opacity={0.7} />
          <ellipse cx={720} cy={100} rx={340} ry={14} fill="#12172A" opacity={0.7} />
        </g>
        {/* Faint internal luminescence at cloud origin of the bolt */}
        <circle
          cx={STRIKE_X - 18}
          cy={170}
          r={110}
          fill="url(#cloudGlow)"
          opacity={0.55 + 0.45 * flashT}
        />
        {/* Wispy horizontal cirrus striations across the sky */}
        <g stroke={VIOLET_SOFT} strokeWidth={1} strokeOpacity={0.12}>
          {[90, 130, 220, 280, 380, 470, 560].map((y, i) => (
            <line
              key={i}
              x1={80 + (i * 37) % 60}
              y1={y}
              x2={1000 - ((i * 53) % 90)}
              y2={y + (i % 2 === 0 ? 3 : -3)}
            />
          ))}
        </g>

        {/* Whole-sky flash (only visible during the flash window) */}
        <rect
          x={0}
          y={0}
          width={1080}
          height={HORIZON_Y}
          fill="url(#flash)"
          opacity={flashT * 0.85}
        />

        {/* Earth ground */}
        <rect
          x={0}
          y={HORIZON_Y}
          width={1080}
          height={1350 - HORIZON_Y}
          fill="url(#earth)"
        />

        {/* Sand strata: horizontal lines above the deeper subsoil */}
        <g stroke={GLASS_DARK} strokeWidth={1} opacity={0.35}>
          {[8, 22, 40, 62, 90, 128].map((dy, i) => (
            <line
              key={i}
              x1={0}
              y1={HORIZON_Y + dy}
              x2={1080}
              y2={HORIZON_Y + dy}
              opacity={0.9 - i * 0.12}
            />
          ))}
        </g>

        {/* Horizon line + draftsman tick marks (subtle) */}
        <line
          x1={60}
          y1={HORIZON_Y}
          x2={1020}
          y2={HORIZON_Y}
          stroke={SAND}
          strokeOpacity={0.5}
          strokeWidth={1}
        />
        <g stroke={SAND} strokeOpacity={0.35} strokeWidth={1}>
          {Array.from({ length: 33 }).map((_, i) => (
            <line
              key={i}
              x1={60 + i * 30}
              y1={HORIZON_Y}
              x2={60 + i * 30}
              y2={HORIZON_Y + (i % 5 === 0 ? 8 : 4)}
            />
          ))}
        </g>

        {/* ── The bolt (drawn from top, into the ground) ─────────────── */}
        <g transform={`translate(${STRIKE_X}, ${HORIZON_Y})`}>
          {/* Outer plasma envelope */}
          <path
            d={smoothPolyPath(BOLT)}
            stroke={VIOLET}
            strokeWidth={22}
            strokeOpacity={0.28}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#softGlow)"
            strokeDasharray={boltLen}
            strokeDashoffset={boltDash}
          />
          {/* Inner violet channel */}
          <path
            d={smoothPolyPath(BOLT)}
            stroke={VIOLET}
            strokeWidth={9}
            strokeOpacity={0.85}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#boltGlow)"
            strokeDasharray={boltLen}
            strokeDashoffset={boltDash}
          />
          {/* Hot core */}
          <path
            d={smoothPolyPath(BOLT)}
            stroke={HOT}
            strokeWidth={3.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={boltLen}
            strokeDashoffset={boltDash}
          />

          {/* Forks (drawn once main bolt has descended past their origin) */}
          {BOLT_FORKS.map((fork, i) => {
            const { len, offset } = forkProgress(i);
            return (
              <g key={`fork-${i}`}>
                <path
                  d={smoothPolyPath(fork)}
                  stroke={VIOLET}
                  strokeWidth={6}
                  strokeOpacity={0.45}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#softGlow)"
                  strokeDasharray={len}
                  strokeDashoffset={offset}
                />
                <path
                  d={smoothPolyPath(fork)}
                  stroke={HOT}
                  strokeWidth={1.6}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={offset}
                />
              </g>
            );
          })}

          {/* ── Impact halo ───────────────────────────────────────── */}
          <g opacity={haloT}>
            <circle cx={0} cy={0} r={190} fill="url(#impactHalo)" />
            <circle cx={0} cy={0} r={28} fill={HOT} opacity={0.85 * ember} />
            <circle cx={0} cy={0} r={12} fill="#FFFFFF" />
            {/* Shock ring (expands with halo) */}
            <circle
              cx={0}
              cy={0}
              r={30 + 90 * haloT}
              fill="none"
              stroke={VIOLET}
              strokeWidth={1.6}
              strokeOpacity={(1 - haloT) * 0.8}
            />
          </g>

          {/* Ejecta particles — bright sand launched upward */}
          <g opacity={haloT}>
            {EJECTA.map((p, i) => {
              const dist = p.dist * haloT;
              const x = Math.cos(p.angle) * dist;
              const y = Math.sin(p.angle) * dist * 0.6 - 4 * haloT;
              const alpha = Math.max(0, 1 - haloT * 0.9);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={p.size}
                  fill={SAND}
                  opacity={alpha}
                />
              );
            })}
          </g>

          {/* ── Fulgurite (below the impact, growing downward) ───── */}
          {/* Trunk */}
          {(() => {
            const g = grownBranch(FULG_TRUNK, 0.0);
            return (
              <g opacity={g.op}>
                {/* Molten outer aura along whole trunk (fades further out) */}
                <path
                  d={smoothPolyPath(FULG_TRUNK)}
                  stroke={GLASS}
                  strokeWidth={22}
                  strokeOpacity={0.35}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#softGlow)"
                  strokeDasharray={g.len}
                  strokeDashoffset={g.offset}
                />
                {/* Glass tube outer wall */}
                <path
                  d={smoothPolyPath(FULG_TRUNK)}
                  stroke={GLASS_DARK}
                  strokeWidth={16}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={g.len}
                  strokeDashoffset={g.offset}
                />
                {/* Inner molten core */}
                <path
                  d={smoothPolyPath(FULG_TRUNK)}
                  stroke={GLASS}
                  strokeWidth={8}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={g.len}
                  strokeDashoffset={g.offset}
                />
                {/* White-hot highlight (only near root, fades with distance) */}
                <path
                  d={smoothPolyPath(FULG_TRUNK.slice(0, 3))}
                  stroke={HOT}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.9 * ember}
                />
              </g>
            );
          })()}

          {/* Branches (staggered) */}
          {FULG_BRANCHES.map((b, i) => {
            const delay = 0.08 + i * 0.08;
            const g = grownBranch(b.pts, delay);
            const isMajor = b.w >= 8;
            return (
              <g key={`fb-${i}`} opacity={g.op}>
                <path
                  d={smoothPolyPath(b.pts)}
                  stroke={GLASS}
                  strokeWidth={b.w + 12}
                  strokeOpacity={0.22}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#softGlow)"
                  strokeDasharray={g.len}
                  strokeDashoffset={g.offset}
                />
                <path
                  d={smoothPolyPath(b.pts)}
                  stroke={GLASS_DARK}
                  strokeWidth={b.w + 4}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={g.len}
                  strokeDashoffset={g.offset}
                />
                <path
                  d={smoothPolyPath(b.pts)}
                  stroke={GLASS}
                  strokeWidth={Math.max(2, b.w - 2)}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={g.len}
                  strokeDashoffset={g.offset}
                />
                {isMajor && (
                  <path
                    d={smoothPolyPath(b.pts.slice(0, 3))}
                    stroke={HOT}
                    strokeWidth={1.2}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.6 * ember}
                  />
                )}
              </g>
            );
          })}

          {/* Root-tip cooling dots */}
          {FULG_BRANCHES.map((b, i) => {
            const tip = b.pts[b.pts.length - 1];
            const g = grownBranch(b.pts, 0.08 + i * 0.08);
            const settled = g.offset < 0.5;
            return (
              <circle
                key={`tip-${i}`}
                cx={tip.x}
                cy={tip.y}
                r={2.4}
                fill={GLASS}
                opacity={settled ? 0.85 : 0}
              />
            );
          })}

          {/* Temperature callout — a clean horizontal leader threaded through
              the fork-free band between the mid-right fork (y=-200) and the
              low-left fork (y=-60). */}
          <g
            opacity={interpolate(tSec, [BOLT_END + 0.15, BOLT_END + 0.7], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <line
              x1={-18}
              y1={-140}
              x2={-270}
              y2={-140}
              stroke={HOT}
              strokeOpacity={0.5}
              strokeWidth={1}
            />
            <circle cx={-18} cy={-140} r={2.5} fill={HOT} opacity={0.85} />
            <text
              x={-270}
              y={-150}
              fill={HOT}
              fontFamily={inter}
              fontSize={14}
              fontWeight={600}
              letterSpacing={3.6}
              textAnchor="start"
            >
              ≈ 30,000 K
            </text>
            <text
              x={-270}
              y={-128}
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              fontWeight={500}
              letterSpacing={2.6}
              textAnchor="start"
            >
              RETURN-STROKE CHANNEL
            </text>
            <text
              x={-270}
              y={-112}
              fill={GRAY}
              fontFamily={inter}
              fontSize={9}
              fontWeight={500}
              letterSpacing={2.2}
              textAnchor="start"
              opacity={0.75}
            >
              5× THE SUN&apos;S SURFACE
            </text>
          </g>

          {/* Depth label under the fulgurite */}
          <g
            opacity={interpolate(tSec, [FULG_END - 0.3, FULG_END + 0.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <line
              x1={-155}
              y1={220}
              x2={165}
              y2={220}
              stroke={SAND}
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
            <text
              x={160}
              y={236}
              textAnchor="end"
              fill={SAND}
              fontFamily={inter}
              fontSize={10}
              fontWeight={500}
              letterSpacing={2.6}
              opacity={0.8}
            >
              FULGURITE · TO 4 M IN THE WILD
            </text>
          </g>
        </g>
      </svg>

      {/* ── Top metadata band ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: VIOLET }}>2026 · 09 · 05</span>
      </div>

      {/* ── Type lockup: right column, top-anchored ─────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 600,
          top: 220,
          width: 420,
          opacity: roleOpacity,
        }}
      >
        <div
          style={{
            color: VIOLET,
            fontFamily: inter,
            fontSize: 12,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Glassblower</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 600,
          top: 260,
          width: 440,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [14, 0])}px)`,
        }}
      >
        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 96,
            lineHeight: 0.94,
            letterSpacing: -2.2,
            fontStyle: "italic",
          }}
        >
          The
          <br />
          lightning
          <br />
          glassblower.
        </div>
      </div>

      {/* ── Hook line below the scene, full-width ─────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 970,
          opacity: hookOpacity,
        }}
      >
        <div
          style={{
            width: 60,
            height: 2,
            background: VIOLET,
            marginBottom: 22,
          }}
        />
        <div
          style={{
            color: "#DCDEE4",
            fontFamily: inter,
            fontSize: 20,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 920,
          }}
        >
          The channel of a return-stroke bolt reaches roughly{" "}
          <span style={{ color: HOT, fontWeight: 600 }}>30,000&nbsp;K</span> — about
          five times hotter than the surface of the Sun — and where it enters
          silica-rich sand it fuses the grains along its exact path into a hollow,
          branching tube of glass:{" "}
          <span
            style={{ color: GLASS, fontWeight: 600, fontStyle: "italic" }}
          >
            fulgurite
          </span>
          .
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Uman · Lightning Discharge, 2001 · Pasek et al. 2013</span>
        <span>
          <span style={{ color: GLASS }}>●</span> Sand fused in milliseconds
        </span>
      </div>
    </AbsoluteFill>
  );
};
