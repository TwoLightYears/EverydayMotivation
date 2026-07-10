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

// Palette — taken from the concept's visual brief (real peregrine coloration).
const SKY_TOP = "#0F1622";
const SKY_MID = "#141E30";
const SKY_LOW = "#1B2A40";
const SLATE = "#43587A";
const SLATE_DEEP = "#2A3A55";
const CREAM = "#E7DFCB";
const CERE = "#EDC341";
const AUBURN = "#8B3E33";
const GRID = "#22304A";
const GRAY = "#7C8697";
const CREAM_DIM = "#B7B0A1";

// Falcon local frame: head at +x (leading edge of dive), tail at -x.
// Body ~ 440 long, belly ~ 34 units. Sized for scale(0.72) inside sky panel.
// Silhouette designed so head, tucked wing, and tail read distinctly.
const FALCON_BODY_D = [
  // Right side of head → back → tail (top edge, y negative)
  "M 214 0",
  "C 214 -10, 206 -20, 184 -24",
  "C 148 -30, 100 -32, 46 -32",
  "C -20 -30, -84 -26, -150 -18",
  "C -196 -12, -224 -6, -238 0",
  // Tail tip (smooth taper — no fork)
  // Left side (belly, y positive)
  "C -224 6, -196 12, -150 18",
  "C -84 26, -20 30, 46 32",
  "C 100 32, 148 30, 184 24",
  "C 206 20, 214 10, 214 0",
  "Z",
].join(" ");

// Cape — the darker back plumage. Traces the upper edge of the body and
// closes along the mid-line. Painted between the cream body and the wing.
const FALCON_CAPE_D = [
  "M -238 0",
  "L 214 0",
  "C 214 -10, 206 -20, 184 -24",
  "C 148 -30, 100 -32, 46 -32",
  "C -20 -30, -84 -26, -150 -18",
  "C -196 -12, -224 -6, -238 0",
  "Z",
].join(" ");

// Tucked primary-feather wing riding along the falcon's back.
const FALCON_WING_D = [
  "M 60 -20",
  "Q 10 -34, -50 -34",
  "Q -130 -30, -180 -18",
  "Q -200 -12, -206 -6",
  "Q -160 -20, -110 -22",
  "Q -40 -26, 20 -24",
  "Q 50 -22, 60 -20",
  "Z",
].join(" ");

// Secondary wing crease (thin dark stroke over top of tucked wing).
const FALCON_WING_EDGE_D = "M 60 -20 Q 10 -32 -50 -32 Q -130 -28 -190 -14";

// Hooked beak jutting past the head.
const FALCON_BEAK_D = "M 214 -5 L 246 0 L 214 5 Q 226 0 214 -5 Z";

// Dark hood covering the crown of the head.
const FALCON_HOOD_D = [
  "M 214 -2",
  "C 214 -14, 202 -22, 178 -24",
  "C 150 -26, 132 -22, 120 -16",
  "C 130 -8, 154 -6, 178 -6",
  "C 200 -4, 210 -3, 214 -2",
  "Z",
].join(" ");

// Barred-breast marks on the cream underside.
const FALCON_BARS: Array<[number, number, number, number]> = [
  [130, 14, 150, 16],
  [98, 18, 122, 22],
  [64, 22, 92, 26],
  [26, 26, 58, 30],
  [-14, 28, 20, 32],
  [-58, 28, -22, 32],
  [-102, 26, -66, 30],
  [-146, 20, -110, 24],
];

type Line = { x1: number; y1: number; x2: number; y2: number };

