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
const INK = "#0B0A0E";
const BOARD = "#111015";
const CHITIN = "#1D131A";
const CHITIN_EDGE = "#6A2E1A";
const RUST = "#B23A18";
const EMBER = "#F26A1B";
const IGNITE = "#FFD86A";
const GRAY = "#8A8F99";
const GRID = "#1B171B";
const GRID_MAJOR = "#26212A";

// ── Beetle geometry in map coords (1080 × 800), facing LEFT ────────────
// Ground: y = 618. Body sits above. Abdomen curls up-back with the nozzle
// at (830, 320) aiming into the upper-right quadrant.
const GROUND_Y = 618;

const HEAD = { cx: 258, cy: 486, r: 44 };
const PRONOTUM = { x: 300, y: 442, w: 100, h: 76 };
const NOZZLE = { x: 812, y: 296 };
const NOZZLE_ANGLE = (-32 * Math.PI) / 180; // upward-right
const JET_DIR = { x: Math.cos(NOZZLE_ANGLE), y: Math.sin(NOZZLE_ANGLE) };
const JET_MAX = 340; // pixel length of the jet in map coords

// Elytra outer edge — a domed shell covering the abdomen, sitting behind
// the pronotum and tapering slightly to the rear.
const elytraPath =
  `M 396 432 ` +
  `C 470 396, 590 396, 670 456 ` +
  `C 686 470, 686 486, 668 500 ` +
  `C 590 522, 470 522, 396 512 ` +
  `C 380 506, 380 438, 396 432 ` +
  `Z`;

// Abdomen tip curled up and back — emerges from behind the elytra and
// swings dramatically up-right to the nozzle. Rendered as a tapered
// segmented tube.
const abdomenOuter =
  `M 645 500 ` +
  `C 690 486, 730 456, 770 400 ` +
  `C 786 376, 800 348, 810 320 ` +
  `L 826 288 ` +
  `L 846 306 ` +
  `C 828 354, 800 400, 762 448 ` +
  `C 728 486, 690 512, 660 522 ` +
  `Z`;

// Segment ridges on the abdomen (short cross-strokes across the tube)
const ABDOMEN_RIDGES: Array<{ x1: number; y1: number; x2: number; y2: number }> = [
  { x1: 660, y1: 496, x2: 676, y2: 520 },
  { x1: 690, y1: 484, x2: 704, y2: 512 },
  { x1: 720, y1: 462, x2: 736, y2: 492 },
  { x1: 748, y1: 434, x2: 762, y2: 464 },
  { x1: 774, y1: 400, x2: 790, y2: 430 },
  { x1: 800, y1: 362, x2: 814, y2: 388 },
];

type Leg = {
  hipX: number;
  hipY: number;
  kneeX: number;
  kneeY: number;
  ankleX: number;
  ankleY: number;
  toeX: number;
  toeY: number;
};
// Insect legs: three visible segments (femur → tibia → tarsus) with a
// slight knee bend and a foot on the ground.
const LEGS_NEAR: Leg[] = [
  { hipX: 340, hipY: 510, kneeX: 292, kneeY: 555, ankleX: 262, ankleY: 604, toeX: 246, toeY: GROUND_Y },
  { hipX: 448, hipY: 518, kneeX: 428, kneeY: 562, ankleX: 410, ankleY: 606, toeX: 400, toeY: GROUND_Y },
  { hipX: 568, hipY: 512, kneeX: 590, kneeY: 560, ankleX: 606, ankleY: 606, toeX: 620, toeY: GROUND_Y },
];
const LEGS_FAR: Leg[] = [
  { hipX: 360, hipY: 512, kneeX: 336, kneeY: 552, ankleX: 320, ankleY: 596, toeX: 316, toeY: GROUND_Y },
  { hipX: 468, hipY: 518, kneeX: 466, kneeY: 560, ankleX: 470, ankleY: 604, toeX: 478, toeY: GROUND_Y },
  { hipX: 588, hipY: 512, kneeX: 618, kneeY: 558, ankleX: 640, ankleY: 604, toeX: 654, toeY: GROUND_Y },
];

