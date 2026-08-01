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
const INK = "#0B0D18";
const PURPLE = "#7A3DB0";
const MAGENTA = "#E64EA6";
const CYAN = "#2FC5D9";
const GOLD = "#F0C24A";
const GRAY = "#C7D0DE";
const GRAY_DIM = "#6E7789";

// ── Isometric hopper crystal ─────────────────────────────────────────
// We render N nested terraces as an axonometric stepped pyramid.
// Each terrace is a rhombus (the "top" of that step) drawn in
// isometric projection. Successively smaller & higher terraces stack
// on top, creating the ziggurat/cathedral silhouette.
//
// Coordinate space for the crystal: 800 × 800 (we translate into place).

const CX = 400;
const CY = 480; // apex sits above this baseline
const ISO_A = 30 * (Math.PI / 180); // isometric angle
const TILT_X = Math.cos(ISO_A);
const TILT_Y = Math.sin(ISO_A);

const TERRACES = 9;
const BASE_HALF_W = 290; // half-width of outer rhombus edge
const TERRACE_STEP_H = 24; // vertical rise per terrace
const TERRACE_SHRINK = 27; // horizontal shrink per terrace (per axis)

type Rhombus = {
  top: [number, number];
  right: [number, number];
  bottom: [number, number];
  left: [number, number];
  centerY: number;
  index: number; // 0 = outermost, TERRACES-1 = apex
  halfW: number;
};

const terraceAt = (i: number): Rhombus => {
  const halfW = BASE_HALF_W - i * TERRACE_SHRINK;
  const yOffset = -i * TERRACE_STEP_H;
  const cy = CY + yOffset;
  return {
    top: [CX, cy - halfW * TILT_Y],
    right: [CX + halfW * TILT_X, cy],
    bottom: [CX, cy + halfW * TILT_Y],
    left: [CX - halfW * TILT_X, cy],
    centerY: cy,
    index: i,
    halfW,
  };
};

const rhombusPath = (r: Rhombus): string =>
  `M ${r.top[0]} ${r.top[1]} L ${r.right[0]} ${r.right[1]} L ${r.bottom[0]} ${r.bottom[1]} L ${r.left[0]} ${r.left[1]} Z`;

// Left face of the "riser" between terrace i (above) and i+1 (below).
// The riser is a vertical wall from the outer rhombus down to the lower
// outer rhombus. We split it into two visible walls: left-front and
// right-front (the two faces facing the viewer).
const leftRiserPath = (rHi: Rhombus, rLo: Rhombus): string => {
  // Left-front wall: from top-left edge of upper terrace down to
  // the corresponding edge on the lower terrace.
  // Upper: left → bottom vertices; Lower: left → bottom vertices.
  return `M ${rHi.left[0]} ${rHi.left[1]} L ${rHi.bottom[0]} ${rHi.bottom[1]} L ${rLo.bottom[0]} ${rLo.bottom[1]} L ${rLo.left[0]} ${rLo.left[1]} Z`;
};
const rightRiserPath = (rHi: Rhombus, rLo: Rhombus): string => {
  return `M ${rHi.right[0]} ${rHi.right[1]} L ${rHi.bottom[0]} ${rHi.bottom[1]} L ${rLo.bottom[0]} ${rLo.bottom[1]} L ${rLo.right[0]} ${rLo.right[1]} Z`;
};

// Thin-film interference gradient: sample from purple → magenta → cyan → gold
// as a function of a normalized parameter (0..1). Used to color each terrace
// according to a slow-moving shimmer parameter.
const shimmerColor = (phase: number) => {
  // phase in [0, 1)
  const stops = [
    { p: 0.0, c: [122, 61, 176] }, // purple
    { p: 0.28, c: [230, 78, 166] }, // magenta
    { p: 0.55, c: [47, 197, 217] }, // cyan
    { p: 0.78, c: [240, 194, 74] }, // gold
    { p: 1.0, c: [122, 61, 176] }, // wrap
  ];
  const x = ((phase % 1) + 1) % 1;
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (x >= stops[i].p && x <= stops[i + 1].p) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const t = (x - a.p) / (b.p - a.p);
  const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * t);
  const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * t);
  const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

