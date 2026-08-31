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

// Palette — bound to the concept's visual brief
const INK = "#0B0805";
const BOARD = "#141110";
const BOARD_HI = "#1B1613";
const EMBER = "#D4552B";
const FLAME = "#F2A93B";
const FLASH = "#FFE39C";
const GRAY = "#8A7E6E";
const GRAY_HI = "#B7ADA0";
const GRID = "#1E1A17";
const GRID_MAJOR = "#2A2320";
const CHAMBER_STEEL = "#3B322C";

// ── Beetle geometry (in map coord space 1080 × 800) ──────────────────
// Beetle in strict left-facing profile; abdomen tip at right; the
// nozzle fires a pulsed jet rightward.

// Body outline (dorsal-side up), traced as a smooth closed path.
// Split into TOP curve (left→right) and BOTTOM curve (right→left).
const BODY_PATH = [
  // start: head tip, upper
  "M 60 460",
  // head dome
  "C 68 432, 92 418, 118 412",
  // prothorax top ridge
  "C 150 405, 190 398, 230 388",
  // elytra shoulder + dome
  "C 280 376, 340 374, 400 378",
  "C 460 382, 500 388, 540 402",
  // taper to abdomen tip
  "C 570 412, 590 435, 604 460",
  // over the nozzle apex
  "L 604 468",
  // abdomen underside
  "C 590 494, 560 512, 530 522",
  "C 470 538, 400 542, 340 540",
  "C 280 538, 230 534, 195 528",
  // prothorax underside
  "C 160 522, 130 514, 110 502",
  // head underside back to start
  "C 92 494, 74 484, 60 460",
  "Z",
].join(" ");

const ELYTRA_SEAM = "M 240 386 C 320 380 420 380 540 402";
const HEAD_LINE = "M 118 412 L 130 502";
const PROTHORAX_LINE = "M 230 388 L 220 534";

// Antennae: two segmented curves swept back over the head
const ANT_A = "M 78 442 C 40 428 18 400 4 370";
const ANT_B = "M 84 432 C 50 400 22 372 2 344";

// Legs (visible side: 3 pairs, each 3-segment articulated line)
type Leg = { path: string };
const LEGS: Leg[] = [
  { path: "M 155 522 L 158 578 L 138 612 L 118 622" },
  { path: "M 260 538 L 288 604 L 264 650 L 236 656" },
  { path: "M 400 542 L 442 604 L 420 654 L 388 664" },
];

// Internal cutaway — reservoir, valve, reaction chamber, exit
const RESERVOIR = { cx: 335, cy: 468, rx: 92, ry: 42 };
const CHAMBER = { cx: 512, cy: 468, rx: 40, ry: 26 };
const VALVE = { x1: 427, x2: 472, y: 468 };
const EXIT = { x1: 552, x2: 596, y: 468 };
const NOZZLE = { x: 604, y: 468 };

// Pulse train — a repeating series of puffs travelling right
type PulseSpec = { phase: number };
const PULSES: PulseSpec[] = [
  { phase: 0.0 },
  { phase: 0.2 },
  { phase: 0.4 },
  { phase: 0.6 },
  { phase: 0.8 },
];

// A small radial burst path (a rough "puff" — 12-point wobbly star)
const puffPoints = (
  cx: number,
  cy: number,
  rBase: number,
  seed: number,
): string => {
  const N = 14;
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    // deterministic wobble via seed
    const w = 0.72 + 0.28 * Math.sin(seed * 12.9898 + i * 3.7);
    const r = rBase * w;
    const x = cx + Math.cos(a) * r * 1.35;
    const y = cy + Math.sin(a) * r;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
};

