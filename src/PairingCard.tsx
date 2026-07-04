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

// ── Palette (from the concept brief) ──────────────────────────────────────
const INK = "#0A0714";           // near-black night sky
const SKY_BAND = "#120E1F";      // slightly warmer top band
const EARTH = "#1A0F09";         // subterranean warm dark
const SAND = "#F2E7C6";          // pale silica
const SAND_DIM = "#A79878";      // sand shadow
const AMBER = "#C6A66A";         // fulgurite outer surface
const AMBER_HOT = "#E9C878";     // fulgurite highlight
const BOLT = "#8FB4E8";          // lightning core (cold blue)
const BOLT_HOT = "#E6F0FF";      // white-hot filament
const GRAY = "#7A7E8C";          // draftsman gray

// ── Geometry ──────────────────────────────────────────────────────────────
// A single hand-composed lightning bolt above the sand line, then mirrored
// below it as the fulgurite. Same shape, sitter → likeness.

const STRIKE_X = 520;            // x of ground-strike point
const SAND_Y = 580;              // y of sand line
const MIRROR_COMPRESS = 0.62;    // fulgurites don't extend as deep as strikes reach high

// Lightning zig-zag from top of sky to strike point.
// Points listed top-to-bottom. Includes branches.
type Pt = { x: number; y: number };

const MAIN: Pt[] = [
  { x: 470, y: 156 },
  { x: 502, y: 200 },
  { x: 478, y: 246 },
  { x: 512, y: 286 },
  { x: 486, y: 328 },
  { x: 528, y: 370 },
  { x: 500, y: 412 },
  { x: 542, y: 454 },
  { x: 508, y: 500 },
  { x: 534, y: 542 },
  { x: STRIKE_X, y: SAND_Y },
];

// Branch A: splits off high on the trunk, dead-ends left
const BRANCH_A: Pt[] = [
  { x: 486, y: 328 },              // shared with MAIN[4]
  { x: 438, y: 348 },
  { x: 410, y: 326 },
  { x: 376, y: 354 },
  { x: 356, y: 334 },
];

// Branch B: splits mid, curls right, terminates before ground
const BRANCH_B: Pt[] = [
  { x: 500, y: 412 },              // shared with MAIN[6]
  { x: 566, y: 420 },
  { x: 604, y: 454 },
  { x: 646, y: 458 },
  { x: 682, y: 492 },
  { x: 668, y: 524 },
];

// Sub-branch off B
const BRANCH_B2: Pt[] = [
  { x: 604, y: 454 },              // shared with BRANCH_B[2]
  { x: 636, y: 430 },
  { x: 672, y: 438 },
];

// Small stub near strike point
const BRANCH_C: Pt[] = [
  { x: 508, y: 500 },              // shared with MAIN[8]
  { x: 462, y: 526 },
  { x: 442, y: 554 },
];

const SEGMENTS: Pt[][] = [MAIN, BRANCH_A, BRANCH_B, BRANCH_B2, BRANCH_C];

// Reflect a point about the sand line, compressed — fulgurites are shorter
// than the aerial strike geometry above them.
const mirror = (p: Pt): Pt => ({
  x: p.x,
  y: SAND_Y + (SAND_Y - p.y) * MIRROR_COMPRESS,
});

// Cumulative distance along a polyline, per vertex.
const cumLen = (pts: Pt[]): number[] => {
  const out: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    out.push(out[i - 1] + Math.hypot(dx, dy));
  }
  return out;
};

