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
const SKY_DEEP = "#0F1520";
const SKY_MID = "#161F30";
const SLATE = "#334760";
const SLATE_LIGHT = "#4B6180";
const BUFF = "#E9CDA6";
const ORANGE = "#D96A1E";
const CREAM = "#F0EBE1";
const CREAM_DIM = "#B7B2A7";
const GRID = "#1B2233";
const GRID_MAJOR = "#233049";

// ── Falcon anatomy (side profile, local coords) ──────────────────────────
// Side view of a peregrine locked into its stoop, drawn head-right, tail-
// left, back-up. One (near) wing is visible, clamped tight and swept back
// past the body. Local origin sits at the center of the body cavity; the
// bird occupies roughly x ∈ [-210, 265], y ∈ [-70, 45].

// Compact side-profile silhouette. Head at right, tail at upper-left. The
// wing is not drawn as a separate shape — it's implied by shading and
// feather-line hints on the body — because in a hard stoop the wings clamp
// flush against the flanks and effectively vanish into the body outline.
const FALCON_BODY_PATH =
  // Beak base / head crown
  "M 252 -4 " +
  "C 248 -16 240 -24 226 -30 " + // upper mandible → forehead
  "C 210 -34 190 -36 168 -34 " + // crown → nape
  "C 138 -32 106 -28 76 -22 " + // shoulder bulge
  "C 46 -16 18 -12 -10 -10 " + // upper back tapering
  "C -50 -6 -90 -4 -128 -2 " + // tail top
  "L -160 0 " + // tail tip upper
  "L -156 6 " + // tail tip lower
  "C -110 10 -60 14 -10 18 " + // tail bottom back to belly
  "C 40 22 90 26 130 26 " + // belly bulge
  "C 168 26 198 22 218 14 " + // breast curve
  "C 232 8 242 2 250 -2 " + // chin
  "Z";

// Folded-wing crescent overlaid on the body — a darker slate patch that
// mimics the barred coverts. Kept subtle and confined to the upper half.
const FALCON_WING_PATH =
  "M 100 -22 " +
  "C 70 -18 40 -16 10 -14 " +
  "C -20 -12 -60 -10 -100 -8 " +
  "L -130 -4 " +
  "C -100 -4 -60 -6 -20 -8 " +
  "C 20 -10 60 -14 100 -18 " +
  "Z";

// A dark "hood" over the crown down to eye level, laid on top of the body.
const FALCON_HOOD_PATH =
  "M 186 -35 " +
  "C 210 -34 232 -28 246 -18 " +
  "C 250 -12 248 -4 240 -1 " +
  "C 220 -6 200 -8 184 -4 " +
  "C 174 -14 174 -26 186 -35 " +
  "Z";

// Beak — small hooked triangle projecting from the face.
const FALCON_BEAK_PATH = "M 246 -2 L 262 3 L 246 8 Z";

// Cere (fleshy base above beak).
const FALCON_CERE_PATH =
  "M 232 -6 L 250 -3 L 248 8 L 230 8 Z";

// Malar stripe — dark cheek band dropping below the eye.
const FALCON_MALAR_PATH =
  "M 216 0 L 208 22 L 220 24 L 228 2 Z";

// Cheek buff patch — light warm patch between malar and hood.
const FALCON_CHEEK_PATH =
  "M 228 -2 C 236 -4 244 0 244 6 C 240 12 232 12 226 8 Z";

// Eye and nostril (local frame).
const FALCON_EYE = { x: 218, y: -6, r: 3.4 };
const FALCON_NOSTRIL = { x: 236, y: -1 };

// Streamlines — thin flow lines wrapping past the bird. Local coords, so
// they translate/rotate with the falcon. Head is at ~x=280, tail at ~x=-230.
const STREAMLINES: {
  d: string;
  opacity: number;
  chevron: { x: number; y: number };
}[] = [
  {
    d: "M 290 -100 C 200 -96 20 -92 -260 -96",
    opacity: 0.55,
    chevron: { x: -260, y: -96 },
  },
  {
    d: "M 285 -70 C 200 -70 40 -70 -270 -74",
    opacity: 0.7,
    chevron: { x: -270, y: -74 },
  },
  {
    d: "M 292 68 C 200 72 40 74 -270 76",
    opacity: 0.7,
    chevron: { x: -270, y: 76 },
  },
  {
    d: "M 288 96 C 200 100 40 104 -260 106",
    opacity: 0.55,
    chevron: { x: -260, y: 106 },
  },
  {
    d: "M 282 124 C 200 128 40 130 -240 134",
    opacity: 0.4,
    chevron: { x: -240, y: 134 },
  },
];

