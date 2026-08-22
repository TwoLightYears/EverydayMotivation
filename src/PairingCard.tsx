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
const INK = "#0A0E12";
const BOARD = "#0F1418";
const MEMBRANE = "#EFE1BF";
const MEMBRANE_DIM = "#8C7F60";
const IRIS = "#2F7A6E";
const IRIS_HOT = "#5CC1AF";
const AMBER = "#C57A3E";
const AMBER_HOT = "#E89A5A";
const GRAY = "#7C8390";
const GRID = "#161B20";
const GRID_MAJOR = "#1F262C";

// ── Wing geometry (in map coord system: 1080 × 800) ───────────────────
// Wing sits diagonally, base at lower-left, tip pushed up-right.
// Leading edge (upper): near-straight, slightly convex, characteristic of a
// cicada forewing. Trailing edge (lower): a fuller curve, tapering to apex.
const WING_OUTLINE = `
M 205,468
C 285,388 405,308 555,258
C 700,220 830,238 908,308
C 858,352 780,378 700,398
C 615,418 520,462 430,486
C 345,506 258,502 205,468 Z
`;

// Longitudinal veins radiating from base cluster at (~215,455).
// End near, but do not overshoot, the wing margin (clip also enforces this).
type Vein = { d: string; w: number };
const VEINS: Vein[] = [
  // C (costa) — hugs the leading edge
  { d: "M 220,452 C 320,370 460,300 610,272 C 740,258 830,270 895,308", w: 2.4 },
  // Sc + R (radial trunk)
  { d: "M 220,457 C 330,405 470,340 620,308 C 740,290 815,300 875,325", w: 2.0 },
  // R + M split (upper distal fan)
  { d: "M 220,461 C 335,430 480,378 620,348 C 730,335 800,340 848,352", w: 1.7 },
  // M (median)
  { d: "M 220,464 C 330,455 470,420 605,395 C 705,382 770,378 810,378", w: 1.6 },
  // Cu (cubital)
  { d: "M 220,467 C 315,470 435,468 555,458 C 645,450 710,436 750,420", w: 1.5 },
  // A (anal, sweeps into trailing edge)
  { d: "M 220,470 C 290,486 395,498 495,486 C 570,476 615,460 640,446", w: 1.3 },
];

// Cross-veins — each one connects two adjacent longitudinal veins.
// Their endpoints are chosen to sit ON the longitudinal curves above so
// they terminate visibly on veins rather than in negative space.
const CROSS_VEINS: string[] = [
  // C – R
  "M 470,318 L 478,344",
  "M 560,286 L 568,315",
  "M 660,270 L 665,295",
  // R – M split
  "M 620,308 L 620,348",
  "M 730,290 L 732,336",
  // M split – M
  "M 555,382 L 560,410",
  "M 660,370 L 662,388",
  // M – Cu
  "M 465,432 L 470,462",
  "M 585,405 L 585,455",
  // Cu – A
  "M 385,478 L 388,492",
  "M 500,464 L 500,489",
];

// Hotspot on the wing where the magnifier detail is called out
const HOTSPOT = { x: 620, y: 355 };

// Inset detail — upper-right of the frame (map coords)
const INSET = { cx: 890, cy: 130, r: 128 };

// Hex-packed pillar grid inside inset — visible top-down as circles
const PILLAR_PITCH = 22; // spacing between pillar centers
const PILLAR_R = 5.5;
type Pillar = { x: number; y: number; i: number };
const PILLARS: Pillar[] = (() => {
  const out: Pillar[] = [];
  let idx = 0;
  for (let row = -6; row <= 6; row++) {
    const y = INSET.cy + row * (PILLAR_PITCH * 0.866);
    const xOff = row % 2 === 0 ? 0 : PILLAR_PITCH / 2;
    for (let col = -6; col <= 6; col++) {
      const x = INSET.cx + col * PILLAR_PITCH + xOff;
      const inside = Math.hypot(x - INSET.cx, y - INSET.cy) < INSET.r - 8;
      if (inside) {
        // deterministic stagger order: outward from center
        const d = Math.hypot(x - INSET.cx, y - INSET.cy);
        out.push({ x, y, i: d });
        idx++;
      }
    }
  }
  // sort by distance from center so they appear from the middle out
  out.sort((a, b) => a.i - b.i);
  return out.map((p, i) => ({ ...p, i }));
})();

