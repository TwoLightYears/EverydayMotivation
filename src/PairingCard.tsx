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
const INK = "#0B0C10";
const BOARD = "#101218";
const BEE = "#F2B705";
const AMBER = "#F58A0C";
const WAX = "#F5E8C7";
const GRAY = "#8A8F99";
const GRID = "#1A1D25";
const GRID_MAJOR = "#232732";

// ── Stage layout (coord space: 1080 × 800) ──────────────────────────────
// The figure-eight sits on the "hive face". Vertical is gravity.
// The waggle-run is tilted THETA degrees from vertical.
// That same angle points toward the sun (upper-right).
const THETA_DEG = 35; // waggle-run tilt off gravity
const CENTER = { x: 540, y: 430 };
const RUN_HALF = 155; // half-length of the waggle-run
const LOOP_BULGE = 180; // perpendicular bulge of each return-loop (px)

// Rotation helpers ----------------------------------------------------------
const rad = (d: number) => (d * Math.PI) / 180;
const rotate = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  deg: number,
) => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
};

// The two endpoints of the waggle-run in the untilted frame ("up" and "down").
// In screen space, +y is DOWN. Gravity points +y. So the run starts BELOW the
// centre (the returning bee begins the run heading upward on the comb) and ends
// ABOVE it. We rotate the whole assembly clockwise by THETA (tilt toward the
// sun in the upper-right).
const RUN_START_UNROT = { x: CENTER.x, y: CENTER.y + RUN_HALF };
const RUN_END_UNROT = { x: CENTER.x, y: CENTER.y - RUN_HALF };
const RUN_START = rotate(
  RUN_START_UNROT.x,
  RUN_START_UNROT.y,
  CENTER.x,
  CENTER.y,
  THETA_DEG,
);
const RUN_END = rotate(
  RUN_END_UNROT.x,
  RUN_END_UNROT.y,
  CENTER.x,
  CENTER.y,
  THETA_DEG,
);

// A single figure-8 path traced in one continuous pen-stroke:
//   1. from RUN_START, arc RIGHT-side up to RUN_END
//   2. straight waggle-run back down to RUN_START
//   3. arc LEFT-side up to RUN_END
//   4. waggle-run back down to RUN_START
// We'll actually split this into named sub-paths so we can dash each one
// independently and get clean "chalking on" animation.
type SubPath = { id: string; d: string; len: number };

const runLen = Math.hypot(
  RUN_END.x - RUN_START.x,
  RUN_END.y - RUN_START.y,
);

