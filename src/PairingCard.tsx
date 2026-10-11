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

// Palette — pulled from the concept's visual brief
const SOIL = "#120D08";
const SOIL_WARM = "#1C140C";
const HONEY = "#D9A24A";
const HONEY_GLOW = "#F3C978";
const GILL = "#F0DEB4";
const BARK = "#3A2A1A";
const BARK_LIGHT = "#5A4328";
const MOSS = "#4A5436";
const MIST = "#8A827A";
const RULE = "#2A1F14";

// ── Rhizomorph network ────────────────────────────────────────────────
// Coord space is 1080 wide × 760 tall; we scale it into the hero region.
// A central genet near the top-middle sends out a procedurally-grown
// branching system of "bootlace" filaments.
type RNode = { x: number; y: number; depth: number; parent: number };

function buildRhizomorphs(seed: number): {
  nodes: RNode[];
  edges: Array<{ a: number; b: number; w: number; delay: number }>;
} {
  // Simple seeded RNG
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const nodes: RNode[] = [{ x: 540, y: 215, depth: 0, parent: -1 }];
  const edges: Array<{ a: number; b: number; w: number; delay: number }> = [];

  type Shoot = {
    i: number;
    angle: number;
    len: number;
    width: number;
    delay: number;
    depth: number;
  };
  const stack: Shoot[] = [];
  // Seed shoots: nine primary trunks fanning out radially from the genet.
  // Angles are in radians measured from +x; 0 = east, π/2 = south.
  // We bias downwards & sideways (empire creeps horizontally through soil).
  const trunkAngles = [
    -0.05, 0.35, 0.75, 1.15, 1.57, 2.00, 2.40, 2.80, 3.19,
  ];
  for (let k = 0; k < trunkAngles.length; k++) {
    stack.push({
      i: 0,
      angle: trunkAngles[k] + (rnd() - 0.5) * 0.08,
      len: 110 + rnd() * 40,
      width: 10,
      delay: 0.0 + Math.abs(k - 4) * 0.012,
      depth: 1,
    });
  }
  const maxDepth = 8;
  let guard = 0;
  while (stack.length > 0 && guard < 4000) {
    guard++;
    const sh = stack.shift() as Shoot;
    if (sh.depth > maxDepth) continue;
    const parent = nodes[sh.i];
    const nx = parent.x + Math.cos(sh.angle) * sh.len;
    const ny = parent.y + Math.sin(sh.angle) * sh.len;
    // Clamp inside bounds (hero coord space 1080 wide, horizon at y≈175)
    if (nx < 30 || nx > 1050 || ny > 735 || ny < 180) continue;
    const idx = nodes.length;
    nodes.push({ x: nx, y: ny, depth: sh.depth, parent: sh.i });
    edges.push({
      a: sh.i,
      b: idx,
      w: Math.max(0.9, sh.width),
      delay: sh.delay,
    });
    // Branching: nearly guaranteed at low depth, tapers but stays frequent.
    const branchChance = sh.depth < 2 ? 1 : Math.max(0.55, 0.95 - sh.depth * 0.07);
    if (rnd() < branchChance) {
      const n = sh.depth < 2 ? 3 : rnd() < 0.5 ? 2 : 1;
      for (let c = 0; c < n; c++) {
        const spread = sh.depth < 2 ? 0.85 : 1.0;
        const newAngle = sh.angle + (rnd() - 0.5) * spread;
        const newLen = sh.len * (0.60 + rnd() * 0.22);
        const newW = sh.width * (0.66 + rnd() * 0.12);
        const dAdd = 0.035 + rnd() * 0.05;
        stack.push({
          i: idx,
          angle: newAngle,
          len: newLen,
          width: newW,
          delay: sh.delay + dAdd,
          depth: sh.depth + 1,
        });
      }
    }
    // Continuation: trunk often keeps going a bit further
    if (sh.depth < 5 && rnd() < 0.78) {
      stack.push({
        i: idx,
        angle: sh.angle + (rnd() - 0.5) * 0.35,
        len: sh.len * (0.78 + rnd() * 0.12),
        width: sh.width * 0.9,
        delay: sh.delay + 0.045 + rnd() * 0.03,
        depth: sh.depth + 1,
      });
    }
  }
  return { nodes, edges };
}

