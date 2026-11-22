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

// Palette — taken from the concept's visual brief
const INK = "#0E0C14";          // storm ink (sky/background)
const INK_DEEP = "#060409";     // deepest shade of ink (vignette floor)
const SKY_MID = "#141220";      // storm cloud mid
const BOLT = "#B9D4FF";         // lightning blue-white
const BOLT_HOT = "#F2F6FF";     // bolt white core
const GLOW = "#FFE9A8";         // plasma / forge glow
const SAND = "#D4B084";         // sand tan (surface)
const SAND_LIT = "#E8CFA3";     // sand highlight
const SAND_DARK = "#8A6A42";    // shaded sand lip
const EARTH = "#5E3C22";        // buried earth / deep glass shadow
const EARTH_DEEP = "#2E1D11";   // deepest earth tone
const GRAY = "#8A8F99";         // type secondary / rules
const BORDER = "#2B313C";       // frame rule
const CROP = GLOW;              // crop mark color

// Page frame rect (the drafting plate)
const FRAME = { x: 60, y: 130, w: 960, h: 711 };

// Hero scene interior coordinate system (matches the FRAME box scaled 1:1
// by using absolute page coords inside the frame).
// The horizon cuts the drafting plate at y = HORIZON.
const HORIZON_Y = 490; // within 130..841; sky 130→490, ground 490→841
const IMPACT: [number, number] = [612, HORIZON_Y];

// ── Lightning path (polyline of jagged segments from top edge to IMPACT) ──
const BOLT_POINTS: [number, number][] = [
  [690, 132],
  [648, 180],
  [690, 232],
  [636, 286],
  [672, 332],
  [612, 378],
  [648, 420],
  [600, 452],
  [630, 478],
  IMPACT,
];

// Tiny side-forks that branch off the main bolt
const BOLT_FORKS: [[number, number][], number][] = [
  [
    [[648, 180], [608, 210], [580, 258]],
    0.55,
  ],
  [
    [[636, 286], [672, 315], [700, 330]],
    0.45,
  ],
  [
    [[672, 332], [716, 358], [736, 404]],
    0.4,
  ],
  [
    [[612, 378], [566, 400], [534, 442]],
    0.55,
  ],
];

// ── Fulgurite branching tree (below ground) ───────────────────────────────
type Branch = {
  from: [number, number];
  to: [number, number];
  width: number;
  depth: number; // 0 = trunk (hottest), higher = further out
  delay: number; // 0..1 into the extrusion window
};

