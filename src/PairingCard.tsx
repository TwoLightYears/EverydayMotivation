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
const NIGHT = "#0B111C";
const NIGHT_HI = "#111827";
const SLATE = "#4B5B72";
const SLATE_HI = "#5F7089";
const CREAM = "#E7D6A8";
const RUFOUS = "#B87455";
const GRAY = "#8A96A8";
const GRID = "#161F2E";
const GRID_MAJOR = "#1D2839";

// Falcon in a full stoop: a clean, symmetric teardrop pointed at the beak
// and tapering to a fine tail. Local coords: (0,0) at the beak tip, +Y
// down the body toward the tail. Total height ~460, widest ~52 at y=170.
const FALCON_PATH = `
  M 0 0
  C 14 6 22 18 26 34
  C 40 46 50 70 55 110
  C 60 160 58 220 50 280
  C 42 340 30 390 14 440
  C 8 452 4 458 0 462
  C -4 458 -8 452 -14 440
  C -30 390 -42 340 -50 280
  C -58 220 -60 160 -55 110
  C -50 70 -40 46 -26 34
  C -22 18 -14 6 0 0
  Z
`;

// Subtle ventral highlight — a slimmer inner shape for depth
const FALCON_BREAST = `
  M 0 42
  C 14 58 22 88 24 130
  C 26 180 22 230 16 280
  C 10 330 4 370 0 396
  C -4 370 -10 330 -16 280
  C -22 230 -26 180 -24 130
  C -22 88 -14 58 0 42
  Z
`;

// A hint of tucked-wing edge on each side — a soft slate curve
const FALCON_WING_L = `
  M -34 74
  C -46 118 -50 170 -46 226
  C -40 282 -30 332 -18 380
`;
const FALCON_WING_R = `
  M 34 74
  C 46 118 50 170 46 226
  C 40 282 30 332 18 380
`;

