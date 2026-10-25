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
const INK = "#0A0F1C";
const INK_SOFT = "#141A28";
const BOLT = "#BDE4FF";
const BOLT_HOT = "#FFFFFF";
const PLASMA = "#FF8EC3";
const SAND = "#C9985A";
const GLASS = "#F4D06F";
const GLASS_HOT = "#FFECA3";
const GRAY = "#8A8F99";

// ── Page layout (1080 × 1350 portrait) ───────────────────────────────
// Top metadata band: 56..110
// Hero frame        : 130..840 (h 710, w 960)
// Role tag          : ~900
// Title block       : ~925
// Hook              : ~1105
// Footer            : 1300
const FRAME = { x: 60, y: 130, w: 960, h: 710 };

// Central vertical axis of the bolt + fulgurite
const CX = 540;
// Horizon (sand surface) y, in page coords
const HORIZON = FRAME.y + 370; // = 500

type P = { x: number; y: number };

// Lightning bolt path — jagged descent from top to horizon.
const BOLT_PATH: P[] = [
  { x: CX, y: FRAME.y + 18 },
  { x: CX - 22, y: FRAME.y + 58 },
  { x: CX + 12, y: FRAME.y + 98 },
  { x: CX - 18, y: FRAME.y + 146 },
  { x: CX + 16, y: FRAME.y + 190 },
  { x: CX - 10, y: FRAME.y + 232 },
  { x: CX + 22, y: FRAME.y + 274 },
  { x: CX - 6, y: FRAME.y + 316 },
  { x: CX + 8, y: FRAME.y + 356 },
  { x: CX - 2, y: HORIZON },
];

const BOLT_BRANCHES: P[][] = [
  [
    { x: CX + 12, y: FRAME.y + 98 },
    { x: CX + 54, y: FRAME.y + 132 },
    { x: CX + 72, y: FRAME.y + 176 },
  ],
  [
    { x: CX - 18, y: FRAME.y + 146 },
    { x: CX - 68, y: FRAME.y + 172 },
    { x: CX - 94, y: FRAME.y + 218 },
  ],
  [
    { x: CX + 22, y: FRAME.y + 274 },
    { x: CX + 78, y: FRAME.y + 304 },
    { x: CX + 96, y: FRAME.y + 338 },
  ],
  [
    { x: CX - 10, y: FRAME.y + 232 },
    { x: CX - 44, y: FRAME.y + 256 },
  ],
];

// Fulgurite path — the glass negative-cast beneath the horizon.
const FULG_MAIN: P[] = [
  { x: CX - 2, y: HORIZON },
  { x: CX + 10, y: HORIZON + 36 },
  { x: CX - 8, y: HORIZON + 78 },
  { x: CX + 12, y: HORIZON + 122 },
  { x: CX - 4, y: HORIZON + 168 },
  { x: CX + 8, y: HORIZON + 214 },
  { x: CX - 2, y: HORIZON + 258 },
  { x: CX + 2, y: HORIZON + 300 },
  { x: CX, y: HORIZON + 332 },
];

const FULG_BRANCHES: P[][] = [
  [
    { x: CX + 12, y: HORIZON + 122 },
    { x: CX + 54, y: HORIZON + 158 },
    { x: CX + 74, y: HORIZON + 202 },
  ],
  [
    { x: CX - 4, y: HORIZON + 168 },
    { x: CX - 48, y: HORIZON + 206 },
    { x: CX - 62, y: HORIZON + 244 },
  ],
  [
    { x: CX + 8, y: HORIZON + 214 },
    { x: CX + 40, y: HORIZON + 248 },
  ],
];