// Procedural edge path with slight curvature so filaments feel organic.
function filamentPath(a: RNode, b: RNode, seed: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const bend = ((seed % 1000) / 1000 - 0.5) * 0.22 * len;
  const mx = (a.x + b.x) / 2 + nx * bend;
  const my = (a.y + b.y) / 2 + ny * bend;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

// ── Boundary polygon tracing the "property line" ──────────────────────
// A hand-tuned irregular polygon enclosing the sprawl just inside the
// hero frame. Dashed amber — reads as a cadastral survey outline.
const BOUNDARY: Array<[number, number]> = [
  [70, 240],
  [220, 205],
  [430, 196],
  [660, 200],
  [850, 215],
  [990, 260],
  [1030, 400],
  [1010, 560],
  [930, 680],
  [780, 735],
  [520, 745],
  [280, 735],
  [130, 680],
  [50, 540],
  [40, 390],
  [70, 240],
];

function polyPath(pts: Array<[number, number]>): string {
  return pts
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");
}
function polyLen(pts: Array<[number, number]>): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total;
}

// ── A single mushroom drawn in SVG ────────────────────────────────────
const Mushroom: React.FC<{
  x: number;
  y: number;
  scale: number;
  tilt?: number;
  opacity?: number;
}> = ({ x, y, scale, tilt = 0, opacity = 1 }) => {
  // Local coord: stipe anchored at (0,0), cap arcs above.
  const capW = 46;
  const capH = 24;
  const stipeH = 42;
  const stipeW = 10;

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) rotate(${tilt})`}
      opacity={opacity}
    >
      {/* Stipe */}
      <path
        d={`M ${-stipeW / 2} 0 Q ${-stipeW / 2 - 1.4} ${-stipeH / 2} ${
          -stipeW / 2 + 1.1
        } ${-stipeH} L ${stipeW / 2 - 1.1} ${-stipeH} Q ${
          stipeW / 2 + 1.4
        } ${-stipeH / 2} ${stipeW / 2} 0 Z`}
        fill={GILL}
      />
      {/* Stipe shadow */}
      <path
        d={`M ${stipeW / 2 - 2} 0 Q ${stipeW / 2 - 0.6} ${-stipeH / 2} ${
          stipeW / 2 - 1.6
        } ${-stipeH} L ${stipeW / 2 - 1.1} ${-stipeH} Q ${
          stipeW / 2 + 1.4
        } ${-stipeH / 2} ${stipeW / 2} 0 Z`}
        fill={BARK_LIGHT}
        opacity={0.35}
      />
      {/* Partial veil ring on stipe */}
      <ellipse
        cx={0}
        cy={-stipeH + 10}
        rx={stipeW / 2 + 2.4}
        ry={1.6}
        fill={GILL}
      />
      {/* Gills visible under cap edge */}
      <path
        d={`M ${-capW / 2 + 2} ${-stipeH - 1} Q 0 ${-stipeH + 2} ${capW / 2 - 2} ${
          -stipeH - 1
        } Z`}
        fill={GILL}
      />
      {/* Cap */}
      <path
        d={`M ${-capW / 2} ${-stipeH - 1}
            Q ${-capW / 2 + 3} ${-stipeH - capH} 0 ${-stipeH - capH + 2}
            Q ${capW / 2 - 3} ${-stipeH - capH} ${capW / 2} ${-stipeH - 1}
            Q 0 ${-stipeH + 3} ${-capW / 2} ${-stipeH - 1} Z`}
        fill={HONEY}
      />
      {/* Cap highlight */}
      <path
        d={`M ${-capW / 2 + 6} ${-stipeH - 3}
            Q ${-capW / 4} ${-stipeH - capH + 5} 2 ${-stipeH - capH + 3}`}
        stroke={HONEY_GLOW}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        opacity={0.75}
      />
      {/* Dark freckles (characteristic Armillaria scales) */}
      <circle cx={-6} cy={-stipeH - capH + 10} r={1.4} fill={BARK} opacity={0.55} />
      <circle cx={5} cy={-stipeH - capH + 7} r={1.1} fill={BARK} opacity={0.55} />
      <circle cx={-11} cy={-stipeH - capH + 14} r={1.1} fill={BARK} opacity={0.5} />
      <circle cx={11} cy={-stipeH - capH + 12} r={1.3} fill={BARK} opacity={0.55} />
      <circle cx={0} cy={-stipeH - capH + 6} r={1.0} fill={BARK} opacity={0.45} />
      {/* Cap underside shadow */}
      <path
        d={`M ${-capW / 2 + 1} ${-stipeH - 1} Q 0 ${-stipeH - 4} ${capW / 2 - 1} ${
          -stipeH - 1
        }`}
        stroke={BARK}
        strokeWidth={1.4}
        fill="none"
        opacity={0.45}
      />
      {/* Ground shadow */}
      <ellipse cx={0} cy={2} rx={capW / 2.5} ry={2.6} fill="#000" opacity={0.42} />
    </g>
  );
};

// Surface mushroom flags scattered across the property (hero coord 1080×760).
// A main cluster at the central genet plus small satellite flushes elsewhere,
// so the surface reads as "flags of a wider holding" rather than one bush.
const MUSHROOMS = [
  // Central cluster — the main fruiting over the genet
  { x: 500, y: 170, scale: 0.78, tilt: -4 },
  { x: 528, y: 172, scale: 1.1, tilt: 1 },
  { x: 560, y: 170, scale: 0.9, tilt: 3 },
  { x: 585, y: 173, scale: 0.6, tilt: 2 },
  { x: 478, y: 173, scale: 0.55, tilt: -2 },
  // Scattered satellite flushes marking the baron's territory
  { x: 230, y: 172, scale: 0.6, tilt: -3 },
  { x: 268, y: 173, scale: 0.44, tilt: 2 },
  { x: 380, y: 172, scale: 0.52, tilt: 1 },
  { x: 710, y: 172, scale: 0.58, tilt: -2 },
  { x: 738, y: 173, scale: 0.42, tilt: 3 },
  { x: 850, y: 172, scale: 0.5, tilt: -1 },
  { x: 150, y: 172, scale: 0.38, tilt: 0 },
  { x: 920, y: 173, scale: 0.4, tilt: 2 },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Hero geometry: 1080 × 760 drawing area, placed inside the page ──
  // Page layout (1080 × 1350 portrait):
  // 0..110    metadata band
  // 110..880  hero vignette (970 wide × 770 tall, centered)
  // 905..1055 title block
  // 1070..1225 hook
  // 1265..    footer
  const HERO = { x: 60, y: 118, w: 960, h: 756 };
  const COORD_W = 1080;
  const COORD_H = 760;
  const kx = HERO.w / COORD_W;
  const ky = HERO.h / COORD_H;

  // Build the rhizomorph tree once (deterministic seed)
  const { nodes, edges } = React.useMemo(() => buildRhizomorphs(31337), []);

  // Growth timing — rhizomorphs germinate over ~3.5 s
  const growSpan = fps * 3.5;
  const t = Math.max(0, frame) / growSpan;

  // Title & hook timings
  const titleSpring = spring({
    frame: frame - fps * 2.0,
    fps,
    config: { damping: 180, mass: 0.7 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 2.6, fps * 3.4],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const boundaryOpacity = interpolate(
    frame,
    [fps * 2.2, fps * 3.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const boundaryTotal = polyLen(BOUNDARY);
  const boundaryDraw = interpolate(
    frame,
    [fps * 2.0, fps * 4.5],
    [boundaryTotal, 0],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const cartoucheOpacity = interpolate(
    frame,
    [fps * 2.8, fps * 3.6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Pulse-signal along the longest-trunk descendant
  const pulseSpan = fps * 2.4;
  const pulseProgress = ((frame - fps * 2.5) % pulseSpan) / pulseSpan;

  // Build a trunk polyline: descend from genet along the farthest-reaching
  // chain of descendants, so the amber signal pulse travels the longest
  // trunk — the clearest "survey" gesture.
  const trunkPath: RNode[] = React.useMemo(() => {
    // Precompute children map
    const childrenOf: Record<number, number[]> = {};
    for (const e of edges) {
      if (!childrenOf[e.a]) childrenOf[e.a] = [];
      childrenOf[e.a].push(e.b);
    }
    // DFS, picking the child whose subtree reaches the farthest Euclidean
    // distance from the root (visually, the longest trail).
    const dist = (i: number) =>
      Math.hypot(nodes[i].x - nodes[0].x, nodes[i].y - nodes[0].y);
    const subtreeFarthest: Record<number, number> = {};
    const stack = [0];
    const order: number[] = [];
    const visited = new Set<number>();
    while (stack.length) {
      const n = stack.pop() as number;
      if (visited.has(n)) continue;
      visited.add(n);
      order.push(n);
      for (const c of childrenOf[n] || []) stack.push(c);
    }
    for (let k = order.length - 1; k >= 0; k--) {
      const n = order[k];
      const kids = childrenOf[n] || [];
      let best = dist(n);
      for (const c of kids) best = Math.max(best, subtreeFarthest[c]);
      subtreeFarthest[n] = best;
    }
    const chain: RNode[] = [nodes[0]];
    let current = 0;
    for (let step = 0; step < 8; step++) {
      const kids = childrenOf[current] || [];
      if (!kids.length) break;
      let best = kids[0];
      let bestScore = -1;
      for (const c of kids) {
        if (subtreeFarthest[c] > bestScore) {
          bestScore = subtreeFarthest[c];
          best = c;
        }
      }
      chain.push(nodes[best]);
      current = best;
    }
    return chain;
  }, [nodes, edges]);

  const trunkSegLens = React.useMemo(
    () =>
      trunkPath
        .slice(1)
        .map((p, i) =>
          Math.hypot(p.x - trunkPath[i].x, p.y - trunkPath[i].y),
        ),
    [trunkPath],
  );
  const trunkTotal = trunkSegLens.reduce((a, b) => a + b, 0);
  const trunkAt = React.useMemo(() => {
    const d = pulseProgress * trunkTotal;
    let acc = 0;
    for (let i = 0; i < trunkSegLens.length; i++) {
      if (acc + trunkSegLens[i] >= d) {
        const f = (d - acc) / trunkSegLens[i];
        const a = trunkPath[i];
        const b = trunkPath[i + 1];
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      }
      acc += trunkSegLens[i];
    }
    return { x: trunkPath[trunkPath.length - 1].x, y: trunkPath[trunkPath.length - 1].y };
  }, [pulseProgress, trunkTotal, trunkSegLens, trunkPath]);

  return (
    <AbsoluteFill style={{ backgroundColor: SOIL, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Metadata band ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: MIST,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: HONEY }}>2026 · 10 · 11</span>
      </div>

      {/* ── Hero SVG ──────────────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Soil gradient background for hero */}
          <linearGradient id="soil-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SOIL_WARM} />
            <stop offset="1" stopColor={SOIL} />
          </linearGradient>

          {/* Amber warmth glow around the center */}
          <radialGradient id="center-warm" cx="50%" cy="18%" r="60%">
            <stop offset="0%" stopColor={HONEY} stopOpacity={0.22} />
            <stop offset="55%" stopColor={HONEY} stopOpacity={0.04} />
            <stop offset="100%" stopColor={HONEY} stopOpacity={0} />
          </radialGradient>

          {/* Filament glow filter */}
          <filter id="root-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="pulse-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HONEY_GLOW} stopOpacity={0.9} />
            <stop offset="100%" stopColor={HONEY} stopOpacity={0} />
          </radialGradient>

          {/* Soft fog for ground-fade at top of hero */}
          <linearGradient id="ground-fog" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SOIL} stopOpacity={1} />
            <stop offset="0.6" stopColor={SOIL} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Hero background */}
        <rect
          x={HERO.x}
          y={HERO.y}
          width={HERO.w}
          height={HERO.h}
          fill="url(#soil-grad)"
        />
        <rect
          x={HERO.x}
          y={HERO.y}
          width={HERO.w}
          height={HERO.h}
          fill="url(#center-warm)"
        />

        {/* Hero corner tick marks (surveyor's registration) */}
        {(
          [
            [HERO.x, HERO.y, 1, 1],
            [HERO.x + HERO.w, HERO.y, -1, 1],
            [HERO.x, HERO.y + HERO.h, 1, -1],
            [HERO.x + HERO.w, HERO.y + HERO.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={HONEY} strokeWidth={1.3} fill="none" opacity={0.8}>
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Inner hairline frame */}
        <rect
          x={HERO.x + 0.5}
          y={HERO.y + 0.5}
          width={HERO.w - 1}
          height={HERO.h - 1}
          fill="none"
          stroke={RULE}
          strokeWidth={1}
        />

        {/* ── Hero contents are drawn in the 1080×760 coord space ── */}
        <g transform={`translate(${HERO.x}, ${HERO.y}) scale(${kx}, ${ky})`}>
          {/* Distant conifer silhouettes above the horizon — the forest
              Armillaria quietly works beneath. Kept intentionally faint. */}
          {(() => {
            const trees: Array<[number, number, number]> = [
              // [baseX, height, tilt-degrees]
              [60, 54, 0],
              [100, 72, -1],
              [148, 56, 1],
              [196, 86, 0],
              [252, 48, -1],
              [300, 70, 0],
              [346, 44, 1],
              [392, 60, 0],
              // leave a gap in the center for the mushroom cluster
              [688, 48, 0],
              [732, 62, -1],
              [778, 44, 1],
              [820, 78, 0],
              [872, 54, 0],
              [918, 68, 1],
              [968, 46, -1],
              [1014, 60, 0],
            ];
            return trees.map(([bx, h, tilt], i) => {
              const half = h * 0.18;
              return (
                <g
                  key={`tree-${i}`}
                  transform={`translate(${bx}, 186) rotate(${tilt})`}
                  opacity={0.42}
                >
                  <path
                    d={`M 0 0
                        L ${-half} ${-h * 0.3}
                        L ${-half * 0.55} ${-h * 0.3}
                        L ${-half * 0.9} ${-h * 0.55}
                        L ${-half * 0.4} ${-h * 0.55}
                        L ${-half * 0.75} ${-h * 0.8}
                        L ${-half * 0.3} ${-h * 0.8}
                        L 0 ${-h}
                        L ${half * 0.3} ${-h * 0.8}
                        L ${half * 0.75} ${-h * 0.8}
                        L ${half * 0.4} ${-h * 0.55}
                        L ${half * 0.9} ${-h * 0.55}
                        L ${half * 0.55} ${-h * 0.3}
                        L ${half} ${-h * 0.3}
                        Z`}
                    fill={MOSS}
                    fillOpacity={0.55}
                  />
                  <rect
                    x={-1.4}
                    y={-h * 0.3}
                    width={2.8}
                    height={h * 0.3}
                    fill={BARK}
                    fillOpacity={0.6}
                  />
                </g>
              );
            });
          })()}

          {/* Horizon / soil cross-section line */}
          <g>
            <line
              x1={0}
              y1={186}
              x2={1080}
              y2={186}
              stroke={MOSS}
              strokeOpacity={0.65}
              strokeWidth={1.4}
            />
            {/* Soil-section hatching below the ground line */}
            {Array.from({ length: 44 }).map((_, i) => (
              <line
                key={`hatch-${i}`}
                x1={20 + i * 24}
                y1={189}
                x2={10 + i * 24}
                y2={201}
                stroke={MOSS}
                strokeOpacity={0.22}
                strokeWidth={1}
              />
            ))}
            <text
              x={30}
              y={180}
              fill={MIST}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3}
              fontWeight={500}
            >
              DUFF LAYER
            </text>
            <text
              x={1050}
              y={180}
              textAnchor="end"
              fill={MIST}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3}
              fontWeight={500}
            >
              SOIL HORIZON
            </text>
          </g>

          {/* Dashed property-line (surveyor's cadastral boundary) */}
          <g opacity={boundaryOpacity}>
            <path
              d={polyPath(BOUNDARY)}
              fill="none"
              stroke={HONEY}
              strokeWidth={1.6}
              strokeDasharray="9 7"
              strokeDashoffset={boundaryDraw}
            />
            {/* Boundary markers at each vertex */}
            {BOUNDARY.slice(0, -1).map((p, i) => (
              <g key={`bm-${i}`}>
                <circle cx={p[0]} cy={p[1]} r={2.4} fill={HONEY} />
                <circle
                  cx={p[0]}
                  cy={p[1]}
                  r={5}
                  fill="none"
                  stroke={HONEY}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                />
              </g>
            ))}
          </g>

          {/* Rhizomorph edges — glow pass */}
          {edges.map((e, i) => {
            const a = nodes[e.a];
            const b = nodes[e.b];
            const path = filamentPath(a, b, i * 97 + 17);
            const len = Math.hypot(b.x - a.x, b.y - a.y) * 1.15 + 8;
            const localT = (t - e.delay) / 0.18;
            const grow = Math.max(0, Math.min(1, localT));
            const eased = 1 - Math.pow(1 - grow, 3);
            const dashOffset = len * (1 - eased);
            return (
              <path
                key={`g-${i}`}
                d={path}
                stroke={BARK_LIGHT}
                strokeWidth={e.w + 5}
                strokeOpacity={0.18 * eased}
                fill="none"
                strokeLinecap="round"
                filter="url(#root-glow)"
                strokeDasharray={len}
                strokeDashoffset={dashOffset}
              />
            );
          })}

          {/* Rhizomorph edges — bootlace cores */}
          {edges.map((e, i) => {
            const a = nodes[e.a];
            const b = nodes[e.b];
            const path = filamentPath(a, b, i * 97 + 17);
            const len = Math.hypot(b.x - a.x, b.y - a.y) * 1.15 + 8;
            const localT = (t - e.delay) / 0.18;
            const grow = Math.max(0, Math.min(1, localT));
            const eased = 1 - Math.pow(1 - grow, 3);
            const dashOffset = len * (1 - eased);
            return (
              <g key={`c-${i}`}>
                <path
                  d={path}
                  stroke={BARK}
                  strokeWidth={e.w}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dashOffset}
                />
                <path
                  d={path}
                  stroke={BARK_LIGHT}
                  strokeWidth={Math.max(0.8, e.w - 3)}
                  strokeOpacity={0.42}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={dashOffset}
                />
              </g>
            );
          })}

          {/* Central genet marker (where surface meets underground empire) */}
          <g>
            <circle
              cx={540}
              cy={215}
              r={14}
              fill={HONEY}
              fillOpacity={0.18}
            />
            <circle cx={540} cy={215} r={6} fill={HONEY} />
            <circle cx={540} cy={215} r={2.2} fill={GILL} />
            {/* Leader line up to the main cluster of mushrooms */}
            <line
              x1={540}
              y1={210}
              x2={540}
              y2={190}
              stroke={HONEY}
              strokeOpacity={0.55}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          </g>

          {/* Terminal rhizomorph tips as nodes */}
          {nodes.slice(1).map((n, i) => {
            const localT = (t - 0.02 * i) * 1.2;
            const op = Math.max(0, Math.min(1, localT - 0.4));
            return (
              <circle
                key={`node-${i}`}
                cx={n.x}
                cy={n.y}
                r={1.4}
                fill={BARK_LIGHT}
                opacity={op * 0.9}
              />
            );
          })}

          {/* Amber survey pulse travelling the longest trunk */}
          {frame > fps * 2.5 && (
            <g>
              <circle
                cx={trunkAt.x}
                cy={trunkAt.y}
                r={16}
                fill="url(#pulse-glow)"
              />
              <circle cx={trunkAt.x} cy={trunkAt.y} r={3.8} fill={HONEY_GLOW} />
            </g>
          )}

          {/* Soft fade above the horizon so mushrooms sit on it cleanly */}
          <rect x={0} y={0} width={1080} height={150} fill="url(#ground-fog)" />

          {/* Surface mushrooms — appear once the trunks are formed */}
          {MUSHROOMS.map((m, i) => {
            const localT = (t - 0.3 - i * 0.05);
            const grow = Math.max(0, Math.min(1, localT * 2.2));
            const eased = 1 - Math.pow(1 - grow, 3);
            return (
              <g
                key={`m-${i}`}
                transform={`translate(${m.x}, ${m.y}) scale(${eased})`}
                style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
              >
                <Mushroom
                  x={0}
                  y={0}
                  scale={m.scale}
                  tilt={m.tilt}
                  opacity={eased}
                />
              </g>
            );
          })}
        </g>

        {/* ── Deed cartouche (surveyor's property record) ─── */}
        <g
          transform={`translate(${HERO.x + 48}, ${HERO.y + HERO.h - 268})`}
          opacity={cartoucheOpacity}
        >
          <rect
            x={0}
            y={0}
            width={240}
            height={176}
            fill={SOIL}
            fillOpacity={0.92}
            stroke={HONEY}
            strokeWidth={1.2}
          />
          {/* Corner pips */}
          {[[0, 0], [240, 0], [0, 176], [240, 176]].map(([cx, cy], i) => (
            <g key={`pip-${i}`} fill={HONEY}>
              <circle cx={cx} cy={cy} r={2.6} />
            </g>
          ))}
          <text
            x={16}
            y={28}
            fill={HONEY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={4}
            fontWeight={600}
          >
            ROOT RECORD · OR
          </text>
          <line
            x1={16}
            y1={38}
            x2={230}
            y2={38}
            stroke={HONEY}
            strokeOpacity={0.4}
            strokeWidth={1}
          />
          <text
            x={16}
            y={64}
            fill={MIST}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
          >
            GENET
          </text>
          <text
            x={16}
            y={82}
            fill={GILL}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={18}
            fontWeight={500}
          >
            Armillaria ostoyae
          </text>
          <text
            x={16}
            y={108}
            fill={MIST}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
          >
            HOLDINGS
          </text>
          <text
            x={16}
            y={128}
            fill={GILL}
            fontFamily={playfair}
            fontSize={22}
            fontWeight={500}
          >
            2,384 ACRES
          </text>
          <text
            x={16}
            y={154}
            fill={MIST}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
          >
            TENURE
          </text>
          <text
            x={16}
            y={172}
            fill={GILL}
            fontFamily={playfair}
            fontSize={18}
            fontWeight={500}
          >
            c. 2,400 yrs
          </text>
        </g>

        {/* ── Scale bar (bottom-right) ─────────────────── */}
        <g
          transform={`translate(${HERO.x + HERO.w - 170}, ${
            HERO.y + HERO.h - 30
          })`}
          stroke={MIST}
          fill={MIST}
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
            1 MI
          </text>
        </g>

        {/* Figure caption */}
        <g
          transform={`translate(${HERO.x}, ${HERO.y + HERO.h + 24})`}
          fill={MIST}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · SPREAD OF A SINGLE A. OSTOYAE GENET, MALHEUR N.F.</text>
          <text
            x={HERO.w}
            textAnchor="end"
            fill={HONEY}
            opacity={0.88}
          >
            ONE ORGANISM · 965 HA
          </text>
        </g>
      </svg>

      {/* ── Type lockup ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 940,
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
            color: HONEY,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: MIST, margin: "0 6px" }}>/</span>
          <span style={{ color: "#EDE2CA", letterSpacing: 5 }}>Land Baron</span>
        </div>

        <div
          style={{
            color: "#F2E7CF",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
            maxWidth: 820,
          }}
        >
          The silent baron
          <br />
          of the Blue Mountains.
        </div>
      </div>

      {/* Hook */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1140,
          opacity: hookOpacity,
          color: "#D7CDB4",
          fontFamily: inter,
          fontSize: 18,
          lineHeight: 1.42,
          fontWeight: 400,
          maxWidth: 920,
        }}
      >
        One <span style={{ color: HONEY, fontWeight: 600 }}>Armillaria ostoyae</span>{" "}
        clone in Oregon's Malheur National Forest holds{" "}
        <span style={{ color: HONEY_GLOW, fontWeight: 600 }}>2,384 acres</span> as
        a single, genetically identical mycelium — ~2,400 years of quiet
        acquisition through bootlace rhizomorphs, likely the largest organism on
        Earth.
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
          color: MIST,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Ferguson et al. · Can. J. For. Res. 33 (2003) 612–623</span>
        <span>
          <span style={{ color: HONEY }}>●</span> Honey Mushroom = Surface Flag
        </span>
      </div>

      {/* Silence unused frame var when near end to avoid linter noise */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