// Airflow lines parting cleanly around the body. Mirrored pairs, each
// curving from ahead of the beak, around the shoulder bulge (widest point
// near y=170), then trailing past the tail (y=460).
const AIRFLOW: string[] = [
  // Innermost pair — skim the flank
  "M -60 -80 C -70 -20 -78 40 -80 120 C -80 220 -66 320 -34 440",
  "M 60 -80 C 70 -20 78 40 80 120 C 80 220 66 320 34 440",
  // Middle pair
  "M -110 -110 C -130 -40 -142 40 -140 120 C -140 220 -122 320 -80 460",
  "M 110 -110 C 130 -40 142 40 140 120 C 140 220 122 320 80 460",
  // Outer pair
  "M -160 -140 C -190 -60 -210 40 -206 130 C -200 230 -178 330 -134 480",
  "M 160 -140 C 190 -60 210 40 206 130 C 200 230 178 330 134 480",
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  const FRAME = { x: 60, y: 130, w: 960, h: 720 };

  // Falcon placement: centered in the drafting frame, tilted so it dives
  // down and to the right. Origin sits near the beak.
  const FALCON_CX = FRAME.x + FRAME.w * 0.48;
  const FALCON_CY = FRAME.y + FRAME.h * 0.22;
  const FALCON_ANGLE = 20; // degrees, dive vector clockwise from straight down
  const FALCON_SCALE = 0.72;

  // Animations
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const falconSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const gridOpacity = interpolate(frame, [0, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const calloutOpacity = interpolate(frame, [fps * 2.0, fps * 2.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const airflowT = interpolate(frame, [fps * 0.2, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Speed vector counts up 0 → 320
  const speedT = interpolate(frame, [fps * 0.8, fps * 2.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const speed = Math.round(speedT * 320);

  // Wind flicker on airflow (subtle)
  const windPhase = (frame % (fps * 3)) / (fps * 3);

  // Flight-vector arrow: extend below the falcon's tail along the dive line
  const diveDx = Math.sin((FALCON_ANGLE * Math.PI) / 180);
  const diveDy = Math.cos((FALCON_ANGLE * Math.PI) / 180);
  const beakX = FALCON_CX;
  const beakY = FALCON_CY;
  // Falcon tail tip in local coords is (0, 462); scaled = 462 * FALCON_SCALE
  const tailOffset = 462 * FALCON_SCALE + 24; // just past the tail
  const vectorStart = {
    x: beakX + diveDx * tailOffset,
    y: beakY + diveDy * tailOffset,
  };
  const vectorLen = 190;
  const vectorEnd = {
    x: vectorStart.x + diveDx * vectorLen,
    y: vectorStart.y + diveDy * vectorLen,
  };

  // Callout target (nostril): a spot at the head, offset from beak in local
  const localNostrilX = 10;
  const localNostrilY = 14;
  const cosA = Math.cos((FALCON_ANGLE * Math.PI) / 180);
  const sinA = Math.sin((FALCON_ANGLE * Math.PI) / 180);
  const nostrilX =
    FALCON_CX + (localNostrilX * cosA - localNostrilY * sinA) * FALCON_SCALE;
  const nostrilY =
    FALCON_CY + (localNostrilX * sinA + localNostrilY * cosA) * FALCON_SCALE;
  // Callout box location — upper-right corner of the frame
  const calloutX = FRAME.x + FRAME.w - 216;
  const calloutY = FRAME.y + 42;
  const calloutW = 186;
  const calloutH = 166;

  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, fontFamily: inter }}>
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
        <span style={{ color: RUFOUS }}>2026 · 08 · 21</span>
      </div>

      {/* Main SVG canvas */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Blueprint grid — fine + coarse */}
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
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
              d="M 160 0 L 0 0 0 160"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="52%" cy="30%" r="80%">
            <stop offset="0%" stopColor={NIGHT_HI} stopOpacity={1} />
            <stop offset="100%" stopColor={NIGHT} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="falcon-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SLATE_HI} />
            <stop offset="60%" stopColor={SLATE} />
            <stop offset="100%" stopColor="#3A4658" />
          </linearGradient>

          <linearGradient id="breast-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CREAM} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CREAM} stopOpacity={0.08} />
          </linearGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
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
        <g opacity={gridOpacity}>
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
        </g>

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#243044"
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
          <g key={i} stroke={RUFOUS} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Altitude ticks along left edge (draftsman scale) */}
        <g
          transform={`translate(${FRAME.x + 20}, ${FRAME.y + 60})`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={9}
          letterSpacing={2}
          fontWeight={500}
          opacity={0.85}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const y = i * 82;
            const isMajor = i % 2 === 0;
            return (
              <g key={i}>
                <line
                  x1={0}
                  y1={y}
                  x2={isMajor ? 18 : 10}
                  y2={y}
                  strokeWidth={1.2}
                />
                {isMajor ? (
                  <text x={24} y={y + 3} stroke="none">
                    {(1500 - i * 250).toString().padStart(4, "0")} M
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        {/* Bearing / N marker */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 44}, ${FRAME.y + 44})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={10}
          letterSpacing={3}
        >
          <circle
            cx={0}
            cy={0}
            r={16}
            fill="none"
            stroke={GRAY}
            strokeWidth={1}
            opacity={0.6}
          />
          <line
            x1={0}
            y1={-12}
            x2={0}
            y2={12}
            stroke={GRAY}
            strokeWidth={1}
            opacity={0.6}
          />
          <line
            x1={-12}
            y1={0}
            x2={12}
            y2={0}
            stroke={GRAY}
            strokeWidth={1}
            opacity={0.6}
          />
          <polygon points="-4,-6 0,-18 4,-6" fill={RUFOUS} />
          <text x={0} y={-22} textAnchor="middle" stroke="none">
            N
          </text>
        </g>

        {/* ── Falcon + airflow — everything rotates with dive vector ── */}
        <g
          transform={`translate(${FALCON_CX} ${FALCON_CY}) rotate(${FALCON_ANGLE}) scale(${FALCON_SCALE})`}
        >
          {/* Airflow streams — draw before falcon */}
          <g fill="none" strokeLinecap="round">
            {AIRFLOW.map((d, i) => {
              // Each stream reveals in turn, then breathes
              const base = airflowT;
              const stagger = i * 0.06;
              const localT = Math.max(0, Math.min(1, (base - stagger) / 0.6));
              const flicker =
                0.75 +
                0.2 *
                  Math.sin((windPhase + i * 0.13) * Math.PI * 2 + i);
              const isInner = i < 2;
              const isMid = i >= 2 && i < 4;
              const color = isInner ? CREAM : isMid ? SLATE_HI : GRAY;
              const op = (isInner ? 0.7 : isMid ? 0.55 : 0.4) * localT * flicker;
              const sw = isInner ? 1.6 : isMid ? 1.3 : 1.1;
              return (
                <path
                  key={i}
                  d={d}
                  stroke={color}
                  strokeWidth={sw}
                  strokeOpacity={op}
                  strokeDasharray={isInner ? "2 6" : "5 7"}
                />
              );
            })}
            {/* Tiny arrowheads at the tail of the two innermost streams */}
            {[
              { x: -34, y: 440, ang: 155 },
              { x: 34, y: 440, ang: 205 },
            ].map((a, i) => {
              const localT = Math.max(
                0,
                Math.min(1, (airflowT - 0.3) / 0.5),
              );
              const c = Math.cos((a.ang * Math.PI) / 180);
              const s = Math.sin((a.ang * Math.PI) / 180);
              return (
                <polygon
                  key={`ah-${i}`}
                  points={`${a.x},${a.y} ${a.x + c * 10 - s * 4},${
                    a.y + s * 10 + c * 4
                  } ${a.x + c * 10 + s * 4},${a.y + s * 10 - c * 4}`}
                  fill={CREAM}
                  opacity={0.7 * localT}
                />
              );
            })}
          </g>

          {/* Falcon body */}
          <g opacity={falconSpring}>
            {/* Soft halo — silhouette off the dark board */}
            <path
              d={FALCON_PATH}
              fill={SLATE}
              opacity={0.28}
              filter="url(#soft-glow)"
            />
            {/* Body */}
            <path
              d={FALCON_PATH}
              fill="url(#falcon-fill)"
              stroke="#2C3646"
              strokeWidth={0.8}
            />
            {/* Ventral highlight */}
            <path d={FALCON_BREAST} fill="url(#breast-fill)" />

            {/* Tucked-wing suggestions — thin slate curves inside the body */}
            <path
              d={FALCON_WING_L}
              fill="none"
              stroke="#2A3444"
              strokeWidth={1}
              opacity={0.7}
            />
            <path
              d={FALCON_WING_R}
              fill="none"
              stroke="#2A3444"
              strokeWidth={1}
              opacity={0.7}
            />

            {/* Peregrine dark helmet — contained inside the head silhouette */}
            <ellipse
              cx={0}
              cy={22}
              rx={20}
              ry={26}
              fill="#1A2130"
              opacity={0.95}
            />

            {/* Cream malar streak break — thin crescent below eye */}
            <path
              d="M 6 30 C 12 32 16 36 16 42 C 12 44 8 42 6 38 Z"
              fill={CREAM}
              opacity={0.6}
            />
            <path
              d="M -6 30 C -12 32 -16 36 -16 42 C -12 44 -8 42 -6 38 Z"
              fill={CREAM}
              opacity={0.6}
            />

            {/* Beak — small hooked point at the top */}
            <path
              d="M -3 0 C -1 -4 1 -4 3 0 L 4 8 C 2 10 -2 10 -4 8 Z"
              fill="#D9C58F"
            />
            <path d="M -1 7 L 0 12 L 1 7 Z" fill="#8A7A4A" />

            {/* Eye — a tiny warm spark on the helmet */}
            <circle cx={-6} cy={22} r={2.2} fill={NIGHT} />
            <circle cx={-6.4} cy={21.4} r={0.9} fill={CREAM} opacity={0.95} />

            {/* Nostril mark (target for callout) */}
            <circle
              cx={localNostrilX}
              cy={localNostrilY}
              r={1.8}
              fill={NIGHT}
            />
            <circle
              cx={localNostrilX}
              cy={localNostrilY}
              r={0.7}
              fill={RUFOUS}
              opacity={0.95}
            />

            {/* Chest barring — thin cream ticks suggesting speckled belly */}
            <g stroke={CREAM} strokeWidth={0.7} opacity={0.22}>
              {[70, 100, 130, 160, 190, 220, 250, 280, 310].map((y, i) => (
                <line
                  key={i}
                  x1={-14 + (i % 2) * 2}
                  y1={y}
                  x2={14 - (i % 2) * 2}
                  y2={y}
                />
              ))}
            </g>
          </g>
        </g>

        {/* ── Flight vector arrow ── */}
        <g opacity={calloutOpacity} stroke={RUFOUS} fill={RUFOUS}>
          <line
            x1={vectorStart.x}
            y1={vectorStart.y}
            x2={vectorEnd.x}
            y2={vectorEnd.y}
            strokeWidth={1.5}
            strokeDasharray="6 5"
          />
          {/* Arrowhead */}
          <polygon
            points={`${vectorEnd.x},${vectorEnd.y} ${
              vectorEnd.x - diveDx * 16 - diveDy * 7
            },${vectorEnd.y - diveDy * 16 + diveDx * 7} ${
              vectorEnd.x - diveDx * 16 + diveDy * 7
            },${vectorEnd.y - diveDy * 16 - diveDx * 7}`}
          />
          {/* Small tick perpendicular at the tail (start) */}
          <line
            x1={vectorStart.x - diveDy * 8}
            y1={vectorStart.y + diveDx * 8}
            x2={vectorStart.x + diveDy * 8}
            y2={vectorStart.y - diveDx * 8}
            strokeWidth={1.5}
          />
        </g>

        {/* Speed vector label — placed to the LEFT of the vector line */}
        <g
          opacity={calloutOpacity}
          transform={`translate(${
            (vectorStart.x + vectorEnd.x) / 2 - diveDy * 78
          }, ${(vectorStart.y + vectorEnd.y) / 2 + diveDx * 78})`}
          fill={RUFOUS}
          fontFamily={inter}
          fontWeight={600}
          fontSize={13}
          letterSpacing={3.5}
        >
          <text textAnchor="middle">{`V ≈ ${speed} KM/H`}</text>
          <text
            y={20}
            textAnchor="middle"
            fill={GRAY}
            letterSpacing={3}
            fontWeight={500}
            fontSize={11}
          >
            θ = 20°
          </text>
        </g>

        {/* ── Descent-profile ticks along the flight vector ── */}
        <g opacity={calloutOpacity * 0.8}>
          {[0.25, 0.5, 0.75].map((frac, i) => {
            const tx = vectorStart.x + diveDx * (vectorLen * frac);
            const ty = vectorStart.y + diveDy * (vectorLen * frac);
            return (
              <g key={i}>
                <line
                  x1={tx - diveDy * 5}
                  y1={ty + diveDx * 5}
                  x2={tx + diveDy * 5}
                  y2={ty - diveDx * 5}
                  stroke={RUFOUS}
                  strokeWidth={1.2}
                  opacity={0.7}
                />
              </g>
            );
          })}
        </g>

        {/* Airflow labels — connect the visual to the science */}
        <g
          opacity={interpolate(frame, [fps * 2.2, fps * 3.0], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
          fontFamily={inter}
          fontSize={10}
          fontWeight={600}
          letterSpacing={3}
        >
          {/* AMBIENT AIR — leader to outermost stream (right side of falcon) */}
          <line
            x1={FRAME.x + 640}
            y1={FRAME.y + 250}
            x2={FRAME.x + 720}
            y2={FRAME.y + 232}
            stroke={GRAY}
            strokeWidth={1}
            opacity={0.7}
          />
          <text x={FRAME.x + 726} y={FRAME.y + 236} fill={GRAY}>
            AMBIENT AIR
          </text>
          <text
            x={FRAME.x + 726}
            y={FRAME.y + 254}
            fill={GRAY}
            fontSize={9}
            fontWeight={500}
            opacity={0.75}
          >
            ρ · v²
          </text>

          {/* METERED STREAM — leader to the inner cream airflow near tail */}
          <line
            x1={FRAME.x + 620}
            y1={FRAME.y + 528}
            x2={FRAME.x + 720}
            y2={FRAME.y + 500}
            stroke={CREAM}
            strokeWidth={1}
            opacity={0.85}
          />
          <text x={FRAME.x + 726} y={FRAME.y + 504} fill={CREAM}>
            METERED STREAM
          </text>
          <text
            x={FRAME.x + 726}
            y={FRAME.y + 522}
            fill={CREAM}
            fontSize={9}
            fontWeight={500}
            opacity={0.75}
          >
            ROTATIONAL
          </text>
        </g>

        {/* ── Nostril callout ── */}
        <g opacity={calloutOpacity}>
          {/* Leader line: from nostril up-right to callout box */}
          <line
            x1={nostrilX}
            y1={nostrilY}
            x2={calloutX + 20}
            y2={calloutY + calloutH}
            stroke={RUFOUS}
            strokeWidth={1.2}
          />
          <circle cx={nostrilX} cy={nostrilY} r={3.5} fill="none" stroke={RUFOUS} strokeWidth={1.2} />

          {/* Callout frame */}
          <rect
            x={calloutX}
            y={calloutY}
            width={calloutW}
            height={calloutH}
            rx={2}
            fill={NIGHT_HI}
            stroke={RUFOUS}
            strokeWidth={1.2}
          />
          {/* Section label */}
          <text
            x={calloutX + 12}
            y={calloutY + 22}
            fill={RUFOUS}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            DETAIL A
          </text>
          <text
            x={calloutX + calloutW - 12}
            y={calloutY + 22}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={9}
            fontWeight={500}
            letterSpacing={2.5}
          >
            NARIS · 8×
          </text>

          {/* Enlarged naris — a stylised cross-section */}
          <g transform={`translate(${calloutX + calloutW / 2} ${calloutY + 92})`}>
            {/* Outer naris ring */}
            <ellipse
              cx={0}
              cy={0}
              rx={48}
              ry={34}
              fill={NIGHT}
              stroke={SLATE_HI}
              strokeWidth={1.4}
            />
            {/* Bony tubercle — the metering cone */}
            <circle cx={0} cy={0} r={12} fill={SLATE} stroke={CREAM} strokeWidth={1} />
            <circle cx={0} cy={0} r={4} fill={NIGHT} />

            {/* Incoming airflow arrows — three curling around the tubercle */}
            <g stroke={CREAM} fill="none" strokeWidth={1.2} opacity={0.85}>
              <path d="M -60 -20 C -40 -18 -22 -10 -14 0" />
              <path d="M -60 0 C -40 2 -24 6 -14 8" />
              <path d="M -60 20 C -40 18 -22 10 -14 4" />
              <polygon
                points="-14,0 -20,-4 -20,4"
                fill={CREAM}
                stroke="none"
              />
              <polygon
                points="-14,8 -20,4 -20,12"
                fill={CREAM}
                stroke="none"
              />
              <polygon
                points="-14,4 -20,0 -20,8"
                fill={CREAM}
                stroke="none"
              />
            </g>

            {/* Metered exit — one small rotational stream */}
            <g stroke={RUFOUS} fill="none" strokeWidth={1.3} opacity={0.95}>
              <path d="M 14 0 C 24 -4 32 4 28 14 C 24 22 16 20 12 12" />
              <polygon points="14,12 8,10 12,16" fill={RUFOUS} stroke="none" />
            </g>

            {/* Label */}
            <text
              x={0}
              y={54}
              textAnchor="middle"
              fill={CREAM}
              fontFamily={inter}
              fontSize={9}
              fontWeight={600}
              letterSpacing={2.5}
            >
              BONY TUBERCLE
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
          <text>FIG. 2 · FALCO PEREGRINUS IN FULL STOOP</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={RUFOUS}
            opacity={0.9}
          >
            RAM-AIR INTAKE, METERED
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
            color: RUFOUS,
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
            Aeronautical Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The falcon's
          <br />
          inlet cone.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          In a hunting stoop the{" "}
          <span style={{ color: CREAM, fontWeight: 600 }}>
            peregrine falcon
          </span>{" "}
          holds above{" "}
          <span style={{ color: RUFOUS, fontWeight: 600 }}>320 km/h</span>, and
          a small bony tubercle inside each nostril breaks the incoming airflow
          into a slower rotational stream — so ram-air pressure never
          over-inflates the lung.
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
        <span>Cade 1982 · Franklin, Nat. Geog. 2005</span>
        <span>
          <span style={{ color: RUFOUS }}>●</span> Ram-air, metered
        </span>
      </div>
    </AbsoluteFill>
  );
};
