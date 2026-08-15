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
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-style: normal; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-style: italic; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2'); }
`;

// Palette — from the concept's visual brief
const ABYSS = "#040E24";
const COBALT = "#0B1F4C";
const ELECTRIC = "#1E62E6";
const PEARL = "#8FC0F5";
const BRASS = "#F2C36B";
const GRAY = "#5C6A85";
const GRID = "#0E1E44";
const GRID_MAJOR = "#152A5A";
const INK_LABEL = "#E9EDF5";

// Frame layout inside 1080 x 1350
const FRAME = { x: 60, y: 130, w: 960, h: 760 };

// Body centerline & anchor points (native SVG coord space, not scaled)
const CX = 540;
const HEAD_Y = 240;
const TAIL_Y = 840;

type Cluster = {
  y: number;
  count: number;
  len: number;
  spread: number; // half-angle in degrees from horizontal
  startDelay: number; // 0..1 in normalized timeline
};

const CLUSTERS: Cluster[] = [
  { y: 355, count: 4, len: 155, spread: 22, startDelay: 0.30 },
  { y: 505, count: 6, len: 235, spread: 32, startDelay: 0.40 },
  { y: 660, count: 4, len: 170, spread: 22, startDelay: 0.50 },
];

// Body outline path — smooth head bulge, three cluster bulges, tapered tail
const BODY_PATH = `
  M ${CX} ${HEAD_Y - 12}
  C ${CX - 18} ${HEAD_Y - 8} ${CX - 34} ${HEAD_Y + 12} ${CX - 40} ${HEAD_Y + 50}
  C ${CX - 44} ${340} ${CX - 40} ${425} ${CX - 46} ${500}
  C ${CX - 52} ${560} ${CX - 34} ${620} ${CX - 40} ${660}
  C ${CX - 34} ${720} ${CX - 14} ${TAIL_Y - 30} ${CX} ${TAIL_Y}
  C ${CX + 14} ${TAIL_Y - 30} ${CX + 34} ${720} ${CX + 40} ${660}
  C ${CX + 34} ${620} ${CX + 52} ${560} ${CX + 46} ${500}
  C ${CX + 40} ${425} ${CX + 44} ${340} ${CX + 40} ${HEAD_Y + 50}
  C ${CX + 34} ${HEAD_Y + 12} ${CX + 18} ${HEAD_Y - 8} ${CX} ${HEAD_Y - 12}
  Z
`;

// A single ceras path: base at (bx, by), tip at (tx, ty), gently curved outward
const cerasPath = (
  bx: number,
  by: number,
  tx: number,
  ty: number,
  side: number,
): string => {
  const midx = (bx + tx) / 2 + side * 14;
  const midy = (by + ty) / 2 - 6;
  const cp1x = bx + side * 8;
  const cp1y = by + 4;
  const cp2x = midx;
  const cp2y = midy;
  return `M ${bx} ${by} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
};

// Position of a ceras tip
type CerasSpec = {
  side: number; // -1 left, +1 right
  bx: number;
  by: number;
  tx: number;
  ty: number;
  clusterIdx: number;
  indexInCluster: number;
  totalInCluster: number;
};

const buildCerata = (): CerasSpec[] => {
  const out: CerasSpec[] = [];
  CLUSTERS.forEach((c, ci) => {
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < c.count; i++) {
        const t = c.count === 1 ? 0.5 : i / (c.count - 1);
        // Angle from horizontal: fan from -spread to +spread (upward tilt to downward tilt)
        const angDeg = -c.spread + t * (2 * c.spread);
        const angRad = (angDeg * Math.PI) / 180;
        const bx = CX + side * 34;
        const by = c.y + (i - (c.count - 1) / 2) * 6;
        // Middle cerata are longest; outer cerata shorter
        const lengthCurve = 1 - Math.pow(Math.abs(0.5 - t) * 2, 1.6) * 0.28;
        const len = c.len * lengthCurve;
        const tx = bx + side * len * Math.cos(angRad);
        const ty = by + len * Math.sin(angRad);
        out.push({
          side,
          bx,
          by,
          tx,
          ty,
          clusterIdx: ci,
          indexInCluster: i,
          totalInCluster: c.count,
        });
      }
    }
  });
  return out;
};

