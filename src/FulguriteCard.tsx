import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
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
const SKY = "#0B0716";
const SKY_DEEP = "#040108";
const SAND = "#D6B77A";
const SAND_MID = "#C4A46A";
const SAND_DEEP = "#8A6A3A";
const CHAR = "#8A7C68";
const CHAR_DARK = "#3A2A18";
const MOLTEN = "#F6C453";
const MOLTEN_HOT = "#FFE7A8";
const PLASMA = "#E9F1FF";
const INK_TYPE = "#F4F0E6";
const TYPE_MUTED = "#B8AE97";

// ── Geometry ──────────────────────────────────────────────────────────────
const HORIZON = 600;
const STRIKE_X = 552;
const STRIKE_Y = HORIZON;

type Pt = [number, number];
type Stroke = { pts: Pt[]; width: number; delay: number; taper?: number };

// Main lightning stroke, top → strike. Denser jag pattern for realism.
const MAIN_BOLT: Pt[] = [
  [576, 108],
  [560, 158],
  [594, 206],
  [548, 250],
  [592, 296],
  [534, 340],
  [582, 386],
  [522, 430],
  [576, 474],
  [530, 518],
  [566, 562],
  [STRIKE_X, STRIKE_Y],
];
const BOLT_BRANCHES: Stroke[] = [
  {
    pts: [
      [582, 386],
      [636, 402],
      [682, 396],
      [724, 380],
      [758, 358],
    ],
    width: 2.4,
    delay: 0.12,
  },
  {
    pts: [
      [522, 430],
      [478, 424],
      [434, 408],
      [400, 380],
      [378, 348],
    ],
    width: 2.2,
    delay: 0.16,
  },
  {
    pts: [
      [576, 474],
      [616, 494],
      [644, 522],
    ],
    width: 1.5,
    delay: 0.2,
  },
  {
    pts: [
      [530, 518],
      [502, 542],
      [478, 566],
    ],
    width: 1.4,
    delay: 0.23,
  },
  {
    pts: [
      [592, 296],
      [634, 290],
      [666, 268],
    ],
    width: 1.5,
    delay: 0.14,
  },
  {
    pts: [
      [534, 340],
      [498, 336],
      [468, 322],
    ],
    width: 1.4,
    delay: 0.18,
  },
];

// Fulgurite tube. Main is deeper, branches feather out with taper.
const MAIN_TUBE: Pt[] = [
  [STRIKE_X, STRIKE_Y],
  [560, 668],
  [538, 730],
  [576, 788],
  [548, 846],
  [582, 900],
  [552, 956],
  [572, 998],
];
const TUBE_BRANCHES: Stroke[] = [
  {
    pts: [
      [560, 668],
      [604, 690],
      [636, 728],
      [664, 768],
      [686, 806],
      [702, 836],
    ],
    width: 7,
    delay: 0.1,
    taper: 1.5,
  },
  {
    pts: [
      [538, 730],
      [498, 744],
      [464, 774],
      [438, 812],
      [418, 846],
    ],
    width: 6,
    delay: 0.18,
    taper: 1.3,
  },
  {
    pts: [
      [576, 788],
      [618, 812],
      [644, 848],
      [658, 884],
    ],
    width: 5,
    delay: 0.28,
    taper: 1.1,
  },
  {
    pts: [
      [548, 846],
      [516, 878],
      [498, 912],
      [488, 946],
    ],
    width: 4,
    delay: 0.36,
    taper: 1.0,
  },
  {
    pts: [
      [702, 836],
      [730, 866],
      [746, 902],
      [754, 936],
    ],
    width: 2.8,
    delay: 0.46,
    taper: 0.85,
  },
  {
    pts: [
      [418, 846],
      [396, 878],
      [382, 912],
      [372, 946],
    ],
    width: 2.6,
    delay: 0.5,
    taper: 0.85,
  },
  {
    pts: [
      [664, 768],
      [692, 750],
      [720, 738],
    ],
    width: 2.4,
    delay: 0.42,
    taper: 0.8,
  },
  {
    pts: [
      [464, 774],
      [432, 758],
      [408, 750],
    ],
    width: 2.2,
    delay: 0.44,
    taper: 0.8,
  },
];

