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
const INK = "#0B0E13";
const BOARD = "#121620";
const CARAPACE = "#C24324";
const CARAPACE_DEEP = "#7D2614";
const AMBER = "#F6A528";
const AMBER_GLOW = "#FFD176";
const VAPOR = "#F2E8D4";
const SLATE = "#7B8A99";
const GRID = "#1A1F2A";
const GRID_MAJOR = "#242B38";

// Page layout (1080 × 1350 portrait)
// Metadata band:  56..88
// Diagram frame:  130..900 (w 960 × h 770)
// Type block:     930..
// Hook:           ~1135..
// Footer:         1288..
const FRAME = { x: 60, y: 130, w: 960, h: 770 };

// Local diagram coords (1080 × 800); scaled into FRAME
const SCALE = FRAME.w / 1080;

// Beetle geometry in local (1080 × 800) coords.
// Beetle faces right; nozzle at posterior-right.
const BEETLE = {
  // Head
  headCx: 200,
  headCy: 440,
  headRx: 60,
  headRy: 48,

  // Pronotum (thorax shield), rounded hexagonal
  pronX: 240,
  pronY: 350,
  pronW: 200,
  pronH: 180,

  // Elytra/abdomen (large oval)
  abdCx: 650,
  abdCy: 440,
  abdRx: 310,
  abdRy: 170,

  // Nozzle tip point (far right)
  nozzleX: 970,
  nozzleY: 440,
};

// Cutaway window over the abdomen (where internals are visible).
const CUT = { x: 450, y: 345, w: 480, h: 190, rx: 18 };

// Internal chamber layout (coordinates inside the cutaway).
const RES_HQ = { cx: 505, cy: 388, rx: 50, ry: 26 }; // hydroquinones
const RES_HP = { cx: 505, cy: 492, rx: 50, ry: 26 }; // hydrogen peroxide
const VALVE = { cx: 610, cy: 440, r: 20 }; // mixing valve
const CHAMBER = { x: 665, y: 400, w: 175, h: 80 }; // reaction chamber
const NOZZLE_IN = { x: 845, y: 440 };
const NOZZLE_OUT = { x: 960, y: 440 };

