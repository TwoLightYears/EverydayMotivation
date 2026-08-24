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
const INK = "#0A0F1F";
const BOARD = "#0E1428";
const SKY_DEEP = "#111834";
const PLASMA = "#F7F3E1";
const BOLT_HALO = "#C9E1FF";
const BOLT_MID = "#7FA8FF";
const AMBER = "#E88A2E";
const AMBER_GLOW = "#FFC57A";
const SAND_DARK = "#2A2114";
const SAND_MID = "#3A2A16";
const GRAY = "#7C8494";
const GRID = "#1A2038";

// ── Geometry: the bolt (above ground) & fulgurite (below ground) ───────────
// The map lives in a 1080×800 coord space, then scales into a framed pane.
// The strike lands at STRIKE.x on the horizon line HORIZON_Y.
const HORIZON_Y = 470; // above ground: 0..HORIZON_Y ; below: HORIZON_Y..800
const STRIKE = { x: 470, y: HORIZON_Y };

// Bolt: a jagged polyline top→strike with branches.
type P = { x: number; y: number };
const BOLT_MAIN: P[] = [
  { x: 494, y: 60 },
  { x: 456, y: 104 },
  { x: 502, y: 148 },
  { x: 468, y: 196 },
  { x: 514, y: 240 },
  { x: 472, y: 290 },
  { x: 498, y: 344 },
  { x: 458, y: 402 },
  { x: 484, y: 442 },
  { x: STRIKE.x, y: STRIKE.y },
];

// Branch pieces peel off from a specific main-index and jag outward.
type Branch = { fromIdx: number; pts: P[]; w: number; delay: number };
const BOLT_BRANCHES: Branch[] = [
  {
    fromIdx: 2,
    pts: [
      { x: 502, y: 148 },
      { x: 566, y: 184 },
      { x: 552, y: 222 },
      { x: 604, y: 258 },
    ],
    w: 3,
    delay: 0.22,
  },
  {
    fromIdx: 4,
    pts: [
      { x: 514, y: 240 },
      { x: 436, y: 274 },
      { x: 418, y: 314 },
    ],
    w: 2.6,
    delay: 0.28,
  },
  {
    fromIdx: 6,
    pts: [
      { x: 498, y: 344 },
      { x: 578, y: 374 },
      { x: 620, y: 414 },
    ],
    w: 2.4,
    delay: 0.34,
  },
  {
    fromIdx: 7,
    pts: [
      { x: 458, y: 402 },
      { x: 394, y: 430 },
    ],
    w: 2.1,
    delay: 0.4,
  },
];

// Fulgurite: mirrors the bolt shape below ground, thicker glassy tubes.
const FULG_MAIN: P[] = [
  { x: STRIKE.x, y: STRIKE.y },
  { x: 452, y: 512 },
  { x: 488, y: 562 },
  { x: 458, y: 618 },
  { x: 494, y: 674 },
  { x: 466, y: 738 },
  { x: 486, y: 776 },
];
const FULG_BRANCHES: Branch[] = [
  {
    fromIdx: 1,
    pts: [
      { x: 452, y: 512 },
      { x: 380, y: 548 },
      { x: 342, y: 594 },
      { x: 316, y: 632 },
    ],
    w: 5.5,
    delay: 0.05,
  },
  {
    fromIdx: 2,
    pts: [
      { x: 488, y: 562 },
      { x: 566, y: 594 },
      { x: 616, y: 638 },
      { x: 652, y: 674 },
    ],
    w: 5,
    delay: 0.12,
  },
  {
    fromIdx: 3,
    pts: [
      { x: 458, y: 618 },
      { x: 402, y: 656 },
      { x: 380, y: 704 },
    ],
    w: 3.6,
    delay: 0.22,
  },
  {
    fromIdx: 4,
    pts: [
      { x: 494, y: 674 },
      { x: 560, y: 712 },
      { x: 596, y: 748 },
    ],
    w: 3.6,
    delay: 0.28,
  },
  {
    fromIdx: 5,
    pts: [
      { x: 466, y: 738 },
      { x: 428, y: 770 },
    ],
    w: 2.4,
    delay: 0.38,
  },
];

