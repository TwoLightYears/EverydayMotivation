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

// Palette — from concept visual brief
const INK = "#070A14";
const INK_SKY = "#0B0F1C";
const SAND = "#C9A26A";
const SAND_DEEP = "#8E6A3E";
const SAND_DARK = "#4B361E";
const CREAM = "#F2E4C6";
const BOLT = "#A8B9FF";
const BOLT_SOFT = "#E6ECFF";
const EMBER = "#FFB36A";
const EMBER_GLOW = "#FFD79E";
const GRAY = "#8A8F99";
const RULE = "#242A38";

// ── Layout (1080 × 1350 portrait) ────────────────────────────────────
// Top band:          y 56    (metadata row)
// Specimen plate:    x 60 → 1020, y 130 → 880 (960 × 750)
// Horizon inside:    y 530  (~53% down the plate)
// Title lockup:      y 915
// Hook block:        y 1090
// Footer:            y 1300

const PLATE = { x: 60, y: 130, w: 960, h: 750 };
const HORIZON_Y = 530; // absolute Y in 1080×1350 space

// Lightning bolt: ordered points (absolute coords) from cloud down to strike.
// Zig-zag with a feeling of charge-channel dielectric breakdown.
const STRIKE_X = 632;
const BOLT_PATH: [number, number][] = [
  [690, 150], // emerges from top of plate
  [675, 190],
  [702, 230],
  [668, 275],
  [690, 320],
  [655, 360],
  [680, 395],
  [648, 430],
  [668, 465],
  [640, 495],
  [STRIKE_X, HORIZON_Y],
];

// Secondary (smaller) forked branches that don't reach the ground.
const BRANCHES: [number, number][][] = [
  [
    [668, 275],
    [628, 300],
    [612, 335],
    [596, 345],
  ],
  [
    [655, 360],
    [612, 378],
    [602, 410],
  ],
  [
    [702, 230],
    [744, 258],
    [758, 290],
  ],
  [
    [668, 465],
    [700, 482],
    [716, 500],
  ],
];

// Fulgurite tube: tree of segments below ground. Each segment is a straight
// vector with a thickness that tapers with depth; smaller side-branches
// trace the current's dissipation through the sand.
type Seg = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  depth: number; // 0 = trunk, higher = finer branches
  delay: number; // draw order (0..1)
};

const TRUNK_END_X = 620;
const TRUNK_END_Y = 760;

// The fulgurite: deliberately asymmetric, dropping to the lower-left while
// the main trunk continues almost straight down. Mimics how lightning current
// splays into a soil's preferred resistance paths.
const SEGS: Seg[] = [
  // Main trunk — drifts gently left as it goes deep
  { x1: STRIKE_X, y1: HORIZON_Y, x2: 626, y2: 580, w: 16, depth: 0, delay: 0.0 },
  { x1: 626, y1: 580, x2: 612, y2: 638, w: 13, depth: 0, delay: 0.08 },
  { x1: 612, y1: 638, x2: 608, y2: 694, w: 10, depth: 0, delay: 0.16 },
  { x1: 608, y1: 694, x2: 596, y2: 752, w: 7.5, depth: 0, delay: 0.24 },
  { x1: 596, y1: 752, x2: 586, y2: 802, w: 5.5, depth: 1, delay: 0.32 },

  // Big left fork — the dominant side branch, roughly 45°
  { x1: 626, y1: 580, x2: 574, y2: 614, w: 8, depth: 1, delay: 0.26 },
  { x1: 574, y1: 614, x2: 522, y2: 648, w: 6.5, depth: 1, delay: 0.33 },
  { x1: 522, y1: 648, x2: 466, y2: 688, w: 5, depth: 1, delay: 0.4 },
  { x1: 466, y1: 688, x2: 418, y2: 734, w: 3.5, depth: 2, delay: 0.48 },
  { x1: 418, y1: 734, x2: 394, y2: 770, w: 2.4, depth: 3, delay: 0.56 },
  { x1: 394, y1: 770, x2: 372, y2: 802, w: 1.8, depth: 3, delay: 0.62 },

  // Minor off-shoots from left fork
  { x1: 522, y1: 648, x2: 492, y2: 696, w: 2.6, depth: 2, delay: 0.45 },
  { x1: 492, y1: 696, x2: 470, y2: 740, w: 1.8, depth: 3, delay: 0.52 },
  { x1: 466, y1: 688, x2: 490, y2: 720, w: 2, depth: 3, delay: 0.5 },

  // Right fork — shorter, drops almost straight
  { x1: 612, y1: 638, x2: 668, y2: 668, w: 6, depth: 1, delay: 0.3 },
  { x1: 668, y1: 668, x2: 702, y2: 712, w: 4, depth: 2, delay: 0.38 },
  { x1: 702, y1: 712, x2: 718, y2: 754, w: 2.8, depth: 3, delay: 0.46 },
  { x1: 718, y1: 754, x2: 730, y2: 790, w: 1.8, depth: 3, delay: 0.54 },

  // Tiny mid-trunk tendrils, broken up so nothing feels mirrored
  { x1: 608, y1: 694, x2: 644, y2: 724, w: 2.4, depth: 3, delay: 0.42 },
  { x1: 644, y1: 724, x2: 666, y2: 752, w: 1.8, depth: 3, delay: 0.5 },
  { x1: 596, y1: 752, x2: 572, y2: 782, w: 2, depth: 3, delay: 0.56 },

  // Top "necking" region just under horizon — slight micro-branches
  { x1: 626, y1: 580, x2: 652, y2: 606, w: 3, depth: 2, delay: 0.3 },
  { x1: 652, y1: 606, x2: 672, y2: 624, w: 2, depth: 3, delay: 0.36 },
];

