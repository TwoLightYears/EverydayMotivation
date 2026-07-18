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

// ── Palette (from the concept's visual brief) ─────────────────────────
const INK = "#0B1220"; // deep tunnel-mouth midnight
const BOARD = "#0F172A"; // slightly lifted drafting board
const CROWN = "#1FA6C6"; // kingfisher iridescent crown turquoise
const WING = "#0E4A78"; // deep kingfisher wing blue
const BREAST = "#F16B29"; // kingfisher breast rusty orange
const PAPER = "#F5F7FA"; // shinkansen white / drafting paper
const GRID = "#152036";
const GRID_MAJOR = "#1B2A47";
const GRAY = "#6B7280";
const DIM = "#9AA6B8"; // annotation text

// ── Drafting frame (poster coords) ────────────────────────────────────
const FRAME = { x: 60, y: 120, w: 960, h: 640 };

// Figure-local coordinate space (960 × 640) inside the frame.
// Axis of symmetry runs horizontal at FIG_AXIS_Y; the shared vertex where
// the beak tip meets the train nose tip sits at (FIG_VERTEX_X, FIG_AXIS_Y).
const FIG_W = 960;
const FIG_H = 640;
const FIG_AXIS_Y = 340;
const FIG_VERTEX_X = 500;

// ── Kingfisher (top-down, right-facing) ───────────────────────────────
// All coords in figure-local space. Head/body sit LEFT of vertex; beak
// tapers rightward to (FIG_VERTEX_X, FIG_AXIS_Y).

// Body silhouette (elongated teardrop, wings folded, head merged)
const BIRD_BODY = `
  M 130 ${FIG_AXIS_Y - 6}
  Q 155 ${FIG_AXIS_Y - 46} 220 ${FIG_AXIS_Y - 44}
  Q 300 ${FIG_AXIS_Y - 42} 355 ${FIG_AXIS_Y - 30}
  Q 390 ${FIG_AXIS_Y - 22} 405 ${FIG_AXIS_Y - 14}
  L 405 ${FIG_AXIS_Y + 14}
  Q 390 ${FIG_AXIS_Y + 22} 355 ${FIG_AXIS_Y + 30}
  Q 300 ${FIG_AXIS_Y + 42} 220 ${FIG_AXIS_Y + 44}
  Q 155 ${FIG_AXIS_Y + 46} 130 ${FIG_AXIS_Y + 6}
  Q 118 ${FIG_AXIS_Y} 130 ${FIG_AXIS_Y - 6}
  Z
`;

// Crown / nape highlight (turquoise on top of head, viewed from above)
const BIRD_CROWN = `
  M 250 ${FIG_AXIS_Y - 42}
  Q 300 ${FIG_AXIS_Y - 40} 355 ${FIG_AXIS_Y - 28}
  Q 385 ${FIG_AXIS_Y - 20} 395 ${FIG_AXIS_Y - 12}
  Q 355 ${FIG_AXIS_Y - 18} 300 ${FIG_AXIS_Y - 22}
  Q 260 ${FIG_AXIS_Y - 26} 240 ${FIG_AXIS_Y - 30}
  Q 232 ${FIG_AXIS_Y - 36} 250 ${FIG_AXIS_Y - 42}
  Z
`;

// Upper wing (swept back, primary feathers ending in points)
const BIRD_WING_UPPER = `
  M 220 ${FIG_AXIS_Y - 40}
  L 175 ${FIG_AXIS_Y - 92}
  L 155 ${FIG_AXIS_Y - 90}
  L 145 ${FIG_AXIS_Y - 100}
  L 128 ${FIG_AXIS_Y - 96}
  L 118 ${FIG_AXIS_Y - 106}
  L 100 ${FIG_AXIS_Y - 100}
  Q 150 ${FIG_AXIS_Y - 78} 195 ${FIG_AXIS_Y - 58}
  Q 220 ${FIG_AXIS_Y - 48} 240 ${FIG_AXIS_Y - 40}
  Z
`;

