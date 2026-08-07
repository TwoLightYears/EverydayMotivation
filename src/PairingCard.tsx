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

// ── Palette (from the concept's visual brief) ──────────────────────────
const NIGHT = "#0B1522";
const CHAMBER = "#0F1B2C";
const CHAMBER_EDGE = "#22364F";
const FROST = "#7FA8BE";
const ICE_PALE = "#C8DDE8";
const GLUCOSE = "#E8B655";
const RUSSET = "#6B4E3D";
const RUSSET_SHADOW = "#3E2C22";
const GRID = "#132135";
const GRAY = "#6E7B8E";

// ── Layout constants ────────────────────────────────────────────────────
const W = 1080;
const H = 1350;
const CHAMBER_BOX = { x: 60, y: 130, w: 960, h: 760 };

// ── Frog silhouette (profile specimen, viewBox 500 × 340) ───────────────
// Wood frog facing left in a crouching resting posture: pointed snout,
// prominent eye on top of head, arched back, big Z-folded hind leg, and
// a small dangling foreleg.

// Hind leg — thigh sweeps back and down, calf folds forward to a slim foot
// with toes pointing toward the snout.
const FROG_HIND = `
M 315 128
C 400 118 458 158 448 218
C 460 258 420 292 370 278
C 350 295 300 306 260 296
C 245 282 258 262 285 250
C 320 240 350 220 358 190
C 348 172 335 155 320 148
C 314 140 312 132 315 128
Z
`;

// Body silhouette (head + torso in profile). Snout to the left, arched
// back rising to a peak between the eye and the sacrum, belly curving
// back under.
const FROG_BODY = `
M 48 195
C 36 175 52 152 88 144
C 118 130 148 128 175 142
C 200 132 232 96 275 92
C 320 88 360 96 388 116
C 402 132 398 158 380 172
C 360 195 330 210 300 216
C 258 224 210 224 168 224
C 130 226 92 224 66 218
C 46 214 40 205 48 195
Z
`;

// Small foreleg dangling from the shoulder.
const FROG_FORELEG = `
M 200 218
C 195 245 208 268 226 268
C 240 264 245 248 238 228
C 232 220 220 216 200 218
Z
`;

// Belly under-curve highlight
const FROG_BELLY = `M 60 208 C 130 232 240 232 300 216`;

// Dorsal ridge (subtle arch)
const FROG_SPINE = `M 175 138 C 220 108 310 100 380 118`;

// Eye — big dorsal bump on top of the head (protruding above the body
// silhouette). The eye's centre sits above the head-line so it looks
// like it's popping up.
type Eye = { cx: number; cy: number; rx: number; ry: number };
const EYE: Eye = { cx: 148, cy: 116, rx: 30, ry: 26 };

// Snowflake — six arms with side branches, radius r
const Snowflake: React.FC<{
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
}> = ({ cx, cy, r, stroke, strokeWidth = 1, opacity = 1 }) => (
  <g
    transform={`translate(${cx}, ${cy})`}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    fill="none"
    opacity={opacity}
  >
    {[0, 60, 120, 180, 240, 300].map((a) => (
      <g key={a} transform={`rotate(${a})`}>
        <line x1={0} y1={0} x2={0} y2={-r} />
        <line x1={0} y1={-r * 0.55} x2={-r * 0.22} y2={-r * 0.78} />
        <line x1={0} y1={-r * 0.55} x2={r * 0.22} y2={-r * 0.78} />
        <line x1={0} y1={-r * 0.8} x2={-r * 0.14} y2={-r * 0.95} />
        <line x1={0} y1={-r * 0.8} x2={r * 0.14} y2={-r * 0.95} />
      </g>
    ))}
  </g>
);

