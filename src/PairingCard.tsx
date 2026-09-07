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

// ── Palette (from the concept's visual brief) ─────────────────────────
const INK = "#0F1410";
const PANEL = "#141B14";
const PANEL_HI = "#1B241B";
const LEAF = "#7EA83B";
const LEAF_DK = "#4E6B1F";
const LEAF_HI = "#B9D96E";
const CRIMSON = "#7B1F1F";
const CRIMSON_HI = "#A82234";
const CRIMSON_DK = "#4A0F0F";
const CREAM = "#EDE7C3";
const PHOSPHOR = "#C6D96A";
const PHOSPHOR_DIM = "#5F702B";
const GRAY = "#7B837A";
const GRID = "#1F281F";
const GRID_MAJOR = "#2A362A";

// ── Layout constants ──────────────────────────────────────────────────
const W = 1080;
const H = 1350;

// The hero panel — everything that carries the argument.
const PANEL_X = 60;
const PANEL_Y = 130;
const PANEL_W = 960;
const PANEL_H = 780;

// Inside the panel: an oscilloscope band along the top, the specimen in
// the middle, and a spike-counter row at the bottom.
const SCOPE_X = PANEL_X + 40;
const SCOPE_Y = PANEL_Y + 46;
const SCOPE_W = PANEL_W - 80;
const SCOPE_H = 150;

const COUNTER_Y = PANEL_Y + PANEL_H - 100;

// Trap centre (in poster coords).
const TRAP_CX = PANEL_X + PANEL_W / 2;
const TRAP_CY = PANEL_Y + 430;
const LOBE_RX_OPEN = 138;
const LOBE_RY = 168;

// Six trigger hairs — three per lobe, at these interior offsets from the
// midrib (dx) and vertical positions (dy from TRAP_CY).
const TRIGGER_HAIRS: { dx: number; dy: number }[] = [
  { dx: -46, dy: -70 },
  { dx: -66, dy: 0 },
  { dx: -46, dy: 70 },
  { dx: 46, dy: -70 },
  { dx: 66, dy: 0 },
  { dx: 46, dy: 70 },
];

// The five spike positions along the oscilloscope trace.
// First two → SNAP; the snap fires a short beat AFTER spike #2, so there
// is a legible "verdict" frame with both spikes on the trace and the trap
// still open. Then spikes 3–5 fire to light DIGEST.
const SPIKE_TIMES_S = [0.7, 1.4, 3.0, 3.7, 4.4];
const SNAP_DELAY_S = 2.1; // when the trap begins to close

// ── Small helpers ─────────────────────────────────────────────────────
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// A stylised lobe: a half-oval hinged to the vertical midrib. `side` is
// −1 for left, +1 for right; `rx` is its current outward extent.
const lobePath = (cx: number, cy: number, rx: number, ry: number, side: 1 | -1) => {
  // Cubic Bézier approximation of a half-ellipse — flat side aligned to midrib.
  const k = 0.5522847498307936; // circle→cubic magic constant
  const ox = side * rx * k;
  const oy = ry * k;
  const outerX = cx + side * rx;
  // From top midrib point, out-and-around to bottom midrib point.
  return (
    `M ${cx} ${cy - ry} ` +
    `C ${cx + ox} ${cy - ry}, ${outerX} ${cy - oy}, ${outerX} ${cy} ` +
    `C ${outerX} ${cy + oy}, ${cx + ox} ${cy + ry}, ${cx} ${cy + ry} ` +
    `Z`
  );
};

// Cilia teeth around the outer curve of a lobe. Returns an array of
// {base, tip} points for a fringe of `n` teeth spanning the outer 180°.
const ciliaFor = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  side: 1 | -1,
  n: number,
  length: number,
) => {
  const out: { bx: number; by: number; tx: number; ty: number }[] = [];
  for (let i = 0; i < n; i++) {
    // Distribute along the outer semicircle in the ellipse's parametric
    // space, then map into ellipse coordinates.
    const u = (i + 0.5) / n; // 0..1
    // theta from -π/2 (top) through side*π/2 (outermost) to π/2 (bottom).
    const theta = -Math.PI / 2 + u * Math.PI;
    const px = cx + side * rx * Math.cos(theta);
    const py = cy + ry * Math.sin(theta);
    // Outward normal on the ellipse (approx via gradient).
    const gx = side * Math.cos(theta) / rx;
    const gy = Math.sin(theta) / ry;
    const gl = Math.hypot(gx, gy);
    const nx = gx / gl;
    const ny = gy / gl;
    out.push({
      bx: px,
      by: py,
      tx: px + nx * length,
      ty: py + ny * length,
    });
  }
  return out;
};