const FRAME = { x: 60, y: 130, w: 960, h: 720 };

// Falcon canvas → page mapping. The falcon path is drawn in a 700×340 local
// box (roughly), centered inside the frame with a rotation.
const FALCON_CENTER = { x: FRAME.x + FRAME.w / 2, y: FRAME.y + FRAME.h / 2 - 20 };
const FALCON_ROT = 32; // degrees, diving lower-right
const FALCON_SCALE = 1.15;

// Altitude ticks (left edge inside frame).
const ALT_MARKS = [
  { y: 0.05, label: "12 KM" },
  { y: 0.2, label: "10" },
  { y: 0.35, label: "8" },
  { y: 0.5, label: "6" },
  { y: 0.65, label: "4" },
  { y: 0.8, label: "2" },
  { y: 0.95, label: "0" },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Motion timeline ────────────────────────────────────────────────
  // 0.0 s  frame enters
  // 0.2 s  falcon plunges into position (spring)
  // 0.6 s  streamlines etch in one after another
  // 1.4 s  HUD ticks + reticle fade in
  // 1.6 s  speed readout counts up 0 → 389
  // 2.4 s  callout leader draws
  // 3.0 s  title lockup springs in
  // 3.6 s  hook paragraph fades in

  const falconDrop = spring({
    frame: frame - fps * 0.15,
    fps,
    config: { damping: 22, mass: 1.1, stiffness: 90 },
  });
  const falconY = interpolate(falconDrop, [0, 1], [-260, 0]);
  const falconOpacity = interpolate(frame, [0, fps * 0.2], [0, 1], {
    extrapolateRight: "clamp",
  });

  const streamlineT = (i: number) => {
    const start = fps * (0.6 + i * 0.08);
    return interpolate(frame, [start, start + fps * 0.5], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  };

  const hudFade = interpolate(frame, [fps * 1.4, fps * 2.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const speedT = interpolate(frame, [fps * 1.6, fps * 2.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const speed = Math.round(speedT * 389);
  const mach = (speedT * 0.317).toFixed(2);

  const calloutT = interpolate(frame, [fps * 2.4, fps * 3.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const titleSpring = spring({
    frame: frame - fps * 3.0,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 3.6, fps * 4.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // ── Falcon transform composition ──────────────────────────────────
  const falconTransform = `translate(${FALCON_CENTER.x}, ${
    FALCON_CENTER.y + falconY
  }) rotate(${FALCON_ROT}) scale(${FALCON_SCALE})`;

  // Transform a local (falcon-frame) point into page-space, matching the
  // same translate+rotate+scale we apply to the falcon SVG group.
  const localToWorld = (lx: number, ly: number) => {
    const rad = (FALCON_ROT * Math.PI) / 180;
    const rx = lx * Math.cos(rad) - ly * Math.sin(rad);
    const ry = lx * Math.sin(rad) + ly * Math.cos(rad);
    return {
      x: FALCON_CENTER.x + rx * FALCON_SCALE,
      y: FALCON_CENTER.y + falconY + ry * FALCON_SCALE,
    };
  };

  const nostrilWorld = localToWorld(FALCON_NOSTRIL.x, FALCON_NOSTRIL.y);
  const headWorld = localToWorld(FALCON_EYE.x, FALCON_EYE.y);

  return (
    <AbsoluteFill style={{ backgroundColor: SKY_DEEP, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ─────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: CREAM_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: ORANGE }}>2026 · 08 · 06</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY_DEEP} />
            <stop offset="55%" stopColor={SKY_MID} />
            <stop offset="100%" stopColor="#1E2437" />
          </linearGradient>
          <linearGradient id="horizon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E2437" stopOpacity="0" />
            <stop offset="50%" stopColor={BUFF} stopOpacity="0.18" />
            <stop offset="100%" stopColor={ORANGE} stopOpacity="0.10" />
          </linearGradient>
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
              strokeWidth={0.8}
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
        </defs>

        {/* HUD frame background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky)"
        />
        {/* Warm dawn horizon glow inside frame */}
        <rect
          x={FRAME.x}
          y={FRAME.y + FRAME.h * 0.55}
          width={FRAME.w}
          height={FRAME.h * 0.45}
          fill="url(#horizon)"
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
        {/* Frame border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2A344A"
          strokeWidth={1}
        />

        {/* Corner brackets */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={ORANGE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 30} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 30} />
          </g>
        ))}

        {/* Horizon tick line inside frame */}
        <g opacity={hudFade}>
          <line
            x1={FRAME.x + 24}
            y1={FRAME.y + FRAME.h * 0.72}
            x2={FRAME.x + FRAME.w - 24}
            y2={FRAME.y + FRAME.h * 0.72}
            stroke={CREAM}
            strokeWidth={0.7}
            strokeDasharray="6 6"
            opacity={0.35}
          />
          <text
            x={FRAME.x + FRAME.w - 30}
            y={FRAME.y + FRAME.h * 0.72 - 8}
            textAnchor="end"
            fill={CREAM_DIM}
            fontFamily={inter}
            fontSize={10}
            fontWeight={500}
            letterSpacing={3}
          >
            HORIZON
          </text>
        </g>

        {/* Altitude ruler (left) */}
        <g opacity={hudFade}>
          <line
            x1={FRAME.x + 30}
            y1={FRAME.y + 40}
            x2={FRAME.x + 30}
            y2={FRAME.y + FRAME.h - 40}
            stroke={CREAM_DIM}
            strokeWidth={0.8}
          />
          {ALT_MARKS.map((m, i) => {
            const y = FRAME.y + 40 + (FRAME.h - 80) * m.y;
            const long = i % 2 === 0;
            return (
              <g key={i}>
                <line
                  x1={FRAME.x + 30}
                  y1={y}
                  x2={FRAME.x + 30 + (long ? 14 : 8)}
                  y2={y}
                  stroke={CREAM_DIM}
                  strokeWidth={0.8}
                />
                {long && (
                  <text
                    x={FRAME.x + 52}
                    y={y + 3.5}
                    fill={CREAM_DIM}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={2}
                    fontWeight={500}
                  >
                    {m.label}
                  </text>
                )}
              </g>
            );
          })}
          <text
            x={FRAME.x + 30}
            y={FRAME.y + 28}
            fill={CREAM}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            ALT
          </text>
        </g>

        {/* Airspeed strip (top-right of frame) */}
        <g opacity={hudFade}>
          <rect
            x={FRAME.x + FRAME.w - 210}
            y={FRAME.y + 22}
            width={186}
            height={70}
            fill="none"
            stroke={CREAM_DIM}
            strokeWidth={0.8}
          />
          <text
            x={FRAME.x + FRAME.w - 200}
            y={FRAME.y + 42}
            fill={CREAM_DIM}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            AIRSPEED
          </text>
          <text
            x={FRAME.x + FRAME.w - 30}
            y={FRAME.y + 72}
            textAnchor="end"
            fill={CREAM}
            fontFamily={inter}
            fontSize={30}
            fontWeight={600}
            letterSpacing={1}
          >
            {speed}
            <tspan
              dx={6}
              fill={CREAM_DIM}
              fontSize={12}
              fontWeight={500}
              letterSpacing={3}
            >
              KM/H
            </tspan>
          </text>
          <text
            x={FRAME.x + FRAME.w - 30}
            y={FRAME.y + 87}
            textAnchor="end"
            fill={ORANGE}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            MACH {mach}
          </text>
        </g>

        {/* Streamlines (in falcon-local frame — wrap around the body) */}
        <g transform={falconTransform} opacity={falconOpacity}>
          {STREAMLINES.map((s, i) => {
            const t = streamlineT(i);
            return (
              <path
                key={`s-${i}`}
                d={s.d}
                stroke={CREAM}
                strokeOpacity={s.opacity * t}
                strokeWidth={1.1}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={800}
                strokeDashoffset={800 * (1 - t)}
              />
            );
          })}
          {/* Arrow tips — chevron pointing back-left in local frame */}
          {STREAMLINES.map((s, i) => {
            const t = streamlineT(i);
            if (t < 0.55) return null;
            const { x, y } = s.chevron;
            return (
              <path
                key={`chev-${i}`}
                d={`M ${x + 14} ${y - 6} L ${x} ${y} L ${x + 14} ${y + 6}`}
                fill="none"
                stroke={CREAM}
                strokeOpacity={s.opacity}
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Body silhouette (includes head, back, tail, belly as one path) */}
          <path
            d={FALCON_BODY_PATH}
            fill={SLATE}
            stroke={SKY_DEEP}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          {/* Tail bar hints — thin dark verticals across the tail */}
          {[-140, -120, -100, -80].map((x, i) => (
            <line
              key={`bar-${i}`}
              x1={x}
              y1={-2}
              x2={x - 2}
              y2={14}
              stroke={SKY_DEEP}
              strokeWidth={0.9}
              opacity={0.55}
            />
          ))}

          {/* Buff breast — a warm patch across the belly */}
          <path
            d={
              "M 210 8 " +
              "C 180 22 130 27 80 27 " +
              "C 30 27 -20 24 -60 20 " +
              "C -30 16 20 16 80 16 " +
              "C 130 14 180 10 210 2 Z"
            }
            fill={BUFF}
            opacity={0.85}
          />
          {/* Very subtle belly barring */}
          {[-30, 0, 30, 60, 90, 120, 150].map((x, i) => (
            <line
              key={`ubar-${i}`}
              x1={x}
              y1={16}
              x2={x + 6}
              y2={24}
              stroke={SLATE}
              strokeWidth={0.9}
              opacity={0.5}
            />
          ))}

          {/* Folded wing — darker slate crescent hinting at coverts */}
          <path
            d={FALCON_WING_PATH}
            fill="#22303F"
            opacity={0.9}
          />
          {/* Wing leading-edge crease */}
          <path
            d="M 100 -22 C 60 -18 0 -14 -60 -10 C -100 -8 -130 -6 -140 -4"
            fill="none"
            stroke={SKY_DEEP}
            strokeWidth={1.0}
            opacity={0.75}
            strokeLinecap="round"
          />
          {/* Feather hints along wing */}
          {[
            [90, -20, 80, -12],
            [60, -18, 50, -10],
            [30, -16, 20, -8],
            [0, -14, -10, -6],
            [-30, -12, -40, -4],
            [-60, -10, -70, -2],
          ].map(([x1, y1, x2, y2], i) => (
            <line
              key={`fe-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={SKY_DEEP}
              strokeWidth={0.8}
              opacity={0.5}
            />
          ))}

          {/* Cheek buff patch */}
          <path
            d={FALCON_CHEEK_PATH}
            fill={BUFF}
            opacity={0.9}
          />
          {/* Dark hood (crown) */}
          <path
            d={FALCON_HOOD_PATH}
            fill={SKY_DEEP}
          />
          {/* Malar stripe */}
          <path d={FALCON_MALAR_PATH} fill={SKY_DEEP} />
          {/* Cere */}
          <path d={FALCON_CERE_PATH} fill={ORANGE} />
          {/* Beak */}
          <path
            d={FALCON_BEAK_PATH}
            fill={SKY_DEEP}
            stroke={SKY_DEEP}
            strokeLinejoin="round"
            strokeWidth={0.8}
          />

          {/* Eye */}
          <circle
            cx={FALCON_EYE.x}
            cy={FALCON_EYE.y}
            r={FALCON_EYE.r + 1.4}
            fill="none"
            stroke={ORANGE}
            strokeWidth={0.9}
          />
          <circle
            cx={FALCON_EYE.x}
            cy={FALCON_EYE.y}
            r={FALCON_EYE.r}
            fill={CREAM}
          />
          <circle
            cx={FALCON_EYE.x + 0.6}
            cy={FALCON_EYE.y}
            r={1.8}
            fill={SKY_DEEP}
          />

          {/* Nostril */}
          <circle
            cx={FALCON_NOSTRIL.x}
            cy={FALCON_NOSTRIL.y}
            r={1.6}
            fill={SKY_DEEP}
          />
          <circle
            cx={FALCON_NOSTRIL.x}
            cy={FALCON_NOSTRIL.y}
            r={0.7}
            fill={ORANGE}
          />
        </g>

        {/* Target reticle centered on the head */}
        <g
          opacity={hudFade * 0.7}
          transform={`translate(${headWorld.x}, ${headWorld.y})`}
        >
          <circle
            cx={0}
            cy={0}
            r={54}
            fill="none"
            stroke={CREAM}
            strokeWidth={0.7}
            strokeDasharray="4 6"
          />
          <line x1={-64} y1={0} x2={-30} y2={0} stroke={CREAM} strokeWidth={0.9} />
          <line x1={30} y1={0} x2={64} y2={0} stroke={CREAM} strokeWidth={0.9} />
          <line x1={0} y1={-64} x2={0} y2={-30} stroke={CREAM} strokeWidth={0.9} />
          <line x1={0} y1={30} x2={0} y2={64} stroke={CREAM} strokeWidth={0.9} />
        </g>

        {/* Angle-of-attack chip */}
        <g opacity={hudFade}>
          <text
            x={FALCON_CENTER.x - 220}
            y={FALCON_CENTER.y + 200}
            fill={CREAM_DIM}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.5}
            fontWeight={500}
          >
            α = 34° · STOOP
          </text>
        </g>

        {/* Callout leader to nostril */}
        {(() => {
          const c = calloutT;
          if (c <= 0) return null;
          const startX = nostrilWorld.x;
          const startY = nostrilWorld.y;
          // Leader path: right + down then horizontal to a chip at right edge.
          const midX = startX + 90;
          const midY = startY + 80;
          const endX = FRAME.x + FRAME.w - 44;
          const endY = midY;
          const chipW = 220;
          const chipH = 44;
          // Draw the leader in three segments; reveal length by clipping via dashoffset trick.
          const total = 500;
          const seg1 = `M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`;
          return (
            <g>
              <circle
                cx={startX}
                cy={startY}
                r={4}
                fill="none"
                stroke={ORANGE}
                strokeWidth={1.4}
                opacity={c}
              />
              <path
                d={seg1}
                stroke={ORANGE}
                strokeWidth={1.3}
                fill="none"
                strokeDasharray={total}
                strokeDashoffset={total * (1 - c)}
              />
              <g opacity={Math.max(0, (c - 0.6) / 0.4)}>
                <rect
                  x={endX - chipW}
                  y={endY - chipH / 2}
                  width={chipW}
                  height={chipH}
                  fill={SKY_DEEP}
                  stroke={ORANGE}
                  strokeWidth={1.2}
                />
                <text
                  x={endX - chipW + 14}
                  y={endY - 6}
                  fill={ORANGE}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing={2.6}
                >
                  DETAIL · A
                </text>
                <text
                  x={endX - chipW + 14}
                  y={endY + 12}
                  fill={CREAM}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={500}
                  letterSpacing={2.4}
                >
                  NASAL TUBERCLE
                </text>
              </g>
            </g>
          );
        })()}

        {/* Caption strip below frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={CREAM_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · FALCO PEREGRINUS IN STOOP · TELEMETRY 05.2005</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={ORANGE}
            opacity={0.9}
          >
            V-MAX · 389 KM/H
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 915,
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
            color: ORANGE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: CREAM_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>
            Fighter Pilot
          </span>
        </div>

        <div
          style={{
            color: CREAM,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The 389 km/h
          <br />
          flight instructor.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#D2CFC7",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          In a hunting stoop, the peregrine falcon accelerates past{" "}
          <span style={{ color: ORANGE, fontWeight: 600 }}>389 km/h</span> —
          the fastest animal on Earth. Small bony cones inside its nostrils
          diffuse the oncoming airstream, the same trick jet-engine inlets
          use to keep high-speed air from collapsing the compressor behind.
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
          color: CREAM_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Franklin, K. · Skydive telemetry · 2005</span>
        <span>
          <span style={{ color: ORANGE }}>●</span> Detail A · Nasal tubercle
        </span>
      </div>

      {/* touch durationInFrames to silence lint */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
