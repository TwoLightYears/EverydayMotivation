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

// Palette — drawn from the concept's visual brief
const INK = "#0B0D10";
const BOARD = "#12151A";
const PEROXIDE = "#E8E0C7"; // pale cream — H2O2
const HYDROQ = "#F5B841"; // amber — hydroquinones
const SPRAY = "#E85A1D"; // hot benzoquinone jet
const SPRAY_HOT = "#FFB86B"; // spray highlight
const GRAY = "#7A8790";
const GRID = "#1A1E25";
const GRID_MAJOR = "#242A34";
const BEETLE_LINE = "#D6D8DC";
const BEETLE_FILL = "#181C22";
const CHITIN = "#2B241C";

// ── Frame (drafting board) inside the poster ────────────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 770 };
// SVG local coord space for the map content
const MAP_W = 1080;
const MAP_H = 866;
const SCALE = FRAME.w / MAP_W; // = FRAME.h / MAP_H

// ── Beetle profile (side-on, head at left, abdomen tip at upper-right) ──
// All beetle geometry authored in the 1080×866 map space.

// Rear vertex where the discharge nozzle sits.
const NOZZLE = { x: 812, y: 348 };
// Direction the jet fires (roughly up-and-right).
const JET_ANGLE_DEG = -24; // measured from +x axis
const JET_RAD = (JET_ANGLE_DEG * Math.PI) / 180;

