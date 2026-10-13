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

// Palette — from the concept's visual brief
const SKY = "#0A0E1F";
const SKY_HI = "#141A33";
const PLASMA = "#FFF2C2";
const BOLT_HALO = "#B6CBFF";
const SAND = "#C8964A";
const SAND_DEEP = "#7A5826";
const GLASS = "#E8A661";
const GLASS_HI = "#F2DAB5";
const GRAY = "#8A8F99";
const INK = "#0A0E1F";

// ── Map layout (coord space: 1080 × 800) ─────────────────────────────────
// Virtual canvas. Sky occupies y ∈ [0, 440), sand ∈ [440, 800].
const GROUND_Y = 440;
const STRIKE_X = 540;

// Lightning bolt — a jagged zigzag from top of frame down to the strike point.
// Each segment is a straight line; we build it as an SVG path.
const BOLT_POINTS: Array<[number, number]> = [
  [540, 50],
  [522, 118],
  [560, 182],
  [530, 246],
  [566, 304],
  [534, 356],
  [552, 400],
  [540, GROUND_Y],
];

const boltPath = BOLT_POINTS.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");

const boltLen = (() => {
  let total = 0;
  for (let i = 1; i < BOLT_POINTS.length; i++) {
    const [x0, y0] = BOLT_POINTS[i - 1];
    const [x1, y1] = BOLT_POINTS[i];
    total += Math.hypot(x1 - x0, y1 - y0);
  }
  return total;
})();

// Small side-forks from the main bolt (optional embellishment)
const BOLT_FORKS: Array<Array<[number, number]>> = [
  [
    [560, 182],
    [598, 212],
    [620, 254],
  ],
  [
    [534, 356],
    [498, 384],
    [482, 418],
  ],
];
const forkPath = (pts: Array<[number, number]>) =>
  pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");

// Fulgurite tree — a glass "root" system beneath the strike.
// Each branch has a growth-order delay (0..1).
type Branch = {
  from: [number, number];
  to: [number, number];
  w: number;
  delay: number;
};
const BRANCHES: Branch[] = [
  // Trunk (center column, descending from the strike)
  { from: [540, 440], to: [534, 492], w: 14, delay: 0.0 },
  { from: [534, 492], to: [540, 548], w: 12, delay: 0.06 },
  { from: [540, 548], to: [532, 608], w: 10, delay: 0.12 },
  { from: [532, 608], to: [538, 668], w: 8, delay: 0.2 },
  { from: [538, 668], to: [534, 724], w: 6, delay: 0.3 },

  // Left side branches
  { from: [534, 492], to: [490, 536], w: 7, delay: 0.08 },
  { from: [490, 536], to: [448, 584], w: 5, delay: 0.16 },
  { from: [448, 584], to: [414, 636], w: 3.5, delay: 0.26 },
  { from: [414, 636], to: [388, 686], w: 2.5, delay: 0.35 },

  { from: [540, 548], to: [500, 596], w: 5, delay: 0.18 },
  { from: [500, 596], to: [470, 646], w: 3.5, delay: 0.26 },

  { from: [532, 608], to: [484, 660], w: 4.5, delay: 0.22 },
  { from: [484, 660], to: [448, 716], w: 3, delay: 0.32 },

  // Right side branches
  { from: [534, 492], to: [582, 540], w: 7, delay: 0.1 },
  { from: [582, 540], to: [622, 592], w: 5, delay: 0.18 },
  { from: [622, 592], to: [660, 640], w: 3.5, delay: 0.28 },
  { from: [660, 640], to: [690, 692], w: 2.5, delay: 0.37 },

  { from: [540, 548], to: [588, 600], w: 5, delay: 0.2 },
  { from: [588, 600], to: [622, 652], w: 3.5, delay: 0.28 },

  { from: [532, 608], to: [582, 662], w: 4.5, delay: 0.24 },
  { from: [582, 662], to: [614, 712], w: 3, delay: 0.34 },

  // Fine capillaries
  { from: [448, 584], to: [432, 614], w: 2.2, delay: 0.3 },
  { from: [622, 592], to: [644, 622], w: 2.2, delay: 0.3 },
  { from: [588, 600], to: [606, 630], w: 2, delay: 0.32 },
  { from: [500, 596], to: [482, 622], w: 2, delay: 0.3 },
];

