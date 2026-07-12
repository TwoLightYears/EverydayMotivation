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

// Palette — bombardier-beetle × cyanotype schematic
const INK = "#0E2340";       // deep cyanotype navy (substrate)
const BOARD = "#123259";     // drafting-board fill (slightly lighter)
const BOARD_HI = "#193F6E";  // vignette highlight
const GRID = "#1A3A64";
const GRID_MAJOR = "#22497B";
const PAPER = "#EAF0F7";     // paper-white linework
const PAPER_DIM = "#9FB3CD"; // dimmer schematic gray-blue
const ORANGE = "#D9541E";    // bombardier pronotum/reactant A
const YELLOW = "#F1B240";    // hot discharge / reactant B
const YELLOW_HOT = "#FFD576";

// ── Beetle geometry ───────────────────────────────────────────────────────
// Working canvas 1080 × 800. Beetle drawn head-up at center; nozzle at tail,
// swivelled ~30° down-right so discharge fires toward the right edge.
const CENTER_X = 540;
const HEAD_Y = 180;
const HEAD_R = 40;
const PRONOTUM_TOP = 220;
const PRONOTUM_BOT = 300;
const PRONOTUM_TOPW = 96;
const PRONOTUM_BOTW = 214;
const ELYTRA_TOP = 305;
const ELYTRA_BOT = 660;
const ELYTRA_SHOULDER = 178; // half-width at top
const ELYTRA_WAIST = 148;    // half-width at mid
const ELYTRA_TAIL = 62;      // half-width at bottom
const NOZZLE_ROOT = { x: 540, y: 660 };
const NOZZLE_TIP = { x: 605, y: 738 };

// Reactor internals
const RES_TOP = 348;
const RES_BOT = 508;
const RES_A_X = 460;
const RES_B_X = 570;
const RES_W = 50;
const CHAMBER = { x: 540, y: 585 };
const CHAMBER_R = 28;

// Leaders use a 3-point path: body attachment → diagonal jog → horizontal terminator.
// Horizontal segments run through "clear bands" (above legs for A/B, between mid-
// and hind-leg zones for C) so the leader lines never collide with orange legs.
type LeaderText = {
  key: string;
  code: string;
  title: string;
  side: "left" | "right";
  from: { x: number; y: number };
  jog: { x: number; y: number };
  endX: number;
};

const LEAD_Y_TOP = 315;   // clear band above the fore-leg span
const LEAD_Y_MID = 495;   // clear band between mid-leg foot and hind-leg hip

const LEADERS: LeaderText[] = [
  {
    key: "A",
    code: "A",
    title: "HYDROQUINONE · H₂O₂",
    side: "left",
    from: { x: RES_A_X, y: RES_TOP },
    jog: { x: 410, y: LEAD_Y_TOP },
    endX: 92,
  },
  {
    key: "B",
    code: "B",
    title: "CATALASE · PEROXIDASE",
    side: "right",
    from: { x: RES_B_X + RES_W, y: RES_TOP },
    jog: { x: 670, y: LEAD_Y_TOP },
    endX: 990,
  },
  {
    key: "C",
    code: "C",
    title: "REACTION CHAMBER",
    side: "right",
    from: { x: CHAMBER.x + CHAMBER_R - 4, y: CHAMBER.y - 12 },
    jog: { x: 680, y: LEAD_Y_MID },
    endX: 990,
  },
];

// Discharge arc: Bezier from nozzle tip, curving down-right off the frame.
const ARC = {
  x1: NOZZLE_TIP.x,
  y1: NOZZLE_TIP.y,
  cx: 830,
  cy: 770,
  x2: 1055,
  y2: 782,
};

// Sample point along quadratic Bezier at t∈[0,1]
const arcPoint = (t: number) => {
  const mt = 1 - t;
  return {
    x: mt * mt * ARC.x1 + 2 * mt * t * ARC.cx + t * t * ARC.x2,
    y: mt * mt * ARC.y1 + 2 * mt * t * ARC.cy + t * t * ARC.y2,
  };
};
const arcPath = `M ${ARC.x1} ${ARC.y1} Q ${ARC.cx} ${ARC.cy} ${ARC.x2} ${ARC.y2}`;

