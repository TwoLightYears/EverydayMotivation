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

// Palette — from the concept brief (real Brachinus coloration)
const INK = "#0F1116";
const BOARD = "#14171E";
const ORANGE = "#E4571B";
const ORANGE_DEEP = "#B03F0F";
const YELLOW = "#F5C542";
const YELLOW_SOFT = "#FFDF8A";
const CYAN = "#8FE0D8";
const CYAN_SOFT = "#B7EEE9";
const GRAY = "#C7CBD3";
const GRAY_DIM = "#7B8290";
const GRID = "#1C2029";
const GRID_MAJOR = "#262B36";
const CARBON = "#1A1D24";
const CHITIN = "#7A3F1F"; // legs / antennae (warm brown, biologically real)
const CHITIN_DARK = "#3D2110";

// ── Diagram coordinates (map space: 1080 × 800) ────────────────────────
// A side-profile schematic of a Brachinus and its rear-abdomen reactor.
// The beetle faces LEFT; the nozzle fires to the LOWER RIGHT.
const CENTER_Y = 420;
const HEAD_X = 210;
const TAIL_X = 860;

// Rear-abdomen reactor coords
const RES_H2O2 = { x: 745, y: 390, r: 24 };
const RES_HQ = { x: 745, y: 452, r: 24 };
const VALVE_X = 795;
const CHAMBER = { x: 808, y: 398, w: 54, h: 58 };
const NOZZLE_TIP = { x: 892, y: 462 };
const NOZZLE_BASE = { x: 866, y: 448 };
// Unit direction of the jet — steep down-right so the plume clears the gauge
const JET_DIR = { x: 0.4, y: 0.917 };

// Callout endpoints in map space (labels)
type Callout = {
  key: string;
  from: { x: number; y: number };
  elbow: { x: number; y: number };
  to: { x: number; y: number };
  anchor: "start" | "end";
  index: string;
  label: string;
  sub?: string;
};
const CALLOUTS: Callout[] = [
  {
    key: "h2o2",
    from: { x: RES_H2O2.x - 8, y: RES_H2O2.y - 6 },
    elbow: { x: 660, y: 260 },
    to: { x: 500, y: 260 },
    anchor: "end",
    index: "01",
    label: "HYDROGEN PEROXIDE",
    sub: "H₂O₂  ·  ~10 %",
  },
  {
    key: "hq",
    from: { x: RES_HQ.x - 8, y: RES_HQ.y + 8 },
    elbow: { x: 660, y: 600 },
    to: { x: 500, y: 600 },
    anchor: "end",
    index: "02",
    label: "HYDROQUINONE",
    sub: "C₆H₄(OH)₂  ·  ~25 %",
  },
  {
    key: "chamber",
    from: { x: CHAMBER.x + CHAMBER.w, y: CHAMBER.y + 8 },
    elbow: { x: 930, y: 260 },
    to: { x: 930, y: 260 },
    anchor: "end",
    index: "03",
    label: "REACTION CHAMBER",
    sub: "catalase · peroxidase",
  },
  {
    key: "jet",
    from: { x: 954, y: 610 },
    elbow: { x: 954, y: 720 },
    to: { x: 830, y: 720 },
    anchor: "end",
    index: "04",
    label: "1,4-BENZOQUINONE",
    sub: "≈ 100 °C  ·  ~500 Hz pulse",
  },
];

// ── Beetle silhouette paths (all in map space, facing LEFT) ────────────
// Elytra: elongated dome with a center suture (the split between wing covers).
const ELYTRA_PATH = `
  M 250 ${CENTER_Y - 55}
  C 340 ${CENTER_Y - 60}, 620 ${CENTER_Y - 62}, 745 ${CENTER_Y - 45}
  L 760 ${CENTER_Y - 30}
  L 760 ${CENTER_Y + 30}
  L 745 ${CENTER_Y + 45}
  C 620 ${CENTER_Y + 62}, 340 ${CENTER_Y + 60}, 250 ${CENTER_Y + 55}
  Z
`;