// Darker/lighter tint for the riser walls
const darkenHex = (rgbStr: string, mult: number) => {
  const m = rgbStr.match(/\d+/g);
  if (!m) return rgbStr;
  const r = Math.round(parseInt(m[0]) * mult);
  const g = Math.round(parseInt(m[1]) * mult);
  const b = Math.round(parseInt(m[2]) * mult);
  return `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 5-second loop
  const loopSecs = 5;
  const loopFrames = fps * loopSecs;
  const loopT = (frame % loopFrames) / loopFrames;

  // Terrace materialization: apex first, cascading down
  const growStart = fps * 0.3;
  const growPer = fps * 0.08;

  const titleSpring = spring({
    frame: frame - fps * 1.2,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(
    frame,
    [fps * 1.8, fps * 2.6],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const bandOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Global iridescence sweep: slow, continuous
  const shimmerBase = loopT; // 0..1

  // Build terraces (draw outermost first so upper terraces overlay)
  const terraces = Array.from({ length: TERRACES }, (_, i) => terraceAt(i));

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
          color: GRAY_DIM,
          fontFamily: inter,
          fontSize: 12,
          letterSpacing: 3.6,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: bandOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: MAGENTA }}>2026 · 08 · 01</span>
      </div>

      {/* SVG — architectural plate */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Radial ambient behind the crystal */}
          <radialGradient id="ambient" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#1A1D2E" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Highlight gradient for the top face of each terrace */}
          <linearGradient id="topFaceHi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.28} />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity={0.04} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.18} />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient wash centered on the crystal */}
        <circle cx={540} cy={520} r={520} fill="url(#ambient)" />

        {/* Faint measurement plane — a single horizontal reference line */}
        <line
          x1={80}
          y1={730}
          x2={1000}
          y2={730}
          stroke="#1D2233"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [60, 130, 1, 1],
            [1020, 130, -1, 1],
            [60, 830, 1, -1],
            [1020, 830, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={GRAY_DIM} strokeWidth={1.1} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Plate label */}
        <text
          x={80}
          y={122}
          fill={GRAY_DIM}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={3.4}
        >
          PLATE III · HOPPER CRYSTAL, AXONOMETRIC
        </text>
        <text
          x={1000}
          y={122}
          textAnchor="end"
          fill={GRAY_DIM}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={3.4}
        >
          BISMUTH · Bi · Z = 83
        </text>

        {/* The crystal — translate to canvas center */}
        <g transform={`translate(140, 40)`}>
          {/* Reverse draw: draw outer risers first, then inner terraces on top */}
          {terraces.map((r, i) => {
            const alive = interpolate(
              frame,
              [growStart + (TERRACES - 1 - i) * growPer, growStart + (TERRACES - 1 - i) * growPer + fps * 0.5],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            if (alive <= 0) return null;

            // Per-terrace shimmer phase — higher terraces slightly out of phase
            const phase = shimmerBase + i * 0.08;
            const top = shimmerColor(phase);
            const riserL = darkenHex(top, 0.72);
            const riserR = darkenHex(top, 0.55);

            // Vertical shift for the "grow-up" cascade
            const rise = interpolate(alive, [0, 1], [14, 0]);

            // Below current terrace (for riser drop)
            const below = i > 0 ? terraces[i - 1] : null;

            return (
              <g key={`terrace-${i}`} opacity={alive} transform={`translate(0, ${rise})`}>
                {/* Risers between this terrace's outer edge and the one below */}
                {below && (
                  <>
                    <path
                      d={leftRiserPath(r, below)}
                      fill={riserL}
                      opacity={0.95}
                    />
                    <path
                      d={rightRiserPath(r, below)}
                      fill={riserR}
                      opacity={0.95}
                    />
                    {/* Riser inner edge lines for architectural crispness */}
                    <line
                      x1={r.left[0]}
                      y1={r.left[1]}
                      x2={below.left[0]}
                      y2={below.left[1]}
                      stroke="rgba(0,0,0,0.35)"
                      strokeWidth={0.75}
                    />
                    <line
                      x1={r.bottom[0]}
                      y1={r.bottom[1]}
                      x2={below.bottom[0]}
                      y2={below.bottom[1]}
                      stroke="rgba(0,0,0,0.35)"
                      strokeWidth={0.75}
                    />
                    <line
                      x1={r.right[0]}
                      y1={r.right[1]}
                      x2={below.right[0]}
                      y2={below.right[1]}
                      stroke="rgba(0,0,0,0.35)"
                      strokeWidth={0.75}
                    />
                  </>
                )}
                {/* Top face of the terrace */}
                <path d={rhombusPath(r)} fill={top} />
                {/* Top-face lighting overlay */}
                <path d={rhombusPath(r)} fill="url(#topFaceHi)" />
                {/* Sunken hopper hint — inner darker rhombus (rim + recess).
                    Painted AFTER the lighting overlay so it stays legible.
                    Skip apex (too tiny) and outermost (would clash with base). */}
                {i > 0 && i < TERRACES - 1 && (() => {
                  const rimFrac = 0.62;
                  const inner: Rhombus = {
                    top: [CX, r.centerY - r.halfW * rimFrac * TILT_Y],
                    right: [CX + r.halfW * rimFrac * TILT_X, r.centerY],
                    bottom: [CX, r.centerY + r.halfW * rimFrac * TILT_Y],
                    left: [CX - r.halfW * rimFrac * TILT_X, r.centerY],
                    centerY: r.centerY,
                    index: r.index,
                    halfW: r.halfW * rimFrac,
                  };
                  return (
                    <>
                      <path
                        d={rhombusPath(inner)}
                        fill="rgba(0,0,0,0.32)"
                        stroke="rgba(0,0,0,0.55)"
                        strokeWidth={0.7}
                      />
                    </>
                  );
                })()}
                {/* Crisp top edge */}
                <path
                  d={rhombusPath(r)}
                  fill="none"
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth={0.9}
                />
              </g>
            );
          })}

          {/* Apex spark */}
          {frame > growStart + fps * 0.9 && (() => {
            const apex = terraces[TERRACES - 1];
            const sparkOp = interpolate(
              frame,
              [growStart + fps * 0.9, growStart + fps * 1.4],
              [0, 1],
              { extrapolateRight: "clamp" },
            );
            const pulse = 0.5 + 0.5 * Math.sin((loopT * Math.PI * 2));
            return (
              <g opacity={sparkOp} filter="url(#softGlow)">
                <circle
                  cx={apex.top[0]}
                  cy={apex.top[1]}
                  r={34 + pulse * 8}
                  fill={GOLD}
                  opacity={0.22}
                />
                <circle
                  cx={apex.top[0]}
                  cy={apex.top[1]}
                  r={18 + pulse * 4}
                  fill={MAGENTA}
                  opacity={0.35}
                />
                <circle
                  cx={apex.top[0]}
                  cy={apex.top[1]}
                  r={6 + pulse * 1.5}
                  fill="#FFFFFF"
                  opacity={0.95}
                />
              </g>
            );
          })()}
        </g>

        {/* ── Architectural annotations ─────────────────────────────── */}
        {/* Dimension line: left-side height ladder */}
        {(() => {
          const outer = terraceAt(0);
          const apex = terraceAt(TERRACES - 1);
          // In screen-space: crystal is translated by (140, 40)
          const xShift = 140;
          const yShift = 40;
          const xLine = 100;
          const yTop = apex.top[1] + yShift;
          const yBot = outer.left[1] + yShift;
          const annOpacity = interpolate(
            frame,
            [fps * 2.0, fps * 2.8],
            [0, 0.9],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <g opacity={annOpacity} stroke={GRAY_DIM} fill={GRAY_DIM}>
              <line x1={xLine} y1={yTop} x2={xLine} y2={yBot} strokeWidth={1} />
              <line x1={xLine - 6} y1={yTop} x2={xLine + 6} y2={yTop} strokeWidth={1} />
              <line x1={xLine - 6} y1={yBot} x2={xLine + 6} y2={yBot} strokeWidth={1} />
              {/* Terrace tick marks */}
              {terraces.map((r, i) => (
                <line
                  key={`tick-${i}`}
                  x1={xLine - 4}
                  y1={r.top[1] + yShift}
                  x2={xLine + 4}
                  y2={r.top[1] + yShift}
                  strokeWidth={0.75}
                />
              ))}
              {/* Rotated axis label — placed to the left of the line, centered vertically */}
              <text
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3.6}
                stroke="none"
                fill={GRAY_DIM}
                textAnchor="middle"
                transform={`translate(${xLine - 22}, ${(yTop + yBot) / 2}) rotate(-90)`}
              >
                GROWTH VECTOR
              </text>
              {/* Small label above the top arrow */}
              <text
                x={xLine + 12}
                y={yTop - 8}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2.6}
                stroke="none"
                fill={GRAY_DIM}
              >
                APEX
              </text>
              {/* Small label below the bottom arrow */}
              <text
                x={xLine + 12}
                y={yBot + 16}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2.6}
                stroke="none"
                fill={GRAY_DIM}
              >
                BASE · 9 TERRACES
              </text>
            </g>
          );
        })()}

        {/* Mechanism callout: EDGES grow faster than FACES (upper-right of crystal) */}
        {(() => {
          const annOpacity = interpolate(
            frame,
            [fps * 2.2, fps * 3.0],
            [0, 0.95],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const boxX = 760;
          const boxY = 180;
          const boxW = 200;
          // Small icon: a rhombus with arrows at the corners (fast) and slower arrows on the faces
          return (
            <g opacity={annOpacity}>
              {/* Label */}
              <text
                x={boxX}
                y={boxY}
                fill={CYAN}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3.4}
              >
                GROWTH FRONT
              </text>
              {/* Mini rhombus diagram */}
              {(() => {
                const cx = boxX + 100;
                const cy = boxY + 76;
                const hw = 62;
                const iso = 30 * (Math.PI / 180);
                const tx = Math.cos(iso);
                const ty = Math.sin(iso);
                const pts = {
                  top: [cx, cy - hw * ty] as const,
                  right: [cx + hw * tx, cy] as const,
                  bottom: [cx, cy + hw * ty] as const,
                  left: [cx - hw * tx, cy] as const,
                };
                return (
                  <>
                    <path
                      d={`M ${pts.top[0]} ${pts.top[1]} L ${pts.right[0]} ${pts.right[1]} L ${pts.bottom[0]} ${pts.bottom[1]} L ${pts.left[0]} ${pts.left[1]} Z`}
                      fill="none"
                      stroke={GRAY_DIM}
                      strokeWidth={1}
                      strokeDasharray="2 3"
                    />
                    {/* Fast-growing corner arrows (long, cyan) */}
                    {[pts.top, pts.right, pts.bottom, pts.left].map((p, k) => {
                      const [px, py] = p;
                      const dx = px - cx;
                      const dy = py - cy;
                      const L = Math.hypot(dx, dy);
                      const ux = dx / L;
                      const uy = dy / L;
                      const tipX = px + ux * 18;
                      const tipY = py + uy * 18;
                      return (
                        <g key={`corner-${k}`}>
                          <line
                            x1={px}
                            y1={py}
                            x2={tipX}
                            y2={tipY}
                            stroke={CYAN}
                            strokeWidth={1.6}
                          />
                          {/* Arrowhead */}
                          <polygon
                            points={`${tipX},${tipY} ${tipX - uy * 4 - ux * 6},${tipY + ux * 4 - uy * 6} ${tipX + uy * 4 - ux * 6},${tipY - ux * 4 - uy * 6}`}
                            fill={CYAN}
                          />
                        </g>
                      );
                    })}
                    {/* Slow face-centre arrows (short, gray) — midpoints of each edge */}
                    {[
                      [(pts.top[0] + pts.right[0]) / 2, (pts.top[1] + pts.right[1]) / 2],
                      [(pts.right[0] + pts.bottom[0]) / 2, (pts.right[1] + pts.bottom[1]) / 2],
                      [(pts.bottom[0] + pts.left[0]) / 2, (pts.bottom[1] + pts.left[1]) / 2],
                      [(pts.left[0] + pts.top[0]) / 2, (pts.left[1] + pts.top[1]) / 2],
                    ].map((p, k) => {
                      const [px, py] = p;
                      const dx = px - cx;
                      const dy = py - cy;
                      const L = Math.hypot(dx, dy);
                      const ux = dx / L;
                      const uy = dy / L;
                      const tipX = px + ux * 7;
                      const tipY = py + uy * 7;
                      return (
                        <g key={`face-${k}`}>
                          <line
                            x1={px}
                            y1={py}
                            x2={tipX}
                            y2={tipY}
                            stroke={GRAY_DIM}
                            strokeWidth={1.1}
                          />
                        </g>
                      );
                    })}
                  </>
                );
              })()}
              {/* Legend */}
              <g>
                <line x1={boxX} y1={boxY + 148} x2={boxX + 14} y2={boxY + 148} stroke={CYAN} strokeWidth={1.6} />
                <text x={boxX + 22} y={boxY + 152} fill={GRAY} fontFamily={inter} fontSize={10} fontWeight={500} letterSpacing={2.4}>
                  EDGES · FAST
                </text>
                <line x1={boxX} y1={boxY + 168} x2={boxX + 14} y2={boxY + 168} stroke={GRAY_DIM} strokeWidth={1.1} />
                <text x={boxX + 22} y={boxY + 172} fill={GRAY_DIM} fontFamily={inter} fontSize={10} fontWeight={500} letterSpacing={2.4}>
                  FACES · SLOW
                </text>
              </g>
            </g>
          );
        })()}

        {/* Leader annotation: oxide film thickness (right side, inside frame) */}
        {(() => {
          const outer = terraceAt(0);
          const xShift = 140;
          const yShift = 40;
          const annOpacity = interpolate(
            frame,
            [fps * 2.4, fps * 3.2],
            [0, 0.95],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          // Target: right edge of the outer terrace
          const targetX = outer.right[0] + xShift;
          const targetY = outer.right[1] + yShift;
          // Anchor the callout box just inside the right margin
          const boxX = 760;
          const boxY = targetY - 130;
          const boxW = 200;
          const boxH = 96;
          return (
            <g opacity={annOpacity}>
              {/* Point on the crystal surface */}
              <circle cx={targetX} cy={targetY} r={3} fill={GOLD} />
              {/* Leader line: bent up-and-right to the box */}
              <line
                x1={targetX}
                y1={targetY}
                x2={boxX}
                y2={boxY + boxH - 12}
                stroke={GOLD}
                strokeWidth={1}
              />
              {/* Callout box (open bracket) */}
              <line x1={boxX} y1={boxY} x2={boxX + boxW} y2={boxY} stroke={GOLD} strokeWidth={1} />
              <line x1={boxX} y1={boxY} x2={boxX} y2={boxY + boxH} stroke={GOLD} strokeWidth={1} />
              <line x1={boxX} y1={boxY + boxH} x2={boxX + boxW} y2={boxY + boxH} stroke={GOLD} strokeWidth={1} />
              {/* Text stack */}
              <text
                x={boxX + 12}
                y={boxY + 20}
                fill={GOLD}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3.4}
              >
                Bi₂O₃ FILM
              </text>
              <text
                x={boxX + 12}
                y={boxY + 50}
                fill={GRAY}
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={22}
                fontWeight={500}
              >
                t ≈ 30–300 nm
              </text>
              <text
                x={boxX + 12}
                y={boxY + 78}
                fill={GRAY_DIM}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2.4}
              >
                THIN-FILM INTERFERENCE
              </text>
            </g>
          );
        })()}

        {/* Caption strip below the plate */}
        <g
          transform={`translate(80, 862)`}
          fill={GRAY_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={bandOpacity}
        >
          <text>FIG. 1 · KINETIC SKELETAL GROWTH · Bi (l) → Bi (s)</text>
          <text x={920} textAnchor="end" fill={MAGENTA} opacity={0.9}>
            EDGES CRYSTALLIZE FIRST
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 918,
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
            color: MAGENTA,
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
            Cathedral Architect
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
          The mineral
          <br />
          cathedral builder.
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
          Cooled slowly from its melt,{" "}
          <span style={{ color: MAGENTA, fontWeight: 600 }}>bismuth</span>{" "}
          crystallizes at its edges faster than its faces — a kinetic instability
          that stacks it into terraced hopper crystals, self-assembling ziggurat
          cathedrals whose rainbow skin is thin-film interference on a native
          oxide layer just tens of nanometres thick.
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
          color: GRAY_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: bandOpacity,
        }}
      >
        <span>Hopper growth · Bi₂O₃ interference · after Sunagawa</span>
        <span>
          <span style={{ color: GOLD }}>●</span> Oxide film = Color
        </span>
      </div>

      {/* Suppress unused-var lint in some setups */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
