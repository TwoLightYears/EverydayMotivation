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

// Palette — drawn from Magicicada septendecim's real coloration
const INK = "#0F0B08";
const BOARD = "#171008";
const PARCHMENT = "#F4E3C0";
const AMBER = "#C46A2C";
const AMBER_GLOW = "#E7B770";
const EYE_RED = "#A22222";
const OAK = "#6B4423";
const MUTED = "#7A6444";
const GRID = "#1E160D";
const GRID_MAJOR = "#2A1F12";

// ── Geometry ──────────────────────────────────────────────────────────────
// The cipher wheel sits centered in the drafting frame.
// Frame: x 60, y 130, w 960, h 711 → center (540, 485.5)
const CX = 540;
const CY = 484;
const R_OUTER = 322; // outer ring
const R_TICKS = 306; // tick base
const R_TICKS_MAJOR = 288; // major tick inner
const R_TICKS_MINOR = 296; // minor tick inner
const R_LABEL = 264; // number labels
const R_INNER = 216; // inner glyph ring
const R_INNER_LINE = 208;

// 17-year cycle → 17 tick positions
const TICKS = 17;
const PRIMES = new Set([13, 17]); // the two known Magicicada emergence primes

const toXY = (r: number, angleDeg: number): { x: number; y: number } => {
  const a = ((angleDeg - 90) * Math.PI) / 180; // start at 12 o'clock, clockwise
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};

// Tick angle for year n ∈ [1, TICKS]
const tickAngle = (n: number): number => ((n - 1) * 360) / TICKS;

// ── Cicada silhouette ─────────────────────────────────────────────────────
// Top-down view, body along the vertical axis, wings folded/spread.
// Coordinate frame is local to the cicada center (0,0).
type WingSide = 1 | -1;

const cicadaBodyPath = (): string => {
  // Head, thorax, and segmented abdomen, tapering to point.
  // Composed as a single closed path.
  return `
    M 0 -110
    C 18 -110  28 -98  28 -80
    C 28 -66  22 -56  20 -50
    C 34 -46  40 -32  40 -14
    C 40 4    36 22   30 40
    C 26 58   22 78   14 108
    C 8 122   4 130   0 138
    C -4 130 -8 122  -14 108
    C -22 78 -26 58  -30 40
    C -36 22 -40 4   -40 -14
    C -40 -32 -34 -46 -20 -50
    C -22 -56 -28 -66 -28 -80
    C -28 -98 -18 -110 0 -110
    Z
  `;
};

const cicadaWingPath = (side: WingSide): string => {
  // Elongated teardrop wing. Right = side +1; mirror for left.
  const s = side;
  return `
    M ${s * 8} -78
    C ${s * 60} -84  ${s * 148} -60  ${s * 196} -8
    C ${s * 220} 26  ${s * 214} 78   ${s * 176} 108
    C ${s * 140} 132 ${s * 92} 140   ${s * 56} 128
    C ${s * 34} 118  ${s * 22} 96    ${s * 16} 68
    C ${s * 12} 40   ${s * 10} 12    ${s * 8} -78
    Z
  `;
};

// Wing veins — polyline paths from a root on the wing to the tip.
const wingVeins = (side: WingSide): string[] => {
  const s = side;
  return [
    // Costal (leading edge)
    `M ${s * 14} -70 C ${s * 60} -78 ${s * 140} -58 ${s * 192} -10`,
    // Radial
    `M ${s * 16} -50 C ${s * 60} -46 ${s * 130} -26 ${s * 200} 0`,
    // Median
    `M ${s * 18} -22 C ${s * 60} -18 ${s * 130} 6 ${s * 202} 26`,
    // Cubital
    `M ${s * 20} 8   C ${s * 60} 18  ${s * 130} 42 ${s * 190} 66`,
    // Anal
    `M ${s * 20} 40  C ${s * 60} 60  ${s * 120} 88 ${s * 168} 104`,
    // Cross veins
    `M ${s * 92} -32 L ${s * 88} 22`,
    `M ${s * 140} -12 L ${s * 132} 46`,
    `M ${s * 176} 20 L ${s * 158} 78`,
  ];
};