// Lower wing (mirror)
const BIRD_WING_LOWER = `
  M 220 ${FIG_AXIS_Y + 40}
  L 175 ${FIG_AXIS_Y + 92}
  L 155 ${FIG_AXIS_Y + 90}
  L 145 ${FIG_AXIS_Y + 100}
  L 128 ${FIG_AXIS_Y + 96}
  L 118 ${FIG_AXIS_Y + 106}
  L 100 ${FIG_AXIS_Y + 100}
  Q 150 ${FIG_AXIS_Y + 78} 195 ${FIG_AXIS_Y + 58}
  Q 220 ${FIG_AXIS_Y + 48} 240 ${FIG_AXIS_Y + 40}
  Z
`;

// Wing primary feather separators
const BIRD_WING_UPPER_LINES = [
  `M 210 ${FIG_AXIS_Y - 52} L 155 ${FIG_AXIS_Y - 88}`,
  `M 200 ${FIG_AXIS_Y - 46} L 128 ${FIG_AXIS_Y - 94}`,
];
const BIRD_WING_LOWER_LINES = [
  `M 210 ${FIG_AXIS_Y + 52} L 155 ${FIG_AXIS_Y + 88}`,
  `M 200 ${FIG_AXIS_Y + 46} L 128 ${FIG_AXIS_Y + 94}`,
];

// Beak (long tapering wedge from head to shared vertex)
const BIRD_BEAK = `
  M 402 ${FIG_AXIS_Y - 12}
  L ${FIG_VERTEX_X} ${FIG_AXIS_Y}
  L 402 ${FIG_AXIS_Y + 12}
  Z
`;

// Beak profile curve (matches the train nose curve, dashed guide line)
const BIRD_BEAK_PROFILE = `
  M 402 ${FIG_AXIS_Y - 12}
  Q 452 ${FIG_AXIS_Y - 8} ${FIG_VERTEX_X} ${FIG_AXIS_Y}
`;

// Eye
const BIRD_EYE = { cx: 305, cy: FIG_AXIS_Y - 16, r: 5 };

// ── Shinkansen 500 nose (top-down, left-facing) ───────────────────────
// Nose tip meets the beak tip at (FIG_VERTEX_X, FIG_AXIS_Y). Body extends
// rightward off the composition.
const TRAIN_BODY_HALF_H = 46; // half-height at full body width
const TRAIN_BODY_START_X = 780; // where the parabolic nose meets the tube
const TRAIN_BODY_END_X = 960; // extends past the drafting frame

// Full nose+body silhouette (one path)
const TRAIN_OUTLINE = `
  M ${FIG_VERTEX_X} ${FIG_AXIS_Y}
  C 570 ${FIG_AXIS_Y - 4} 640 ${FIG_AXIS_Y - 22} 700 ${FIG_AXIS_Y - 36}
  C 740 ${FIG_AXIS_Y - 44} 770 ${FIG_AXIS_Y - 46} ${TRAIN_BODY_START_X} ${FIG_AXIS_Y - TRAIN_BODY_HALF_H}
  L ${TRAIN_BODY_END_X} ${FIG_AXIS_Y - TRAIN_BODY_HALF_H}
  L ${TRAIN_BODY_END_X} ${FIG_AXIS_Y + TRAIN_BODY_HALF_H}
  L ${TRAIN_BODY_START_X} ${FIG_AXIS_Y + TRAIN_BODY_HALF_H}
  C 770 ${FIG_AXIS_Y + 46} 740 ${FIG_AXIS_Y + 44} 700 ${FIG_AXIS_Y + 36}
  C 640 ${FIG_AXIS_Y + 22} 570 ${FIG_AXIS_Y + 4} ${FIG_VERTEX_X} ${FIG_AXIS_Y}
  Z
`;

