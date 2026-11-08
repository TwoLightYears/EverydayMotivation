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
const INK = "#070812";
const PANEL = "#0F1324";
const PANEL_DEEP = "#141A2E";
const MILKY = "#F5EBCF";
const MILKY_GLOW = "#FFF4D4";
const DUST = "#C99659";
const AMBER = "#D4A24C";
const GRAY = "#7B8094";
const GRID = "#1C2238";
const GRID_MAJOR = "#262D47";

// ── Chart layout (coord space: 1080 × 800) ────────────────────────────────
// The plate shows a patch of southern sky. The Milky Way is drawn as a
// polyline spine; stars are jittered perpendicular to it, with density
// falling off with distance from the galactic plane.

// The galactic plane: a gentle curve crossing the plate diagonally from
// upper-left towards lower-right (southern Milky Way, as seen from the
// Kalahari on a moonless austral winter night).
type Pt = { x: number; y: number };
const GAL: Pt[] = [
  { x: 80, y: 130 },
  { x: 240, y: 200 },
  { x: 410, y: 300 },
  { x: 560, y: 380 },
  { x: 700, y: 460 },
  { x: 840, y: 550 },
  { x: 1000, y: 650 },
];

// Smooth-ish curve helper (Catmull-Rom → cubic Bezier)
const galaxyPath = (): string => {
  const p = GAL;
  if (p.length < 2) return "";
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

// Point & tangent on the galaxy polyline at parameter s ∈ [0, 1]
const galaxyAt = (s: number): { p: Pt; tan: Pt; n: Pt } => {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < GAL.length - 1; i++) {
    const L = Math.hypot(GAL[i + 1].x - GAL[i].x, GAL[i + 1].y - GAL[i].y);
    segs.push(L);
    total += L;
  }
  const target = Math.max(0, Math.min(1, s)) * total;
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= target || i === segs.length - 1) {
      const f = segs[i] === 0 ? 0 : (target - acc) / segs[i];
      const a = GAL[i];
      const b = GAL[i + 1];
      const p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      const tx = (b.x - a.x) / segs[i];
      const ty = (b.y - a.y) / segs[i];
      const nx = -ty;
      const ny = tx;
      return { p, tan: { x: tx, y: ty }, n: { x: nx, y: ny } };
    }
    acc += segs[i];
  }
  return { p: GAL[0], tan: { x: 1, y: 0 }, n: { x: 0, y: 1 } };
};

// Deterministic pseudo-random — portable, stable across renders.
const rnd = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
};

// ── Stars ───────────────────────────────────────────────────────────────
type Star = {
  x: number;
  y: number;
  r: number;
  mag: number; // 0..1 brightness
  twk: number; // twinkle phase
  inBand: boolean;
};

const buildStars = (): Star[] => {
  const stars: Star[] = [];
  const r = rnd(20261108);

  // Dense stars along the galactic band
  for (let i = 0; i < 520; i++) {
    const s = r();
    const g = galaxyAt(s);
    // Jitter with a gaussian-ish bias toward the band (sum of 3 uniforms)
    const u = (r() + r() + r()) / 3 - 0.5; // -0.5..0.5
    const sign = r() < 0.5 ? -1 : 1;
    const d = u * 160 * sign;
    const x = g.p.x + g.n.x * d;
    const y = g.p.y + g.n.y * d;
    if (x < 10 || x > 1070 || y < 10 || y > 790) continue;
    const dBand = Math.abs(d);
    const bandBoost = Math.exp(-dBand / 70);
    const mag = 0.2 + 0.8 * Math.pow(r(), 2.4) * (0.6 + bandBoost);
    const rad = 0.6 + mag * 1.8;
    stars.push({
      x,
      y,
      r: rad,
      mag: Math.min(1, mag),
      twk: r() * Math.PI * 2,
      inBand: dBand < 55,
    });
  }

  // Field stars across the whole plate
  for (let i = 0; i < 260; i++) {
    const x = 10 + r() * 1060;
    const y = 10 + r() * 780;
    const mag = 0.15 + Math.pow(r(), 3.5) * 0.9;
    stars.push({
      x,
      y,
      r: 0.5 + mag * 1.3,
      mag,
      twk: r() * Math.PI * 2,
      inBand: false,
    });
  }

  return stars;
};

const STARS = buildStars();