const segLen = (s: Seg) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);

// Convert a polyline to an SVG path, drawn progressively 0..1.
const polylineLen = (pts: [number, number][]): number => {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total;
};

const polylinePath = (pts: [number, number][]): string => {
  return pts
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (seconds):
  // 0.0  specimen plate fades up
  // 0.3  lightning bolt strikes (fast, 0.3s)
  // 0.65 impact flash
  // 0.75 fulgurite tube grows (1.8s)
  // 1.1  title springs in
  // 1.7  hook fades in
  // 3.0+ ember pulses

  const plateIn = interpolate(frame, [0, fps * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  // Strike: use a dashed-stroke "unveil" from top to impact.
  const strikeStart = fps * 0.3;
  const strikeSpan = fps * 0.25;
  const strikeT = interpolate(
    frame,
    [strikeStart, strikeStart + strikeSpan],
    [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Flash: short pulse right after the bolt completes.
  const flashCenter = strikeStart + strikeSpan + 2;
  const flash = Math.max(
    0,
    1 -
      Math.min(1, Math.abs(frame - flashCenter) / 10) *
        Math.min(1, Math.abs(frame - flashCenter) / 10),
  );
  // After the single big flash, continuous ember pulse at the strike point.
  const emberPhase = Math.max(0, frame - fps * 1.1) / (fps * 2.2);
  const emberPulse = 0.55 + 0.45 * Math.sin(emberPhase * Math.PI * 2);

  // Fulgurite growth: 0..1 across the growth window.
  const growStart = fps * 0.75;
  const growSpan = fps * 1.85;
  const growT = interpolate(frame, [growStart, growStart + growSpan], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 180, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.7, fps * 2.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Label opacities (geological labels appear after their referent has drawn).
  const labelSkyOpacity = interpolate(
    frame,
    [strikeStart + strikeSpan, strikeStart + strikeSpan + fps * 0.4],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const labelGroundOpacity = interpolate(
    frame,
    [growStart + growSpan * 0.6, growStart + growSpan * 0.6 + fps * 0.5],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const boltLen = polylineLen(BOLT_PATH);
  const boltDash = boltLen * (1 - strikeT);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ─────────────────────────────────────── */}
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
        <span style={{ color: BOLT }}>2026 · 11 · 18</span>
      </div>

      {/* ── Specimen plate (cross-section) ────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0, opacity: plateIn }}
      >
        <defs>
          {/* Deep night sky with faint vignette */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A1326" />
            <stop offset="60%" stopColor="#0B0F1E" />
            <stop offset="100%" stopColor="#09101E" />
          </linearGradient>

          {/* Sand strata gradient */}
          <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A26A" />
            <stop offset="30%" stopColor="#B5894E" />
            <stop offset="60%" stopColor="#8E6A3E" />
            <stop offset="100%" stopColor="#4B361E" />
          </linearGradient>

          {/* Soft horizon haze */}
          <linearGradient id="horizon-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BOLT} stopOpacity={0} />
            <stop offset="55%" stopColor={BOLT} stopOpacity={0.05} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0.14} />
          </linearGradient>

          {/* Glow filters */}
          <filter id="bolt-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ember-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="14" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="flash-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="35%" stopColor={BOLT_SOFT} stopOpacity={0.8} />
            <stop offset="100%" stopColor={BOLT} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="ember-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EMBER_GLOW} stopOpacity={1} />
            <stop offset="40%" stopColor={EMBER} stopOpacity={0.7} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0} />
          </radialGradient>

          {/* Mask so the fulgurite only renders below the horizon */}
          <clipPath id="ground-clip">
            <rect
              x={PLATE.x}
              y={HORIZON_Y}
              width={PLATE.w}
              height={PLATE.y + PLATE.h - HORIZON_Y}
            />
          </clipPath>
          <clipPath id="sky-clip">
            <rect
              x={PLATE.x}
              y={PLATE.y}
              width={PLATE.w}
              height={HORIZON_Y - PLATE.y}
            />
          </clipPath>
        </defs>

        {/* Plate sky */}
        <rect
          x={PLATE.x}
          y={PLATE.y}
          width={PLATE.w}
          height={HORIZON_Y - PLATE.y}
          fill="url(#sky)"
        />
        {/* Plate ground */}
        <rect
          x={PLATE.x}
          y={HORIZON_Y}
          width={PLATE.w}
          height={PLATE.y + PLATE.h - HORIZON_Y}
          fill="url(#sand)"
        />
        {/* Horizon haze band */}
        <rect
          x={PLATE.x}
          y={HORIZON_Y - 44}
          width={PLATE.w}
          height={88}
          fill="url(#horizon-haze)"
        />

        {/* Horizon rule */}
        <line
          x1={PLATE.x}
          y1={HORIZON_Y}
          x2={PLATE.x + PLATE.w}
          y2={HORIZON_Y}
          stroke="#2A1F12"
          strokeWidth={1.4}
        />
        <line
          x1={PLATE.x}
          y1={HORIZON_Y + 1.4}
          x2={PLATE.x + PLATE.w}
          y2={HORIZON_Y + 1.4}
          stroke="#E7C892"
          strokeWidth={0.6}
          opacity={0.5}
        />

        {/* Sand strata — two very subtle horizontal bands, the darker one
            doubles as the 1 M reference. Kept low contrast so the fulgurite
            reads first. */}
        {[0.33, 0.68].map((f, i) => {
          const y = HORIZON_Y + (PLATE.y + PLATE.h - HORIZON_Y) * f;
          return (
            <line
              key={`strat-${i}`}
              x1={PLATE.x + 24}
              y1={y}
              x2={PLATE.x + PLATE.w - 24}
              y2={y}
              stroke="#3A2A16"
              strokeWidth={0.6}
              opacity={0.35}
            />
          );
        })}

        {/* Plate inner border */}
        <rect
          x={PLATE.x + 0.5}
          y={PLATE.y + 0.5}
          width={PLATE.w - 1}
          height={PLATE.h - 1}
          fill="none"
          stroke="#1B2232"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [PLATE.x, PLATE.y, 1, 1],
            [PLATE.x + PLATE.w, PLATE.y, -1, 1],
            [PLATE.x, PLATE.y + PLATE.h, 1, -1],
            [PLATE.x + PLATE.w, PLATE.y + PLATE.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={BOLT} strokeWidth={1.4} fill="none" opacity={0.9}>
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Depth scale, left side of plate. Each entry sits BELOW its tick
            so "0 M" clears the horizon rule. */}
        <g
          transform={`translate(${PLATE.x + 20}, ${HORIZON_Y})`}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={2.6}
          fontWeight={700}
          opacity={labelGroundOpacity}
        >
          {[0, 1, 2].map((m) => {
            // Compress so 2M stays inside the plate even near the bottom.
            const y = 24 + (m * (PLATE.y + PLATE.h - HORIZON_Y - 60)) / 2;
            return (
              <g key={m}>
                <line
                  x1={0}
                  y1={y}
                  x2={10}
                  y2={y}
                  stroke={SAND_DARK}
                  strokeWidth={1.4}
                />
                <text x={16} y={y + 3.5} fill={SAND_DARK}>
                  {m} M
                </text>
              </g>
            );
          })}
        </g>

        {/* ── SKY LAYER (lightning + flash) ──────────────────────── */}
        <g clipPath="url(#sky-clip)">
          {/* Faint upper branches (dim glow) */}
          {BRANCHES.map((pts, i) => {
            const len = polylineLen(pts);
            const t = Math.max(0, Math.min(1, (strikeT - 0.3) / 0.6));
            const dash = len * (1 - t);
            return (
              <g key={`br-${i}`}>
                <path
                  d={polylinePath(pts)}
                  stroke={BOLT}
                  strokeOpacity={0.55}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={len}
                  strokeDashoffset={dash}
                  filter="url(#bolt-glow)"
                />
              </g>
            );
          })}

          {/* Main bolt — outer glow */}
          <path
            d={polylinePath(BOLT_PATH)}
            stroke={BOLT}
            strokeOpacity={0.35}
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={boltLen}
            strokeDashoffset={boltDash}
            filter="url(#bolt-glow)"
          />
          {/* Main bolt — mid */}
          <path
            d={polylinePath(BOLT_PATH)}
            stroke={BOLT_SOFT}
            strokeOpacity={0.9}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={boltLen}
            strokeDashoffset={boltDash}
          />
          {/* Main bolt — hot core */}
          <path
            d={polylinePath(BOLT_PATH)}
            stroke="#FFFFFF"
            strokeOpacity={1}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={boltLen}
            strokeDashoffset={boltDash}
          />

          {/* Impact flash — a single big pulse right at the strike moment */}
          <circle
            cx={STRIKE_X}
            cy={HORIZON_Y}
            r={220 * flash}
            fill="url(#flash-grad)"
            opacity={flash}
          />
        </g>

        {/* ── GROUND LAYER (fulgurite) ───────────────────────────── */}
        <g clipPath="url(#ground-clip)">
          {/* Ember pool at impact — small, concentrated, no big bloom. */}
          <circle
            cx={STRIKE_X}
            cy={HORIZON_Y + 4}
            r={54}
            fill="url(#ember-radial)"
            opacity={0.45 * emberPulse * Math.min(1, growT * 2 + 0.3)}
          />

          {/* Fulgurite tubes — draw in order of delay */}
          {SEGS.map((s, i) => {
            const localT = Math.max(
              0,
              Math.min(1, (growT - s.delay) / 0.22),
            );
            if (localT <= 0) return null;
            const eased = 1 - Math.pow(1 - localT, 3);
            const len = segLen(s);
            const dash = len * (1 - eased);
            // Outer glow + core + bright interior = hollow tube look.
            const strokeOuter = s.w + 6;
            return (
              <g key={`seg-${i}`}>
                <line
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={EMBER}
                  strokeOpacity={0.22}
                  strokeWidth={strokeOuter}
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dash}
                />
                <line
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={CREAM}
                  strokeOpacity={0.98}
                  strokeWidth={s.w}
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dash}
                />
                {s.w >= 5 && (
                  <line
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="#FFFFFF"
                    strokeOpacity={0.55}
                    strokeWidth={Math.max(1, s.w - 5)}
                    strokeLinecap="round"
                    strokeDasharray={len}
                    strokeDashoffset={dash}
                  />
                )}
              </g>
            );
          })}

          {/* Bright hot spot at impact point */}
          <circle
            cx={STRIKE_X}
            cy={HORIZON_Y + 2}
            r={10}
            fill="#FFFFFF"
            opacity={Math.min(1, growT * 1.5 + 0.2) * emberPulse}
          />
          <circle
            cx={STRIKE_X}
            cy={HORIZON_Y + 2}
            r={22}
            fill={EMBER_GLOW}
            opacity={0.55 * emberPulse * Math.min(1, growT * 1.5 + 0.2)}
          />
        </g>

        {/* ── Annotations / labels ──────────────────────────────── */}
        {/* Sky annotation: "LIGHTNING CHANNEL ≈ 30,000 K" */}
        <g opacity={labelSkyOpacity}>
          <line
            x1={858}
            y1={320}
            x2={755}
            y2={300}
            stroke={BOLT}
            strokeWidth={1}
            opacity={0.85}
          />
          <circle cx={755} cy={300} r={2.6} fill={BOLT} />
          <text
            x={870}
            y={316}
            fill={BOLT}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.2}
            fontWeight={600}
          >
            CHANNEL
          </text>
          <text
            x={870}
            y={340}
            fill={CREAM}
            fontFamily={inter}
            fontSize={16}
            letterSpacing={1.4}
            fontWeight={500}
          >
            ≈ 30,000 K
          </text>
          <text
            x={870}
            y={360}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
          >
            5× SURFACE OF SUN
          </text>
        </g>

        {/* Supplementary sky annotation: current magnitude */}
        <g opacity={labelSkyOpacity}>
          <text
            x={110}
            y={240}
            fill={BOLT}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.2}
            fontWeight={600}
          >
            CURRENT
          </text>
          <text
            x={110}
            y={264}
            fill={CREAM}
            fontFamily={inter}
            fontSize={16}
            letterSpacing={1.4}
            fontWeight={500}
          >
            ~30 kA
          </text>
          <text
            x={110}
            y={284}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
          >
            RISE TIME ≈ 1 µs
          </text>
        </g>

        {/* Impact label at horizon */}
        <g opacity={labelSkyOpacity}>
          <line
            x1={STRIKE_X + 4}
            y1={HORIZON_Y - 6}
            x2={STRIKE_X + 100}
            y2={HORIZON_Y - 46}
            stroke={EMBER}
            strokeWidth={1.1}
          />
          <line
            x1={STRIKE_X + 100}
            y1={HORIZON_Y - 46}
            x2={STRIKE_X + 150}
            y2={HORIZON_Y - 46}
            stroke={EMBER}
            strokeWidth={1.1}
          />
          <text
            x={STRIKE_X + 156}
            y={HORIZON_Y - 42}
            fill={EMBER}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.2}
            fontWeight={600}
          >
            IMPACT · Δt ≈ 10 ms
          </text>
        </g>

        {/* Ground annotation: FULGURITE / LECHATELIERITE (SiO₂) —
            sits in the empty upper-left of the sand section, well above
            the ember glow; points down to a specific left-fork branch. */}
        <g opacity={labelGroundOpacity}>
          <line
            x1={232}
            y1={660}
            x2={452}
            y2={694}
            stroke={SAND_DARK}
            strokeWidth={1}
          />
          <circle cx={452} cy={694} r={2.6} fill={SAND_DARK} />
          <text
            x={100}
            y={620}
            fill={SAND_DARK}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={3.6}
            fontWeight={700}
          >
            FULGURITE
          </text>
          <text
            x={100}
            y={641}
            fill={SAND_DARK}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2.4}
            fontWeight={600}
          >
            LECHATELIERITE · SiO₂
          </text>
          <text
            x={100}
            y={659}
            fill={SAND_DARK}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={500}
          >
            FUSED AT 1,713 °C
          </text>
        </g>

        {/* FIG caption below plate — one line so they never crowd */}
        <g
          transform={`translate(${PLATE.x}, ${PLATE.y + PLATE.h + 22})`}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.2}
          fontWeight={500}
        >
          <text fill={GRAY}>FIG. 1 · LIGHTNING → QUARTZ SAND · CROSS-SECTION</text>
          <text
            x={PLATE.w}
            textAnchor="end"
            fill={BOLT}
            opacity={0.85}
          >
            HOLLOW GLASS = NEGATIVE OF CURRENT
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 940,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [16, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: BOLT,
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
            fontSize: 82,
            lineHeight: 0.98,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          Petrified
          <br />
          lightning.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A bolt reaches{" "}
          <span style={{ color: BOLT, fontWeight: 600 }}>~30,000 K</span>{" "}
          — five times the Sun's surface — and in milliseconds it fuses quartz
          sand into{" "}
          <span style={{ color: CREAM, fontWeight: 600 }}>
            lechatelierite
          </span>
          : a hollow glass tube whose branches preserve the exact path the
          current took through the ground.
        </div>
      </div>

      {/* Divider rule above footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 92,
          borderTop: `1px solid ${RULE}`,
        }}
      />

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
        <span>Pasek & Block · Nature Comms (2012) · USGS</span>
        <span>
          <span style={{ color: EMBER }}>●</span> Molten silica
        </span>
      </div>
    </AbsoluteFill>
  );
};
