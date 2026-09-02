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

// Palette — from the concept brief
const OCEAN = "#0B1B29";        // deep Pacific ground
const OCEAN_DEEP = "#07131D";   // vignette pit
const RUFOUS = "#C25A34";       // godwit breeding rust
const RUFOUS_HI = "#E27346";    // highlight rust
const BUFF = "#E9C48A";         // buff feather / warm mid
const CREAM = "#F5EEDF";        // paper / type primary
const SPRAY = "#6B7B87";        // cool secondary
const GRID = "#132738";         // faint gridline
const GRID_MAJOR = "#1B3448";   // stronger gridline

// ── Chart layout (inside a 960×760 chart plane) ─────────────────────────
// (0,0) top-left of the chart. The great-circle arc runs from Alaska
// (upper right) to Tasmania (lower left) — abstracted, not literal.
const CHART_W = 960;
const CHART_H = 760;

const START = { x: 830, y: 90, label: "ALASKA" };   // Yukon-Kuskokwim Delta
const END = { x: 170, y: 660, label: "TASMANIA" };  // Ansons Bay

// Great-circle style curve — a smooth cubic bezier bowing to the SE
// (out over the central Pacific) between start and finish.
const ARC_C1 = { x: 830, y: 470 };
const ARC_C2 = { x: 400, y: 720 };

const arcPath = `M ${START.x} ${START.y} C ${ARC_C1.x} ${ARC_C1.y}, ${ARC_C2.x} ${ARC_C2.y}, ${END.x} ${END.y}`;

// Sample a point along the arc at parameter u∈[0,1] (cubic Bezier).
const arcPoint = (u: number) => {
  const mu = 1 - u;
  const x =
    mu * mu * mu * START.x +
    3 * mu * mu * u * ARC_C1.x +
    3 * mu * u * u * ARC_C2.x +
    u * u * u * END.x;
  const y =
    mu * mu * mu * START.y +
    3 * mu * mu * u * ARC_C1.y +
    3 * mu * u * u * ARC_C2.y +
    u * u * u * END.y;
  return { x, y };
};