// Radial fracture line — one long fissure from centre outward
type Fracture = {
  angle: number;   // degrees, 0 = right
  reach: number;   // 0..1 of chamber diagonal
  wobble: number;  // px lateral kink
  delay: number;   // 0..1 growth start
  weight: number;  // stroke width
};
const FRACTURES: Fracture[] = [
  { angle: -95, reach: 0.48, wobble: 16, delay: 0.02, weight: 1.4 },
  { angle: -70, reach: 0.4, wobble: -12, delay: 0.06, weight: 1.0 },
  { angle: -45, reach: 0.44, wobble: 18, delay: 0.09, weight: 1.2 },
  { angle: -20, reach: 0.36, wobble: -14, delay: 0.13, weight: 0.9 },
  { angle: 10, reach: 0.42, wobble: 10, delay: 0.16, weight: 1.1 },
  { angle: 40, reach: 0.44, wobble: -16, delay: 0.2, weight: 1.2 },
  { angle: 65, reach: 0.38, wobble: 12, delay: 0.24, weight: 0.9 },
  { angle: 95, reach: 0.46, wobble: -18, delay: 0.27, weight: 1.2 },
  { angle: 125, reach: 0.42, wobble: 14, delay: 0.31, weight: 1.0 },
  { angle: 155, reach: 0.46, wobble: -12, delay: 0.35, weight: 1.2 },
  { angle: -155, reach: 0.4, wobble: 16, delay: 0.38, weight: 0.9 },
  { angle: -125, reach: 0.44, wobble: -14, delay: 0.42, weight: 1.1 },
];

const deg2rad = (d: number) => (d * Math.PI) / 180;

const fracturePath = (f: Fracture, maxLen: number): string => {
  const rad = deg2rad(f.angle);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const len = f.reach * maxLen;
  const nx = -sin;
  const ny = cos;
  const startR = 190; // begin outside frog silhouette
  const x0 = cos * startR;
  const y0 = sin * startR;
  const xm = cos * (startR + len * 0.5) + nx * f.wobble * 0.5;
  const ym = sin * (startR + len * 0.5) + ny * f.wobble * 0.5;
  const x1 = cos * (startR + len);
  const y1 = sin * (startR + len);
  return `M ${x0} ${y0} Q ${xm} ${ym} ${x1} ${y1}`;
};

// ── Heart-rate trace ────────────────────────────────────────────────────
// Draw as an SVG polyline sampled across the chamber width. From frame 0
// we're beating; by ~2.5s we've flatlined; at the tail (~4s) a single
// resurgent QRS spikes.
// The strip is a SPACE-varying narrative of the winter cycle: left = late
// autumn (beating), middle = deep freeze (flatline), right = spring thaw
// (resurgent heartbeat). Reveal moves left-to-right over time.
const traceSample = (x01: number): number => {
  // Density envelope: full on [0, 0.28], zero on [0.32, 0.78], ramps back
  // up briefly on [0.85, 0.98].
  const beatEnv =
    x01 < 0.28
      ? 1
      : x01 < 0.32
      ? 1 - (x01 - 0.28) / 0.04
      : 0;
  const revEnv =
    x01 > 0.85 && x01 < 0.98
      ? Math.sin(((x01 - 0.85) / 0.13) * Math.PI)
      : 0;

  // Basic QRS surrogate for the beating region
  const beats = 3.5; // beats within the beating region
  const beatX = beatEnv > 0 ? (x01 / 0.28) * beats : 0;
  const phase = beatX * Math.PI * 2;
  const q = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const dq = Math.min(q, Math.PI * 2 - q);
  const spike = Math.exp(-Math.pow(dq * 2.4, 2));
  const tWave = 0.28 * Math.exp(-Math.pow((dq - 1.1) * 3.2, 2));
  const pWave = 0.18 * Math.exp(-Math.pow((dq - 5.6) * 3.2, 2));
  const beat = (spike * 1.8 + tWave + pWave - 0.06) * beatEnv;

  // Single resurgent QRS at ~x=0.92
  const rQrs = Math.exp(-Math.pow((x01 - 0.92) * 45, 2)) * 1.6 * revEnv;
  return beat + rQrs;
};

