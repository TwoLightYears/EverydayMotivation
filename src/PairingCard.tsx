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

// Palette — drawn from the dandelion seed's real coloration
const PAPER = "#EDE4CF";       // pappus silver-cream (background)
const PAPER_HI = "#F3EADA";    // warm paper highlight
const PAPER_LO = "#E2D7BE";    // paper shadow
const INK = "#2E2318";          // achene deep brown
const INK_SOFT = "#4F3E2C";     // soft brown
const INK_FAINT = "#8A7558";    // faded ink / secondary text
const YELLOW = "#F2C438";       // flower-pollen yellow (accent)
const AMBER = "#8B5A3C";        // dry stem amber (callouts)
const GRID = "#D6CAB0";         // faint drafting grid
const GRID_MAJOR = "#CDBF9F";   // major grid

// Dandelion seed geometry (coordinates in the map space defined below)
// Map space: 1080 × 800 (same approach as previous episodes)
// Place seed slightly left of center for an asymmetric editorial feel.
const HUB_X = 440;   // pappus convergence hub
const HUB_Y = 445;   // the point where filaments meet the top of the beak
const BEAK_LEN = 150;      // length of the thin shaft between hub and seed body
const ACHENE_LEN = 108;    // length of the elongated seed body
const ACHENE_W = 10;        // half-width of achene at widest

// SVR (Separated Vortex Ring) centered above the pappus hub
const SVR_CX = HUB_X;
const SVR_CY = 230;
const SVR_RX = 220;
const SVR_RY = 50;

// Generate pappus filaments: upper-hemisphere spray with slight natural variation.
// Each filament extends outward from the hub with a gentle curve.
type Filament = {
  angle: number;       // radians, 0 = right; we use upper hemisphere mostly
  length: number;      // px
  curl: number;        // -1..1 natural curvature
  thickness: number;   // stroke width
  seed: number;        // for pseudo-random variation
};

const makeFilaments = (): Filament[] => {
  const out: Filament[] = [];
  const COUNT = 72;
  // Upper half-dome of filaments, varying in length, thickness and alpha to suggest 3D depth.
  for (let i = 0; i < COUNT; i++) {
    const t = i / (COUNT - 1); // 0..1
    const angleDeg = -202 + t * 224; // ~0.62π sweep around the upper hemisphere
    const jitter = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 - 0.5;
    const angle = ((angleDeg + jitter * 4.8) * Math.PI) / 180;
    // Base length — longer at horizontal, foreshortened near zenith (3D disk projection)
    const horizontalBoost = Math.abs(Math.cos(angle));
    const base = 150 + horizontalBoost * 42;
    const randLen = (((Math.sin(i * 7.3 + 1.7) * 10000) % 1 + 1) % 1) * 36 - 18;
    const length = base + randLen;
    // Curl: outward-biased
    const curl = Math.sin(angle) * 0.1 + jitter * 0.14;
    const thickness = 0.65 + (((Math.sin(i * 2.3 + 0.9) * 10000) % 1 + 1) % 1) * 0.75;
    out.push({ angle, length, curl, thickness, seed: i });
  }
  return out;
};
const FILAMENTS = makeFilaments();

// A few lighter "background" filaments to add depth
type GhostFilament = Filament & { alpha: number };
const makeGhostFilaments = (): GhostFilament[] => {
  const out: GhostFilament[] = [];
  const COUNT = 36;
  for (let i = 0; i < COUNT; i++) {
    const t = (i + 0.5) / COUNT;
    const angleDeg = -198 + t * 216;
    const jitter = ((Math.sin(i * 9.17 + 3.1) * 43758.5453) % 1 + 1) % 1 - 0.5;
    const angle = ((angleDeg + jitter * 6) * Math.PI) / 180;
    const horizontalBoost = Math.abs(Math.cos(angle));
    const base = 128 + horizontalBoost * 36;
    const randLen = (((Math.sin(i * 5.1 + 0.33) * 10000) % 1 + 1) % 1) * 30 - 15;
    const length = base + randLen;
    const curl = Math.sin(angle) * 0.08 + jitter * 0.1;
    const thickness = 0.55 + (((Math.sin(i * 1.8) * 10000) % 1 + 1) % 1) * 0.35;
    const alpha = 0.28 + (((Math.cos(i * 3.3) * 10000) % 1 + 1) % 1) * 0.22;
    out.push({ angle, length, curl, thickness, seed: i, alpha });
  }
  return out;
};
const GHOST_FILAMENTS = makeGhostFilaments();