// Legs — 3 pairs, each drawn as a 3-segment coxa-femur-tibia-tarsus chain
type Leg = {
  hip: [number, number];
  knee: [number, number];
  ankle: [number, number];
  foot: [number, number];
};
const LEG_L: Leg[] = [
  // Fore-legs — from pronotum shoulder, curled forward-and-outward
  { hip: [452, 258], knee: [388, 268], ankle: [340, 244], foot: [304, 232] },
  // Mid-legs — from elytra shoulder, extended outward and back through mid-band
  { hip: [388, 360], knee: [318, 388], ankle: [268, 402], foot: [240, 410] },
  // Hind-legs — from lower elytra, long back-sweep
  { hip: [418, 530], knee: [332, 592], ankle: [278, 648], foot: [242, 690] },
];
const mirror = (l: Leg): Leg => ({
  hip: [2 * CENTER_X - l.hip[0], l.hip[1]],
  knee: [2 * CENTER_X - l.knee[0], l.knee[1]],
  ankle: [2 * CENTER_X - l.ankle[0], l.ankle[1]],
  foot: [2 * CENTER_X - l.foot[0], l.foot[1]],
});
const LEG_R: Leg[] = LEG_L.map(mirror);

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Timing (30 fps, 150 frames = 5 s loop)
  const fillSpring = spring({
    frame: frame - fps * 0.2,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const bodyIn = spring({
    frame: frame,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const gaugeSweep = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 1.4 },
  });
  const titleSpring = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leaderOpacity = interpolate(frame, [fps * 0.6, fps * 1.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gauge needle: sweeps from -95° to +85° (redline)
  const needleDeg = interpolate(gaugeSweep, [0, 1], [-95, 78]);
  const redlineJitter = frame > fps * 1.6 ? Math.sin(frame * 0.9) * 3.2 : 0;
  const finalNeedle = needleDeg + (gaugeSweep > 0.98 ? redlineJitter : 0);

  // Pulse particles along the arc (staccato discharge)
  const dischargeStart = fps * 1.4;
  const pulseSpacing = 2; // frames between spawns → 15 Hz effective (stroboscopic proxy for 500 Hz)
  const pulseLifetime = 28;
  const pulses: { t: number; age: number }[] = [];
  if (frame > dischargeStart) {
    for (let age = 0; age < pulseLifetime; age += pulseSpacing) {
      const spawn = Math.floor((frame - dischargeStart) / pulseSpacing) * pulseSpacing - age;
      if (spawn < 0) continue;
      const life = frame - dischargeStart - spawn;
      if (life < 0 || life > pulseLifetime) continue;
      pulses.push({ t: life / pulseLifetime, age: life });
    }
  }

  // Page layout: drafting frame occupies x=60..1020, y=130..920
  const FRAME = { x: 60, y: 130, w: 960, h: 790 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W;

  const RES_H = RES_BOT - RES_TOP;
  const fluidA = interpolate(fillSpring, [0, 1], [0, RES_H * 0.78]);
  const fluidB = interpolate(fillSpring, [0, 1], [0, RES_H * 0.78]);

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
          color: PAPER_DIM,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: YELLOW }}>2026 · 07 · 12</span>
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

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor={BOARD_HI} stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <filter id="pulse-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="nozzle-flare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={YELLOW_HOT} stopOpacity={0.85} />
            <stop offset="100%" stopColor={YELLOW} stopOpacity={0} />
          </radialGradient>
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
          stroke="#284A78"
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

        {/* Sheet identifier — upper left */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 32})`}
          fill={PAPER_DIM}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={3}
        >
          <text>SHEET 03 · DEFENSIVE GLAND</text>
        </g>

        {/* Scale bar — lower right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 172}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={PAPER_DIM}
          fill={PAPER_DIM}
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

        {/* Pressure gauge — upper right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 92}, ${FRAME.y + 88})`}
          opacity={leaderOpacity}
        >
          {/* dial arc */}
          <path
            d={`M ${-40} 0 A 40 40 0 0 1 ${40} 0`}
            fill="none"
            stroke={PAPER_DIM}
            strokeWidth={1.2}
          />
          {/* redline arc */}
          <path
            d={`M ${28.28} ${-28.28} A 40 40 0 0 1 40 0`}
            fill="none"
            stroke={YELLOW}
            strokeWidth={3}
          />
          {/* ticks */}
          {[-90, -60, -30, 0, 30, 60, 90].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const inner = 32;
            const outer = 40;
            return (
              <line
                key={deg}
                x1={Math.sin(rad) * inner}
                y1={-Math.cos(rad) * inner}
                x2={Math.sin(rad) * outer}
                y2={-Math.cos(rad) * outer}
                stroke={PAPER_DIM}
                strokeWidth={1}
              />
            );
          })}
          {/* needle */}
          <g transform={`rotate(${finalNeedle})`}>
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-36}
              stroke={ORANGE}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
          <circle cx={0} cy={0} r={3} fill={PAPER} />
          <text
            y={16}
            textAnchor="middle"
            fill={PAPER_DIM}
            fontFamily={inter}
            fontSize={9}
            fontWeight={600}
            letterSpacing={2.4}
          >
            CHAMBER kPa
          </text>
        </g>

        {/* Map content */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}
          opacity={bodyIn}
        >
          {/* ── Body construction lines (schematic centerline + baselines) ── */}
          <g stroke={GRID_MAJOR} strokeWidth={0.8} strokeDasharray="4 6" opacity={0.9}>
            <line x1={CENTER_X} y1={220} x2={CENTER_X} y2={720} />
          </g>

          {/* ── Legs (drawn behind body) ── */}
          {[...LEG_L, ...LEG_R].map((l, i) => (
            <g key={`leg-${i}`} stroke={ORANGE} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path
                d={`M ${l.hip[0]} ${l.hip[1]}
                    L ${l.knee[0]} ${l.knee[1]}
                    L ${l.ankle[0]} ${l.ankle[1]}
                    L ${l.foot[0]} ${l.foot[1]}`}
              />
              {/* femur–tibia joint dot */}
              <circle cx={l.knee[0]} cy={l.knee[1]} r={2.4} fill={ORANGE} stroke={PAPER} strokeWidth={0.8} />
              {/* tarsus tip */}
              <circle cx={l.foot[0]} cy={l.foot[1]} r={2} fill={ORANGE} stroke="none" />
            </g>
          ))}

          {/* ── Antennae ── */}
          <g stroke={ORANGE} strokeWidth={2.4} fill="none" strokeLinecap="round">
            <path d={`M ${CENTER_X - 22} ${HEAD_Y - 28} Q ${CENTER_X - 60} ${HEAD_Y - 70} ${CENTER_X - 108} ${HEAD_Y - 88}`} />
            <path d={`M ${CENTER_X + 22} ${HEAD_Y - 28} Q ${CENTER_X + 60} ${HEAD_Y - 70} ${CENTER_X + 108} ${HEAD_Y - 88}`} />
            <circle cx={CENTER_X - 108} cy={HEAD_Y - 88} r={3} fill={ORANGE} stroke="none" />
            <circle cx={CENTER_X + 108} cy={HEAD_Y - 88} r={3} fill={ORANGE} stroke="none" />
          </g>

          {/* ── Head ── */}
          <ellipse
            cx={CENTER_X}
            cy={HEAD_Y}
            rx={HEAD_R}
            ry={HEAD_R - 5}
            fill={ORANGE}
            stroke={PAPER}
            strokeWidth={1.8}
          />
          {/* eyes */}
          <circle cx={CENTER_X - 22} cy={HEAD_Y + 2} r={4.2} fill={INK} />
          <circle cx={CENTER_X + 22} cy={HEAD_Y + 2} r={4.2} fill={INK} />
          {/* mandibles */}
          <path
            d={`M ${CENTER_X - 12} ${HEAD_Y - 30} Q ${CENTER_X - 4} ${HEAD_Y - 46} ${CENTER_X + 2} ${HEAD_Y - 34}`}
            fill="none"
            stroke={PAPER}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <path
            d={`M ${CENTER_X + 12} ${HEAD_Y - 30} Q ${CENTER_X + 4} ${HEAD_Y - 46} ${CENTER_X - 2} ${HEAD_Y - 34}`}
            fill="none"
            stroke={PAPER}
            strokeWidth={1.6}
            strokeLinecap="round"
          />

          {/* ── Pronotum (bright orange shield) ── */}
          <path
            d={`
              M ${CENTER_X - PRONOTUM_TOPW / 2} ${PRONOTUM_TOP}
              Q ${CENTER_X - PRONOTUM_TOPW / 2 - 4} ${PRONOTUM_TOP + 20}
                ${CENTER_X - PRONOTUM_BOTW / 2} ${PRONOTUM_BOT}
              L ${CENTER_X + PRONOTUM_BOTW / 2} ${PRONOTUM_BOT}
              Q ${CENTER_X + PRONOTUM_TOPW / 2 + 4} ${PRONOTUM_TOP + 20}
                ${CENTER_X + PRONOTUM_TOPW / 2} ${PRONOTUM_TOP}
              Z
            `}
            fill={ORANGE}
            stroke={PAPER}
            strokeWidth={1.8}
          />
          {/* pronotum center groove */}
          <line
            x1={CENTER_X}
            y1={PRONOTUM_TOP + 6}
            x2={CENTER_X}
            y2={PRONOTUM_BOT - 6}
            stroke={PAPER}
            strokeWidth={1}
            strokeOpacity={0.75}
          />

          {/* ── Elytra (schematic outline, transparent to show internals) ── */}
          <path
            d={`
              M ${CENTER_X - ELYTRA_SHOULDER} ${ELYTRA_TOP + 8}
              C ${CENTER_X - ELYTRA_SHOULDER - 12} ${ELYTRA_TOP + 80}
                ${CENTER_X - ELYTRA_WAIST - 12} ${(ELYTRA_TOP + ELYTRA_BOT) / 2}
                ${CENTER_X - ELYTRA_WAIST} ${(ELYTRA_TOP + ELYTRA_BOT) / 2 + 40}
              C ${CENTER_X - ELYTRA_WAIST + 6} ${ELYTRA_BOT - 50}
                ${CENTER_X - ELYTRA_TAIL - 8} ${ELYTRA_BOT - 6}
                ${CENTER_X - ELYTRA_TAIL} ${ELYTRA_BOT + 6}
              Q ${CENTER_X - 6} ${ELYTRA_BOT + 18}
                ${CENTER_X} ${ELYTRA_BOT + 20}
              Q ${CENTER_X + 6} ${ELYTRA_BOT + 18}
                ${CENTER_X + ELYTRA_TAIL} ${ELYTRA_BOT + 6}
              C ${CENTER_X + ELYTRA_TAIL + 8} ${ELYTRA_BOT - 6}
                ${CENTER_X + ELYTRA_WAIST - 6} ${ELYTRA_BOT - 50}
                ${CENTER_X + ELYTRA_WAIST} ${(ELYTRA_TOP + ELYTRA_BOT) / 2 + 40}
              C ${CENTER_X + ELYTRA_WAIST + 12} ${(ELYTRA_TOP + ELYTRA_BOT) / 2}
                ${CENTER_X + ELYTRA_SHOULDER + 12} ${ELYTRA_TOP + 80}
                ${CENTER_X + ELYTRA_SHOULDER} ${ELYTRA_TOP + 8}
              Z
            `}
            fill={INK}
            fillOpacity={0.35}
            stroke={PAPER}
            strokeWidth={2.2}
          />
          {/* elytra suture (center seam) */}
          <line
            x1={CENTER_X}
            y1={ELYTRA_TOP + 8}
            x2={CENTER_X}
            y2={ELYTRA_BOT + 20}
            stroke={PAPER}
            strokeWidth={1.4}
          />
          {/* elytra striae — subtle length grooves on each elytron */}
          {[0.35, 0.55, 0.75].map((f) => (
            <g key={`stria-${f}`}>
              <path
                d={`M ${CENTER_X - ELYTRA_SHOULDER * f} ${ELYTRA_TOP + 22}
                    Q ${CENTER_X - ELYTRA_WAIST * f - 4} ${(ELYTRA_TOP + ELYTRA_BOT) / 2}
                      ${CENTER_X - ELYTRA_TAIL * f} ${ELYTRA_BOT}`}
                fill="none"
                stroke={PAPER}
                strokeOpacity={0.28}
                strokeWidth={0.9}
              />
              <path
                d={`M ${CENTER_X + ELYTRA_SHOULDER * f} ${ELYTRA_TOP + 22}
                    Q ${CENTER_X + ELYTRA_WAIST * f + 4} ${(ELYTRA_TOP + ELYTRA_BOT) / 2}
                      ${CENTER_X + ELYTRA_TAIL * f} ${ELYTRA_BOT}`}
                fill="none"
                stroke={PAPER}
                strokeOpacity={0.28}
                strokeWidth={0.9}
              />
            </g>
          ))}

          {/* ── Reservoirs A & B ── */}
          {[
            { x: RES_A_X, code: "A", fluid: fluidA, tone: ORANGE },
            { x: RES_B_X, code: "B", fluid: fluidB, tone: YELLOW },
          ].map((r) => (
            <g key={r.code}>
              {/* fluid */}
              <clipPath id={`clip-${r.code}`}>
                <rect x={r.x} y={RES_TOP} width={RES_W} height={RES_H} rx={7} />
              </clipPath>
              <rect
                x={r.x}
                y={RES_BOT - r.fluid}
                width={RES_W}
                height={r.fluid}
                fill={r.tone}
                opacity={0.88}
                clipPath={`url(#clip-${r.code})`}
              />
              {/* fluid meniscus */}
              {r.fluid > 3 && (
                <line
                  x1={r.x}
                  y1={RES_BOT - r.fluid}
                  x2={r.x + RES_W}
                  y2={RES_BOT - r.fluid}
                  stroke={PAPER}
                  strokeWidth={1.2}
                  strokeOpacity={0.95}
                />
              )}
              {/* tank outline */}
              <rect
                x={r.x}
                y={RES_TOP}
                width={RES_W}
                height={RES_H}
                rx={7}
                fill="none"
                stroke={PAPER}
                strokeWidth={2}
              />
              {/* graduation ticks */}
              {[0.2, 0.4, 0.6, 0.8].map((f) => (
                <line
                  key={f}
                  x1={r.x + RES_W - 1}
                  y1={RES_TOP + f * RES_H}
                  x2={r.x + RES_W - 10}
                  y2={RES_TOP + f * RES_H}
                  stroke={PAPER}
                  strokeWidth={1}
                  strokeOpacity={0.7}
                />
              ))}
              {/* code */}
              <text
                x={r.x + RES_W / 2}
                y={RES_TOP - 10}
                textAnchor="middle"
                fill={PAPER}
                fontFamily={inter}
                fontSize={15}
                fontWeight={600}
                letterSpacing={2}
              >
                {r.code}
              </text>
              {/* valve at bottom */}
              <circle
                cx={r.x + RES_W / 2}
                cy={RES_BOT + 7}
                r={5}
                fill={INK}
                stroke={PAPER}
                strokeWidth={1.6}
              />
            </g>
          ))}

          {/* ── Feed lines A/B → chamber ── */}
          <g stroke={PAPER} strokeWidth={2} fill="none" strokeLinecap="round">
            <path
              d={`M ${RES_A_X + RES_W / 2} ${RES_BOT + 10}
                  L ${RES_A_X + RES_W / 2} ${CHAMBER.y - 4}
                  L ${CHAMBER.x - CHAMBER_R + 2} ${CHAMBER.y - 4}`}
            />
            <path
              d={`M ${RES_B_X + RES_W / 2} ${RES_BOT + 10}
                  L ${RES_B_X + RES_W / 2} ${CHAMBER.y - 4}
                  L ${CHAMBER.x + CHAMBER_R - 2} ${CHAMBER.y - 4}`}
            />
          </g>

          {/* ── Reaction chamber ── */}
          <circle
            cx={CHAMBER.x}
            cy={CHAMBER.y}
            r={CHAMBER_R + 6}
            fill={YELLOW}
            opacity={interpolate(fillSpring, [0.7, 1], [0, 0.28], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            filter="url(#pulse-glow)"
          />
          <circle
            cx={CHAMBER.x}
            cy={CHAMBER.y}
            r={CHAMBER_R}
            fill={INK}
            stroke={PAPER}
            strokeWidth={2}
          />
          {/* chamber cross-hatch to read as vessel */}
          <line
            x1={CHAMBER.x - CHAMBER_R + 4}
            y1={CHAMBER.y}
            x2={CHAMBER.x + CHAMBER_R - 4}
            y2={CHAMBER.y}
            stroke={PAPER}
            strokeWidth={1}
            strokeOpacity={0.6}
          />

          {/* ── Chamber → nozzle throat ── */}
          <path
            d={`M ${CHAMBER.x} ${CHAMBER.y + CHAMBER_R}
                L ${NOZZLE_ROOT.x} ${NOZZLE_ROOT.y}`}
            stroke={PAPER}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
          />

          {/* ── Nozzle (swiveled ~40° right) ── */}
          <g>
            {/* swivel joint ring */}
            <circle
              cx={NOZZLE_ROOT.x}
              cy={NOZZLE_ROOT.y}
              r={11}
              fill={INK}
              stroke={PAPER}
              strokeWidth={2}
            />
            <circle
              cx={NOZZLE_ROOT.x}
              cy={NOZZLE_ROOT.y}
              r={3.5}
              fill={PAPER}
            />
            {/* nozzle barrel */}
            <path
              d={`
                M ${NOZZLE_ROOT.x - 10} ${NOZZLE_ROOT.y + 4}
                L ${NOZZLE_TIP.x - 8} ${NOZZLE_TIP.y - 10}
                L ${NOZZLE_TIP.x + 10} ${NOZZLE_TIP.y + 6}
                L ${NOZZLE_ROOT.x + 6} ${NOZZLE_ROOT.y + 14}
                Z
              `}
              fill={ORANGE}
              stroke={PAPER}
              strokeWidth={2}
            />
            {/* swivel arc indicator — sweeps beneath the nozzle */}
            <g
              stroke={PAPER_DIM}
              strokeWidth={1.1}
              strokeDasharray="3 5"
              fill="none"
              opacity={leaderOpacity * 0.8}
            >
              <path
                d={`M ${NOZZLE_ROOT.x - 60} ${NOZZLE_ROOT.y + 70}
                    A 62 62 0 0 1 ${NOZZLE_ROOT.x + 60} ${NOZZLE_ROOT.y + 70}`}
              />
              {/* arrow head at the right end of the sweep */}
              <polygon
                points={`${NOZZLE_ROOT.x + 60},${NOZZLE_ROOT.y + 70} ${
                  NOZZLE_ROOT.x + 52
                },${NOZZLE_ROOT.y + 62} ${NOZZLE_ROOT.x + 52},${NOZZLE_ROOT.y + 78}`}
                fill={PAPER_DIM}
                stroke="none"
              />
              <text
                x={NOZZLE_ROOT.x}
                y={NOZZLE_ROOT.y + 95}
                textAnchor="middle"
                fill={PAPER_DIM}
                fontFamily={inter}
                fontSize={11}
                fontWeight={500}
                letterSpacing={2.4}
                stroke="none"
              >
                SWIVEL ± 180°
              </text>
            </g>
          </g>

          {/* ── Discharge arc & pulses ── */}
          {frame > dischargeStart && (
            <>
              {/* dashed trajectory */}
              <path
                d={arcPath}
                stroke={PAPER_DIM}
                strokeWidth={1.2}
                strokeDasharray="4 8"
                fill="none"
                opacity={0.75}
              />
              {/* nozzle muzzle flare */}
              <circle
                cx={NOZZLE_TIP.x}
                cy={NOZZLE_TIP.y}
                r={22}
                fill="url(#nozzle-flare)"
                opacity={0.7 + 0.3 * Math.sin(frame * 1.3)}
              />
              {/* pulse particles */}
              {pulses.map((p, i) => {
                const pt = arcPoint(p.t);
                const opacity = 1 - Math.pow(p.t, 1.6);
                const r = 5 - p.t * 2.5;
                return (
                  <g key={`p-${i}`} filter="url(#pulse-glow)">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={r + 3}
                      fill={YELLOW_HOT}
                      opacity={opacity * 0.35}
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={r}
                      fill={YELLOW}
                      opacity={opacity}
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* ── Leaders & labels ── */}
          <g opacity={leaderOpacity}>
            {LEADERS.map((L) => {
              const isLeft = L.side === "left";
              // Text sits between the code marker and the body,
              // on the outboard side of the marker (away from beetle).
              const textX = isLeft ? L.endX + 16 : L.endX - 16;
              const textAnchor = isLeft ? "start" : "end";
              return (
                <g key={L.key}>
                  {/* attachment dot on body */}
                  <circle cx={L.from.x} cy={L.from.y} r={2.4} fill={PAPER} />
                  {/* 3-segment path: body → jog → horizontal terminator */}
                  <path
                    d={`M ${L.from.x} ${L.from.y}
                        L ${L.jog.x} ${L.jog.y}
                        L ${L.endX} ${L.jog.y}`}
                    stroke={PAPER_DIM}
                    strokeWidth={1.1}
                    fill="none"
                  />
                  {/* code marker at terminator */}
                  <g transform={`translate(${L.endX}, ${L.jog.y})`}>
                    <circle
                      r={10}
                      fill={INK}
                      stroke={ORANGE}
                      strokeWidth={1.6}
                    />
                    <text
                      textAnchor="middle"
                      y={4}
                      fill={ORANGE}
                      fontFamily={inter}
                      fontSize={12}
                      fontWeight={600}
                    >
                      {L.code}
                    </text>
                  </g>
                  <text
                    x={textX}
                    y={L.jog.y + 4}
                    textAnchor={textAnchor}
                    fill={PAPER}
                    fontFamily={inter}
                    fontSize={13}
                    fontWeight={500}
                    letterSpacing={2.4}
                  >
                    {L.title}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ── Discharge specification callout ── */}
          <g opacity={interpolate(frame, [fps * 1.4, fps * 2.0], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}>
            <path
              d={`M ${arcPoint(0.28).x} ${arcPoint(0.28).y}
                  L ${arcPoint(0.28).x + 60} ${arcPoint(0.28).y - 60}
                  L ${arcPoint(0.28).x + 200} ${arcPoint(0.28).y - 60}`}
              stroke={YELLOW}
              strokeWidth={1.2}
              fill="none"
            />
            <g
              transform={`translate(${arcPoint(0.28).x + 205}, ${arcPoint(0.28).y - 60})`}
            >
              <text
                y={-8}
                fill={YELLOW}
                fontFamily={inter}
                fontSize={16}
                fontWeight={600}
                letterSpacing={2}
              >
                T = 100 °C
              </text>
              <text
                y={16}
                fill={PAPER}
                fontFamily={inter}
                fontSize={13}
                fontWeight={500}
                letterSpacing={2.4}
              >
                ƒ ≈ 500 PULSES / s
              </text>
            </g>
          </g>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={PAPER_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · PYGIDIAL GLAND — HYPERGOLIC DISCHARGE APPARATUS</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={YELLOW}
            opacity={0.9}
          >
            BRACHINUS SP. · DORSAL VIEW
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 985,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: YELLOW,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: PAPER_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: PAPER, letterSpacing: 5 }}>
            Chemical Engineer
          </span>
        </div>

        <div
          style={{
            color: PAPER,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The pocket
          <br />
          hypergolic reactor.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C7D1DE",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Threatened, the{" "}
          <span style={{ color: YELLOW, fontWeight: 600 }}>
            bombardier beetle
          </span>{" "}
          flushes hydroquinone and hydrogen peroxide across catalase and
          peroxidase inside an abdominal chamber and fires a{" "}
          <span style={{ color: YELLOW, fontWeight: 600 }}>100 °C</span>{" "}
          boiling spray in{" "}
          <span style={{ color: YELLOW, fontWeight: 600 }}>
            ~500 discrete pulses per second
          </span>{" "}
          through a swivelling nozzle.
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
          color: PAPER_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Aneshansley &amp; Eisner · Science 165 (1969) 61–63</span>
        <span>
          <span style={{ color: YELLOW }}>●</span> Hypergolic pulse
        </span>
      </div>

      {/* Consume durationInFrames to silence unused warnings */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