// Upper nose curve — this is the reference profile the beak also traces
const TRAIN_NOSE_PROFILE = `
  M ${FIG_VERTEX_X} ${FIG_AXIS_Y}
  C 570 ${FIG_AXIS_Y - 4} 640 ${FIG_AXIS_Y - 22} 700 ${FIG_AXIS_Y - 36}
  C 740 ${FIG_AXIS_Y - 44} 770 ${FIG_AXIS_Y - 46} ${TRAIN_BODY_START_X} ${FIG_AXIS_Y - TRAIN_BODY_HALF_H}
`;

// Cockpit window slit (near tip, on upper half)
const TRAIN_COCKPIT = `
  M 640 ${FIG_AXIS_Y - 24}
  L 700 ${FIG_AXIS_Y - 32}
  L 700 ${FIG_AXIS_Y - 28}
  L 640 ${FIG_AXIS_Y - 20}
  Z
`;

// Turquoise stripe under body — nods to kingfisher crown color
const TRAIN_STRIPE_UPPER = `
  M ${TRAIN_BODY_START_X} ${FIG_AXIS_Y - 4}
  L ${TRAIN_BODY_END_X} ${FIG_AXIS_Y - 4}
  L ${TRAIN_BODY_END_X} ${FIG_AXIS_Y + 4}
  L ${TRAIN_BODY_START_X} ${FIG_AXIS_Y + 4}
  Z
`;

// Body panel seams
const TRAIN_SEAMS: number[] = [820, 860, 900, 940];

