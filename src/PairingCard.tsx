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

// Palette — taken from the concept's visual brief
const INK = "#050810";
const STRIP_BG = "#131F30";
const PANEL_BG = "#070C16";
const CREAM = "#F0E4CE";
const CLAW = "#D64A2E";
const CLAW_HIGHLIGHT = "#F28A5F";
const CLAW_SHADOW = "#7A2112";
const FLASH = "#7BC6FF";
const FLASH_HOT = "#F2F9FF";
const GRAY = "#8E96A3";
const GRAY_DIM = "#3D4552";

const clamp = (v: number): number => Math.max(0, Math.min(1, v));

// ──────────────────────────────────────────────────────────────────────────
//  CLAW GEOMETRY
//  Design the claw in its own coordinate space with pivot at (0,0).
//  Scale and translate to position within a panel.
//  Length L sets the horizontal extent (tip is at (-L, ~0)).
// ──────────────────────────────────────────────────────────────────────────

const L = 400; // design length

// Upper jaw (dactyl): tapering wedge with a plunger lobe hanging down
// around 45%–55% along its length.
const UPPER_PTS: [number, number][] = [
  [0, -34], // top-base at pivot
  [-0.14 * L, -58], // shoulder
  [-0.42 * L, -66], // dorsal ridge
  [-0.72 * L, -56], // pre-tip upper
  [-0.92 * L, -32], // tip upper
  [-1.0 * L, -8], // tip point
  [-0.93 * L, 10], // tip underside
  [-0.78 * L, 18], // underside near tip
  [-0.60 * L, 22], // pre-plunger
  [-0.56 * L, 24], // plunger upper-left
  [-0.54 * L, 58], // plunger lower-left
  [-0.46 * L, 68], // plunger tip
  [-0.38 * L, 58], // plunger lower-right
  [-0.36 * L, 24], // plunger upper-right
  [-0.22 * L, 20], // underside
  [-0.08 * L, 26], // base underside
  [0, 34], // bottom-base at pivot
];

// Lower jaw (propodus): heavier wedge with a socket (a notched recess in the
// upper edge, between ~40% and ~55%).
const LOWER_PTS: [number, number][] = [
  [0, 34], // top-base at pivot (shared with upper's bottom-base)
  [-0.12 * L, 60], // shoulder down
  [-0.44 * L, 72], // ventral bulge
  [-0.78 * L, 60], // taper toward tip
  [-0.93 * L, 32], // tip lower
  [-1.0 * L, 10], // tip point (slightly offset from upper)
  [-0.94 * L, -8], // tip upper
  [-0.78 * L, -16], // approaching mouth
  [-0.58 * L, -20], // mouth edge (upper plateau)
  [-0.56 * L, -4], // socket upper-left
  [-0.52 * L, 12], // socket bottom-left
  [-0.42 * L, 14], // socket bottom
  [-0.34 * L, 12], // socket bottom-right
  [-0.30 * L, -4], // socket upper-right
  [-0.28 * L, -20], // mouth edge back
  [-0.12 * L, -22], // shoulder up
  [0, -34], // top-base at pivot
];

const SOCKET_POS: [number, number] = [-0.42 * L, 4]; // centre of socket cavity

const ptsToPath = (
  pts: [number, number][],
  transform?: (p: [number, number]) => [number, number],
): string => {
  const a = transform ? pts.map(transform) : pts;
  return (
    "M " +
    a
      .map(([x, y], i) => (i === 0 ? `${x} ${y}` : `L ${x} ${y}`))
      .join(" ") +
    " Z"
  );
};

// Rotate point by +angle (radians) about origin in SVG screen space
// (positive Y = down, positive angle = clockwise in screen).
// We want upper jaw to open UPWARD when openAngle > 0, so we rotate by
// -openAngle (counter-clockwise in screen).
const rotateCCW = (angle: number) => (p: [number, number]): [number, number] => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
};

// ──────────────────────────────────────────────────────────────────────────
//  PANEL
// ──────────────────────────────────────────────────────────────────────────