// Bacterium (rod) sits across the pillars: base centerline and length
const BACT = {
  cx: INSET.cx + 6,
  cy: INSET.cy - 6,
  len: 148,
  h0: 30, // full-height, unruptured
  rot: -18, // degrees
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timeline ─────────────────────────────────────────────────────
  //  0.0s   board + grid on
  //  0.4s   wing scale in (spring)
  //  1.4s   iridescent sweep across membrane
  //  1.8s   leader line draws
  //  2.2s   pillars stagger in
  //  3.2s   bacterium settles, deflates
  //  3.2s   role tag, title, hook fade in with springs
  const T = (s: number) => fps * s;

  const wingSpring = spring({
    frame: frame - T(0.4),
    fps,
    config: { damping: 200, mass: 0.9, stiffness: 90 },
  });
  const wingScale = 0.94 + wingSpring * 0.06;
  const wingOp = wingSpring;

  const sweepP = interpolate(frame, [T(1.4), T(2.3)], [-0.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const leaderP = interpolate(frame, [T(1.8), T(2.6)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pillarsP = interpolate(frame, [T(2.2), T(3.4)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bactApproach = interpolate(frame, [T(3.2), T(3.9)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Deflation: 1 = full, 0 = collapsed
  const bactHeight = interpolate(frame, [T(3.9), T(4.7)], [1, 0.28], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bactBreachOp = interpolate(frame, [T(4.1), T(4.7)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const roleSpring = spring({
    frame: frame - T(3.2),
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const titleSpring = spring({
    frame: frame - T(3.5),
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOp = interpolate(frame, [T(4.0), T(4.9)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout ──────────────────────────────────────────────────
  // Top metadata band : 0..110
  // Drafting frame    : 130..841 (h 711, w 960)
  // Type block        : 900..
  // Footer            : bottom 50
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W; // 0.888... == FRAME.h / MAP_H

  // Sweep highlight positional bounds in map coords (across wing)
  const sweepX = interpolate(sweepP, [0, 1], [140, 940]);

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
        <span style={{ color: IRIS_HOT }}>2026 · 08 · 22</span>
      </div>

      {/* Drafting frame + specimen */}
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

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#12181D" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          {/* Wing membrane base fill: warm ivory with amber base and pale tip */}
          <linearGradient
            id="wing-fill"
            x1="200"
            y1="470"
            x2="890"
            y2="260"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#C4913E" stopOpacity={0.55} />
            <stop offset="35%" stopColor={MEMBRANE} stopOpacity={0.28} />
            <stop offset="100%" stopColor={MEMBRANE} stopOpacity={0.14} />
          </linearGradient>

          {/* Iridescent overlay — teal-green (real cicada wing sheen) */}
          <radialGradient
            id="wing-iris"
            cx="500"
            cy="330"
            r="380"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={IRIS_HOT} stopOpacity={0.38} />
            <stop offset="45%" stopColor={IRIS} stopOpacity={0.22} />
            <stop offset="100%" stopColor={IRIS} stopOpacity={0} />
          </radialGradient>

          {/* Sweep highlight — a soft moving vertical band */}
          <linearGradient
            id="sweep"
            x1={sweepX - 90}
            y1="0"
            x2={sweepX + 90}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={IRIS_HOT} stopOpacity={0} />
            <stop offset="50%" stopColor={IRIS_HOT} stopOpacity={0.55} />
            <stop offset="100%" stopColor={IRIS_HOT} stopOpacity={0} />
          </linearGradient>

          {/* Clip for wing membrane so overlays don't spill */}
          <clipPath id="wing-clip">
            <path d={WING_OUTLINE} />
          </clipPath>

          {/* Clip for inset circle */}
          <clipPath id="inset-clip">
            <circle cx={INSET.cx} cy={INSET.cy} r={INSET.r - 4} />
          </clipPath>

          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
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
          fill="url(#grid)"
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
          stroke="#242B33"
          strokeWidth={1}
        />

        {/* Corner crop marks (specimen sheet) */}
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

        {/* Specimen label in top-left of frame */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text>SPECIMEN</text>
          <text y={17} fill={MEMBRANE} letterSpacing={2.2} fontWeight={500}>
            PSALTODA CLARIPENNIS
          </text>
          <text y={32} fill={GRAY} letterSpacing={2.2} fontWeight={400}>
            LEFT FOREWING, ADAXIAL
          </text>
        </g>

        {/* Scale bar (bottom right of frame) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 200}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={GRAY}
          fill={GRAY}
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
            10 MM
          </text>
        </g>

        {/* Content scaled into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* ── WING ─────────────────────────────────────────────── */}
          <g
            opacity={wingOp}
            transform={`rotate(-9 540 380) translate(${(1 - wingScale) * 540} ${
              (1 - wingScale) * 380
            }) scale(${wingScale})`}
            style={{ transformOrigin: "540px 380px" }}
          >
            {/* Membrane fill */}
            <path
              d={WING_OUTLINE}
              fill="url(#wing-fill)"
              stroke={AMBER}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />

            {/* Iridescent overlay (clipped to wing) */}
            <g clipPath="url(#wing-clip)">
              <rect
                x={140}
                y={200}
                width={800}
                height={340}
                fill="url(#wing-iris)"
              />
              {/* Moving sweep */}
              <rect
                x={140}
                y={200}
                width={800}
                height={340}
                fill="url(#sweep)"
                opacity={interpolate(sweepP, [0, 0.2, 0.8, 1], [0, 1, 1, 0])}
              />
            </g>

            {/* Veins — clipped to the wing outline so nothing overshoots */}
            <g clipPath="url(#wing-clip)">
              {/* Longitudinal veins */}
              <g fill="none" stroke={AMBER} strokeLinecap="round">
                {VEINS.map((v, i) => (
                  <path key={i} d={v.d} strokeWidth={v.w} />
                ))}
              </g>
              {/* Cross veins */}
              <g
                fill="none"
                stroke={AMBER}
                strokeOpacity={0.9}
                strokeLinecap="round"
              >
                {CROSS_VEINS.map((d, i) => (
                  <path key={i} d={d} strokeWidth={1} />
                ))}
              </g>
              {/* Faint apical shading near the tip (cicada apex spot) */}
              <ellipse
                cx={820}
                cy={310}
                rx={95}
                ry={40}
                fill={AMBER}
                opacity={0.09}
              />
            </g>

            {/* Wing base — a slimmer, deeper articulation, not a bright bead */}
            <path
              d="M 200,470 C 214,455 224,449 236,449 C 244,458 244,470 236,478 C 224,480 212,478 200,470 Z"
              fill="#8A4E24"
              opacity={0.95}
            />
            <path
              d="M 205,462 C 214,456 224,454 232,458 C 232,464 226,470 218,470 C 212,470 208,467 205,462 Z"
              fill={AMBER}
              opacity={0.9}
            />

            {/* Sharper outline pass on top — reads crisp at print scale */}
            <path
              d={WING_OUTLINE}
              fill="none"
              stroke="#6D3F1A"
              strokeOpacity={0.7}
              strokeWidth={0.9}
            />
          </g>

          {/* ── HOTSPOT MARKER ───────────────────────────────────── */}
          <g opacity={interpolate(frame, [T(1.6), T(2.0)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}>
            <circle
              cx={HOTSPOT.x}
              cy={HOTSPOT.y}
              r={9}
              fill="none"
              stroke={IRIS_HOT}
              strokeWidth={1.4}
            />
            <circle cx={HOTSPOT.x} cy={HOTSPOT.y} r={2.5} fill={IRIS_HOT} />
            <line
              x1={HOTSPOT.x - 14}
              y1={HOTSPOT.y}
              x2={HOTSPOT.x - 7}
              y2={HOTSPOT.y}
              stroke={IRIS_HOT}
              strokeWidth={1.2}
            />
            <line
              x1={HOTSPOT.x + 7}
              y1={HOTSPOT.y}
              x2={HOTSPOT.x + 14}
              y2={HOTSPOT.y}
              stroke={IRIS_HOT}
              strokeWidth={1.2}
            />
            <line
              x1={HOTSPOT.x}
              y1={HOTSPOT.y - 14}
              x2={HOTSPOT.x}
              y2={HOTSPOT.y - 7}
              stroke={IRIS_HOT}
              strokeWidth={1.2}
            />
            <line
              x1={HOTSPOT.x}
              y1={HOTSPOT.y + 7}
              x2={HOTSPOT.x}
              y2={HOTSPOT.y + 14}
              stroke={IRIS_HOT}
              strokeWidth={1.2}
            />
            <text
              x={HOTSPOT.x + 18}
              y={HOTSPOT.y - 12}
              fill={IRIS_HOT}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={3}
            >
              A
            </text>
          </g>

          {/* ── LEADER LINE from hotspot to inset ───────────────── */}
          {(() => {
            // Two-segment leader with a knee
            const knee = { x: HOTSPOT.x + 90, y: HOTSPOT.y - 90 };
            const target = {
              x: INSET.cx - Math.cos(0) * INSET.r - 2,
              y: INSET.cy + 60,
            };
            // Compute segment lengths for dash animation
            const l1 = Math.hypot(knee.x - HOTSPOT.x, knee.y - HOTSPOT.y);
            const l2 = Math.hypot(target.x - knee.x, target.y - knee.y);
            const total = l1 + l2;
            const drawn = total * leaderP;
            let d = `M ${HOTSPOT.x} ${HOTSPOT.y}`;
            if (drawn <= l1) {
              const f = drawn / l1;
              d += ` L ${HOTSPOT.x + (knee.x - HOTSPOT.x) * f} ${
                HOTSPOT.y + (knee.y - HOTSPOT.y) * f
              }`;
            } else {
              d += ` L ${knee.x} ${knee.y}`;
              const f = (drawn - l1) / l2;
              d += ` L ${knee.x + (target.x - knee.x) * f} ${
                knee.y + (target.y - knee.y) * f
              }`;
            }
            return (
              <path
                d={d}
                stroke={IRIS_HOT}
                strokeWidth={1.2}
                fill="none"
                strokeLinecap="round"
              />
            );
          })()}

          {/* ── DETAIL INSET (top-right) ────────────────────────── */}
          <g opacity={interpolate(frame, [T(2.0), T(2.5)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}>
            {/* Backing disk */}
            <circle
              cx={INSET.cx}
              cy={INSET.cy}
              r={INSET.r}
              fill="#080B0F"
            />
            <circle
              cx={INSET.cx}
              cy={INSET.cy}
              r={INSET.r}
              fill="none"
              stroke={IRIS_HOT}
              strokeWidth={1.6}
            />
            {/* Concentric graticule */}
            <circle
              cx={INSET.cx}
              cy={INSET.cy}
              r={INSET.r * 0.66}
              fill="none"
              stroke={IRIS}
              strokeOpacity={0.35}
              strokeWidth={0.8}
              strokeDasharray="2 4"
            />
            <circle
              cx={INSET.cx}
              cy={INSET.cy}
              r={INSET.r * 0.33}
              fill="none"
              stroke={IRIS}
              strokeOpacity={0.35}
              strokeWidth={0.8}
              strokeDasharray="2 4"
            />
            {/* Crosshair */}
            <line
              x1={INSET.cx - INSET.r + 6}
              y1={INSET.cy}
              x2={INSET.cx + INSET.r - 6}
              y2={INSET.cy}
              stroke={IRIS}
              strokeOpacity={0.35}
              strokeWidth={0.8}
              strokeDasharray="2 4"
            />
            <line
              x1={INSET.cx}
              y1={INSET.cy - INSET.r + 6}
              x2={INSET.cx}
              y2={INSET.cy + INSET.r - 6}
              stroke={IRIS}
              strokeOpacity={0.35}
              strokeWidth={0.8}
              strokeDasharray="2 4"
            />

            {/* Clipped content */}
            <g clipPath="url(#inset-clip)">
              {/* Pillar field: amber discs on dark ground, staggered appearance */}
              {PILLARS.map((p, i) => {
                const stage = i / Math.max(1, PILLARS.length - 1);
                const local = (pillarsP - stage * 0.9) * 6;
                const op = Math.max(0, Math.min(1, local));
                const r = PILLAR_R * (0.6 + 0.4 * op);
                return (
                  <g key={i} opacity={op}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r + 1.6}
                      fill={AMBER_HOT}
                      opacity={0.22}
                    />
                    <circle cx={p.x} cy={p.y} r={r} fill={AMBER} />
                    <circle
                      cx={p.x - 1.4}
                      cy={p.y - 1.4}
                      r={r * 0.45}
                      fill={AMBER_HOT}
                      opacity={0.9}
                    />
                  </g>
                );
              })}

              {/* Bacterium — rod-shaped, settles then deflates between pillars */}
              <g
                transform={`translate(${BACT.cx}, ${
                  BACT.cy - 30 + 30 * bactApproach
                }) rotate(${BACT.rot})`}
                opacity={bactApproach}
              >
                {/* Halo (surface tension) */}
                <ellipse
                  cx={0}
                  cy={0}
                  rx={BACT.len / 2 + 6}
                  ry={(BACT.h0 * bactHeight) / 2 + 4}
                  fill={IRIS_HOT}
                  opacity={0.08 * bactApproach}
                />
                {/* Rod body */}
                <rect
                  x={-BACT.len / 2}
                  y={(-BACT.h0 * bactHeight) / 2}
                  width={BACT.len}
                  height={BACT.h0 * bactHeight}
                  rx={BACT.h0 * bactHeight * 0.5}
                  fill={MEMBRANE_DIM}
                  stroke={MEMBRANE}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
                {/* Membrane sag — small dark scallops along the underside */}
                {[-56, -28, 0, 28, 56].map((sx, i) => (
                  <ellipse
                    key={i}
                    cx={sx}
                    cy={(BACT.h0 * bactHeight) / 2 - 2}
                    rx={6}
                    ry={3 + 3 * (1 - bactHeight)}
                    fill="#050708"
                    opacity={0.6 * bactApproach}
                  />
                ))}
                {/* Rupture cracks appear as bactHeight collapses */}
                {[-42, -8, 24, 46].map((sx, i) => (
                  <path
                    key={`crack-${i}`}
                    d={`M ${sx} ${-BACT.h0 * bactHeight * 0.5 + 2} L ${
                      sx + 5
                    } ${BACT.h0 * bactHeight * 0.5 - 2}`}
                    stroke="#050708"
                    strokeWidth={1.1}
                    opacity={bactBreachOp}
                  />
                ))}
                {/* Leaking cytoplasm droplets */}
                {[-34, -6, 20, 38].map((sx, i) => (
                  <circle
                    key={`drop-${i}`}
                    cx={sx}
                    cy={(BACT.h0 * bactHeight) / 2 + 4 + (i % 2) * 2}
                    r={2}
                    fill={IRIS_HOT}
                    opacity={0.75 * bactBreachOp}
                  />
                ))}
              </g>

              {/* Species caption inside the inset (bottom curve) */}
              <text
                x={INSET.cx}
                y={INSET.cy + INSET.r - 20}
                textAnchor="middle"
                fill={MEMBRANE}
                opacity={0.75}
                fontFamily={inter}
                fontSize={11}
                fontStyle="italic"
                fontWeight={500}
                letterSpacing={1.6}
              >
                P. aeruginosa
              </text>
            </g>

            {/* Inset title strip */}
            <g>
              <text
                x={INSET.cx - INSET.r + 4}
                y={INSET.cy - INSET.r - 10}
                fill={IRIS_HOT}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3}
              >
                DETAIL · A
              </text>
              <text
                x={INSET.cx + INSET.r - 4}
                y={INSET.cy - INSET.r - 10}
                fill={GRAY}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2.5}
                textAnchor="end"
              >
                MAG · 40,000×
              </text>
            </g>
            {/* Inset scale bar (nano) */}
            <g
              transform={`translate(${INSET.cx - 40}, ${INSET.cy + INSET.r + 22})`}
              stroke={GRAY}
              fill={GRAY}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.5}
              fontWeight={500}
            >
              <line x1={0} y1={0} x2={80} y2={0} strokeWidth={1.2} />
              <line x1={0} y1={-4} x2={0} y2={4} strokeWidth={1.2} />
              <line x1={80} y1={-4} x2={80} y2={4} strokeWidth={1.2} />
              <text x={40} y={14} textAnchor="middle" stroke="none">
                200 NM
              </text>
            </g>
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
          <text>FIG. 3 · NANOPILLAR ARRAY, ~200 NM TALL · ~170 NM PITCH</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={IRIS_HOT}
            opacity={0.9}
          >
            MECHANICAL BACTERICIDE · NO CHEMISTRY
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
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
            color: IRIS_HOT,
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
            Public Health Inspector
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 962,
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
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The wing that
          <br />
          sterilizes itself.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 200,
          top: 1170,
          color: "#C8CAD0",
          fontFamily: inter,
          fontSize: 19,
          lineHeight: 1.4,
          fontWeight: 400,
          maxWidth: 820,
          opacity: hookOp,
        }}
      >
        The transparent membrane of the clanger cicada is covered in a lattice
        of nanoscale pillars —{" "}
        <span style={{ color: IRIS_HOT, fontWeight: 600 }}>
          ~200 nm tall, ~170 nm apart
        </span>{" "}
        — that mechanically rupture the membranes of gram-negative bacteria on
        contact. A cicada disinfects its wing with geometry, not chemistry.
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
        <span>Ivanova et al. · Small 8 (2012) 2489–2494</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Pillar = Bactericide
        </span>
      </div>
    </AbsoluteFill>
  );
};