// Callouts (number label + anchor on beetle + endpoint for the leader line)
type Callout = {
  n: string;
  ax: number;
  ay: number; // anchor on the diagram
  lx: number;
  ly: number; // leader end
  tx: number;
  ty: number; // label x,y
  anchor: "start" | "end" | "middle";
  title: string;
  sub: string;
};
const CALLOUTS: Callout[] = [
  {
    n: "01",
    ax: 505,
    ay: 362,
    lx: 320,
    ly: 240,
    tx: 320,
    ty: 206,
    anchor: "middle",
    title: "RESERVOIR",
    sub: "HYDROQUINONES  +  25 % H₂O₂",
  },
  {
    n: "02",
    ax: 610,
    ay: 440,
    lx: 430,
    ly: 605,
    tx: 430,
    ty: 640,
    anchor: "middle",
    title: "MIXING VALVE",
    sub: "GATED ON THREAT",
  },
  {
    n: "03",
    ax: 750,
    ay: 482,
    lx: 750,
    ly: 605,
    tx: 750,
    ty: 640,
    anchor: "middle",
    title: "CATALYST CHAMBER",
    sub: "CATALASES  +  PEROXIDASES",
  },
  {
    n: "04",
    ax: 905,
    ay: 440,
    lx: 905,
    ly: 240,
    tx: 905,
    ty: 206,
    anchor: "middle",
    title: "SWIVEL NOZZLE",
    sub: "~270° AIM",
  },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const t = Math.max(0, frame) / fps; // seconds

  // Title & hook timing
  const titleSpring = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Diagram reveal: outline fade-in
  const outlineOp = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Sequenced callout reveal (lines + labels).
  const calloutProgress = (i: number) => {
    const start = fps * (0.9 + i * 0.25);
    return interpolate(frame, [start, start + fps * 0.4], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  // Charge-up pulse: propellants fill, travel to chamber, chamber flashes.
  const CYCLE = 1.2; // seconds per combustion cycle (for visible rhythm)
  const chargeStart = 2.0;
  const localT = Math.max(0, t - chargeStart);
  const cycle = (localT % CYCLE) / CYCLE; // 0..1 phase

  // Phases within the cycle:
  //  0.00..0.25  reservoirs glow-charge
  //  0.25..0.45  pulse travels through valve into chamber
  //  0.45..0.60  chamber flashes
  //  0.45..1.00  muzzle ejection + wavefronts
  const chargeGlow = interpolate(cycle, [0, 0.25, 0.4], [0.3, 1, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const valvePulse = interpolate(cycle, [0.2, 0.42], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chamberFlash = interpolate(
    cycle,
    [0.4, 0.5, 0.65, 0.95],
    [0, 1, 0.35, 0.15],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Diagram-start fade-in for the ignition subsystem
  const ignitionOp = interpolate(
    frame,
    [fps * (chargeStart - 0.4), fps * chargeStart],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Pulse-train muzzle ejection: 6 overlapping wavefronts.
  const EJECT_START = 0.45;
  const EJECT_TAIL = 0.55;
  const muzzlePulses = React.useMemo(() => {
    return new Array(6).fill(0).map((_, i) => i / 6);
  }, []);

  const pulseYears = calloutProgress; // alias for clarity

  // Diagram-grid clip path id
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
          color: SLATE,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 11 · 09</span>
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
            width={40 * SCALE}
            height={40 * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${40 * SCALE} 0 L 0 0 0 ${40 * SCALE}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160 * SCALE}
            height={160 * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${160 * SCALE} 0 L 0 0 0 ${160 * SCALE}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#161B27" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="flash-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.9} />
            <stop offset="40%" stopColor={AMBER_GLOW} stopOpacity={0.85} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="carapace-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CARAPACE} />
            <stop offset="100%" stopColor={CARAPACE_DEEP} />
          </linearGradient>

          <linearGradient id="hp-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VAPOR} stopOpacity={0.95} />
            <stop offset="100%" stopColor="#B9AF9A" stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="hq-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AMBER_GLOW} stopOpacity={0.95} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0.9} />
          </linearGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="abd-clip">
            <ellipse
              cx={BEETLE.abdCx}
              cy={BEETLE.abdCy}
              rx={BEETLE.abdRx - 8}
              ry={BEETLE.abdRy - 8}
            />
          </clipPath>

          <clipPath id="frame-clip">
            <rect x={0} y={0} width={1080} height={866} />
          </clipPath>

          <linearGradient id="elytra-highlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E26B3F" stopOpacity={0.55} />
            <stop offset="50%" stopColor="#E26B3F" stopOpacity={0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* ── Drafting board ───────────────────────────────────────── */}
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
          <g key={i} stroke={AMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate ID — top-left */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={SLATE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>PLATE III · CROSS SECTION</text>
        </g>

        {/* HUD readout — top-right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 30})`}
          textAnchor="end"
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text fill={SLATE}>
            T =<tspan fill={AMBER}>  100 °C</tspan>
            <tspan fill={SLATE}>      ·      f =</tspan>
            <tspan fill={AMBER}>  ~500 Hz</tspan>
          </text>
        </g>

        {/* Scale bar — bottom-right of frame */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 160}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={SLATE}
          fill={SLATE}
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

        {/* ═══════════════════ Diagram content ═══════════════════ */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${SCALE})`}
          opacity={outlineOp}
          clipPath="url(#frame-clip)"
        >
          {/* Centerline (for reference) */}
          <line
            x1={80}
            y1={BEETLE.headCy}
            x2={1020}
            y2={BEETLE.headCy}
            stroke={GRID_MAJOR}
            strokeWidth={1}
            strokeDasharray="6 8"
          />

          {/* Legs (6 shown, 3 on near side, subtle) */}
          {[
            { x1: 290, x2: 240, y1: 540, y2: 630 },
            { x1: 360, x2: 345, y1: 540, y2: 650 },
            { x1: 430, x2: 460, y1: 540, y2: 640 },
          ].map((l, i) => (
            <g key={i} stroke={CARAPACE_DEEP} strokeWidth={6} fill="none">
              <line
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Antennae */}
          <g stroke={CARAPACE_DEEP} strokeWidth={3} fill="none">
            <path
              d={`M ${BEETLE.headCx + 30} ${BEETLE.headCy - 30}
                  C 150 360, 120 310, 110 260`}
              strokeLinecap="round"
            />
            <path
              d={`M ${BEETLE.headCx + 20} ${BEETLE.headCy - 42}
                  C 140 340, 90 280, 50 280`}
              strokeLinecap="round"
            />
          </g>

          {/* ── Head ───────────────────────── */}
          <ellipse
            cx={BEETLE.headCx}
            cy={BEETLE.headCy}
            rx={BEETLE.headRx}
            ry={BEETLE.headRy}
            fill="url(#carapace-grad)"
            stroke={INK}
            strokeWidth={2}
          />
          {/* Mandible hint */}
          <path
            d={`M ${BEETLE.headCx - BEETLE.headRx + 8} ${BEETLE.headCy - 10}
                q -10 10, -4 22
                M ${BEETLE.headCx - BEETLE.headRx + 8} ${BEETLE.headCy + 10}
                q -10 -10, -4 -22`}
            fill="none"
            stroke={CARAPACE_DEEP}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Eye */}
          <circle
            cx={BEETLE.headCx - 25}
            cy={BEETLE.headCy - 10}
            r={6}
            fill={INK}
          />

          {/* ── Pronotum (thorax shield) ────── */}
          <path
            d={`M ${BEETLE.pronX + 20} ${BEETLE.pronY}
                L ${BEETLE.pronX + BEETLE.pronW - 20} ${BEETLE.pronY}
                Q ${BEETLE.pronX + BEETLE.pronW + 20} ${BEETLE.pronY + BEETLE.pronH / 2},
                  ${BEETLE.pronX + BEETLE.pronW - 20} ${BEETLE.pronY + BEETLE.pronH}
                L ${BEETLE.pronX + 20} ${BEETLE.pronY + BEETLE.pronH}
                Q ${BEETLE.pronX - 20} ${BEETLE.pronY + BEETLE.pronH / 2},
                  ${BEETLE.pronX + 20} ${BEETLE.pronY}
                Z`}
            fill="url(#carapace-grad)"
            stroke={INK}
            strokeWidth={2}
          />

          {/* ── Abdomen / elytra: SOLID carapace with highlight ────── */}
          <ellipse
            cx={BEETLE.abdCx}
            cy={BEETLE.abdCy}
            rx={BEETLE.abdRx}
            ry={BEETLE.abdRy}
            fill="url(#carapace-grad)"
            stroke={INK}
            strokeWidth={2}
          />
          {/* Elytra highlight stripe along top */}
          <ellipse
            cx={BEETLE.abdCx}
            cy={BEETLE.abdCy}
            rx={BEETLE.abdRx - 4}
            ry={BEETLE.abdRy - 4}
            fill="url(#elytra-highlight)"
          />
          {/* Elytra punctation — fine stippled pits (behind the cutaway) */}
          {(() => {
            const pts: React.ReactNode[] = [];
            const rng = (i: number) =>
              (((Math.sin((i + 1) * 91.3) * 43758.5453) % 1) + 1) % 1;
            for (let i = 0; i < 80; i++) {
              const u = rng(i * 2);
              const v = rng(i * 2 + 1);
              // Point inside ellipse via rejection-ish sampling
              const x = BEETLE.abdCx + (u * 2 - 1) * (BEETLE.abdRx - 20);
              const y = BEETLE.abdCy + (v * 2 - 1) * (BEETLE.abdRy - 20);
              const dx = (x - BEETLE.abdCx) / BEETLE.abdRx;
              const dy = (y - BEETLE.abdCy) / BEETLE.abdRy;
              if (dx * dx + dy * dy > 0.88) continue;
              pts.push(
                <circle
                  key={`punct-${i}`}
                  cx={x}
                  cy={y}
                  r={1.3}
                  fill={CARAPACE_DEEP}
                  opacity={0.65}
                />,
              );
            }
            return pts;
          })()}
          {/* Elytra longitudinal seam — single centre line */}
          <line
            x1={BEETLE.abdCx - BEETLE.abdRx + 40}
            y1={BEETLE.abdCy}
            x2={BEETLE.abdCx + BEETLE.abdRx - 40}
            y2={BEETLE.abdCy}
            stroke={INK}
            strokeWidth={1.2}
            opacity={0.5}
          />

          {/* Cutaway window — the carapace "peeled back" to reveal internals */}
          <rect
            x={CUT.x}
            y={CUT.y}
            width={CUT.w}
            height={CUT.h}
            rx={CUT.rx}
            fill="#090D14"
            stroke={VAPOR}
            strokeWidth={1.2}
            strokeDasharray="2 5"
            opacity={0.95}
          />
          {/* Cutaway corner ticks — mark it as a "section removed" */}
          {(
            [
              [CUT.x, CUT.y, 1, 1],
              [CUT.x + CUT.w, CUT.y, -1, 1],
              [CUT.x, CUT.y + CUT.h, 1, -1],
              [CUT.x + CUT.w, CUT.y + CUT.h, -1, -1],
            ] as const
          ).map(([cx, cy, sx, sy], i) => (
            <g key={`cut-${i}`} stroke={VAPOR} strokeWidth={1.2} fill="none">
              <line x1={cx} y1={cy} x2={cx + sx * 14} y2={cy} />
              <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 14} />
            </g>
          ))}

          {/* ─── Internal ignition subsystem (opacity gated) ─── */}
          <g opacity={ignitionOp}>
            {/* Reservoirs */}
            <g>
              <ellipse
                cx={RES_HQ.cx}
                cy={RES_HQ.cy}
                rx={RES_HQ.rx}
                ry={RES_HQ.ry}
                fill="url(#hq-grad)"
                opacity={chargeGlow}
              />
              <ellipse
                cx={RES_HQ.cx}
                cy={RES_HQ.cy}
                rx={RES_HQ.rx}
                ry={RES_HQ.ry}
                fill="none"
                stroke={AMBER}
                strokeWidth={1.4}
              />
              <text
                x={RES_HQ.cx}
                y={RES_HQ.cy + 4}
                textAnchor="middle"
                fontFamily={inter}
                fontSize={14}
                fontWeight={700}
                fill={INK}
                letterSpacing={2}
              >
                HQ
              </text>

              <ellipse
                cx={RES_HP.cx}
                cy={RES_HP.cy}
                rx={RES_HP.rx}
                ry={RES_HP.ry}
                fill="url(#hp-grad)"
                opacity={chargeGlow}
              />
              <ellipse
                cx={RES_HP.cx}
                cy={RES_HP.cy}
                rx={RES_HP.rx}
                ry={RES_HP.ry}
                fill="none"
                stroke={VAPOR}
                strokeOpacity={0.7}
                strokeWidth={1.4}
              />
              <text
                x={RES_HP.cx}
                y={RES_HP.cy + 4}
                textAnchor="middle"
                fontFamily={inter}
                fontSize={14}
                fontWeight={700}
                fill={INK}
                letterSpacing={1}
              >
                H₂O₂
              </text>
            </g>

            {/* Feed pipes from reservoirs to valve */}
            <g strokeWidth={2.4} fill="none">
              <path
                d={`M ${RES_HQ.cx + RES_HQ.rx} ${RES_HQ.cy}
                    L ${VALVE.cx - 6} ${VALVE.cy - 14}`}
                stroke={AMBER}
                strokeOpacity={0.8}
              />
              <path
                d={`M ${RES_HP.cx + RES_HP.rx} ${RES_HP.cy}
                    L ${VALVE.cx - 6} ${VALVE.cy + 14}`}
                stroke={VAPOR}
                strokeOpacity={0.75}
              />
            </g>

            {/* Valve */}
            <circle
              cx={VALVE.cx}
              cy={VALVE.cy}
              r={VALVE.r}
              fill={BOARD}
              stroke={AMBER}
              strokeWidth={1.8}
            />
            <circle
              cx={VALVE.cx}
              cy={VALVE.cy}
              r={6}
              fill={AMBER}
              opacity={0.6 + 0.4 * valvePulse}
            />
            {/* Valve → chamber conduit */}
            <path
              d={`M ${VALVE.cx + VALVE.r} ${VALVE.cy}
                  L ${CHAMBER.x + 2} ${CHAMBER.y + CHAMBER.h / 2}`}
              stroke={AMBER}
              strokeOpacity={0.9}
              strokeWidth={2.4}
              fill="none"
            />

            {/* Pulse travelling along conduit */}
            <circle
              cx={interpolate(valvePulse, [0, 1], [VALVE.cx + VALVE.r, CHAMBER.x])}
              cy={VALVE.cy}
              r={4}
              fill={AMBER_GLOW}
              opacity={valvePulse > 0 && valvePulse < 1 ? 1 : 0}
            />

            {/* Reaction chamber */}
            <rect
              x={CHAMBER.x}
              y={CHAMBER.y}
              width={CHAMBER.w}
              height={CHAMBER.h}
              rx={10}
              fill={INK}
              stroke={CARAPACE}
              strokeWidth={3}
            />
            {/* Armored wall hatching — short ticks on top and bottom */}
            {new Array(14).fill(0).map((_, i) => {
              const x = CHAMBER.x + 8 + i * ((CHAMBER.w - 16) / 13);
              return (
                <g key={i} stroke={CARAPACE_DEEP} strokeWidth={1.4}>
                  <line x1={x} y1={CHAMBER.y - 7} x2={x} y2={CHAMBER.y - 1} />
                  <line
                    x1={x}
                    y1={CHAMBER.y + CHAMBER.h + 1}
                    x2={x}
                    y2={CHAMBER.y + CHAMBER.h + 7}
                  />
                </g>
              );
            })}
            {/* Flash inside chamber */}
            <ellipse
              cx={CHAMBER.x + CHAMBER.w / 2}
              cy={CHAMBER.y + CHAMBER.h / 2}
              rx={(CHAMBER.w / 2 - 6) * (0.7 + 0.3 * chamberFlash)}
              ry={(CHAMBER.h / 2 - 6) * (0.7 + 0.3 * chamberFlash)}
              fill="url(#flash-grad)"
              opacity={chamberFlash}
            />
            {/* Catalyst stipple (tiny dots) */}
            {(() => {
              const dots: React.ReactNode[] = [];
              const rng = (i: number) =>
                ((Math.sin((i + 1) * 12.9898) * 43758.5453) % 1 + 1) % 1;
              for (let i = 0; i < 22; i++) {
                const dx = rng(i * 2) * (CHAMBER.w - 24) + CHAMBER.x + 12;
                const dy = rng(i * 2 + 1) * (CHAMBER.h - 24) + CHAMBER.y + 12;
                dots.push(
                  <circle
                    key={`cat-${i}`}
                    cx={dx}
                    cy={dy}
                    r={1.6}
                    fill={AMBER_GLOW}
                    opacity={0.55}
                  />,
                );
              }
              return dots;
            })()}

            {/* Nozzle (from chamber through posterior) */}
            <path
              d={`M ${CHAMBER.x + CHAMBER.w} ${CHAMBER.y + CHAMBER.h / 2 - 10}
                  L ${NOZZLE_IN.x} ${NOZZLE_IN.y - 8}
                  L ${NOZZLE_OUT.x - 8} ${NOZZLE_OUT.y - 14}
                  L ${NOZZLE_OUT.x} ${NOZZLE_OUT.y - 14}
                  L ${NOZZLE_OUT.x} ${NOZZLE_OUT.y + 14}
                  L ${NOZZLE_OUT.x - 8} ${NOZZLE_OUT.y + 14}
                  L ${NOZZLE_IN.x} ${NOZZLE_IN.y + 8}
                  L ${CHAMBER.x + CHAMBER.w} ${CHAMBER.y + CHAMBER.h / 2 + 10}
                  Z`}
              fill={BOARD}
              stroke={CARAPACE}
              strokeWidth={2}
            />
            {/* Internal nozzle highlight when flashing */}
            <path
              d={`M ${CHAMBER.x + CHAMBER.w + 2} ${NOZZLE_OUT.y}
                  L ${NOZZLE_OUT.x - 2} ${NOZZLE_OUT.y}`}
              stroke={AMBER_GLOW}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={chamberFlash * 0.9}
            />
          </g>

          {/* Pulse-train ejection: concentric wavefronts to the right of the nozzle */}
          <g opacity={ignitionOp}>
            {muzzlePulses.map((offset, i) => {
              const phase = (cycle + offset) % 1;
              const emit = phase > EJECT_START && phase < EJECT_START + EJECT_TAIL;
              const u = (phase - EJECT_START) / EJECT_TAIL;
              // Fan-shaped wavefront: wider than tall, biased rightward
              const rx = 12 + u * 85;
              const ry = 10 + u * 42;
              const op = emit ? Math.max(0, (1 - u * 0.9) * 0.95) : 0;
              return (
                <g key={`pulse-${i}`}>
                  {/* Outer amber wavefront (fan) */}
                  <ellipse
                    cx={NOZZLE_OUT.x + 24 + u * 36}
                    cy={NOZZLE_OUT.y}
                    rx={rx}
                    ry={ry}
                    fill="none"
                    stroke={AMBER}
                    strokeWidth={4}
                    strokeOpacity={op}
                    filter="url(#soft-glow)"
                  />
                  {/* Inner cream vapor */}
                  <ellipse
                    cx={NOZZLE_OUT.x + 24 + u * 36}
                    cy={NOZZLE_OUT.y}
                    rx={rx * 0.68}
                    ry={ry * 0.68}
                    fill="none"
                    stroke={VAPOR}
                    strokeWidth={2}
                    strokeOpacity={op * 0.75}
                  />
                </g>
              );
            })}

            {/* Steady muzzle flare */}
            <ellipse
              cx={NOZZLE_OUT.x + 8}
              cy={NOZZLE_OUT.y}
              rx={18}
              ry={14}
              fill={AMBER_GLOW}
              opacity={0.65 * chamberFlash + 0.3}
              filter="url(#soft-glow)"
            />
            {/* Hot core at the nozzle lip */}
            <circle
              cx={NOZZLE_OUT.x + 2}
              cy={NOZZLE_OUT.y}
              r={5}
              fill={"#FFFFFF"}
              opacity={0.55 + 0.4 * chamberFlash}
            />
          </g>

          {/* ─── Callouts ─────────────────────── */}
          {CALLOUTS.map((c, i) => {
            const p = calloutProgress(i);
            return (
              <g key={c.n} opacity={p}>
                {/* Leader line */}
                <line
                  x1={c.ax}
                  y1={c.ay}
                  x2={interpolate(p, [0, 1], [c.ax, c.lx])}
                  y2={interpolate(p, [0, 1], [c.ay, c.ly])}
                  stroke={AMBER}
                  strokeWidth={1.2}
                />
                {/* Anchor dot */}
                <circle cx={c.ax} cy={c.ay} r={3.5} fill={AMBER} />
                {/* Number badge */}
                <g transform={`translate(${c.lx}, ${c.ly})`}>
                  <circle r={14} fill={INK} stroke={AMBER} strokeWidth={1.4} />
                  <text
                    textAnchor="middle"
                    y={5}
                    fontFamily={inter}
                    fontWeight={700}
                    fontSize={13}
                    fill={AMBER}
                    letterSpacing={0.5}
                  >
                    {c.n}
                  </text>
                </g>
                {/* Label */}
                <g transform={`translate(${c.tx}, ${c.ty})`}>
                  <text
                    textAnchor={c.anchor}
                    fontFamily={inter}
                    fontWeight={600}
                    fontSize={13}
                    fill={VAPOR}
                    letterSpacing={3}
                  >
                    {c.title}
                  </text>
                  <text
                    y={16}
                    textAnchor={c.anchor}
                    fontFamily={inter}
                    fontWeight={500}
                    fontSize={11}
                    fill={SLATE}
                    letterSpacing={2}
                  >
                    {c.sub}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={SLATE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · DEFENSIVE PULSE-JET IN BRACHINUS SPP.</text>
          <text x={FRAME.w} textAnchor="end" fill={AMBER} opacity={0.85}>
            BENZOQUINONE · 100 °C · ~500 Hz
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 955,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
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
          Role <span style={{ color: SLATE, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Chemical Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.3,
            fontStyle: "italic",
          }}
        >
          The pulsed-jet
          <br />
          chemist.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          The bombardier beetle stores{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>hydroquinones</span>{" "}
          and{" "}
          <span style={{ color: VAPOR, fontWeight: 600 }}>
            25 % hydrogen peroxide
          </span>{" "}
          in a reservoir, then on threat mixes them in an armored chamber lined
          with catalases and peroxidases — firing a boiling{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>benzoquinone</span>{" "}
          spray in pulses at{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>368–735 Hz</span>.
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
          color: SLATE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Arndt et al. · Science 348 (2015) 428–431</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Pulsed combustion
        </span>
      </div>
    </AbsoluteFill>
  );
};
