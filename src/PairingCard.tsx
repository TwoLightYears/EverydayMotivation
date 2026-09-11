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

// Palette — night sky observatory (from the concept's visual brief)
const INK = "#080B18";
const STAR = "#F2E1B8";
const STAR_DIM = "#C7B98C";
const MW_VIOLET = "#7C6EE0";
const MW_PALE = "#A8A0EE";
const BRONZE = "#B0821F";
const BRONZE_HI = "#E4B04A";
const GREY = "#5A6B8C";
const GREY_HI = "#8391AB";
const GRID = "#141826";

// ── Layout in a 1080×1350 canvas ────────────────────────────────────────
// Top plate (sky)       : 130..870   (h 740)
// Type block            : 928..
// Footer                : 1290..
const PLATE = { x: 60, y: 130, w: 960, h: 740 };
// Horizon inside plate (y measured from plate top)
const HORIZON_Y = PLATE.y + 590;

// ── Deterministic pseudo-random for star fields ─────────────────────────
const hashN = (seed: number, salt = 0): number => {
  let h = (seed * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15;
  h = (h * 2246822519) >>> 0;
  h ^= h >>> 13;
  h = (h * 3266489917) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
};

// ── Star field ──────────────────────────────────────────────────────────
type Star = {
  x: number;
  y: number;
  r: number;
  color: string;
  seed: number;
  isBright: boolean;
};

const STARS: Star[] = (() => {
  const arr: Star[] = [];
  const N = 240;
  for (let i = 0; i < N; i++) {
    const x = PLATE.x + hashN(i, 1) * PLATE.w;
    const yNorm = hashN(i, 2);
    // Bias so more stars sit near the galactic band (upper portion, arc)
    const y =
      PLATE.y + Math.pow(yNorm, 1.15) * (HORIZON_Y - PLATE.y - 12);
    const bright = hashN(i, 3) > 0.985;
    const r = bright
      ? 1.8 + hashN(i, 4) * 1.4
      : 0.4 + Math.pow(hashN(i, 5), 2.2) * 1.3;
    const col =
      hashN(i, 6) > 0.4
        ? STAR
        : hashN(i, 7) > 0.5
        ? STAR_DIM
        : MW_PALE;
    arr.push({ x, y, r, color: col, seed: i, isBright: bright });
  }
  return arr;
})();

// A handful of named "landmark" bright stars — small caps labels
const NAMED_STARS: {
  x: number;
  y: number;
  label: string;
  side: "left" | "right";
}[] = [
  { x: PLATE.x + 180, y: PLATE.y + 120, label: "α CAR", side: "right" },
  { x: PLATE.x + 500, y: PLATE.y + 60, label: "β CEN", side: "right" },
  { x: PLATE.x + 300, y: PLATE.y + 380, label: "SIRIUS", side: "right" },
  { x: PLATE.x + 780, y: PLATE.y + 470, label: "ACRUX", side: "left" },
];

// ── Milky Way band: define its centerline as a shallow arc across plate.
// We express it as a smooth quadratic curve; dust lane offset in y.
const MW = {
  x1: PLATE.x - 40,
  y1: PLATE.y + 470,
  cx: PLATE.x + PLATE.w / 2,
  cy: PLATE.y + 120,
  x2: PLATE.x + PLATE.w + 40,
  y2: PLATE.y + 380,
};

// Sample a point (t in [0,1]) along the Milky Way's quadratic Bezier
const mwPoint = (t: number): { x: number; y: number; angle: number } => {
  const it = 1 - t;
  const x = it * it * MW.x1 + 2 * it * t * MW.cx + t * t * MW.x2;
  const y = it * it * MW.y1 + 2 * it * t * MW.cy + t * t * MW.y2;
  // Derivative gives tangent
  const dx = 2 * it * (MW.cx - MW.x1) + 2 * t * (MW.x2 - MW.cx);
  const dy = 2 * it * (MW.cy - MW.y1) + 2 * t * (MW.y2 - MW.cy);
  return { x, y, angle: Math.atan2(dy, dx) };
};

// The beetle's straight-line trajectory on the ground plane:
// starts at the "dung pile" (bottom-left inside the plate) and heads
// toward the galactic bearing on the horizon.
const TRAJECTORY = {
  x0: PLATE.x + 130,
  y0: HORIZON_Y + 96,
  x1: PLATE.x + PLATE.w - 240,
  y1: HORIZON_Y + 18,
};

// Compass rose center — the "bearing wheel" hovering above horizon
const ROSE = { cx: PLATE.x + PLATE.w - 170, cy: PLATE.y + 220, r: 88 };

// ── Beetle drawing (simple silhouette in relative coords, ~64px wide) ──
const Beetle: React.FC<{ x: number; y: number; heading: number }> = ({
  x,
  y,
  heading,
}) => {
  return (
    <g transform={`translate(${x} ${y}) rotate(${(heading * 180) / Math.PI})`}>
      {/* dung ball being rolled — leads the beetle */}
      <g transform="translate(30 -1)">
        <circle r={16} fill="#2A2318" stroke={BRONZE} strokeWidth={0.8} />
        <circle r={16} fill="url(#ball-shade)" opacity={0.9} />
        <circle
          cx={-4}
          cy={-5}
          r={5}
          fill={BRONZE_HI}
          opacity={0.32}
        />
      </g>
      {/* legs (thin lines) — six of them */}
      {[-1, 0, 1].map((k) => (
        <g key={k} stroke="#050403" strokeWidth={1.6} strokeLinecap="round">
          <line x1={-4 + k * 6} y1={0} x2={-11 + k * 6} y2={8 + k * 1.5} />
          <line x1={-4 + k * 6} y1={0} x2={-2 + k * 6} y2={9 + k * 1.2} />
        </g>
      ))}
      {/* body — dark carapace with bronze rim */}
      <ellipse
        cx={0}
        cy={0}
        rx={16}
        ry={9}
        fill="#0F0D08"
        stroke={BRONZE_HI}
        strokeWidth={1.4}
      />
      <ellipse
        cx={-3}
        cy={-3}
        rx={9}
        ry={4}
        fill={BRONZE_HI}
        opacity={0.4}
      />
      {/* head */}
      <ellipse
        cx={12}
        cy={0}
        rx={5.6}
        ry={4.6}
        fill="#0F0D08"
        stroke={BRONZE_HI}
        strokeWidth={1.1}
      />
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Grow the trajectory dashed line from origin to endpoint
  const trajT = interpolate(frame, [fps * 0.4, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Compass rose settling from a slight offset to true bearing
  const roseSettle = spring({
    frame: frame - fps * 0.2,
    fps,
    config: { damping: 22, mass: 1.1, stiffness: 90 },
  });

  // Milky Way dust-lane pulse — a soft moving highlight along the band
  const pulseProgress = ((frame % (fps * 6)) / (fps * 6));

  // Twinkle: subtle brightness modulation on selected bright stars
  const twinkle = (seed: number): number => {
    const phase = hashN(seed, 11) * Math.PI * 2;
    return 0.75 + 0.25 * Math.sin((frame / fps) * 1.8 + phase);
  };

  // Type in on the title / hook
  const titleSpring = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Beetle position along trajectory (leads the drawn dash slightly)
  const beetleT = Math.max(0, Math.min(1, trajT));
  const bx = TRAJECTORY.x0 + (TRAJECTORY.x1 - TRAJECTORY.x0) * beetleT;
  const by = TRAJECTORY.y0 + (TRAJECTORY.y1 - TRAJECTORY.y0) * beetleT;
  const heading = Math.atan2(
    TRAJECTORY.y1 - TRAJECTORY.y0,
    TRAJECTORY.x1 - TRAJECTORY.x0,
  );

  // Trajectory dash length
  const trajLen = Math.hypot(
    TRAJECTORY.x1 - TRAJECTORY.x0,
    TRAJECTORY.y1 - TRAJECTORY.y0,
  );

  // Compass rose bearing (0° = North, positive = clockwise / East).
  // The beetle's trajectory rises to the upper right — 037° from N.
  // The arrow settles from a slight westerly offset onto that bearing.
  const bearingDeg = interpolate(roseSettle, [0, 1], [8, 37]);

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
          color: GREY_HI,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: BRONZE_HI }}>2026 · 09 · 11</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky vignette */}
          <radialGradient id="sky-vignette" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#0E1224" stopOpacity={1} />
            <stop offset="65%" stopColor="#090C1A" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Milky Way glow around its band */}
          <linearGradient id="mw-core" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={MW_VIOLET} stopOpacity={0} />
            <stop offset="45%" stopColor={MW_VIOLET} stopOpacity={0.85} />
            <stop offset="55%" stopColor={MW_PALE} stopOpacity={0.9} />
            <stop offset="100%" stopColor={MW_VIOLET} stopOpacity={0} />
          </linearGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="soft-glow-2" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="star-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.6" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="ball-shade" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#5A4620" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#1A1408" stopOpacity={0.9} />
          </radialGradient>

          {/* Plotting grid pattern (very faint) */}
          <pattern
            id="plot-grid"
            x={PLATE.x}
            y={PLATE.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>

          {/* Clip star field to the plate */}
          <clipPath id="plate-clip">
            <rect
              x={PLATE.x}
              y={PLATE.y}
              width={PLATE.w}
              height={PLATE.h}
            />
          </clipPath>
        </defs>

        {/* Plate background — the sky panel */}
        <rect
          x={PLATE.x}
          y={PLATE.y}
          width={PLATE.w}
          height={PLATE.h}
          fill="url(#sky-vignette)"
        />
        <rect
          x={PLATE.x}
          y={PLATE.y}
          width={PLATE.w}
          height={PLATE.h}
          fill="url(#plot-grid)"
          opacity={0.5}
        />

        {/* Plate content, clipped */}
        <g clipPath="url(#plate-clip)">
          {/* ── Milky Way band ──────────────────────────────────────── */}
          {/* Wide diffuse halo */}
          <path
            d={`M ${MW.x1} ${MW.y1} Q ${MW.cx} ${MW.cy} ${MW.x2} ${MW.y2}`}
            stroke={MW_VIOLET}
            strokeOpacity={0.22}
            strokeWidth={170}
            fill="none"
            filter="url(#soft-glow-2)"
          />
          {/* Mid halo */}
          <path
            d={`M ${MW.x1} ${MW.y1} Q ${MW.cx} ${MW.cy} ${MW.x2} ${MW.y2}`}
            stroke={MW_VIOLET}
            strokeOpacity={0.5}
            strokeWidth={90}
            fill="none"
            filter="url(#soft-glow)"
          />
          {/* Bright core */}
          <path
            d={`M ${MW.x1} ${MW.y1} Q ${MW.cx} ${MW.cy} ${MW.x2} ${MW.y2}`}
            stroke={MW_PALE}
            strokeOpacity={0.55}
            strokeWidth={22}
            fill="none"
            filter="url(#soft-glow)"
          />
          {/* Dust lane — a darker inner ribbon offset slightly */}
          <path
            d={`M ${MW.x1} ${MW.y1 + 5} Q ${MW.cx} ${MW.cy + 5} ${MW.x2} ${
              MW.y2 + 5
            }`}
            stroke={INK}
            strokeOpacity={0.5}
            strokeWidth={5}
            fill="none"
          />

          {/* Pulse migrating along the dust lane */}
          {(() => {
            const p = mwPoint(pulseProgress);
            return (
              <g opacity={0.9}>
                <circle
                  cx={p.x}
                  cy={p.y + 6}
                  r={38}
                  fill={MW_PALE}
                  opacity={0.16}
                  filter="url(#soft-glow)"
                />
                <circle
                  cx={p.x}
                  cy={p.y + 6}
                  r={11}
                  fill={STAR}
                  opacity={0.85}
                  filter="url(#star-glow)"
                />
              </g>
            );
          })()}

          {/* ── Star field ─────────────────────────────────────────── */}
          {STARS.map((s) => {
            const tw = s.isBright ? twinkle(s.seed) : 1;
            return (
              <circle
                key={s.seed}
                cx={s.x}
                cy={s.y}
                r={s.r * (s.isBright ? tw : 1)}
                fill={s.color}
                opacity={s.isBright ? 0.95 : 0.75}
                filter={s.isBright ? "url(#star-glow)" : undefined}
              />
            );
          })}

          {/* Named landmark stars with hairline labels */}
          {NAMED_STARS.map((n) => {
            const dir = n.side === "right" ? 1 : -1;
            return (
              <g key={n.label}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={2.6}
                  fill={STAR}
                  filter="url(#star-glow)"
                />
                <line
                  x1={n.x + dir * 6}
                  y1={n.y}
                  x2={n.x + dir * 22}
                  y2={n.y}
                  stroke={GREY}
                  strokeWidth={0.7}
                />
                <text
                  x={n.x + dir * 26}
                  y={n.y + 3.5}
                  textAnchor={n.side === "right" ? "start" : "end"}
                  fill={GREY_HI}
                  fontFamily={inter}
                  fontSize={9.5}
                  letterSpacing={2.2}
                  fontWeight={500}
                >
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* ── Horizon line ───────────────────────────────────────── */}
          <line
            x1={PLATE.x + 6}
            y1={HORIZON_Y}
            x2={PLATE.x + PLATE.w - 6}
            y2={HORIZON_Y}
            stroke={GREY}
            strokeWidth={0.8}
            strokeDasharray="1 4"
          />
          <text
            x={PLATE.x + 20}
            y={HORIZON_Y - 10}
            textAnchor="start"
            fill={GREY_HI}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={500}
          >
            HORIZON · KALAHARI, 22°S
          </text>

          {/* Ground plane — subtle darker wash */}
          <rect
            x={PLATE.x}
            y={HORIZON_Y}
            width={PLATE.w}
            height={PLATE.h - (HORIZON_Y - PLATE.y)}
            fill="#050710"
            opacity={0.65}
          />
          {/* Sand grain texture — sparse dots */}
          {Array.from({ length: 90 }).map((_, i) => {
            const x = PLATE.x + hashN(i, 30) * PLATE.w;
            const y =
              HORIZON_Y + 6 + hashN(i, 31) * (PLATE.h - (HORIZON_Y - PLATE.y) - 10);
            return (
              <circle
                key={`sand-${i}`}
                cx={x}
                cy={y}
                r={0.6 + hashN(i, 32) * 0.9}
                fill={GREY}
                opacity={0.35}
              />
            );
          })}

          {/* Dung pile at trajectory origin */}
          <g>
            <ellipse
              cx={TRAJECTORY.x0 - 6}
              cy={TRAJECTORY.y0 + 4}
              rx={22}
              ry={5}
              fill="#0B0906"
              opacity={0.9}
            />
            <ellipse
              cx={TRAJECTORY.x0 - 8}
              cy={TRAJECTORY.y0}
              rx={14}
              ry={5}
              fill="#1A1610"
            />
            <ellipse
              cx={TRAJECTORY.x0 - 12}
              cy={TRAJECTORY.y0 - 3}
              rx={7}
              ry={3.5}
              fill="#241E14"
            />
            <text
              x={TRAJECTORY.x0 - 30}
              y={TRAJECTORY.y0 + 22}
              fill={GREY_HI}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.5}
              fontWeight={500}
            >
              ORIGIN
            </text>
          </g>

          {/* Straight-line trajectory — dashed, growing */}
          <line
            x1={TRAJECTORY.x0}
            y1={TRAJECTORY.y0}
            x2={TRAJECTORY.x1}
            y2={TRAJECTORY.y1}
            stroke={BRONZE_HI}
            strokeWidth={1.8}
            strokeDasharray="6 6"
            strokeDashoffset={trajLen * (1 - trajT)}
            style={{ transition: "none" }}
          />
          {/* Faint straight-line guide showing target bearing */}
          <line
            x1={TRAJECTORY.x0}
            y1={TRAJECTORY.y0}
            x2={TRAJECTORY.x1}
            y2={TRAJECTORY.y1}
            stroke={BRONZE}
            strokeWidth={0.6}
            strokeOpacity={0.35}
          />

          {/* Guide arc: dial ↔ trajectory — visualizes the hook */}
          {trajT > 0.7 && (() => {
            const op = Math.min(1, (trajT - 0.7) * 3) * 0.5;
            const startX = ROSE.cx;
            const startY = ROSE.cy + ROSE.r + 6;
            const endX = TRAJECTORY.x1;
            const endY = TRAJECTORY.y1;
            const midX = (startX + endX) / 2 + 40;
            const midY = (startY + endY) / 2 - 30;
            return (
              <path
                d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
                stroke={MW_PALE}
                strokeOpacity={op}
                strokeWidth={0.9}
                strokeDasharray="2 6"
                fill="none"
              />
            );
          })()}

          {/* Beetle at end of grown trajectory */}
          {trajT > 0.02 && (
            <Beetle x={bx} y={by} heading={heading} />
          )}

          {/* Bearing readout above beetle — floated up and to the right
              so it never collides with the horizon caption on the left */}
          {trajT > 0.65 && (() => {
            const op = Math.min(1, (trajT - 0.65) * 3);
            const tagX = Math.min(
              PLATE.x + PLATE.w - 148,
              Math.max(PLATE.x + 200, bx + 6),
            );
            const tagY = by - 62;
            return (
              <g opacity={op} transform={`translate(${tagX} ${tagY})`}>
                <line
                  x1={-tagX + bx}
                  y1={-tagY + by - 8}
                  x2={20}
                  y2={26}
                  stroke={BRONZE}
                  strokeWidth={0.8}
                />
                <rect
                  x={0}
                  y={0}
                  width={132}
                  height={26}
                  fill={INK}
                  stroke={BRONZE}
                  strokeWidth={1}
                  rx={2}
                />
                <text
                  x={66}
                  y={17}
                  textAnchor="middle"
                  fill={BRONZE_HI}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={2.8}
                  fontWeight={600}
                >
                  BEARING 037°
                </text>
              </g>
            );
          })()}

          {/* ── Compass rose / polarisation dial ────────────────────── */}
          <g transform={`translate(${ROSE.cx} ${ROSE.cy})`}>
            {/* faint outer ring backdrop */}
            <circle
              r={ROSE.r + 14}
              fill={INK}
              opacity={0.35}
              filter="url(#soft-glow)"
            />
            <circle
              r={ROSE.r}
              fill="none"
              stroke={GREY}
              strokeWidth={0.8}
              strokeOpacity={0.85}
            />
            <circle
              r={ROSE.r - 10}
              fill="none"
              stroke={GREY}
              strokeWidth={0.5}
              strokeOpacity={0.6}
            />
            {/* Tick marks every 15° */}
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i * 15 * Math.PI) / 180;
              const inner = i % 6 === 0 ? ROSE.r - 18 : ROSE.r - 8;
              return (
                <line
                  key={`tk-${i}`}
                  x1={Math.cos(a) * inner}
                  y1={Math.sin(a) * inner}
                  x2={Math.cos(a) * (ROSE.r - 2)}
                  y2={Math.sin(a) * (ROSE.r - 2)}
                  stroke={GREY_HI}
                  strokeWidth={i % 6 === 0 ? 1.1 : 0.6}
                  opacity={i % 6 === 0 ? 0.95 : 0.55}
                />
              );
            })}
            {/* Cardinal glyphs — only the four majors */}
            {[
              { a: -90, t: "N" },
              { a: 0, t: "E" },
              { a: 90, t: "S" },
              { a: 180, t: "W" },
            ].map((c) => {
              const a = (c.a * Math.PI) / 180;
              return (
                <text
                  key={c.t}
                  x={Math.cos(a) * (ROSE.r - 30)}
                  y={Math.sin(a) * (ROSE.r - 30) + 4}
                  textAnchor="middle"
                  fill={GREY_HI}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={2.6}
                  fontWeight={600}
                >
                  {c.t}
                </text>
              );
            })}

            {/* Polarisation vector — settling onto galactic bearing.
                rotate() uses SVG convention: 0° = up (North), CW positive. */}
            <g transform={`rotate(${bearingDeg})`}>
              {/* Faint pol-axis line across the dial */}
              <line
                x1={0}
                y1={-ROSE.r + 4}
                x2={0}
                y2={ROSE.r - 4}
                stroke={MW_PALE}
                strokeWidth={0.8}
                strokeOpacity={0.42}
                strokeDasharray="2 5"
              />
              {/* Primary bearing arrow — starts outside the label puck */}
              <line
                x1={0}
                y1={-20}
                x2={0}
                y2={-ROSE.r + 14}
                stroke={BRONZE_HI}
                strokeWidth={2.2}
              />
              <polygon
                points={`0,${-ROSE.r + 12} -6,${-ROSE.r + 24} 6,${-ROSE.r + 24}`}
                fill={BRONZE_HI}
              />
            </g>

            {/* Central label puck — sits under the arrow, not clashing */}
            <rect
              x={-42}
              y={-11}
              width={84}
              height={22}
              rx={11}
              fill={INK}
              stroke={GREY}
              strokeOpacity={0.6}
              strokeWidth={0.7}
            />
            <text
              y={4}
              textAnchor="middle"
              fill={STAR}
              fontFamily={inter}
              fontSize={10.5}
              letterSpacing={3}
              fontWeight={600}
            >
              POL. AXIS
            </text>

            {/* 037° tick label — annotation at the settled bearing */}
            <g transform={`rotate(${bearingDeg})`}>
              <text
                y={-ROSE.r - 10}
                textAnchor="middle"
                fill={BRONZE_HI}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={2.4}
                fontWeight={600}
              >
                037°
              </text>
            </g>
          </g>

          {/* Instrument caption — placed under rose, on plate background */}
          <rect
            x={ROSE.cx - 130}
            y={ROSE.cy + ROSE.r + 12}
            width={260}
            height={22}
            fill={INK}
            opacity={0.85}
            rx={2}
          />
          <text
            x={ROSE.cx}
            y={ROSE.cy + ROSE.r + 27}
            textAnchor="middle"
            fill={GREY_HI}
            fontFamily={inter}
            fontSize={9.5}
            letterSpacing={2.6}
            fontWeight={500}
          >
            FIG. II · POLARISATION COMPASS
          </text>
        </g>

        {/* Plate border + crop marks */}
        <rect
          x={PLATE.x + 0.5}
          y={PLATE.y + 0.5}
          width={PLATE.w - 1}
          height={PLATE.h - 1}
          fill="none"
          stroke={GREY}
          strokeWidth={1}
          strokeOpacity={0.5}
        />
        {(
          [
            [PLATE.x, PLATE.y, 1, 1],
            [PLATE.x + PLATE.w, PLATE.y, -1, 1],
            [PLATE.x, PLATE.y + PLATE.h, 1, -1],
            [PLATE.x + PLATE.w, PLATE.y + PLATE.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={BRONZE_HI} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Caption strip below plate */}
        <g
          transform={`translate(${PLATE.x}, ${PLATE.y + PLATE.h + 22})`}
          fill={GREY_HI}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. I · MOONLESS SKY, S. SATYRUS BEARING PLOT</text>
          <text
            x={PLATE.w}
            textAnchor="end"
            fill={BRONZE_HI}
            opacity={0.9}
          >
            NAVIGATION BY GALACTIC LIGHT
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 930,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [18, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: BRONZE_HI,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GREY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Astronomer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
            maxWidth: 900,
          }}
        >
          The beetle who steers
          <br />
          <span style={{ color: STAR }}>by the galaxy.</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1178,
          color: "#C7CBD6",
          fontFamily: inter,
          fontSize: 17,
          lineHeight: 1.42,
          fontWeight: 400,
          maxWidth: 900,
          opacity: hookOpacity,
        }}
      >
        On moonless nights, the African ball-roller{" "}
        <span style={{ color: BRONZE_HI, fontWeight: 600 }}>
          Scarabaeus satyrus
        </span>{" "}
        keeps a straight bearing away from the dung pile by orienting to
        the polarised light of the Milky Way — the first insect known to
        navigate by our galaxy.
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
          color: GREY_HI,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dacke et al. · Current Biology 23 (2013) 298–300</span>
        <span>
          <span style={{ color: BRONZE_HI }}>●</span> Bearing = Galactic pol. axis
        </span>
      </div>
    </AbsoluteFill>
  );
};