// Streamline lanes (in sky viewBox). Each streamline slides down along its
// lane over the loop duration.
const STREAM_LANES: Array<{
  x: number;
  angle: number;
  len: number;
  dashLen: number;
  gap: number;
  opacity: number;
  offsetSeed: number;
}> = [
  { x: 90, angle: 78, len: 780, dashLen: 60, gap: 90, opacity: 0.28, offsetSeed: 0.10 },
  { x: 155, angle: 78, len: 780, dashLen: 40, gap: 80, opacity: 0.20, offsetSeed: 0.45 },
  { x: 220, angle: 78, len: 780, dashLen: 90, gap: 120, opacity: 0.32, offsetSeed: 0.72 },
  { x: 300, angle: 78, len: 780, dashLen: 30, gap: 70, opacity: 0.18, offsetSeed: 0.22 },
  { x: 380, angle: 78, len: 780, dashLen: 70, gap: 100, opacity: 0.30, offsetSeed: 0.55 },
  { x: 470, angle: 78, len: 780, dashLen: 50, gap: 90, opacity: 0.24, offsetSeed: 0.03 },
  { x: 780, angle: 78, len: 780, dashLen: 90, gap: 130, opacity: 0.34, offsetSeed: 0.30 },
  { x: 860, angle: 78, len: 780, dashLen: 40, gap: 70, opacity: 0.22, offsetSeed: 0.66 },
  { x: 940, angle: 78, len: 780, dashLen: 70, gap: 100, opacity: 0.28, offsetSeed: 0.85 },
  { x: 1005, angle: 78, len: 780, dashLen: 55, gap: 90, opacity: 0.24, offsetSeed: 0.15 },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loopFrames = durationInFrames;
  const loopT = (frame % loopFrames) / loopFrames;

  // ── Instrument entrances ────────────────────────────────────────────
  const skyReveal = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const hudReveal = interpolate(frame, [8, 32], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const falconEntrance = spring({
    frame: frame - 14,
    fps,
    config: { damping: 180, mass: 0.9, stiffness: 90 },
  });
  const airspeedProgress = spring({
    frame: frame - 32,
    fps,
    config: { damping: 22, mass: 1.4, stiffness: 55 },
  });
  const calloutReveal = interpolate(frame, [46, 74], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const titleSpring = spring({
    frame: frame - 54,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [76, 108], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Sky panel geometry ─────────────────────────────────────────────
  const SKY = { x: 60, y: 130, w: 960, h: 760 };

  // Falcon placement inside sky panel.
  const FALCON_CX = SKY.x + 420;
  const FALCON_CY = SKY.y + 300;
  const FALCON_ROT = 62; // clockwise degrees from head-right
  const FALCON_SCALE = 0.72;
  const falconLift = interpolate(falconEntrance, [0, 1], [-24, 0]);

  // Rotate + scale a local-frame point into sky-panel coords.
  const rotPt = (lx: number, ly: number): [number, number] => {
    const rad = (FALCON_ROT * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const sx = lx * FALCON_SCALE;
    const sy = ly * FALCON_SCALE;
    return [
      FALCON_CX + sx * c - sy * s,
      FALCON_CY + falconLift + sx * s + sy * c,
    ];
  };
  const [headX, headY] = rotPt(202, -6); // eye
  const [beakX, beakY] = rotPt(238, 0); // beak tip

  // ── Airspeed dial (bottom-right corner) ────────────────────────────
  const DIAL_CX = SKY.x + SKY.w - 130;
  const DIAL_CY = SKY.y + SKY.h - 150;
  const DIAL_R = 96;
  const DIAL_START = 140; // degrees
  const DIAL_END = 400; // sweeps clockwise past 360 to 40°
  const SPEED_MAX = 400;
  const speedTarget = 320;
  const currentSpeed = airspeedProgress * speedTarget;
  const speedFrac = currentSpeed / SPEED_MAX;
  const needleAngle = DIAL_START + (DIAL_END - DIAL_START) * speedFrac;
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const needleX = DIAL_CX + Math.cos(needleRad) * (DIAL_R - 16);
  const needleY = DIAL_CY + Math.sin(needleRad) * (DIAL_R - 16);

  // Altimeter tape values (continuously scrolling downward)
  const altSpeedFtPerSec = 260; // arbitrary scroll rate
  const altOffset = (frame * altSpeedFtPerSec) / fps;
  const tickSpacing = 40; // px per 100 ft
  const tickWindow = 8; // ticks visible above/below center

  return (
    <AbsoluteFill style={{ backgroundColor: SKY_TOP, fontFamily: inter }}>
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
          opacity: skyReveal,
        }}
      >
        <span>Everyday Motivation &middot; No. 003</span>
        <span style={{ color: CERE }}>2026 &middot; 07 &middot; 10</span>
      </div>

      {/* Sky + HUD */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY_TOP} />
            <stop offset="55%" stopColor={SKY_MID} />
            <stop offset="100%" stopColor={SKY_LOW} />
          </linearGradient>
          <radialGradient id="skyVignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#1E2C46" stopOpacity={0.55} />
            <stop offset="100%" stopColor={SKY_TOP} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="dialTick" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CREAM} stopOpacity={0.9} />
            <stop offset="100%" stopColor={CREAM} stopOpacity={0} />
          </linearGradient>
          {/* Falcon body shading — subtle depth */}
          <linearGradient id="falconShade" x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%" stopColor={SLATE} />
            <stop offset="100%" stopColor={SLATE_DEEP} />
          </linearGradient>
          <clipPath id="skyClip">
            <rect x={SKY.x} y={SKY.y} width={SKY.w} height={SKY.h} />
          </clipPath>
        </defs>

        {/* Sky panel */}
        <rect
          x={SKY.x}
          y={SKY.y}
          width={SKY.w}
          height={SKY.h}
          fill="url(#skyGrad)"
        />
        <rect
          x={SKY.x}
          y={SKY.y}
          width={SKY.w}
          height={SKY.h}
          fill="url(#skyVignette)"
        />

        {/* Inner border */}
        <rect
          x={SKY.x + 0.5}
          y={SKY.y + 0.5}
          width={SKY.w - 1}
          height={SKY.h - 1}
          fill="none"
          stroke={GRID}
          strokeWidth={1}
        />

        {/* Corner ticks (crop marks) */}
        {(
          [
            [SKY.x, SKY.y, 1, 1],
            [SKY.x + SKY.w, SKY.y, -1, 1],
            [SKY.x, SKY.y + SKY.h, 1, -1],
            [SKY.x + SKY.w, SKY.y + SKY.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={CERE} strokeWidth={1.6} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* HUD label top-left */}
        <g
          transform={`translate(${SKY.x + 24}, ${SKY.y + 30})`}
          fill={CREAM_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3.4}
          fontWeight={600}
          opacity={hudReveal}
        >
          <text>STOOP · TERMINAL VELOCITY</text>
        </g>

        {/* Sky-clipped content: streamlines + falcon */}
        <g clipPath="url(#skyClip)">
          {/* Streamlines flowing past */}
          <g opacity={hudReveal}>
            {STREAM_LANES.map((lane, i) => {
              const period = lane.dashLen + lane.gap;
              const phase = (loopT + lane.offsetSeed) % 1;
              const dashOffset = -phase * period;
              const rad = (lane.angle * Math.PI) / 180;
              const x1 = SKY.x + lane.x;
              const y1 = SKY.y - 40;
              const x2 = x1 + Math.cos(rad) * lane.len;
              const y2 = y1 + Math.sin(rad) * lane.len;
              return (
                <line
                  key={`stream-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={CREAM}
                  strokeOpacity={lane.opacity}
                  strokeWidth={1.2}
                  strokeDasharray={`${lane.dashLen} ${lane.gap}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Falcon */}
          <g
            transform={`translate(${FALCON_CX}, ${FALCON_CY + falconLift}) rotate(${FALCON_ROT}) scale(${FALCON_SCALE})`}
            opacity={falconEntrance}
          >
            {/* Motion blur trail behind the falcon (streams off the tail) */}
            <g>
              <ellipse
                cx={-290}
                cy={0}
                rx={140}
                ry={12}
                fill={SLATE}
                opacity={0.28}
              />
              <ellipse
                cx={-350}
                cy={0}
                rx={110}
                ry={8}
                fill={SLATE}
                opacity={0.18}
              />
              <ellipse
                cx={-410}
                cy={0}
                rx={80}
                ry={5}
                fill={CREAM}
                opacity={0.10}
              />
            </g>

            {/* Cream body base */}
            <path d={FALCON_BODY_D} fill={CREAM} />

            {/* Belly barring on cream */}
            {FALCON_BARS.map(([x1, y1, x2, y2], i) => (
              <line
                key={`bar-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={SLATE_DEEP}
                strokeWidth={1.6}
                strokeLinecap="round"
                opacity={0.85}
              />
            ))}

            {/* Slate back cape covering the top half of the body */}
            <path d={FALCON_CAPE_D} fill={SLATE} />
            {/* Subtle darker shading along the spine */}
            <path
              d="M 214 0 C 100 -6 -100 -6 -238 0"
              stroke={SLATE_DEEP}
              strokeWidth={2}
              fill="none"
              opacity={0.35}
            />

            {/* Tucked wing on top of cape */}
            <path d={FALCON_WING_D} fill={SLATE_DEEP} />
            <path
              d={FALCON_WING_EDGE_D}
              stroke={SKY_TOP}
              strokeWidth={1.4}
              fill="none"
              opacity={0.7}
            />
            {/* Wing feather barbs */}
            <g stroke={SKY_TOP} strokeWidth={1} opacity={0.55} fill="none">
              <path d="M 30 -22 L 20 -30" />
              <path d="M -10 -26 L -22 -32" />
              <path d="M -60 -28 L -78 -32" />
              <path d="M -110 -22 L -130 -26" />
              <path d="M -160 -18 L -180 -18" />
            </g>

            {/* Dark hood (peregrine cap) */}
            <path d={FALCON_HOOD_D} fill={SKY_TOP} />
            {/* Malar (moustache) stripe */}
            <path
              d="M 200 4 Q 196 16 180 20 Q 172 22 164 20"
              stroke={SKY_TOP}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
            />
            {/* Cere (yellow patch at beak base) */}
            <path
              d="M 206 -4 Q 220 -6, 224 0 Q 220 6, 206 4 Z"
              fill={CERE}
            />
            {/* Beak */}
            <path d={FALCON_BEAK_D} fill={SLATE_DEEP} />
            {/* Beak notch (falcon's tomial tooth) */}
            <path
              d="M 232 2 L 238 4 L 232 5 Z"
              fill={SKY_TOP}
            />
            {/* Eye ring + eye */}
            <circle cx={198} cy={-10} r={5} fill={CERE} />
            <circle cx={198} cy={-10} r={3} fill={SKY_TOP} />
            <circle cx={199} cy={-11} r={1} fill={CREAM} />

            {/* Talons hint tucked against belly */}
            <path
              d="M -20 32 Q -8 40, 6 34"
              stroke={CERE}
              strokeWidth={1.6}
              fill="none"
              opacity={0.85}
            />
            <path
              d="M 20 30 Q 30 38, 44 32"
              stroke={CERE}
              strokeWidth={1.6}
              fill="none"
              opacity={0.85}
            />

            {/* Speed lines hugging the body */}
            <g>
              <path
                d="M -60 -36 Q -160 -42 -240 -34"
                stroke={CREAM}
                strokeOpacity={0.32}
                strokeWidth={1}
                fill="none"
              />
              <path
                d="M -40 36 Q -160 42 -260 34"
                stroke={CREAM}
                strokeOpacity={0.26}
                strokeWidth={1}
                fill="none"
              />
            </g>
          </g>
        </g>

        {/* Altimeter tape — TOP-LEFT only, keeping mid/bottom-left clear for callouts */}
        {(() => {
          const altTop = SKY.y + 90;
          const altBot = SKY.y + 380;
          const altPointerY = SKY.y + 240;
          return (
            <g opacity={hudReveal}>
              <line
                x1={SKY.x + 66}
                y1={altTop}
                x2={SKY.x + 66}
                y2={altBot}
                stroke={GRID}
                strokeWidth={1}
              />
              {Array.from({ length: tickWindow * 2 + 1 }, (_, i) => {
                const rawIndex = i - tickWindow;
                const offset =
                  ((altOffset % tickSpacing) + tickSpacing) % tickSpacing;
                const y = altPointerY + rawIndex * tickSpacing + offset;
                if (y < altTop || y > altBot) return null;
                const altValue =
                  8500 -
                  Math.round((rawIndex * 100 + altOffset) * 10) / 10;
                const isMajor = i % 2 === 0;
                return (
                  <g key={`alt-${i}`}>
                    <line
                      x1={SKY.x + 60}
                      y1={y}
                      x2={SKY.x + (isMajor ? 82 : 72)}
                      y2={y}
                      stroke={isMajor ? CREAM : GRAY}
                      strokeWidth={isMajor ? 1.4 : 1}
                      opacity={isMajor ? 0.85 : 0.55}
                    />
                    {isMajor && (
                      <text
                        x={SKY.x + 90}
                        y={y + 3}
                        fill={CREAM_DIM}
                        fontFamily={inter}
                        fontSize={11}
                        letterSpacing={1.6}
                        fontWeight={500}
                      >
                        {Math.max(0, altValue).toFixed(0)}
                      </text>
                    )}
                  </g>
                );
              })}
              <g>
                <polygon
                  points={`${SKY.x + 50},${altPointerY - 6} ${SKY.x + 60},${altPointerY} ${SKY.x + 50},${altPointerY + 6}`}
                  fill={CERE}
                />
                <line
                  x1={SKY.x + 40}
                  y1={altPointerY}
                  x2={SKY.x + 60}
                  y2={altPointerY}
                  stroke={CERE}
                  strokeWidth={1.6}
                />
              </g>
              <text
                x={SKY.x + 44}
                y={SKY.y + 74}
                fill={CREAM_DIM}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3}
                fontWeight={600}
              >
                ALT · FT
              </text>
            </g>
          );
        })()}

        {/* Airspeed dial (bottom-right) */}
        <g opacity={hudReveal}>
          {/* Outer ring */}
          <circle
            cx={DIAL_CX}
            cy={DIAL_CY}
            r={DIAL_R}
            fill="none"
            stroke={GRID}
            strokeWidth={1.2}
          />
          <circle
            cx={DIAL_CX}
            cy={DIAL_CY}
            r={DIAL_R - 10}
            fill="none"
            stroke={GRID}
            strokeWidth={1}
            strokeDasharray="1 5"
            opacity={0.55}
          />
          {/* Ticks around dial */}
          {Array.from({ length: 27 }, (_, i) => {
            const frac = i / 26;
            const angle = DIAL_START + (DIAL_END - DIAL_START) * frac;
            const rad = ((angle - 90) * Math.PI) / 180;
            const isMajor = i % 2 === 0;
            const inner = DIAL_R - (isMajor ? 14 : 8);
            const outer = DIAL_R - 2;
            const x1 = DIAL_CX + Math.cos(rad) * inner;
            const y1 = DIAL_CY + Math.sin(rad) * inner;
            const x2 = DIAL_CX + Math.cos(rad) * outer;
            const y2 = DIAL_CY + Math.sin(rad) * outer;
            const value = Math.round(frac * SPEED_MAX);
            const showLabel = isMajor && value % 100 === 0;
            const labelR = DIAL_R - 30;
            const lx = DIAL_CX + Math.cos(rad) * labelR;
            const ly = DIAL_CY + Math.sin(rad) * labelR;
            const danger = value >= 320;
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={danger ? AUBURN : isMajor ? CREAM : GRAY}
                  strokeWidth={isMajor ? 1.6 : 1}
                  opacity={isMajor ? 0.9 : 0.55}
                />
                {showLabel && (
                  <text
                    x={lx}
                    y={ly + 4}
                    textAnchor="middle"
                    fill={danger ? AUBURN : CREAM_DIM}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={1.4}
                    fontWeight={600}
                  >
                    {value}
                  </text>
                )}
              </g>
            );
          })}
          {/* Center hub */}
          <circle cx={DIAL_CX} cy={DIAL_CY} r={7} fill={CERE} />
          <circle cx={DIAL_CX} cy={DIAL_CY} r={3} fill={SKY_TOP} />
          {/* Needle */}
          <line
            x1={DIAL_CX}
            y1={DIAL_CY}
            x2={needleX}
            y2={needleY}
            stroke={CERE}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          {/* Value readout */}
          <text
            x={DIAL_CX}
            y={DIAL_CY + 44}
            textAnchor="middle"
            fill={CREAM}
            fontFamily={inter}
            fontSize={30}
            fontWeight={600}
            letterSpacing={-0.4}
          >
            {Math.round(currentSpeed)}
          </text>
          <text
            x={DIAL_CX}
            y={DIAL_CY + 62}
            textAnchor="middle"
            fill={CREAM_DIM}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.2}
            fontWeight={600}
          >
            KM · H
          </text>
          <text
            x={DIAL_CX}
            y={DIAL_CY - DIAL_R - 16}
            textAnchor="middle"
            fill={CREAM_DIM}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.2}
            fontWeight={600}
          >
            AIRSPEED
          </text>
        </g>

        {/* Callouts — anchors are the actual post-rotation head/beak coords.
             Both callouts extend to the LEFT rail: #01 sits in the middle-left
             gap (below altimeter tape), #02 sits in the lower-left. */}
        <g opacity={calloutReveal}>
          {(() => {
            const railX = SKY.x + 140;
            const midY1 = SKY.y + 470;
            const midY2 = SKY.y + 600;
            return (
              <>
                {/* Callout 1: head → mid-left rail */}
                <g stroke={CERE} strokeWidth={1.2} fill="none">
                  <line
                    x1={headX - 6}
                    y1={headY - 4}
                    x2={headX - 60}
                    y2={midY1}
                  />
                  <line x1={headX - 60} y1={midY1} x2={railX} y2={midY1} />
                  <circle
                    cx={headX - 6}
                    cy={headY - 4}
                    r={3}
                    fill={CERE}
                    stroke="none"
                  />
                </g>
                <text
                  x={railX}
                  y={midY1 - 12}
                  fill={CERE}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing={3.2}
                >
                  01 · NICTITATING MEMBRANE
                </text>
                <text
                  x={railX}
                  y={midY1 + 14}
                  fill={CREAM_DIM}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={400}
                  letterSpacing={0.6}
                >
                  Translucent third eyelid sweeps the cornea mid-stoop.
                </text>

                {/* Callout 2: beak → lower-left rail */}
                <g stroke={CERE} strokeWidth={1.2} fill="none">
                  <line
                    x1={beakX + 2}
                    y1={beakY + 8}
                    x2={beakX - 30}
                    y2={midY2}
                  />
                  <line x1={beakX - 30} y1={midY2} x2={railX} y2={midY2} />
                  <circle
                    cx={beakX + 2}
                    cy={beakY + 8}
                    r={3}
                    fill={CERE}
                    stroke="none"
                  />
                </g>
                <text
                  x={railX}
                  y={midY2 - 12}
                  fill={CERE}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing={3.2}
                >
                  02 · NASAL TUBERCLE
                </text>
                <text
                  x={railX}
                  y={midY2 + 14}
                  fill={CREAM_DIM}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={400}
                  letterSpacing={0.6}
                >
                  Bony spike inside each nostril —
                </text>
                <text
                  x={railX}
                  y={midY2 + 32}
                  fill={CREAM_DIM}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={400}
                  letterSpacing={0.6}
                >
                  an inlet cone for high-Mach air.
                </text>
              </>
            );
          })()}
        </g>

        {/* Caption strip below sky panel */}
        <g
          transform={`translate(${SKY.x}, ${SKY.y + SKY.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · FALCO PEREGRINUS · TUCKED-WING STOOP</text>
          <text x={SKY.w} textAnchor="end" fill={CERE} opacity={0.9}>
            89 M/S · MACH 0.32
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 950,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: CERE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>
            Aerospace Test Pilot
          </span>
        </div>

        <div
          style={{
            color: CREAM,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The falcon
          <br />
          at Mach 0.32.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C7C1B2",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Stereo-videography clocked wild peregrine falcons at{" "}
          <span style={{ color: CERE, fontWeight: 600 }}>89 m/s</span> in a
          hunting stoop — a translucent third eyelid sweeping the cornea while
          bony tubercles inside each nostril throttle the incoming air, the
          anatomical inlet spike of a supersonic jet.
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
        <span>Ponitz et al. &middot; PLOS ONE 9(2): e86506, 2014</span>
        <span>
          <span style={{ color: CERE }}>&#9650;</span> Stoop &middot; 320 KM/H
        </span>
      </div>
    </AbsoluteFill>
  );
};
