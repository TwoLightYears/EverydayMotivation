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
const INK = "#0A0D1E";          // storm indigo substrate
const PLATE = "#10142A";        // chemistry plate deep
const CLOUD = "#2B2F55";        // bruised cloud underside / mid-tone
const PLASMA = "#E8EEFF";       // bolt core white-blue
const HOT = "#F4D35E";          // hot-yellow lightning heart / grain
const GREEN = "#7FB069";        // chlorophyll
const GRAY = "#8893A8";         // draftsman gray
const GRID = "#1A1F3A";
const GRID_MAJOR = "#242A48";
const SOIL = "#1A1428";         // soil band — slight warmth into the indigo

// ── Lightning bolt path (viewBox 1080×1350) ───────────────────────────────
// Hard, geometric zig-zag from upper-right down to a strike point on horizon.
type Pt = { x: number; y: number };
const BOLT: Pt[] = [
  { x: 902, y: 150 },
  { x: 820, y: 232 },
  { x: 866, y: 280 },
  { x: 724, y: 376 },
  { x: 780, y: 430 },
  { x: 626, y: 500 },
  { x: 586, y: 560 },
  { x: 490, y: 630 }, // strike point on horizon
];
const STRIKE: Pt = BOLT[BOLT.length - 1];

// Small branch forks off the main bolt — pure visual richness.
const BRANCHES: Pt[][] = [
  [
    { x: 780, y: 430 },
    { x: 840, y: 468 },
    { x: 858, y: 522 },
  ],
  [
    { x: 586, y: 560 },
    { x: 530, y: 596 },
    { x: 520, y: 625 },
  ],
  [
    { x: 866, y: 280 },
    { x: 920, y: 300 },
  ],
];

