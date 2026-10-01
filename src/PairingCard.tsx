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

// ── Palette (from the horseshoe crab + its hemolymph) ────────────────
const INK = "#07111F";
const PANEL = "#0D1A2A";
const BRONZE = "#3C2A1A";
const BRONZE_EDGE = "#5A4027";
const SAND = "#8A6E42";
const SHORE = "#D9C19A";
const COBALT = "#2E8BC9";
const COBALT_GLOW = "#9ED2F2";
const GRAY = "#6E7889";
const GRID = "#13202F";
const GRID_MAJOR = "#1A2A3E";

// ── Deterministic seeded RNG (mulberry32) ─────────────────────────────
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Coagulation thread graph ──────────────────────────────────────────
// Seeded dendritic growth from the cardiac sinus. Each thread is a
// quadratic path from (x0,y0) → (x1,y1) with a slight bend.
type Thread = {
  d: string;
  len: number;
  delay: number; // 0..1
  width: number;
  branchOf: number; // -1 primary, else index of parent
};

// Sinus sits on the opisthosoma midline — the pericardial membrane,
// which is where phlebotomists actually insert the needle on Limulus.
const SINUS = { x: 540, y: 584 };
// Frame crop for the coagulation field (keep it inside the lab plate):
const FIELD = { x: 95, y: 150, w: 890, h: 700 };

const inField = (x: number, y: number): boolean =>
  x >= FIELD.x && x <= FIELD.x + FIELD.w && y >= FIELD.y && y <= FIELD.y + FIELD.h;

const buildThreads = (): Thread[] => {
  const r = rng(20261001);
  const threads: Thread[] = [];
  const PRIMARIES = 56;

  const pushThread = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    bendAmt: number,
    delay: number,
    width: number,
    branchOf: number,
  ) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 6) return null;
    const nx = -dy / len;
    const ny = dx / len;
    const mx = (x0 + x1) / 2 + nx * bendAmt;
    const my = (y0 + y1) / 2 + ny * bendAmt;
    const t: Thread = {
      d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} Q ${mx.toFixed(2)} ${my.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      len,
      delay,
      width,
      branchOf,
    };
    threads.push(t);
    return t;
  };

  for (let i = 0; i < PRIMARIES; i++) {
    // Avoid cardinal clusters by jittered uniform angles.
    const base = (i / PRIMARIES) * Math.PI * 2;
    const theta = base + (r() - 0.5) * 0.14;
    // Slight downward bias to catch the empty bottom quadrant, but keep
    // the field feeling radial.
    const southness = Math.sin(theta); // −1 up … +1 down
    const length = 170 + r() * 230 + Math.max(0, southness) * 100;
    let x1 = SINUS.x + Math.cos(theta) * length;
    let y1 = SINUS.y + Math.sin(theta) * length;
    // Keep inside field
    if (!inField(x1, y1)) {
      const scale = Math.min(
        Math.abs((FIELD.x + 20 - SINUS.x) / Math.max(1e-6, Math.cos(theta))),
        Math.abs((FIELD.x + FIELD.w - 20 - SINUS.x) / Math.max(1e-6, Math.cos(theta))),
        Math.abs((FIELD.y + 20 - SINUS.y) / Math.max(1e-6, Math.sin(theta))),
        Math.abs((FIELD.y + FIELD.h - 20 - SINUS.y) / Math.max(1e-6, Math.sin(theta))),
      );
      x1 = SINUS.x + Math.cos(theta) * scale;
      y1 = SINUS.y + Math.sin(theta) * scale;
    }
    const bend = (r() - 0.5) * length * 0.22;
    const delay = 0.08 + r() * 0.35;
    const w = 1.1 + r() * 0.9;
    const primary = pushThread(SINUS.x, SINUS.y, x1, y1, bend, delay, w, -1);

    if (!primary) continue;

    // 3-5 sub-branches sprouting mid-thread, with grand-children
    const nSubs = 3 + Math.floor(r() * 3);
    for (let s = 0; s < nSubs; s++) {
      const tStart = 0.35 + r() * 0.5;
      const sx = SINUS.x + (x1 - SINUS.x) * tStart;
      const sy = SINUS.y + (y1 - SINUS.y) * tStart;
      const branchAngle = theta + (r() - 0.5) * 1.3;
      const subLen = 30 + r() * 110;
      let bx = sx + Math.cos(branchAngle) * subLen;
      let by = sy + Math.sin(branchAngle) * subLen;
      if (!inField(bx, by)) {
        bx = sx + Math.cos(branchAngle) * subLen * 0.4;
        by = sy + Math.sin(branchAngle) * subLen * 0.4;
      }
      const subBend = (r() - 0.5) * subLen * 0.3;
      const subDelay = delay + 0.08 + r() * 0.18;
      const subW = Math.max(0.6, w * (0.55 + r() * 0.25));
      pushThread(sx, sy, bx, by, subBend, subDelay, subW, threads.length - 1 - s);
    }
  }

  return threads;
};