// Tangent angle (deg) at u — for orienting the flying bird.
const arcTangentDeg = (u: number) => {
  const mu = 1 - u;
  const dx =
    3 * mu * mu * (ARC_C1.x - START.x) +
    6 * mu * u * (ARC_C2.x - ARC_C1.x) +
    3 * u * u * (END.x - ARC_C2.x);
  const dy =
    3 * mu * mu * (ARC_C1.y - START.y) +
    6 * mu * u * (ARC_C2.y - ARC_C1.y) +
    3 * u * u * (END.y - ARC_C2.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};

// Split-time ticks along the arc — race splits at Day 3, 6, 9, and the
// 13,560-km finish. Positioned by parameter u, since the arc is
// close enough to constant-speed for this abstract chart.
const SPLITS: { u: number; day: string; km: string }[] = [
  { u: 0.24, day: "DAY 3", km: "3,700 KM" },
  { u: 0.5, day: "DAY 6", km: "7,400 KM" },
  { u: 0.75, day: "DAY 9", km: "11,000 KM" },
];

// Coastline hints — thin arcs, not hexagon blobs. Read as "shore."
// Alaska curves into the upper-right corner. Tasmania curves out of the
// lower-left. Both stay well outside the type block and split-time labels.
const ALASKA_COAST =
  "M 960 40 C 900 40, 855 60, 830 95 C 810 125, 810 160, 830 195";
const TASMANIA_COAST =
  "M 0 620 C 60 620, 110 640, 145 675 C 175 705, 195 745, 205 760";

// Bird silhouette — swept-wing shorebird gliding to the right.
// A slim body + two swept-back wings + long bill. Path units ≈ 60×22.
const BIRD_PATH =
  // body
  "M -6 0 C -3 -2, 8 -2, 14 -1 L 22 -0.7 L 24 0 L 22 0.7 L 14 1 " +
  "C 8 2, -3 2, -6 0 Z " +
  // upper wing — swept back and up
  "M -4 -1 C -14 -7, -26 -10, -34 -6 " +
  "C -24 -4, -14 -3, -4 -1 Z " +
  // lower wing — swept back and down
  "M -4 1 C -14 7, -26 10, -34 6 " +
  "C -24 4, -14 3, -4 1 Z";

// Small compass rose glyph
const CompassN: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <circle cx={0} cy={0} r={14} fill="none" stroke={SPRAY} strokeWidth={1} />
    <polygon points="0,-14 3,0 0,4 -3,0" fill={RUFOUS} />
    <polygon points="0,14 3,0 0,-4 -3,0" fill={SPRAY} opacity={0.7} />
    <text
      x={0}
      y={-20}
      textAnchor="middle"
      fill={SPRAY}
      fontFamily={inter}
      fontSize={10}
      letterSpacing={2}
      fontWeight={600}
    >
      N
    </text>
  </g>
);

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ──────────────────────────────────────────────────────────
  const drawStart = fps * 0.4;
  const drawEnd = fps * 3.0;      // ~2.6s draw
  const drawT = interpolate(frame, [drawStart, drawEnd], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // After drawing, the bird settles at the finish (subtle drift).
  const settled = drawT >= 1;
  const settleDrift = settled
    ? Math.sin((frame - drawEnd) * 0.06) * 0.6
    : 0;

  const titleSpring = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Approximate arc length — used for the drawing-in stroke-dash trick.
  // (A ~360px sample sum is fine here — we only need consistent units.)
  const ARC_LEN = React.useMemo(() => {
    let len = 0;
    let prev = arcPoint(0);
    const steps = 200;
    for (let i = 1; i <= steps; i++) {
      const p = arcPoint(i / steps);
      len += Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = p;
    }
    return len;
  }, []);
  const dashOffset = ARC_LEN * (1 - drawT);

  // Bird position — rides the head of the drawn arc, then rests at finish.
  const birdU = drawT;
  const birdP = arcPoint(birdU);
  const birdAngle = arcTangentDeg(birdU);

  // ── Page layout (1080×1350 portrait) ────────────────────────────────
  // Top metadata band  : 0..110
  // Chart plate        : 60..900  (h 780; the chart at ~960×760 inside)
  // Type lockup        : 940..
  // Footer             : bottom 50
  const PLATE = { x: 60, y: 130, w: 960, h: 760 };

  // Split ticks appear as the arc-draw passes them.
  const splitAlpha = (u: number) =>
    interpolate(drawT, [u - 0.02, u + 0.14], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // Finish flare intensifies once the arc completes.
  const finishFlare = interpolate(drawT, [0.9, 1.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: OCEAN, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band — flush to a 80-unit margin grid */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: SPRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: RUFOUS_HI }}>2026 · 09 · 02</span>
      </div>

      {/* Chart plate */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="plate-vignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#122534" stopOpacity={1} />
            <stop offset="100%" stopColor={OCEAN_DEEP} stopOpacity={1} />
          </radialGradient>

          <pattern
            id="lat-lines"
            x={PLATE.x}
            y={PLATE.y}
            width={PLATE.w}
            height={95}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1={0}
              y1={0}
              x2={PLATE.w}
              y2={0}
              stroke={GRID}
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          </pattern>

          <pattern
            id="lon-lines"
            x={PLATE.x}
            y={PLATE.y}
            width={120}
            height={PLATE.h}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={PLATE.h}
              stroke={GRID}
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          </pattern>

          <filter id="arc-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="finish-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RUFOUS_HI} stopOpacity={0.9} />
            <stop offset="100%" stopColor={RUFOUS} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="start-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BUFF} stopOpacity={0.7} />
            <stop offset="100%" stopColor={BUFF} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Plate background */}
        <rect
          x={PLATE.x}
          y={PLATE.y}
          width={PLATE.w}
          height={PLATE.h}
          fill="url(#plate-vignette)"
        />
        <rect
          x={PLATE.x}
          y={PLATE.y}
          width={PLATE.w}
          height={PLATE.h}
          fill="url(#lat-lines)"
        />
        <rect
          x={PLATE.x}
          y={PLATE.y}
          width={PLATE.w}
          height={PLATE.h}
          fill="url(#lon-lines)"
        />

        {/* Equator emphasis */}
        <line
          x1={PLATE.x}
          y1={PLATE.y + PLATE.h * 0.5}
          x2={PLATE.x + PLATE.w}
          y2={PLATE.y + PLATE.h * 0.5}
          stroke={GRID_MAJOR}
          strokeWidth={1}
        />
        <text
          x={PLATE.x + 14}
          y={PLATE.y + PLATE.h * 0.5 - 8}
          fill={SPRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
          opacity={0.75}
        >
          EQUATOR
        </text>

        {/* Plate border */}
        <rect
          x={PLATE.x + 0.5}
          y={PLATE.y + 0.5}
          width={PLATE.w - 1}
          height={PLATE.h - 1}
          fill="none"
          stroke="#1E3A50"
          strokeWidth={1}
        />

        {/* Corner ticks — race-chart brackets */}
        {(
          [
            [PLATE.x, PLATE.y, 1, 1],
            [PLATE.x + PLATE.w, PLATE.y, -1, 1],
            [PLATE.x, PLATE.y + PLATE.h, 1, -1],
            [PLATE.x + PLATE.w, PLATE.y + PLATE.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={RUFOUS} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Compass — top-left of plate */}
        <g transform={`translate(${PLATE.x + 44}, ${PLATE.y + 52})`}>
          <CompassN x={0} y={0} />
        </g>

        {/* Chart-local coordinate system */}
        <g transform={`translate(${PLATE.x}, ${PLATE.y})`}>
          {/* Coastline hints — thin arcs at the extreme corners */}
          <path
            d={ALASKA_COAST}
            fill="none"
            stroke={SPRAY}
            strokeWidth={1.2}
            strokeOpacity={0.55}
          />
          <path
            d={TASMANIA_COAST}
            fill="none"
            stroke={SPRAY}
            strokeWidth={1.2}
            strokeOpacity={0.55}
          />
          {/* Continent labels — set into the shore, away from arc & type */}
          <text
            x={905}
            y={80}
            textAnchor="end"
            fill={SPRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.5}
            fontWeight={600}
          >
            ALASKA
          </text>
          <text
            x={40}
            y={745}
            textAnchor="start"
            fill={SPRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.5}
            fontWeight={600}
          >
            TASMANIA
          </text>

          {/* Ghost arc — full path at low opacity so composition reads before draw */}
          <path
            d={arcPath}
            fill="none"
            stroke={SPRAY}
            strokeOpacity={0.16}
            strokeWidth={1.2}
            strokeDasharray="3 8"
          />

          {/* Arc — glow underlay */}
          <path
            d={arcPath}
            fill="none"
            stroke={RUFOUS}
            strokeOpacity={0.35}
            strokeWidth={9}
            strokeLinecap="round"
            filter="url(#arc-glow)"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={dashOffset}
          />
          {/* Arc — core */}
          <path
            d={arcPath}
            fill="none"
            stroke={RUFOUS_HI}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={dashOffset}
          />
          {/* Arc — bright highlight thread */}
          <path
            d={arcPath}
            fill="none"
            stroke={CREAM}
            strokeOpacity={0.75}
            strokeWidth={1}
            strokeLinecap="round"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={dashOffset}
          />

          {/* Split-time markers — labels pushed to the CONCAVE side
              (NW of arc, into open ocean) so they never crowd the bird
              or the finish, and align on a common vertical band. */}
          {SPLITS.map((s) => {
            const p = arcPoint(s.u);
            const a = splitAlpha(s.u);
            const tang = arcTangentDeg(s.u);
            // Perpendicular pointing to the concave side (NW / upper-left)
            let nx = Math.sin((tang * Math.PI) / 180);
            let ny = -Math.cos((tang * Math.PI) / 180);
            // Force NW half — flip if the perpendicular points SE.
            if (nx > 0 || ny > 0) {
              nx = -nx;
              ny = -ny;
            }
            const off = 44;
            const lx = p.x + nx * off;
            const ly = p.y + ny * off;
            return (
              <g key={s.day} opacity={a}>
                {/* Short leader line from arc into label */}
                <line
                  x1={p.x + nx * 8}
                  y1={p.y + ny * 8}
                  x2={p.x + nx * 30}
                  y2={p.y + ny * 30}
                  stroke={CREAM}
                  strokeWidth={1}
                  strokeOpacity={0.55}
                />
                {/* Tick across the arc */}
                <line
                  x1={p.x - ny * 6}
                  y1={p.y + nx * 6}
                  x2={p.x + ny * 6}
                  y2={p.y - nx * 6}
                  stroke={CREAM}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={p.x} cy={p.y} r={2.6} fill={CREAM} />
                <text
                  x={lx}
                  y={ly - 2}
                  textAnchor="middle"
                  fill={CREAM}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={600}
                  letterSpacing={2.6}
                >
                  {s.day}
                </text>
                <text
                  x={lx}
                  y={ly + 14}
                  textAnchor="middle"
                  fill={SPRAY}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={500}
                  letterSpacing={2}
                >
                  {s.km}
                </text>
              </g>
            );
          })}

          {/* Start marker — label pushed UP-LEFT into empty ocean space,
              well clear of the Alaska coastline and continent label. */}
          <g>
            <circle
              cx={START.x}
              cy={START.y}
              r={18}
              fill="url(#start-glow)"
            />
            <circle
              cx={START.x}
              cy={START.y}
              r={6}
              fill={BUFF}
              stroke={OCEAN}
              strokeWidth={2}
            />
            <line
              x1={START.x - 4}
              y1={START.y - 4}
              x2={START.x - 34}
              y2={START.y - 34}
              stroke={BUFF}
              strokeOpacity={0.5}
              strokeWidth={1}
            />
            <text
              x={START.x - 36}
              y={START.y - 42}
              textAnchor="end"
              fill={BUFF}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={2.6}
            >
              START · OCT 13
            </text>
          </g>

          {/* Finish marker — label pushed DOWN-RIGHT into open ocean below
              the arc, well clear of the Tasmania coastline and bird. */}
          <g>
            <circle
              cx={END.x}
              cy={END.y}
              r={22 + finishFlare * 6}
              fill="url(#finish-glow)"
            />
            <circle
              cx={END.x}
              cy={END.y}
              r={7}
              fill={RUFOUS_HI}
              stroke={OCEAN}
              strokeWidth={2}
            />
            <line
              x1={END.x + 4}
              y1={END.y + 4}
              x2={END.x + 30}
              y2={END.y + 30}
              stroke={RUFOUS_HI}
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={END.x + 32}
              y={END.y + 42}
              textAnchor="start"
              fill={RUFOUS_HI}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={2.6}
            >
              FINISH · OCT 24
            </text>
          </g>

          {/* Bird — glides at the head of the drawn arc, scaled up so
              the silhouette reads at social-post size. */}
          <g
            transform={`translate(${birdP.x}, ${
              birdP.y + settleDrift
            }) rotate(${birdAngle}) scale(2.1)`}
          >
            {/* Soft under-glow */}
            <ellipse
              cx={-2}
              cy={0}
              rx={22}
              ry={5}
              fill={CREAM}
              opacity={0.12}
            />
            <path
              d={BIRD_PATH}
              fill={CREAM}
              stroke={RUFOUS}
              strokeWidth={0.4}
            />
            {/* Rufous shoulder chevron — nod to breeding plumage */}
            <path
              d="M -4 -1 C -12 -5, -20 -6, -26 -4 C -18 -3, -10 -2, -4 -1 Z"
              fill={RUFOUS}
              opacity={0.55}
            />
            <path
              d="M -4 1 C -12 5, -20 6, -26 4 C -18 3, -10 2, -4 1 Z"
              fill={RUFOUS}
              opacity={0.55}
            />
            <circle cx={21} cy={0} r={1.1} fill={OCEAN} />
          </g>
        </g>

        {/* Caption strip beneath plate */}
        <g
          transform={`translate(${PLATE.x}, ${PLATE.y + PLATE.h + 22})`}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text fill={SPRAY}>
            FIG. 1 · SATELLITE-TRACKED FLIGHT OF GODWIT “B6”, OCT 2022
          </text>
          <text x={PLATE.w} textAnchor="end" fill={RUFOUS_HI} opacity={0.9}>
            13,560 KM · 224 H · 0 STOPS
          </text>
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 950,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [16, 0]
          )}px)`,
        }}
      >
        <div
          style={{
            color: RUFOUS_HI,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: SPRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>Ultramarathoner</span>
        </div>

        <div
          style={{
            color: CREAM,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The 224-hour
          <br />
          athlete.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#D8D3C6",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          In Oct 2022 a satellite-tagged juvenile{" "}
          <span style={{ color: RUFOUS_HI, fontWeight: 600 }}>
            bar-tailed godwit
          </span>{" "}
          flew 13,560 km from Alaska to Tasmania — 11 days, 1 hour, no food, no
          water, no landing. The longest non-stop flight ever recorded for any
          bird.
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
          color: SPRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Global Flyway Network · Guinness World Records, 2022</span>
        <span>
          <span style={{ color: RUFOUS_HI }}>●</span> Godwit “B6”
        </span>
      </div>
    </AbsoluteFill>
  );
};