// ── Component ─────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Master intro spring (settles bird + train)
  const introSpring = spring({
    frame: frame - fps * 0.2,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const annotationsOp = interpolate(frame, [fps * 0.6, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shock ring pulse — one arc births every ~0.9 s
  const pulsePeriod = fps * 1.5;
  const RINGS = 4;

  // Bird nudge — a small inbound settle from a hair to the left
  const birdDx = interpolate(introSpring, [0, 1], [-30, 0]);
  const trainDx = interpolate(introSpring, [0, 1], [30, 0]);
  const birdOp = interpolate(introSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ───────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 52,
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
        <span style={{ color: CROWN }}>2026 · 07 · 18</span>
      </div>

      {/* ── Drafting board + figure ────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 40 0 L 0 0 0 40`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 160 0 L 0 0 0 160`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#122036" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="body-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={WING} />
            <stop offset="55%" stopColor={CROWN} />
            <stop offset="100%" stopColor={WING} />
          </linearGradient>

          <linearGradient id="train-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#E8F1F6" />
            <stop offset="45%" stopColor="#C7D3DE" />
            <stop offset="100%" stopColor="#96A5B4" />
          </linearGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Drafting board */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#board-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />

        {/* Inner border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#22304D"
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
          <g key={i} stroke={CROWN} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}


        {/* ── Figure content: local coord 0..960 × 0..640 ──────── */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y})`}>
          {/* Symmetry axis (dashed, extends across figure) */}
          <line
            x1={0}
            y1={FIG_AXIS_Y}
            x2={FIG_W}
            y2={FIG_AXIS_Y}
            stroke={GRID_MAJOR}
            strokeWidth={1}
            strokeDasharray="6 6"
            opacity={0.8}
          />

          {/* Faint axis label — nested under bottom of figure to avoid callouts */}
          <text
            x={20}
            y={FIG_H - 60}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={500}
            opacity={annotationsOp}
          >
            AXIS · A—A′
          </text>

          {/* Section label — LEFT: SPECIMEN A */}
          <g
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.5}
            fontWeight={600}
            opacity={annotationsOp}
          >
            <text x={110} y={130}>
              A · ALCEDO ATTHIS
            </text>
            <text x={110} y={148} fill={CROWN} letterSpacing={3}>
              Ø beak = 40 mm
            </text>
          </g>

          {/* Section label — RIGHT: SPECIMEN B */}
          <g
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.5}
            fontWeight={600}
            textAnchor="end"
            opacity={annotationsOp}
          >
            <text x={FIG_W - 20} y={130}>
              B · 500 SERIES SHINKANSEN
            </text>
            <text x={FIG_W - 20} y={148} fill={CROWN} letterSpacing={3}>
              Ø nose = 15 m
            </text>
          </g>

          {/* ── Bird (LEFT) — a subtle inbound settle ──────────── */}
          <g
            opacity={birdOp}
            transform={`translate(${birdDx}, 0)`}
          >
            {/* Wings (behind body) */}
            <path d={BIRD_WING_UPPER} fill={WING} />
            <path d={BIRD_WING_LOWER} fill={WING} />
            {/* Wing feather separators */}
            <g stroke={INK} strokeWidth={1.1} fill="none" opacity={0.5}>
              {BIRD_WING_UPPER_LINES.map((d, i) => (
                <path key={`wu${i}`} d={d} />
              ))}
              {BIRD_WING_LOWER_LINES.map((d, i) => (
                <path key={`wl${i}`} d={d} />
              ))}
            </g>
            {/* Wing tip crown accents */}
            <circle
              cx={100}
              cy={FIG_AXIS_Y - 100}
              r={3.5}
              fill={CROWN}
              opacity={0.9}
            />
            <circle
              cx={100}
              cy={FIG_AXIS_Y + 100}
              r={3.5}
              fill={CROWN}
              opacity={0.9}
            />

            {/* Body */}
            <path d={BIRD_BODY} fill="url(#body-gradient)" />

            {/* Crown (turquoise highlight on top of head) */}
            <path d={BIRD_CROWN} fill={CROWN} opacity={0.85} />

            {/* Breast slash (small orange peek near neck) */}
            <path
              d={`M 205 ${FIG_AXIS_Y + 20} Q 260 ${FIG_AXIS_Y + 40} 320 ${FIG_AXIS_Y + 34} Q 260 ${FIG_AXIS_Y + 32} 210 ${FIG_AXIS_Y + 26} Z`}
              fill={BREAST}
              opacity={0.85}
            />

            {/* Beak (filled dark wedge) */}
            <path d={BIRD_BEAK} fill={INK} />
            <path
              d={BIRD_BEAK}
              fill="none"
              stroke={CROWN}
              strokeWidth={1}
              opacity={0.55}
            />

            {/* Beak specular highlight — thin line along the top edge */}
            <path
              d={`M 402 ${FIG_AXIS_Y - 10} L ${FIG_VERTEX_X - 2} ${FIG_AXIS_Y - 2}`}
              stroke={CROWN}
              strokeWidth={1.2}
              fill="none"
              opacity={0.7}
            />

            {/* Eye */}
            <circle
              cx={BIRD_EYE.cx}
              cy={BIRD_EYE.cy}
              r={BIRD_EYE.r + 2}
              fill={PAPER}
              opacity={0.9}
            />
            <circle
              cx={BIRD_EYE.cx}
              cy={BIRD_EYE.cy}
              r={BIRD_EYE.r}
              fill={INK}
            />
            <circle
              cx={BIRD_EYE.cx + 1.5}
              cy={BIRD_EYE.cy - 1.5}
              r={1.5}
              fill={PAPER}
            />
          </g>

          {/* ── Train (RIGHT) — mirrored settle ────────────────── */}
          <g
            opacity={birdOp}
            transform={`translate(${trainDx}, 0)`}
          >
            {/* Body panel seams (drawn behind so they don't overhang) */}
            <g stroke="#D8DFE8" strokeWidth={0.8} opacity={0.9}>
              {TRAIN_SEAMS.map((sx) => (
                <line
                  key={sx}
                  x1={sx}
                  y1={FIG_AXIS_Y - TRAIN_BODY_HALF_H + 4}
                  x2={sx}
                  y2={FIG_AXIS_Y + TRAIN_BODY_HALF_H - 4}
                />
              ))}
            </g>

            {/* Train outline fill */}
            <path d={TRAIN_OUTLINE} fill="url(#train-gradient)" />

            {/* Train outline stroke */}
            <path
              d={TRAIN_OUTLINE}
              fill="none"
              stroke={WING}
              strokeWidth={1.2}
              opacity={0.85}
            />

            {/* Turquoise centerline stripe (nods to crown color) */}
            <path d={TRAIN_STRIPE_UPPER} fill={CROWN} opacity={0.9} />

            {/* Cockpit window slit */}
            <path d={TRAIN_COCKPIT} fill={INK} />
            {/* mirror below axis for symmetry (not the actual window,
                just top-down mirror of the panel) */}
            <path
              d={`M 640 ${FIG_AXIS_Y + 24} L 700 ${FIG_AXIS_Y + 32} L 700 ${
                FIG_AXIS_Y + 28
              } L 640 ${FIG_AXIS_Y + 20} Z`}
              fill={INK}
              opacity={0.4}
            />

            {/* A small orange marker near the driver's window — subtle
                nod to the kingfisher breast */}
            <circle
              cx={700}
              cy={FIG_AXIS_Y - 34}
              r={3}
              fill={BREAST}
              opacity={0.9}
            />
          </g>

          {/* ── Shared profile guide (dashed) — argues the pairing ─ */}
          <path
            d={BIRD_BEAK_PROFILE}
            fill="none"
            stroke={PAPER}
            strokeWidth={1.4}
            strokeDasharray="4 5"
            opacity={0.75 * annotationsOp}
          />
          <path
            d={TRAIN_NOSE_PROFILE}
            fill="none"
            stroke={PAPER}
            strokeWidth={1.4}
            strokeDasharray="4 5"
            opacity={0.75 * annotationsOp}
          />
          {/* Mirror profile lines below the axis for symmetry */}
          <path
            d={`M 402 ${FIG_AXIS_Y + 12} Q 452 ${FIG_AXIS_Y + 8} ${FIG_VERTEX_X} ${FIG_AXIS_Y}`}
            fill="none"
            stroke={PAPER}
            strokeWidth={1.4}
            strokeDasharray="4 5"
            opacity={0.75 * annotationsOp}
          />
          <path
            d={`M ${FIG_VERTEX_X} ${FIG_AXIS_Y} C 570 ${FIG_AXIS_Y + 4} 640 ${FIG_AXIS_Y + 22} 700 ${FIG_AXIS_Y + 36} C 740 ${FIG_AXIS_Y + 44} 770 ${FIG_AXIS_Y + 46} ${TRAIN_BODY_START_X} ${FIG_AXIS_Y + TRAIN_BODY_HALF_H}`}
            fill="none"
            stroke={PAPER}
            strokeWidth={1.4}
            strokeDasharray="4 5"
            opacity={0.75 * annotationsOp}
          />

          {/* Shared vertex marker: dashed circle + crosshair + label */}
          <g opacity={annotationsOp}>
            <circle
              cx={FIG_VERTEX_X}
              cy={FIG_AXIS_Y}
              r={26}
              fill="none"
              stroke={PAPER}
              strokeWidth={1.2}
              strokeDasharray="2 4"
              opacity={0.85}
            />
            <circle
              cx={FIG_VERTEX_X}
              cy={FIG_AXIS_Y}
              r={3}
              fill={PAPER}
            />
            <line
              x1={FIG_VERTEX_X - 34}
              y1={FIG_AXIS_Y}
              x2={FIG_VERTEX_X - 30}
              y2={FIG_AXIS_Y}
              stroke={PAPER}
              strokeWidth={1.2}
            />
            <line
              x1={FIG_VERTEX_X + 30}
              y1={FIG_AXIS_Y}
              x2={FIG_VERTEX_X + 34}
              y2={FIG_AXIS_Y}
              stroke={PAPER}
              strokeWidth={1.2}
            />
            {/* Leader down-left into calm space below the beak */}
            <line
              x1={FIG_VERTEX_X - 18}
              y1={FIG_AXIS_Y + 18}
              x2={FIG_VERTEX_X - 90}
              y2={FIG_AXIS_Y + 108}
              stroke={PAPER}
              strokeWidth={1}
              opacity={0.75}
            />
            <line
              x1={FIG_VERTEX_X - 90}
              y1={FIG_AXIS_Y + 108}
              x2={FIG_VERTEX_X - 216}
              y2={FIG_AXIS_Y + 108}
              stroke={PAPER}
              strokeWidth={1}
              opacity={0.75}
            />
            <text
              x={FIG_VERTEX_X - 96}
              y={FIG_AXIS_Y + 102}
              textAnchor="end"
              fill={PAPER}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
            >
              SHARED PROFILE VERTEX
            </text>
          </g>

          {/* ── Shock arcs pulsing outward from vertex, damped ──── */}
          {Array.from({ length: RINGS }).map((_, i) => {
            const phase = (frame + i * (pulsePeriod / RINGS)) % pulsePeriod;
            const t = phase / pulsePeriod;
            const eased = 1 - Math.pow(1 - t, 2);
            const r = 30 + eased * 96;
            const damp = Math.pow(1 - t, 1.4);
            const op = damp * 0.85 * annotationsOp;
            return (
              <circle
                key={i}
                cx={FIG_VERTEX_X}
                cy={FIG_AXIS_Y}
                r={r}
                fill="none"
                stroke={CROWN}
                strokeWidth={1.8}
                opacity={op}
                filter="url(#soft-glow)"
              />
            );
          })}

          {/* Airflow arrows — three tiered streams entering from left */}
          <g
            stroke={DIM}
            strokeWidth={1.2}
            fill={DIM}
            opacity={0.55 * annotationsOp}
          >
            {[190, 220, 250].map((y0, i) => {
              const x0 = 20;
              const x1 = 70;
              return (
                <g key={i}>
                  <line x1={x0} y1={y0} x2={x1} y2={y0} />
                  <polygon
                    points={`${x1 - 6},${y0 - 4} ${x1},${y0} ${x1 - 6},${y0 + 4}`}
                  />
                </g>
              );
            })}
            <text
              x={20}
              y={172}
              fill={DIM}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={3}
              fontWeight={600}
            >
              FLOW · v
            </text>
          </g>

          {/* Density / medium interface callout — bottom label */}
          <g opacity={annotationsOp}>
            <line
              x1={FIG_VERTEX_X - 240}
              y1={FIG_AXIS_Y + 158}
              x2={FIG_VERTEX_X + 240}
              y2={FIG_AXIS_Y + 158}
              stroke={DIM}
              strokeWidth={0.8}
              opacity={0.6}
            />
            <text
              x={FIG_VERTEX_X}
              y={FIG_AXIS_Y + 178}
              textAnchor="middle"
              fill={DIM}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3.5}
              fontWeight={500}
            >
              Δρ ≈ 800× · MEDIUM INTERFACE
            </text>
          </g>

          {/* Caption strip inside the figure — bottom */}
          <g
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
            opacity={annotationsOp}
          >
            <text x={20} y={FIG_H - 20} fill={GRAY}>
              FIG. 1 · TOP-DOWN PROFILE STUDY
            </text>
            <text
              x={FIG_W - 20}
              y={FIG_H - 20}
              textAnchor="end"
              fill={CROWN}
              opacity={0.9}
            >
              — BOOM DAMPED —
            </text>
          </g>
        </g>
      </svg>

      {/* ── Type lockup (bottom third) ──────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 810,
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
            color: CROWN,
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
            Bullet-Train Designer
          </span>
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
          The bird
          <br />
          that hushed
          <br />
          a train.
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
          To kill the tunnel boom of the 500&nbsp;Series Shinkansen at
          300&nbsp;km/h, JR-West engineer Eiji Nakatsu reshaped its
          15&nbsp;m nose after the beak of the{" "}
          <span style={{ color: CROWN, fontWeight: 600 }}>
            common kingfisher
          </span>{" "}
          — a bird that pierces the ~800× density jump from air into
          water almost without a splash. Boom gone. Power −15%.
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
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
        <span>Nakatsu · JR-West · 500 Series · 1997</span>
        <span>
          <span style={{ color: BREAST }}>●</span> Alcedo atthis
        </span>
      </div>
    </AbsoluteFill>
  );
};