const THREADS = buildThreads();

// ── Horseshoe crab silhouette (Limulus polyphemus, dorsal view) ──────
// Simple, legible, in proportion:
//   full body width ≈ 500 px, prosoma depth ≈ 340, opisthosoma visible
//   depth ≈ 136, telson length ≈ 230. Carapace centre (540, 420).

// Prosoma — a smooth, closed horseshoe dome. The characteristic cornual
// spines are hinted at with a small inward sweep at the back corners,
// not drawn as separate projections.
const PROSOMA_D =
  "M 310 542 " +
  "C 290 448, 304 322, 380 262 " +
  "C 438 218, 498 208, 540 208 " +
  "C 582 208, 642 218, 700 262 " +
  "C 776 322, 790 448, 770 542 " +
  "Z";

// Opisthosoma — hexagonal plate (top portion hidden under prosoma back)
const OPISTHOSOMA_D =
  "M 384 528 " +
  "L 384 592 " +
  "L 418 644 " +
  "L 468 672 " +
  "L 540 684 " +
  "L 612 672 " +
  "L 662 644 " +
  "L 696 592 " +
  "L 696 528 " +
  "Z";

// Movable spines (small backward-pointing nubs on opisthosoma margins).
// Keep them small and clearly on the visible plate, not at the hinge.
const SPINE_POINTS: Array<[number, number, number]> = [
  [386, 568, 8],
  [388, 588, 8],
  [398, 610, 8],
  [416, 634, 8],
  [694, 568, -8],
  [692, 588, -8],
  [682, 610, -8],
  [664, 634, -8],
];

// Telson (long tapering tail spike)
const TELSON_D =
  "M 528 684 " +
  "L 552 684 " +
  "L 544 882 " +
  "L 540 898 " +
  "L 536 882 " +
  "Z";

// Compound eyes — vertical ovals on the lateral ridges, no rotation
const EYE_LEFT = { cx: 390, cy: 346, rx: 9, ry: 16 };
const EYE_RIGHT = { cx: 690, cy: 346, rx: 9, ry: 16 };
const OCELLI = [
  { cx: 533, cy: 258, r: 2.6 },
  { cx: 547, cy: 258, r: 2.6 },
];

// Dorsal ridge/midline on prosoma (subtle highlight line)
const RIDGE_D = "M 540 212 C 538 300, 542 420, 540 528";