// Pronotum: shield-shaped, sits at the front, ORANGE.
const PRONOTUM_PATH = `
  M 265 ${CENTER_Y - 40}
  C 240 ${CENTER_Y - 44}, 225 ${CENTER_Y - 32}, 220 ${CENTER_Y - 18}
  L 218 ${CENTER_Y + 18}
  C 225 ${CENTER_Y + 32}, 240 ${CENTER_Y + 44}, 265 ${CENTER_Y + 40}
  Z
`;

// Head: rounded, ORANGE.
const HEAD_PATH = `
  M 218 ${CENTER_Y - 22}
  C 200 ${CENTER_Y - 24}, 180 ${CENTER_Y - 16}, ${HEAD_X - 40} ${CENTER_Y - 8}
  L ${HEAD_X - 46} ${CENTER_Y + 8}
  C 180 ${CENTER_Y + 16}, 200 ${CENTER_Y + 24}, 218 ${CENTER_Y + 22}
  Z
`;

// Legs: three pairs, thin lines with a mid-joint dot.
type Leg = { hipX: number; midX: number; midY: number; footX: number; footY: number };
const LEGS: Leg[] = [
  { hipX: 300, midX: 285, midY: 505, footX: 265, footY: 555 },
  { hipX: 470, midX: 475, midY: 520, footX: 470, footY: 578 },
  { hipX: 640, midX: 665, midY: 520, footX: 700, footY: 578 },
];

// Antennae: thin lines with a slight kink.
const ANTENNAE = [
  { from: { x: HEAD_X - 40, y: CENTER_Y - 6 }, kink: { x: 140, y: CENTER_Y - 40 }, tip: { x: 95, y: CENTER_Y - 70 } },
  { from: { x: HEAD_X - 40, y: CENTER_Y + 6 }, kink: { x: 140, y: CENTER_Y + 40 }, tip: { x: 95, y: CENTER_Y + 70 } },
];

// Elytra ridges (parallel grooves on the wing covers)
const RIDGE_XS = [340, 400, 460, 520, 580, 640, 700];