const FULGURITE: Branch[] = [
  // Trunk — descends with irregular zig-zag mirroring the bolt's language,
  // with an overall drift toward screen-left (not purely vertical) to break
  // axial symmetry with the bolt.
  { from: IMPACT, to: [608, 528], width: 16, depth: 0, delay: 0.0 },
  { from: [608, 528], to: [585, 562], width: 14, depth: 0, delay: 0.05 },
  { from: [585, 562], to: [600, 598], width: 13, depth: 0, delay: 0.1 },
  { from: [600, 598], to: [572, 634], width: 12, depth: 0, delay: 0.15 },
  { from: [572, 634], to: [588, 674], width: 11, depth: 0, delay: 0.2 },
  { from: [588, 674], to: [560, 712], width: 10, depth: 0, delay: 0.25 },
  { from: [560, 712], to: [575, 752], width: 9, depth: 0, delay: 0.3 },
  { from: [575, 752], to: [546, 790], width: 8, depth: 0, delay: 0.35 },
  { from: [546, 790], to: [562, 824], width: 6, depth: 0, delay: 0.4 },

  // Primary branches — asymmetric: more mass to the right (deeper structure)
  { from: [608, 528], to: [532, 544], width: 7, depth: 1, delay: 0.12 },
  { from: [608, 528], to: [688, 554], width: 8, depth: 1, delay: 0.14 },
  { from: [585, 562], to: [665, 600], width: 7, depth: 1, delay: 0.2 },
  { from: [600, 598], to: [690, 620], width: 7, depth: 1, delay: 0.26 },
  { from: [572, 634], to: [500, 658], width: 6, depth: 1, delay: 0.3 },
  { from: [572, 634], to: [655, 676], width: 6.5, depth: 1, delay: 0.32 },
  { from: [588, 674], to: [700, 702], width: 6, depth: 1, delay: 0.36 },
  { from: [560, 712], to: [482, 740], width: 5.5, depth: 1, delay: 0.42 },
  { from: [575, 752], to: [660, 780], width: 5, depth: 1, delay: 0.46 },
  { from: [546, 790], to: [478, 816], width: 4.5, depth: 1, delay: 0.5 },

  // Secondary branches — more irregular angles, no mirroring
  { from: [532, 544], to: [476, 572], width: 3.5, depth: 2, delay: 0.22 },
  { from: [688, 554], to: [752, 582], width: 4.5, depth: 2, delay: 0.24 },
  { from: [665, 600], to: [730, 614], width: 4, depth: 2, delay: 0.3 },
  { from: [690, 620], to: [760, 648], width: 4, depth: 2, delay: 0.34 },
  { from: [500, 658], to: [438, 684], width: 3.5, depth: 2, delay: 0.4 },
  { from: [655, 676], to: [728, 704], width: 3.5, depth: 2, delay: 0.42 },
  { from: [700, 702], to: [778, 724], width: 4, depth: 2, delay: 0.46 },
  { from: [482, 740], to: [416, 770], width: 3, depth: 2, delay: 0.52 },
  { from: [660, 780], to: [736, 806], width: 3.5, depth: 2, delay: 0.56 },
  { from: [478, 816], to: [418, 836], width: 2.8, depth: 2, delay: 0.6 },

  // Tertiary tips (the hair-fine ends) — short, varied
  { from: [476, 572], to: [438, 592], width: 2.2, depth: 3, delay: 0.3 },
  { from: [752, 582], to: [816, 594], width: 2.5, depth: 3, delay: 0.32 },
  { from: [752, 582], to: [798, 622], width: 2, depth: 3, delay: 0.34 },
  { from: [730, 614], to: [798, 608], width: 2.2, depth: 3, delay: 0.38 },
  { from: [760, 648], to: [826, 666], width: 2.5, depth: 3, delay: 0.42 },
  { from: [438, 684], to: [388, 710], width: 2, depth: 3, delay: 0.48 },
  { from: [728, 704], to: [788, 728], width: 2.2, depth: 3, delay: 0.5 },
  { from: [778, 724], to: [838, 744], width: 2.5, depth: 3, delay: 0.54 },
  { from: [416, 770], to: [368, 794], width: 1.8, depth: 3, delay: 0.6 },
  { from: [736, 806], to: [800, 822], width: 2, depth: 3, delay: 0.64 },
  { from: [418, 836], to: [374, 846], width: 1.6, depth: 3, delay: 0.68 },

  // Near-surface outward crawl (where heat vented laterally)
  { from: [532, 544], to: [508, 522], width: 2.2, depth: 3, delay: 0.28 },
  { from: [688, 554], to: [716, 526], width: 2.6, depth: 3, delay: 0.3 },
  { from: [665, 600], to: [682, 572], width: 2, depth: 3, delay: 0.35 },
];

// Curved path with a tiny perpendicular bend derived from a hash
const hashSeed = (a: number, b: number, c: number, d: number): number => {
  let h = 2166136261;
  for (const v of [a, b, c, d]) {
    h = ((h ^ Math.floor(v * 1000)) * 16777619) >>> 0;
  }
  return (h % 1000) / 1000;
};

const branchPath = (b: Branch): string => {
  const [ax, ay] = b.from;
  const [bx, by] = b.to;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const seed = hashSeed(ax, ay, bx, by);
  const bend = (seed - 0.5) * 0.22 * len;
  const mx = (ax + bx) / 2 + nx * bend;
  const my = (ay + by) / 2 + ny * bend;
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
};

const branchLen = (b: Branch): number =>
  Math.hypot(b.to[0] - b.from[0], b.to[1] - b.from[1]) * 1.08;