// Convenience for pulse geometry along the jet vector
const jetPoint = (d: number) => ({
  x: NOZZLE.x + Math.cos(JET_RAD) * d,
  y: NOZZLE.y + Math.sin(JET_RAD) * d,
});

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Global timeline ────────────────────────────────────────────────
  // 0.0s   frame appears
  // 0.4s   metadata band settles
  // 0.6s   beetle line-draw
  // 1.4s   reservoirs fill
  // 2.2s   valve opens; nozzle glows
  // 2.4s   pulsed jet starts (loops)
  // 1.6s   title spring in
  // 2.3s   hook fade in
  const t = frame / fps;

  const beetleDraw = interpolate(t, [0.6, 1.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fillAmber = interpolate(t, [1.4, 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fillCream = interpolate(t, [1.55, 2.35], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const nozzleGlow = interpolate(t, [2.1, 2.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 1.6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(t, [2.3, 3.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const calloutsOpacity = interpolate(t, [1.9, 2.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Pulse strobe along the jet ─────────────────────────────────────
  // 10 visible pulses/second (the true 500 Hz would blur; we alias to
  // the eye's flicker-fusion floor so it reads as pulsed, not sprayed).
  const PULSE_HZ = 10;
  const JET_START = 2.4;
  const jetLive = t > JET_START;
  const jetPhase = (t - JET_START) * PULSE_HZ; // in "pulse periods"
  const PULSE_COUNT = 5;
  const PULSE_SPACING = 58; // px along jet, in map space
  const PULSE_MAX = PULSE_COUNT * PULSE_SPACING;

  // Heat shimmer at nozzle
  const shimmer =
    (Math.sin(t * 8.3) + Math.sin(t * 13.1 + 1.4)) * 0.5 + 0.5;

  // Individual visible pulses: newest at nozzle, each older one further out.
  const pulses = Array.from({ length: PULSE_COUNT }).map((_, i) => {
    // pulseAge in periods, 0 = just emitted
    const ageInPeriods = (jetPhase + i * 0.32) % PULSE_COUNT;
    const d = ageInPeriods * PULSE_SPACING; // distance along jet
    const life = ageInPeriods / PULSE_COUNT; // 0..1
    const opacity = jetLive ? (1 - life) * 0.9 : 0;
    const radius = 8 + life * 34;
    const jitter = (Math.sin(life * 8 + i * 1.7) - 0.5) * 6;
    const perp = {
      x: -Math.sin(JET_RAD) * jitter,
      y: Math.cos(JET_RAD) * jitter,
    };
    const p = jetPoint(d);
    return {
      x: p.x + perp.x,
      y: p.y + perp.y,
      r: radius,
      opacity,
      i,
    };
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
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: HYDROQ }}>2026 · 07 · 17</span>
      </div>

      {/* Drafting frame + illustration */}
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
            width={48 * SCALE}
            height={48 * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${48 * SCALE} 0 L 0 0 0 ${48 * SCALE}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192 * SCALE}
            height={192 * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${192 * SCALE} 0 L 0 0 0 ${192 * SCALE}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#161A22" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="nozzle-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SPRAY_HOT} stopOpacity={0.9} />
            <stop offset="40%" stopColor={SPRAY} stopOpacity={0.55} />
            <stop offset="100%" stopColor={SPRAY} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="pulse-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SPRAY_HOT} stopOpacity={0.95} />
            <stop offset="55%" stopColor={SPRAY} stopOpacity={0.55} />
            <stop offset="100%" stopColor={SPRAY} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="chamber-heat" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={HYDROQ} stopOpacity={0.5} />
            <stop offset="100%" stopColor={SPRAY} stopOpacity={0.85} />
          </linearGradient>

          <filter id="jet-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
          <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          <clipPath id="draft-clip">
            <rect
              x={FRAME.x + 2}
              y={FRAME.y + 2}
              width={FRAME.w - 4}
              height={FRAME.h - 4}
            />
          </clipPath>
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
          stroke="#262C36"
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
          <g key={i} stroke={SPRAY} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Sheet index — top-left of the drafting board */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.2}
          fontWeight={600}
        >
          <text>SHT · 03 / 03</text>
          <text y={20} fill={HYDROQ}>
            APPARATUS
          </text>
        </g>

        {/* Scale / temp legend — bottom-right of drafting board */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 180}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={2.6}
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

        {/* ── Illustration content: 1080×866 map space into FRAME ── */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${SCALE})`}
          clipPath="url(#draft-clip)"
        >
          {/* Faint reference axes for the "engineering plate" feel */}
          <line
            x1={70}
            y1={780}
            x2={1010}
            y2={780}
            stroke={GRAY}
            strokeOpacity={0.28}
            strokeWidth={1}
            strokeDasharray="1 8"
          />
          <line
            x1={70}
            y1={80}
            x2={70}
            y2={780}
            stroke={GRAY}
            strokeOpacity={0.28}
            strokeWidth={1}
            strokeDasharray="1 8"
          />

          {/* All the beetle apparatus + callouts are drawn in a
              shifted local frame so the pulsed jet has room on the right. */}
          <g transform="translate(-110 40)">
          {/* ── Beetle silhouette (profile) ─────────────────────── */}
          {/* Legs — drawn first so body sits over their joints */}
          <g
            stroke={BEETLE_LINE}
            strokeOpacity={0.9}
            strokeWidth={2.2}
            strokeLinecap="round"
            fill="none"
            style={{
              strokeDasharray: 1400,
              strokeDashoffset: 1400 * (1 - beetleDraw),
            }}
          >
            {/* front leg */}
            <path d="M 260 470 Q 235 545 220 640" />
            <path d="M 220 640 L 235 660" />
            {/* mid leg */}
            <path d="M 400 500 Q 380 585 350 660" />
            <path d="M 350 660 L 368 682" />
            {/* rear leg */}
            <path d="M 570 500 Q 555 590 500 660" />
            <path d="M 500 660 L 522 680" />
            {/* far-side legs (fainter) */}
            <path
              d="M 310 480 Q 300 555 280 640"
              stroke={BEETLE_LINE}
              strokeOpacity={0.35}
            />
            <path
              d="M 450 505 Q 430 590 405 665"
              stroke={BEETLE_LINE}
              strokeOpacity={0.35}
            />
            <path
              d="M 620 500 Q 600 590 545 665"
              stroke={BEETLE_LINE}
              strokeOpacity={0.35}
            />
          </g>

          {/* Antennae */}
          <g
            stroke={BEETLE_LINE}
            strokeOpacity={0.85}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            style={{
              strokeDasharray: 400,
              strokeDashoffset: 400 * (1 - beetleDraw),
            }}
          >
            <path d="M 190 405 Q 130 340 90 275" />
            <path d="M 190 405 Q 105 380 60 340" />
          </g>

          {/* Body — head, thorax, elytra as a single silhouette */}
          <g
            style={{
              strokeDasharray: 2600,
              strokeDashoffset: 2600 * (1 - beetleDraw),
            }}
          >
            {/* Elytra shadow fill (appears once outline is nearly drawn) */}
            <path
              d="M 240 415 C 250 385, 300 372, 360 372
                 C 500 372, 640 380, 720 388
                 C 770 393, 800 405, 812 428
                 C 820 448, 812 468, 780 478
                 C 690 500, 520 508, 380 500
                 C 300 495, 250 470, 240 445 Z"
              fill={BEETLE_FILL}
              opacity={beetleDraw}
            />
            {/* Warm chitin band under the thorax */}
            <path
              d="M 240 415 C 250 385, 300 372, 360 372
                 C 400 372, 430 378, 450 388
                 L 300 460 C 260 445, 245 430, 240 415 Z"
              fill={CHITIN}
              opacity={0.85 * beetleDraw}
            />
            {/* Elytra outline */}
            <path
              d="M 240 415 C 250 385, 300 372, 360 372
                 C 500 372, 640 380, 720 388
                 C 770 393, 800 405, 812 428
                 C 820 448, 812 468, 780 478
                 C 690 500, 520 508, 380 500
                 C 300 495, 250 470, 240 445 Z"
              fill="none"
              stroke={BEETLE_LINE}
              strokeWidth={2.4}
            />
            {/* Elytral seam */}
            <path
              d="M 300 405 C 460 410, 620 418, 780 442"
              fill="none"
              stroke={BEETLE_LINE}
              strokeOpacity={0.7}
              strokeWidth={1.6}
            />
            {/* Head */}
            <path
              d="M 240 415 C 220 405, 205 400, 195 405
                 C 180 412, 178 428, 190 442
                 C 205 458, 232 462, 250 452"
              fill={BEETLE_FILL}
              stroke={BEETLE_LINE}
              strokeWidth={2.2}
            />
            {/* Pronotum divider */}
            <path
              d="M 260 402 C 290 380, 340 375, 360 378"
              fill="none"
              stroke={BEETLE_LINE}
              strokeOpacity={0.55}
              strokeWidth={1.4}
            />
            {/* Eye */}
            <circle cx={214} cy={422} r={4.5} fill={BEETLE_LINE} />
            <circle cx={214} cy={422} r={1.8} fill={INK} />

            {/* Elytra stipple — subtle diagonal hatching for depth */}
            <g
              stroke={BEETLE_LINE}
              strokeOpacity={0.09}
              strokeWidth={1}
              fill="none"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={i}
                  x1={330 + i * 38}
                  y1={392 + (i % 2) * 4}
                  x2={310 + i * 38}
                  y2={478 + (i % 2) * 4}
                />
              ))}
            </g>

            {/* Segmented abdomen / discharge tip */}
            <path
              d="M 720 460 C 760 470, 795 480, 812 500
                 C 820 512, 818 528, 800 534
                 C 770 542, 730 528, 700 508 Z"
              fill={CHITIN}
              stroke={BEETLE_LINE}
              strokeWidth={2}
              opacity={beetleDraw}
            />
          </g>

          {/* ── Cutaway: reaction chamber schematic on the abdomen ── */}
          {/* Cutaway "window" outline */}
          <g opacity={beetleDraw}>
            <path
              d="M 460 400 L 810 358 L 830 470 L 480 512 Z"
              fill={BOARD}
              stroke={GRAY}
              strokeOpacity={0.6}
              strokeWidth={1.4}
              strokeDasharray="4 4"
            />
            {/* subtle inner tint */}
            <path
              d="M 460 400 L 810 358 L 830 470 L 480 512 Z"
              fill={INK}
              opacity={0.35}
            />
          </g>

          {/* Reservoir 1 — hydroquinones (amber) */}
          <g opacity={beetleDraw}>
            <rect
              x={498}
              y={412}
              width={132}
              height={64}
              rx={10}
              fill={INK}
              stroke={GRAY}
              strokeOpacity={0.7}
              strokeWidth={1.6}
            />
            {/* fill */}
            <rect
              x={500}
              y={414 + 60 * (1 - fillAmber)}
              width={128}
              height={60 * fillAmber}
              rx={8}
              fill={HYDROQ}
              opacity={0.92}
            />
            {/* meniscus highlight */}
            {fillAmber > 0.05 && (
              <line
                x1={500}
                y1={414 + 60 * (1 - fillAmber)}
                x2={628}
                y2={414 + 60 * (1 - fillAmber)}
                stroke={PEROXIDE}
                strokeOpacity={0.4}
                strokeWidth={1}
              />
            )}
          </g>

          {/* Reservoir 2 — hydrogen peroxide (cream) */}
          <g opacity={beetleDraw}>
            <rect
              x={498}
              y={484}
              width={132}
              height={22}
              rx={7}
              fill={INK}
              stroke={GRAY}
              strokeOpacity={0.7}
              strokeWidth={1.6}
            />
            <rect
              x={500}
              y={486 + 18 * (1 - fillCream)}
              width={128}
              height={18 * fillCream}
              rx={6}
              fill={PEROXIDE}
              opacity={0.85}
            />
          </g>

          {/* Tiny reservoir tags (A / B) */}
          <g
            opacity={beetleDraw * 0.75}
            fontFamily={inter}
            fontSize={9}
            fontWeight={700}
            letterSpacing={2.2}
            textAnchor="start"
            fill={GRAY}
          >
            <text x={506} y={409}>A</text>
            <text x={506} y={481}>B</text>
          </g>

          {/* Connecting pipes → valve → chamber */}
          <g
            stroke={GRAY}
            strokeOpacity={0.9}
            strokeWidth={2.2}
            fill="none"
            opacity={beetleDraw}
          >
            <path d="M 630 444 L 680 444 L 680 462" />
            <path d="M 630 495 L 668 495 L 668 462" />
            {/* valve body */}
            <circle
              cx={680}
              cy={462}
              r={9}
              fill={INK}
              stroke={GRAY}
              strokeOpacity={0.9}
            />
            <line
              x1={674}
              y1={462}
              x2={686}
              y2={462}
              stroke={GRAY}
              strokeOpacity={0.9}
              strokeWidth={2}
            />
            {/* pipe to chamber */}
            <path d="M 689 462 L 715 448" />
          </g>

          {/* Reaction chamber — the exothermic core */}
          <g opacity={beetleDraw}>
            <ellipse
              cx={745}
              cy={442}
              rx={40}
              ry={22}
              fill="url(#chamber-heat)"
              stroke={SPRAY}
              strokeOpacity={0.8}
              strokeWidth={1.8}
              opacity={0.35 + nozzleGlow * 0.65}
            />
            {/* enzyme-lining stipple */}
            <g stroke={SPRAY} strokeOpacity={0.6} strokeWidth={1}>
              {Array.from({ length: 18 }).map((_, i) => {
                const a = (i / 18) * Math.PI * 2;
                const rx = 40;
                const ry = 22;
                const x1 = 745 + Math.cos(a) * (rx - 3);
                const y1 = 442 + Math.sin(a) * (ry - 3);
                const x2 = 745 + Math.cos(a) * (rx + 3);
                const y2 = 442 + Math.sin(a) * (ry + 3);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                  />
                );
              })}
            </g>
          </g>

          {/* Nozzle body — the aimable spout at the abdomen tip.
              Brighter warm-chitin so it reads against the deep board. */}
          <g opacity={beetleDraw}>
            <path
              d="M 780 438 L 812 348 L 826 356 L 800 448 Z"
              fill="#4A3626"
              stroke={SPRAY}
              strokeOpacity={0.85}
              strokeWidth={1.8}
            />
            {/* aperture ring at the tip */}
            <circle
              cx={NOZZLE.x}
              cy={NOZZLE.y}
              r={5}
              fill={INK}
              stroke={SPRAY_HOT}
              strokeWidth={1.6}
            />
          </g>

          {/* Nozzle heat halo */}
          {nozzleGlow > 0 && (
            <circle
              cx={NOZZLE.x}
              cy={NOZZLE.y}
              r={26 + shimmer * 6}
              fill="url(#nozzle-glow)"
              opacity={nozzleGlow}
            />
          )}

          {/* ── Pulsed jet ─────────────────────────────────────── */}
          {jetLive && (
            <g filter="url(#jet-blur)">
              {/* Soft heat plume backing */}
              <ellipse
                cx={NOZZLE.x + Math.cos(JET_RAD) * (PULSE_MAX * 0.5)}
                cy={NOZZLE.y + Math.sin(JET_RAD) * (PULSE_MAX * 0.5)}
                rx={PULSE_MAX * 0.55}
                ry={70}
                fill={SPRAY}
                opacity={0.06}
                transform={`rotate(${JET_ANGLE_DEG} ${NOZZLE.x} ${NOZZLE.y})`}
                filter="url(#soft-blur)"
              />
              {pulses.map((p) => (
                <g key={p.i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.r * 1.4}
                    fill="url(#pulse-grad)"
                    opacity={p.opacity * 0.55}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.r * 0.55}
                    fill={SPRAY_HOT}
                    opacity={p.opacity}
                  />
                </g>
              ))}
              {/* Nozzle spark */}
              <circle
                cx={NOZZLE.x}
                cy={NOZZLE.y}
                r={6}
                fill="#FFFFFF"
                opacity={0.85}
              />
            </g>
          )}

          {/* ── Callouts (leader lines + tags) ───────────────── */}
          <g
            opacity={calloutsOpacity}
            stroke={GRAY}
            strokeOpacity={0.75}
            strokeWidth={1.2}
            fill="none"
          >
            {/* Callout A — Reservoir A (amber) */}
            <path d="M 498 430 L 420 340 L 380 340" />
            {/* Callout B — Reservoir B (cream) */}
            <path d="M 498 500 L 400 620 L 380 620" />
            {/* Callout C — Chamber (temp + catalyst) */}
            <path d="M 745 470 L 745 610 L 610 610" />
            {/* Callout D — Nozzle (routed above the jet arc) */}
            <path d="M 812 348 L 830 210 L 970 210" />
          </g>

          {/* Callout tag chips */}
          <g
            opacity={calloutsOpacity}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2.6}
            fontWeight={600}
            textAnchor="end"
          >
            {/* A */}
            <g>
              <text x={374} y={320} fill={HYDROQ}>
                A · RESERVOIR
              </text>
              <text
                x={374}
                y={338}
                fill={GRAY}
                fontWeight={500}
                letterSpacing={2}
                fontSize={10.5}
              >
                hydroquinones · 10%
              </text>
            </g>
            {/* B */}
            <g>
              <text x={374} y={600} fill={PEROXIDE}>
                B · RESERVOIR
              </text>
              <text
                x={374}
                y={618}
                fill={GRAY}
                fontWeight={500}
                letterSpacing={2}
                fontSize={10.5}
              >
                hydrogen peroxide · 25%
              </text>
            </g>
            {/* C */}
            <g>
              <text x={604} y={610} fill={SPRAY_HOT}>
                C · CHAMBER · ~100 °C
              </text>
              <text
                x={604}
                y={628}
                fill={GRAY}
                fontWeight={500}
                letterSpacing={2}
                fontSize={10.5}
              >
                catalase / peroxidase lining
              </text>
            </g>
            {/* D */}
            <g textAnchor="start">
              <text x={965} y={202} fill={SPRAY}>
                D · NOZZLE
              </text>
              <text
                x={965}
                y={220}
                fill={GRAY}
                fontWeight={500}
                letterSpacing={2}
                fontSize={10.5}
              >
                pulsed jet · ~500 Hz
              </text>
            </g>
          </g>

          </g>
          {/* Small pulse-rate readout in the drafting board's lower-right,
              outside the shifted illustration group so it never collides
              with the jet. */}
          <g
            opacity={jetLive ? 0.9 : 0}
            fontFamily={inter}
            transform="translate(870 720)"
          >
            <rect
              x={-6}
              y={-16}
              width={160}
              height={50}
              rx={3}
              fill={INK}
              stroke={SPRAY}
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={0}
              y={2}
              fill={GRAY}
              fontSize={9.5}
              letterSpacing={2.4}
              fontWeight={600}
            >
              PULSE RATE
            </text>
            <text
              x={0}
              y={26}
              fill={SPRAY_HOT}
              fontFamily={playfair}
              fontStyle="italic"
              fontSize={22}
            >
              ≈ 500 Hz
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
          <text>FIG. 3 · APPARATUS OF BRACHINUS SPP., LATERAL SECTION</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={HYDROQ}
            opacity={0.85}
          >
            IN-VIVO PULSED COMBUSTION
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 960,
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
            color: HYDROQ,
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
            Chemical Engineer
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
          A pulsed reactor
          <br />
          with legs.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The bombardier beetle mixes{" "}
          <span style={{ color: PEROXIDE, fontWeight: 600 }}>H₂O₂</span> and{" "}
          <span style={{ color: HYDROQ, fontWeight: 600 }}>hydroquinones</span>{" "}
          in a chamber lined with catalase and peroxidase, then vents the{" "}
          <span style={{ color: SPRAY_HOT, fontWeight: 600 }}>
            100 °C benzoquinone
          </span>{" "}
          spray as a directional jet at roughly{" "}
          <span style={{ color: SPRAY_HOT, fontWeight: 600 }}>
            500 pulses per second
          </span>
          .
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 44,
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
        <span>Eisner & Aneshansley · PNAS 96 (1999) · Arndt et al. · Science 348 (2015)</span>
        <span>
          <span style={{ color: SPRAY }}>●</span> Pulsed jet
        </span>
      </div>

      {/* Fade the whole card out slightly at loop end so mp4 loops cleanly */}
      {(() => {
        const outFade = interpolate(
          frame,
          [durationInFrames - 8, durationInFrames - 1],
          [1, 1],
        );
        return (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 1 - outFade + 1,
            }}
          />
        );
      })()}
    </AbsoluteFill>
  );
};