// A handful of named "bright" stars we tag with chart annotations.
type Named = { name: string; x: number; y: number; r: number; dx: number; dy: number; anchor?: "start" | "end" };
const NAMED: Named[] = [
  { name: "α CRU", x: 320, y: 170, r: 3.0, dx: -12, dy: 4, anchor: "end" },
  { name: "β CEN", x: 580, y: 260, r: 2.7, dx: -12, dy: 4, anchor: "end" },
  { name: "ACHERNAR", x: 870, y: 215, r: 2.7, dx: 14, dy: 4 },
  { name: "CANOPUS", x: 180, y: 480, r: 2.9, dx: 14, dy: 4 },
];

// Beetle position on the plate (bottom-centre of the chart space)
const BEETLE = { x: 540, y: 740 };
// Where the beetle will walk to — dead straight, due north on the chart
const DEST = { x: 540, y: 60 };
// Point on the galactic band the beetle "fixes" its bearing against.
// We pick the galaxy point closest in x to the beetle, for a clean leader.
const fixPoint = (() => {
  let best = GAL[0];
  let bestDx = Math.abs(best.x - BEETLE.x);
  for (const g of GAL) {
    const dx = Math.abs(g.x - BEETLE.x);
    if (dx < bestDx) {
      bestDx = dx;
      best = g;
    }
  }
  return best;
})();

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timeline ────────────────────────────────────────────────────────
  // 0.0s  night panel + galaxy band fade in
  // 0.6s  star field twinkles in
  // 1.3s  named-star callouts appear
  // 1.7s  bearing ray from galaxy fix-point down to beetle resolves
  // 2.1s  trajectory from beetle draws out (dead straight)
  // 2.4s  title / role tag spring in
  // 3.0s  hook copy fades up

  const bandIn = interpolate(frame, [0, fps * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const starsIn = interpolate(frame, [fps * 0.4, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelsIn = interpolate(frame, [fps * 1.3, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bearingIn = interpolate(frame, [fps * 1.7, fps * 2.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const trajIn = interpolate(frame, [fps * 2.1, fps * 2.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleSpring = spring({
    frame: frame - fps * 2.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 3.0, fps * 3.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gentle twinkle across the field
  const twk = frame / fps;

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  // Top metadata band: 0..110
  // Plate frame        : 130..841 (h 711, w 960; aspect 1.35 = 1080/800)
  // Title block         : 880..
  // Hook                : ~1095..
  // Footer              : 1280..
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W; // = FRAME.h / MAP_H

  // Trajectory partial length (start clear of the beetle icon)
  const TRAJ_START = { x: BEETLE.x, y: BEETLE.y - 28 };
  const trajTotal = Math.hypot(DEST.x - TRAJ_START.x, DEST.y - TRAJ_START.y);
  const trajLen = trajTotal * trajIn;
  const trajEnd = {
    x: TRAJ_START.x + ((DEST.x - TRAJ_START.x) * trajLen) / trajTotal,
    y: TRAJ_START.y + ((DEST.y - TRAJ_START.y) * trajLen) / trajTotal,
  };

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
        <span style={{ color: AMBER }}>2026 · 11 · 08</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="plate-vignette" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor={PANEL_DEEP} stopOpacity={1} />
            <stop offset="100%" stopColor={PANEL} stopOpacity={1} />
          </radialGradient>

          <pattern
            id="chart-grid"
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
            id="chart-grid-major"
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

          {/* Galactic-band glow — a diffuse cream smear */}
          <filter id="band-blur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="band-blur-soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="40" />
          </filter>
          <filter id="star-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>

          {/* Mask so the galactic band stops at the plate edges */}
          <clipPath id="plate-clip">
            <rect x={0} y={0} width={MAP_W} height={MAP_H} />
          </clipPath>
        </defs>

        {/* Plate panel */}
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
          fill="url(#chart-grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#chart-grid-major)"
        />

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2E354F"
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

        {/* N marker */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">N</text>
          <line x1={5} y1={6} x2={5} y2={24} stroke={GRAY} strokeWidth={1.2} />
          <polygon points="2,9 5,2 8,9" fill={AMBER} />
        </g>

        {/* Degree scale bar (bottom-right of plate) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 170}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={GRAY}
          fill={GRAY}
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
            10°
          </text>
        </g>

        {/* Plate content: scale 1080×800 coords into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          <g clipPath="url(#plate-clip)">
            {/* Galactic band — layered soft glows */}
            <g opacity={bandIn}>
              <path
                d={galaxyPath()}
                stroke={MILKY}
                strokeWidth={240}
                strokeOpacity={0.16}
                fill="none"
                strokeLinecap="round"
                filter="url(#band-blur-soft)"
              />
              <path
                d={galaxyPath()}
                stroke={MILKY}
                strokeWidth={150}
                strokeOpacity={0.26}
                fill="none"
                strokeLinecap="round"
                filter="url(#band-blur)"
              />
              <path
                d={galaxyPath()}
                stroke={MILKY_GLOW}
                strokeWidth={70}
                strokeOpacity={0.38}
                fill="none"
                strokeLinecap="round"
                filter="url(#band-blur)"
              />
              {/* Dark dust lane running along the plane */}
              <path
                d={galaxyPath()}
                stroke={PANEL}
                strokeWidth={20}
                strokeOpacity={0.55}
                fill="none"
                strokeLinecap="round"
                filter="url(#band-blur)"
              />
              {/* Thin amber highlight — galactic dust warmth */}
              <path
                d={galaxyPath()}
                stroke={DUST}
                strokeWidth={6}
                strokeOpacity={0.22}
                fill="none"
                strokeLinecap="round"
                filter="url(#band-blur)"
              />
            </g>

            {/* Stars */}
            <g opacity={starsIn}>
              {STARS.map((s, i) => {
                const twinkle =
                  0.78 + 0.22 * Math.sin(twk * 2.1 + s.twk);
                return (
                  <circle
                    key={i}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={s.inBand ? MILKY_GLOW : "#FFFFFF"}
                    opacity={s.mag * twinkle}
                    filter={s.r > 1.6 ? "url(#star-glow)" : undefined}
                  />
                );
              })}
            </g>

            {/* Named bright stars with annotation tags */}
            <g opacity={labelsIn}>
              {NAMED.map((n) => (
                <g key={n.name}>
                  <circle cx={n.x} cy={n.y} r={n.r + 4} fill="none" stroke={AMBER} strokeWidth={1} opacity={0.65} />
                  <circle cx={n.x} cy={n.y} r={n.r} fill="#FFFFFF" />
                  <text
                    x={n.x + n.dx}
                    y={n.y + n.dy}
                    fill={AMBER}
                    fontFamily={inter}
                    fontSize={10.5}
                    fontWeight={600}
                    letterSpacing={2.4}
                    textAnchor={n.anchor ?? "start"}
                  >
                    {n.name}
                  </text>
                </g>
              ))}
            </g>

            {/* Bearing ray from galactic fix-point down to the beetle */}
            <g opacity={bearingIn}>
              {/* Marker on the band at the fix-point */}
              <circle
                cx={fixPoint.x}
                cy={fixPoint.y}
                r={7}
                fill="none"
                stroke={AMBER}
                strokeWidth={1.3}
              />
              <circle cx={fixPoint.x} cy={fixPoint.y} r={2.4} fill={AMBER} />
              {/* The dashed sight-line */}
              <line
                x1={fixPoint.x}
                y1={fixPoint.y + 7}
                x2={BEETLE.x}
                y2={BEETLE.y - 22}
                stroke={AMBER}
                strokeWidth={1.2}
                strokeDasharray="3 5"
                opacity={0.85}
              />
              {/* Bearing-angle annotation tag — placed well away from the band */}
              <g transform={`translate(${fixPoint.x + 70}, ${fixPoint.y + 70})`}>
                <line
                  x1={-62}
                  y1={-62}
                  x2={-4}
                  y2={2}
                  stroke={AMBER}
                  strokeWidth={1.2}
                />
                <rect
                  x={0}
                  y={0}
                  width={168}
                  height={54}
                  rx={2}
                  fill={INK}
                  stroke={AMBER}
                  strokeWidth={1.2}
                />
                <text
                  x={14}
                  y={21}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={500}
                  letterSpacing={2.6}
                >
                  CELESTIAL FIX
                </text>
                <text
                  x={14}
                  y={43}
                  fill={AMBER}
                  fontFamily={inter}
                  fontSize={14}
                  fontWeight={600}
                  letterSpacing={2}
                >
                  θ = 0.0°  (MW ∥ COURSE)
                </text>
              </g>
            </g>

            {/* Trajectory — dead straight, drawn after bearing resolves */}
            <g opacity={Math.min(1, bearingIn * 1.5)}>
              <line
                x1={TRAJ_START.x}
                y1={TRAJ_START.y}
                x2={trajEnd.x}
                y2={trajEnd.y}
                stroke={AMBER}
                strokeWidth={2.2}
                strokeDasharray="7 8"
                strokeLinecap="round"
              />
              {trajIn > 0.05 && (
                <g>
                  {/* Chevron head (upward) */}
                  <polyline
                    points={`${trajEnd.x - 9},${trajEnd.y + 10} ${trajEnd.x},${trajEnd.y} ${trajEnd.x + 9},${trajEnd.y + 10}`}
                    fill="none"
                    stroke={AMBER}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={trajEnd.x}
                    cy={trajEnd.y}
                    r={13}
                    fill="none"
                    stroke={AMBER}
                    strokeWidth={1}
                    opacity={0.5}
                  />
                </g>
              )}
            </g>

            {/* Beetle — chart icon style, scaled up for legibility */}
            <g transform={`translate(${BEETLE.x}, ${BEETLE.y}) scale(1.4)`}>
              {/* Ball — to the left of the beetle, slightly behind */}
              <g transform="translate(-30, 4)">
                <circle r={18} fill={PANEL_DEEP} stroke={DUST} strokeWidth={1.5} />
                <circle cx={-5} cy={-5} r={5} fill="none" stroke={DUST} strokeWidth={1} opacity={0.55} />
                <circle cx={6} cy={4} r={3} fill="none" stroke={DUST} strokeWidth={1} opacity={0.45} />
                <circle cx={-2} cy={6} r={2} fill="none" stroke={DUST} strokeWidth={1} opacity={0.4} />
              </g>
              {/* Legs — three pairs, fewer and cleaner */}
              {[
                [-8, -6, -18, -14],
                [-8, 0, -18, 0],
                [-8, 6, -18, 14],
                [8, -6, 18, -14],
                [8, 0, 18, 0],
                [8, 6, 18, 14],
              ].map((l, i) => (
                <line
                  key={`leg-${i}`}
                  x1={l[0]}
                  y1={l[1]}
                  x2={l[2]}
                  y2={l[3]}
                  stroke={AMBER}
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
              ))}
              {/* Elytra (oval body) */}
              <ellipse cx={0} cy={0} rx={14} ry={10} fill={DUST} stroke={AMBER} strokeWidth={1.3} />
              {/* Elytra seam */}
              <line x1={0} y1={-9} x2={0} y2={8} stroke={INK} strokeWidth={0.9} opacity={0.65} />
              {/* Pronotum */}
              <ellipse cx={0} cy={-9} rx={7} ry={4} fill={AMBER} stroke={INK} strokeWidth={0.8} />
              {/* Head */}
              <ellipse cx={0} cy={-14.5} rx={4.5} ry={3} fill={AMBER} stroke={INK} strokeWidth={0.8} />
            </g>

            {/* Beetle annotation (outside of the scaled icon) */}
            <g transform={`translate(${BEETLE.x + 38}, ${BEETLE.y + 8})`}>
              <line
                x1={0}
                y1={0}
                x2={30}
                y2={18}
                stroke={GRAY}
                strokeWidth={1}
              />
              <text
                x={34}
                y={22}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={2.4}
              >
                SCARABAEUS SATYRUS
              </text>
              <text
                x={34}
                y={38}
                fill={GRAY}
                fontFamily={inter}
                fontSize={10}
                fontStyle="italic"
                opacity={0.75}
              >
                BALL-ROLLING  ·  00:40 SAST
              </text>
            </g>
          </g>
        </g>

        {/* Caption strip just below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 2 · STRAIGHT-LINE RUN FIXED AGAINST GALACTIC BAND</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={AMBER}
            opacity={0.85}
          >
            KALAHARI · NEW-MOON SKY · S 26°
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
            color: AMBER,
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
            Astronomer
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
          Rolls in a
          <br />
          straight line,
          <br />
          by the galaxy.
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
          On moonless nights, the dung beetle{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          keeps its ball on a dead-straight course by fixing a bearing to
          the diffuse band of light the Milky Way casts across the sky —
          the first known invertebrate to navigate by the galaxy itself.
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
        <span>Dacke et al. · Current Biology 23 (2013) 298–300</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Galactic band = Compass
        </span>
      </div>
    </AbsoluteFill>
  );
};