// Mix two hex colors by t in [0,1]
const mixHex = (a: string, b: string, t: number): string => {
  const pa = [
    parseInt(a.slice(1, 3), 16),
    parseInt(a.slice(3, 5), 16),
    parseInt(a.slice(5, 7), 16),
  ];
  const pb = [
    parseInt(b.slice(1, 3), 16),
    parseInt(b.slice(3, 5), 16),
    parseInt(b.slice(5, 7), 16),
  ];
  const out = pa.map((c, i) => Math.round(c + (pb[i] - c) * t));
  return (
    "#" +
    out
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
  );
};

// Deterministic "sand grain" points in the ground zone
const SAND_GRAINS: [number, number, number][] = (() => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 180; i++) {
    const s = hashSeed(i + 1, i * 13 + 7, i * 29 + 3, i * 41 + 5);
    const s2 = hashSeed(i * 17 + 11, i * 23 + 2, i * 31 + 5, i * 37 + 9);
    const x = FRAME.x + 8 + s * (FRAME.w - 16);
    const y = HORIZON_Y + 6 + s2 * (FRAME.y + FRAME.h - HORIZON_Y - 16);
    const r = 0.6 + hashSeed(i, i + 2, i + 5, i + 9) * 1.4;
    pts.push([x, y, r]);
  }
  return pts;
})();