// Pulse timing — a 5 Hz visible pulse (a compressed stand-in for the real 500 Hz)
const PULSE_HZ = 5;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global fade-in for the diagram
  const bodyAppear = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  // Fluid level in reservoirs — climbs 0→1 between 0.4s and 1.4s
  const fluidT = interpolate(frame, [fps * 0.4, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Valve open + charge into chamber — 1.4s → 2.1s
  const chargeT = interpolate(frame, [fps * 1.4, fps * 2.1], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Reaction heat: 1.9s → 2.4s, then held
  const heatT = interpolate(frame, [fps * 1.9, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Jet firing starts at 2.2s; pulses at PULSE_HZ
  const jetActive = frame >= fps * 2.2 ? 1 : 0;
  const pulsePhase = ((frame - fps * 2.2) / fps) * PULSE_HZ;
  const pulseCycle = Math.max(0, jetActive) * (0.5 + 0.5 * Math.cos(pulsePhase * Math.PI * 2 - Math.PI));
  // A sharp attack + short decay per pulse:
  const attackShape = Math.pow(pulseCycle, 0.5);

  // Title lockup
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Callouts stagger in
  const calloutOpacity = (i: number): number =>
    interpolate(frame, [fps * (1.3 + i * 0.18), fps * (1.8 + i * 0.18)], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W;

  // Temperature gauge (map coords, right side)
  const GAUGE = { x: 985, y: 210, w: 12, h: 420 };
  const gaugeFill = heatT;

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
          color: GRAY_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: ORANGE }}>2026 · 09 · 01</span>
      </div>

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

          <radialGradient id="board-vignette" cx="50%" cy="45%" r="72%">
            <stop offset="0%" stopColor="#181C24" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="elytra-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22262E" />
            <stop offset="60%" stopColor="#191C22" />
            <stop offset="100%" stopColor="#0F1116" />
          </linearGradient>

          <linearGradient id="pronotum-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ORANGE} />
            <stop offset="100%" stopColor={ORANGE_DEEP} />
          </linearGradient>

          <radialGradient id="chamber-heat" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={YELLOW_SOFT} stopOpacity={0.9} />
            <stop offset="50%" stopColor={ORANGE} stopOpacity={0.6} />
            <stop offset="100%" stopColor={ORANGE_DEEP} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="jet-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={YELLOW_SOFT} stopOpacity={1} />
            <stop offset="60%" stopColor={YELLOW} stopOpacity={0.9} />
            <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
          </linearGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="hot-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
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
          <g key={i} stroke={ORANGE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Sheet legend (top-left of frame) */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY_DIM}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text>SHEET 003 · SCALE 1 : 1.4</text>
          <text y={16} fontWeight={500} fill={GRAY_DIM} opacity={0.7}>
            SIDE ELEVATION · REAR ABDOMEN CUTAWAY
          </text>
        </g>

        {/* Sheet metadata (top-right of frame) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 30})`}
          fill={GRAY_DIM}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="end">SPECIMEN · BRACHINUS SP.</text>
          <text y={16} textAnchor="end" fontWeight={500} opacity={0.7}>
            DEFENSIVE APPARATUS
          </text>
        </g>

        {/* Diagram: 1080×800 map space projected into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Baseline datum */}
          <line
            x1={90}
            y1={CENTER_Y}
            x2={940}
            y2={CENTER_Y}
            stroke={GRID_MAJOR}
            strokeWidth={1}
            strokeDasharray="6 6"
            opacity={0.7}
          />
          {/* Centerline tick markers */}
          {[220, 400, 560, 720, 860].map((tx) => (
            <line
              key={`tick-${tx}`}
              x1={tx}
              y1={CENTER_Y - 5}
              x2={tx}
              y2={CENTER_Y + 5}
              stroke={GRAY_DIM}
              strokeWidth={1}
              opacity={0.55}
            />
          ))}

          {/* ── Beetle silhouette ── */}
          <g opacity={bodyAppear}>
            {/* Legs (behind body) */}
            {LEGS.map((leg, i) => (
              <g key={`leg-${i}`} stroke={CHITIN} strokeWidth={5} fill="none" strokeLinecap="round">
                <line x1={leg.hipX} y1={CENTER_Y + 40} x2={leg.midX} y2={leg.midY} />
                <line x1={leg.midX} y1={leg.midY} x2={leg.footX} y2={leg.footY} />
                <circle cx={leg.midX} cy={leg.midY} r={3.5} fill={CHITIN} stroke="none" />
                {/* Tarsus (thin foot tip) */}
                <line
                  x1={leg.footX}
                  y1={leg.footY}
                  x2={leg.footX - 6}
                  y2={leg.footY + 10}
                  stroke={CHITIN_DARK}
                  strokeWidth={2.5}
                />
              </g>
            ))}

            {/* Elytra (dark shell) */}
            <path d={ELYTRA_PATH} fill="url(#elytra-grad)" stroke="#2A2F38" strokeWidth={1.2} />

            {/* Elytra ridges — striae, the characteristic wing-cover grooves */}
            <g stroke="#080A0E" strokeWidth={1.4} opacity={0.85}>
              {RIDGE_XS.map((rx) => (
                <path
                  key={`ridge-${rx}`}
                  d={`M ${rx} ${CENTER_Y - 48}
                      Q ${rx + 1} ${CENTER_Y} ${rx} ${CENTER_Y + 48}`}
                  fill="none"
                />
              ))}
            </g>
            {/* Punctures along ridges — small dots */}
            <g fill="#050609" opacity={0.7}>
              {RIDGE_XS.map((rx, i) => (
                <React.Fragment key={`p-${rx}`}>
                  {[-32, -16, 16, 32].map((dy) => (
                    <circle
                      key={`p-${rx}-${dy}`}
                      cx={rx + (i % 2 === 0 ? 0 : 4)}
                      cy={CENTER_Y + dy}
                      r={0.9}
                    />
                  ))}
                </React.Fragment>
              ))}
            </g>

            {/* Elytra center suture */}
            <line
              x1={260}
              y1={CENTER_Y}
              x2={745}
              y2={CENTER_Y}
              stroke="#0B0D12"
              strokeWidth={1.5}
              opacity={0.9}
            />

            {/* Elytra highlight (top edge sheen) */}
            <path
              d={`M 300 ${CENTER_Y - 50} C 460 ${CENTER_Y - 58}, 620 ${CENTER_Y - 58}, 720 ${CENTER_Y - 46}`}
              fill="none"
              stroke="#3A414C"
              strokeWidth={1}
              opacity={0.7}
            />

            {/* Pronotum (orange shield) */}
            <path d={PRONOTUM_PATH} fill="url(#pronotum-grad)" stroke={ORANGE_DEEP} strokeWidth={1.2} />
            {/* Pronotum highlight */}
            <path
              d={`M 245 ${CENTER_Y - 30} C 240 ${CENTER_Y - 18}, 240 ${CENTER_Y - 6}, 245 ${CENTER_Y + 4}`}
              fill="none"
              stroke={YELLOW_SOFT}
              strokeWidth={1.2}
              opacity={0.4}
            />

            {/* Head (orange) */}
            <path d={HEAD_PATH} fill={ORANGE} stroke={ORANGE_DEEP} strokeWidth={1.2} />
            {/* Eye */}
            <circle cx={195} cy={CENTER_Y - 8} r={2.5} fill={CARBON} />

            {/* Mandibles */}
            <path
              d={`M ${HEAD_X - 42} ${CENTER_Y - 6} L ${HEAD_X - 58} ${CENTER_Y - 8} L ${HEAD_X - 52} ${CENTER_Y - 2}`}
              fill={CARBON}
              stroke={CARBON}
              strokeWidth={1}
            />
            <path
              d={`M ${HEAD_X - 42} ${CENTER_Y + 6} L ${HEAD_X - 58} ${CENTER_Y + 8} L ${HEAD_X - 52} ${CENTER_Y + 2}`}
              fill={CARBON}
              stroke={CARBON}
              strokeWidth={1}
            />

            {/* Antennae (11 segments — beetle standard, shown as beaded string) */}
            {ANTENNAE.map((a, i) => (
              <g key={`ant-${i}`} stroke={CHITIN} strokeWidth={2.4} fill="none" strokeLinecap="round">
                <line x1={a.from.x} y1={a.from.y} x2={a.kink.x} y2={a.kink.y} />
                <line x1={a.kink.x} y1={a.kink.y} x2={a.tip.x} y2={a.tip.y} />
                <circle cx={a.kink.x} cy={a.kink.y} r={3} fill={CHITIN} stroke="none" />
                <circle cx={a.tip.x} cy={a.tip.y} r={2.5} fill={CHITIN} stroke="none" />
              </g>
            ))}
          </g>

          {/* ── Rear-abdomen cutaway window ── */}
          <g opacity={bodyAppear}>
            {/* Cutaway backdrop: subtly lighter oval showing "inside" */}
            <ellipse
              cx={815}
              cy={CENTER_Y + 5}
              rx={112}
              ry={72}
              fill={CARBON}
              stroke="#2C323D"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            {/* Cutaway break-line ticks (the classic ragged edge of a cutaway) */}
            <path
              d={`M 706 ${CENTER_Y - 55}
                  l -6 3 l 4 6 l -8 4 l 5 7 l -6 4 l 4 7 l -7 4 l 4 7 l -6 5 l 5 6 l -6 5`}
              fill="none"
              stroke="#3A414C"
              strokeWidth={1.4}
              strokeLinejoin="round"
              opacity={0.75}
            />

            {/* Reservoir: H₂O₂ (upper) */}
            <g>
              <circle
                cx={RES_H2O2.x}
                cy={RES_H2O2.y}
                r={RES_H2O2.r}
                fill="#0F1116"
                stroke={GRAY}
                strokeWidth={1.5}
              />
              {/* Cyan fluid, level rises with fluidT then falls with chargeT */}
              <clipPath id="clip-h2o2">
                <circle cx={RES_H2O2.x} cy={RES_H2O2.y} r={RES_H2O2.r - 2} />
              </clipPath>
              <g clipPath="url(#clip-h2o2)">
                <rect
                  x={RES_H2O2.x - RES_H2O2.r}
                  y={
                    RES_H2O2.y +
                    RES_H2O2.r -
                    RES_H2O2.r * 2 * (fluidT * (1 - chargeT * 0.6))
                  }
                  width={RES_H2O2.r * 2}
                  height={RES_H2O2.r * 2 * (fluidT * (1 - chargeT * 0.6))}
                  fill={CYAN}
                  opacity={0.85}
                />
                <ellipse
                  cx={RES_H2O2.x}
                  cy={
                    RES_H2O2.y +
                    RES_H2O2.r -
                    RES_H2O2.r * 2 * (fluidT * (1 - chargeT * 0.6))
                  }
                  rx={RES_H2O2.r - 2}
                  ry={2}
                  fill={CYAN_SOFT}
                />
              </g>
              <text
                x={RES_H2O2.x}
                y={RES_H2O2.y + 4}
                textAnchor="middle"
                fill={CYAN_SOFT}
                fontFamily={inter}
                fontSize={13}
                fontWeight={700}
                letterSpacing={1.4}
              >
                H₂O₂
              </text>
            </g>

            {/* Reservoir: Hydroquinone (lower) */}
            <g>
              <circle
                cx={RES_HQ.x}
                cy={RES_HQ.y}
                r={RES_HQ.r}
                fill="#0F1116"
                stroke={GRAY}
                strokeWidth={1.5}
              />
              <clipPath id="clip-hq">
                <circle cx={RES_HQ.x} cy={RES_HQ.y} r={RES_HQ.r - 2} />
              </clipPath>
              <g clipPath="url(#clip-hq)">
                <rect
                  x={RES_HQ.x - RES_HQ.r}
                  y={
                    RES_HQ.y +
                    RES_HQ.r -
                    RES_HQ.r * 2 * (fluidT * (1 - chargeT * 0.6))
                  }
                  width={RES_HQ.r * 2}
                  height={RES_HQ.r * 2 * (fluidT * (1 - chargeT * 0.6))}
                  fill={YELLOW}
                  opacity={0.85}
                />
                <ellipse
                  cx={RES_HQ.x}
                  cy={
                    RES_HQ.y +
                    RES_HQ.r -
                    RES_HQ.r * 2 * (fluidT * (1 - chargeT * 0.6))
                  }
                  rx={RES_HQ.r - 2}
                  ry={2}
                  fill={YELLOW_SOFT}
                />
              </g>
              <text
                x={RES_HQ.x}
                y={RES_HQ.y + 4}
                textAnchor="middle"
                fill={ORANGE_DEEP}
                fontFamily={inter}
                fontSize={13}
                fontWeight={800}
                letterSpacing={1.4}
              >
                HQ
              </text>
            </g>

            {/* Feeder tubes converging into chamber */}
            <g stroke={GRAY} strokeWidth={2} fill="none" strokeLinecap="round">
              <path
                d={`M ${RES_H2O2.x + RES_H2O2.r} ${RES_H2O2.y} L ${VALVE_X} ${RES_H2O2.y} L ${CHAMBER.x} ${CHAMBER.y + 12}`}
              />
              <path
                d={`M ${RES_HQ.x + RES_HQ.r} ${RES_HQ.y} L ${VALVE_X} ${RES_HQ.y} L ${CHAMBER.x} ${CHAMBER.y + CHAMBER.h - 12}`}
              />
            </g>

            {/* Fluid streams during charge (cyan + yellow) */}
            {chargeT > 0.02 && (
              <g strokeWidth={4} fill="none" strokeLinecap="round" opacity={chargeT}>
                <path
                  d={`M ${RES_H2O2.x + RES_H2O2.r} ${RES_H2O2.y} L ${VALVE_X} ${RES_H2O2.y} L ${CHAMBER.x} ${CHAMBER.y + 12}`}
                  stroke={CYAN}
                />
                <path
                  d={`M ${RES_HQ.x + RES_HQ.r} ${RES_HQ.y} L ${VALVE_X} ${RES_HQ.y} L ${CHAMBER.x} ${CHAMBER.y + CHAMBER.h - 12}`}
                  stroke={YELLOW}
                />
              </g>
            )}

            {/* Valves (small triangles) */}
            <g fill={GRAY} stroke={GRAY}>
              <polygon
                points={`${VALVE_X - 4},${RES_H2O2.y - 5} ${VALVE_X + 4},${RES_H2O2.y - 5} ${VALVE_X},${RES_H2O2.y + 3}`}
              />
              <polygon
                points={`${VALVE_X - 4},${RES_HQ.y + 5} ${VALVE_X + 4},${RES_HQ.y + 5} ${VALVE_X},${RES_HQ.y - 3}`}
              />
            </g>

            {/* Reaction chamber (thick-walled) */}
            <g>
              {/* outer thick wall */}
              <rect
                x={CHAMBER.x - 3}
                y={CHAMBER.y - 3}
                width={CHAMBER.w + 6}
                height={CHAMBER.h + 6}
                rx={4}
                fill={CARBON}
                stroke={GRAY}
                strokeWidth={1.5}
              />
              {/* inner cavity */}
              <rect
                x={CHAMBER.x + 3}
                y={CHAMBER.y + 3}
                width={CHAMBER.w - 6}
                height={CHAMBER.h - 6}
                rx={2}
                fill="#0F1116"
                stroke={ORANGE_DEEP}
                strokeWidth={1}
              />
              {/* heat glow */}
              {heatT > 0.01 && (
                <rect
                  x={CHAMBER.x - 10}
                  y={CHAMBER.y - 10}
                  width={CHAMBER.w + 20}
                  height={CHAMBER.h + 20}
                  rx={8}
                  fill="url(#chamber-heat)"
                  opacity={heatT * (0.65 + 0.35 * attackShape)}
                  filter="url(#hot-glow)"
                />
              )}
              {/* chamber label with dark chip for legibility */}
              <rect
                x={CHAMBER.x + CHAMBER.w / 2 - 20}
                y={CHAMBER.y + CHAMBER.h / 2 - 8}
                width={40}
                height={16}
                rx={2}
                fill="#0B0D12"
                opacity={0.88}
              />
              <text
                x={CHAMBER.x + CHAMBER.w / 2}
                y={CHAMBER.y + CHAMBER.h / 2 + 4}
                textAnchor="middle"
                fill={YELLOW_SOFT}
                fontFamily={inter}
                fontSize={11}
                fontWeight={700}
                letterSpacing={1.4}
              >
                100°C
              </text>
            </g>

            {/* Nozzle (tapered tube from chamber corner) */}
            <path
              d={`M ${CHAMBER.x + CHAMBER.w} ${CHAMBER.y + CHAMBER.h - 8}
                  L ${NOZZLE_BASE.x} ${NOZZLE_BASE.y}
                  L ${NOZZLE_TIP.x} ${NOZZLE_TIP.y}
                  L ${NOZZLE_TIP.x - 4} ${NOZZLE_TIP.y + 8}
                  L ${CHAMBER.x + CHAMBER.w - 4} ${CHAMBER.y + CHAMBER.h}
                  Z`}
              fill={GRAY}
              stroke={GRAY_DIM}
              strokeWidth={1}
            />

            {/* ── Pulsed jet ── */}
            {jetActive === 1 && (
              <g>
                {/* Continuous carrier plume — a soft cone from the nozzle */}
                {(() => {
                  const angleDeg = (Math.atan2(JET_DIR.y, JET_DIR.x) * 180) / Math.PI;
                  const start = NOZZLE_TIP;
                  const len = 220;
                  const w0 = 10;
                  const w1 = 44;
                  const p0x = start.x + Math.cos(((angleDeg - 90) * Math.PI) / 180) * w0;
                  const p0y = start.y + Math.sin(((angleDeg - 90) * Math.PI) / 180) * w0;
                  const p1x = start.x + Math.cos(((angleDeg + 90) * Math.PI) / 180) * w0;
                  const p1y = start.y + Math.sin(((angleDeg + 90) * Math.PI) / 180) * w0;
                  const q0x =
                    start.x + JET_DIR.x * len + Math.cos(((angleDeg - 90) * Math.PI) / 180) * w1;
                  const q0y =
                    start.y + JET_DIR.y * len + Math.sin(((angleDeg - 90) * Math.PI) / 180) * w1;
                  const q1x =
                    start.x + JET_DIR.x * len + Math.cos(((angleDeg + 90) * Math.PI) / 180) * w1;
                  const q1y =
                    start.y + JET_DIR.y * len + Math.sin(((angleDeg + 90) * Math.PI) / 180) * w1;
                  return (
                    <path
                      d={`M ${p0x} ${p0y} L ${q0x} ${q0y} L ${q1x} ${q1y} L ${p1x} ${p1y} Z`}
                      fill={YELLOW}
                      opacity={0.13}
                      filter="url(#soft-glow)"
                    />
                  );
                })()}

                {/* Steam halo trailing the plume */}
                {[0, 1, 2, 3].map((k) => {
                  const spread = 26 + k * 15;
                  const phase = pulsePhase - k * 0.18;
                  const life = Math.max(0, 0.5 + 0.5 * Math.cos(phase * Math.PI * 2 - Math.PI));
                  const grow = 55 + k * 42 + life * 18;
                  const cx = NOZZLE_TIP.x + JET_DIR.x * grow;
                  const cy = NOZZLE_TIP.y + JET_DIR.y * grow;
                  return (
                    <circle
                      key={`steam-${k}`}
                      cx={cx}
                      cy={cy}
                      r={spread}
                      fill={YELLOW_SOFT}
                      opacity={0.08 + 0.12 * life}
                      filter="url(#soft-glow)"
                    />
                  );
                })}

                {/* Pulse packets travelling along the jet direction */}
                {[0, 1, 2, 3, 4, 5].map((k) => {
                  const phase = pulsePhase - k * 0.22;
                  const t01 = phase - Math.floor(phase);
                  const dist = 14 + t01 * 210;
                  const cx = NOZZLE_TIP.x + JET_DIR.x * dist;
                  const cy = NOZZLE_TIP.y + JET_DIR.y * dist;
                  const life = Math.pow(1 - t01, 0.9);
                  const angleDeg = (Math.atan2(JET_DIR.y, JET_DIR.x) * 180) / Math.PI;
                  return (
                    <g key={`pulse-${k}`}>
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx={30 * life + 10}
                        ry={18 * life + 6}
                        transform={`rotate(${angleDeg} ${cx} ${cy})`}
                        fill={YELLOW}
                        opacity={0.75 * life}
                        filter="url(#soft-glow)"
                      />
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx={18 * life + 5}
                        ry={9 * life + 3}
                        transform={`rotate(${angleDeg} ${cx} ${cy})`}
                        fill={YELLOW_SOFT}
                        opacity={0.95 * life}
                      />
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx={8 * life + 2}
                        ry={4 * life + 1.5}
                        transform={`rotate(${angleDeg} ${cx} ${cy})`}
                        fill="#FFFFFF"
                        opacity={0.9 * life}
                      />
                    </g>
                  );
                })}

                {/* Bright nozzle flare */}
                <circle
                  cx={NOZZLE_TIP.x}
                  cy={NOZZLE_TIP.y}
                  r={22 * (0.55 + 0.45 * attackShape)}
                  fill={YELLOW_SOFT}
                  opacity={0.85 * attackShape + 0.25}
                  filter="url(#hot-glow)"
                />
                <circle
                  cx={NOZZLE_TIP.x + JET_DIR.x * 6}
                  cy={NOZZLE_TIP.y + JET_DIR.y * 6}
                  r={7}
                  fill="#FFFFFF"
                  opacity={0.95}
                />
              </g>
            )}
          </g>

          {/* ── Callouts (leader lines + labels) ── */}
          {CALLOUTS.map((c, i) => {
            const op = calloutOpacity(i);
            return (
              <g key={c.key} opacity={op}>
                {/* Small dot at anchor point on diagram */}
                <circle cx={c.from.x} cy={c.from.y} r={3} fill={ORANGE} />
                <circle cx={c.from.x} cy={c.from.y} r={7} fill="none" stroke={ORANGE} strokeWidth={1} opacity={0.5} />
                {/* Leader line: anchor → elbow → label */}
                <path
                  d={`M ${c.from.x} ${c.from.y} L ${c.elbow.x} ${c.elbow.y} L ${c.to.x} ${c.to.y}`}
                  stroke={GRAY_DIM}
                  strokeWidth={1}
                  fill="none"
                  strokeDasharray="3 3"
                />
                {/* Index number */}
                <text
                  x={c.to.x + (c.anchor === "end" ? -14 : 14)}
                  y={c.to.y - 10}
                  textAnchor={c.anchor}
                  fill={ORANGE}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={700}
                  letterSpacing={2.5}
                >
                  {c.index}
                </text>
                {/* Label */}
                <text
                  x={c.to.x + (c.anchor === "end" ? -14 : 14)}
                  y={c.to.y + 8}
                  textAnchor={c.anchor}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={13}
                  fontWeight={600}
                  letterSpacing={2.5}
                >
                  {c.label}
                </text>
                {/* Sub-label */}
                {c.sub && (
                  <text
                    x={c.to.x + (c.anchor === "end" ? -14 : 14)}
                    y={c.to.y + 26}
                    textAnchor={c.anchor}
                    fill={GRAY_DIM}
                    fontFamily={inter}
                    fontSize={11}
                    fontWeight={500}
                    letterSpacing={1.6}
                  >
                    {c.sub}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Temperature gauge (right side) ── */}
          <g>
            <rect
              x={GAUGE.x - 1}
              y={GAUGE.y - 1}
              width={GAUGE.w + 2}
              height={GAUGE.h + 2}
              fill="none"
              stroke={GRAY_DIM}
              strokeWidth={1}
            />
            <rect
              x={GAUGE.x}
              y={GAUGE.y + GAUGE.h * (1 - gaugeFill)}
              width={GAUGE.w}
              height={GAUGE.h * gaugeFill}
              fill={ORANGE}
              opacity={0.9}
            />
            {/* Gauge ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
              const y = GAUGE.y + GAUGE.h * (1 - f);
              const value = Math.round(20 + (100 - 20) * f);
              return (
                <g key={`tick-g-${i}`}>
                  <line
                    x1={GAUGE.x - 6}
                    y1={y}
                    x2={GAUGE.x}
                    y2={y}
                    stroke={GRAY_DIM}
                    strokeWidth={1}
                  />
                  <text
                    x={GAUGE.x - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill={GRAY_DIM}
                    fontFamily={inter}
                    fontSize={10}
                    fontWeight={500}
                    letterSpacing={1.6}
                  >
                    {value}°
                  </text>
                </g>
              );
            })}
            <text
              x={GAUGE.x + GAUGE.w / 2}
              y={GAUGE.y - 12}
              textAnchor="middle"
              fill={GRAY_DIM}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={2.5}
            >
              CHAMBER T
            </text>
          </g>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · REAR ABDOMEN · REACTOR + PULSED NOZZLE</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={ORANGE}
            opacity={0.85}
          >
            ONE FIRING · 500 PULSES / SEC
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
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: ORANGE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Chemical Engineer</span>
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
          owns a reactor.
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
          Two reservoirs of{" "}
          <span style={{ color: CYAN, fontWeight: 600 }}>hydrogen peroxide</span> and{" "}
          <span style={{ color: YELLOW, fontWeight: 600 }}>hydroquinone</span> valve
          into a thick-walled chamber lined with catalase; the reaction hits{" "}
          <span style={{ color: ORANGE, fontWeight: 600 }}>~100 °C</span> and the
          beetle expels benzoquinone as a jet pulsing at{" "}
          <span style={{ color: ORANGE, fontWeight: 600 }}>~500 Hz</span>.
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
          color: GRAY_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Aneshansley & Eisner · Science 165 (1969) 61–63 · Dean et al. · Science 248 (1990) 1219</span>
        <span>
          <span style={{ color: ORANGE }}>●</span> Reactor
        </span>
      </div>
    </AbsoluteFill>
  );
};