// Callouts — corridorY is the y of the horizontal leader run
type Callout = {
  key: string;
  from: { x: number; y: number }; // anchor on diagram
  corridorY: number; // horizontal leader-run height
  to: { x: number; y: number }; // text baseline of tag (top row)
  tag: string;
  lines: string[];
};
const CALLOUTS: Callout[] = [
  {
    key: "reservoir",
    from: { x: 335, y: 428 },
    corridorY: 210,
    to: { x: 130, y: 250 },
    tag: "01 · RESERVOIR",
    lines: ["Hydroquinones", "+ 25% H₂O₂"],
  },
  {
    key: "valve",
    from: { x: 450, y: 460 },
    corridorY: 172,
    to: { x: 440, y: 212 },
    tag: "02 · SPHINCTER VALVE",
    lines: ["Muscular gate — opens", "under abdominal pressure"],
  },
  {
    key: "chamber",
    from: { x: 512, y: 445 },
    corridorY: 670,
    to: { x: 130, y: 693 },
    tag: "03 · REACTION CHAMBER",
    lines: ["Catalase + peroxidase", "walls: sclerotized cuticle"],
  },
  {
    key: "nozzle",
    from: { x: 604, y: 468 },
    corridorY: 670,
    to: { x: 700, y: 693 },
    tag: "04 · APERTURE",
    lines: ["Rotatable ~270°", "beetle steers its spray"],
  },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Master build-in curve (0 → 1 over first ~2.4s)
  const buildSpan = fps * 2.2;
  const t = Math.max(0, frame) / buildSpan;

  // Body draws in with a stroke wipe over first ~0.9s
  const bodyDraw = interpolate(frame, [0, fps * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Chambers appear ~0.6s
  const chamberIn = interpolate(frame, [fps * 0.6, fps * 1.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Callouts appear ~1.2s
  const calloutsIn = interpolate(frame, [fps * 1.2, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Chemistry inset appears ~0.9s
  const insetIn = interpolate(frame, [fps * 0.9, fps * 1.55], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Pulse cycle (loops after buildup) ─────────────────────────────
  // Real beetle: ~500 Hz. Visual undersampled loop: 2 s → 1 pulse cycle
  // The train shows 5 puffs, staggered evenly through the cycle.
  const pulseCycleSec = 1.6;
  const pulseFramesTotal = fps * pulseCycleSec;
  const pulseGlobal =
    (Math.max(0, frame - fps * 1.4) % pulseFramesTotal) / pulseFramesTotal;

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W;

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
        <span style={{ color: FLAME }}>2026 · 08 · 31</span>
      </div>

      {/* Drafting frame + diagram */}
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

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor={BOARD_HI} stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient
            id="reservoir-fill"
            cx="50%"
            cy="42%"
            r="70%"
          >
            <stop offset="0%" stopColor={FLAME} stopOpacity={0.95} />
            <stop offset="60%" stopColor={EMBER} stopOpacity={0.9} />
            <stop offset="100%" stopColor="#7C2C13" stopOpacity={0.9} />
          </radialGradient>

          <radialGradient
            id="chamber-fill"
            cx="50%"
            cy="45%"
            r="65%"
          >
            <stop offset="0%" stopColor={FLASH} stopOpacity={1} />
            <stop offset="55%" stopColor={FLAME} stopOpacity={0.98} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0.95} />
          </radialGradient>

          <radialGradient id="puff-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={FLASH} stopOpacity={0.95} />
            <stop offset="40%" stopColor={FLAME} stopOpacity={0.7} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1512" stopOpacity={1} />
            <stop offset="100%" stopColor="#0F0B08" stopOpacity={1} />
          </linearGradient>

          <filter id="hot-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2A2320"
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

        {/* Axis of fire marker (bottom-left) */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + FRAME.h - 34})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={10}
          letterSpacing={3}
        >
          <text textAnchor="start" y={4}>
            AXIS OF FIRE
          </text>
          <g transform="translate(96, 0)">
            <line
              x1={0}
              y1={0}
              x2={38}
              y2={0}
              stroke={GRAY}
              strokeWidth={1.2}
            />
            <polygon points={`38,-4 46,0 38,4`} fill={EMBER} />
          </g>
        </g>

        {/* Scale bar bottom-right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 160}, ${
            FRAME.y + FRAME.h - 30
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

        {/* Diagram content: scale 1080×800 into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Chemistry inset (top-right of board) */}
          <g
            opacity={insetIn}
            transform={`translate(700, 40)`}
          >
            <rect
              x={0}
              y={0}
              width={350}
              height={200}
              rx={2}
              fill="rgba(11, 8, 5, 0.55)"
              stroke={FLAME}
              strokeWidth={1.2}
            />
            {/* corner ticks */}
            <g stroke={FLAME} strokeWidth={1.5} fill="none">
              <line x1={0} y1={0} x2={16} y2={0} />
              <line x1={0} y1={0} x2={0} y2={16} />
              <line x1={350} y1={0} x2={334} y2={0} />
              <line x1={350} y1={0} x2={350} y2={16} />
              <line x1={0} y1={200} x2={16} y2={200} />
              <line x1={0} y1={200} x2={0} y2={184} />
              <line x1={350} y1={200} x2={334} y2={200} />
              <line x1={350} y1={200} x2={350} y2={184} />
            </g>
            <text
              x={22}
              y={36}
              fill={FLAME}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={4.5}
            >
              PULSE-JET REACTION
            </text>
            <line
              x1={22}
              y1={50}
              x2={328}
              y2={50}
              stroke={FLAME}
              strokeOpacity={0.35}
              strokeWidth={1}
            />
            <text
              x={22}
              y={90}
              fill={GRAY_HI}
              fontFamily={inter}
              fontSize={19}
              fontWeight={500}
              letterSpacing={0.4}
            >
              2 C₆H₄(OH)₂ + H₂O₂
            </text>
            <text
              x={22}
              y={120}
              fill={FLASH}
              fontFamily={inter}
              fontSize={19}
              fontWeight={500}
              letterSpacing={0.4}
            >
              → 2 C₆H₄O₂ + 2 H₂O
            </text>
            <line
              x1={22}
              y1={140}
              x2={328}
              y2={140}
              stroke={FLAME}
              strokeOpacity={0.35}
              strokeWidth={1}
            />
            <g
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={3.5}
              fill={GRAY_HI}
            >
              <text x={22} y={172}>
                100 °C
              </text>
              <text x={140} y={172}>
                500 Hz
              </text>
              <text x={250} y={172}>
                −204 kJ
              </text>
            </g>
            <text
              x={22}
              y={190}
              fill={GRAY}
              fontFamily={inter}
              fontSize={9}
              fontWeight={500}
              letterSpacing={3}
            >
              PULSED · EXOTHERMIC · ENZYME-DRIVEN
            </text>
          </g>

          {/* Pulse train — draw BEHIND the beetle so it starts at the nozzle */}
          <g opacity={Math.min(1, Math.max(0, (frame / fps - 1.2) / 0.4))}>
            {PULSES.map((p, i) => {
              const cyc = (pulseGlobal + p.phase) % 1;
              // travel from nozzle (x=604) to right edge (~1030)
              const startX = NOZZLE.x + 6;
              const endX = 1030;
              const x = startX + (endX - startX) * cyc;
              // vertical drift for a little variation
              const drift = Math.sin((cyc + i * 0.13) * Math.PI * 2) * 6;
              const y = NOZZLE.y + drift;
              const growth = 8 + cyc * 48;
              // opacity: 0 → 1 quickly, then fade
              const op = Math.min(1, cyc * 6) * (1 - cyc) ** 1.2;
              const coreR = 6 + cyc * 22;
              return (
                <g key={`pulse-${i}`} opacity={op}>
                  <polygon
                    points={puffPoints(x, y, growth, i * 1.7 + cyc * 3.1)}
                    fill="url(#puff-core)"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={coreR}
                    fill={FLASH}
                    opacity={0.65 * (1 - cyc)}
                    filter="url(#hot-glow)"
                  />
                </g>
              );
            })}
            {/* Nozzle flash — always brightest at the source */}
            <circle
              cx={NOZZLE.x + 4}
              cy={NOZZLE.y}
              r={16}
              fill={FLASH}
              opacity={0.85}
              filter="url(#hot-glow)"
            />
            <circle
              cx={NOZZLE.x + 4}
              cy={NOZZLE.y}
              r={5}
              fill="#FFFFFF"
            />
          </g>

          {/* Beetle body — filled first, then stroke overlay */}
          <g
            style={{
              opacity: bodyDraw,
            }}
          >
            <path d={BODY_PATH} fill="url(#body-fill)" />
            <path
              d={BODY_PATH}
              fill="none"
              stroke={GRAY_HI}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
            <path
              d={ELYTRA_SEAM}
              fill="none"
              stroke={GRAY}
              strokeWidth={1.2}
              strokeDasharray="6 5"
            />
            <path
              d={HEAD_LINE}
              fill="none"
              stroke={GRAY}
              strokeWidth={1.2}
            />
            <path
              d={PROTHORAX_LINE}
              fill="none"
              stroke={GRAY}
              strokeWidth={1.2}
            />
            {/* eye */}
            <circle cx={90} cy={455} r={3.8} fill={GRAY_HI} />
            <circle cx={90} cy={455} r={1.6} fill={INK} />
            {/* antennae */}
            <path
              d={ANT_A}
              fill="none"
              stroke={GRAY_HI}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <path
              d={ANT_B}
              fill="none"
              stroke={GRAY_HI}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            {/* antenna tips */}
            <circle cx={4} cy={370} r={2.4} fill={EMBER} />
            <circle cx={2} cy={344} r={2.4} fill={EMBER} />
            {/* legs */}
            {LEGS.map((leg, i) => (
              <path
                key={`leg-${i}`}
                d={leg.path}
                fill="none"
                stroke={GRAY_HI}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {/* foot pads */}
            {[
              [118, 622],
              [236, 656],
              [388, 664],
            ].map(([x, y], i) => (
              <circle
                key={`foot-${i}`}
                cx={x}
                cy={y}
                r={2.6}
                fill={GRAY_HI}
              />
            ))}
          </g>

          {/* Internal cutaway (chambers) */}
          <g opacity={chamberIn}>
            {/* Cutaway window: dashed indication of exposed interior */}
            <path
              d={`M 240 415 C 320 405 460 402 570 428 L 596 460 L 596 480 C 500 512 340 512 240 490 Z`}
              fill="rgba(11,8,5,0.55)"
              stroke={GRAY}
              strokeDasharray="3 4"
              strokeWidth={1}
            />

            {/* Reservoir */}
            <ellipse
              cx={RESERVOIR.cx}
              cy={RESERVOIR.cy}
              rx={RESERVOIR.rx}
              ry={RESERVOIR.ry}
              fill="url(#reservoir-fill)"
              stroke={EMBER}
              strokeWidth={1.4}
            />
            {/* Reservoir liquid line */}
            <path
              d={`M ${RESERVOIR.cx - RESERVOIR.rx + 8} ${
                RESERVOIR.cy - 8
              } Q ${RESERVOIR.cx} ${RESERVOIR.cy - 14}, ${
                RESERVOIR.cx + RESERVOIR.rx - 8
              } ${RESERVOIR.cy - 8}`}
              fill="none"
              stroke={FLASH}
              strokeWidth={1.2}
              strokeOpacity={0.7}
            />

            {/* Valve (sphincter) */}
            <path
              d={`M ${VALVE.x1} ${VALVE.y - 14} L ${VALVE.x2} ${
                VALVE.y - 8
              } L ${VALVE.x2} ${VALVE.y + 8} L ${VALVE.x1} ${VALVE.y + 14} Z`}
              fill={CHAMBER_STEEL}
              stroke={GRAY_HI}
              strokeWidth={1.3}
            />
            <line
              x1={VALVE.x1 + 6}
              y1={VALVE.y - 10}
              x2={VALVE.x2 - 6}
              y2={VALVE.y - 6}
              stroke={GRAY_HI}
              strokeWidth={0.9}
            />
            <line
              x1={VALVE.x1 + 6}
              y1={VALVE.y + 10}
              x2={VALVE.x2 - 6}
              y2={VALVE.y + 6}
              stroke={GRAY_HI}
              strokeWidth={0.9}
            />

            {/* Reaction chamber — armored double wall */}
            <ellipse
              cx={CHAMBER.cx}
              cy={CHAMBER.cy}
              rx={CHAMBER.rx + 6}
              ry={CHAMBER.ry + 6}
              fill="none"
              stroke={CHAMBER_STEEL}
              strokeWidth={4}
            />
            <ellipse
              cx={CHAMBER.cx}
              cy={CHAMBER.cy}
              rx={CHAMBER.rx}
              ry={CHAMBER.ry}
              fill="url(#chamber-fill)"
              stroke={FLASH}
              strokeWidth={1.3}
              filter="url(#hot-glow)"
            />
            {/* Chamber armor hatch marks */}
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i / 16) * Math.PI * 2;
              const r0 = CHAMBER.rx + 6;
              const r1 = CHAMBER.rx + 11;
              const x0 = CHAMBER.cx + Math.cos(a) * r0 * 1.02;
              const y0 = CHAMBER.cy + Math.sin(a) * r0 * 0.98;
              const x1 = CHAMBER.cx + Math.cos(a) * r1 * 1.02;
              const y1 = CHAMBER.cy + Math.sin(a) * r1 * 0.98;
              return (
                <line
                  key={`hatch-${i}`}
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  stroke={GRAY}
                  strokeWidth={1}
                />
              );
            })}

            {/* Exit passage */}
            <path
              d={`M ${EXIT.x1} ${EXIT.y - 8} L ${EXIT.x2} ${
                EXIT.y - 5
              } L ${EXIT.x2} ${EXIT.y + 5} L ${EXIT.x1} ${EXIT.y + 8} Z`}
              fill={CHAMBER_STEEL}
              stroke={GRAY_HI}
              strokeWidth={1.2}
            />

            {/* Nozzle aperture — hot rim */}
            <path
              d={`M ${NOZZLE.x - 4} ${NOZZLE.y - 6} L ${NOZZLE.x + 8} ${
                NOZZLE.y - 3
              } L ${NOZZLE.x + 8} ${NOZZLE.y + 3} L ${NOZZLE.x - 4} ${
                NOZZLE.y + 6
              } Z`}
              fill={FLAME}
              stroke={FLASH}
              strokeWidth={1.4}
            />

            {/* Flow arrow: reservoir → chamber */}
            <g stroke={FLASH} fill={FLASH} opacity={0.65}>
              <line
                x1={RESERVOIR.cx + RESERVOIR.rx + 2}
                y1={RESERVOIR.cy}
                x2={VALVE.x1 - 4}
                y2={RESERVOIR.cy}
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
              <polygon
                points={`${VALVE.x1 - 4},${VALVE.y - 3} ${VALVE.x1 + 2},${
                  VALVE.y
                } ${VALVE.x1 - 4},${VALVE.y + 3}`}
              />
            </g>
          </g>

          {/* Callouts (leader lines + label blocks) */}
          <g opacity={calloutsIn} fontFamily={inter}>
            {CALLOUTS.map((c) => {
              const leader = `M ${c.from.x} ${c.from.y} L ${c.from.x} ${c.corridorY} L ${c.to.x} ${c.corridorY}`;
              return (
                <g key={c.key}>
                  <circle
                    cx={c.from.x}
                    cy={c.from.y}
                    r={3}
                    fill={FLAME}
                    stroke={INK}
                    strokeWidth={1}
                  />
                  <path
                    d={leader}
                    fill="none"
                    stroke={GRAY}
                    strokeWidth={1}
                  />
                  <text
                    x={c.to.x}
                    y={c.to.y}
                    fill={FLAME}
                    fontSize={12}
                    fontWeight={600}
                    letterSpacing={3.5}
                  >
                    {c.tag}
                  </text>
                  {c.lines.map((line, li) => (
                    <text
                      key={li}
                      x={c.to.x}
                      y={c.to.y + 20 + li * 20}
                      fill={GRAY_HI}
                      fontSize={15}
                      fontWeight={400}
                      letterSpacing={0.8}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </g>

          {/* Range dimension marker along the pulse train */}
          <g opacity={calloutsIn} fill={GRAY} stroke={GRAY}>
            <line
              x1={NOZZLE.x + 8}
              y1={NOZZLE.y - 62}
              x2={1020}
              y2={NOZZLE.y - 62}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <line
              x1={NOZZLE.x + 8}
              y1={NOZZLE.y - 68}
              x2={NOZZLE.x + 8}
              y2={NOZZLE.y - 56}
              strokeWidth={1}
            />
            <line
              x1={1020}
              y1={NOZZLE.y - 68}
              x2={1020}
              y2={NOZZLE.y - 56}
              strokeWidth={1}
            />
            <text
              x={(NOZZLE.x + 8 + 1020) / 2}
              y={NOZZLE.y - 72}
              textAnchor="middle"
              fill={GRAY}
              stroke="none"
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
            >
              EFFECTIVE RANGE · ~20 MM
            </text>
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
          <text>FIG. 3 · CUTAWAY OF PYGIDIAL DEFENSIVE APPARATUS</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={FLAME}
            opacity={0.9}
          >
            BRACHINUS · CARABIDAE
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
            color: FLAME,
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
            Munitions Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The insect that fires
          <br />
          pulsed detonations.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          When cornered, the bombardier beetle mixes hydroquinones with 25%
          hydrogen peroxide inside an armored reaction chamber lined with{" "}
          <span style={{ color: FLAME, fontWeight: 600 }}>
            catalase and peroxidase
          </span>
          . The enzymatic oxidation ejects a boiling ~100 °C spray at roughly{" "}
          <span style={{ color: FLAME, fontWeight: 600 }}>
            500 pulses per second
          </span>{" "}
          — a real, imaged micro-scale pulse jet.
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
        <span>Dean, Aneshansley, Edgerton, Eisner · Science 248 (1990) 1219–1221</span>
        <span>
          <span style={{ color: FLAME }}>●</span> Pulse · 500 Hz
        </span>
      </div>
    </AbsoluteFill>
  );
};