// Each pappus filament tip has a tiny branching plumule — we approximate with 2 short cross-hairs
const plumulePath = (ex: number, ey: number, angle: number): string => {
  const perp = angle + Math.PI / 2;
  const r = 6;
  return `M ${ex - Math.cos(perp) * r} ${ey - Math.sin(perp) * r} L ${ex + Math.cos(perp) * r} ${ey + Math.sin(perp) * r}`;
};

const filamentPath = (f: Filament): { d: string; tip: [number, number] } => {
  const sx = HUB_X;
  const sy = HUB_Y;
  const ex = sx + Math.cos(f.angle) * f.length;
  const ey = sy + Math.sin(f.angle) * f.length;
  // Slight curve: control point perpendicular to the filament by curl*length*0.4
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const perp = f.angle + Math.PI / 2;
  const cx = mx + Math.cos(perp) * f.curl * f.length * 0.4;
  const cy = my + Math.sin(perp) * f.curl * f.length * 0.4;
  return { d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`, tip: [ex, ey] };
};

const filamentLen = (f: Filament): number => f.length * 1.02;

// Deterministic pseudo-random streak starts for airflow lines
type Streak = { x: number; phase: number; speed: number; curve: number; alpha: number };
const makeStreaks = (): Streak[] => {
  const out: Streak[] = [];
  const COUNT = 46;
  for (let i = 0; i < COUNT; i++) {
    const seed = Math.sin(i * 11.37 + 0.5) * 43758.5453;
    const r = ((seed % 1) + 1) % 1;
    const x = 60 + r * 960;
    const phase = ((Math.cos(i * 7.11) * 10000) % 1 + 1) % 1;
    const speed = 0.5 + ((Math.sin(i * 3.19 + 0.2) * 10000) % 1 + 1) % 1 * 0.7;
    const curve = ((Math.sin(i * 5.07) * 10000) % 1 + 1) % 1 - 0.5;
    const alpha = 0.18 + ((Math.cos(i * 2.03) * 10000) % 1 + 1) % 1 * 0.22;
    out.push({ x, phase, speed, curve, alpha });
  }
  return out;
};
const STREAKS = makeStreaks();

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animation phases
  // 0.00s – 1.00s : SVR blooms in; pappus filaments extend
  // 1.00s – 1.60s : callouts and type lockup fade/spring in
  // continuous   : airflow streaks rise, SVR ellipses breathe
  const growSpan = fps * 1.0;
  const grow = Math.max(0, Math.min(1, frame / growSpan));
  const growEased = 1 - Math.pow(1 - grow, 3);

  const svrSpring = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 180, mass: 1 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.7,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.3, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const calloutOpacity = interpolate(frame, [fps * 0.9, fps * 1.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // SVR "breathing": gentle oscillation of ry, loops every 4s
  const breathT = (frame % (fps * 4)) / (fps * 4); // 0..1
  const breath = Math.sin(breathT * Math.PI * 2);
  const svrRxNow = SVR_RX * (0.995 + breath * 0.015);
  const svrRyNow = SVR_RY * (1.0 + breath * 0.09);

  // Rotation angle for SVR arrows (shows the ring's circulation)
  const rotT = (frame % (fps * 6)) / (fps * 6); // slow 6s rotation

  // Page frame
  const FRAME = { x: 60, y: 130, w: 960, h: 760 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W; // = ~0.889

  // Airflow seed drift: streaks loop upward across the frame
  // Scrolling y offset
  const streakScroll = (frame / fps) * 70; // px per second upward motion

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Paper warm vignette — subtle tea stain */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="paper-glow" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor={PAPER_HI} stopOpacity={1} />
            <stop offset="55%" stopColor={PAPER} stopOpacity={1} />
            <stop offset="100%" stopColor={PAPER_LO} stopOpacity={1} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={1080} height={1350} fill="url(#paper-glow)" />
      </svg>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: INK_FAINT,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 10 · 04</span>
      </div>

      {/* Drafting board + schematic */}
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
              strokeWidth={0.75}
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

          {/* Pappus filament gradient — slightly brighter at tips */}
          <linearGradient id="filament" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={INK} stopOpacity={0.95} />
            <stop offset="100%" stopColor={INK_SOFT} stopOpacity={0.6} />
          </linearGradient>

          {/* SVR gradient: toroidal vortex, mid-ring brightest */}
          <radialGradient id="svr-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={YELLOW} stopOpacity={0} />
            <stop offset="60%" stopColor={YELLOW} stopOpacity={0.08} />
            <stop offset="92%" stopColor={YELLOW} stopOpacity={0.0} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0.0} />
          </radialGradient>
        </defs>

        {/* Drafting board */}
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

        {/* Inner hairline border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={INK_FAINT}
          strokeOpacity={0.55}
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
          <g key={i} stroke={AMBER} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Axis label top-left: FIG */}
        <g
          transform={`translate(${FRAME.x + 22}, ${FRAME.y + 32})`}
          fill={INK_FAINT}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text textAnchor="start">FIG. 1 / SCHEMATIC</text>
        </g>

        {/* Scale bar — bottom right of drafting frame */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 170}, ${FRAME.y + FRAME.h - 30})`}
          stroke={INK_FAINT}
          fill={INK_FAINT}
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

        {/* Compass → vertical airflow indicator */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 42}, ${FRAME.y + 36})`}
          fill={INK_FAINT}
          fontFamily={inter}
          fontWeight={600}
          fontSize={10}
          letterSpacing={2.8}
        >
          <text textAnchor="middle" y={-6}>FLOW</text>
          <line x1={0} y1={2} x2={0} y2={20} stroke={AMBER} strokeWidth={1.3} />
          <polygon points="-4,4 0,-4 4,4" fill={AMBER} />
        </g>

        {/* MAIN CONTENT — map coords transformed into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Airflow streaklines — rising past the seed, deflected around the pappus */}
          <g>
            {STREAKS.map((s, i) => {
              const period = MAP_H + 240;
              const baseY = (MAP_H + 140) - ((s.phase * period + streakScroll * s.speed) % period);
              const len = 72;
              const curve = s.curve * 20;
              // Push air outward near the pappus hub (vortex zone)
              const dxFromHub = s.x - HUB_X;
              const dyFromHub = baseY - HUB_Y;
              const dist = Math.hypot(dxFromHub, dyFromHub);
              const push = Math.max(0, 160 - dist) * 0.5;
              const deflect = (dxFromHub / (dist + 1e-3)) * push;
              const sx = s.x;
              const sy = baseY + len;
              const ex = s.x + deflect * 1.1;
              const ey = baseY;
              const mx = (sx + ex) / 2 + curve + deflect * 0.5;
              const my = (sy + ey) / 2;
              // Dampen streaks whose midpoint falls inside the pappus/SVR region
              const midDxHub = mx - HUB_X;
              const midDyHub = my - HUB_Y;
              const midDistHub = Math.hypot(midDxHub, midDyHub);
              const pappusMask = midDistHub < 180 ? Math.max(0.08, midDistHub / 180) : 1;
              const midDxSvr = mx - SVR_CX;
              const midDySvr = (my - SVR_CY) * (SVR_RX / Math.max(10, SVR_RY));
              const svrDist = Math.hypot(midDxSvr, midDySvr);
              const svrMask = svrDist < SVR_RX ? Math.max(0.1, svrDist / SVR_RX) : 1;
              const alpha = s.alpha * growEased * pappusMask * svrMask;
              const dx = ex - mx;
              const dy = ey - my;
              const dl = Math.hypot(dx, dy) || 1;
              const ux = dx / dl;
              const uy = dy / dl;
              const nx = -uy;
              const ny = ux;
              const aSize = 4;
              return (
                <g key={i}>
                  <path
                    d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
                    stroke={INK}
                    strokeOpacity={alpha * 0.7}
                    strokeWidth={0.9}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <polygon
                    points={`${ex},${ey} ${ex - ux * aSize + nx * aSize * 0.55},${ey - uy * aSize + ny * aSize * 0.55} ${ex - ux * aSize - nx * aSize * 0.55},${ey - uy * aSize - ny * aSize * 0.55}`}
                    fill={INK}
                    opacity={alpha * 0.9}
                  />
                </g>
              );
            })}
          </g>

          {/* SVR — Separated Vortex Ring (above pappus) */}
          <g opacity={svrSpring}>
            {/* soft bloom — tight toroidal halo, kept clear of the pappus */}
            <ellipse
              cx={SVR_CX}
              cy={SVR_CY}
              rx={svrRxNow * 1.04}
              ry={svrRyNow * 1.25}
              fill="url(#svr-fill)"
            />
            {/* Nested ring outlines — outer and mid-core */}
            <ellipse
              cx={SVR_CX}
              cy={SVR_CY}
              rx={svrRxNow}
              ry={svrRyNow}
              fill="none"
              stroke={AMBER}
              strokeOpacity={0.72}
              strokeWidth={1.4}
            />
            <ellipse
              cx={SVR_CX}
              cy={SVR_CY}
              rx={svrRxNow * 0.72}
              ry={svrRyNow * 0.72}
              fill="none"
              stroke={AMBER}
              strokeOpacity={0.55}
              strokeWidth={1.1}
              strokeDasharray="5 4"
            />
            <ellipse
              cx={SVR_CX}
              cy={SVR_CY}
              rx={svrRxNow * 0.4}
              ry={svrRyNow * 0.4}
              fill="none"
              stroke={AMBER}
              strokeOpacity={0.38}
              strokeWidth={0.9}
              strokeDasharray="3 3"
            />
            {/* Twin side-lobe strokes to suggest torus cross-section */}
            <circle
              cx={SVR_CX - svrRxNow}
              cy={SVR_CY}
              r={svrRyNow * 0.72}
              fill="none"
              stroke={AMBER}
              strokeOpacity={0.55}
              strokeWidth={1.1}
            />
            <circle
              cx={SVR_CX + svrRxNow}
              cy={SVR_CY}
              r={svrRyNow * 0.72}
              fill="none"
              stroke={AMBER}
              strokeOpacity={0.55}
              strokeWidth={1.1}
            />
            {/* Rotation arrows along the outer ring */}
            {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((baseA, i) => {
              const a = baseA + rotT * Math.PI * 2;
              const rx = svrRxNow;
              const ry = svrRyNow;
              const px = SVR_CX + Math.cos(a) * rx;
              const py = SVR_CY + Math.sin(a) * ry;
              const tx = -Math.sin(a) * rx;
              const ty = Math.cos(a) * ry;
              const tl = Math.hypot(tx, ty);
              const ux = tx / tl;
              const uy = ty / tl;
              const nx = -uy;
              const ny = ux;
              const size = 13;
              const tipX = px + ux * size;
              const tipY = py + uy * size;
              const baseLX = px - ux * 2 + nx * size * 0.68;
              const baseLY = py - uy * 2 + ny * size * 0.68;
              const baseRX = px - ux * 2 - nx * size * 0.68;
              const baseRY = py - uy * 2 - ny * size * 0.68;
              return (
                <g key={i}>
                  <polygon
                    points={`${tipX},${tipY} ${baseLX},${baseLY} ${baseRX},${baseRY}`}
                    fill={AMBER}
                    stroke={INK}
                    strokeWidth={0.6}
                  />
                </g>
              );
            })}
            {/* Center labels: SVR text and tiny recirculation glyph */}
            <text
              x={SVR_CX}
              y={SVR_CY + 4}
              textAnchor="middle"
              fill={AMBER}
              fontFamily={inter}
              fontWeight={600}
              fontSize={11}
              letterSpacing={4}
              opacity={0.78}
            >
              SVR
            </text>
          </g>

          {/* PAPPUS — ghost filaments (depth layer) */}
          <g>
            {GHOST_FILAMENTS.map((f, i) => {
              const { d } = filamentPath(f);
              const len = filamentLen(f);
              const delay = 0.05 + (i / GHOST_FILAMENTS.length) * 0.25;
              const localT = Math.max(0, Math.min(1, (grow - delay) / 0.55));
              const eased = 1 - Math.pow(1 - localT, 3);
              const dashOffset = len * (1 - eased);
              return (
                <path
                  key={`g-${i}`}
                  d={d}
                  stroke={INK_SOFT}
                  strokeOpacity={f.alpha}
                  strokeWidth={f.thickness}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={len}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
          </g>

          {/* PAPPUS — primary filaments */}
          <g>
            {FILAMENTS.map((f, i) => {
              const { d, tip } = filamentPath(f);
              const len = filamentLen(f);
              const delay = (i / FILAMENTS.length) * 0.3;
              const localT = Math.max(0, Math.min(1, (grow - delay) / 0.6));
              const eased = 1 - Math.pow(1 - localT, 3);
              const dashOffset = len * (1 - eased);
              const alpha = 0.72 + (((Math.sin(i * 1.37 + 0.4) * 10000) % 1 + 1) % 1) * 0.28;
              return (
                <g key={i}>
                  <path
                    d={d}
                    stroke={INK}
                    strokeOpacity={alpha}
                    strokeWidth={f.thickness}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={len}
                    strokeDashoffset={dashOffset}
                  />
                  {/* Tiny tip plume — just a dot, more organic than a crosshair */}
                  {eased > 0.9 && (
                    <circle
                      cx={tip[0]}
                      cy={tip[1]}
                      r={0.9}
                      fill={INK}
                      opacity={0.6}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* HUB — tiny node where filaments converge */}
          <circle cx={HUB_X} cy={HUB_Y} r={4.5} fill={INK} />
          <circle cx={HUB_X} cy={HUB_Y} r={2.0} fill={YELLOW} />

          {/* BEAK — thin shaft from hub to achene */}
          <line
            x1={HUB_X}
            y1={HUB_Y + 4}
            x2={HUB_X}
            y2={HUB_Y + BEAK_LEN}
            stroke={INK}
            strokeWidth={1.5}
            opacity={Math.min(1, grow * 2)}
          />
          {/* small tick marks along the beak (engineering style) */}
          {[0.3, 0.5, 0.7].map((p, i) => (
            <line
              key={i}
              x1={HUB_X - 3}
              y1={HUB_Y + BEAK_LEN * p}
              x2={HUB_X + 3}
              y2={HUB_Y + BEAK_LEN * p}
              stroke={INK_SOFT}
              strokeWidth={0.9}
              opacity={Math.min(1, grow * 2)}
            />
          ))}

          {/* ACHENE — elongated seed body with ribs */}
          <g opacity={Math.min(1, grow * 2)}>
            <path
              d={`M ${HUB_X} ${HUB_Y + BEAK_LEN}
                  C ${HUB_X - ACHENE_W} ${HUB_Y + BEAK_LEN + 20},
                    ${HUB_X - ACHENE_W} ${HUB_Y + BEAK_LEN + ACHENE_LEN - 20},
                    ${HUB_X} ${HUB_Y + BEAK_LEN + ACHENE_LEN}
                  C ${HUB_X + ACHENE_W} ${HUB_Y + BEAK_LEN + ACHENE_LEN - 20},
                    ${HUB_X + ACHENE_W} ${HUB_Y + BEAK_LEN + 20},
                    ${HUB_X} ${HUB_Y + BEAK_LEN}
                  Z`}
              fill={INK}
              stroke={INK}
              strokeWidth={0.8}
            />
            {/* longitudinal ribs */}
            {[-5, -2.5, 0, 2.5, 5].map((off, i) => (
              <path
                key={i}
                d={`M ${HUB_X + off * 0.4} ${HUB_Y + BEAK_LEN + 8}
                    Q ${HUB_X + off} ${HUB_Y + BEAK_LEN + ACHENE_LEN / 2}
                      ${HUB_X + off * 0.4} ${HUB_Y + BEAK_LEN + ACHENE_LEN - 8}`}
                stroke={PAPER}
                strokeOpacity={0.35}
                strokeWidth={0.6}
                fill="none"
              />
            ))}
            {/* tiny spines on upper achene */}
            {[0.14, 0.22, 0.3, 0.38].map((p, i) => (
              <g key={i}>
                <line
                  x1={HUB_X - 4}
                  y1={HUB_Y + BEAK_LEN + ACHENE_LEN * p}
                  x2={HUB_X - 8}
                  y2={HUB_Y + BEAK_LEN + ACHENE_LEN * p - 2}
                  stroke={INK}
                  strokeWidth={0.9}
                />
                <line
                  x1={HUB_X + 4}
                  y1={HUB_Y + BEAK_LEN + ACHENE_LEN * p}
                  x2={HUB_X + 8}
                  y2={HUB_Y + BEAK_LEN + ACHENE_LEN * p - 2}
                  stroke={INK}
                  strokeWidth={0.9}
                />
              </g>
            ))}
            {/* achene tip (pointed base) */}
            <polygon
              points={`${HUB_X - 1.5},${HUB_Y + BEAK_LEN + ACHENE_LEN}
                       ${HUB_X + 1.5},${HUB_Y + BEAK_LEN + ACHENE_LEN}
                       ${HUB_X},${HUB_Y + BEAK_LEN + ACHENE_LEN + 10}`}
              fill={INK}
            />
          </g>

          {/* CALLOUTS — right-side technical labels */}
          <g opacity={calloutOpacity}>
            {/* 1. SVR callout */}
            <g>
              <line
                x1={SVR_CX + SVR_RX - 20}
                y1={SVR_CY - 10}
                x2={850}
                y2={SVR_CY - 60}
                stroke={AMBER}
                strokeWidth={1.2}
              />
              <line
                x1={850}
                y1={SVR_CY - 60}
                x2={990}
                y2={SVR_CY - 60}
                stroke={AMBER}
                strokeWidth={1.2}
              />
              <circle
                cx={SVR_CX + SVR_RX - 20}
                cy={SVR_CY - 10}
                r={3.5}
                fill={YELLOW}
                stroke={INK}
                strokeWidth={1}
              />
              <text
                x={858}
                y={SVR_CY - 70}
                fill={INK}
                fontFamily={inter}
                fontSize={14}
                fontWeight={600}
                letterSpacing={3.2}
              >
                SEPARATED
              </text>
              <text
                x={858}
                y={SVR_CY - 52}
                fill={INK}
                fontFamily={inter}
                fontSize={14}
                fontWeight={600}
                letterSpacing={3.2}
              >
                VORTEX RING
              </text>
              <text
                x={858}
                y={SVR_CY - 32}
                fill={AMBER}
                fontFamily={inter}
                fontSize={12}
                fontWeight={500}
                letterSpacing={2.4}
              >
                detached · stable
              </text>
            </g>

            {/* 2. Pappus filaments callout */}
            <g>
              <line
                x1={HUB_X + 155}
                y1={HUB_Y - 15}
                x2={820}
                y2={HUB_Y + 20}
                stroke={AMBER}
                strokeWidth={1.2}
              />
              <line
                x1={820}
                y1={HUB_Y + 20}
                x2={990}
                y2={HUB_Y + 20}
                stroke={AMBER}
                strokeWidth={1.2}
              />
              <circle
                cx={HUB_X + 155}
                cy={HUB_Y - 15}
                r={3.5}
                fill={YELLOW}
                stroke={INK}
                strokeWidth={1}
              />
              <text
                x={828}
                y={HUB_Y + 10}
                fill={INK}
                fontFamily={inter}
                fontSize={14}
                fontWeight={600}
                letterSpacing={3.2}
              >
                ~100 PAPPUS
              </text>
              <text
                x={828}
                y={HUB_Y + 28}
                fill={INK}
                fontFamily={inter}
                fontSize={14}
                fontWeight={600}
                letterSpacing={3.2}
              >
                FILAMENTS
              </text>
              <text
                x={828}
                y={HUB_Y + 48}
                fill={AMBER}
                fontFamily={inter}
                fontSize={12}
                fontWeight={500}
                letterSpacing={2.4}
              >
                90% porous disk
              </text>
            </g>

            {/* 3. Achene callout */}
            <g>
              <line
                x1={HUB_X + 10}
                y1={HUB_Y + BEAK_LEN + ACHENE_LEN / 2}
                x2={820}
                y2={HUB_Y + BEAK_LEN + ACHENE_LEN / 2 + 10}
                stroke={AMBER}
                strokeWidth={1.2}
              />
              <line
                x1={820}
                y1={HUB_Y + BEAK_LEN + ACHENE_LEN / 2 + 10}
                x2={990}
                y2={HUB_Y + BEAK_LEN + ACHENE_LEN / 2 + 10}
                stroke={AMBER}
                strokeWidth={1.2}
              />
              <circle
                cx={HUB_X + 10}
                cy={HUB_Y + BEAK_LEN + ACHENE_LEN / 2}
                r={3.5}
                fill={YELLOW}
                stroke={INK}
                strokeWidth={1}
              />
              <text
                x={828}
                y={HUB_Y + BEAK_LEN + ACHENE_LEN / 2}
                fill={INK}
                fontFamily={inter}
                fontSize={14}
                fontWeight={600}
                letterSpacing={3.2}
              >
                ACHENE
              </text>
              <text
                x={828}
                y={HUB_Y + BEAK_LEN + ACHENE_LEN / 2 + 20}
                fill={AMBER}
                fontFamily={inter}
                fontSize={12}
                fontWeight={500}
                letterSpacing={2.4}
              >
                payload · ~1 mg
              </text>
            </g>

            {/* 4. Drag coefficient note (bottom right of frame) */}
            <g transform="translate(820, 720)">
              <text
                fill={INK}
                fontFamily={inter}
                fontSize={14}
                fontWeight={600}
                letterSpacing={3}
              >
                4× DRAG / AREA
              </text>
              <text
                y={20}
                fill={AMBER}
                fontFamily={inter}
                fontSize={12}
                fontWeight={500}
                letterSpacing={2.4}
              >
                vs. solid disk
              </text>
            </g>
          </g>
        </g>

        {/* Caption strip just below drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 24})`}
          fill={INK_FAINT}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · TARAXACUM OFFICINALE — FLIGHT CONFIGURATION</text>
          <text x={FRAME.w} textAnchor="end" fill={AMBER}>
            SEPARATED VORTEX RING, Re ≈ 100
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 960,
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
          Role <span style={{ color: INK_FAINT, margin: "0 4px" }}>/</span>
          <span style={{ color: INK, letterSpacing: 5 }}>
            Aerospace Engineer
          </span>
        </div>

        <div
          style={{
            color: INK,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The flying
          <br />
          engineer.
        </div>

        <div
          style={{
            marginTop: 28,
            color: INK_SOFT,
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          The dandelion seed flies on a{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            separated vortex ring
          </span>{" "}
          — a stable detached vortex sitting above ~100 porous pappus filaments,
          producing four times the drag per unit area of a solid disk. A flight
          regime no human aircraft has achieved.
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
          color: INK_FAINT,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Cummins et al. · Nature 562 (2018) 414–418</span>
        <span>
          <span style={{ color: YELLOW }}>●</span> Vortex = Lift
        </span>
      </div>
    </AbsoluteFill>
  );
};