const toPath = (pts: Pt[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

// Cumulative length along a polyline (for stroke-dash reveal).
const polyLengths = (pts: Pt[]): { total: number; segs: number[] } => {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push(d);
    total += d;
  }
  return { total, segs };
};
const BOLT_LEN = polyLengths(BOLT).total;

// Point along polyline at normalised t ∈ [0,1]
const alongPoly = (pts: Pt[], t: number): Pt => {
  const { total, segs } = polyLengths(pts);
  const target = Math.max(0, Math.min(1, t)) * total;
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= target) {
      const f = (target - acc) / segs[i];
      const a = pts[i];
      const b = pts[i + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    acc += segs[i];
  }
  return pts[pts.length - 1];
};

// ── Chemistry callouts along the bolt (annotated reactions) ───────────────
// Positioned to the right of the bolt channel, with leader lines to the bolt.
type Callout = {
  anchor: Pt;        // where the leader meets the bolt
  pos: Pt;           // callout box top-left
  label: string;
  reaction: string;  // compact chem notation
  delay: number;     // seconds, relative to flash start
};
const CALLOUTS: Callout[] = [
  {
    anchor: { x: 820, y: 232 },
    pos: { x: 760, y: 170 },
    label: "01 · HIGH-T PLASMA",
    reaction: "N≡N  →  •N + •N",
    delay: 0.9,
  },
  {
    anchor: { x: 724, y: 376 },
    pos: { x: 660, y: 326 },
    label: "02 · DISSOCIATION",
    reaction: "O=O  →  •O + •O",
    delay: 1.15,
  },
  {
    anchor: { x: 626, y: 500 },
    pos: { x: 652, y: 452 },
    label: "03 · RECOMBINATION",
    reaction: "•N + •O  →  N–O",
    delay: 1.4,
  },
];

// ── Wheat plant: a small cluster, offset from the strike so it isn't washed out.
// Anchored just below the strike point.
const STALK: Pt = { x: 560, y: 630 }; // ground insertion point (right of strike)
type Stalk = {
  base: Pt;
  top: Pt;
  lean: number; // control-point x-offset for curve
  leaves: { atY: number; angle: number; len: number }[];
  grainCount: number;
};
const STALKS: Stalk[] = [
  {
    base: { x: STALK.x, y: STALK.y },
    top: { x: STALK.x + 8, y: STALK.y - 128 },
    lean: 10,
    leaves: [
      { atY: 594, angle: -60, len: 46 },
      { atY: 566, angle: 55, len: 40 },
      { atY: 540, angle: -58, len: 30 },
    ],
    grainCount: 6,
  },
  {
    base: { x: STALK.x - 22, y: STALK.y },
    top: { x: STALK.x - 36, y: STALK.y - 112 },
    lean: -10,
    leaves: [
      { atY: 582, angle: 48, len: 30 },
      { atY: 558, angle: -62, len: 26 },
    ],
    grainCount: 5,
  },
  {
    base: { x: STALK.x + 28, y: STALK.y },
    top: { x: STALK.x + 46, y: STALK.y - 100 },
    lean: 16,
    leaves: [{ atY: 578, angle: 58, len: 28 }],
    grainCount: 4,
  },
];

// A fractal-ish root tree: each node has children.
type RootNode = { x: number; y: number; children: RootNode[]; depth: number };
const makeRoot = (): RootNode => ({
  x: STALK.x,
  y: STALK.y,
  depth: 0,
  children: [
    {
      x: STALK.x - 90,
      y: 710,
      depth: 1,
      children: [
        { x: STALK.x - 150, y: 760, depth: 2, children: [
          { x: STALK.x - 180, y: 800, depth: 3, children: [] },
          { x: STALK.x - 140, y: 810, depth: 3, children: [] },
        ] },
        { x: STALK.x - 110, y: 790, depth: 2, children: [] },
      ],
    },
    {
      x: STALK.x - 30,
      y: 740,
      depth: 1,
      children: [
        { x: STALK.x - 60, y: 810, depth: 2, children: [] },
        { x: STALK.x - 20, y: 820, depth: 2, children: [] },
      ],
    },
    {
      x: STALK.x + 40,
      y: 720,
      depth: 1,
      children: [
        { x: STALK.x + 90, y: 790, depth: 2, children: [
          { x: STALK.x + 130, y: 820, depth: 3, children: [] },
        ] },
        { x: STALK.x + 20, y: 810, depth: 2, children: [] },
      ],
    },
    {
      x: STALK.x + 110,
      y: 700,
      depth: 1,
      children: [
        { x: STALK.x + 170, y: 745, depth: 2, children: [
          { x: STALK.x + 220, y: 790, depth: 3, children: [] },
        ] },
      ],
    },
  ],
});
const ROOT = makeRoot();

type Branch = { from: Pt; to: Pt; depth: number };
const flattenBranches = (n: RootNode, out: Branch[] = []): Branch[] => {
  for (const c of n.children) {
    out.push({ from: { x: n.x, y: n.y }, to: { x: c.x, y: c.y }, depth: c.depth });
    flattenBranches(c, out);
  }
  return out;
};
const ROOT_BRANCHES = flattenBranches(ROOT);
const ROOT_TIPS: Pt[] = [];
const collectTips = (n: RootNode) => {
  if (n.children.length === 0) ROOT_TIPS.push({ x: n.x, y: n.y });
  else n.children.forEach(collectTips);
};
collectTips(ROOT);

// Rain droplets of nitrate (NO3-) falling from strike into soil.
// x spans the root fan (~400..520) so drops visibly feed the roots.
const DROPS: { x: number; delay: number; dist: number; speed: number }[] = [
  { x: 455, delay: 0.0, dist: 175, speed: 0.9 },
  { x: 420, delay: 0.14, dist: 195, speed: 1.0 },
  { x: 485, delay: 0.28, dist: 170, speed: 1.0 },
  { x: 400, delay: 0.42, dist: 180, speed: 1.05 },
  { x: 470, delay: 0.56, dist: 185, speed: 0.95 },
  { x: 435, delay: 0.7, dist: 165, speed: 1.0 },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps; // seconds

  // ── Timeline ─────────────────────────────────────────────────────────
  // 0.0 – 0.4s : plate settles in (vignette, grid, border)
  // 0.4 – 0.7s : bolt flashes in (fast reveal + overbright strobe)
  // 0.7 – 1.6s : three reaction callouts appear in sequence
  // 1.4 – 3.0s : nitrate droplets fall from bolt base to roots
  // 2.4 – 4.0s : roots pulse / glow green as absorption dramatizes
  // 3.0 – 5.0s : hold; subtle secondary flash near end for a loop seam
  //
  // All eased with spring / cubic — never linear.

  const plateIn = spring({ frame, fps, config: { damping: 200, mass: 0.9 } });

  // Bolt reveal: strokeDash animated from strike point back up to origin
  const boltRevealT = interpolate(t, [0.4, 0.72], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Overbright strobe at the flash moment (and a tiny loop-seam strobe)
  const strobeA = interpolate(t, [0.55, 0.68, 0.95], [0, 1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strobeB = interpolate(t, [4.65, 4.78, 4.95], [0, 0.55, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strobe = Math.max(strobeA, strobeB);

  // Root glow — grows after the first drops land
  const rootGlow = interpolate(t, [1.9, 3.2], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(t, [1.3, 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Page layout (1080 × 1350 portrait)
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const HORIZON = 630; // y-coord in viewBox
  // Soil band inside the frame
  const SOIL_TOP = HORIZON;
  const SOIL_BOT = FRAME.y + FRAME.h;

  // Secondary loop pulse travelling down the bolt
  const pulseT = (frame % durationInFrames) / durationInFrames;
  const pulsePos = alongPoly(BOLT, pulseT);
  const pulseVisible = t > 1.0;

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
        <span style={{ color: HOT }}>2026 · 10 · 12</span>
      </div>

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
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 48 0 L 0 0 0 48`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 192 0 L 0 0 0 192`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="plate-vignette" cx="55%" cy="36%" r="70%">
            <stop offset="0%" stopColor="#191E3C" stopOpacity={1} />
            <stop offset="100%" stopColor={PLATE} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="soil-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={SOIL} stopOpacity={0.9} />
            <stop offset="100%" stopColor="#0C0A18" stopOpacity={1} />
          </linearGradient>

          <radialGradient id="strike-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PLASMA} stopOpacity={0.8} />
            <stop offset="40%" stopColor={HOT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={HOT} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="root-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.55} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
          </radialGradient>

          <filter id="bolt-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        {/* Chemistry plate */}
        <g opacity={plateIn}>
          <rect
            x={FRAME.x}
            y={FRAME.y}
            width={FRAME.w}
            height={FRAME.h}
            fill="url(#plate-vignette)"
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

          {/* Soil band */}
          <rect
            x={FRAME.x}
            y={SOIL_TOP}
            width={FRAME.w}
            height={SOIL_BOT - SOIL_TOP}
            fill="url(#soil-grad)"
          />
          {/* Soil texture: dashed horizons */}
          {[0.25, 0.55, 0.85].map((p, i) => (
            <line
              key={`soilh-${i}`}
              x1={FRAME.x + 8}
              x2={FRAME.x + FRAME.w - 8}
              y1={SOIL_TOP + (SOIL_BOT - SOIL_TOP) * p}
              y2={SOIL_TOP + (SOIL_BOT - SOIL_TOP) * p}
              stroke={GRAY}
              strokeOpacity={0.14}
              strokeDasharray="4 10"
              strokeWidth={1}
            />
          ))}
          {/* Horizon line */}
          <line
            x1={FRAME.x}
            x2={FRAME.x + FRAME.w}
            y1={HORIZON}
            y2={HORIZON}
            stroke={GRAY}
            strokeOpacity={0.55}
            strokeWidth={1.4}
          />
          <text
            x={FRAME.x + 10}
            y={HORIZON - 8}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            SURFACE · 0 KM
          </text>

          {/* Inner thin border */}
          <rect
            x={FRAME.x + 0.5}
            y={FRAME.y + 0.5}
            width={FRAME.w - 1}
            height={FRAME.h - 1}
            fill="none"
            stroke="#2B2F55"
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
            <g key={i} stroke={HOT} strokeWidth={1.5} fill="none">
              <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
              <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
            </g>
          ))}

          {/* Altitude ladder (right edge) */}
          {[
            { y: 150, lab: "10 KM" },
            { y: 300, lab: "6 KM" },
            { y: 450, lab: "3 KM" },
            { y: 580, lab: "1 KM" },
          ].map((m, i) => (
            <g key={`alt-${i}`}>
              <line
                x1={FRAME.x + FRAME.w - 24}
                x2={FRAME.x + FRAME.w - 10}
                y1={m.y}
                y2={m.y}
                stroke={GRAY}
                strokeOpacity={0.5}
                strokeWidth={1.1}
              />
              <text
                x={FRAME.x + FRAME.w - 32}
                y={m.y + 3}
                textAnchor="end"
                fill={GRAY}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3}
                fontWeight={600}
              >
                {m.lab}
              </text>
            </g>
          ))}

          {/* Plate ID label (top-left of plate) */}
          <g>
            <text
              x={FRAME.x + 18}
              y={FRAME.y + 24}
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={3.5}
              fontWeight={600}
            >
              PLATE 003 · N-FIXATION BY CG LIGHTNING
            </text>
          </g>

          {/* ── Wheat cluster: multiple stalks, leaves, and grain spikes ── */}
          <g>
            {STALKS.map((s, si) => {
              const midX = (s.base.x + s.top.x) / 2 + s.lean;
              const midY = (s.base.y + s.top.y) / 2;
              return (
                <g key={`stalk-${si}`}>
                  {/* Stem */}
                  <path
                    d={`M ${s.base.x} ${s.base.y} Q ${midX} ${midY} ${s.top.x} ${s.top.y}`}
                    stroke={GREEN}
                    strokeOpacity={0.82}
                    strokeWidth={2.4}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Leaves */}
                  {s.leaves.map((lf, i) => {
                    const a = (lf.angle * Math.PI) / 180;
                    // leaf starts on the stem at atY, slight x offset for curved stem
                    const stemX =
                      s.base.x +
                      ((s.top.x - s.base.x) *
                        (s.base.y - lf.atY)) /
                        (s.base.y - s.top.y);
                    const x2 = stemX + Math.sin(a) * lf.len;
                    const y2 = lf.atY - Math.cos(a) * lf.len * 0.3;
                    const cx = (stemX + x2) / 2;
                    const cy = (lf.atY + y2) / 2 - Math.abs(Math.sin(a)) * 10;
                    return (
                      <path
                        key={`leaf-${i}`}
                        d={`M ${stemX} ${lf.atY} Q ${cx} ${cy} ${x2} ${y2}`}
                        stroke={GREEN}
                        strokeOpacity={0.75}
                        strokeWidth={2}
                        fill="none"
                        strokeLinecap="round"
                      />
                    );
                  })}
                  {/* Grain spike — spine + alternating grains */}
                  {(() => {
                    const spikeH = 48;
                    const spikeTop = { x: s.top.x, y: s.top.y - spikeH };
                    const spine = `M ${s.top.x} ${s.top.y} L ${spikeTop.x} ${spikeTop.y}`;
                    const grains: React.ReactElement[] = [];
                    for (let g = 0; g < s.grainCount; g++) {
                      const yy = s.top.y - 4 - (g / Math.max(1, s.grainCount - 1)) * (spikeH - 6);
                      const side = g % 2 === 0 ? 1 : -1;
                      const gx = s.top.x + side * 4.5;
                      grains.push(
                        <ellipse
                          key={`gr-${si}-${g}`}
                          cx={gx}
                          cy={yy}
                          rx={3}
                          ry={5}
                          fill={HOT}
                          opacity={0.9}
                          transform={`rotate(${side * 18} ${gx} ${yy})`}
                        />,
                      );
                      // awn (bristle) above each grain
                      grains.push(
                        <line
                          key={`aw-${si}-${g}`}
                          x1={gx}
                          y1={yy - 4}
                          x2={gx + side * 2}
                          y2={yy - 16}
                          stroke={HOT}
                          strokeOpacity={0.55}
                          strokeWidth={1}
                        />,
                      );
                    }
                    return (
                      <g>
                        <path d={spine} stroke={HOT} strokeOpacity={0.5} strokeWidth={1.2} fill="none" />
                        {grains}
                      </g>
                    );
                  })()}
                </g>
              );
            })}
          </g>

          {/* ── Roots ─────────────────────────────────────────────────── */}
          <g>
            {ROOT_BRANCHES.map((b, i) => {
              const w =
                b.depth === 1 ? 2.4 : b.depth === 2 ? 1.6 : 1.1;
              const op = b.depth === 1 ? 0.75 : b.depth === 2 ? 0.6 : 0.45;
              return (
                <line
                  key={`root-${i}`}
                  x1={b.from.x}
                  y1={b.from.y}
                  x2={b.to.x}
                  y2={b.to.y}
                  stroke={GREEN}
                  strokeOpacity={op * (0.4 + 0.6 * rootGlow)}
                  strokeWidth={w}
                  strokeLinecap="round"
                />
              );
            })}
            {/* Root tip glows: pulse with absorption */}
            {ROOT_TIPS.map((tp, i) => {
              const pulse =
                0.5 +
                0.5 *
                  Math.sin((t * 2 - i * 0.3) * Math.PI);
              return (
                <circle
                  key={`tip-${i}`}
                  cx={tp.x}
                  cy={tp.y}
                  r={6}
                  fill="url(#root-glow)"
                  opacity={rootGlow * (0.5 + 0.5 * pulse)}
                />
              );
            })}
            {/* Nitrate label by one tip */}
            <g opacity={rootGlow}>
              <line
                x1={STALK.x + 170}
                y1={745}
                x2={STALK.x + 240}
                y2={760}
                stroke={GREEN}
                strokeOpacity={0.7}
                strokeWidth={1}
              />
              <text
                x={STALK.x + 246}
                y={764}
                fill={GREEN}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={2}
                fontWeight={600}
              >
                NO₃⁻ UPTAKE
              </text>
            </g>
          </g>

          {/* ── Nitrate droplets falling from strike ──────────────────── */}
          <g>
            {DROPS.map((d, i) => {
              const start = 1.4 + d.delay;
              const localT = (t - start) * d.speed;
              if (localT < 0 || localT > 2) return null;
              const yFall = HORIZON + localT * 90; // falls at ~90 u/s
              if (yFall > HORIZON + d.dist) return null;
              const o = Math.max(0, Math.min(1, 1 - (yFall - HORIZON) / d.dist));
              const isLead = i === 0; // only the lead drop carries the label
              return (
                <g key={`drop-${i}`} opacity={o}>
                  <circle
                    cx={d.x}
                    cy={yFall}
                    r={isLead ? 3 : 2.2}
                    fill={HOT}
                  />
                  {/* motion trail */}
                  <line
                    x1={d.x}
                    y1={yFall - 10}
                    x2={d.x}
                    y2={yFall}
                    stroke={HOT}
                    strokeOpacity={0.35}
                    strokeWidth={1}
                  />
                </g>
              );
            })}
            {/* Single labelled lead drop callout — anchored near strike */}
            {(() => {
              const op = interpolate(t, [1.55, 1.95], [0, 1], {
                easing: Easing.out(Easing.cubic),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <g opacity={op}>
                  <line
                    x1={420}
                    y1={670}
                    x2={310}
                    y2={690}
                    stroke={HOT}
                    strokeOpacity={0.55}
                    strokeWidth={1}
                  />
                  <text
                    x={302}
                    y={694}
                    textAnchor="end"
                    fill={HOT}
                    fontFamily={inter}
                    fontSize={12}
                    fontWeight={600}
                    letterSpacing={2.5}
                  >
                    NO₃⁻ RAIN
                  </text>
                </g>
              );
            })()}
          </g>

          {/* ── The bolt ─────────────────────────────────────────────── */}
          {/* Outer glow */}
          <path
            d={toPath(BOLT)}
            stroke={PLASMA}
            strokeOpacity={0.18 + 0.4 * strobe}
            strokeWidth={22}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#bolt-glow)"
            strokeDasharray={BOLT_LEN}
            strokeDashoffset={BOLT_LEN * (1 - boltRevealT)}
          />
          {/* Hot halo */}
          <path
            d={toPath(BOLT)}
            stroke={HOT}
            strokeOpacity={0.6 + 0.3 * strobe}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={BOLT_LEN}
            strokeDashoffset={BOLT_LEN * (1 - boltRevealT)}
            filter="url(#bolt-glow)"
          />
          {/* Core */}
          <path
            d={toPath(BOLT)}
            stroke={PLASMA}
            strokeOpacity={1}
            strokeWidth={3.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={BOLT_LEN}
            strokeDashoffset={BOLT_LEN * (1 - boltRevealT)}
          />
          {/* Branches: appear right after main bolt resolves */}
          {BRANCHES.map((br, i) => {
            const len = polyLengths(br).total;
            const localT = interpolate(
              t,
              [0.6 + i * 0.05, 0.78 + i * 0.05],
              [0, 1],
              {
                easing: Easing.out(Easing.cubic),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            const off = len * (1 - localT);
            return (
              <g key={`br-${i}`}>
                <path
                  d={toPath(br)}
                  stroke={HOT}
                  strokeOpacity={0.45 + 0.4 * strobe}
                  strokeWidth={5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={len}
                  strokeDashoffset={off}
                  filter="url(#bolt-glow)"
                />
                <path
                  d={toPath(br)}
                  stroke={PLASMA}
                  strokeOpacity={0.95}
                  strokeWidth={1.6}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={len}
                  strokeDashoffset={off}
                />
              </g>
            );
          })}

          {/* Strike glow at ground */}
          <circle
            cx={STRIKE.x}
            cy={STRIKE.y}
            r={60}
            fill="url(#strike-glow)"
            opacity={boltRevealT}
          />
          <circle
            cx={STRIKE.x}
            cy={STRIKE.y}
            r={8}
            fill={PLASMA}
            opacity={boltRevealT}
          />

          {/* Secondary down-trace pulse */}
          {pulseVisible && (
            <g opacity={0.9}>
              <circle
                cx={pulsePos.x}
                cy={pulsePos.y}
                r={12}
                fill={PLASMA}
                opacity={0.25}
              />
              <circle
                cx={pulsePos.x}
                cy={pulsePos.y}
                r={3}
                fill="#FFFFFF"
              />
            </g>
          )}

          {/* ── Reaction callouts ────────────────────────────────────── */}
          {CALLOUTS.map((c, i) => {
            const op = interpolate(
              t,
              [c.delay, c.delay + 0.3],
              [0, 1],
              {
                easing: Easing.out(Easing.cubic),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            // Leader from anchor to pos (right side of box)
            const boxW = 232;
            const boxH = 50;
            const leaderX = c.pos.x + boxW; // enter box on its left-right? use left side
            return (
              <g key={`co-${i}`} opacity={op}>
                {/* Leader line: anchor -> box left side */}
                <line
                  x1={c.anchor.x}
                  y1={c.anchor.y}
                  x2={c.pos.x - 10}
                  y2={c.pos.y + boxH / 2}
                  stroke={HOT}
                  strokeOpacity={0.7}
                  strokeWidth={1.2}
                />
                {/* Anchor pip on bolt */}
                <circle
                  cx={c.anchor.x}
                  cy={c.anchor.y}
                  r={2.8}
                  fill={HOT}
                />
                {/* Box */}
                <rect
                  x={c.pos.x}
                  y={c.pos.y}
                  width={boxW}
                  height={boxH}
                  fill={INK}
                  stroke={HOT}
                  strokeOpacity={0.9}
                  strokeWidth={1.2}
                  rx={2}
                />
                <text
                  x={c.pos.x + 12}
                  y={c.pos.y + 19}
                  fill={HOT}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing={2.8}
                >
                  {c.label}
                </text>
                <text
                  x={c.pos.x + 12}
                  y={c.pos.y + 39}
                  fill={PLASMA}
                  fontFamily={inter}
                  fontSize={14}
                  fontWeight={500}
                  letterSpacing={0.5}
                >
                  {c.reaction}
                </text>
                {/* unused var for lint quiet */}
                <text display="none">{leaderX}</text>
              </g>
            );
          })}

          {/* ≈ 30,000 K tag — near the bolt crook */}
          <g
            opacity={interpolate(t, [0.75, 1.1], [0, 1], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <line
              x1={720}
              y1={376}
              x2={200}
              y2={330}
              stroke={PLASMA}
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="4 6"
            />
            <text
              x={200}
              y={322}
              fill={PLASMA}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3.2}
            >
              T ≈ 30,000 K
            </text>
            <text
              x={200}
              y={344}
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.5}
            >
              5× SOLAR SURFACE
            </text>
          </g>

          {/* Caption strip below the plate */}
          <g
            transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            <text>FIG. 1 · THE ZEL'DOVICH MECHANISM IN A LIGHTNING CHANNEL</text>
            <text
              x={FRAME.w}
              textAnchor="end"
              fill={HOT}
              opacity={0.9}
            >
              ≈ 8 Tg N YR⁻¹ GLOBAL
            </text>
          </g>

          {/* Full-plate strobe wash on flash moment — overbright */}
          <rect
            x={FRAME.x}
            y={FRAME.y}
            width={FRAME.w}
            height={FRAME.h}
            fill={PLASMA}
            opacity={0.11 * strobe}
          />
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: HOT,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Agronomist</span>
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
          The storm's
          <br />
          crop science.
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
          Each stroke heats air to ≈30,000 K — hotter than the Sun's surface — cracking
          atmospheric <span style={{ color: HOT, fontWeight: 600 }}>N₂</span> and
          <span style={{ color: PLASMA, fontWeight: 600 }}> O₂</span> into nitric oxide.
          That cracked nitrogen rains down as nitrate, fertilising the land at roughly
          <span style={{ color: GREEN, fontWeight: 600 }}> 8 million tonnes a year</span>.
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
        <span>Zel'dovich mechanism · Levy et al., JGR 1996</span>
        <span>
          <span style={{ color: HOT }}>●</span> N–O recombination
        </span>
      </div>
    </AbsoluteFill>
  );
};