// Small abdomen segment lines
const abdomenLines = (): { x1: number; x2: number; y: number }[] => [
  { x1: -34, x2: 34, y: -6 },
  { x1: -36, x2: 36, y: 14 },
  { x1: -34, x2: 34, y: 34 },
  { x1: -30, x2: 30, y: 54 },
  { x1: -24, x2: 24, y: 74 },
  { x1: -18, x2: 18, y: 92 },
  { x1: -12, x2: 12, y: 108 },
];

export const CicadaCipher: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Motion timeline (150 frames @ 30fps = 5 s) ─────────────────────
  //  0.0 s  fade in cipher backdrop
  //  0.4 s  begin ticking — one tick per ~0.09 s across 17 ticks (~1.5 s)
  //  ~1.6 s tick 13 lights (prime)
  //  ~2.0 s tick 17 lights + wings unfurl + title spring
  //  2.4 s  hook fades in
  //  3.0 s  gentle sweep across dial (radial pulse) begins loop
  const TICK_START = fps * 0.35; // 10.5f
  const TICK_STEP = fps * 0.09; // ~2.7f per tick
  const currentTickFloat = Math.max(0, (frame - TICK_START) / TICK_STEP);
  const currentTick = Math.min(TICKS, currentTickFloat);

  const cipherFade = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const wingUnfurl = spring({
    frame: frame - (TICK_START + TICK_STEP * TICKS),
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });

  const titleSpring = spring({
    frame: frame - fps * 2.05,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 2.4, fps * 3.15], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Radial dial sweep (gentle pulse around the wheel after emergence)
  const sweepProgress = interpolate(
    frame,
    [fps * 3.0, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const sweepAngle = sweepProgress * 360;

  // Prime highlight strength: each pulses when reached.
  const primeGlow = (n: number): number => {
    const primeReachFrame = TICK_START + TICK_STEP * n;
    const g = interpolate(
      frame,
      [primeReachFrame - 1, primeReachFrame + fps * 0.35],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return g;
  };

  const FRAME = { x: 60, y: 130, w: 960, h: 711 };

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
          color: MUTED,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 09 · 04</span>
      </div>

      {/* Drafting frame + cipher wheel */}
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
            width={48 * (FRAME.w / 1080)}
            height={48 * (FRAME.w / 1080)}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${48 * (FRAME.w / 1080)} 0 L 0 0 0 ${48 * (FRAME.w / 1080)}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192 * (FRAME.w / 1080)}
            height={192 * (FRAME.w / 1080)}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${192 * (FRAME.w / 1080)} 0 L 0 0 0 ${192 * (FRAME.w / 1080)}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1B1308" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="prime-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER_GLOW} stopOpacity={0.85} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="wing-warm" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={AMBER_GLOW} stopOpacity={0.06} />
            <stop offset="60%" stopColor={AMBER} stopOpacity={0.18} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0.04} />
          </linearGradient>

          <radialGradient id="sweep-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER_GLOW} stopOpacity={0.28} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

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
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2E2314"
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
          <g key={i} stroke={AMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Marginal marks: field notes at top-left of the board */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 28})`}
          fill={MUTED}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · BROOD-EMERGENCE DIAL</text>
        </g>

        {/* Emergence-count in the top-right of the board */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 24}, ${FRAME.y + 28})`}
          fill={MUTED}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          textAnchor="end"
        >
          <text>
            <tspan>YEARS  </tspan>
            <tspan fill={PARCHMENT}>
              {String(Math.min(TICKS, Math.floor(currentTick))).padStart(
                2,
                "0",
              )}
            </tspan>
            <tspan> / 17</tspan>
          </text>
        </g>

        {/* ── Cipher wheel ────────────────────────────────────────── */}
        <g opacity={cipherFade}>
          {/* Outer ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER}
            fill="none"
            stroke={OAK}
            strokeWidth={1.2}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER - 8}
            fill="none"
            stroke={OAK}
            strokeWidth={0.6}
            opacity={0.6}
          />
          {/* Inner glyph ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R_INNER_LINE}
            fill="none"
            stroke={OAK}
            strokeWidth={0.6}
            opacity={0.5}
          />

          {/* Radial sweep — a soft, wandering "reading" wedge */}
          {sweepProgress > 0 &&
            (() => {
              const wedge = 20; // degrees
              const a0 = ((sweepAngle - 90 - wedge) * Math.PI) / 180;
              const a1 = ((sweepAngle - 90 + wedge) * Math.PI) / 180;
              const p0 = {
                x: CX + R_OUTER * Math.cos(a0),
                y: CY + R_OUTER * Math.sin(a0),
              };
              const p1 = {
                x: CX + R_OUTER * Math.cos(a1),
                y: CY + R_OUTER * Math.sin(a1),
              };
              return (
                <path
                  d={`M ${CX} ${CY} L ${p0.x} ${p0.y} A ${R_OUTER} ${R_OUTER} 0 0 1 ${p1.x} ${p1.y} Z`}
                  fill="url(#sweep-grad)"
                  opacity={0.18}
                />
              );
            })()}

          {/* Tick marks + labels */}
          {Array.from({ length: TICKS }).map((_, i) => {
            const n = i + 1;
            const angle = tickAngle(n);
            const isPrime = PRIMES.has(n);
            const reached = currentTick >= n - 0.05;
            if (!reached) return null;
            const reachStrength = interpolate(
              currentTick,
              [n - 0.5, n + 0.4],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const tickInner = isPrime ? R_TICKS_MAJOR : R_TICKS_MINOR;
            const a = toXY(tickInner, angle);
            const b = toXY(R_TICKS, angle);
            const lbl = toXY(R_LABEL, angle);
            const stroke = isPrime ? AMBER : PARCHMENT;
            const weight = isPrime ? 3 : 1.4;
            const glow = isPrime ? primeGlow(n) : 0;
            return (
              <g key={`tick-${n}`} opacity={reachStrength}>
                {/* Prime radial glow behind */}
                {isPrime && glow > 0 && (
                  <>
                    <circle
                      cx={lbl.x}
                      cy={lbl.y}
                      r={30 + 18 * glow}
                      fill="url(#prime-glow)"
                      opacity={0.55 * glow}
                    />
                    {/* prime spoke, from center out */}
                    <line
                      x1={CX + R_INNER * Math.cos(((angle - 90) * Math.PI) / 180)}
                      y1={CY + R_INNER * Math.sin(((angle - 90) * Math.PI) / 180)}
                      x2={b.x}
                      y2={b.y}
                      stroke={AMBER}
                      strokeWidth={1.4 * glow}
                      strokeOpacity={0.45 * glow}
                      strokeDasharray="2 4"
                    />
                  </>
                )}
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeWidth={weight}
                  strokeLinecap="round"
                  opacity={isPrime ? 0.6 + 0.4 * glow : 0.55}
                  filter={isPrime && glow > 0.3 ? "url(#soft-glow)" : undefined}
                />
                <text
                  x={lbl.x}
                  y={lbl.y + 4}
                  textAnchor="middle"
                  fill={isPrime ? AMBER_GLOW : MUTED}
                  fontFamily={inter}
                  fontSize={isPrime ? 15 : 11}
                  fontWeight={isPrime ? 700 : 500}
                  letterSpacing={isPrime ? 2 : 1}
                  opacity={isPrime ? 0.75 + 0.25 * glow : 0.85}
                  style={
                    isPrime && glow > 0.3
                      ? { filter: "drop-shadow(0 0 6px rgba(231,183,112,0.6))" }
                      : undefined
                  }
                >
                  {String(n).padStart(2, "0")}
                </text>
              </g>
            );
          })}

          {/* Inner ring dashes: legend of prime keys */}
          {(() => {
            const dashCount = 60;
            const dashes = [];
            for (let i = 0; i < dashCount; i++) {
              const angle = (i * 360) / dashCount;
              const a = toXY(R_INNER + 2, angle);
              const b = toXY(R_INNER + 8, angle);
              dashes.push(
                <line
                  key={`d-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={OAK}
                  strokeWidth={0.8}
                  opacity={0.55}
                />,
              );
            }
            return dashes;
          })()}
        </g>

        {/* ── Cicada silhouette (revealed as wings unfurl on tick 17) ── */}
        <g
          transform={`translate(${CX}, ${CY})`}
          opacity={cipherFade}
        >
          {/* Body (always visible, drawn subtly) */}
          <g opacity={1}>
            {/* Warm halo behind body — tight to wing coverage so it doesn't smudge past */}
            <ellipse
              cx={0}
              cy={30}
              rx={55}
              ry={90}
              fill={AMBER}
              opacity={0.10}
            />
            <path
              d={cicadaBodyPath()}
              fill="#26170B"
              stroke={AMBER}
              strokeWidth={1.5}
            />
            {/* Abdomen segment lines */}
            {abdomenLines().map((l, i) => (
              <line
                key={`ab-${i}`}
                x1={l.x1}
                y1={l.y}
                x2={l.x2}
                y2={l.y}
                stroke={AMBER}
                strokeWidth={0.7}
                opacity={0.55}
              />
            ))}
            {/* Eyes */}
            <circle cx={-14} cy={-98} r={5} fill={EYE_RED} />
            <circle cx={14} cy={-98} r={5} fill={EYE_RED} />
            <circle cx={-14} cy={-99} r={1.5} fill={AMBER_GLOW} opacity={0.9} />
            <circle cx={14} cy={-99} r={1.5} fill={AMBER_GLOW} opacity={0.9} />
            {/* Antennae */}
            <path
              d="M -8 -108 C -20 -122 -34 -128 -46 -132"
              stroke={AMBER}
              strokeWidth={0.9}
              fill="none"
            />
            <path
              d="M 8 -108 C 20 -122 34 -128 46 -132"
              stroke={AMBER}
              strokeWidth={0.9}
              fill="none"
            />
          </g>

          {/* Wings — unfurl on tick 17 */}
          {([1, -1] as WingSide[]).map((side) => {
            const s = side;
            const spread = wingUnfurl; // 0 → 1
            const scaleX = 0.28 + 0.72 * spread;
            const scaleY = 0.55 + 0.45 * spread;
            const rot = (1 - spread) * s * -18;
            return (
              <g
                key={`wing-${s}`}
                transform={`rotate(${rot}) scale(${scaleX}, ${scaleY})`}
                opacity={0.05 + 0.95 * spread}
              >
                <path
                  d={cicadaWingPath(s)}
                  fill="url(#wing-warm)"
                  stroke={AMBER}
                  strokeWidth={1.5}
                />
                {/* Wing veins */}
                {wingVeins(s).map((v, i) => (
                  <path
                    key={`v-${s}-${i}`}
                    d={v}
                    stroke={AMBER_GLOW}
                    strokeWidth={1.05}
                    fill="none"
                    opacity={0.9}
                  />
                ))}
                {/* Membrane highlight */}
                <path
                  d={cicadaWingPath(s)}
                  fill="none"
                  stroke={AMBER_GLOW}
                  strokeWidth={0.6}
                  opacity={0.35 * spread}
                />
              </g>
            );
          })}

          {/* Center accent — a tiny cross-hair (the cryptographer's mark) */}
          <line x1={-6} y1={0} x2={6} y2={0} stroke={AMBER} strokeWidth={0.8} opacity={0.6} />
          <line x1={0} y1={-6} x2={0} y2={6} stroke={AMBER} strokeWidth={0.8} opacity={0.6} />
        </g>

        {/* Key legend beneath the cipher */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + FRAME.h - 24})`}
          fill={MUTED}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>
            <tspan fill={AMBER}>■</tspan>
            <tspan>  PRIME KEY · 13, 17</tspan>
          </text>
          <text x={FRAME.w - 48} textAnchor="end">
            <tspan fill={PARCHMENT} opacity={0.75}>
              MAGICICADA · E. N. AMERICA
            </tspan>
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
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
            [16, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: AMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: MUTED, margin: "0 4px" }}>/</span>
          <span style={{ color: PARCHMENT, letterSpacing: 5 }}>
            Cryptographer
          </span>
        </div>

        <div
          style={{
            color: PARCHMENT,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The prime-
          <br />
          numbered cipher.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#E9DDC1",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          <span style={{ color: AMBER_GLOW, fontStyle: "italic" }}>
            Magicicada
          </span>{" "}
          broods emerge only on{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            prime-numbered years — 13 or 17
          </span>{" "}
          — an interval that keeps their generations from phase-locking with
          any shorter, non-prime predator cycle.
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
          color: MUTED,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Cox & Carlton 1988 · Yoshimura 1997 · Goles et al. 2001</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Prime key = 13, 17
        </span>
      </div>
    </AbsoluteFill>
  );
};