const legPath = (l: Leg) =>
  `M ${l.hipX} ${l.hipY} L ${l.kneeX} ${l.kneeY} L ${l.ankleX} ${l.ankleY} L ${l.toeX} ${l.toeY}`;


export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ──────────────────────────────────────────────────────────
  const beetleFade = interpolate(frame, [0, 22], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beetleDraw = interpolate(frame, [4, 40], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calloutOpacity = interpolate(frame, [46, 72], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ignitionStart = 42;
  const isFiring = frame >= ignitionStart;
  const firingFrame = Math.max(0, frame - ignitionStart);

  // Pulses: staccato staggered puffs traveling along the jet direction.
  // pulseInterval controls the on-screen cadence (well below the true 500 Hz
  // so that individual bursts stay legible).
  const pulseInterval = fps * 0.28;
  const pulses: Array<{ x: number; y: number; r: number; opacity: number; heat: number }> = [];
  if (isFiring) {
    const currentIndex = Math.floor(firingFrame / pulseInterval);
    for (let i = 0; i <= currentIndex; i++) {
      const emittedAt = i * pulseInterval;
      const lifeFrames = firingFrame - emittedAt;
      const lifeSec = lifeFrames / fps;
      const dist = lifeSec * (JET_MAX / 1.05); // sweep across the plume in ~1s
      if (dist > JET_MAX * 1.05) continue;
      const t = Math.max(0, Math.min(1, dist / JET_MAX));
      const size = 30 * (1 - t * 0.35) + 4;
      const bornEase = t < 0.06 ? t / 0.06 : 1;
      const dieEase = Math.max(0, 1 - Math.pow(t, 1.4));
      pulses.push({
        x: NOZZLE.x + JET_DIR.x * dist,
        y: NOZZLE.y + JET_DIR.y * dist,
        r: size,
        opacity: bornEase * dieEase,
        heat: 1 - t, // 1 → hottest, 0 → cool
      });
    }
  }

  // Ignition flash at nozzle: bright at each pulse emission, fades quickly.
  const phaseIntoPulse = isFiring ? (firingFrame % pulseInterval) / pulseInterval : 1;
  const flashOpacity = isFiring ? Math.max(0, 1 - phaseIntoPulse * 3.2) : 0;

  // Type in
  const titleSpring = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.4, fps * 2.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Frame geometry: 1080 × 800 map → 960 × 711 drafting frame at (60,130)
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W; // 960 / 1080

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
        <span style={{ color: EMBER }}>2026 · 08 · 11</span>
      </div>

      {/* Drafting frame + beetle */}
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
            width={48 * scale}
            height={48 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${48 * scale} 0 L 0 0 0 ${48 * scale}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192 * scale}
            height={192 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${192 * scale} 0 L 0 0 0 ${192 * scale}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#161219" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="elytra-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A141B" />
            <stop offset="100%" stopColor="#0C0910" />
          </linearGradient>

          <radialGradient id="ember-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={IGNITE} stopOpacity={0.9} />
            <stop offset="40%" stopColor={EMBER} stopOpacity={0.5} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="pulse-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={IGNITE} stopOpacity={1} />
            <stop offset="55%" stopColor={EMBER} stopOpacity={0.9} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="bright-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2B252E"
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
          <g key={i} stroke={EMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Fig / scale tag */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text>FIG. 1 · L. SIDE ELEVATION</text>
        </g>

        {/* Scale bar */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 172}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={100} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1.2} />
          <line x1={100} y1={-5} x2={100} y2={5} strokeWidth={1.2} />
          <text x={110} y={4} stroke="none">
            5 MM
          </text>
        </g>

        {/* Map content: scale 1080×800 coords into the frame */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Ground reference line */}
          <line
            x1={80}
            y1={GROUND_Y}
            x2={880}
            y2={GROUND_Y}
            stroke={GRID_MAJOR}
            strokeWidth={1}
            strokeDasharray="6 8"
            opacity={beetleFade}
          />

          {/* ── Jet plume (behind label overlay) ─────────────────────── */}
          <g opacity={beetleFade}>
            {/* Trailing atmospheric haze along the plume corridor */}
            {isFiring && (
              <path
                d={`M ${NOZZLE.x} ${NOZZLE.y} L ${
                  NOZZLE.x + JET_DIR.x * JET_MAX
                } ${NOZZLE.y + JET_DIR.y * JET_MAX}`}
                stroke={EMBER}
                strokeWidth={80}
                strokeOpacity={0.05}
                strokeLinecap="round"
                fill="none"
                filter="url(#bright-glow)"
              />
            )}

            {/* Pulses — outer glow layer */}
            {pulses.map((p, i) => (
              <circle
                key={`glow-${i}`}
                cx={p.x}
                cy={p.y}
                r={p.r * 1.9}
                fill={EMBER}
                opacity={p.opacity * 0.28}
                filter="url(#soft-glow)"
              />
            ))}

            {/* Pulses — cores */}
            {pulses.map((p, i) => (
              <circle
                key={`core-${i}`}
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="url(#pulse-fill)"
                opacity={p.opacity}
              />
            ))}

            {/* Pulses — hot centers */}
            {pulses.map((p, i) => (
              <circle
                key={`hot-${i}`}
                cx={p.x}
                cy={p.y}
                r={p.r * 0.35}
                fill={IGNITE}
                opacity={p.opacity * p.heat * 0.9}
              />
            ))}

            {/* Ignition flash at the nozzle */}
            {isFiring && (
              <>
                <circle
                  cx={NOZZLE.x}
                  cy={NOZZLE.y}
                  r={70}
                  fill="url(#ember-glow)"
                  opacity={flashOpacity * 0.85}
                  filter="url(#bright-glow)"
                />
                <circle
                  cx={NOZZLE.x}
                  cy={NOZZLE.y}
                  r={16}
                  fill={IGNITE}
                  opacity={flashOpacity}
                />
              </>
            )}
          </g>

          {/* ── Beetle (side elevation, facing left) ─────────────────── */}
          <g opacity={beetleFade}>
            {/* Far-side legs — drawn behind body, muted */}
            {LEGS_FAR.map((l, i) => (
              <path
                key={`legf-${i}`}
                d={legPath(l)}
                stroke={CHITIN_EDGE}
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={200}
                strokeDashoffset={200 * (1 - beetleDraw)}
              />
            ))}

            {/* Antennae — long, jointed feelers extending forward */}
            <g
              stroke={RUST}
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
              opacity={beetleDraw}
            >
              <path d={`M 232 466 C 180 434, 130 402, 90 372`} />
              <path d={`M 246 500 C 194 500, 142 494, 96 476`} />
              <circle cx={90} cy={372} r={5} fill={RUST} stroke="none" />
              <circle cx={96} cy={476} r={5} fill={RUST} stroke="none" />
            </g>

            {/* Head */}
            <g opacity={beetleDraw}>
              <circle
                cx={HEAD.cx}
                cy={HEAD.cy}
                r={HEAD.r}
                fill={CHITIN}
                stroke={CHITIN_EDGE}
                strokeWidth={2.2}
              />
              {/* Mandibles */}
              <path
                d={`M 218 474 L 190 466 L 216 486 Z`}
                fill={RUST}
                stroke={CHITIN_EDGE}
                strokeWidth={1}
              />
              <path
                d={`M 218 500 L 190 508 L 216 490 Z`}
                fill={RUST}
                stroke={CHITIN_EDGE}
                strokeWidth={1}
              />
              {/* Eye — small amber glint, upper-front of the head */}
              <circle cx={244} cy={470} r={5.5} fill={EMBER} />
              <circle cx={245.5} cy={468} r={1.8} fill={IGNITE} />
            </g>

            {/* Pronotum — shield-shaped, curving up to a soft dome */}
            <g opacity={beetleDraw}>
              <path
                d={
                  `M 300 462 ` +
                  `C 316 434, 386 434, 400 462 ` +
                  `L 404 512 ` +
                  `C 388 528, 316 528, 296 512 ` +
                  `Z`
                }
                fill={RUST}
                stroke={CHITIN_EDGE}
                strokeWidth={2}
              />
              {/* Central highlight ridge */}
              <path
                d={`M 316 450 C 344 442, 366 442, 388 452`}
                stroke={IGNITE}
                strokeOpacity={0.35}
                strokeWidth={1.2}
                fill="none"
              />
              {/* Faint side dot on the pronotum (typical carabid marking) */}
              <circle cx={350} cy={484} r={2.4} fill={CHITIN_EDGE} opacity={0.7} />
            </g>

            {/* Elytra */}
            <g opacity={beetleDraw}>
              <path
                d={elytraPath}
                fill="url(#elytra-fill)"
                stroke={CHITIN_EDGE}
                strokeWidth={2.4}
              />
              {/* Central seam splitting the two wing covers */}
              <path
                d={`M 400 428 C 480 406, 590 406, 674 466`}
                stroke={CHITIN_EDGE}
                strokeWidth={1.8}
                fill="none"
                opacity={0.95}
              />
              {/* Elytral grooves — parallel ridges along the shell */}
              {Array.from({ length: 9 }).map((_, i) => {
                const t = (i + 1) / 10;
                const x = 402 + t * 268;
                const arch = Math.sin(t * Math.PI);
                const y1 = 432 - arch * 8;
                const y2 = 512 + arch * 6;
                return (
                  <line
                    key={`groove-${i}`}
                    x1={x}
                    y1={y1}
                    x2={x}
                    y2={y2}
                    stroke={CHITIN_EDGE}
                    strokeWidth={0.9}
                    opacity={0.55}
                  />
                );
              })}
              {/* Warm rim highlight along the dome */}
              <path
                d={`M 410 428 C 480 402, 590 402, 660 452`}
                stroke={RUST}
                strokeOpacity={0.6}
                strokeWidth={2}
                fill="none"
              />
              <path
                d={`M 414 434 C 484 410, 588 410, 656 456`}
                stroke={IGNITE}
                strokeOpacity={0.2}
                strokeWidth={1.4}
                fill="none"
              />
            </g>

            {/* Abdomen (curled up, exposed swivel-turret) */}
            <g opacity={beetleDraw}>
              <path
                d={abdomenOuter}
                fill={CHITIN}
                stroke={CHITIN_EDGE}
                strokeWidth={2.2}
              />
              {ABDOMEN_RIDGES.map((r, i) => (
                <line
                  key={`ab-${i}`}
                  x1={r.x1}
                  y1={r.y1}
                  x2={r.x2}
                  y2={r.y2}
                  stroke={CHITIN_EDGE}
                  strokeWidth={1.3}
                  opacity={0.9}
                />
              ))}
              {/* Joint where the abdomen meets the elytra */}
              <path
                d={`M 650 496 C 660 508, 660 522, 650 528`}
                stroke={CHITIN_EDGE}
                strokeWidth={1.4}
                fill="none"
                opacity={0.9}
              />
              {/* Interior warm hint at the reaction chamber base */}
              <ellipse
                cx={710}
                cy={478}
                rx={30}
                ry={14}
                fill={EMBER}
                opacity={isFiring ? 0.5 : 0.18}
                filter="url(#soft-glow)"
              />
              <ellipse
                cx={710}
                cy={478}
                rx={12}
                ry={5}
                fill={IGNITE}
                opacity={isFiring ? 0.6 * flashOpacity + 0.25 : 0.1}
              />
            </g>

            {/* Nozzle — a small tapered ring at the tip of the abdomen */}
            <g opacity={beetleDraw}>
              <path
                d={`M ${NOZZLE.x - 18} ${NOZZLE.y + 14} L ${NOZZLE.x + 10} ${NOZZLE.y - 14} L ${NOZZLE.x + 26} ${NOZZLE.y - 4} L ${NOZZLE.x - 2} ${NOZZLE.y + 24} Z`}
                fill={RUST}
                stroke={CHITIN_EDGE}
                strokeWidth={1.5}
              />
              <line
                x1={NOZZLE.x - 6}
                y1={NOZZLE.y + 18}
                x2={NOZZLE.x + 22}
                y2={NOZZLE.y - 10}
                stroke={IGNITE}
                strokeOpacity={0.6}
                strokeWidth={1}
              />
            </g>

            {/* Near-side legs — drawn over body, sharp */}
            {LEGS_NEAR.map((l, i) => (
              <g key={`legn-${i}`}>
                <path
                  d={legPath(l)}
                  stroke={CHITIN}
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={220}
                  strokeDashoffset={220 * (1 - beetleDraw)}
                />
                <path
                  d={legPath(l)}
                  stroke={RUST}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={220}
                  strokeDashoffset={220 * (1 - beetleDraw)}
                />
              </g>
            ))}
          </g>

          {/* ── Callouts (leader lines to two labels) ─────────────────── */}
          <g opacity={calloutOpacity}>
            {/* Reaction chamber — dashed leader piercing the shell,
                then a clean L down and back-left along the ground line */}
            <g>
              <circle cx={710} cy={478} r={3.5} fill={EMBER} />
              {/* Dashed segment through the beetle's interior */}
              <line
                x1={710}
                y1={478}
                x2={710}
                y2={548}
                stroke={GRAY}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.75}
              />
              {/* Solid segment outside the body */}
              <line
                x1={710}
                y1={548}
                x2={710}
                y2={704}
                stroke={GRAY}
                strokeWidth={1}
              />
              <line
                x1={710}
                y1={704}
                x2={80}
                y2={704}
                stroke={GRAY}
                strokeWidth={1}
              />
              <text
                x={80}
                y={700}
                fill={GRAY}
                fontFamily={inter}
                fontSize={14}
                fontWeight={600}
                letterSpacing={3.5}
              >
                REACTION CHAMBER
              </text>
              <text
                x={80}
                y={726}
                fill={GRAY}
                fontFamily={inter}
                fontSize={13}
                fontWeight={400}
                letterSpacing={1.6}
                opacity={0.75}
              >
                catalase · peroxidase · quinones · ~100 °C
              </text>
            </g>

            {/* Pulsed nozzle — leader up-right into the top-right corner */}
            <g>
              <circle cx={NOZZLE.x + 6} cy={NOZZLE.y - 4} r={4} fill={IGNITE} />
              <line
                x1={NOZZLE.x + 6}
                y1={NOZZLE.y - 4}
                x2={936}
                y2={168}
                stroke={EMBER}
                strokeWidth={1.2}
              />
              <line
                x1={936}
                y1={168}
                x2={1030}
                y2={168}
                stroke={EMBER}
                strokeWidth={1.2}
              />
              <text
                x={1030}
                y={164}
                textAnchor="end"
                fill={EMBER}
                fontFamily={inter}
                fontSize={14}
                fontWeight={700}
                letterSpacing={3.5}
              >
                PULSED NOZZLE
              </text>
              <text
                x={1030}
                y={190}
                textAnchor="end"
                fill={IGNITE}
                fontFamily={inter}
                fontSize={13}
                fontWeight={500}
                letterSpacing={2}
              >
                ≈ 500 pulses / sec
              </text>
            </g>
          </g>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · BRACHININAE DEFENSIVE PULSEJET (SCHEMATIC)</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={EMBER}
            opacity={0.85}
          >
            OUTPUT AT ~10 M/S
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 908,
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
            color: EMBER,
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
            Rocket Scientist
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
          The beetle that
          <br />
          invented the pulsejet.
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
          Cornered by an ant, the{" "}
          <span style={{ color: EMBER, fontWeight: 600 }}>
            bombardier beetle
          </span>{" "}
          floods a reinforced abdominal chamber with hydroquinones and
          hydrogen peroxide, catalyses a ~100 °C reaction, and fires the
          exhaust not as a stream but as roughly{" "}
          <span style={{ color: IGNITE, fontWeight: 600 }}>
            500 discrete pulses per second
          </span>{" "}
          — the same pulsed-combustion trick engineers later studied for
          pulsejet propulsion.
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
        <span>Dean, Aneshansley &amp; Eisner · Science 248 (1990) 1219</span>
        <span>
          <span style={{ color: EMBER }}>●</span> Ejecta = quinone spray
        </span>
      </div>
    </AbsoluteFill>
  );
};