// Small vitrified "beads" attached along the main tube (fused glass nodes).
const TUBE_BEADS: { x: number; y: number; r: number; delay: number }[] = [
  { x: 562, y: 686, r: 8, delay: 0.14 },
  { x: 552, y: 802, r: 6, delay: 0.28 },
  { x: 570, y: 916, r: 5, delay: 0.42 },
  { x: 636, y: 728, r: 5, delay: 0.2 },
  { x: 486, y: 780, r: 5, delay: 0.24 },
  { x: 656, y: 872, r: 4, delay: 0.36 },
  { x: 510, y: 890, r: 4, delay: 0.4 },
];

const toPath = (pts: Pt[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");

const polyLen = (pts: Pt[]): number => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) {
    l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return l;
};

// Stenographer's depth ticks — skip the 0m label (redundant with horizon
// and would collide with the scorch halo).
const DEPTH_TICKS: { y: number; label: string; major: boolean }[] = [
  { y: HORIZON + 60, label: "", major: false },
  { y: HORIZON + 120, label: "", major: false },
  { y: HORIZON + 180, label: "0.9 M", major: true },
  { y: HORIZON + 240, label: "", major: false },
  { y: HORIZON + 300, label: "1.5 M", major: true },
  { y: HORIZON + 360, label: "", major: false },
];

export const FulguriteCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ─────────────────────────────────────────────────────────────
  const STRIKE_FRAME = Math.round(fps * 1.0);
  const REVEAL_SPAN = fps * 2.0;

  const strikeSpring = spring({
    frame: frame - STRIKE_FRAME,
    fps,
    config: { damping: 12, mass: 0.4, stiffness: 220 },
  });
  const flashDecay = interpolate(
    frame,
    [
      STRIKE_FRAME,
      STRIKE_FRAME + fps * 0.35,
      STRIKE_FRAME + fps * 1.2,
    ],
    [0, 1, 0.03],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const flash = Math.max(0, strikeSpring) * flashDecay;

  // Bolt reveal — near-instant.
  const boltReveal = interpolate(
    frame,
    [STRIKE_FRAME - 3, STRIKE_FRAME + 2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Tube reveal — spring-eased over 2 s, top → bottom.
  const revealRaw = Math.max(0, frame - STRIKE_FRAME) / REVEAL_SPAN;
  const tubeReveal = Math.min(
    1,
    1 - Math.pow(1 - Math.min(1, revealRaw), 3),
  );

  // Molten glass cools from white-hot → amber over 3 s.
  const coolT = interpolate(
    frame,
    [STRIKE_FRAME, STRIKE_FRAME + fps * 3.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Type reveal after tube has substantially formed.
  const titleSpring = spring({
    frame: frame - Math.round(fps * 1.5),
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 2.2, fps * 3.1],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const renderBoltStroke = (
    pts: Pt[],
    width: number,
    reveal: number,
    key: React.Key,
  ) => {
    const len = polyLen(pts);
    const dashOffset = len * (1 - reveal);
    return (
      <g key={key}>
        <path
          d={toPath(pts)}
          stroke={PLASMA}
          strokeWidth={width + 14}
          strokeOpacity={0.05 + flash * 0.16}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={dashOffset}
        />
        <path
          d={toPath(pts)}
          stroke={PLASMA}
          strokeWidth={width + 6}
          strokeOpacity={0.22 + flash * 0.3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={dashOffset}
        />
        <path
          d={toPath(pts)}
          stroke="#FFFFFF"
          strokeWidth={width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={dashOffset}
          opacity={0.95}
        />
      </g>
    );
  };

  const renderTubeStroke = (
    pts: Pt[],
    width: number,
    reveal: number,
    key: React.Key,
    taper = 1,
  ) => {
    const len = polyLen(pts);
    const dashOffset = len * (1 - reveal);
    const core = coolT < 0.35 ? "#FFFFFF" : coolT < 0.7 ? MOLTEN_HOT : MOLTEN;
    const wallW = width * (1 + taper * 0.35) + 3.5;
    const coreW = width * (1 + taper * 0.35);
    return (
      <g key={key}>
        {/* soft heat halo bleeding into sand */}
        <path
          d={toPath(pts)}
          stroke={MOLTEN}
          strokeWidth={width * (3.4 + taper * 0.5)}
          strokeOpacity={0.22 * (1 - coolT * 0.5)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={dashOffset}
        />
        {/* charred vitrified sand wall — thin rim, not a heavy outline */}
        <path
          d={toPath(pts)}
          stroke={CHAR_DARK}
          strokeWidth={wallW}
          strokeOpacity={0.7}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={dashOffset}
        />
        {/* molten glassy interior */}
        <path
          d={toPath(pts)}
          stroke={core}
          strokeWidth={coreW}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={dashOffset}
        />
        {/* thin hot centerline highlight (offset upward on right side) */}
        <path
          d={toPath(pts)}
          stroke={coolT < 0.4 ? "#FFFFFF" : "#FFF3D0"}
          strokeWidth={Math.max(0.8, coreW - 4)}
          strokeOpacity={0.6 * (1 - coolT * 0.5)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={dashOffset}
        />
      </g>
    );
  };

  const branchBoltReveal = (b: Stroke) => {
    return interpolate(
      frame,
      [
        STRIKE_FRAME - 3 + b.delay * fps * 0.4,
        STRIKE_FRAME + 3 + b.delay * fps * 0.4,
      ],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  };

  const branchTubeReveal = (b: Stroke) => {
    const local = (revealRaw - b.delay) / 0.5;
    const clamped = Math.max(0, Math.min(1, local));
    return 1 - Math.pow(1 - clamped, 3);
  };

  // Radial scorch cracks at strike point
  const scorchCracks: Pt[][] = [
    [[STRIKE_X, HORIZON], [STRIKE_X - 90, HORIZON + 14], [STRIKE_X - 140, HORIZON + 22]],
    [[STRIKE_X, HORIZON], [STRIKE_X + 78, HORIZON + 10], [STRIKE_X + 132, HORIZON + 18]],
    [[STRIKE_X, HORIZON], [STRIKE_X - 55, HORIZON + 26], [STRIKE_X - 82, HORIZON + 44]],
    [[STRIKE_X, HORIZON], [STRIKE_X + 42, HORIZON + 28], [STRIKE_X + 72, HORIZON + 48]],
    [[STRIKE_X, HORIZON], [STRIKE_X - 20, HORIZON + 34], [STRIKE_X - 28, HORIZON + 58]],
    [[STRIKE_X, HORIZON], [STRIKE_X + 22, HORIZON + 36], [STRIKE_X + 32, HORIZON + 62]],
  ];

  const cracksReveal = Math.min(1, Math.max(0, tubeReveal * 1.4));

  return (
    <AbsoluteFill style={{ backgroundColor: SKY, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: TYPE_MUTED,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: MOLTEN }}>2026 · 08 · 03</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY_DEEP} />
            <stop offset="55%" stopColor={SKY} />
            <stop offset="100%" stopColor="#1E1428" />
          </linearGradient>
          <radialGradient id="sky-cloud" cx="55%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#28203A" stopOpacity={0.4} />
            <stop offset="60%" stopColor="#1A1428" stopOpacity={0.15} />
            <stop offset="100%" stopColor={SKY} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="sand-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAND} />
            <stop offset="30%" stopColor={SAND_MID} />
            <stop offset="100%" stopColor={SAND_DEEP} />
          </linearGradient>
          <radialGradient id="strike-flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PLASMA} stopOpacity={1} />
            <stop offset="35%" stopColor={PLASMA} stopOpacity={0.45} />
            <stop offset="100%" stopColor={PLASMA} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="tube-hotspot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MOLTEN} stopOpacity={0.85} />
            <stop offset="60%" stopColor={MOLTEN} stopOpacity={0.15} />
            <stop offset="100%" stopColor={MOLTEN} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect x={0} y={0} width={1080} height={HORIZON} fill="url(#sky-grad)" />
        <rect x={0} y={0} width={1080} height={HORIZON} fill="url(#sky-cloud)" />

        {/* Sky bloom around strike */}
        <circle
          cx={STRIKE_X}
          cy={HORIZON - 30}
          r={620}
          fill="url(#strike-flash)"
          opacity={flash * 0.9}
        />

        {/* Sand band */}
        <rect
          x={0}
          y={HORIZON}
          width={1080}
          height={1350 - HORIZON}
          fill="url(#sand-grad)"
        />

        {/* Sand grain speckle — deterministic, denser and more visible */}
        <g opacity={0.55}>
          {Array.from({ length: 520 }).map((_, i) => {
            const rx = (Math.sin(i * 12.9898 + 1) * 43758.5453) % 1;
            const ry = (Math.sin(i * 78.233 + 2) * 43758.5453) % 1;
            const rz = (Math.sin(i * 39.425 + 3) * 43758.5453) % 1;
            const x = ((rx + 1) % 1) * 1080;
            const y = HORIZON + ((ry + 1) % 1) * (1350 - HORIZON);
            const r = 0.4 + (((rz + 1) % 1) * 1.4);
            const dark = ((rx + ry + rz + 3) % 1) < 0.5;
            return (
              <circle
                key={`g-${i}`}
                cx={x}
                cy={y}
                r={r}
                fill={dark ? "#7A5A2A" : "#EAD08A"}
              />
            );
          })}
        </g>

        {/* Horizon line */}
        <line
          x1={60}
          y1={HORIZON}
          x2={1020}
          y2={HORIZON}
          stroke={CHAR_DARK}
          strokeWidth={1.4}
          opacity={0.7}
        />
        <line
          x1={60}
          y1={HORIZON + 1.5}
          x2={1020}
          y2={HORIZON + 1.5}
          stroke={SAND}
          strokeWidth={0.5}
          opacity={0.6}
        />

        {/* Stenographer's depth rule (left margin) */}
        <g
          stroke={CHAR}
          strokeWidth={1}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={2.5}
          fontWeight={600}
          fill={CHAR}
        >
          {DEPTH_TICKS.map((t, i) => (
            <g key={`tick-${i}`}>
              <line
                x1={70}
                y1={t.y}
                x2={t.major ? 108 : 92}
                y2={t.y}
                opacity={0.85}
              />
              {t.label && (
                <text
                  x={118}
                  y={t.y + 3.5}
                  fill={CHAR_DARK}
                  stroke="none"
                  fontWeight={600}
                  opacity={0.95}
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}
        </g>

        {/* Right-side technical marks */}
        <g
          transform={`translate(1010, ${HORIZON})`}
          fill={TYPE_MUTED}
          stroke={TYPE_MUTED}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
        >
          <line x1={-42} y1={0} x2={-8} y2={0} strokeWidth={1} opacity={0.8} />
          <text x={-8} y={-10} textAnchor="end" opacity={1}>
            SURFACE
          </text>
        </g>

        {/* Lightning bolt */}
        {renderBoltStroke(MAIN_BOLT, 3, boltReveal, "main-bolt")}
        {BOLT_BRANCHES.map((b, i) =>
          renderBoltStroke(b.pts, b.width, branchBoltReveal(b), `bolt-b-${i}`),
        )}

        {/* Ground scorch — flatten radial burn */}
        <ellipse
          cx={STRIKE_X}
          cy={HORIZON + 2}
          rx={140}
          ry={14}
          fill={CHAR_DARK}
          opacity={Math.min(1, tubeReveal * 1.3) * 0.9}
        />
        <ellipse
          cx={STRIKE_X}
          cy={HORIZON + 2}
          rx={78}
          ry={8}
          fill="#12070A"
          opacity={Math.min(1, tubeReveal * 1.3) * 0.95}
        />

        {/* Radial scorch cracks */}
        <g stroke={CHAR_DARK} strokeWidth={0.9} fill="none" opacity={cracksReveal * 0.85}>
          {scorchCracks.map((c, i) => (
            <path key={`crack-${i}`} d={toPath(c)} strokeLinecap="round" />
          ))}
        </g>

        {/* Fulgurite tube — branches under main */}
        {TUBE_BRANCHES.map((b, i) =>
          renderTubeStroke(
            b.pts,
            b.width,
            branchTubeReveal(b),
            `tube-b-${i}`,
            b.taper,
          ),
        )}
        {renderTubeStroke(MAIN_TUBE, 10, tubeReveal, "main-tube", 1.6)}

        {/* Vitrified beads along the tube */}
        {TUBE_BEADS.map((b, i) => {
          const local = (revealRaw - b.delay) / 0.35;
          const op = Math.max(0, Math.min(1, local));
          const core = coolT < 0.6 ? MOLTEN_HOT : MOLTEN;
          return (
            <g key={`bead-${i}`} opacity={op}>
              <circle cx={b.x} cy={b.y} r={b.r + 3} fill={CHAR_DARK} opacity={0.85} />
              <circle cx={b.x} cy={b.y} r={b.r} fill={core} />
              <circle
                cx={b.x - b.r * 0.3}
                cy={b.y - b.r * 0.3}
                r={b.r * 0.28}
                fill="#FFF6D6"
                opacity={0.45 * (1 - coolT * 0.6)}
              />
            </g>
          );
        })}

        {/* Warm heat halo pooling at strike junction */}
        <circle
          cx={STRIKE_X}
          cy={HORIZON + 60}
          r={220}
          fill="url(#tube-hotspot)"
          opacity={Math.min(1, tubeReveal * 1.5) * (1 - coolT * 0.6)}
        />

        {/* Specimen callout — routed above the branch cloud */}
        <g
          opacity={Math.min(1, Math.max(0, tubeReveal - 0.45) * 2.5)}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
          fill={CHAR_DARK}
        >
          <line
            x1={STRIKE_X + 14}
            y1={HORIZON + 22}
            x2={870}
            y2={HORIZON + 22}
            stroke={CHAR_DARK}
            strokeWidth={1}
            opacity={0.7}
          />
          <line
            x1={870}
            y1={HORIZON + 22}
            x2={882}
            y2={HORIZON + 38}
            stroke={CHAR_DARK}
            strokeWidth={1}
            opacity={0.7}
          />
          <text x={886} y={HORIZON + 42} opacity={0.95}>
            SPEC. FG-08·03
          </text>
        </g>

        {/* Caption strip — moved just above type block */}
        <g
          transform={`translate(80, 1044)`}
          fill={CHAR_DARK}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
        >
          <text opacity={0.85}>
            FIG. 1 · FULGURITE IN SILICEOUS SAND · DISCHARGE ≈ 3 MS
          </text>
          <text
            x={920}
            textAnchor="end"
            fill={CHAR_DARK}
            opacity={0.85}
          >
            PEAK T ≈ 30 000 K
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1074,
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
            color: MOLTEN,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: TYPE_MUTED, margin: "0 4px" }}>/</span>
          <span style={{ color: INK_TYPE, letterSpacing: 5 }}>
            Stenographer
          </span>
        </div>

        <div
          style={{
            color: INK_TYPE,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 62,
            lineHeight: 0.98,
            letterSpacing: -1,
            fontStyle: "italic",
          }}
        >
          The lightning's
          <br />
          court reporter.
        </div>

        <div
          style={{
            marginTop: 14,
            color: "#D8CFB8",
            fontFamily: inter,
            fontSize: 16,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 820,
            opacity: hookOpacity,
          }}
        >
          A stroke briefly reaches{" "}
          <span style={{ color: MOLTEN, fontWeight: 600 }}>
            ≈ 30 000 K
          </span>
          {" "}— hotter than the Sun's surface — fusing silica along its path
          into a hollow glass tube: the bolt's verbatim transcript, filed
          underground.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 26,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: TYPE_MUTED,
          fontFamily: inter,
          fontSize: 10.5,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Uman · Lightning (1969) · Pasek &amp; Block · Geology (2009)</span>
        <span>
          <span style={{ color: MOLTEN }}>●</span> Molten silica core
        </span>
      </div>
    </AbsoluteFill>
  );
};