// A cubic-bezier "loop" bulging perpendicular to the run on a chosen side.
// Returns both the SVG path string and an approximate arc-length (for dashing).
const loopPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  side: "right" | "left",
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy);
  // Perpendicular unit vector — screen +y is DOWN, so "right of run vector"
  // (looking along from->to) is (dy/L, -dx/L). Flip sign for the other side.
  const s = side === "right" ? 1 : -1;
  const px = (dy / L) * s;
  const py = (-dx / L) * s;
  // Two control points, evenly spaced along the run, pushed out perpendicularly.
  const c1x = from.x + dx * 0.15 + px * LOOP_BULGE;
  const c1y = from.y + dy * 0.15 + py * LOOP_BULGE;
  const c2x = from.x + dx * 0.85 + px * LOOP_BULGE;
  const c2y = from.y + dy * 0.85 + py * LOOP_BULGE;
  const d = `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
  // Rough arc length — bulging cubic is a bit longer than the straight chord.
  const len = L + LOOP_BULGE * 1.6;
  return { d, len };
};

const arcRSpec = loopPath(RUN_END, RUN_START, "right");
const arcLSpec = loopPath(RUN_END, RUN_START, "left");

const SUBPATHS: SubPath[] = [
  {
    id: "runA",
    d: `M ${RUN_START.x} ${RUN_START.y} L ${RUN_END.x} ${RUN_END.y}`,
    len: runLen,
  },
  {
    id: "arcR",
    d: arcRSpec.d,
    len: arcRSpec.len,
  },
  {
    id: "runB",
    d: `M ${RUN_START.x} ${RUN_START.y} L ${RUN_END.x} ${RUN_END.y}`,
    len: runLen,
  },
  {
    id: "arcL",
    d: arcLSpec.d,
    len: arcLSpec.len,
  },
];

// Cumulative starts as fractions of TOTAL — used to sequence chalking.
const TOTAL = SUBPATHS.reduce((s, p) => s + p.len, 0);
const STARTS: number[] = [];
{
  let acc = 0;
  for (const s of SUBPATHS) {
    STARTS.push(acc / TOTAL);
    acc += s.len;
  }
}

// ── Waggle tick-marks along the run ────────────────────────────────────────
// Perpendicular to run, alternating sides — the classic zig-zag notation.
type Tick = { x: number; y: number; angle: number; side: 1 | -1; t: number };
const TICKS: Tick[] = (() => {
  const N = 9;
  const runAngle = Math.atan2(
    RUN_END.y - RUN_START.y,
    RUN_END.x - RUN_START.x,
  );
  const perpAngle = runAngle + Math.PI / 2;
  const out: Tick[] = [];
  for (let i = 0; i < N; i++) {
    const f = (i + 0.5) / N;
    const x = RUN_START.x + (RUN_END.x - RUN_START.x) * f;
    const y = RUN_START.y + (RUN_END.y - RUN_START.y) * f;
    const side: 1 | -1 = i % 2 === 0 ? 1 : -1;
    out.push({
      x,
      y,
      angle: (perpAngle * 180) / Math.PI,
      side,
      t: f,
    });
  }
  return out;
})();

// ── Component ──────────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Total trace duration in seconds
  const TRACE_SECS = 3.2;
  const traceProgress = Math.min(1, Math.max(0, frame / (fps * TRACE_SECS)));
  // Ease with a soft cubic-out so the pen settles on each arc
  const p = 1 - Math.pow(1 - traceProgress, 2.2);

  // Sun angle indicator lags the pen slightly
  const sunProgress = interpolate(
    frame,
    [fps * 0.6, fps * 2.1],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Pulse walking the waggle-run — starts after trace completes
  const pulseCycle = fps * 2.6;
  const pulseWindow = Math.max(0, frame - fps * TRACE_SECS);
  const pulseT = (pulseWindow % pulseCycle) / pulseCycle;
  const pulseAlive = frame > fps * TRACE_SECS - 4;
  const pulseFade = interpolate(
    frame,
    [fps * TRACE_SECS - 4, fps * TRACE_SECS + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const pulsePoint = {
    x: RUN_START.x + (RUN_END.x - RUN_START.x) * pulseT,
    y: RUN_START.y + (RUN_END.y - RUN_START.y) * pulseT,
  };

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

  // Progress along the whole figure-8 (0..1) → dash offsets per sub-path
  const subDash = (idx: number): number => {
    const start = STARTS[idx];
    const end = idx + 1 < STARTS.length ? STARTS[idx + 1] : 1;
    const span = end - start;
    const localT = (p - start) / span;
    const clamped = Math.max(0, Math.min(1, localT));
    return SUBPATHS[idx].len * (1 - clamped);
  };

  // Which ticks are lit? Ticks belong to whichever run they were placed on;
  // for simplicity, tie all tick-appearance to the FIRST run (subpath 0).
  const runAProgress = Math.max(
    0,
    Math.min(1, (p - STARTS[0]) / (STARTS[1] - STARTS[0])),
  );

  // Bee dot position — the "dancer" tracing the path
  const beePos = (() => {
    let acc = 0;
    const target = p * TOTAL;
    const runPoint = (
      f: number,
      from: typeof RUN_START,
      to: typeof RUN_END,
    ) => ({
      x: from.x + (to.x - from.x) * f,
      y: from.y + (to.y - from.y) * f,
    });
    // Evaluate a cubic bezier at t
    const bezPoint = (
      f: number,
      from: { x: number; y: number },
      to: { x: number; y: number },
      side: "right" | "left",
    ) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const L = Math.hypot(dx, dy);
      const s = side === "right" ? 1 : -1;
      const px = (dy / L) * s;
      const py = (-dx / L) * s;
      const c1x = from.x + dx * 0.15 + px * LOOP_BULGE;
      const c1y = from.y + dy * 0.15 + py * LOOP_BULGE;
      const c2x = from.x + dx * 0.85 + px * LOOP_BULGE;
      const c2y = from.y + dy * 0.85 + py * LOOP_BULGE;
      const t = f;
      const u = 1 - t;
      const x =
        u * u * u * from.x +
        3 * u * u * t * c1x +
        3 * u * t * t * c2x +
        t * t * t * to.x;
      const y =
        u * u * u * from.y +
        3 * u * u * t * c1y +
        3 * u * t * t * c2y +
        t * t * t * to.y;
      return { x, y };
    };

    for (let i = 0; i < SUBPATHS.length; i++) {
      const len = SUBPATHS[i].len;
      if (target <= acc + len) {
        const f = (target - acc) / len;
        if (SUBPATHS[i].id === "runA")
          return runPoint(f, RUN_START, RUN_END);
        if (SUBPATHS[i].id === "runB")
          return runPoint(f, RUN_START, RUN_END);
        if (SUBPATHS[i].id === "arcR")
          return bezPoint(f, RUN_END, RUN_START, "right");
        if (SUBPATHS[i].id === "arcL")
          return bezPoint(f, RUN_END, RUN_START, "left");
      }
      acc += len;
    }
    return { x: RUN_START.x, y: RUN_START.y };
  })();

  // Sun position, in the upper-right of the composition
  const SUN = { x: 870, y: 235 };
  const sunRay = { x: SUN.x, y: SUN.y };

  // Angle guide arcs
  const ANGLE_R = 74;

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
        <span style={{ color: BEE }}>2026 · 07 · 22</span>
      </div>

      {/* Stage + notation */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Hex-comb pattern for the hive substrate */}
          <pattern
            id="comb"
            x={0}
            y={0}
            width={54}
            height={31.18}
            patternUnits="userSpaceOnUse"
          >
            {/* Two offset hex fragments approximate a comb */}
            <g stroke={GRID} strokeWidth={1} fill="none">
              <polyline points="0,15.59 13.5,7.79 27,15.59 40.5,7.79 54,15.59" />
              <polyline points="0,15.59 13.5,23.39 27,15.59 40.5,23.39 54,15.59" />
              <line x1="13.5" y1="7.79" x2="13.5" y2="-0.01" />
              <line x1="40.5" y1="7.79" x2="40.5" y2="-0.01" />
              <line x1="13.5" y1="23.39" x2="13.5" y2="31.19" />
              <line x1="40.5" y1="23.39" x2="40.5" y2="31.19" />
            </g>
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#161822" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="bee-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BEE} stopOpacity={0.5} />
            <stop offset="100%" stopColor={BEE} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="sun-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={WAX} stopOpacity={1} />
            <stop offset="70%" stopColor={AMBER} stopOpacity={0.95} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0.15} />
          </radialGradient>

          <filter id="tube-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Drafting frame */}
        {(() => {
          const FRAME = { x: 60, y: 130, w: 960, h: 711 };
          return (
            <g>
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
                fill="url(#comb)"
                opacity={0.75}
              />
              <rect
                x={FRAME.x + 0.5}
                y={FRAME.y + 0.5}
                width={FRAME.w - 1}
                height={FRAME.h - 1}
                fill="none"
                stroke="#2A303B"
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

              {/* Gravity axis marker: a subtle vertical dashed line + arrow */}
              <g stroke={GRAY} strokeWidth={1} strokeDasharray="4 6" opacity={0.7}>
                <line
                  x1={CENTER.x}
                  y1={FRAME.y + 22}
                  x2={CENTER.x}
                  y2={FRAME.y + FRAME.h - 22}
                />
              </g>
              <g
                transform={`translate(${CENTER.x}, ${FRAME.y + 40})`}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3}
              >
                <text textAnchor="middle" y={-8}>
                  ↓ GRAVITY
                </text>
              </g>

              {/* SUN — upper-right anchor of the celestial axis */}
              <g opacity={sunProgress}>
                <circle
                  cx={SUN.x}
                  cy={SUN.y}
                  r={30}
                  fill="url(#sun-grad)"
                />
                <circle cx={SUN.x} cy={SUN.y} r={14} fill={WAX} />
                {/* short rays */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  const r1 = 22;
                  const r2 = 32;
                  return (
                    <line
                      key={i}
                      x1={SUN.x + Math.cos(a) * r1}
                      y1={SUN.y + Math.sin(a) * r1}
                      x2={SUN.x + Math.cos(a) * r2}
                      y2={SUN.y + Math.sin(a) * r2}
                      stroke={AMBER}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  );
                })}
                <text
                  x={SUN.x}
                  y={SUN.y + 58}
                  textAnchor="middle"
                  fill={AMBER}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing={3.5}
                >
                  SUN
                </text>
              </g>

              {/* Bearing to sun — dashed line from centre to sun */}
              <g opacity={sunProgress}>
                <line
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={sunRay.x}
                  y2={sunRay.y}
                  stroke={AMBER}
                  strokeWidth={1.4}
                  strokeDasharray="6 6"
                  opacity={0.75}
                />
              </g>

              {/* Angle arcs — the equivalence between waggle-vs-gravity and flight-vs-sun.
                  Small arc anchored at CENTER, with a leader line out to a
                  θ label placed in the calm upper-left negative space. */}
              {(() => {
                const th = THETA_DEG;
                const start = { x: CENTER.x, y: CENTER.y - ANGLE_R };
                const endRun = rotate(
                  start.x,
                  start.y,
                  CENTER.x,
                  CENTER.y,
                  th,
                );
                const arcRun = `M ${start.x} ${start.y} A ${ANGLE_R} ${ANGLE_R} 0 0 1 ${endRun.x} ${endRun.y}`;
                // Anchor for the leader — midpoint of the arc
                const midDeg = th / 2;
                const midPt = rotate(
                  start.x,
                  start.y,
                  CENTER.x,
                  CENTER.y,
                  midDeg,
                );
                // Leader routes UP-LEFT to a label parked in the empty top-left
                const bend = { x: midPt.x - 90, y: midPt.y - 55 };
                const labelAnchor = { x: bend.x - 120, y: bend.y };
                return (
                  <g opacity={sunProgress}>
                    <path
                      d={arcRun}
                      fill="none"
                      stroke={BEE}
                      strokeWidth={1.6}
                    />
                    <g stroke={BEE} strokeWidth={1.1} fill="none">
                      <line
                        x1={midPt.x}
                        y1={midPt.y}
                        x2={bend.x}
                        y2={bend.y}
                      />
                      <line
                        x1={bend.x}
                        y1={bend.y}
                        x2={labelAnchor.x + 6}
                        y2={bend.y}
                      />
                    </g>
                    <circle cx={midPt.x} cy={midPt.y} r={2.4} fill={BEE} />
                    <text
                      x={labelAnchor.x}
                      y={labelAnchor.y + 4}
                      textAnchor="end"
                      fill={BEE}
                      fontFamily={inter}
                      fontSize={15}
                      fontWeight={600}
                      letterSpacing={2}
                    >
                      θ = {th}°
                    </text>
                  </g>
                );
              })()}

              {/* ─── The figure-8 dance path ─── */}
              {SUBPATHS.map((sp, i) => {
                const dashOff = subDash(i);
                return (
                  <g key={sp.id}>
                    {/* Outer glow */}
                    <path
                      d={sp.d}
                      stroke={BEE}
                      strokeWidth={sp.id.startsWith("run") ? 14 : 9}
                      strokeOpacity={0.16}
                      fill="none"
                      strokeLinecap="round"
                      filter="url(#tube-glow)"
                      strokeDasharray={sp.len}
                      strokeDashoffset={dashOff}
                    />
                    {/* Core stroke — solid for runs, dashed for arcs */}
                    <path
                      d={sp.d}
                      stroke={sp.id.startsWith("run") ? BEE : AMBER}
                      strokeWidth={sp.id.startsWith("run") ? 6 : 3.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={
                        sp.id.startsWith("run") ? `${sp.len}` : `${sp.len}`
                      }
                      strokeDashoffset={dashOff}
                    />
                  </g>
                );
              })}

              {/* Extra "notation" arc styling — a thin second stroke on the arcs */}
              {SUBPATHS.filter((s) => s.id.startsWith("arc")).map((sp) => {
                const idx = SUBPATHS.indexOf(sp);
                const dashOff = subDash(idx);
                return (
                  <path
                    key={`nota-${sp.id}`}
                    d={sp.d}
                    stroke={AMBER}
                    strokeOpacity={0.55}
                    strokeWidth={1.4}
                    strokeDasharray={`8 8`}
                    strokeDashoffset={dashOff}
                    fill="none"
                  />
                );
              })}

              {/* Waggle tick-marks along the run — the "vibration".
                  Drawn as short dashes stitching across the run at
                  alternating angles for a zig-zag reading. */}
              {TICKS.map((tk, i) => {
                const alive = runAProgress > tk.t;
                if (!alive) return null;
                const appear = Math.min(1, (runAProgress - tk.t) * 8);
                const outLen = 16;
                const inLen = 4;
                const px = tk.x + Math.cos(rad(tk.angle)) * outLen * tk.side;
                const py = tk.y + Math.sin(rad(tk.angle)) * outLen * tk.side;
                const qx = tk.x - Math.cos(rad(tk.angle)) * inLen * tk.side;
                const qy = tk.y - Math.sin(rad(tk.angle)) * inLen * tk.side;
                return (
                  <g key={`tk-${i}`} opacity={appear}>
                    <line
                      x1={qx}
                      y1={qy}
                      x2={px}
                      y2={py}
                      stroke={INK}
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                    <line
                      x1={qx}
                      y1={qy}
                      x2={px}
                      y2={py}
                      stroke={WAX}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

              {/* Bee dot — the dancer at the pen tip */}
              {p < 1 && (
                <g>
                  <circle
                    cx={beePos.x}
                    cy={beePos.y}
                    r={20}
                    fill="url(#bee-glow)"
                  />
                  <circle cx={beePos.x} cy={beePos.y} r={6} fill={WAX} />
                  <circle
                    cx={beePos.x}
                    cy={beePos.y}
                    r={3}
                    fill={INK}
                  />
                </g>
              )}

              {/* Pulse walking the run — the "1 s ≈ 1 km" heartbeat */}
              {pulseAlive && (
                <g opacity={pulseFade * 0.9}>
                  <circle
                    cx={pulsePoint.x}
                    cy={pulsePoint.y}
                    r={16}
                    fill={BEE}
                    opacity={0.28}
                  />
                  <circle
                    cx={pulsePoint.x}
                    cy={pulsePoint.y}
                    r={5}
                    fill={WAX}
                  />
                </g>
              )}

              {/* Ruler beside the waggle-run: "1 s ≈ 1 KM"
                  Placed on the LEFT of the run vector (opposite the sun) so
                  it stays clear of the sun-ray. Label reads horizontally. */}
              {(() => {
                const runAng = Math.atan2(
                  RUN_END.y - RUN_START.y,
                  RUN_END.x - RUN_START.x,
                );
                // "Left of run vector" (looking from start->end):
                //  perp = runAng - PI/2 in screen coords (y-down)
                const perp = runAng - Math.PI / 2;
                const off = 54;
                const ox = Math.cos(perp) * off;
                const oy = Math.sin(perp) * off;
                const rs = { x: RUN_START.x + ox, y: RUN_START.y + oy };
                const re = { x: RUN_END.x + ox, y: RUN_END.y + oy };
                const ticks = 5;
                const tickLines = [];
                for (let i = 0; i <= ticks; i++) {
                  const f = i / ticks;
                  const tx = rs.x + (re.x - rs.x) * f;
                  const ty = rs.y + (re.y - rs.y) * f;
                  const isMajor = i === 0 || i === ticks;
                  const t2x = tx + Math.cos(perp) * (isMajor ? 10 : 6);
                  const t2y = ty + Math.sin(perp) * (isMajor ? 10 : 6);
                  tickLines.push(
                    <line
                      key={`ruler-t-${i}`}
                      x1={tx}
                      y1={ty}
                      x2={t2x}
                      y2={t2y}
                      stroke={GRAY}
                      strokeWidth={1.2}
                    />,
                  );
                }
                const labelX = rs.x + Math.cos(perp) * 22 - 8;
                const labelY = rs.y + Math.sin(perp) * 22 + 4;
                return (
                  <g opacity={sunProgress}>
                    <line
                      x1={rs.x}
                      y1={rs.y}
                      x2={re.x}
                      y2={re.y}
                      stroke={GRAY}
                      strokeWidth={1.2}
                    />
                    {tickLines}
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="end"
                      fill={GRAY}
                      fontFamily={inter}
                      fontSize={11}
                      fontWeight={600}
                      letterSpacing={3.5}
                    >
                      1 S ≈ 1 KM
                    </text>
                  </g>
                );
              })()}

              {/* Caption strip just below the drafting frame */}
              <g
                transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3}
                fontWeight={500}
              >
                <text>FIG. 3 · WAGGLE-DANCE NOTATION ON VERTICAL COMB</text>
                <text
                  x={FRAME.w}
                  textAnchor="end"
                  fill={BEE}
                  opacity={0.9}
                >
                  θ (VS GRAVITY) = BEARING (VS SUN)
                </text>
              </g>
            </g>
          );
        })()}
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
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
            color: BEE,
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
            Choreographer
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
          The choreographer
          <br />
          of the sun.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          On the vertical face of the hive, the returning{" "}
          <span style={{ color: BEE, fontWeight: 600 }}>Apis mellifera</span>{" "}
          traces a figure-eight whose waggle-run tilts off gravity by exactly
          the flight bearing off the sun — and each additional second of
          waggling names another kilometre out.
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
        <span>Karl von Frisch · Nobel Prize, 1973</span>
        <span>
          <span style={{ color: BEE }}>●</span> Waggle-run = the message
        </span>
      </div>
    </AbsoluteFill>
  );
};