// Build an SVG "M/L" path from a polyline.
const polyPath = (pts: Pt[]): string =>
  pts.reduce(
    (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
    "",
  );

// Total polyline length.
const polyLen = (pts: Pt[]): number => {
  const c = cumLen(pts);
  return c[c.length - 1];
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timeline (30 fps, 150 frames = 5s) ──────────────────────────────
  // 0–8    : quiet — just sand line & metadata
  // 8–24   : lightning descends (stroke draw-in)
  // 24–34  : bright flash + hold
  // 34–70  : lightning dims to a ghost
  // 40–90  : fulgurite ignites below sand line (mirrored path)
  // 90–150 : hold + gentle pulse; type block continues to breathe

  const boltDraw = interpolate(frame, [fps * 0.27, fps * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const flash = interpolate(
    frame,
    [fps * 0.6, fps * 0.8, fps * 1.1, fps * 2.3],
    [0, 1, 0.85, 0.18],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const boltHot = interpolate(
    frame,
    [fps * 0.6, fps * 0.9, fps * 1.4, fps * 2.5],
    [0, 1, 0.7, 0.05],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const fulgDraw = interpolate(frame, [fps * 1.2, fps * 2.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fulgGlow = interpolate(frame, [fps * 1.4, fps * 3.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow breathing pulse on the settled fulgurite
  const breathePhase = (frame - fps * 3.2) / fps;
  const breathe =
    frame > fps * 3.2
      ? 0.5 + 0.5 * Math.sin(breathePhase * Math.PI * 0.55)
      : 0;

  // Sand-line shockwave: brief horizontal streak at the moment of strike
  const shock = interpolate(
    frame,
    [fps * 0.75, fps * 0.95, fps * 1.4],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Type block springs
  const roleSpring = spring({
    frame: frame - fps * 0.15,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const titleSpring = spring({
    frame: frame - fps * 1.6,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 2.4, fps * 3.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Precompute per-segment lengths for stroke-dash draw-in
  const segLens = SEGMENTS.map(polyLen);
  const totalLen = segLens.reduce((a, b) => a + b, 0);
  const segStarts = segLens.reduce<number[]>(
    (acc, l, i) => (i === 0 ? [0] : [...acc, acc[i - 1] + segLens[i - 1]]),
    [0],
  );

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
        <span style={{ color: AMBER }}>2026 · 07 · 04</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky gradient — near-black warming into ink */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY_BAND} />
            <stop offset="100%" stopColor={INK} />
          </linearGradient>

          {/* Earth gradient — warm dark deepening toward bottom */}
          <linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F1508" />
            <stop offset="100%" stopColor="#0A0705" />
          </linearGradient>

          {/* Bolt glow */}
          <radialGradient id="bolt-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BOLT_HOT} stopOpacity={0.5} />
            <stop offset="100%" stopColor={BOLT} stopOpacity={0} />
          </radialGradient>

          {/* Fulgurite glow */}
          <radialGradient id="amber-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER_HOT} stopOpacity={0.55} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <filter id="bolt-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="amber-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip regions so bolt only draws in sky, fulgurite only in earth */}
          <clipPath id="sky-clip">
            <rect x={0} y={0} width={1080} height={SAND_Y} />
          </clipPath>
          <clipPath id="earth-clip">
            <rect x={0} y={SAND_Y} width={1080} height={910 - SAND_Y} />
          </clipPath>
        </defs>

        {/* Sky panel */}
        <rect x={0} y={120} width={1080} height={SAND_Y - 120} fill="url(#sky)" />
        {/* Earth panel */}
        <rect
          x={0}
          y={SAND_Y}
          width={1080}
          height={910 - SAND_Y}
          fill="url(#earth)"
        />

        {/* Flash wash on the sky during the strike */}
        <rect
          x={0}
          y={120}
          width={1080}
          height={SAND_Y - 120}
          fill={BOLT_HOT}
          opacity={flash * 0.09}
        />

        {/* ── Sky-side registration marks (mineral-plate frame) ────── */}
        <g stroke={GRAY} strokeOpacity={0.32} strokeWidth={1}>
          <line x1={80} y1={140} x2={128} y2={140} />
          <line x1={80} y1={140} x2={80} y2={172} />
          <line x1={1000} y1={140} x2={1000} y2={172} />
          <line x1={1000} y1={140} x2={952} y2={140} />
        </g>

        {/* PLATE label top-left of the sky panel */}
        <text
          x={80}
          y={162}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={4}
        >
          PLATE III · SUBJECT ↑ · LIKENESS ↓
        </text>
        <text
          x={1000}
          y={162}
          textAnchor="end"
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          fontWeight={500}
          letterSpacing={3.5}
        >
          FIG. 1 — CG DISCHARGE, ≈30,000 K
        </text>

        {/* Cloud-base dashed line: anchors the top of the sky panel and gives
            the bolt a "point of origin" */}
        <line
          x1={80}
          y1={188}
          x2={1000}
          y2={188}
          stroke={GRAY}
          strokeOpacity={0.28}
          strokeWidth={1}
          strokeDasharray="2 6"
        />
        <text
          x={80}
          y={182}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          fontWeight={500}
          letterSpacing={3.5}
          opacity={0.75}
        >
          CLOUD BASE
        </text>
        <text
          x={1000}
          y={182}
          textAnchor="end"
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          fontWeight={500}
          letterSpacing={3.5}
          opacity={0.75}
        >
          NEGATIVE LEADER · 0 s
        </text>

        {/* ── SKY: the lightning bolt (SUBJECT) ────────────────────── */}
        <g clipPath="url(#sky-clip)">
          {/* Softly draw a wide halo along the path first */}
          <g opacity={flash * 0.9} filter="url(#bolt-glow)">
            {SEGMENTS.map((seg, i) => {
              const L = segLens[i];
              const start = segStarts[i];
              const localDraw = Math.max(
                0,
                Math.min(1, (boltDraw * totalLen - start) / L),
              );
              return (
                <path
                  key={`sky-halo-${i}`}
                  d={polyPath(seg)}
                  stroke={BOLT}
                  strokeWidth={22}
                  strokeOpacity={0.35}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={L}
                  strokeDashoffset={L * (1 - localDraw)}
                />
              );
            })}
          </g>

          {/* Cold blue channel */}
          {SEGMENTS.map((seg, i) => {
            const L = segLens[i];
            const start = segStarts[i];
            const localDraw = Math.max(
              0,
              Math.min(1, (boltDraw * totalLen - start) / L),
            );
            const w = i === 0 ? 4 : i === 1 || i === 2 ? 2.6 : 2;
            return (
              <path
                key={`sky-cold-${i}`}
                d={polyPath(seg)}
                stroke={BOLT}
                strokeWidth={w}
                strokeOpacity={0.75 + 0.25 * flash}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={L}
                strokeDashoffset={L * (1 - localDraw)}
              />
            );
          })}

          {/* White-hot filament in the middle of the trunk */}
          {SEGMENTS.map((seg, i) => {
            const L = segLens[i];
            const start = segStarts[i];
            const localDraw = Math.max(
              0,
              Math.min(1, (boltDraw * totalLen - start) / L),
            );
            const w = i === 0 ? 1.6 : 1;
            return (
              <path
                key={`sky-hot-${i}`}
                d={polyPath(seg)}
                stroke={BOLT_HOT}
                strokeWidth={w}
                strokeOpacity={boltHot}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={L}
                strokeDashoffset={L * (1 - localDraw)}
              />
            );
          })}

          {/* Strike-point halo (small radial burst) */}
          <circle
            cx={STRIKE_X}
            cy={SAND_Y}
            r={110}
            fill="url(#bolt-halo)"
            opacity={flash * 0.9}
          />
          <circle
            cx={STRIKE_X}
            cy={SAND_Y - 6}
            r={7}
            fill={BOLT_HOT}
            opacity={boltHot}
          />
        </g>

        {/* ── SAND LINE ────────────────────────────────────────────── */}
        {/* Sand band */}
        <rect
          x={0}
          y={SAND_Y}
          width={1080}
          height={22}
          fill={SAND}
          opacity={0.94}
        />
        {/* Thin darker underline */}
        <line
          x1={0}
          y1={SAND_Y + 22}
          x2={1080}
          y2={SAND_Y + 22}
          stroke={SAND_DIM}
          strokeWidth={1.3}
        />
        {/* Sand tick marks (draftsman rhythm) */}
        {Array.from({ length: 27 }).map((_, i) => {
          const x = 80 + i * 34.6;
          const isMajor = i % 5 === 0;
          return (
            <line
              key={`tick-${i}`}
              x1={x}
              y1={SAND_Y + 22}
              x2={x}
              y2={SAND_Y + 22 + (isMajor ? 10 : 5)}
              stroke={SAND_DIM}
              strokeWidth={1}
            />
          );
        })}
        {/* Sand-line labels */}
        <text
          x={80}
          y={SAND_Y - 10}
          fill={SAND_DIM}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={4}
        >
          SURFACE · 0 CM
        </text>
        <text
          x={1000}
          y={SAND_Y - 10}
          textAnchor="end"
          fill={SAND_DIM}
          fontFamily={inter}
          fontSize={11}
          fontWeight={500}
          letterSpacing={4}
        >
          SiO₂ SAND · FUSING TEMP 1,713 °C
        </text>

        {/* Shockwave streak: brief horizontal white flash across the sand */}
        <rect
          x={STRIKE_X - shock * 900}
          y={SAND_Y - 1}
          width={shock * 1800}
          height={4}
          fill={BOLT_HOT}
          opacity={shock * 0.7}
        />

        {/* ── EARTH: the fulgurite (LIKENESS) ───────────────────────── */}
        <g clipPath="url(#earth-clip)">
          {/* Warm halo along the mirrored path */}
          <g opacity={fulgGlow * (0.85 + 0.15 * breathe)} filter="url(#amber-glow)">
            {SEGMENTS.map((seg, i) => {
              const mSeg = seg.map(mirror);
              const L = segLens[i];
              const start = segStarts[i];
              const localDraw = Math.max(
                0,
                Math.min(1, (fulgDraw * totalLen - start) / L),
              );
              return (
                <path
                  key={`earth-halo-${i}`}
                  d={polyPath(mSeg)}
                  stroke={AMBER}
                  strokeWidth={16}
                  strokeOpacity={0.45}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={L}
                  strokeDashoffset={L * (1 - localDraw)}
                />
              );
            })}
          </g>

          {/* Amber outer tube */}
          {SEGMENTS.map((seg, i) => {
            const mSeg = seg.map(mirror);
            const L = segLens[i];
            const start = segStarts[i];
            const localDraw = Math.max(
              0,
              Math.min(1, (fulgDraw * totalLen - start) / L),
            );
            const w = i === 0 ? 10 : i === 1 || i === 2 ? 6 : 4.5;
            return (
              <path
                key={`earth-outer-${i}`}
                d={polyPath(mSeg)}
                stroke={AMBER}
                strokeWidth={w}
                strokeOpacity={fulgDraw}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={L}
                strokeDashoffset={L * (1 - localDraw)}
              />
            );
          })}

          {/* Hot amber core — thinner highlight inside the tube */}
          {SEGMENTS.map((seg, i) => {
            const mSeg = seg.map(mirror);
            const L = segLens[i];
            const start = segStarts[i];
            const localDraw = Math.max(
              0,
              Math.min(1, (fulgDraw * totalLen - start) / L),
            );
            const w = i === 0 ? 3.5 : 1.8;
            return (
              <path
                key={`earth-core-${i}`}
                d={polyPath(mSeg)}
                stroke={AMBER_HOT}
                strokeWidth={w}
                strokeOpacity={
                  fulgGlow * (0.85 + 0.15 * breathe)
                }
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={L}
                strokeDashoffset={L * (1 - localDraw)}
              />
            );
          })}

          {/* Root bulb at the deepest strike terminus */}
          {(() => {
            const tail = mirror(MAIN[MAIN.length - 2]);
            const tip = mirror(MAIN[0]); // top of main mirrored = deepest
            return (
              <g opacity={fulgGlow * (0.9 + 0.1 * breathe)}>
                <circle
                  cx={tip.x}
                  cy={tip.y}
                  r={26}
                  fill="url(#amber-halo)"
                />
                <circle cx={tip.x} cy={tip.y} r={9} fill={AMBER} />
                <circle cx={tip.x} cy={tip.y} r={4} fill={AMBER_HOT} />
                {/* Small chevrons pointing at the terminus */}
                <line
                  x1={tail.x + 14}
                  y1={tail.y + 12}
                  x2={tip.x + 4}
                  y2={tip.y - 12}
                  stroke={SAND_DIM}
                  strokeWidth={1}
                  strokeOpacity={0.4}
                />
              </g>
            );
          })()}
        </g>

        {/* ── Ground callout: depth ruler on the right of the earth ── */}
        <g
          stroke={SAND_DIM}
          strokeWidth={1}
          fontFamily={inter}
          fontSize={10}
          fontWeight={500}
          letterSpacing={3}
          fill={SAND_DIM}
        >
          <line x1={1000} y1={SAND_Y + 30} x2={1000} y2={892} />
          {[
            { y: SAND_Y + 30, label: "0" },
            { y: SAND_Y + 100, label: "50" },
            { y: SAND_Y + 170, label: "100" },
            { y: SAND_Y + 240, label: "150" },
          ].map((r) => (
            <g key={`depth-${r.label}`}>
              <line x1={994} y1={r.y} x2={1006} y2={r.y} />
              <text
                x={988}
                y={r.y + 3}
                textAnchor="end"
                stroke="none"
                fill={SAND_DIM}
              >
                {r.label}
              </text>
            </g>
          ))}
          <text
            x={1006}
            y={904}
            textAnchor="end"
            stroke="none"
            fill={SAND_DIM}
          >
            CM
          </text>
        </g>

        {/* Caption strip below the diagram */}
        <g
          transform={`translate(80, 936)`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 2 · FULGURITE FORMED BY GROUND-STRIKE, IN SITU</text>
          <text x={920} textAnchor="end" fill={AMBER} opacity={0.9}>
            SUBJECT × LIKENESS · SHAPE-FOR-SHAPE
          </text>
        </g>
      </svg>

      {/* ── Type lockup (bottom third) ─────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 982,
          opacity: roleSpring,
          transform: `translateY(${interpolate(
            roleSpring,
            [0, 1],
            [10, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: AMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Portraitist
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1020,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [14, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The lightning's
          <br />
          <span style={{ color: AMBER_HOT }}>sitter.</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1198,
          color: "#C8CAD0",
          fontFamily: inter,
          fontSize: 17,
          lineHeight: 1.4,
          fontWeight: 400,
          maxWidth: 900,
          opacity: hookOpacity,
        }}
      >
        A cloud-to-ground strike reaches{" "}
        <span style={{ color: BOLT, fontWeight: 600 }}>≈30,000 K</span> — five
        times the Sun's surface. Enter silica sand, and{" "}
        <span style={{ color: AMBER, fontWeight: 600 }}>fulgurite</span> forms:
        a hollow glass tube fused along the current's exact branching path —
        the sitter, portrayed in mineral.
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 32,
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
        <span>Latin fulgur · "lightning"</span>
        <span>
          <span style={{ color: BOLT }}>●</span>&nbsp;subject
          <span style={{ color: AMBER, marginLeft: 18 }}>●</span>&nbsp;likeness
        </span>
      </div>
    </AbsoluteFill>
  );
};