// ── Component ─────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timings ────────────────────────────────────────────────────────
  const T_GRID = fps * 0.0;
  const T_CRAB = fps * 0.3;
  const T_SINUS = fps * 1.0;
  const T_WEB = fps * 1.4;
  const T_TITLE = fps * 1.1;
  const T_HOOK = fps * 1.9;

  const gridOp = interpolate(frame, [T_GRID, T_GRID + fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const crabOp = interpolate(frame, [T_CRAB, T_CRAB + fps * 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const crabY = interpolate(frame, [T_CRAB, T_CRAB + fps * 1.0], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const sinusSpring = spring({
    frame: frame - T_SINUS,
    fps,
    config: { damping: 10, stiffness: 160, mass: 0.6 },
  });

  const webTime = Math.max(0, frame - T_WEB) / (fps * 2.6);

  const titleSpring = spring({
    frame: frame - T_TITLE,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [T_HOOK, T_HOOK + fps * 1.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle sinus pulse (continuous)
  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 1.4);

  // ── Page layout ───────────────────────────────────────────────────
  const FRAME = { x: 60, y: 130, w: 960, h: 790 };

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
        <span style={{ color: COBALT }}>2026 · 10 · 01</span>
      </div>

      {/* Specimen plate */}
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

          <radialGradient id="panel-vignette" cx="50%" cy="42%" r="78%">
            <stop offset="0%" stopColor="#102033" stopOpacity={1} />
            <stop offset="100%" stopColor={PANEL} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="dish" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COBALT} stopOpacity={0.18} />
            <stop offset="55%" stopColor={COBALT} stopOpacity={0.05} />
            <stop offset="100%" stopColor={COBALT} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="carapace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRONZE_EDGE} />
            <stop offset="55%" stopColor={BRONZE} />
            <stop offset="100%" stopColor="#2A1C10" />
          </linearGradient>

          <radialGradient id="sinus-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COBALT_GLOW} stopOpacity={1} />
            <stop offset="30%" stopColor={COBALT} stopOpacity={0.75} />
            <stop offset="100%" stopColor={COBALT} stopOpacity={0} />
          </radialGradient>

          <filter id="thread-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="soft-blur">
            <feGaussianBlur stdDeviation="2" />
          </filter>

          <clipPath id="plate-clip">
            <rect
              x={FRAME.x + 1}
              y={FRAME.y + 1}
              width={FRAME.w - 2}
              height={FRAME.h - 2}
              rx={2}
            />
          </clipPath>
        </defs>

        {/* Lab plate */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#panel-vignette)"
        />
        <g opacity={gridOp}>
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
          stroke="#1D2A3B"
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
          <g key={i} stroke={SAND} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Specimen tag — upper-left of plate */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.4}
        >
          <text textAnchor="start">PLATE III · DORSAL</text>
        </g>

        {/* Scale bar — bottom right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 180}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={SAND}
          fill={SAND}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={120} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={60} y1={-3} x2={60} y2={3} strokeWidth={1.2} />
          <line x1={120} y1={-5} x2={120} y2={5} strokeWidth={1.2} />
          <text x={130} y={4} stroke="none">
            25 CM
          </text>
        </g>

        {/* Everything inside the plate is clipped */}
        <g clipPath="url(#plate-clip)">
          {/* Faint petri-dish reference circle behind the crab */}
          <g opacity={gridOp * 0.9}>
            <circle
              cx={540}
              cy={510}
              r={400}
              fill="url(#dish)"
            />
            <circle
              cx={540}
              cy={510}
              r={400}
              fill="none"
              stroke={COBALT}
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <circle
              cx={540}
              cy={510}
              r={330}
              fill="none"
              stroke={COBALT}
              strokeOpacity={0.06}
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          </g>

          {/* ── Coagulation threads (grow outward from sinus) ──── */}
          <g filter="url(#thread-glow)">
            {THREADS.map((t, i) => {
              const localT = (webTime - t.delay) / 0.55;
              const grow = Math.max(0, Math.min(1, localT));
              const eased = 1 - Math.pow(1 - grow, 2.6);
              const offset = t.len * (1 - eased);
              return (
                <path
                  key={`thread-${i}`}
                  d={t.d}
                  stroke={COBALT}
                  strokeWidth={t.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={t.len}
                  strokeDashoffset={offset}
                  strokeOpacity={0.78 * eased}
                />
              );
            })}
          </g>
          {/* Threads bright core */}
          {THREADS.map((t, i) => {
            const localT = (webTime - t.delay) / 0.55;
            const grow = Math.max(0, Math.min(1, localT));
            const eased = 1 - Math.pow(1 - grow, 2.6);
            const offset = t.len * (1 - eased);
            return (
              <path
                key={`thread-core-${i}`}
                d={t.d}
                stroke={COBALT_GLOW}
                strokeWidth={Math.max(0.5, t.width * 0.42)}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={t.len}
                strokeDashoffset={offset}
                strokeOpacity={0.6 * eased}
              />
            );
          })}

          {/* ── Horseshoe crab ─────────────────────────────────── */}
          <g
            opacity={crabOp}
            transform={`translate(0, ${crabY})`}
          >
            {/* Soft underbody shadow */}
            <ellipse
              cx={540}
              cy={895}
              rx={230}
              ry={10}
              fill="#000"
              opacity={0.4}
              filter="url(#soft-blur)"
            />

            {/* Telson */}
            <path d={TELSON_D} fill={BRONZE} stroke={BRONZE_EDGE} strokeWidth={1} />
            <line
              x1={540}
              y1={678}
              x2={540}
              y2={890}
              stroke={SAND}
              strokeWidth={0.9}
              strokeOpacity={0.3}
            />

            {/* Opisthosoma — drawn BEFORE prosoma so prosoma back covers the hinge */}
            <path
              d={OPISTHOSOMA_D}
              fill={BRONZE}
              stroke={BRONZE_EDGE}
              strokeWidth={1.3}
            />
            {/* Soft cast shadow of prosoma onto opisthosoma for depth */}
            <ellipse
              cx={540}
              cy={548}
              rx={150}
              ry={10}
              fill="#000"
              opacity={0.32}
              filter="url(#soft-blur)"
            />
            {/* Opisthosoma segmentation (6 somites, visible below prosoma hinge) */}
            {[552, 570, 588, 606, 624, 642].map((y) => {
              // Narrow the lines near the pointed bottom
              const taper = Math.max(0, (y - 620) * 1.4);
              return (
                <line
                  key={`seg-${y}`}
                  x1={400 + taper}
                  y1={y}
                  x2={680 - taper}
                  y2={y}
                  stroke={BRONZE_EDGE}
                  strokeOpacity={0.55}
                  strokeWidth={0.9}
                />
              );
            })}
            {/* Opisthosoma dorsal midline ridge */}
            <line
              x1={540}
              y1={548}
              x2={540}
              y2={670}
              stroke={BRONZE_EDGE}
              strokeOpacity={0.55}
              strokeWidth={0.9}
            />
            {/* Movable spines */}
            {SPINE_POINTS.map(([x, y, s], i) => (
              <path
                key={`sp-${i}`}
                d={`M ${x} ${y} l ${s} 5 l 0 -10 Z`}
                fill={BRONZE_EDGE}
              />
            ))}

            {/* Prosoma (cephalothorax) — on top of opisthosoma hinge */}
            <path
              d={PROSOMA_D}
              fill="url(#carapace)"
              stroke={BRONZE_EDGE}
              strokeWidth={1.6}
            />
            {/* Prosoma dorsal ridge (highlight) */}
            <path
              d={RIDGE_D}
              stroke={SAND}
              strokeWidth={1.2}
              strokeOpacity={0.55}
              fill="none"
            />
            {/* Prosoma rim highlight (just inside outline) */}
            <path
              d="M 312 536 C 294 442, 310 322, 384 266 C 440 224, 500 214, 540 214 C 580 214, 640 224, 696 266 C 770 322, 786 442, 768 536"
              fill="none"
              stroke={SAND}
              strokeOpacity={0.3}
              strokeWidth={1.1}
            />
            {/* Secondary lateral ridges (two swept arcs on the carapace) */}
            <path
              d="M 400 530 C 384 420, 436 290, 540 262"
              fill="none"
              stroke={SAND}
              strokeOpacity={0.22}
              strokeWidth={0.9}
            />
            <path
              d="M 680 530 C 696 420, 644 290, 540 262"
              fill="none"
              stroke={SAND}
              strokeOpacity={0.22}
              strokeWidth={0.9}
            />

            {/* Compound eyes — vertical ovals, no highlight */}
            {[EYE_LEFT, EYE_RIGHT].map((e, i) => (
              <ellipse
                key={`eye-${i}`}
                cx={e.cx}
                cy={e.cy}
                rx={e.rx}
                ry={e.ry}
                fill="#1A0D05"
                stroke={BRONZE_EDGE}
                strokeOpacity={0.6}
                strokeWidth={0.8}
              />
            ))}
            {/* Median ocelli (tiny simple eyes on the midline) */}
            {OCELLI.map((o, i) => (
              <circle
                key={`oc-${i}`}
                cx={o.cx}
                cy={o.cy}
                r={o.r}
                fill="#120A05"
              />
            ))}

            {/* Cardiac sinus annotation — leader exits via the right
                opisthosoma margin into the free field, not through
                any shell structure. */}
            <g
              opacity={interpolate(frame, [T_SINUS, T_SINUS + fps * 0.6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            >
              <line
                x1={SINUS.x + 6}
                y1={SINUS.y + 2}
                x2={760}
                y2={706}
                stroke={COBALT}
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              <line
                x1={760}
                y1={706}
                x2={930}
                y2={706}
                stroke={COBALT}
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              {/* Legibility chip behind callout text */}
              <rect
                x={760}
                y={684}
                width={176}
                height={38}
                fill={INK}
                opacity={0.78}
                rx={1}
              />
              <text
                x={930}
                y={700}
                textAnchor="end"
                fill={COBALT_GLOW}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={2.8}
                fontWeight={600}
              >
                CARDIAC SINUS
              </text>
              <text
                x={930}
                y={716}
                textAnchor="end"
                fill={SHORE}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={2.2}
                fontWeight={500}
              >
                Cu-HAEMOCYANIN · pH 7.4
              </text>
            </g>
          </g>

          {/* ── Sinus droplet (cobalt pulse) ───────────────────── */}
          <g>
            <circle
              cx={SINUS.x}
              cy={SINUS.y}
              r={28 + pulse * 10}
              fill="url(#sinus-glow)"
              opacity={0.55 * sinusSpring}
            />
            <circle
              cx={SINUS.x}
              cy={SINUS.y}
              r={10 + pulse * 1.5}
              fill={COBALT}
              opacity={sinusSpring}
            />
            <circle
              cx={SINUS.x - 2}
              cy={SINUS.y - 3}
              r={3.4}
              fill={COBALT_GLOW}
              opacity={sinusSpring}
            />
          </g>

          {/* Caption on plate */}
          <g
            transform={`translate(${FRAME.x + 26}, ${FRAME.y + FRAME.h - 28})`}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            <text>
              FIG. 1 · <tspan fill={SHORE}>LIMULUS POLYPHEMUS</tspan> · DORSAL VIEW
            </text>
          </g>

          {/* Right-side callout: LAL assay */}
          <g
            opacity={interpolate(frame, [T_WEB + fps * 0.4, T_WEB + fps * 1.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <text
              x={FRAME.x + FRAME.w - 26}
              y={FRAME.y + 56}
              textAnchor="end"
              fill={COBALT_GLOW}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3.4}
              fontWeight={600}
            >
              LAL ASSAY · GEL-CLOT
            </text>
            <text
              x={FRAME.x + FRAME.w - 26}
              y={FRAME.y + 72}
              textAnchor="end"
              fill={SAND}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.6}
              fontWeight={500}
            >
              DETECTION LIMIT ≈ 10⁻¹² g · mL⁻¹
            </text>
          </g>
        </g>
      </svg>

      {/* ── Type lockup ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 970,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: COBALT,
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
            Clinical Pathologist
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The ancient doctor
          <br />
          in your medicine.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          The horseshoe crab's copper-based blue blood clots in the presence
          of about{" "}
          <span style={{ color: COBALT_GLOW, fontWeight: 600 }}>
            10⁻¹² g of bacterial endotoxin per millilitre
          </span>
          . Since the FDA cleared the{" "}
          <span style={{ color: COBALT_GLOW, fontWeight: 600 }}>
            LAL assay
          </span>{" "}
          in 1977, every injectable drug and every vaccine has had to pass
          this 450-million-year-old animal before it reaches a human arm.
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
        <span>Levin & Bang · Bull. Johns Hopkins Hosp. 115 (1964)</span>
        <span>
          <span style={{ color: COBALT }}>●</span> Hemocyanin · Cu(II)
        </span>
      </div>
    </AbsoluteFill>
  );
};