// Sample the trace into an SVG polyline path
const buildTracePath = (
  x0: number,
  y0: number,
  w: number,
  h: number,
  reveal01: number,
): string => {
  const N = 260;
  const revealN = Math.floor(N * Math.max(0, Math.min(1, reveal01)));
  if (revealN < 2) return "";
  const half = h / 2;
  let d = "";
  for (let i = 0; i <= revealN; i++) {
    const x01 = i / N;
    const y = traceSample(x01) * half * 0.9;
    const xx = x0 + x01 * w;
    const yy = y0 + half - y;
    d += (i === 0 ? "M " : "L ") + xx.toFixed(2) + " " + yy.toFixed(2) + " ";
  }
  return d;
};

// ── Annotation labels ───────────────────────────────────────────────────
type Annotation = {
  side: "L" | "R";
  y: number;
  label: string;
  value: string;
  unit: string;
  delay: number;
};
const ANNOTATIONS: Annotation[] = [
  {
    side: "L",
    y: 300,
    label: "Body temperature",
    value: "−6",
    unit: "°C",
    delay: 0.55,
  },
  {
    side: "L",
    y: 430,
    label: "Heart rate",
    value: "0",
    unit: "bpm",
    delay: 0.62,
  },
  {
    side: "L",
    y: 560,
    label: "Cortical activity",
    value: "flat",
    unit: "",
    delay: 0.7,
  },
  {
    side: "R",
    y: 300,
    label: "Ice fraction",
    value: "0.65",
    unit: "of body water",
    delay: 0.58,
  },
  {
    side: "R",
    y: 430,
    label: "Blood glucose",
    value: "4500",
    unit: "mg/dL",
    delay: 0.66,
  },
  {
    side: "R",
    y: 560,
    label: "Survival",
    value: "months",
    unit: "at −16 °C",
    delay: 0.74,
  },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Global time 0..1 across the whole clip
  const t01 = frame / (durationInFrames - 1);

  // Crystal-growth master schedule
  const growSpan = fps * 2.6;
  const t = Math.max(0, frame) / growSpan;

  // Title spring
  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glucose pulse: single sweep from head to toe of frog, 0.7s → 1.6s
  const pulseT = interpolate(frame, [fps * 0.7, fps * 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulseOpacity = interpolate(
    frame,
    [fps * 0.7, fps * 1.0, fps * 1.6],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Chamber inner drawing region (in svg coords)
  const cx = CHAMBER_BOX.x + CHAMBER_BOX.w / 2; // 540
  const cy = CHAMBER_BOX.y + CHAMBER_BOX.h / 2 - 60; // frog sits slightly high
  const halfDiag = Math.hypot(CHAMBER_BOX.w / 2, CHAMBER_BOX.h / 2) - 40;

  // Frog scale: profile viewBox is 500 × 340. Fit to ~640px wide.
  const frogScale = 640 / 500;
  const frogTx = cx - 250 * frogScale;
  const frogTy = cy - 170 * frogScale;

  // Heart-strip layout
  const stripY = CHAMBER_BOX.y + CHAMBER_BOX.h - 108;
  const stripX = CHAMBER_BOX.x + 60;
  const stripW = CHAMBER_BOX.w - 120;
  const stripH = 84;

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
        <span style={{ color: FROST }}>2026 · 08 · 07</span>
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="chamber-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#122036" />
            <stop offset="0.55" stopColor={CHAMBER} />
            <stop offset="1" stopColor="#0A1424" />
          </linearGradient>
          <radialGradient id="chamber-vignette" cx="50%" cy="45%" r="65%">
            <stop offset="0" stopColor="#182A44" stopOpacity="0.35" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="frog-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={FROST} stopOpacity="0.28" />
            <stop offset="1" stopColor={FROST} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="frog-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7C5C48" />
            <stop offset="1" stopColor={RUSSET_SHADOW} />
          </linearGradient>
          <linearGradient id="glucose-pulse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GLUCOSE} stopOpacity="0" />
            <stop offset="0.5" stopColor={GLUCOSE} stopOpacity="1" />
            <stop offset="1" stopColor={GLUCOSE} stopOpacity="0" />
          </linearGradient>
          <clipPath id="frog-clip">
            <g
              transform={`translate(${frogTx}, ${frogTy}) scale(${frogScale})`}
            >
              <path d={FROG_BODY} />
              <path d={FROG_HIND} />
              <path d={FROG_FORELEG} />
              <ellipse
                cx={EYE.cx}
                cy={EYE.cy + 8}
                rx={EYE.rx + 6}
                ry={EYE.ry + 6}
              />
            </g>
          </clipPath>
          <pattern
            id="chamber-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            x={CHAMBER_BOX.x}
            y={CHAMBER_BOX.y}
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={GRID}
              strokeWidth="1"
            />
          </pattern>
          <filter id="frost-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Chamber background */}
        <rect
          x={CHAMBER_BOX.x}
          y={CHAMBER_BOX.y}
          width={CHAMBER_BOX.w}
          height={CHAMBER_BOX.h}
          fill="url(#chamber-fill)"
          rx="4"
        />
        <rect
          x={CHAMBER_BOX.x}
          y={CHAMBER_BOX.y}
          width={CHAMBER_BOX.w}
          height={CHAMBER_BOX.h}
          fill="url(#chamber-grid)"
          rx="4"
        />
        <rect
          x={CHAMBER_BOX.x}
          y={CHAMBER_BOX.y}
          width={CHAMBER_BOX.w}
          height={CHAMBER_BOX.h}
          fill="url(#chamber-vignette)"
          rx="4"
        />

        {/* Chamber outer border and corner ticks */}
        <rect
          x={CHAMBER_BOX.x + 0.5}
          y={CHAMBER_BOX.y + 0.5}
          width={CHAMBER_BOX.w - 1}
          height={CHAMBER_BOX.h - 1}
          fill="none"
          stroke={CHAMBER_EDGE}
          strokeWidth="1"
          rx="4"
        />
        {(
          [
            [CHAMBER_BOX.x, CHAMBER_BOX.y, 1, 1],
            [CHAMBER_BOX.x + CHAMBER_BOX.w, CHAMBER_BOX.y, -1, 1],
            [CHAMBER_BOX.x, CHAMBER_BOX.y + CHAMBER_BOX.h, 1, -1],
            [
              CHAMBER_BOX.x + CHAMBER_BOX.w,
              CHAMBER_BOX.y + CHAMBER_BOX.h,
              -1,
              -1,
            ],
          ] as const
        ).map(([kx, ky, sx, sy], i) => (
          <g key={i} stroke={FROST} strokeWidth="1.4" fill="none">
            <line x1={kx} y1={ky} x2={kx + sx * 24} y2={ky} />
            <line x1={kx} y1={ky} x2={kx} y2={ky + sy * 24} />
          </g>
        ))}

        {/* Corner snowflakes (inside chamber) */}
        <Snowflake
          cx={CHAMBER_BOX.x + 58}
          cy={CHAMBER_BOX.y + 60}
          r={20}
          stroke={FROST}
          strokeWidth={1.1}
          opacity={0.55}
        />
        <Snowflake
          cx={CHAMBER_BOX.x + CHAMBER_BOX.w - 58}
          cy={CHAMBER_BOX.y + 60}
          r={20}
          stroke={FROST}
          strokeWidth={1.1}
          opacity={0.55}
        />
        <Snowflake
          cx={CHAMBER_BOX.x + 58}
          cy={CHAMBER_BOX.y + CHAMBER_BOX.h - 60}
          r={20}
          stroke={FROST}
          strokeWidth={1.1}
          opacity={0.55}
        />
        <Snowflake
          cx={CHAMBER_BOX.x + CHAMBER_BOX.w - 58}
          cy={CHAMBER_BOX.y + CHAMBER_BOX.h - 60}
          r={20}
          stroke={FROST}
          strokeWidth={1.1}
          opacity={0.55}
        />

        {/* Radial fractures (below frog, above grid) */}
        <g transform={`translate(${cx}, ${cy})`}>
          {FRACTURES.map((f, i) => {
            const localT = (t - f.delay) / 0.6;
            const grow = Math.max(0, Math.min(1, localT));
            const eased = 1 - Math.pow(1 - grow, 3);
            const d = fracturePath(f, halfDiag);
            // Rough dash length ≈ reach * halfDiag
            const dashLen = f.reach * halfDiag + 60;
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={FROST}
                  strokeWidth={f.weight + 3}
                  strokeOpacity={0.08 * eased}
                  strokeLinecap="round"
                  filter="url(#frost-glow)"
                  strokeDasharray={dashLen}
                  strokeDashoffset={dashLen * (1 - eased)}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={FROST}
                  strokeWidth={f.weight}
                  strokeOpacity={0.7 * eased}
                  strokeLinecap="round"
                  strokeDasharray={dashLen}
                  strokeDashoffset={dashLen * (1 - eased)}
                />
              </g>
            );
          })}

          {/* Two tips of frost accretion — one on each side of the frog */}
          {[-20, 200].map((angle, i) => {
            const localT = (t - 0.5) / 0.4;
            const grow = Math.max(0, Math.min(1, localT));
            if (grow <= 0) return null;
            const rad = deg2rad(angle);
            const d = 220 + 60 * grow;
            const x = Math.cos(rad) * d;
            const y = Math.sin(rad) * d;
            return (
              <Snowflake
                key={`fx-${i}`}
                cx={x}
                cy={y}
                r={10}
                stroke={ICE_PALE}
                strokeWidth={1.0}
                opacity={0.75 * grow}
              />
            );
          })}
        </g>

        {/* Frog halo */}
        <ellipse
          cx={cx}
          cy={cy + 12}
          rx={280}
          ry={210}
          fill="url(#frog-halo)"
        />

        {/* Base shadow — grounds the frog in the ice */}
        <ellipse
          cx={cx}
          cy={cy + 200}
          rx={280}
          ry={22}
          fill="#050B14"
          opacity={0.6}
        />

        {/* Frog silhouette — profile specimen, facing left */}
        <g transform={`translate(${frogTx}, ${frogTy}) scale(${frogScale})`}>
          {/* Layer 1 — hind leg (behind body) */}
          <path d={FROG_HIND} fill={RUSSET_SHADOW} />
          {/* Toe hints on the hind foot */}
          {[
            [258, 296],
            [278, 300],
            [298, 302],
            [318, 300],
          ].map(([x, y], i) => (
            <line
              key={`toe-${i}`}
              x1={x}
              y1={y}
              x2={x - 12}
              y2={y - 4}
              stroke={RUSSET_SHADOW}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          ))}
          {/* Thigh highlight — a thin lighter stroke tracing the top */}
          <path
            d="M 318 128 C 380 122 440 158 442 210"
            fill="none"
            stroke="#8B6952"
            strokeWidth={2}
            opacity={0.55}
          />

          {/* Layer 2 — foreleg (behind body) */}
          <path d={FROG_FORELEG} fill={RUSSET_SHADOW} />

          {/* Layer 3 — main body */}
          <path d={FROG_BODY} fill="url(#frog-body)" />

          {/* Layer 4 — dorsal ridge + belly line */}
          <path
            d={FROG_SPINE}
            fill="none"
            stroke="#8B6952"
            strokeWidth={2}
            opacity={0.5}
          />
          <path
            d={FROG_BELLY}
            fill="none"
            stroke={RUSSET_SHADOW}
            strokeWidth={2}
            opacity={0.6}
          />

          {/* Layer 5 — dorsal spots (mottled skin) */}
          {[
            [210, 158],
            [255, 138],
            [290, 132],
            [330, 138],
            [246, 172],
            [286, 174],
            [326, 168],
            [225, 200],
            [275, 202],
            [325, 200],
          ].map(([x, y], i) => (
            <ellipse
              key={`spot-${i}`}
              cx={x}
              cy={y}
              rx={4.5}
              ry={2.8}
              fill={RUSSET_SHADOW}
              opacity={0.5}
            />
          ))}

          {/* Layer 6 — dark mask stripe (Rana sylvatica signature),
              running from just behind snout through the eye */}
          <path
            d="M 96 148 C 130 138 165 138 188 148 L 188 162 C 165 152 130 152 96 162 Z"
            fill={RUSSET_SHADOW}
            opacity={0.95}
          />

          {/* Layer 7 — eye bump (protruding above head, body-coloured) */}
          <ellipse
            cx={EYE.cx}
            cy={EYE.cy + 8}
            rx={EYE.rx + 6}
            ry={EYE.ry + 6}
            fill="url(#frog-body)"
          />

          {/* Layer 8 — eye */}
          <ellipse
            cx={EYE.cx}
            cy={EYE.cy}
            rx={EYE.rx}
            ry={EYE.ry}
            fill="#0F1622"
          />
          <ellipse
            cx={EYE.cx}
            cy={EYE.cy}
            rx={EYE.rx - 4}
            ry={EYE.ry - 4}
            fill={GLUCOSE}
            opacity={0.9}
          />
          {/* Horizontal pupil — Rana pupil geometry */}
          <ellipse
            cx={EYE.cx}
            cy={EYE.cy}
            rx={EYE.rx - 6}
            ry={5}
            fill="#08101B"
          />
          {/* Catchlight */}
          <circle
            cx={EYE.cx - 8}
            cy={EYE.cy - 3}
            r={3}
            fill={ICE_PALE}
          />

          {/* Nostril */}
          <ellipse cx={68} cy={172} rx={3} ry={2} fill="#0F1622" />

          {/* Mouth line — subtle */}
          <path
            d="M 52 202 Q 90 214 130 212"
            fill="none"
            stroke={RUSSET_SHADOW}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.75}
          />
        </g>

        {/* Glucose pulse — clipped to frog body, sweeps from snout to rump */}
        <g clipPath="url(#frog-clip)" opacity={pulseOpacity}>
          <rect
            x={frogTx + interpolate(pulseT, [0, 1], [-100, 500]) * frogScale}
            y={frogTy}
            width={140 * frogScale}
            height={340 * frogScale}
            fill="url(#glucose-pulse)"
            transform={`rotate(90, ${
              frogTx + interpolate(pulseT, [0, 1], [-30, 570]) * frogScale
            }, ${frogTy + 170 * frogScale})`}
          />
        </g>

        {/* Frost accretion on frog (fade in as t grows) */}
        <g
          clipPath="url(#frog-clip)"
          opacity={Math.min(0.85, Math.max(0, t - 0.4) * 1.2)}
        >
          <rect
            x={frogTx}
            y={frogTy}
            width={500 * frogScale}
            height={340 * frogScale}
            fill={FROST}
            opacity={0.24}
          />
          {[
            [96, 156],
            [140, 176],
            [190, 148],
            [240, 130],
            [290, 132],
            [330, 148],
            [220, 190],
            [280, 200],
            [200, 218],
            [150, 200],
            [340, 200],
          ].map(([x, y], i) => (
            <Snowflake
              key={`bx-${i}`}
              cx={frogTx + x * frogScale}
              cy={frogTy + y * frogScale}
              r={4 + (i % 3)}
              stroke={ICE_PALE}
              strokeWidth={0.8}
              opacity={0.9}
            />
          ))}
        </g>

        {/* Side annotations — stack label, value, unit vertically (no overlap) */}
        {ANNOTATIONS.map((a, i) => {
          const op = interpolate(
            frame,
            [fps * (a.delay * 3), fps * (a.delay * 3 + 0.5)],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const isLeft = a.side === "L";
          const anchorX = isLeft
            ? CHAMBER_BOX.x + 46
            : CHAMBER_BOX.x + CHAMBER_BOX.w - 46;
          const textAnchor = isLeft ? "start" : "end";
          // Tick mark just outside the frog (not through it)
          const tickX1 = isLeft ? anchorX + 130 : anchorX - 130;
          const tickX2 = isLeft ? anchorX + 200 : anchorX - 200;
          const tickY = a.y + 20;
          return (
            <g key={i} opacity={op}>
              {/* short leader tick */}
              <line
                x1={tickX1}
                y1={tickY}
                x2={tickX2}
                y2={tickY}
                stroke={FROST}
                strokeWidth={0.9}
                strokeOpacity={0.55}
                strokeDasharray="2 4"
              />
              <circle
                cx={tickX2}
                cy={tickY}
                r={2}
                fill={FROST}
                fillOpacity={0.8}
              />
              {/* label */}
              <text
                x={anchorX}
                y={a.y}
                textAnchor={textAnchor}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={2.6}
                style={{ textTransform: "uppercase" }}
              >
                {a.label}
              </text>
              {/* value */}
              <text
                x={anchorX}
                y={a.y + 44}
                textAnchor={textAnchor}
                fill={ICE_PALE}
                fontFamily={playfair}
                fontSize={44}
                fontWeight={500}
                fontStyle="italic"
              >
                {a.value}
              </text>
              {/* unit — placed BELOW the value so nothing overlaps */}
              {a.unit ? (
                <text
                  x={anchorX}
                  y={a.y + 66}
                  textAnchor={textAnchor}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={500}
                  letterSpacing={2.4}
                  style={{ textTransform: "uppercase" }}
                >
                  {a.unit}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Heart-rate strip */}
        <g>
          {/* strip frame */}
          <rect
            x={stripX}
            y={stripY}
            width={stripW}
            height={stripH}
            fill="#0A1322"
            stroke={CHAMBER_EDGE}
            strokeWidth={1}
            rx={2}
          />
          {/* faint gridlines within strip */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={stripX + stripW * f}
              y1={stripY}
              x2={stripX + stripW * f}
              y2={stripY + stripH}
              stroke={GRID}
              strokeWidth={1}
            />
          ))}
          {[0.5].map((f) => (
            <line
              key={`h-${f}`}
              x1={stripX}
              y1={stripY + stripH * f}
              x2={stripX + stripW}
              y2={stripY + stripH * f}
              stroke={GRID}
              strokeWidth={1}
            />
          ))}
          {/* trace */}
          <path
            d={buildTracePath(
              stripX + 8,
              stripY + 6,
              stripW - 16,
              stripH - 12,
              Math.min(1, frame / (fps * 3.6)),
            )}
            fill="none"
            stroke={GLUCOSE}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* label */}
          <text
            x={stripX + 6}
            y={stripY - 8}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={2.6}
            style={{ textTransform: "uppercase" }}
          >
            Fig. 1 · Cardiac trace · winter cycle
          </text>
          <text
            x={stripX + stripW - 6}
            y={stripY - 8}
            textAnchor="end"
            fill={FROST}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={2.6}
            style={{ textTransform: "uppercase" }}
          >
            Rana sylvatica · Interior Alaska
          </text>
          {/* Phase axis labels */}
          {[
            { x: 0.13, label: "Autumn" },
            { x: 0.55, label: "Deep freeze" },
            { x: 0.92, label: "Thaw" },
          ].map((p) => (
            <text
              key={p.label}
              x={stripX + stripW * p.x}
              y={stripY + stripH + 18}
              textAnchor="middle"
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              fontWeight={500}
              letterSpacing={2.6}
              style={{ textTransform: "uppercase" }}
            >
              {p.label}
            </text>
          ))}
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 950,
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
            color: FROST,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: ICE_PALE, letterSpacing: 5 }}>Cryonicist</span>
        </div>

        <div
          style={{
            color: ICE_PALE,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.98,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The frog who dies
          <br />
          each winter.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#B9C6D4",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Every winter, the Alaskan wood frog stops its heart, empties its
          lungs, and lets ice replace up to{" "}
          <span style={{ color: GLUCOSE, fontWeight: 600 }}>
            65% of its body water
          </span>{" "}
          — cells surviving because it floods them with a self-generated
          glucose cryoprotectant that spikes about 100-fold as freezing begins.
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
        <span>Larson et al. · J. Exp. Biol. 217 (2014) 2193–2200</span>
        <span>
          <span style={{ color: GLUCOSE }}>●</span> Glucose = cryoprotectant
        </span>
      </div>
    </AbsoluteFill>
  );
};