const Panel: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  stage: 0 | 1 | 2 | 3;
  active: number;
  revealed: number;
  flashPower: number;
}> = ({ x, y, w, h, stage, active, revealed, flashPower }) => {
  const mx = 16;
  const my = 16;
  const iw = w - mx * 2;
  const ih = h - my * 2;

  // Claw sits in the upper-middle; pivot at right side of panel, tip at left.
  // Keep the claw compact enough to leave open water on its left for the jet
  // and cavitation bubble.
  const scale = Math.min((iw * 0.58) / L, (ih * 0.36) / 160);
  const pivotX = mx + iw * 0.94;
  const pivotY = my + ih * 0.42;
  // Jet/bubble origin — just past the claw tip, in open water.
  const tipX = pivotX - L * scale;
  const tipY = pivotY;
  const jetX = tipX - 18 * scale; // small gap between jaws and the jet root
  const jetY = tipY;
  const bubbleX = tipX - 70 * scale; // where the cavity sits
  const bubbleY = tipY;
  // For legacy references in flash + arc anchor, retain socket coords.
  const socketX = pivotX + SOCKET_POS[0] * scale;
  const socketY = pivotY + SOCKET_POS[1] * scale;

  // Stage-specific
  const openAnglesDeg = [55, 20, 0, 0];
  const openAngle = (openAnglesDeg[stage] * Math.PI) / 180;

  const labels = ["LOADED", "RELEASE", "CAVITATION", "COLLAPSE"] as const;
  const captions = [
    "Dactyl cocked 55°",
    "Water jet · 25 m/s",
    "Vapor cavity · Δp < −100 kPa",
    "Flash · ~5,000 K · 218 dB",
  ] as const;
  const timecodes = [
    "T + 0 µs",
    "T + 500 µs",
    "T + 800 µs",
    "T + 1.5 ms",
  ] as const;

  // Transform upper jaw points: scale, then rotate by -openAngle about origin,
  // then translate to pivot.
  const upperTransform = (p: [number, number]): [number, number] => {
    const scaled: [number, number] = [p[0] * scale, p[1] * scale];
    const rotated = rotateCCW(openAngle)(scaled);
    return [pivotX + rotated[0], pivotY + rotated[1]];
  };
  const lowerTransform = (p: [number, number]): [number, number] => {
    return [pivotX + p[0] * scale, pivotY + p[1] * scale];
  };

  const revealW = w * revealed;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        <clipPath id={`reveal-${stage}`}>
          <rect x={0} y={0} width={revealW} height={h} />
        </clipPath>
        <radialGradient id={`flash-${stage}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={FLASH_HOT} stopOpacity={1} />
          <stop offset="18%" stopColor={FLASH_HOT} stopOpacity={0.9} />
          <stop offset="45%" stopColor={FLASH} stopOpacity={0.75} />
          <stop offset="100%" stopColor={FLASH} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`bubble-${stage}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.1} />
          <stop offset="70%" stopColor={FLASH} stopOpacity={0.14} />
          <stop offset="100%" stopColor={FLASH} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`upper-${stage}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CLAW_HIGHLIGHT} />
          <stop offset="100%" stopColor={CLAW} />
        </linearGradient>
        <linearGradient id={`lower-${stage}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CLAW} />
          <stop offset="100%" stopColor={CLAW_SHADOW} />
        </linearGradient>
      </defs>

      {/* Panel back — darker than strip */}
      <rect x={0} y={0} width={w} height={h} fill={PANEL_BG} />

      {/* Panel border — highlighted when active */}
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        fill="none"
        stroke={active > 0.5 ? CLAW : GRAY_DIM}
        strokeOpacity={interpolate(active, [0, 1], [0.5, 1])}
        strokeWidth={interpolate(active, [0, 1], [1, 1.6])}
      />

      <g clipPath={`url(#reveal-${stage})`}>
        {/* Header: frame number + timecode */}
        <g fontFamily={inter} fontSize={10} fontWeight={600} letterSpacing={3}>
          <text x={mx} y={my + 4} fill={GRAY}>
            {`0${stage + 1}`}
            <tspan fill={GRAY_DIM}>{" / 04"}</tspan>
          </text>
          <text
            x={mx + iw}
            y={my + 4}
            textAnchor="end"
            fill={active > 0.5 ? CLAW : GRAY_DIM}
            opacity={active > 0.5 ? 1 : 0.8}
          >
            {timecodes[stage]}
          </text>
        </g>

        {/* Thin separators under header */}
        <line
          x1={mx}
          y1={my + 14}
          x2={mx + iw}
          y2={my + 14}
          stroke={GRAY_DIM}
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />

        {/* Faint grid inside the panel */}
        <g stroke={GRAY_DIM} strokeOpacity={0.18} strokeWidth={0.5}>
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`gx-${i}`}
              x1={mx}
              y1={my + 30 + ((ih - 70) * (i + 1)) / 6}
              x2={mx + iw}
              y2={my + 30 + ((ih - 70) * (i + 1)) / 6}
            />
          ))}
          {Array.from({ length: 3 }).map((_, i) => (
            <line
              key={`gy-${i}`}
              x1={mx + (iw * (i + 1)) / 4}
              y1={my + 24}
              x2={mx + (iw * (i + 1)) / 4}
              y2={my + ih - 48}
            />
          ))}
        </g>

        {/* Motion-blur ghost on stage 1 (prior angles) */}
        {stage === 1 && (
          <g>
            {[0.75, 0.5, 0.25].map((f, i) => {
              const a = ((openAnglesDeg[0] * f) * Math.PI) / 180;
              const transform = (p: [number, number]): [number, number] => {
                const scaled: [number, number] = [p[0] * scale, p[1] * scale];
                const rotated = rotateCCW(a)(scaled);
                return [pivotX + rotated[0], pivotY + rotated[1]];
              };
              return (
                <path
                  key={`blur-${i}`}
                  d={ptsToPath(UPPER_PTS, transform)}
                  fill={CLAW}
                  opacity={0.08 - i * 0.015}
                />
              );
            })}
          </g>
        )}

        {/* Cavitation bubble — stage 2, hero of this panel */}
        {stage === 2 && (() => {
          const BR = 86 * scale; // bubble radius
          return (
            <g>
              {/* Outer glow halo */}
              <circle
                cx={bubbleX}
                cy={bubbleY}
                r={BR * 1.55}
                fill={FLASH}
                opacity={0.08}
              />
              <circle
                cx={bubbleX}
                cy={bubbleY}
                r={BR * 1.2}
                fill={FLASH}
                opacity={0.08}
              />
              {/* Bubble body */}
              <circle
                cx={bubbleX}
                cy={bubbleY}
                r={BR}
                fill={`url(#bubble-${stage})`}
              />
              <circle
                cx={bubbleX}
                cy={bubbleY}
                r={BR}
                fill="none"
                stroke={FLASH}
                strokeWidth={2}
                strokeOpacity={0.95}
              />
              {/* Inner rim highlight */}
              <circle
                cx={bubbleX}
                cy={bubbleY}
                r={BR * 0.88}
                fill="none"
                stroke={FLASH_HOT}
                strokeWidth={0.9}
                strokeOpacity={0.55}
              />
              {/* Specular highlight */}
              <ellipse
                cx={bubbleX - BR * 0.5}
                cy={bubbleY - BR * 0.58}
                rx={BR * 0.28}
                ry={BR * 0.08}
                fill={FLASH_HOT}
                opacity={0.9}
                transform={`rotate(-30 ${bubbleX - BR * 0.5} ${
                  bubbleY - BR * 0.58
                })`}
              />
              {/* Dimension arrow and label — ⌀ callout */}
              <g
                stroke={FLASH}
                strokeOpacity={0.75}
                strokeWidth={0.9}
                fill="none"
              >
                <line
                  x1={bubbleX - BR}
                  y1={bubbleY + BR + 14}
                  x2={bubbleX + BR}
                  y2={bubbleY + BR + 14}
                />
                <line
                  x1={bubbleX - BR}
                  y1={bubbleY + BR + 10}
                  x2={bubbleX - BR}
                  y2={bubbleY + BR + 18}
                />
                <line
                  x1={bubbleX + BR}
                  y1={bubbleY + BR + 10}
                  x2={bubbleX + BR}
                  y2={bubbleY + BR + 18}
                />
              </g>
              <text
                x={bubbleX}
                y={bubbleY + BR + 32}
                textAnchor="middle"
                fontFamily={inter}
                fontSize={10}
                fontWeight={600}
                fill={FLASH}
                letterSpacing={2}
              >
                CAVITY · 3.5 MM
              </text>
            </g>
          );
        })()}

        {/* Flash halo — stage 3 */}
        {stage === 3 && flashPower > 0.02 && (
          <>
            <circle
              cx={bubbleX}
              cy={bubbleY}
              r={ih * 0.46 * flashPower}
              fill={`url(#flash-${stage})`}
              opacity={flashPower * 0.98}
            />
            <g
              stroke={FLASH_HOT}
              strokeWidth={1.4}
              opacity={flashPower * 0.75}
              strokeLinecap="round"
            >
              {Array.from({ length: 16 }).map((_, i) => {
                const a = (i / 16) * Math.PI * 2;
                const r1 = ih * 0.10;
                const r2 = ih * 0.44 * (0.5 + 0.5 * flashPower);
                return (
                  <line
                    key={`ray-${i}`}
                    x1={bubbleX + Math.cos(a) * r1}
                    y1={bubbleY + Math.sin(a) * r1}
                    x2={bubbleX + Math.cos(a) * r2}
                    y2={bubbleY + Math.sin(a) * r2}
                  />
                );
              })}
            </g>
            {/* Bright core */}
            <circle
              cx={bubbleX}
              cy={bubbleY}
              r={16 * flashPower}
              fill={FLASH_HOT}
              opacity={0.9}
            />
            <circle
              cx={bubbleX}
              cy={bubbleY}
              r={6 * flashPower}
              fill="#FFFFFF"
            />
          </>
        )}

        {/* Water-jet arrow — stage 1 only */}
        {stage === 1 && (
          <g strokeLinecap="round" fill="none">
            {/* Multi-line arrow showing jet exiting the claw tip */}
            {[-1, 0, 1].map((i) => (
              <path
                key={`jet-${i}`}
                d={`M ${jetX} ${jetY + i * 6 * scale}
                    L ${jetX - 95 * scale} ${jetY + i * 6 * scale}`}
                stroke={FLASH}
                strokeOpacity={i === 0 ? 0.9 : 0.55}
                strokeWidth={i === 0 ? 1.6 : 1}
                strokeDasharray={i === 0 ? "10 5" : "6 5"}
              />
            ))}
            {/* Arrowhead */}
            <polyline
              points={`${jetX - 86 * scale},${jetY - 10 * scale} ${
                jetX - 95 * scale
              },${jetY} ${jetX - 86 * scale},${jetY + 10 * scale}`}
              stroke={FLASH}
              strokeOpacity={0.95}
              strokeWidth={1.6}
            />
            {/* Speed label */}
            <text
              x={jetX - 48 * scale}
              y={jetY - 16 * scale}
              fill={FLASH}
              fontFamily={inter}
              fontSize={10.5}
              fontWeight={600}
              letterSpacing={1.5}
              textAnchor="middle"
            >
              25 m/s
            </text>
          </g>
        )}

        {/* ── CLAW ── render order: lower jaw underlay, upper jaw, pivot ── */}
        <path
          d={ptsToPath(LOWER_PTS, lowerTransform)}
          fill={`url(#lower-${stage})`}
          stroke={CLAW_SHADOW}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />

        {/* Dark socket cavity accent */}
        <ellipse
          cx={socketX}
          cy={socketY}
          rx={10 * scale}
          ry={10 * scale}
          fill={INK}
          opacity={0.55}
        />

        <path
          d={ptsToPath(UPPER_PTS, upperTransform)}
          fill={`url(#upper-${stage})`}
          stroke={CLAW_SHADOW}
          strokeOpacity={0.85}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />

        {/* Pivot pin */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={5}
          fill={CREAM}
          stroke={CLAW_SHADOW}
          strokeWidth={1}
        />
        <circle cx={pivotX} cy={pivotY} r={1.6} fill={INK} />

        {/* Panel-1 anatomical labels + angle arc */}
        {stage === 0 && (
          <g
            fontFamily={inter}
            fontSize={9}
            letterSpacing={2.5}
            fill={CREAM}
            opacity={0.9}
            fontWeight={500}
          >
            {/* Dactyl label — leader points at top of upper jaw */}
            <line
              x1={mx + 6}
              y1={my + 60}
              x2={pivotX - 220 * scale}
              y2={pivotY - 55 * scale}
              stroke={CREAM}
              strokeOpacity={0.5}
              strokeWidth={0.8}
            />
            <text x={mx + 6} y={my + 50}>
              DACTYL
            </text>
            {/* Propodus label — leader points at ventral bulge */}
            <line
              x1={mx + 6}
              y1={my + ih - 100}
              x2={pivotX - 230 * scale}
              y2={pivotY + 70 * scale}
              stroke={CREAM}
              strokeOpacity={0.5}
              strokeWidth={0.8}
            />
            <text x={mx + 6} y={my + ih - 110}>
              PROPODUS
            </text>
            {/* Angle arc: from the closed position to the open position of
                the upper jaw's leading ridge. Start angle is at the +X axis
                mirrored (jaw points along -X), end is -55° rotated (CCW). */}
            {(() => {
              const rArc = 130 * scale;
              const sweep = (55 * Math.PI) / 180;
              const startX = pivotX - rArc;
              const startY = pivotY;
              const endX = pivotX - Math.cos(sweep) * rArc;
              const endY = pivotY - Math.sin(sweep) * rArc;
              return (
                <g>
                  {/* Reference line (closed position) */}
                  <line
                    x1={pivotX}
                    y1={pivotY}
                    x2={startX}
                    y2={startY}
                    stroke={FLASH}
                    strokeOpacity={0.35}
                    strokeWidth={0.8}
                    strokeDasharray="3 4"
                  />
                  {/* Open-position reference */}
                  <line
                    x1={pivotX}
                    y1={pivotY}
                    x2={endX}
                    y2={endY}
                    stroke={FLASH}
                    strokeOpacity={0.35}
                    strokeWidth={0.8}
                    strokeDasharray="3 4"
                  />
                  {/* Arc */}
                  <path
                    d={`M ${startX} ${startY} A ${rArc} ${rArc} 0 0 1 ${endX} ${endY}`}
                    fill="none"
                    stroke={FLASH}
                    strokeOpacity={0.9}
                    strokeWidth={1.2}
                  />
                  {/* Angle label — sat just outside the arc on the upper-left */}
                  <text
                    x={pivotX - Math.cos(sweep / 2) * (rArc + 14)}
                    y={pivotY - Math.sin(sweep / 2) * (rArc + 14) + 4}
                    fill={FLASH}
                    fontSize={11}
                    textAnchor="end"
                    letterSpacing={1}
                    fontWeight={600}
                  >
                    55°
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Scale bar — bottom-right of panel art area */}
        <g
          transform={`translate(${mx + iw - 70}, ${my + ih - 56})`}
          stroke={GRAY}
          fill={GRAY}
        >
          <line x1={0} y1={0} x2={50} y2={0} strokeWidth={1} />
          <line x1={0} y1={-3} x2={0} y2={3} strokeWidth={1} />
          <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1} />
          <text
            x={25}
            y={-6}
            textAnchor="middle"
            fontFamily={inter}
            fontSize={9}
            letterSpacing={2}
            stroke="none"
          >
            5 MM
          </text>
        </g>

        {/* Panel label strip — bottom */}
        <g>
          <line
            x1={mx}
            y1={my + ih - 38}
            x2={mx + iw}
            y2={my + ih - 38}
            stroke={GRAY_DIM}
            strokeWidth={0.8}
          />
          <text
            x={mx}
            y={my + ih - 22}
            fill={active > 0.5 ? CLAW : CREAM}
            opacity={interpolate(active, [0, 1], [0.6, 1])}
            fontFamily={inter}
            fontSize={11.5}
            fontWeight={600}
            letterSpacing={4}
          >
            {labels[stage]}
          </text>
          <text
            x={mx}
            y={my + ih - 6}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10.5}
            fontWeight={400}
          >
            {captions[stage]}
          </text>
        </g>
      </g>
    </g>
  );
};

// ──────────────────────────────────────────────────────────────────────────

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Strip & panel layout
  const STRIP = { x: 20, y: 190, w: 1040, h: 580 };
  const SPROCKET_H = 28;
  const PANEL_AREA = {
    x: STRIP.x,
    y: STRIP.y + SPROCKET_H,
    w: STRIP.w,
    h: STRIP.h - SPROCKET_H * 2,
  };
  const GUTTER = 8;
  const PANEL_W = (PANEL_AREA.w - GUTTER * 3) / 4;
  const PANEL_H = PANEL_AREA.h;

  const stageDuration = fps * 0.95;
  const panelReveal = (i: number): number => {
    const start = fps * 0.25 + i * (fps * 0.55);
    const end = start + fps * 0.55;
    return clamp((frame - start) / (end - start));
  };
  const panelActive = (i: number): number => {
    const center = fps * 0.75 + i * stageDuration;
    const d = Math.abs(frame - center);
    const activeWidth = stageDuration * 0.65;
    return clamp(1 - d / activeWidth);
  };

  // Flash — peaks near end of panel 4 active window
  const flashPeak = fps * 0.75 + 3 * stageDuration + fps * 0.15;
  const flashAttack = fps * 0.08;
  const flashDecay = fps * 1.3;
  const flashPower = (() => {
    if (frame < flashPeak - flashAttack) {
      return clamp(
        (frame - (flashPeak - flashAttack - fps * 0.35)) / (fps * 0.35),
      ) * 0.55;
    }
    if (frame < flashPeak) {
      return 0.55 + 0.45 * clamp(1 - (flashPeak - frame) / flashAttack);
    }
    const decay = clamp(1 - (frame - flashPeak) / flashDecay);
    return 0.35 + 0.6 * decay;
  })();

  // Full-composition flash wash
  const washPower = (() => {
    if (frame < flashPeak - flashAttack || frame > flashPeak + fps * 0.6) return 0;
    if (frame < flashPeak) {
      return 0.4 * clamp(1 - (flashPeak - frame) / flashAttack);
    }
    return 0.4 * clamp(1 - (frame - flashPeak) / (fps * 0.5));
  })();

  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const metaOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Darkroom vignette */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="room-vig" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#0A1424" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>
          <linearGradient id="strip-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#192538" />
            <stop offset="50%" stopColor="#141E2F" />
            <stop offset="100%" stopColor="#192538" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={1080} height={1350} fill="url(#room-vig)" />
      </svg>

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
          opacity: metaOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: CLAW }}>2026 · 11 · 05</span>
      </div>

      {/* Thin rule under meta */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 96,
          height: 1,
          backgroundColor: GRAY_DIM,
          opacity: 0.6 * metaOpacity,
        }}
      />

      {/* Section label */}
      <div
        style={{
          position: "absolute",
          top: 118,
          left: 80,
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3.5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: 0.85 * metaOpacity,
        }}
      >
        Plate I <span style={{ color: GRAY_DIM }}>/</span>{" "}
        <span style={{ color: CREAM }}>
          Sequential high-speed imaging · Alpheus heterochaelis major chela
        </span>
      </div>

      {/* Film strip + panels */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Strip body */}
        <rect
          x={STRIP.x}
          y={STRIP.y}
          width={STRIP.w}
          height={STRIP.h}
          fill="url(#strip-gloss)"
        />
        {/* Sprocket bands */}
        <rect
          x={STRIP.x}
          y={STRIP.y}
          width={STRIP.w}
          height={SPROCKET_H}
          fill={INK}
          opacity={0.6}
        />
        <rect
          x={STRIP.x}
          y={STRIP.y + STRIP.h - SPROCKET_H}
          width={STRIP.w}
          height={SPROCKET_H}
          fill={INK}
          opacity={0.6}
        />
        {Array.from({ length: 20 }).map((_, i) => {
          const sx = STRIP.x + 24 + i * ((STRIP.w - 48) / 19);
          return (
            <g key={`sp-${i}`}>
              <rect
                x={sx - 7}
                y={STRIP.y + SPROCKET_H / 2 - 5}
                width={14}
                height={10}
                rx={1.5}
                fill={STRIP_BG}
              />
              <rect
                x={sx - 7}
                y={STRIP.y + STRIP.h - SPROCKET_H / 2 - 5}
                width={14}
                height={10}
                rx={1.5}
                fill={STRIP_BG}
              />
            </g>
          );
        })}

        {/* Film edge markings */}
        <g fontFamily={inter} fontSize={10} letterSpacing={3} fontWeight={600}>
          <text x={STRIP.x + 14} y={STRIP.y - 10} fill={CLAW}>
            KODAK TMAX · ALPHEUS · ROLL 01
          </text>
          <text
            x={STRIP.x + STRIP.w - 14}
            y={STRIP.y - 10}
            textAnchor="end"
            fill={GRAY}
          >
            SHUTTER 1 / 500,000 S
          </text>
          <text x={STRIP.x + 14} y={STRIP.y + STRIP.h + 22} fill={GRAY}>
            FIG. 1 · SINGLE SNAP · 4 EXPOSURES
          </text>
          <text
            x={STRIP.x + STRIP.w - 14}
            y={STRIP.y + STRIP.h + 22}
            textAnchor="end"
            fill={CLAW}
            opacity={0.9}
          >
            SONOLUMINESCENCE RECORDED
          </text>
        </g>

        {/* Four panels */}
        {[0, 1, 2, 3].map((i) => (
          <Panel
            key={i}
            x={PANEL_AREA.x + i * (PANEL_W + GUTTER)}
            y={PANEL_AREA.y}
            w={PANEL_W}
            h={PANEL_H}
            stage={i as 0 | 1 | 2 | 3}
            active={panelActive(i)}
            revealed={panelReveal(i)}
            flashPower={i === 3 ? flashPower : 0}
          />
        ))}

        {/* Inter-panel arrows along the sprocket channel */}
        {[0, 1, 2].map((i) => {
          const x = PANEL_AREA.x + (i + 1) * PANEL_W + i * GUTTER + GUTTER / 2;
          const y = PANEL_AREA.y + PANEL_H / 2;
          const op = clamp((panelReveal(i + 1) - 0.3) * 3);
          return (
            <g key={`arr-${i}`} opacity={op * 0.75}>
              <line
                x1={x - 4}
                y1={y}
                x2={x + 4}
                y2={y}
                stroke={CLAW}
                strokeWidth={1.2}
              />
              <polygon
                points={`${x + 4},${y - 3} ${x + 8},${y} ${x + 4},${y + 3}`}
                fill={CLAW}
              />
            </g>
          );
        })}
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 830,
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
            color: CLAW,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Flash Photographer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          A shrimp
          <br />
          with a flashbulb.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Closing its asymmetric claw at ~25 m/s, the{" "}
          <span style={{ color: FLASH, fontWeight: 600 }}>snapping shrimp</span>{" "}
          forms a cavitation bubble whose collapse emits a picosecond flash of
          sonoluminescence at an inferred{" "}
          <span style={{ color: CLAW, fontWeight: 600 }}>~5,000 K</span>.
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
        <span>Lohse, Schmitz & Versluis · Nature 413 (2001) 477</span>
        <span>
          <span style={{ color: FLASH }}>●</span> 1 snap = 1 flashbulb
        </span>
      </div>

      {/* Full-frame flash wash */}
      <AbsoluteFill
        style={{
          backgroundColor: FLASH,
          opacity: washPower,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