// ── Main composition ──────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tSec = frame / fps;

  // Spike timeline. First two spikes trigger the SNAP; the remaining
  // three light the DIGEST indicator.
  const spikePresence = SPIKE_TIMES_S.map((s) =>
    smoothstep(s - 0.06, s + 0.02, tSec),
  );
  const countedSpikes = spikePresence.reduce((a, b) => a + (b > 0.5 ? 1 : 0), 0);

  // Trap open/close driven by a spring that fires a beat after spike #2.
  const snapT = spring({
    frame: frame - fps * SNAP_DELAY_S,
    fps,
    config: { damping: 12, mass: 0.7, stiffness: 120 },
  });
  const openness = 1 - clamp01(snapT); // 1 = fully open, 0 = fully closed
  // In the top-down projection the lobes appear to lose interior width as
  // they clasp shut — but never collapse to a needle. Floor at 62 px so
  // the closed trap still reads as a football-shaped closed leaf.
  const lobeRx = 62 + (LOBE_RX_OPEN - 62) * openness;
  const clasp = 1 - openness; // 0 open → 1 closed

  // Trap fades in at the top of the loop.
  const trapEntry = smoothstep(0.15, 0.7, tSec);

  // Which trigger hair "fires" for each of the first two spikes.
  const firedHair = (spikeIdx: number, hairIdx: number) => {
    // Spike 0 fires hair 1 (left middle). Spike 1 fires hair 4 (right upper).
    const map = [1, 3];
    return map[spikeIdx] === hairIdx ? spikePresence[spikeIdx] : 0;
  };

  const digestOn = smoothstep(
    SPIKE_TIMES_S[4] - 0.05,
    SPIKE_TIMES_S[4] + 0.15,
    tSec,
  );

  // Type entrance.
  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Oscilloscope baseline geometry.
  const scopeBaseY = SCOPE_Y + SCOPE_H * 0.62;
  const spikeX = (i: number) =>
    SCOPE_X + SCOPE_W * (0.08 + 0.19 * i); // spread the five spikes across the trace

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ─────────────────────────────────────── */}
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
        <span style={{ color: PHOSPHOR }}>2026 · 09 · 07</span>
      </div>

      {/* ── Hero panel: oscilloscope + specimen + counter ─────────── */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Panel background — a subtle lab-notebook vignette. */}
          <linearGradient id="panel-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PANEL_HI} />
            <stop offset="100%" stopColor={PANEL} />
          </linearGradient>

          {/* Faint interior grid. */}
          <pattern
            id="fine-grid"
            x={PANEL_X}
            y={PANEL_Y}
            width={30}
            height={30}
            patternUnits="userSpaceOnUse"
          >
            <path d="M30 0 L0 0 L0 30" fill="none" stroke={GRID} strokeWidth={1} />
          </pattern>
          <pattern
            id="major-grid"
            x={PANEL_X}
            y={PANEL_Y}
            width={150}
            height={150}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M150 0 L0 0 L0 150"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          {/* Crimson gland-field gradient for the trap interior. */}
          <radialGradient id="gland-field" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={CRIMSON_HI} />
            <stop offset="65%" stopColor={CRIMSON} />
            <stop offset="100%" stopColor={CRIMSON_DK} />
          </radialGradient>

          {/* Leaf outer gradient. */}
          <linearGradient id="leaf-outer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LEAF_HI} />
            <stop offset="55%" stopColor={LEAF} />
            <stop offset="100%" stopColor={LEAF_DK} />
          </linearGradient>

          {/* Phosphor glow for spikes. */}
          <filter id="phos-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={2.4} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Trigger-hair pulse glow. */}
          <radialGradient id="hair-pulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CREAM} stopOpacity={0.9} />
            <stop offset="100%" stopColor={CREAM} stopOpacity={0} />
          </radialGradient>

          {/* Digest indicator glow. */}
          <radialGradient id="digest-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CRIMSON_HI} stopOpacity={0.7} />
            <stop offset="100%" stopColor={CRIMSON_HI} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Panel plate */}
        <rect
          x={PANEL_X}
          y={PANEL_Y}
          width={PANEL_W}
          height={PANEL_H}
          fill="url(#panel-bg)"
          rx={2}
        />
        <rect
          x={PANEL_X}
          y={PANEL_Y}
          width={PANEL_W}
          height={PANEL_H}
          fill="url(#fine-grid)"
        />
        <rect
          x={PANEL_X}
          y={PANEL_Y}
          width={PANEL_W}
          height={PANEL_H}
          fill="url(#major-grid)"
        />
        <rect
          x={PANEL_X + 0.5}
          y={PANEL_Y + 0.5}
          width={PANEL_W - 1}
          height={PANEL_H - 1}
          fill="none"
          stroke="#26302A"
          strokeWidth={1}
        />

        {/* Corner crop marks (chartreuse) */}
        {(
          [
            [PANEL_X, PANEL_Y, 1, 1],
            [PANEL_X + PANEL_W, PANEL_Y, -1, 1],
            [PANEL_X, PANEL_Y + PANEL_H, 1, -1],
            [PANEL_X + PANEL_W, PANEL_Y + PANEL_H, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={PHOSPHOR} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* ── Oscilloscope trace band ───────────────────────────── */}
        <g>
          {/* Band label */}
          <text
            x={SCOPE_X}
            y={SCOPE_Y - 12}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={600}
          >
            EXTRACELLULAR TRACE · TRIGGER HAIR APs
          </text>
          <text
            x={SCOPE_X + SCOPE_W}
            y={SCOPE_Y - 12}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            5 s
          </text>

          {/* Scope frame */}
          <rect
            x={SCOPE_X}
            y={SCOPE_Y}
            width={SCOPE_W}
            height={SCOPE_H}
            fill="#0B120B"
            stroke={PHOSPHOR_DIM}
            strokeWidth={1}
            rx={1}
          />
          {/* Scope internal ticks */}
          {Array.from({ length: 11 }).map((_, i) => {
            const x = SCOPE_X + (SCOPE_W * i) / 10;
            return (
              <line
                key={`tv-${i}`}
                x1={x}
                y1={SCOPE_Y}
                x2={x}
                y2={SCOPE_Y + SCOPE_H}
                stroke={PHOSPHOR_DIM}
                strokeOpacity={0.28}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = SCOPE_Y + (SCOPE_H * (i + 1)) / 6;
            return (
              <line
                key={`th-${i}`}
                x1={SCOPE_X}
                y1={y}
                x2={SCOPE_X + SCOPE_W}
                y2={y}
                stroke={PHOSPHOR_DIM}
                strokeOpacity={0.22}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}

          {/* Baseline */}
          <line
            x1={SCOPE_X}
            y1={scopeBaseY}
            x2={SCOPE_X + SCOPE_W}
            y2={scopeBaseY}
            stroke={PHOSPHOR}
            strokeOpacity={0.5}
            strokeWidth={1.2}
          />

          {/* Threshold annotation */}
          <line
            x1={SCOPE_X}
            y1={SCOPE_Y + 22}
            x2={SCOPE_X + SCOPE_W}
            y2={SCOPE_Y + 22}
            stroke={PHOSPHOR}
            strokeOpacity={0.25}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text
            x={SCOPE_X + 6}
            y={SCOPE_Y + 18}
            fill={PHOSPHOR}
            fontFamily={inter}
            fontSize={9.5}
            letterSpacing={2.4}
            fontWeight={500}
            opacity={0.72}
          >
            AP THRESHOLD
          </text>

          {/* Live sweep dot */}
          {(() => {
            const sweepU = clamp01((tSec - 0.1) / 5);
            const sx = SCOPE_X + sweepU * SCOPE_W;
            return (
              <g>
                <line
                  x1={sx}
                  y1={SCOPE_Y}
                  x2={sx}
                  y2={SCOPE_Y + SCOPE_H}
                  stroke={PHOSPHOR}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
                <circle
                  cx={sx}
                  cy={scopeBaseY}
                  r={3}
                  fill={PHOSPHOR}
                  filter="url(#phos-glow)"
                />
              </g>
            );
          })()}

          {/* Spikes */}
          {SPIKE_TIMES_S.map((s, i) => {
            const p = spikePresence[i];
            if (p <= 0) return null;
            const x = spikeX(i);
            const amp = 84 * p;
            const width = 18;
            const y0 = scopeBaseY;
            const path =
              `M ${x - width * 1.4} ${y0} ` +
              `L ${x - width * 0.5} ${y0 + 6} ` +
              `L ${x - width * 0.15} ${y0} ` +
              `L ${x} ${y0 - amp} ` +
              `L ${x + width * 0.15} ${y0} ` +
              `L ${x + width * 0.5} ${y0 + 8} ` +
              `L ${x + width * 1.4} ${y0}`;
            const idx = i + 1;
            return (
              <g key={`spike-${i}`}>
                {/* Halo */}
                <path
                  d={path}
                  stroke={PHOSPHOR}
                  strokeOpacity={0.35}
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#phos-glow)"
                />
                <path
                  d={path}
                  stroke={PHOSPHOR}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Spike index tick */}
                <text
                  x={x}
                  y={SCOPE_Y + SCOPE_H - 8}
                  textAnchor="middle"
                  fill={PHOSPHOR}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2}
                  fontWeight={600}
                  opacity={0.85}
                >
                  {`AP${idx}`}
                </text>
              </g>
            );
          })}
        </g>

        {/* ── Specimen: the trap ──────────────────────────────── */}
        <g opacity={trapEntry}>
          {/* Short petiole nub — enough to root the trap without colliding
              with the counter row. */}
          <path
            d={`M ${TRAP_CX - 10} ${TRAP_CY + LOBE_RY + 6}
                Q ${TRAP_CX} ${TRAP_CY + LOBE_RY + 34}
                  ${TRAP_CX + 6} ${TRAP_CY + LOBE_RY + 56}`}
            stroke={LEAF_DK}
            strokeWidth={20}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${TRAP_CX - 10} ${TRAP_CY + LOBE_RY + 6}
                Q ${TRAP_CX} ${TRAP_CY + LOBE_RY + 34}
                  ${TRAP_CX + 6} ${TRAP_CY + LOBE_RY + 56}`}
            stroke={LEAF}
            strokeWidth={13}
            fill="none"
            strokeLinecap="round"
          />

          {/* Left lobe — interior fill (crimson) drawn first */}
          <path
            d={lobePath(TRAP_CX, TRAP_CY, lobeRx, LOBE_RY, -1)}
            fill="url(#gland-field)"
          />
          {/* Right lobe interior */}
          <path
            d={lobePath(TRAP_CX, TRAP_CY, lobeRx, LOBE_RY, 1)}
            fill="url(#gland-field)"
          />

          {/* Fine radial gland stippling (subtle, only when open enough) */}
          {openness > 0.15 &&
            [-1, 1].flatMap((side) => {
              const cxL = TRAP_CX + (side as -1 | 1) * 0;
              const dots: JSX.Element[] = [];
              const cols = 5;
              const rows = 7;
              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                  const u = (c + 0.5) / cols; // 0..1 across lobe width
                  const v = (r + 0.5) / rows; // 0..1 across lobe height
                  const rx = lobeRx * 0.86;
                  const ry = LOBE_RY * 0.86;
                  const x = cxL + (side as -1 | 1) * rx * u;
                  const y = TRAP_CY - ry + v * (ry * 2);
                  // clip out points outside the ellipse
                  const nx = ((x - cxL) / (rx * (side as -1 | 1))) || 0;
                  const ny = (y - TRAP_CY) / ry;
                  if (nx * nx + ny * ny > 0.95) continue;
                  dots.push(
                    <circle
                      key={`gland-${side}-${r}-${c}`}
                      cx={x}
                      cy={y}
                      r={1.6}
                      fill={CRIMSON_HI}
                      opacity={0.55}
                    />,
                  );
                }
              }
              return dots;
            })}

          {/* Cilia teeth — a fringe along each lobe's outer curve.
              As the trap clasps (clasp: 0→1), cilia lean toward the midrib
              and interlock across it like fingers of two hands. */}
          {[-1, 1].map((s) =>
            ciliaFor(TRAP_CX, TRAP_CY, lobeRx, LOBE_RY, s as -1 | 1, 14, 34).map(
              (c, i) => {
                // Vector from base to a target across the midrib as trap closes.
                const mirrorX = 2 * TRAP_CX - c.tx;
                const tx = c.tx + (mirrorX - c.tx) * clasp * 0.55;
                const ty = c.ty;
                return (
                  <line
                    key={`cilium-${s}-${i}`}
                    x1={c.bx}
                    y1={c.by}
                    x2={tx}
                    y2={ty}
                    stroke={LEAF_HI}
                    strokeWidth={3.2}
                    strokeLinecap="round"
                  />
                );
              },
            ),
          )}

          {/* Green over-cap: when clasped, the outer green leaf-back
              becomes what we see from above. Fades in with `clasp`. */}
          {clasp > 0.02 && (
            <g opacity={clasp}>
              <ellipse
                cx={TRAP_CX}
                cy={TRAP_CY}
                rx={lobeRx + 4}
                ry={LOBE_RY + 2}
                fill="url(#leaf-outer)"
                stroke={LEAF_DK}
                strokeWidth={2}
              />
              {/* Midline seam of the clasped trap */}
              <line
                x1={TRAP_CX}
                y1={TRAP_CY - LOBE_RY + 8}
                x2={TRAP_CX}
                y2={TRAP_CY + LOBE_RY - 8}
                stroke={LEAF_DK}
                strokeWidth={2.4}
              />
              <line
                x1={TRAP_CX}
                y1={TRAP_CY - LOBE_RY + 8}
                x2={TRAP_CX}
                y2={TRAP_CY + LOBE_RY - 8}
                stroke={LEAF_HI}
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              {/* A faint hint of the trapped prey glow */}
              <ellipse
                cx={TRAP_CX}
                cy={TRAP_CY}
                rx={lobeRx * 0.5}
                ry={LOBE_RY * 0.55}
                fill={CRIMSON_DK}
                opacity={0.4}
              />
            </g>
          )}

          {/* Lobe outer contour — drawn over cilia bases for a clean edge */}
          <path
            d={lobePath(TRAP_CX, TRAP_CY, lobeRx, LOBE_RY, -1)}
            fill="none"
            stroke={LEAF_DK}
            strokeWidth={2}
          />
          <path
            d={lobePath(TRAP_CX, TRAP_CY, lobeRx, LOBE_RY, 1)}
            fill="none"
            stroke={LEAF_DK}
            strokeWidth={2}
          />

          {/* Midrib — the seam between the two lobes. Rendered as a
              thick green ridge so the trap unambiguously reads as two
              hinged halves rather than a single orb. */}
          {/* Dark shadow well */}
          <path
            d={`M ${TRAP_CX - 7} ${TRAP_CY - LOBE_RY + 2}
                Q ${TRAP_CX - 10} ${TRAP_CY} ${TRAP_CX - 7} ${TRAP_CY + LOBE_RY - 2}
                L ${TRAP_CX + 7} ${TRAP_CY + LOBE_RY - 2}
                Q ${TRAP_CX + 10} ${TRAP_CY} ${TRAP_CX + 7} ${TRAP_CY - LOBE_RY + 2}
                Z`}
            fill={CRIMSON_DK}
            opacity={0.75}
          />
          {/* Central green ridge (the actual midrib vein) */}
          <path
            d={`M ${TRAP_CX - 4} ${TRAP_CY - LOBE_RY + 8}
                Q ${TRAP_CX - 6} ${TRAP_CY} ${TRAP_CX - 4} ${TRAP_CY + LOBE_RY - 8}
                L ${TRAP_CX + 4} ${TRAP_CY + LOBE_RY - 8}
                Q ${TRAP_CX + 6} ${TRAP_CY} ${TRAP_CX + 4} ${TRAP_CY - LOBE_RY + 8}
                Z`}
            fill={LEAF_DK}
          />
          <line
            x1={TRAP_CX}
            y1={TRAP_CY - LOBE_RY + 10}
            x2={TRAP_CX}
            y2={TRAP_CY + LOBE_RY - 10}
            stroke={LEAF_HI}
            strokeOpacity={0.55}
            strokeWidth={1.2}
          />

          {/* Faint interior falloff toward each lobe's inner edge, so the
              crimson fields read as two separate glandular surfaces. */}
          <ellipse
            cx={TRAP_CX - lobeRx * 0.55}
            cy={TRAP_CY}
            rx={lobeRx * 0.3}
            ry={LOBE_RY * 0.7}
            fill={CRIMSON_HI}
            opacity={0.22 * openness}
          />
          <ellipse
            cx={TRAP_CX + lobeRx * 0.55}
            cy={TRAP_CY}
            rx={lobeRx * 0.3}
            ry={LOBE_RY * 0.7}
            fill={CRIMSON_HI}
            opacity={0.22 * openness}
          />

          {/* Six trigger hairs — visible only while the trap is open */}
          {openness > 0.05 &&
            TRIGGER_HAIRS.map((h, i) => {
              const x = TRAP_CX + h.dx * (lobeRx / LOBE_RX_OPEN);
              const y = TRAP_CY + h.dy;
              // Trigger pulses (from spikes 0 and 1) light hair 1 / hair 3.
              const pulse = Math.max(firedHair(0, i), firedHair(1, i));
              const pulseRadius = 6 + 22 * pulse;
              return (
                <g key={`hair-${i}`} opacity={openness}>
                  {/* Halo when firing */}
                  {pulse > 0 && (
                    <circle
                      cx={x}
                      cy={y}
                      r={pulseRadius}
                      fill="url(#hair-pulse)"
                    />
                  )}
                  {/* Bristle */}
                  <line
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={y - 16}
                    stroke={CREAM}
                    strokeOpacity={0.92}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                  {/* Bristle tip */}
                  <circle
                    cx={x}
                    cy={y - 18}
                    r={2.2}
                    fill={CREAM}
                    stroke={CRIMSON_DK}
                    strokeWidth={0.6}
                  />
                  {/* Base socket */}
                  <circle cx={x} cy={y} r={2.6} fill={CRIMSON_DK} />
                </g>
              );
            })}

          {/* Two labeled trigger hairs: "1" on the fired ones */}
          {[1, 3].map((hairIdx, k) => {
            const h = TRIGGER_HAIRS[hairIdx];
            const x = TRAP_CX + h.dx * (lobeRx / LOBE_RX_OPEN);
            const y = TRAP_CY + h.dy;
            const on = spikePresence[k];
            if (on < 0.2 || openness < 0.05) return null;
            const dir = h.dx < 0 ? -1 : 1;
            return (
              <g key={`tag-${hairIdx}`} opacity={Math.min(1, on * 1.4)}>
                <line
                  x1={x + dir * 18}
                  y1={y - 20}
                  x2={x + dir * 46}
                  y2={y - 38}
                  stroke={CREAM}
                  strokeWidth={1}
                />
                <text
                  x={x + dir * 50}
                  y={y - 34}
                  textAnchor={dir < 0 ? "end" : "start"}
                  fill={CREAM}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={2.2}
                  fontWeight={600}
                >
                  {`TOUCH ${k + 1}`}
                </text>
              </g>
            );
          })}

          {/* Anatomy annotations — pinned at the widest point of each lobe */}
          {openness > 0.7 && (
            <>
              {/* Left: TRIGGER HAIRS */}
              <g opacity={Math.min(1, (openness - 0.7) / 0.3) * trapEntry}>
                <line
                  x1={TRAP_CX - lobeRx - 16}
                  y1={TRAP_CY + 14}
                  x2={TRAP_CX - lobeRx - 84}
                  y2={TRAP_CY + 96}
                  stroke={GRAY}
                  strokeWidth={1}
                />
                <text
                  x={TRAP_CX - lobeRx - 88}
                  y={TRAP_CY + 112}
                  textAnchor="end"
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={2.6}
                  fontWeight={600}
                >
                  TRIGGER HAIRS
                </text>
              </g>
              {/* Right: MIDRIB / CILIA */}
              <g opacity={Math.min(1, (openness - 0.7) / 0.3) * trapEntry}>
                <line
                  x1={TRAP_CX + lobeRx + 16}
                  y1={TRAP_CY - 8}
                  x2={TRAP_CX + lobeRx + 90}
                  y2={TRAP_CY - 84}
                  stroke={GRAY}
                  strokeWidth={1}
                />
                <text
                  x={TRAP_CX + lobeRx + 94}
                  y={TRAP_CY - 100}
                  textAnchor="start"
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={2.6}
                  fontWeight={600}
                >
                  CILIA · MARGINAL
                </text>
              </g>
            </>
          )}
        </g>

        {/* ── Counter row + threshold legend ────────────────────── */}
        <g>
          <text
            x={SCOPE_X}
            y={COUNTER_Y - 14}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={600}
          >
            SPIKE COUNTER
          </text>
          <text
            x={SCOPE_X + SCOPE_W}
            y={COUNTER_Y - 14}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            <tspan fill={PHOSPHOR}>≥ 2</tspan>
            <tspan> · SNAP     </tspan>
            <tspan fill={CRIMSON_HI}>≥ 5</tspan>
            <tspan> · DIGEST</tspan>
          </text>

          {(() => {
            const n = 5;
            const gap = 14;
            const boxW = (SCOPE_W - gap * (n - 1)) / n;
            const boxH = 46;
            return Array.from({ length: n }).map((_, i) => {
              const x = SCOPE_X + i * (boxW + gap);
              const on = spikePresence[i];
              const fill = i < 2 ? PHOSPHOR : CRIMSON_HI;
              return (
                <g key={`box-${i}`}>
                  <rect
                    x={x}
                    y={COUNTER_Y}
                    width={boxW}
                    height={boxH}
                    fill={i < 2 ? "#0F1A0F" : "#1A0F0F"}
                    stroke={i < 2 ? PHOSPHOR_DIM : "#5A1414"}
                    strokeWidth={1}
                    rx={1}
                  />
                  {on > 0.02 && (
                    <rect
                      x={x}
                      y={COUNTER_Y}
                      width={boxW}
                      height={boxH}
                      fill={fill}
                      opacity={0.18 * on}
                    />
                  )}
                  {on > 0.5 && (
                    <>
                      <circle
                        cx={x + 16}
                        cy={COUNTER_Y + boxH / 2}
                        r={5}
                        fill={fill}
                        filter="url(#phos-glow)"
                      />
                      <text
                        x={x + boxW / 2 + 6}
                        y={COUNTER_Y + boxH / 2 + 6}
                        textAnchor="middle"
                        fill={fill}
                        fontFamily={inter}
                        fontSize={19}
                        fontWeight={600}
                        letterSpacing={2}
                      >
                        {`AP ${i + 1}`}
                      </text>
                    </>
                  )}
                  {!(on > 0.5) && (
                    <text
                      x={x + boxW / 2}
                      y={COUNTER_Y + boxH / 2 + 5}
                      textAnchor="middle"
                      fill={i < 2 ? PHOSPHOR_DIM : "#5A1414"}
                      fontFamily={inter}
                      fontSize={15}
                      fontWeight={500}
                      letterSpacing={2}
                    >
                      {`—`}
                    </text>
                  )}
                </g>
              );
            });
          })()}

          {/* Count total + status */}
          <text
            x={PANEL_X + PANEL_W - 40}
            y={PANEL_Y + PANEL_H - 20}
            textAnchor="end"
            fill={digestOn > 0.3 ? CRIMSON_HI : PHOSPHOR}
            fontFamily={inter}
            fontSize={12}
            letterSpacing={3.4}
            fontWeight={600}
          >
            {digestOn > 0.3
              ? `n = ${countedSpikes} · DIGEST ▶`
              : countedSpikes >= 2
                ? `n = ${countedSpikes} · SNAP ▶`
                : `n = ${countedSpikes} · WAIT`}
          </text>

          {/* Digest indicator glow — the "verdict" */}
          {digestOn > 0.05 && (
            <circle
              cx={PANEL_X + PANEL_W - 22}
              cy={PANEL_Y + PANEL_H - 26}
              r={20 * digestOn}
              fill="url(#digest-glow)"
            />
          )}
        </g>
      </svg>

      {/* ── Type lockup ───────────────────────────────────────────── */}
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
            [18, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: PHOSPHOR,
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
            Neuroscientist
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 96,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The plant
          <br />
          that counts.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A touch on any of the six trigger hairs inside{" "}
          <span style={{ color: LEAF_HI, fontWeight: 600 }}>
            Dionaea muscipula
          </span>{" "}
          fires a stereotyped action potential. Two spikes within{" "}
          ~20 seconds slam the trap; five or more open the digestive
          glands — a calcium-based neural counter, in an organism with no
          neurons.
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 46,
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
        <span>
          Böhm et al. · Current Biology 26 (2016) 286–295
        </span>
        <span>
          <span style={{ color: PHOSPHOR }}>●</span> AP = Action Potential
        </span>
      </div>

      {/* Silence unused-variable warning for the (rare) end-of-loop frame. */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