const CERATA = buildCerata();

// Portuguese man o' war float position (upper-right, inset from frame) and tentacle path down to head
const POM = { cx: 780, cy: 180, rx: 96, ry: 30 };
const TENTACLE_PATH = `
  M ${POM.cx - 24} ${POM.cy + 20}
  C ${POM.cx - 38} ${POM.cy + 78}, ${760} ${240}, ${710} ${290}
  C ${660} ${330}, ${620} ${HEAD_Y - 10}, ${CX + 12} ${HEAD_Y - 4}
`;

// Sample points along an SVG path — approximate for simple curves
// We compute nematocyst positions manually via parametric curves matching the tentacle path.
// Bezier helper (cubic)
const cubicPoint = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number,
): [number, number] => {
  const mt = 1 - t;
  const x =
    mt * mt * mt * p0[0] +
    3 * mt * mt * t * p1[0] +
    3 * mt * t * t * p2[0] +
    t * t * t * p3[0];
  const y =
    mt * mt * mt * p0[1] +
    3 * mt * mt * t * p1[1] +
    3 * mt * t * t * p2[1] +
    t * t * t * p3[1];
  return [x, y];
};

// The tentacle is composed of two chained cubics (as in TENTACLE_PATH)
const tentaclePointAt = (u: number): [number, number] => {
  // u in [0,1]
  if (u < 0.5) {
    const t = u / 0.5;
    return cubicPoint(
      [POM.cx - 24, POM.cy + 20],
      [POM.cx - 38, POM.cy + 78],
      [760, 240],
      [710, 290],
      t,
    );
  }
  const t = (u - 0.5) / 0.5;
  return cubicPoint([710, 290], [660, 330], [620, HEAD_Y - 10], [CX + 12, HEAD_Y - 4], t);
};