const toPath = (pts: P[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

const pathLength = (pts: P[]): number => {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
};

const BOLT_LEN = pathLength(BOLT_PATH);
const FULG_LEN = pathLength(FULG_MAIN);

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bolt materialises (0.3s in, quick spring)
  const boltSpring = spring({
    frame: frame - 9,
    fps,
    config: { damping: 200, mass: 0.4 },
  });

  // Short white-pink flash around frame 15
  const flash = Math.max(0, 1 - Math.abs(frame - 15) / 8);

  // Fulgurite trunk grows after the flash
  const fulgT = interpolate(frame, [22, 78], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fulgOffset = FULG_LEN * (1 - fulgT);

  // Branches stagger in after main trunk passes them
  const branchT = (startFrame: number): number =>
    interpolate(frame, [startFrame, startFrame + 24], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // Pulse that re-illuminates the whole channel from top once settled
  const pulseCycle = (frame - 90) / (fps * 2.4);
  const pulseActive = frame > 90 ? Math.max(0, 1 - Math.abs(((pulseCycle % 1) * 2) - 1)) : 0;

  // Type animations
  const titleSpring = spring({
    frame: frame - fps * 0.9,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.6, fps * 2.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const annotationOpacity = interpolate(frame, [45, 70], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        <span style={{ color: BOLT }}>2026 · 10 · 25</span>
      </div>

      {/* Hero SVG */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#060912" />
            <stop offset="100%" stopColor={INK_SOFT} />
          </linearGradient>

          <linearGradient id="ground-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#120D08" />
            <stop offset="40%" stopColor="#0A0E17" />
            <stop offset="100%" stopColor={INK} />
          </linearGradient>

          <linearGradient id="horizon-band" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SAND} stopOpacity={0} />
            <stop offset="22%" stopColor={SAND} stopOpacity={0.55} />
            <stop offset="50%" stopColor={SAND} stopOpacity={0.85} />
            <stop offset="78%" stopColor={SAND} stopOpacity={0.55} />
            <stop offset="100%" stopColor={SAND} stopOpacity={0} />
          </linearGradient>

          <radialGradient id="horizon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BOLT} stopOpacity={0.35} />
            <stop offset="55%" stopColor={PLASMA} stopOpacity={0.15} />
            <stop offset="100%" stopColor={PLASMA} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="flash-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BOLT} stopOpacity={0.75} />
            <stop offset="60%" stopColor={PLASMA} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PLASMA} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="strike-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BOLT_HOT} stopOpacity={1} />
            <stop offset="25%" stopColor={PLASMA} stopOpacity={0.75} />
            <stop offset="100%" stopColor={PLASMA} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="bolt-ambient" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor={BOLT} stopOpacity={0.08} />
            <stop offset="100%" stopColor={BOLT} stopOpacity={0} />
          </radialGradient>

          <filter id="bolt-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>

          <filter id="glass-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        {/* Sky background within frame */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={HORIZON - FRAME.y}
          fill="url(#sky-grad)"
        />
        {/* Ambient halo from the bolt */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={HORIZON - FRAME.y}
          fill="url(#bolt-ambient)"
          opacity={0.9 * boltSpring}
        />
        {/* Ground background */}
        <rect
          x={FRAME.x}
          y={HORIZON}
          width={FRAME.w}
          height={FRAME.y + FRAME.h - HORIZON}
          fill="url(#ground-grad)"
        />

        {/* Persistent horizon glow (soft radiance from strike site) */}
        <ellipse
          cx={CX - 2}
          cy={HORIZON}
          rx={300}
          ry={14}
          fill="url(#horizon-glow)"
          opacity={boltSpring * 0.9}
        />

        {/* Horizon flash during strike (quick) */}
        <ellipse
          cx={CX - 2}
          cy={HORIZON}
          rx={420}
          ry={24}
          fill="url(#flash-grad)"
          opacity={flash * 0.9}
        />

        {/* Thin sand horizon band */}
        <rect
          x={FRAME.x}
          y={HORIZON - 1}
          width={FRAME.w}
          height={2}
          fill="url(#horizon-band)"
        />

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#20262F"
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
          <g key={i} stroke={BOLT} strokeWidth={1.2} fill="none" opacity={0.55}>
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Depth scale on the left (ground only) */}
        <g
          transform={`translate(${FRAME.x + 28}, ${HORIZON + 14})`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={2.4}
          fontWeight={500}
          opacity={0.6}
        >
          <line x1={0} y1={0} x2={0} y2={300} strokeWidth={1} />
          {[0, 100, 200, 300].map((d, i) => (
            <g key={i}>
              <line x1={-4} y1={d} x2={4} y2={d} strokeWidth={1} />
              <text x={10} y={d + 4} stroke="none">
                {i} M
              </text>
            </g>
          ))}
        </g>

        {/* ─── Lightning bolt ───────────────────────────────────────── */}
        <g opacity={boltSpring}>
          {/* Outer blue halo */}
          <path
            d={toPath(BOLT_PATH)}
            stroke={BOLT}
            strokeWidth={34}
            strokeOpacity={0.14 + pulseActive * 0.08}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
            filter="url(#bolt-glow)"
          />
          {/* Plasma pink rim (narrower so blue + white can breathe) */}
          <path
            d={toPath(BOLT_PATH)}
            stroke={PLASMA}
            strokeWidth={18}
            strokeOpacity={0.42 + pulseActive * 0.12}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
            filter="url(#bolt-glow)"
          />
          {/* Ice-blue mid */}
          <path
            d={toPath(BOLT_PATH)}
            stroke={BOLT}
            strokeWidth={9}
            strokeOpacity={0.95}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
          />
          {/* White-hot core */}
          <path
            d={toPath(BOLT_PATH)}
            stroke={BOLT_HOT}
            strokeWidth={4}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
          />
          {/* Branches */}
          {BOLT_BRANCHES.map((br, i) => (
            <g key={`b-${i}`}>
              <path
                d={toPath(br)}
                stroke={BOLT}
                strokeWidth={14}
                strokeOpacity={0.14}
                fill="none"
                strokeLinejoin="miter"
                strokeLinecap="round"
                filter="url(#bolt-glow)"
              />
              <path
                d={toPath(br)}
                stroke={PLASMA}
                strokeWidth={6}
                strokeOpacity={0.4}
                fill="none"
                strokeLinejoin="miter"
                strokeLinecap="round"
                filter="url(#bolt-glow)"
              />
              <path
                d={toPath(br)}
                stroke={BOLT}
                strokeWidth={3.5}
                strokeOpacity={0.9}
                fill="none"
                strokeLinejoin="miter"
                strokeLinecap="round"
              />
              <path
                d={toPath(br)}
                stroke={BOLT_HOT}
                strokeWidth={1.6}
                fill="none"
                strokeLinejoin="miter"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>

        {/* ─── Fulgurite (glass tube below) ────────────────────────── */}
        <g>
          {/* Outer amber halo */}
          <path
            d={toPath(FULG_MAIN)}
            stroke={GLASS}
            strokeWidth={26}
            strokeOpacity={0.18}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
            filter="url(#glass-glow)"
            strokeDasharray={FULG_LEN}
            strokeDashoffset={fulgOffset}
          />
          {/* Glass wall */}
          <path
            d={toPath(FULG_MAIN)}
            stroke={GLASS}
            strokeWidth={11}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
            strokeDasharray={FULG_LEN}
            strokeDashoffset={fulgOffset}
          />
          {/* Hollow bright centre */}
          <path
            d={toPath(FULG_MAIN)}
            stroke={GLASS_HOT}
            strokeWidth={4}
            strokeOpacity={0.98}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
            strokeDasharray={FULG_LEN}
            strokeDashoffset={fulgOffset}
          />
          {/* Branches */}
          {FULG_BRANCHES.map((br, i) => {
            const brLen = pathLength(br);
            const start = 40 + i * 8;
            const t = branchT(start);
            const off = brLen * (1 - t);
            return (
              <g key={`fb-${i}`}>
                <path
                  d={toPath(br)}
                  stroke={GLASS}
                  strokeWidth={12}
                  strokeOpacity={0.22}
                  fill="none"
                  strokeLinejoin="miter"
                  strokeLinecap="round"
                  filter="url(#glass-glow)"
                  strokeDasharray={brLen}
                  strokeDashoffset={off}
                />
                <path
                  d={toPath(br)}
                  stroke={GLASS}
                  strokeWidth={6}
                  fill="none"
                  strokeLinejoin="miter"
                  strokeLinecap="round"
                  strokeDasharray={brLen}
                  strokeDashoffset={off}
                />
                <path
                  d={toPath(br)}
                  stroke={GLASS_HOT}
                  strokeWidth={1.8}
                  strokeOpacity={0.85}
                  fill="none"
                  strokeLinejoin="miter"
                  strokeLinecap="round"
                  strokeDasharray={brLen}
                  strokeDashoffset={off}
                />
              </g>
            );
          })}
        </g>

        {/* Strike flash on top of everything at horizon */}
        <ellipse
          cx={CX - 2}
          cy={HORIZON}
          rx={95}
          ry={70}
          fill="url(#strike-grad)"
          opacity={flash}
        />

        {/* ─── Annotations (leader lines + labels) ─────────────────── */}
        <g opacity={annotationOpacity}>
          {/* Top: LIGHTNING CHANNEL */}
          <circle cx={CX + 4} cy={FRAME.y + 112} r={3} fill={BOLT_HOT} stroke={BOLT} strokeWidth={1} />
          <line
            x1={CX + 4}
            y1={FRAME.y + 112}
            x2={CX + 170}
            y2={FRAME.y + 112}
            stroke={BOLT}
            strokeWidth={1}
            strokeOpacity={0.75}
          />
          <line
            x1={CX + 170}
            y1={FRAME.y + 112}
            x2={CX + 230}
            y2={FRAME.y + 86}
            stroke={BOLT}
            strokeWidth={1}
            strokeOpacity={0.75}
          />
          <text
            x={CX + 232}
            y={FRAME.y + 82}
            fill={BOLT}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3}
          >
            LIGHTNING CHANNEL
          </text>
          <text
            x={CX + 232}
            y={FRAME.y + 102}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            fontWeight={400}
            letterSpacing={3}
          >
            ≈ 30,000 K
          </text>

          {/* Bottom: FULGURITE */}
          <circle cx={CX + 4} cy={HORIZON + 194} r={3} fill={GLASS_HOT} stroke={GLASS} strokeWidth={1} />
          <line
            x1={CX + 4}
            y1={HORIZON + 194}
            x2={CX + 170}
            y2={HORIZON + 194}
            stroke={GLASS}
            strokeWidth={1}
            strokeOpacity={0.8}
          />
          <line
            x1={CX + 170}
            y1={HORIZON + 194}
            x2={CX + 220}
            y2={HORIZON + 220}
            stroke={GLASS}
            strokeWidth={1}
            strokeOpacity={0.8}
          />
          <text
            x={CX + 222}
            y={HORIZON + 218}
            fill={GLASS}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3}
          >
            FULGURITE
          </text>
          <text
            x={CX + 222}
            y={HORIZON + 238}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            fontWeight={400}
            letterSpacing={3}
          >
            FUSED SiO₂ GLASS
          </text>
        </g>

        {/* Caption strip below the hero frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · GROUND-STRIKE CROSS-SECTION, SILICA SUBSTRATE</text>
          <text x={FRAME.w} textAnchor="end" fill={GLASS} opacity={0.85}>
            NEG. CAST OF A BOLT, IN GLASS
          </text>
        </g>
      </svg>

      {/* ─── Type lockup ────────────────────────────────────────────── */}
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
            color: BOLT,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Glassblower</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 90,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The sky's
          <br />
          glassblower.
        </div>

        <div
          style={{
            marginTop: 32,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A single stroke of{" "}
          <span style={{ color: BOLT, fontWeight: 600 }}>lightning</span> heats
          its channel to roughly 30,000 K — five times the Sun's surface — and
          fuses the sand along its path into a hollow, branching tube of glass
          called a{" "}
          <span style={{ color: GLASS, fontWeight: 600 }}>fulgurite</span>: the
          bolt's own geometry, preserved underground.
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
        <span>Uman · "The Lightning Discharge" (1987)</span>
        <span>
          <span style={{ color: GLASS }}>●</span> Lechatelierite / amorphous SiO₂
        </span>
      </div>
    </AbsoluteFill>
  );
};