// Polyline of the main bolt as an SVG path with dasharray-based reveal
const boltPathStr = (pts: [number, number][]): string => {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  return d;
};
const polylineLen = (pts: [number, number][]): number => {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total * 1.05;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phase timings (fps 30, 150 frames = 5s loop) ────────────────────
  // 0.0s        : scene fades up
  // 0.7–1.3s    : lightning descends & flashes
  // 1.3–1.7s    : impact flash
  // 1.4–3.6s    : fulgurite extrudes in delay order
  // 2.8–4.2s    : forge-glow cools along branches
  // 4.2–5.0s    : held frame (steady state)
  const sceneFadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const boltProgress = spring({
    frame: frame - fps * 0.7,
    fps,
    config: { damping: 18, stiffness: 140, mass: 0.7 },
  });
  const boltFlash = interpolate(
    frame,
    [fps * 1.25, fps * 1.4, fps * 1.9, fps * 2.4],
    [0, 1, 0.3, 0.12],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const impactFlash = interpolate(
    frame,
    [fps * 1.3, fps * 1.5, fps * 2.2],
    [0, 1, 0],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // 0 → 1 across the fulgurite extrusion window
  const extrude = interpolate(frame, [fps * 1.4, fps * 3.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // 0 → 1 across the cool-down window
  const cool = interpolate(frame, [fps * 2.8, fps * 4.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bolt dash reveal
  const boltTotal = polylineLen(BOLT_POINTS);
  const boltDash = boltTotal * (1 - boltProgress);

  // Fulgurite: each branch's "grown" value and color
  const branchStates = FULGURITE.map((b) => {
    const window = 0.22; // each branch grows across ~22% of extrude time
    const local = (extrude - b.delay) / window;
    const g = Math.max(0, Math.min(1, local));
    const eased = 1 - Math.pow(1 - g, 3);

    // Cooling: deeper branches stay hotter longer; tips cool first
    const tipBias = b.depth * 0.18;
    const localCool = Math.min(1, Math.max(0, cool - 0.0 + tipBias));
    // Hot color → cool glass tone along cool axis. Final cooled state
    // stays noticeably lighter and more amber than surrounding earth so
    // the fulgurite reads clearly against the brown ground.
    const hot = mixHex(GLOW, "#FFFFFF", 0.1);
    const warm = mixHex(GLOW, "#C98457", 0.55);
    const cold = "#9C6033"; // amber-brown glass; lighter than EARTH
    const cur =
      localCool < 0.5
        ? mixHex(hot, warm, localCool * 2)
        : mixHex(warm, cold, (localCool - 0.5) * 2);
    return { g: eased, color: cur };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
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
          opacity: sceneFadeIn,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: GLOW }}>2026 · 11 · 22</span>
      </div>

      {/* Drafting plate */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky gradient (storm) */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK_DEEP} />
            <stop offset="55%" stopColor={SKY_MID} />
            <stop offset="100%" stopColor={INK} />
          </linearGradient>

          {/* Ground gradient (sand surface → buried dark) */}
          <linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAND} />
            <stop offset="18%" stopColor={mixHex(SAND, EARTH, 0.35)} />
            <stop offset="55%" stopColor={EARTH} />
            <stop offset="100%" stopColor={EARTH_DEEP} />
          </linearGradient>

          {/* Horizon haze: darker lip at the ground line */}
          <linearGradient id="lip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAND_LIT} stopOpacity={0.9} />
            <stop offset="55%" stopColor={SAND_DARK} stopOpacity={1} />
            <stop offset="100%" stopColor={SAND_DARK} stopOpacity={0} />
          </linearGradient>

          {/* Bolt glow */}
          <filter id="bolt-glow" x="-30%" y="-10%" width="160%" height="130%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="fulg-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Impact flash */}
          <radialGradient id="impact-flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BOLT_HOT} stopOpacity={0.95} />
            <stop offset="40%" stopColor={GLOW} stopOpacity={0.55} />
            <stop offset="100%" stopColor={GLOW} stopOpacity={0} />
          </radialGradient>

          {/* Soft sky-wide flash from the bolt */}
          <radialGradient id="sky-flash" cx="60%" cy="30%" r="55%">
            <stop offset="0%" stopColor={BOLT} stopOpacity={0.35} />
            <stop offset="55%" stopColor={BOLT} stopOpacity={0.08} />
            <stop offset="100%" stopColor={BOLT} stopOpacity={0} />
          </radialGradient>

          {/* Clip region for the plate */}
          <clipPath id="plate-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
              rx={2}
            />
          </clipPath>
        </defs>

        {/* ── Plate contents ──────────────────────────────────────── */}
        <g clipPath="url(#plate-clip)">
          {/* Sky */}
          <rect
            x={FRAME.x}
            y={FRAME.y}
            width={FRAME.w}
            height={HORIZON_Y - FRAME.y}
            fill="url(#sky)"
          />

          {/* Soft cloud blobs (hand-placed) */}
          <g opacity={0.35}>
            <ellipse
              cx={280}
              cy={225}
              rx={190}
              ry={28}
              fill={SKY_MID}
              opacity={0.9}
            />
            <ellipse
              cx={780}
              cy={200}
              rx={220}
              ry={26}
              fill={SKY_MID}
              opacity={0.9}
            />
            <ellipse
              cx={520}
              cy={260}
              rx={260}
              ry={32}
              fill={SKY_MID}
              opacity={0.7}
            />
            <ellipse
              cx={200}
              cy={340}
              rx={170}
              ry={22}
              fill={mixHex(SKY_MID, INK, 0.3)}
              opacity={0.8}
            />
            <ellipse
              cx={870}
              cy={350}
              rx={190}
              ry={22}
              fill={mixHex(SKY_MID, INK, 0.3)}
              opacity={0.8}
            />
          </g>

          {/* Sky flash from the bolt (pulses with strike) */}
          <rect
            x={FRAME.x}
            y={FRAME.y}
            width={FRAME.w}
            height={HORIZON_Y - FRAME.y}
            fill="url(#sky-flash)"
            opacity={boltFlash}
          />

          {/* Ground */}
          <rect
            x={FRAME.x}
            y={HORIZON_Y}
            width={FRAME.w}
            height={FRAME.y + FRAME.h - HORIZON_Y}
            fill="url(#earth)"
          />

          {/* Horizon lip highlight */}
          <rect
            x={FRAME.x}
            y={HORIZON_Y - 10}
            width={FRAME.w}
            height={28}
            fill="url(#lip)"
            opacity={0.85}
          />

          {/* Thin horizon line */}
          <line
            x1={FRAME.x}
            y1={HORIZON_Y}
            x2={FRAME.x + FRAME.w}
            y2={HORIZON_Y}
            stroke={SAND_LIT}
            strokeOpacity={0.55}
            strokeWidth={1}
          />

          {/* Sand grains (deterministic stipple) */}
          <g>
            {SAND_GRAINS.map(([x, y, r], i) => {
              const depth = (y - HORIZON_Y) / (FRAME.y + FRAME.h - HORIZON_Y);
              const c = mixHex(SAND_LIT, EARTH_DEEP, Math.min(1, depth * 1.2));
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={c}
                  opacity={0.55 - depth * 0.35}
                />
              );
            })}
          </g>

          {/* Falling rain streaks in the sky — fine, atmospheric */}
          <g stroke={BOLT} strokeOpacity={0.14} strokeWidth={1}>
            {Array.from({ length: 38 }).map((_, i) => {
              const s = hashSeed(i + 100, i * 7, i * 13, i * 19);
              const s2 = hashSeed(i * 11, i * 17 + 3, i + 23, i + 29);
              const x = FRAME.x + 10 + s * (FRAME.w - 20);
              const y = FRAME.y + 10 + s2 * (HORIZON_Y - FRAME.y - 30);
              const l = 16 + s * 14;
              return (
                <line
                  key={`rain-${i}`}
                  x1={x}
                  y1={y}
                  x2={x - 5}
                  y2={y + l}
                />
              );
            })}
          </g>

          {/* ── Lightning bolt ─────────────────────────────────── */}
          {/* Outer glow */}
          <path
            d={boltPathStr(BOLT_POINTS)}
            stroke={BOLT}
            strokeOpacity={0.35}
            strokeWidth={14}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
            filter="url(#bolt-glow)"
            strokeDasharray={boltTotal}
            strokeDashoffset={boltDash}
          />
          {/* Mid */}
          <path
            d={boltPathStr(BOLT_POINTS)}
            stroke={BOLT}
            strokeWidth={5}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
            strokeDasharray={boltTotal}
            strokeDashoffset={boltDash}
          />
          {/* White core */}
          <path
            d={boltPathStr(BOLT_POINTS)}
            stroke={BOLT_HOT}
            strokeWidth={1.8}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
            strokeDasharray={boltTotal}
            strokeDashoffset={boltDash}
          />

          {/* Bolt forks */}
          {BOLT_FORKS.map(([pts, revealAt], i) => {
            const t = Math.max(0, (boltProgress - revealAt) / 0.3);
            const a = Math.min(1, t) * 0.9;
            return (
              <g key={`fork-${i}`} opacity={a}>
                <path
                  d={boltPathStr(pts)}
                  stroke={BOLT}
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                  strokeOpacity={0.7}
                  filter="url(#bolt-glow)"
                />
                <path
                  d={boltPathStr(pts)}
                  stroke={BOLT_HOT}
                  strokeWidth={1.1}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Impact flash — bright instantaneous flash */}
          <g opacity={impactFlash}>
            <circle
              cx={IMPACT[0]}
              cy={IMPACT[1]}
              r={180}
              fill="url(#impact-flash)"
            />
            <circle
              cx={IMPACT[0]}
              cy={IMPACT[1]}
              r={80}
              fill={BOLT_HOT}
              opacity={0.45}
            />
            <circle
              cx={IMPACT[0]}
              cy={IMPACT[1]}
              r={26}
              fill={BOLT_HOT}
              opacity={0.9}
            />
          </g>

          {/* Residual forge-glow around the impact — lingers after flash fades,
              then slowly cools (tied to `cool`). This gives the strike a
              persistent hot halo at the surface. */}
          <g
            opacity={Math.min(
              1,
              Math.max(0, (frame - fps * 1.35) / (fps * 0.4)),
            ) * (1 - cool * 0.75)}
          >
            <circle
              cx={IMPACT[0]}
              cy={IMPACT[1]}
              r={70}
              fill="url(#impact-flash)"
              opacity={0.8}
            />
          </g>

          {/* Impact crater lip — raised ring of sand, kicked up by the strike */}
          <g
            opacity={Math.min(1, Math.max(0, (frame - fps * 1.3) / (fps * 0.4)))}
          >
            <ellipse
              cx={IMPACT[0]}
              cy={IMPACT[1] - 3}
              rx={50}
              ry={6}
              fill={SAND_LIT}
              opacity={0.95}
            />
            <ellipse
              cx={IMPACT[0]}
              cy={IMPACT[1] + 2}
              rx={38}
              ry={3.5}
              fill={SAND_DARK}
              opacity={0.9}
            />
            {/* Ejecta: a few sand flecks arcing out */}
            {[
              [-54, -14, 2],
              [-36, -22, 1.6],
              [-20, -26, 1.4],
              [16, -24, 1.8],
              [34, -20, 1.6],
              [52, -12, 2.2],
              [-70, -4, 1.4],
              [68, -6, 1.6],
            ].map(([dx, dy, r], i) => (
              <circle
                key={`ejecta-${i}`}
                cx={IMPACT[0] + dx}
                cy={IMPACT[1] + dy}
                r={r}
                fill={SAND_LIT}
                opacity={0.9}
              />
            ))}
            <ellipse
              cx={IMPACT[0]}
              cy={IMPACT[1] + 2}
              rx={12}
              ry={3}
              fill={INK_DEEP}
              opacity={0.95}
            />
          </g>

          {/* ── Fulgurite below ground ─────────────────────────── */}
          {/* Outer haze for hotness (fades as it cools) */}
          <g filter="url(#fulg-glow)">
            {FULGURITE.map((b, i) => {
              const { g } = branchStates[i];
              if (g <= 0) return null;
              const len = branchLen(b);
              const dash = len * (1 - g);
              const haze = 1 - cool * 0.9;
              return (
                <path
                  key={`glow-${i}`}
                  d={branchPath(b)}
                  stroke={GLOW}
                  strokeOpacity={0.35 * haze}
                  strokeWidth={b.width + 8}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dash}
                />
              );
            })}
          </g>

          {/* Main fulgurite branches */}
          {FULGURITE.map((b, i) => {
            const { g, color } = branchStates[i];
            if (g <= 0) return null;
            const len = branchLen(b);
            const dash = len * (1 - g);
            return (
              <g key={`core-${i}`}>
                {/* Dark casing / shadow */}
                <path
                  d={branchPath(b)}
                  stroke={EARTH_DEEP}
                  strokeOpacity={0.9}
                  strokeWidth={b.width + 2}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dash}
                />
                {/* Glass tube */}
                <path
                  d={branchPath(b)}
                  stroke={color}
                  strokeWidth={b.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dash}
                />
                {/* Inner highlight (hot core) */}
                <path
                  d={branchPath(b)}
                  stroke={mixHex("#FFFFFF", color, 0.65 + cool * 0.3)}
                  strokeWidth={Math.max(0.6, b.width - 3)}
                  strokeOpacity={0.9 - cool * 0.55}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dash}
                />
              </g>
            );
          })}

          {/* Impact node — bright glass boss where the bolt met the sand */}
          <g>
            <circle
              cx={IMPACT[0]}
              cy={IMPACT[1] + 2}
              r={11}
              fill={EARTH_DEEP}
            />
            <circle
              cx={IMPACT[0]}
              cy={IMPACT[1] + 2}
              r={8}
              fill={mixHex(GLOW, "#9C6033", cool * 0.8)}
            />
            <circle
              cx={IMPACT[0]}
              cy={IMPACT[1] + 1}
              r={3.4}
              fill="#FFFFFF"
              opacity={0.9 - cool * 0.55}
            />
          </g>

          {/* Soil/strata lines — faint horizontal rules in the ground */}
          <g stroke={EARTH_DEEP} strokeOpacity={0.6} strokeWidth={1}>
            <line
              x1={FRAME.x + 20}
              y1={HORIZON_Y + 70}
              x2={FRAME.x + FRAME.w - 20}
              y2={HORIZON_Y + 74}
            />
            <line
              x1={FRAME.x + 20}
              y1={HORIZON_Y + 170}
              x2={FRAME.x + FRAME.w - 20}
              y2={HORIZON_Y + 176}
              strokeOpacity={0.4}
            />
            <line
              x1={FRAME.x + 20}
              y1={HORIZON_Y + 270}
              x2={FRAME.x + FRAME.w - 20}
              y2={HORIZON_Y + 280}
              strokeOpacity={0.3}
            />
          </g>
        </g>

        {/* ── Plate frame + crop marks ─────────────────────────── */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={BORDER}
          strokeWidth={1}
        />
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={CROP} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Temperature annotation in the sky */}
        <g
          transform={`translate(${FRAME.x + 34}, ${FRAME.y + 42})`}
          fontFamily={inter}
          fill={BOLT}
          letterSpacing={3}
          fontWeight={500}
        >
          <text fontSize={11} opacity={0.9}>
            RETURN-STROKE PLASMA
          </text>
          <text y={18} fontSize={22} fontWeight={600} letterSpacing={2}>
            ≈ 30,000 K
          </text>
          <text
            y={36}
            fontSize={10}
            fill={GRAY}
            letterSpacing={2.5}
            fontWeight={500}
          >
            5× THE SUN'S SURFACE
          </text>
        </g>

        {/* Depth annotation underground — placed low-left, away from branches,
            with a short leader rule pointing toward the deepest trunk. */}
        <g
          transform={`translate(${FRAME.x + 34}, ${FRAME.y + FRAME.h - 92})`}
          fontFamily={inter}
          fill={SAND_LIT}
          letterSpacing={3}
          fontWeight={500}
        >
          <line
            x1={0}
            y1={-6}
            x2={44}
            y2={-6}
            stroke={SAND_LIT}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          <text fontSize={11} opacity={0.9}>
            FUSED SILICA TUBE
          </text>
          <text
            y={22}
            fontSize={20}
            fontWeight={600}
            letterSpacing={1.4}
            fill={GLOW}
          >
            SiO₂ · amorphous
          </text>
          <text
            y={44}
            fontSize={10}
            fill={GRAY}
            letterSpacing={2.5}
            fontWeight={500}
          >
            FORMED IN MILLISECONDS
          </text>
        </g>

        {/* Scale bar at bottom-right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 150}, ${
            FRAME.y + FRAME.h - 32
          })`}
          stroke={SAND_LIT}
          fill={SAND_LIT}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
          opacity={0.75}
        >
          <line x1={0} y1={0} x2={100} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1.2} />
          <line x1={100} y1={-5} x2={100} y2={5} strokeWidth={1.2} />
          <text x={110} y={4} stroke="none">
            2 M
          </text>
        </g>

        {/* Caption strip just below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · LIGHTNING STRIKE → FULGURITE, CROSS-SECTION</text>
          <text x={FRAME.w} textAnchor="end" fill={GLOW} opacity={0.85}>
            A GLASSBLOWER WORKS THE DUNE
          </text>
        </g>
      </svg>

      {/* ── Type lockup ──────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [14, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: GLOW,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Glassblower
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 92,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          Blown
          <br />
          by the sky.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A cloud-to-ground lightning strike reaches{" "}
          <span style={{ color: BOLT, fontWeight: 600 }}>~30,000 K</span>{" "}
          in its return-stroke plasma — roughly five times hotter than the
          Sun's surface — and, in milliseconds, fuses the sand it passes
          through into a branching hollow tube of silica glass: a{" "}
          <span style={{ color: GLOW, fontWeight: 600 }}>fulgurite</span>.
        </div>
      </div>

      {/* Footer */}
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
          opacity: sceneFadeIn,
        }}
      >
        <span>Uman · The Lightning Discharge · Return-Stroke Temp.</span>
        <span>
          <span style={{ color: GLOW }}>●</span> SiO₂ = fused silica glass
        </span>
      </div>
    </AbsoluteFill>
  );
};