const branchPath = (b: Branch): string => {
  const [ax, ay] = b.from;
  const [bx, by] = b.to;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  // Deterministic small bend based on endpoints
  const seed = ((ax * 73 + ay * 31 + bx * 11 + by) % 1000) / 1000;
  const bend = (seed - 0.5) * 0.14 * len;
  const mx = (ax + bx) / 2 + nx * bend;
  const my = (ay + by) / 2 + ny * bend;
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
};
const branchLen = (b: Branch): number => Math.hypot(b.to[0] - b.from[0], b.to[1] - b.from[1]) * 1.05;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline
  // 0.0s        establish
  // 0.6s        bolt flash (spring)
  // 0.9s..3.5s  fulgurite grows downward
  // 3.5s..5s    afterglow pulse along trunk, title breathes
  const boltFlash = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 10, mass: 0.4, stiffness: 180 },
  });

  // After the first flash peaks, the bolt dims to a residual channel.
  const flashT = Math.max(0, (frame - fps * 0.5) / fps);
  const boltResidual = interpolate(flashT, [0, 0.08, 0.5, 2.5, 5], [0, 1, 0.78, 0.62, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const skyFlash = interpolate(flashT, [0, 0.08, 0.5], [0, 0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Fulgurite growth clock (starts just after the strike)
  const growStart = fps * 0.75;
  const growSpan = fps * 2.7;
  const g = Math.max(0, (frame - growStart) / growSpan);

  const titleSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.6, fps * 2.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulseProgress = ((frame - fps * 3.3) % (fps * 2.4)) / (fps * 2.4);
  const pulseActive = frame > fps * 3.3;

  // ── Page layout (1080 × 1350 portrait) ───────────────────────────────
  // Top metadata band: 0..110
  // Hero frame        : 130..841 (h 711, w 960)  — map virtual 1080×800
  // Title block       : 905..
  // Hook              : ~1095..
  // Footer            : 1280..
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W; // = FRAME.h / MAP_H

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
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: GLASS }}>2026 · 10 · 13</span>
      </div>

      {/* Hero frame + diagram */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky vignette — top dark, slight glow where the bolt enters */}
          <radialGradient id="sky-vignette" cx="50%" cy="55%" r="80%">
            <stop offset="0%" stopColor={SKY_HI} stopOpacity={1} />
            <stop offset="100%" stopColor={SKY} stopOpacity={1} />
          </radialGradient>

          {/* Sand gradient */}
          <linearGradient id="sand-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAND} stopOpacity={1} />
            <stop offset="100%" stopColor={SAND_DEEP} stopOpacity={1} />
          </linearGradient>

          {/* Bolt-area aurora halo */}
          <radialGradient id="bolt-aurora" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor={BOLT_HALO} stopOpacity={0.35} />
            <stop offset="60%" stopColor={BOLT_HALO} stopOpacity={0.08} />
            <stop offset="100%" stopColor={BOLT_HALO} stopOpacity={0} />
          </radialGradient>

          {/* Flash whiteout under the strike (fade quickly) */}
          <radialGradient id="strike-flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PLASMA} stopOpacity={0.9} />
            <stop offset="40%" stopColor={PLASMA} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PLASMA} stopOpacity={0} />
          </radialGradient>

          {/* Glass tube glow */}
          <filter id="glass-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="bolt-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          {/* Dot pattern for sand grain */}
          <pattern id="grain" x="0" y="0" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="5" r="0.55" fill="#8E6228" opacity="0.4" />
            <circle cx="16" cy="14" r="0.45" fill="#5B3F15" opacity="0.45" />
            <circle cx="22" cy="3" r="0.4" fill="#A77A3C" opacity="0.3" />
            <circle cx="2" cy="20" r="0.45" fill="#5B3F15" opacity="0.4" />
            <circle cx="12" cy="22" r="0.4" fill="#A77A3C" opacity="0.4" />
          </pattern>

          {/* Clip the fulgurite to below the ground */}
          <clipPath id="sand-clip">
            <rect x="0" y={GROUND_Y} width={MAP_W} height={MAP_H - GROUND_Y} />
          </clipPath>
          <clipPath id="sky-clip">
            <rect x="0" y="0" width={MAP_W} height={GROUND_Y} />
          </clipPath>
        </defs>

        {/* Hero frame fill (sky + sand) */}
        <g>
          <rect
            x={FRAME.x}
            y={FRAME.y}
            width={FRAME.w}
            height={FRAME.h}
            fill={SKY}
          />
        </g>

        {/* Diagram content: scale 1080×800 into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Sky layer */}
          <g clipPath="url(#sky-clip)">
            <rect x={0} y={0} width={MAP_W} height={GROUND_Y} fill="url(#sky-vignette)" />
            <rect
              x={STRIKE_X - 170}
              y={0}
              width={340}
              height={GROUND_Y}
              fill="url(#bolt-aurora)"
              opacity={0.55 + 0.45 * skyFlash}
            />
            {/* Faint stars */}
            {Array.from({ length: 28 }).map((_, i) => {
              const seed = (i * 2654435761) >>> 0;
              const x = (seed % 1080);
              const y = ((seed >> 10) % 420) + 10;
              const r = 0.4 + ((seed >> 5) % 10) / 24;
              return (
                <circle
                  key={`star-${i}`}
                  cx={x}
                  cy={y}
                  r={r}
                  fill="#C8CBD6"
                  opacity={0.35}
                />
              );
            })}

            {/* Skyward flash wash */}
            <rect
              x={0}
              y={0}
              width={MAP_W}
              height={GROUND_Y}
              fill={PLASMA}
              opacity={skyFlash * 0.25}
            />

            {/* Bolt forks (behind) */}
            {BOLT_FORKS.map((pts, i) => (
              <path
                key={`fork-glow-${i}`}
                d={forkPath(pts)}
                stroke={BOLT_HALO}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                opacity={0.35 * boltResidual}
                filter="url(#bolt-glow)"
              />
            ))}
            {BOLT_FORKS.map((pts, i) => (
              <path
                key={`fork-core-${i}`}
                d={forkPath(pts)}
                stroke={PLASMA}
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
                opacity={0.9 * boltResidual}
              />
            ))}

            {/* Main bolt — outer halo */}
            <path
              d={boltPath}
              stroke={BOLT_HALO}
              strokeWidth={22}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55 * boltResidual}
              filter="url(#bolt-glow)"
            />
            {/* Main bolt — mid */}
            <path
              d={boltPath}
              stroke={PLASMA}
              strokeWidth={9}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95 * boltResidual}
              filter="url(#bolt-glow)"
            />
            {/* Main bolt — core */}
            <path
              d={boltPath}
              stroke="#FFFFFF"
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={boltResidual}
            />
          </g>

          {/* Horizon strike flash (crosses the horizon line) */}
          <circle
            cx={STRIKE_X}
            cy={GROUND_Y}
            r={160}
            fill="url(#strike-flash)"
            opacity={0.3 + 0.7 * skyFlash}
          />

          {/* Horizon line */}
          <line
            x1={0}
            y1={GROUND_Y}
            x2={MAP_W}
            y2={GROUND_Y}
            stroke="#2A2F42"
            strokeWidth={1.2}
          />

          {/* Sand layer */}
          <g>
            <rect x={0} y={GROUND_Y} width={MAP_W} height={MAP_H - GROUND_Y} fill="url(#sand-grad)" />
            <rect
              x={0}
              y={GROUND_Y}
              width={MAP_W}
              height={MAP_H - GROUND_Y}
              fill="url(#grain)"
              opacity={0.35}
            />
          </g>

          {/* Fulgurite — grows downward, glass-tube rendering */}
          <g clipPath="url(#sand-clip)">
            {/* outer glow */}
            {BRANCHES.map((b, i) => {
              const len = branchLen(b);
              const local = (g - b.delay) / 0.22;
              const grow = Math.max(0, Math.min(1, local));
              const eased = 1 - Math.pow(1 - grow, 3);
              const dashOffset = len * (1 - eased);
              return (
                <path
                  key={`g-glow-${i}`}
                  d={branchPath(b)}
                  stroke={GLASS}
                  strokeWidth={b.w + 7}
                  strokeOpacity={0.22 * eased}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#glass-glow)"
                  strokeDasharray={len}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
            {/* dark glass shell (reads as a tube wall) */}
            {BRANCHES.map((b, i) => {
              const len = branchLen(b);
              const local = (g - b.delay) / 0.22;
              const grow = Math.max(0, Math.min(1, local));
              const eased = 1 - Math.pow(1 - grow, 3);
              const dashOffset = len * (1 - eased);
              return (
                <path
                  key={`g-shell-${i}`}
                  d={branchPath(b)}
                  stroke="#5A3C14"
                  strokeWidth={b.w + 2}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dashOffset}
                  opacity={0.9}
                />
              );
            })}
            {/* amber body */}
            {BRANCHES.map((b, i) => {
              const len = branchLen(b);
              const local = (g - b.delay) / 0.22;
              const grow = Math.max(0, Math.min(1, local));
              const eased = 1 - Math.pow(1 - grow, 3);
              const dashOffset = len * (1 - eased);
              return (
                <path
                  key={`g-body-${i}`}
                  d={branchPath(b)}
                  stroke={GLASS}
                  strokeWidth={b.w}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
            {/* highlight catch */}
            {BRANCHES.map((b, i) => {
              const len = branchLen(b);
              const local = (g - b.delay) / 0.22;
              const grow = Math.max(0, Math.min(1, local));
              const eased = 1 - Math.pow(1 - grow, 3);
              const dashOffset = len * (1 - eased);
              return (
                <path
                  key={`g-hi-${i}`}
                  d={branchPath(b)}
                  stroke={GLASS_HI}
                  strokeWidth={Math.max(1, b.w - 4)}
                  strokeOpacity={0.55}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dashOffset}
                />
              );
            })}

            {/* Pulse traveling down the trunk */}
            {pulseActive &&
              (() => {
                const trunk: Array<[number, number]> = [
                  [540, 440],
                  [534, 492],
                  [540, 548],
                  [532, 608],
                  [538, 668],
                  [534, 724],
                ];
                const segs = trunk.slice(1).map((p, i) => Math.hypot(p[0] - trunk[i][0], p[1] - trunk[i][1]));
                const total = segs.reduce((a, b) => a + b, 0);
                const along = Math.max(0, Math.min(1, pulseProgress)) * total;
                let acc = 0;
                let px = trunk[0][0];
                let py = trunk[0][1];
                for (let i = 0; i < segs.length; i++) {
                  if (acc + segs[i] >= along) {
                    const f = (along - acc) / segs[i];
                    px = trunk[i][0] + (trunk[i + 1][0] - trunk[i][0]) * f;
                    py = trunk[i][1] + (trunk[i + 1][1] - trunk[i][1]) * f;
                    break;
                  }
                  acc += segs[i];
                }
                const fade = Math.min(1, (frame - fps * 3.3) / (fps * 0.4));
                return (
                  <g opacity={fade}>
                    <circle cx={px} cy={py} r={14} fill={PLASMA} opacity={0.3} />
                    <circle cx={px} cy={py} r={4} fill="#FFFFFF" />
                  </g>
                );
              })()}
          </g>

          {/* Fused scar at the strike point — a bright glass bead at the mouth of the tube */}
          <g>
            <ellipse
              cx={STRIKE_X}
              cy={GROUND_Y + 2}
              rx={28}
              ry={5}
              fill={PLASMA}
              opacity={interpolate(flashT, [0, 0.1, 1.5], [0, 0.8, 0.25], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
              filter="url(#glass-glow)"
            />
            <ellipse
              cx={STRIKE_X}
              cy={GROUND_Y + 2}
              rx={14}
              ry={3}
              fill="#FFFFFF"
              opacity={interpolate(flashT, [0, 0.08, 1.0], [0, 1, 0.5], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            />
          </g>

          {/* Specimen-plate annotations */}
          {/* Surface label on the horizon */}
          <g
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3}
            fill={GRAY}
          >
            <line
              x1={60}
              y1={GROUND_Y - 10}
              x2={60}
              y2={GROUND_Y + 10}
              stroke={GRAY}
              strokeWidth={1.1}
            />
            <text x={74} y={GROUND_Y - 10}>
              SURFACE
            </text>
            <text x={74} y={GROUND_Y + 20} fill={SAND_DEEP}>
              SILICA SAND
            </text>
          </g>

          {/* Depth scale on the right */}
          <g
            transform={`translate(${MAP_W - 90}, ${GROUND_Y + 20})`}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
            fill="#4A3010"
          >
            <text x={-14} y={-6} textAnchor="end" fontWeight={600} letterSpacing={3} fill="#4A3010">
              DEPTH
            </text>
            <line x1={0} y1={0} x2={0} y2={240} stroke="#4A3010" strokeWidth={1.1} />
            {[0, 1, 2].map((m, i) => (
              <g key={`tick-${i}`}>
                <line x1={-6} y1={m * 120} x2={0} y2={m * 120} stroke="#4A3010" strokeWidth={1.1} />
                <text x={-12} y={m * 120 + 3} textAnchor="end">
                  {m} M
                </text>
              </g>
            ))}
          </g>

          {/* Bolt callout — top right */}
          <g
            opacity={interpolate(frame, [fps * 0.9, fps * 1.6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <line x1={566} y1={160} x2={740} y2={110} stroke={BOLT_HALO} strokeWidth={1.1} />
            <line x1={740} y1={110} x2={830} y2={110} stroke={BOLT_HALO} strokeWidth={1.1} />
            <text
              x={830}
              y={100}
              fill={BOLT_HALO}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
              textAnchor="end"
            >
              RETURN-STROKE CHANNEL
            </text>
            <text
              x={830}
              y={122}
              fill="#FFFFFF"
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={2.6}
              textAnchor="end"
            >
              ≈ 30,000 K
            </text>
          </g>

          {/* Fulgurite callout — lower-left, on a dark label card for contrast */}
          <g
            opacity={interpolate(frame, [fps * 1.6, fps * 2.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <line x1={388} y1={686} x2={310} y2={700} stroke={INK} strokeWidth={1.2} />
            <line x1={310} y1={700} x2={310} y2={716} stroke={INK} strokeWidth={1.2} />
            <rect
              x={62}
              y={716}
              width={274}
              height={56}
              rx={2}
              fill={INK}
              stroke={GLASS}
              strokeWidth={1.2}
            />
            <text
              x={76}
              y={740}
              fill={GLASS}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={3.2}
            >
              FULGURITE
            </text>
            <text
              x={76}
              y={760}
              fill="#D7DBE4"
              fontFamily={inter}
              fontSize={10}
              fontWeight={500}
              letterSpacing={2.4}
            >
              FUSED SiO₂ · LECHATELIERITE
            </text>
          </g>
        </g>

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2B313C"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={`crop-${i}`} stroke={GLASS} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate caption strip just below the frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · CLOUD-TO-GROUND STRIKE, SILICA SUBSTRATE</text>
          <text x={FRAME.w} textAnchor="end" fill={GLASS} opacity={0.9}>
            BOLT ARCHIVED IN GLASS
          </text>
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: GLASS,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Glassblower</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The thirty-thousand-
          <br />
          kelvin glassblower.
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
          A lightning return-stroke briefly reaches{" "}
          <span style={{ color: PLASMA, fontWeight: 600 }}>≈ 30,000 K</span> — about five times the Sun's surface — and when it enters silica-rich sand it instantly fuses the grains along its path into a{" "}
          <span style={{ color: GLASS, fontWeight: 600 }}>fulgurite</span>: a hollow, branched glass tube that is the bolt itself, petrified.
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
        }}
      >
        <span>Rakov & Uman · Lightning: Physics and Effects (2003)</span>
        <span>
          <span style={{ color: GLASS }}>●</span> Fulgurite = Fused SiO₂
        </span>
      </div>
    </AbsoluteFill>
  );
};