// A nematocyst glyph — small tapered harpoon triangle (rendered rotated)
const Nematocyst: React.FC<{
  x: number;
  y: number;
  angleDeg: number;
  scale?: number;
  color?: string;
  opacity?: number;
}> = ({ x, y, angleDeg, scale = 1, color = BRASS, opacity = 1 }) => {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${angleDeg}) scale(${scale})`}
      opacity={opacity}
    >
      <path d="M 0 -5 L 3 4 L 0 2 L -3 4 Z" fill={color} />
      <line x1={0} y1={2} x2={0} y2={8} stroke={color} strokeWidth={0.9} />
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const total = durationInFrames; // 150
  const t = frame / total; // 0..1 loop position

  // Title fades in with a soft spring
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Body materialisation over first ~0.5s
  const bodyIn = interpolate(frame, [0, fps * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const cerataIn = interpolate(frame, [fps * 0.3, fps * 1.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  // Tentacle drop-in
  const tentacleGrow = interpolate(frame, [fps * 0.6, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  // Nematocyst stream timings (normalised 0..1)
  // A stream of N nematocysts leaves the POM at staggered intervals
  const N_STREAM = 6;
  const streamStart = 0.18;
  const streamEnd = 0.72;

  // Ceras load state: how "full" each ceras cnidosac is (0..1)
  const cerasLoadT = (cIdx: number): number => {
    const c = CLUSTERS[cIdx];
    return Math.max(0, Math.min(1, (t - c.startDelay) / 0.25));
  };

  // Pick one ceras that fires late in the loop — outer-right of middle cluster
  const FIRE_CERAS_IDX = CERATA.findIndex(
    (c) => c.clusterIdx === 1 && c.side === 1 && c.indexInCluster === CLUSTERS[1].count - 1,
  );

  // Fire event timeline — mid-fire lands around frame 108 for hero still
  const fireT = Math.max(0, Math.min(1, (t - 0.62) / 0.22));
  const firing = fireT > 0 && fireT < 1;

  const scale = FRAME.w / 1080;

  return (
    <AbsoluteFill style={{ backgroundColor: ABYSS, fontFamily: inter }}>
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
        <span style={{ color: BRASS }}>2026 · 08 · 15</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid-fine"
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
              strokeWidth={1}
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

          <radialGradient id="board-vignette" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#071438" stopOpacity={1} />
            <stop offset="100%" stopColor={ABYSS} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="body-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={PEARL} stopOpacity={0.95} />
            <stop offset="42%" stopColor="#7BB2EF" stopOpacity={0.9} />
            <stop offset="55%" stopColor={ELECTRIC} stopOpacity={1} />
            <stop offset="100%" stopColor={COBALT} stopOpacity={1} />
          </linearGradient>

          <linearGradient id="ceras-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={PEARL} stopOpacity={0.9} />
            <stop offset="50%" stopColor={ELECTRIC} stopOpacity={1} />
            <stop offset="100%" stopColor={COBALT} stopOpacity={1} />
          </linearGradient>

          <radialGradient id="cnidosac-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PEARL} stopOpacity={0.9} />
            <stop offset="60%" stopColor={ELECTRIC} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ELECTRIC} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="pom-fill" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor={PEARL} stopOpacity={0.55} />
            <stop offset="60%" stopColor={ELECTRIC} stopOpacity={0.28} />
            <stop offset="100%" stopColor={ELECTRIC} stopOpacity={0.02} />
          </radialGradient>

          <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="strong-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* Drafting board */}
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
          fill="url(#grid-fine)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1B2C57"
          strokeWidth={1}
        />

        {/* Corner crop marks (brass) */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={BRASS} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 28} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 28} />
          </g>
        ))}

        {/* Scale / plate label — top-left inside frame */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 40})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>PLATE III · GLAUCUS ATLANTICUS</text>
          <text y={16} opacity={0.7}>DORSAL · 8× MAG.</text>
        </g>

        {/* Scale bar bottom-right inside frame */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 130}, ${
            FRAME.y + FRAME.h - 26
          })`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={80} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={40} y1={-3} x2={40} y2={3} strokeWidth={1.2} />
          <line x1={80} y1={-5} x2={80} y2={5} strokeWidth={1.2} />
          <text x={90} y={4} stroke="none">
            5 MM
          </text>
        </g>

        {/* Scale content into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* ── Portuguese man o' war float (top-right) ─────────────── */}
          <g opacity={Math.min(1, bodyIn * 1.4)}>
            {/* soft glow behind float */}
            <ellipse
              cx={POM.cx}
              cy={POM.cy}
              rx={POM.rx + 20}
              ry={POM.ry + 14}
              fill={ELECTRIC}
              opacity={0.05}
              filter="url(#strong-glow)"
            />
            {/* float body */}
            <path
              d={`
                M ${POM.cx - POM.rx} ${POM.cy}
                C ${POM.cx - POM.rx * 0.6} ${POM.cy - POM.ry * 1.4},
                  ${POM.cx + POM.rx * 0.6} ${POM.cy - POM.ry * 1.4},
                  ${POM.cx + POM.rx} ${POM.cy}
                C ${POM.cx + POM.rx * 0.5} ${POM.cy + POM.ry * 0.9},
                  ${POM.cx - POM.rx * 0.5} ${POM.cy + POM.ry * 0.9},
                  ${POM.cx - POM.rx} ${POM.cy}
                Z
              `}
              fill="url(#pom-fill)"
              stroke={ELECTRIC}
              strokeOpacity={0.55}
              strokeWidth={1.1}
            />
            {/* crest ridge */}
            <path
              d={`
                M ${POM.cx - POM.rx * 0.85} ${POM.cy - 4}
                C ${POM.cx - POM.rx * 0.4} ${POM.cy - POM.ry * 1.1},
                  ${POM.cx + POM.rx * 0.4} ${POM.cy - POM.ry * 1.1},
                  ${POM.cx + POM.rx * 0.85} ${POM.cy - 4}
              `}
              fill="none"
              stroke={PEARL}
              strokeOpacity={0.7}
              strokeWidth={1.1}
            />
            {/* POM label */}
            <text
              x={POM.cx + POM.rx + 12}
              y={POM.cy - 6}
              fill={BRASS}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3}
              fontWeight={600}
            >
              PHYSALIA
            </text>
            <text
              x={POM.cx + POM.rx + 12}
              y={POM.cy + 10}
              fill={GRAY}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.4}
              fontWeight={500}
            >
              SUPPLY VESSEL
            </text>
          </g>

          {/* Tentacle path (drawn with stroke-dasharray reveal) */}
          {(() => {
            const len = 480; // approximate arc length; used only for reveal
            const dashOff = len * (1 - tentacleGrow);
            return (
              <>
                <path
                  d={TENTACLE_PATH}
                  fill="none"
                  stroke={ELECTRIC}
                  strokeOpacity={0.25}
                  strokeWidth={9}
                  strokeLinecap="round"
                  filter="url(#soft-glow)"
                  strokeDasharray={len}
                  strokeDashoffset={dashOff}
                />
                <path
                  d={TENTACLE_PATH}
                  fill="none"
                  stroke={PEARL}
                  strokeOpacity={0.85}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeDasharray={`3 5`}
                />
              </>
            );
          })()}

          {/* Nematocysts travelling along tentacle */}
          {(() => {
            const items: React.ReactNode[] = [];
            for (let i = 0; i < N_STREAM; i++) {
              const off = i / N_STREAM;
              // Position in loop
              const u = ((t + off) % 1 - streamStart) / (streamEnd - streamStart);
              if (u < 0 || u > 1) continue;
              // First 45% travels the tentacle
              if (u < 0.45) {
                const localU = u / 0.45;
                const [x, y] = tentaclePointAt(localU);
                // heading angle: tangent direction
                const [x2, y2] = tentaclePointAt(Math.min(1, localU + 0.02));
                const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI + 90;
                items.push(
                  <Nematocyst
                    key={`t-${i}`}
                    x={x}
                    y={y}
                    angleDeg={ang}
                    scale={1.4}
                    color={BRASS}
                    opacity={interpolate(localU, [0, 0.1, 0.9, 1], [0, 1, 1, 0.4])}
                  />,
                );
              }
              // Next 30% travels down the body's central axis
              else if (u < 0.75) {
                const localU = (u - 0.45) / 0.3;
                const x = CX;
                const y = HEAD_Y + 20 + localU * (CLUSTERS[2].y - HEAD_Y - 20);
                items.push(
                  <Nematocyst
                    key={`b-${i}`}
                    x={x}
                    y={y}
                    angleDeg={180}
                    scale={1.2}
                    color={BRASS}
                    opacity={0.9}
                  />,
                );
              }
            }
            return <>{items}</>;
          })()}

          {/* ── Body outline ────────────────────────────────────────── */}
          <g opacity={bodyIn}>
            {/* soft body glow */}
            <path
              d={BODY_PATH}
              fill={ELECTRIC}
              opacity={0.08}
              filter="url(#strong-glow)"
            />
            {/* fill */}
            <path
              d={BODY_PATH}
              fill="url(#body-shade)"
              stroke={ELECTRIC}
              strokeOpacity={0.9}
              strokeWidth={1.2}
            />
            {/* central gut duct as a bright pearl channel */}
            <line
              x1={CX}
              y1={HEAD_Y + 20}
              x2={CX}
              y2={TAIL_Y - 30}
              stroke={PEARL}
              strokeOpacity={0.85}
              strokeWidth={2.4}
              strokeDasharray="6 6"
            />
            {/* rhinophores (paired sensory horns) */}
            {[-1, 1].map((s) => (
              <g key={`rhi-${s}`}>
                <path
                  d={`M ${CX + s * 14} ${HEAD_Y - 4}
                      C ${CX + s * 22} ${HEAD_Y - 28},
                        ${CX + s * 28} ${HEAD_Y - 54},
                        ${CX + s * 24} ${HEAD_Y - 78}`}
                  stroke={COBALT}
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${CX + s * 14} ${HEAD_Y - 4}
                      C ${CX + s * 22} ${HEAD_Y - 28},
                        ${CX + s * 28} ${HEAD_Y - 54},
                        ${CX + s * 24} ${HEAD_Y - 78}`}
                  stroke={ELECTRIC}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.9}
                />
                <circle cx={CX + s * 24} cy={HEAD_Y - 78} r={3} fill={PEARL} opacity={0.75} />
              </g>
            ))}
            {/* tiny eyespots */}
            <circle cx={CX - 8} cy={HEAD_Y + 34} r={2} fill={ABYSS} opacity={0.8} />
            <circle cx={CX + 8} cy={HEAD_Y + 34} r={2} fill={ABYSS} opacity={0.8} />
          </g>

          {/* ── Cerata ──────────────────────────────────────────────── */}
          {CERATA.map((c, i) => {
            const cluster = CLUSTERS[c.clusterIdx];
            const localAppear = interpolate(
              frame,
              [fps * (0.4 + c.clusterIdx * 0.15), fps * (1.0 + c.clusterIdx * 0.15)],
              [0, 1],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
            );
            const loadT = cerasLoadT(c.clusterIdx);
            const sacGlow = loadT; // 0..1
            const isFiring = i === FIRE_CERAS_IDX && firing;
            const path = cerasPath(c.bx, c.by, c.tx, c.ty, c.side);
            const cerasLen = Math.hypot(c.tx - c.bx, c.ty - c.by) * 1.15;

            // Ceras thickness: middle cerata are thickest, taper toward cluster edges
            const distFromMid = Math.abs(
              c.indexInCluster - (c.totalInCluster - 1) / 2,
            );
            const baseW = 11 - distFromMid * 1.6;

            // Nematocyst travelling along this ceras once its cluster begins loading
            const loadingT = Math.max(
              0,
              Math.min(1, (t - cluster.startDelay) / 0.22),
            );
            const showTraveller = loadingT > 0 && loadingT < 0.9;
            const travX = c.bx + (c.tx - c.bx) * loadingT;
            const travY = c.by + (c.ty - c.by) * loadingT;
            const travAng =
              (Math.atan2(c.ty - c.by, c.tx - c.bx) * 180) / Math.PI + 90;

            // Fire event: ceras discharges outward
            const fireDist = fireT * 240;
            const fireX = c.tx + Math.cos((travAng - 90) * Math.PI / 180) * fireDist;
            const fireY = c.ty + Math.sin((travAng - 90) * Math.PI / 180) * fireDist;

            return (
              <g key={`ceras-${i}`} opacity={localAppear}>
                {/* soft base glow */}
                <path
                  d={path}
                  stroke={ELECTRIC}
                  strokeOpacity={0.28}
                  strokeWidth={baseW + 6}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#soft-glow)"
                  strokeDasharray={cerasLen}
                  strokeDashoffset={cerasLen * (1 - localAppear)}
                />
                {/* main ceras body: cobalt fill */}
                <path
                  d={path}
                  stroke={COBALT}
                  strokeWidth={baseW}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={cerasLen}
                  strokeDashoffset={cerasLen * (1 - localAppear)}
                />
                {/* electric-blue stripe running down the ceras */}
                <path
                  d={path}
                  stroke={ELECTRIC}
                  strokeWidth={Math.max(2, baseW - 5)}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={cerasLen}
                  strokeDashoffset={cerasLen * (1 - localAppear)}
                  opacity={0.95}
                />
                {/* pearl edge highlight */}
                <path
                  d={path}
                  stroke={PEARL}
                  strokeOpacity={0.55}
                  strokeWidth={1.2}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={cerasLen}
                  strokeDashoffset={cerasLen * (1 - localAppear)}
                />
                {/* cnidosac bulb outline at tip */}
                <circle
                  cx={c.tx}
                  cy={c.ty}
                  r={22}
                  fill="url(#cnidosac-glow)"
                  opacity={0.35 + 0.55 * sacGlow}
                />
                <circle
                  cx={c.tx}
                  cy={c.ty}
                  r={baseW * 0.9}
                  fill={COBALT}
                  stroke={PEARL}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
                <circle
                  cx={c.tx}
                  cy={c.ty}
                  r={baseW * 0.55}
                  fill={PEARL}
                  opacity={0.35 + 0.65 * sacGlow}
                />
                <circle
                  cx={c.tx}
                  cy={c.ty}
                  r={baseW * 0.28}
                  fill={BRASS}
                  opacity={sacGlow}
                />

                {/* travelling nematocyst inside ceras */}
                {showTraveller && (
                  <Nematocyst
                    x={travX}
                    y={travY}
                    angleDeg={travAng}
                    scale={1.1}
                    color={BRASS}
                    opacity={0.95}
                  />
                )}

                {/* fire streak */}
                {isFiring && (
                  <>
                    <line
                      x1={c.tx}
                      y1={c.ty}
                      x2={fireX}
                      y2={fireY}
                      stroke={BRASS}
                      strokeWidth={1.6}
                      strokeOpacity={1 - fireT * 0.5}
                    />
                    <Nematocyst
                      x={fireX}
                      y={fireY}
                      angleDeg={travAng}
                      scale={1.7}
                      color={BRASS}
                      opacity={1}
                    />
                    <circle
                      cx={c.tx}
                      cy={c.ty}
                      r={30}
                      fill={BRASS}
                      opacity={0.4 * (1 - fireT)}
                      filter="url(#strong-glow)"
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* ── Technical callouts (right side) ──────────────────────── */}
          <g
            opacity={cerataIn}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3}
            fill={BRASS}
          >
            {/* CNIDOSAC — leader to outer-right tip of top cluster */}
            {(() => {
              const target = CERATA.find(
                (c) => c.clusterIdx === 0 && c.side === 1 && c.indexInCluster === 0,
              )!;
              const lx = target.tx + 30;
              const ly = target.ty - 16;
              return (
                <g>
                  <line
                    x1={target.tx + 6}
                    y1={target.ty - 2}
                    x2={lx - 4}
                    y2={ly + 6}
                    stroke={BRASS}
                    strokeWidth={1}
                  />
                  <circle cx={target.tx} cy={target.ty} r={2} fill={BRASS} />
                  <text x={lx} y={ly + 8}>CNIDOSAC</text>
                  <text x={lx} y={ly + 24} fill={GRAY} fontSize={9} letterSpacing={2.4} fontWeight={500}>
                    STOLEN NEMATOCYSTS · READY
                  </text>
                </g>
              );
            })()}
            {/* CERAS — leader to a middle-cluster ceras */}
            {(() => {
              const target = CERATA.find(
                (c) => c.clusterIdx === 1 && c.side === 1 && c.indexInCluster === 2,
              )!;
              const midx = (target.bx + target.tx) / 2 + 10;
              const midy = (target.by + target.ty) / 2 + 4;
              const lx = midx + 60;
              const ly = midy - 8;
              return (
                <g>
                  <line
                    x1={midx}
                    y1={midy}
                    x2={lx - 4}
                    y2={ly + 6}
                    stroke={BRASS}
                    strokeWidth={1}
                  />
                  <circle cx={midx} cy={midy} r={2} fill={BRASS} />
                  <text x={lx} y={ly + 8}>CERAS</text>
                  <text x={lx} y={ly + 24} fill={GRAY} fontSize={9} letterSpacing={2.4} fontWeight={500}>
                    DELIVERY BARREL
                  </text>
                </g>
              );
            })()}
            {/* GUT DUCT — leader from body midline up-left into empty upper-left quadrant */}
            {(() => {
              const anchorX = CX;
              const anchorY = 300;
              const bendX = 200;
              const bendY = 210;
              const lx = 90;
              const ly = 200;
              return (
                <g>
                  <line
                    x1={anchorX}
                    y1={anchorY}
                    x2={bendX}
                    y2={bendY}
                    stroke={BRASS}
                    strokeWidth={1}
                  />
                  <line
                    x1={bendX}
                    y1={bendY}
                    x2={lx + 82}
                    y2={bendY}
                    stroke={BRASS}
                    strokeWidth={1}
                  />
                  <circle cx={anchorX} cy={anchorY} r={2} fill={BRASS} />
                  <text x={lx} y={ly + 8}>GUT DUCT</text>
                  <text x={lx} y={ly + 24} fill={GRAY} fontSize={9} letterSpacing={2.4} fontWeight={500}>
                    CILIATED CNIDOPHAGES
                  </text>
                </g>
              );
            })()}
          </g>

          {/* Ammo tag — corner bottom-left of the plate */}
          {(() => {
            const totalSacs = CERATA.length; // 28
            const loadedSacs = CERATA.filter(
              (c) => cerasLoadT(c.clusterIdx) > 0.6,
            ).length;
            return (
              <g
                transform={`translate(${150}, ${770})`}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3}
                fontWeight={600}
              >
                <rect
                  x={0}
                  y={0}
                  width={230}
                  height={66}
                  fill={ABYSS}
                  stroke={BRASS}
                  strokeWidth={1}
                />
                <text x={12} y={18} fill={BRASS}>AMMUNITION</text>
                <text x={12} y={34} fill={GRAY} fontSize={9} letterSpacing={2.2} fontWeight={500}>
                  KLEPTOCNIDAE · GRADE A
                </text>
                <text
                  x={12}
                  y={56}
                  fill={INK_LABEL}
                  fontFamily={playfair}
                  fontSize={20}
                  fontStyle="italic"
                  letterSpacing={0}
                  fontWeight={500}
                >
                  {loadedSacs}
                  <tspan fill={GRAY} fontSize={13} letterSpacing={2}>
                    {" "}/ {totalSacs} STORED
                  </tspan>
                </text>
              </g>
            );
          })()}

          {/* Detail glyph — nematocyst schematic tucked into bottom-right of plate */}
          <g transform={`translate(${820}, ${790})`} opacity={0.9}>
            {/* Capsule outline */}
            <ellipse
              cx={0}
              cy={0}
              rx={22}
              ry={12}
              fill="none"
              stroke={BRASS}
              strokeWidth={1}
            />
            {/* Coiled thread inside */}
            <path
              d="M -14 0 C -10 -6, -6 6, -2 0 C 2 -6, 6 6, 10 0 C 12 -3, 14 0, 16 0"
              stroke={BRASS}
              strokeWidth={0.9}
              fill="none"
            />
            {/* Discharged harpoon */}
            <line
              x1={22}
              y1={0}
              x2={44}
              y2={0}
              stroke={BRASS}
              strokeWidth={0.9}
            />
            <polygon points={`44,-3 50,0 44,3`} fill={BRASS} />
            <text
              x={-30}
              y={26}
              fill={GRAY}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.4}
              fontWeight={500}
            >
              NEMATOCYST · DISCHARGE
            </text>
          </g>
        </g>

        {/* Caption strip below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · STOLEN NEMATOCYSTS ROUTED FROM GUT TO CNIDOSAC</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={BRASS}
            opacity={0.9}
          >
            AN ARMORY OF BORROWED WEAPONS
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 960,
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
            color: BRASS,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: INK_LABEL, letterSpacing: 5 }}>Armorer</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The armorer who
          <br />
          steals every weapon.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The blue dragon —{" "}
          <span style={{ color: PEARL, fontWeight: 600 }}>
            Glaucus atlanticus
          </span>{" "}
          — eats Portuguese man o' war tentacles, routes the undischarged
          nematocysts through ciliated cnidophages, and stockpiles the most
          potent ones in{" "}
          <span style={{ color: BRASS, fontWeight: 600 }}>cnidosacs</span> at
          the tip of every ceras — its own defensive arsenal.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 42,
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
        <span>Greenwood · Toxicon 54 (2009) 1065–1070</span>
        <span>
          <span style={{ color: BRASS }}>●</span> Nematocyst · Stolen unit
        </span>
      </div>
    </AbsoluteFill>
  );
};