const pathFromPts = (pts: P[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

const polyLen = (pts: P[]): number => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return L;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing ────────────────────────────────────────────────────────────
  // 0.00s  premonition / dim clouds
  // 0.35s  bolt fires (spring) — 0.35..0.85
  // 0.75s  strike flash peaks
  // 0.85s  fulgurite draws underground — 0.85..1.60
  // 1.40s  callouts appear
  // 1.60s  title spring
  // 2.00s  hook fades in
  // 4.30s+ ambient shimmer, small aftershock pulse
  const boltProg = interpolate(frame, [fps * 0.35, fps * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strikeFlash = interpolate(
    frame,
    [fps * 0.72, fps * 0.85, fps * 1.15, fps * 1.5],
    [0, 1, 0.3, 0.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const fulgProg = interpolate(frame, [fps * 0.85, fps * 1.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calloutsOp = interpolate(frame, [fps * 1.4, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleSpring = spring({
    frame: frame - fps * 1.6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 2.0, fps * 2.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // A subtle after-flicker every ~1.6s once formed.
  const flickerBase = Math.max(0, frame - fps * 1.5);
  const flicker =
    0.08 *
    Math.sin(flickerBase * 0.55) *
    Math.exp(-((flickerBase / (fps * 2.4)) ** 2) * 0.6);

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  const FRAME = { x: 60, y: 130, w: 960, h: 800 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W;

  // Helpers for progressively drawing a polyline.
  const strokeReveal = (pts: P[], t: number) => {
    const L = polyLen(pts);
    const dash = L;
    const off = L * (1 - Math.max(0, Math.min(1, t)));
    return { dash, off, L };
  };
  const branchReveal = (b: Branch, prog: number) => {
    const local = (prog - b.delay) / (1 - b.delay);
    return strokeReveal(b.pts, local);
  };

  const bolt = strokeReveal(BOLT_MAIN, boltProg);
  const fulg = strokeReveal(FULG_MAIN, fulgProg);

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
        <span style={{ color: AMBER }}>2026 · 08 · 24</span>
      </div>

      {/* Main pane — sky above, cross-section below */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <clipPath id="sky-clip">
            <rect x={0} y={0} width={MAP_W} height={HORIZON_Y} />
          </clipPath>
          <filter id="cloud-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          {/* Grid pattern — draftsman's fine grid over the whole pane */}
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40 * scale}
            height={40 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${40 * scale} 0 L 0 0 0 ${40 * scale}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>

          {/* Sky vertical gradient — darker at top */}
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A0F1F" />
            <stop offset="65%" stopColor="#111832" />
            <stop offset="100%" stopColor="#152046" />
          </linearGradient>

          {/* Earth vertical gradient */}
          <linearGradient id="earth-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A2114" />
            <stop offset="100%" stopColor="#140E06" />
          </linearGradient>

          {/* Flash halo radial around strike point */}
          <radialGradient id="strike-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PLASMA} stopOpacity={0.95} />
            <stop offset="35%" stopColor={BOLT_HALO} stopOpacity={0.55} />
            <stop offset="100%" stopColor={BOLT_MID} stopOpacity={0} />
          </radialGradient>

          {/* Sky-wide bloom for the flash */}
          <radialGradient id="sky-flash" cx="50%" cy="55%" r="70%">
            <stop offset="0%" stopColor={PLASMA} stopOpacity={0.35} />
            <stop offset="60%" stopColor={BOLT_HALO} stopOpacity={0.08} />
            <stop offset="100%" stopColor={BOLT_MID} stopOpacity={0} />
          </radialGradient>

          {/* Fulgurite hot-glass halo */}
          <radialGradient id="fulg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER_GLOW} stopOpacity={0.7} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="tight-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Board base + grid */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill={BOARD}
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
        />

        {/* Sky and earth blocks inside the frame (scale coord space) */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Sky */}
          <rect
            x={0}
            y={0}
            width={MAP_W}
            height={HORIZON_Y}
            fill="url(#sky-grad)"
          />
          {/* Earth */}
          <rect
            x={0}
            y={HORIZON_Y}
            width={MAP_W}
            height={MAP_H - HORIZON_Y}
            fill="url(#earth-grad)"
          />

          {/* Sky bloom on flash */}
          <rect
            x={0}
            y={0}
            width={MAP_W}
            height={HORIZON_Y}
            fill="url(#sky-flash)"
            opacity={strikeFlash * 0.9}
          />

          {/* Sand grain texture — faint short vertical strokes */}
          {Array.from({ length: 130 }).map((_, i) => {
            const seed = (i * 9301 + 49297) % 233280;
            const rx = (seed / 233280) * MAP_W;
            const ry =
              HORIZON_Y + ((i * 7919) % (MAP_H - HORIZON_Y - 20)) + 6;
            const h = 3 + ((i * 131) % 6);
            const op = 0.05 + ((i * 17) % 10) / 130;
            return (
              <line
                key={`g-${i}`}
                x1={rx}
                y1={ry}
                x2={rx}
                y2={ry + h}
                stroke="#5A4426"
                strokeOpacity={op}
                strokeWidth={0.7}
              />
            );
          })}

          {/* Horizon: crisp ground line */}
          <line
            x1={0}
            y1={HORIZON_Y}
            x2={MAP_W}
            y2={HORIZON_Y}
            stroke="#4B3A1F"
            strokeWidth={1.4}
          />
          {/* Tick marks along horizon */}
          {Array.from({ length: 27 }).map((_, i) => (
            <line
              key={`t-${i}`}
              x1={40 + i * 40}
              y1={HORIZON_Y}
              x2={40 + i * 40}
              y2={HORIZON_Y + (i % 4 === 0 ? 8 : 4)}
              stroke="#4B3A1F"
              strokeWidth={1}
            />
          ))}

          {/* Star / faint cloud specks */}
          {Array.from({ length: 40 }).map((_, i) => {
            const sx = (i * 613) % MAP_W;
            const sy = ((i * 977) % (HORIZON_Y - 40)) + 20;
            const r = 0.6 + ((i * 31) % 5) / 10;
            return (
              <circle
                key={`st-${i}`}
                cx={sx}
                cy={sy}
                r={r}
                fill="#C9D0E4"
                opacity={0.18 + ((i * 7) % 10) / 40}
              />
            );
          })}

          {/* Cloud bank — soft dark cumulus silhouette clipped to sky */}
          <g clipPath="url(#sky-clip)">
            <g filter="url(#cloud-soft)" opacity={0.75}>
              <ellipse
                cx={STRIKE.x - 40}
                cy={-40}
                rx={340}
                ry={110}
                fill="#060A16"
              />
              <ellipse
                cx={STRIKE.x - 220}
                cy={-30}
                rx={200}
                ry={80}
                fill="#060A16"
              />
              <ellipse
                cx={STRIKE.x + 200}
                cy={-24}
                rx={230}
                ry={90}
                fill="#060A16"
              />
              <ellipse
                cx={STRIKE.x - 60}
                cy={-70}
                rx={420}
                ry={70}
                fill="#040814"
              />
            </g>
            {/* Cloud underside plasma glow while flash */}
            <ellipse
              cx={STRIKE.x - 10}
              cy={70}
              rx={260}
              ry={26}
              fill={BOLT_HALO}
              opacity={0.22 * strikeFlash + 0.04}
              filter="url(#soft-blur)"
            />
          </g>

          {/* Strike sky-halo — big soft radial around strike (below bolt) */}
          <circle
            cx={STRIKE.x}
            cy={STRIKE.y - 20}
            r={280}
            fill="url(#strike-glow)"
            opacity={strikeFlash}
          />

          {/* ── Bolt — soft outer halo, medium blue, plasma core ── */}
          {/* Outer halo (bloomed) */}
          <path
            d={pathFromPts(BOLT_MAIN)}
            stroke={BOLT_HALO}
            strokeWidth={22}
            strokeOpacity={0.28 + 0.28 * strikeFlash}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={bolt.dash}
            strokeDashoffset={bolt.off}
            filter="url(#soft-blur)"
          />
          {/* Medium blue */}
          <path
            d={pathFromPts(BOLT_MAIN)}
            stroke={BOLT_MID}
            strokeWidth={8}
            strokeOpacity={0.88}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={bolt.dash}
            strokeDashoffset={bolt.off}
            filter="url(#tight-glow)"
          />
          {/* Plasma core */}
          <path
            d={pathFromPts(BOLT_MAIN)}
            stroke={PLASMA}
            strokeWidth={2.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={bolt.dash}
            strokeDashoffset={bolt.off}
          />

          {/* Bolt branches */}
          {BOLT_BRANCHES.map((b, i) => {
            const r = branchReveal(b, boltProg);
            return (
              <g key={`bb-${i}`}>
                <path
                  d={pathFromPts(b.pts)}
                  stroke={BOLT_HALO}
                  strokeWidth={b.w + 8}
                  strokeOpacity={0.18 + 0.18 * strikeFlash}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={r.dash}
                  strokeDashoffset={r.off}
                  filter="url(#soft-blur)"
                />
                <path
                  d={pathFromPts(b.pts)}
                  stroke={BOLT_MID}
                  strokeWidth={b.w + 1.5}
                  strokeOpacity={0.75}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={r.dash}
                  strokeDashoffset={r.off}
                  filter="url(#tight-glow)"
                />
                <path
                  d={pathFromPts(b.pts)}
                  stroke={PLASMA}
                  strokeWidth={b.w * 0.55}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={r.dash}
                  strokeDashoffset={r.off}
                />
              </g>
            );
          })}

          {/* ── Fulgurite — hot glass mirror below ─────────────── */}
          {/* Sand crater above the strike */}
          <ellipse
            cx={STRIKE.x}
            cy={HORIZON_Y + 6}
            rx={54}
            ry={9}
            fill={SAND_DARK}
            opacity={fulgProg}
          />
          {/* Amber halo cluster around top of fulgurite */}
          <circle
            cx={STRIKE.x}
            cy={HORIZON_Y + 30}
            r={90}
            fill="url(#fulg-glow)"
            opacity={0.55 * fulgProg + strikeFlash * 0.4}
          />

          {/* Fulgurite outer glow */}
          <path
            d={pathFromPts(FULG_MAIN)}
            stroke={AMBER_GLOW}
            strokeWidth={20}
            strokeOpacity={0.22}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={fulg.dash}
            strokeDashoffset={fulg.off}
            filter="url(#soft-blur)"
          />
          {/* Fulgurite tube body */}
          <path
            d={pathFromPts(FULG_MAIN)}
            stroke={AMBER}
            strokeWidth={9}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={fulg.dash}
            strokeDashoffset={fulg.off}
          />
          {/* Hot inner filament */}
          <path
            d={pathFromPts(FULG_MAIN)}
            stroke={AMBER_GLOW}
            strokeWidth={3}
            strokeOpacity={0.9}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={fulg.dash}
            strokeDashoffset={fulg.off}
          />

          {/* Fulgurite branches */}
          {FULG_BRANCHES.map((b, i) => {
            const r = branchReveal(b, fulgProg);
            return (
              <g key={`fb-${i}`}>
                <path
                  d={pathFromPts(b.pts)}
                  stroke={AMBER_GLOW}
                  strokeWidth={b.w + 10}
                  strokeOpacity={0.16}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={r.dash}
                  strokeDashoffset={r.off}
                  filter="url(#soft-blur)"
                />
                <path
                  d={pathFromPts(b.pts)}
                  stroke={AMBER}
                  strokeWidth={b.w}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={r.dash}
                  strokeDashoffset={r.off}
                />
                <path
                  d={pathFromPts(b.pts)}
                  stroke={AMBER_GLOW}
                  strokeWidth={Math.max(1, b.w * 0.35)}
                  strokeOpacity={0.85}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={r.dash}
                  strokeDashoffset={r.off}
                />
              </g>
            );
          })}

          {/* Late after-flicker on bolt core */}
          <path
            d={pathFromPts(BOLT_MAIN)}
            stroke={PLASMA}
            strokeWidth={1.9}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={Math.max(0, flicker + 0.02) * (boltProg > 0.98 ? 1 : 0)}
          />

          {/* Strike point marker — small white spark */}
          <circle
            cx={STRIKE.x}
            cy={STRIKE.y}
            r={5 + 4 * strikeFlash}
            fill={PLASMA}
            opacity={boltProg}
          />

          {/* ── Callouts (draftsman-style) ─────────────────────── */}
          <g opacity={calloutsOp} fontFamily={inter} fill={PLASMA}>
            {/* Top-right: temperature */}
            <g>
              <line
                x1={STRIKE.x + 60}
                y1={280}
                x2={840}
                y2={280}
                stroke={BOLT_HALO}
                strokeOpacity={0.75}
                strokeWidth={1.1}
              />
              <line
                x1={840}
                y1={280}
                x2={840}
                y2={310}
                stroke={BOLT_HALO}
                strokeOpacity={0.75}
                strokeWidth={1.1}
              />
              <text
                x={840}
                y={264}
                fill={BOLT_HALO}
                fontSize={12}
                letterSpacing={3.5}
                fontWeight={600}
                textAnchor="end"
              >
                CHANNEL TEMP
              </text>
              <text
                x={840}
                y={334}
                fill={PLASMA}
                fontSize={38}
                fontFamily={playfair}
                fontStyle="italic"
                textAnchor="end"
              >
                ≈ 30,000 K
              </text>
              <text
                x={840}
                y={358}
                fill={GRAY}
                fontSize={11}
                letterSpacing={2.5}
                textAnchor="end"
              >
                ≈ 5× SURFACE OF THE SUN
              </text>
            </g>

            {/* Left: duration — aligned to left rule, well clear of bolt path */}
            <g>
              <line
                x1={200}
                y1={170}
                x2={370}
                y2={170}
                stroke={BOLT_HALO}
                strokeOpacity={0.75}
                strokeWidth={1.1}
              />
              <line
                x1={200}
                y1={170}
                x2={200}
                y2={198}
                stroke={BOLT_HALO}
                strokeOpacity={0.75}
                strokeWidth={1.1}
              />
              <text
                x={200}
                y={156}
                fill={BOLT_HALO}
                fontSize={12}
                letterSpacing={3.5}
                fontWeight={600}
              >
                DURATION
              </text>
              <text
                x={200}
                y={224}
                fill={PLASMA}
                fontSize={32}
                fontFamily={playfair}
                fontStyle="italic"
              >
                &lt; 1 ms
              </text>
              <text
                x={200}
                y={246}
                fill={GRAY}
                fontSize={11}
                letterSpacing={2.5}
              >
                RETURN STROKE
              </text>
            </g>

            {/* Bottom-right: material */}
            <g>
              <line
                x1={STRIKE.x + 60}
                y1={620}
                x2={840}
                y2={620}
                stroke={AMBER_GLOW}
                strokeOpacity={0.75}
                strokeWidth={1.1}
              />
              <line
                x1={840}
                y1={620}
                x2={840}
                y2={650}
                stroke={AMBER_GLOW}
                strokeOpacity={0.75}
                strokeWidth={1.1}
              />
              <text
                x={840}
                y={606}
                fill={AMBER_GLOW}
                fontSize={12}
                letterSpacing={3.5}
                fontWeight={600}
                textAnchor="end"
              >
                MATERIAL
              </text>
              <text
                x={840}
                y={676}
                fill={AMBER_GLOW}
                fontSize={30}
                fontFamily={playfair}
                fontStyle="italic"
                textAnchor="end"
              >
                SiO₂ → lechatelierite
              </text>
              <text
                x={840}
                y={700}
                fill={GRAY}
                fontSize={11}
                letterSpacing={2.5}
                textAnchor="end"
              >
                FUSED SAND · SHOCKED GLASS
              </text>
            </g>

            {/* Depth ruler down the left inside the earth */}
            <g stroke="#5A4426" strokeWidth={1}>
              <line x1={140} y1={HORIZON_Y} x2={140} y2={760} />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <line
                  key={`d-${i}`}
                  x1={132}
                  y1={HORIZON_Y + i * 50}
                  x2={148}
                  y2={HORIZON_Y + i * 50}
                />
              ))}
              <text
                x={124}
                y={HORIZON_Y + 4}
                fill={GRAY}
                fontSize={10}
                letterSpacing={2}
                textAnchor="end"
                stroke="none"
              >
                0 M
              </text>
              <text
                x={124}
                y={HORIZON_Y + 154}
                fill={GRAY}
                fontSize={10}
                letterSpacing={2}
                textAnchor="end"
                stroke="none"
              >
                1
              </text>
              <text
                x={124}
                y={HORIZON_Y + 254}
                fill={GRAY}
                fontSize={10}
                letterSpacing={2}
                textAnchor="end"
                stroke="none"
              >
                2 M
              </text>
            </g>

            {/* Horizon label — left/right of horizon line, inside the coord space */}
            <text
              x={30}
              y={HORIZON_Y - 10}
              fill={GRAY}
              fontSize={10}
              letterSpacing={2.5}
            >
              SURFACE
            </text>
            <text
              x={MAP_W - 30}
              y={HORIZON_Y - 10}
              fill={GRAY}
              fontSize={10}
              letterSpacing={2.5}
              textAnchor="end"
            >
              SANDY SOIL · SiO₂
            </text>
          </g>
        </g>

        {/* Frame border on top */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#242A3D"
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

        {/* Caption strip below the pane */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · CLOUD-TO-GROUND STRIKE &amp; FULGURITE CAST</text>
          <text x={FRAME.w} textAnchor="end" fill={AMBER} opacity={0.85}>
            SECTION VIEW · NOT TO SCALE
          </text>
        </g>
      </svg>

      {/* ── Type lockup ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 990,
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
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Glassblower
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The million-degree
          <br />
          glassmaker.
        </div>

        <div
          style={{
            marginTop: 20,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 920,
            opacity: hookOpacity,
          }}
        >
          In under a millisecond, a lightning channel heats sandy soil past{" "}
          <span style={{ color: PLASMA, fontWeight: 600 }}>≈ 30,000 K</span> —
          five times the surface of the sun — fusing silica into hollow,
          branching glass tubes called{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>fulgurites</span>:
          petrified casts of the bolt itself.
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
        <span>Pasek &amp; Block · J. Geophys. Res. Planets 114 (2009)</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Fused sand = Fulgurite
        </span>
      </div>

      {/* Suppress unused-warning */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
