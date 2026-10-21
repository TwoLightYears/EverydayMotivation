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

// Palette — sampled from the real scene (see concept brief)
const NIGHT = "#060912";        // page / arena background
const INDIGO = "#131A2E";       // deep sky, panels
const INDIGO_SOFT = "#1C2340";  // just-brighter sky for radial lift
const MW_CREAM = "#F0E6D2";     // Milky Way haze, body text
const STAR = "#F4C430";         // brightest stars, accents
const OCHRE = "#C9915A";        // dung ball, warm annotations
const DUST = "#8A7156";         // muted ochre for secondary ticks
const GRAY = "#7A8098";         // metadata grey
const INK_TXT = "#F4F4F6";      // headline white

// ────────────────────────────────────────────────────────────────────
// Star field: deterministic pseudo-random dots inside the arena disc.
// A fraction of them sit along the Milky Way band for density.
// ────────────────────────────────────────────────────────────────────
type Star = {
  x: number;
  y: number;
  r: number;
  alpha: number;
  warm: number; // 0..1 blend toward MW_CREAM / STAR
  delay: number;
};

const mulberry = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Arena geometry (SVG px, inside the 1080×1350 page)
const ARENA_CX = 540;
const ARENA_CY = 505;
const ARENA_R = 360;

// Milky Way band — a diagonal strip through the arena.
// Angle measured from vertical (y axis), positive = clockwise.
const MW_ANGLE_DEG = 24;
const MW_ANGLE = (MW_ANGLE_DEG * Math.PI) / 180;
// Unit vector along the band
const MW_UX = Math.sin(MW_ANGLE);
const MW_UY = -Math.cos(MW_ANGLE);
// Unit vector perpendicular to the band
const MW_NX = Math.cos(MW_ANGLE);
const MW_NY = Math.sin(MW_ANGLE);

// Signed distance from the Milky Way centreline, for a point (x,y)
const perpDist = (x: number, y: number): number =>
  (x - ARENA_CX) * MW_NX + (y - ARENA_CY) * MW_NY;

const BAND_HALF = 95; // visual half-width of the glowing band

const makeStars = (): Star[] => {
  const rand = mulberry(0xbee71e);
  const stars: Star[] = [];
  const TOTAL = 220;
  for (let i = 0; i < TOTAL; i++) {
    // Rejection-sample a point inside the disc; bias toward the band.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 40; tries++) {
      const u = rand();
      const v = rand();
      const rr = Math.sqrt(u) * ARENA_R;
      const theta = v * Math.PI * 2;
      x = ARENA_CX + Math.cos(theta) * rr;
      y = ARENA_CY + Math.sin(theta) * rr;
      const d = Math.abs(perpDist(x, y));
      // Accept if inside band always; outside band only with falling prob.
      const inBand = d < BAND_HALF;
      const keep = inBand ? true : rand() < 0.35 * Math.exp(-d / 180);
      if (keep) break;
    }
    const d = Math.abs(perpDist(x, y));
    const inBand = d < BAND_HALF;
    const sizeRoll = rand();
    const r =
      sizeRoll < 0.78
        ? 0.6 + rand() * 0.8
        : sizeRoll < 0.96
          ? 1.2 + rand() * 0.9
          : 2.1 + rand() * 1.6;
    const alpha = inBand
      ? 0.55 + rand() * 0.45
      : 0.35 + rand() * 0.5;
    const warm = inBand ? 0.6 + rand() * 0.4 : rand() * 0.5;
    stars.push({
      x,
      y,
      r,
      alpha,
      warm,
      delay: 0.1 + rand() * 1.4,
    });
  }
  return stars;
};
const STARS: Star[] = makeStars();

// Mix two hex colours by t∈[0,1]
const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255,
    ag = (pa >> 8) & 255,
    ab = pa & 255;
  const br = (pb >> 16) & 255,
    bg = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
};

// ── Beetle silhouette ──────────────────────────────────────────────
// Drawn facing "up" (negative y) at local origin, ~55 px long body.
// Simple scarab shapes: elytra oval, pronotum, head, six legs.
const Beetle: React.FC<{
  cx: number;
  cy: number;
  rot: number; // radians, 0 = facing up
  size: number; // body length baseline
  color?: string;
}> = ({ cx, cy, rot, size, color = "#0B0D14" }) => {
  const s = size / 55;
  const legLW = 1.6;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${(rot * 180) / Math.PI})`}>
      {/* Legs — three pairs, back-bent */}
      <g stroke={color} strokeWidth={legLW} fill="none" strokeLinecap="round">
        {/* Front legs */}
        <path d={`M ${-6 * s} ${-10 * s} L ${-18 * s} ${-14 * s} L ${-22 * s} ${-8 * s}`} />
        <path d={`M ${6 * s} ${-10 * s} L ${18 * s} ${-14 * s} L ${22 * s} ${-8 * s}`} />
        {/* Middle legs */}
        <path d={`M ${-7 * s} ${0} L ${-22 * s} ${2 * s} L ${-27 * s} ${8 * s}`} />
        <path d={`M ${7 * s} ${0} L ${22 * s} ${2 * s} L ${27 * s} ${8 * s}`} />
        {/* Rear legs */}
        <path d={`M ${-7 * s} ${10 * s} L ${-20 * s} ${16 * s} L ${-24 * s} ${22 * s}`} />
        <path d={`M ${7 * s} ${10 * s} L ${20 * s} ${16 * s} L ${24 * s} ${22 * s}`} />
      </g>
      {/* Elytra body */}
      <ellipse
        cx={0}
        cy={2 * s}
        rx={9 * s}
        ry={16 * s}
        fill={color}
        stroke="#1A1E2A"
        strokeWidth={0.8}
      />
      {/* Elytra seam */}
      <line
        x1={0}
        y1={-10 * s}
        x2={0}
        y2={16 * s}
        stroke="#1A1E2A"
        strokeWidth={0.9}
      />
      {/* Pronotum */}
      <ellipse cx={0} cy={-11 * s} rx={7 * s} ry={5 * s} fill={color} />
      {/* Head */}
      <path
        d={`M ${-5 * s} ${-15 * s}
            L ${-5.5 * s} ${-19 * s}
            L ${-3 * s} ${-21 * s}
            L ${3 * s} ${-21 * s}
            L ${5.5 * s} ${-19 * s}
            L ${5 * s} ${-15 * s} Z`}
        fill={color}
      />
      {/* Tiny highlight sheen */}
      <ellipse
        cx={-3 * s}
        cy={-2 * s}
        rx={2.4 * s}
        ry={5 * s}
        fill="#1E2338"
        opacity={0.9}
      />
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Primary timings ─────────────────────────────────────────────
  const T_STARS_START = fps * 0.1;
  const T_STARS_SPAN = fps * 1.6;
  const T_BAND_START = fps * 0.0;
  const T_BAND_SPAN = fps * 1.9;
  const T_TRACE_START = fps * 1.0;
  const T_TRACE_SPAN = fps * 1.6;
  const T_BEETLE_START = fps * 1.4;

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 1.4, fps * 2.3],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const bandOpacity = interpolate(
    frame,
    [T_BAND_START, T_BAND_START + T_BAND_SPAN],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Trajectory — a straight line from the beetle outward along the band.
  // The beetle sits slightly below-centre; the path heads toward galactic NE.
  const BEETLE_X = ARENA_CX - MW_UX * 70; // down-band from centre
  const BEETLE_Y = ARENA_CY - MW_UY * 70;
  const TRAJ_LEN = ARENA_R * 0.86;
  const TRAJ_END_X = BEETLE_X + MW_UX * TRAJ_LEN;
  const TRAJ_END_Y = BEETLE_Y + MW_UY * TRAJ_LEN;

  const traceRaw = interpolate(
    frame,
    [T_TRACE_START, T_TRACE_START + T_TRACE_SPAN],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const traceT = 1 - Math.pow(1 - traceRaw, 3);

  const beetleIn = spring({
    frame: frame - T_BEETLE_START,
    fps,
    config: { damping: 180, mass: 0.6 },
  });

  // Trajectory dash pattern (dashed line, revealed by stroke-dashoffset trick)
  const DASH = "8 10";
  const strokeLen = TRAJ_LEN;
  const dashOffset = (1 - traceT) * strokeLen;

  // Compass tick geometry: 24 ticks around the arena
  const TICKS = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);

  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ─────────────────────────────────────── */}
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
        <span style={{ color: STAR }}>2026 · 10 · 21</span>
      </div>

      {/* ── Hero SVG: planetarium disc with beetle ─────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Deep sky radial inside the arena */}
          <radialGradient id="skyGrad" cx="50%" cy="48%" r="60%">
            <stop offset="0%" stopColor={INDIGO_SOFT} />
            <stop offset="70%" stopColor={INDIGO} />
            <stop offset="100%" stopColor={NIGHT} />
          </radialGradient>

          {/* Milky Way band: horizontal gradient along the local perpendicular,
              rotated into position via a linearGradient with explicit vector. */}
          <linearGradient
            id="mwGrad"
            gradientUnits="userSpaceOnUse"
            x1={ARENA_CX - MW_NX * BAND_HALF * 2}
            y1={ARENA_CY - MW_NY * BAND_HALF * 2}
            x2={ARENA_CX + MW_NX * BAND_HALF * 2}
            y2={ARENA_CY + MW_NY * BAND_HALF * 2}
          >
            <stop offset="0%" stopColor={MW_CREAM} stopOpacity={0} />
            <stop offset="36%" stopColor={MW_CREAM} stopOpacity={0.16} />
            <stop offset="50%" stopColor={MW_CREAM} stopOpacity={0.32} />
            <stop offset="64%" stopColor={MW_CREAM} stopOpacity={0.16} />
            <stop offset="100%" stopColor={MW_CREAM} stopOpacity={0} />
          </linearGradient>

          {/* Darker lane inside the galactic band — the Great Rift */}
          <linearGradient
            id="mwRift"
            gradientUnits="userSpaceOnUse"
            x1={ARENA_CX - MW_NX * 18}
            y1={ARENA_CY - MW_NY * 18}
            x2={ARENA_CX + MW_NX * 18}
            y2={ARENA_CY + MW_NY * 18}
          >
            <stop offset="0%" stopColor={INDIGO} stopOpacity={0} />
            <stop offset="50%" stopColor={INDIGO} stopOpacity={0.55} />
            <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
          </linearGradient>

          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0.75} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="ballGrad" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={mix(OCHRE, "#FFFFFF", 0.25)} />
            <stop offset="55%" stopColor={OCHRE} />
            <stop offset="100%" stopColor="#5A3E26" />
          </radialGradient>

          <clipPath id="arenaClip">
            <circle cx={ARENA_CX} cy={ARENA_CY} r={ARENA_R} />
          </clipPath>
        </defs>

        {/* Outer soft halo */}
        <circle
          cx={ARENA_CX}
          cy={ARENA_CY}
          r={ARENA_R + 14}
          fill="none"
          stroke={INDIGO_SOFT}
          strokeWidth={1}
          opacity={0.9}
        />

        {/* Arena disc */}
        <circle
          cx={ARENA_CX}
          cy={ARENA_CY}
          r={ARENA_R}
          fill="url(#skyGrad)"
        />

        {/* Content inside the arena */}
        <g clipPath="url(#arenaClip)">
          {/* Milky Way band */}
          <g opacity={bandOpacity}>
            <rect
              x={ARENA_CX - 900}
              y={ARENA_CY - BAND_HALF * 2}
              width={1800}
              height={BAND_HALF * 4}
              fill="url(#mwGrad)"
              transform={`rotate(${90 - MW_ANGLE_DEG} ${ARENA_CX} ${ARENA_CY})`}
            />
            <rect
              x={ARENA_CX - 900}
              y={ARENA_CY - 18}
              width={1800}
              height={36}
              fill="url(#mwRift)"
              transform={`rotate(${90 - MW_ANGLE_DEG} ${ARENA_CX} ${ARENA_CY})`}
              opacity={0.9}
            />
          </g>

          {/* Stars */}
          {STARS.map((s, i) => {
            const t0 = T_STARS_START + s.delay * fps;
            const op = interpolate(
              frame,
              [t0, t0 + T_STARS_SPAN * 0.4],
              [0, s.alpha],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const col = mix(MW_CREAM, STAR, s.warm);
            return (
              <g key={i} opacity={op}>
                {s.r > 1.7 && (
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={s.r * 3.2}
                    fill="url(#starGlow)"
                    opacity={0.55}
                  />
                )}
                <circle cx={s.x} cy={s.y} r={s.r} fill={col} />
              </g>
            );
          })}

          {/* Trajectory dashed line — starts past the dung ball */}
          {(() => {
            const TRAJ_GAP = 92; // skip past beetle + ball
            const startX = BEETLE_X + MW_UX * TRAJ_GAP;
            const startY = BEETLE_Y + MW_UY * TRAJ_GAP;
            const segLen = TRAJ_LEN - TRAJ_GAP;
            const segOff = (1 - traceT) * segLen;
            return (
              <g opacity={traceRaw}>
                {/* Soft under-glow */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={TRAJ_END_X}
                  y2={TRAJ_END_Y}
                  stroke={STAR}
                  strokeWidth={6}
                  strokeOpacity={0.12}
                  strokeLinecap="round"
                  strokeDasharray={segLen}
                  strokeDashoffset={segOff}
                />
                {/* Main dashed stroke */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={TRAJ_END_X}
                  y2={TRAJ_END_Y}
                  stroke={OCHRE}
                  strokeWidth={1.8}
                  strokeDasharray={DASH}
                  strokeDashoffset={segOff * 0.6}
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Arrow head at the end */}
                {traceT > 0.9 && (
                  <g
                    transform={`translate(${TRAJ_END_X} ${TRAJ_END_Y}) rotate(${
                      (Math.atan2(MW_UY, MW_UX) * 180) / Math.PI
                    })`}
                    fill={OCHRE}
                  >
                    <polygon points="0,0 -16,-6 -11,0 -16,6" />
                  </g>
                )}
              </g>
            );
          })()}

          {/* Beetle + ball */}
          {(() => {
            // Beetle faces along the trajectory. Beetle local "up" is -y.
            const headingDeg =
              (Math.atan2(MW_UY, MW_UX) * 180) / Math.PI + 90;
            const headingRad = (headingDeg * Math.PI) / 180;

            // Dung ball sits past the beetle's head along the trajectory,
            // just forward of the forelegs so the beetle reads as pushing it.
            const BALL_OFFSET = 60;
            const BALL_R = 24;
            const ballX = BEETLE_X + MW_UX * BALL_OFFSET;
            const ballY = BEETLE_Y + MW_UY * BALL_OFFSET;

            // Soft ground shadow (elongated along trajectory, under both)
            const shadowX = BEETLE_X + MW_UX * 28;
            const shadowY = BEETLE_Y + MW_UY * 28;

            const op = Math.min(1, beetleIn);
            const sc = 0.65 + beetleIn * 0.35;

            return (
              <g
                opacity={op}
                transform={`translate(${BEETLE_X} ${BEETLE_Y}) scale(${sc}) translate(${-BEETLE_X} ${-BEETLE_Y})`}
              >
                {/* Ground shadow puddle */}
                <ellipse
                  cx={shadowX}
                  cy={shadowY}
                  rx={62}
                  ry={18}
                  fill="#000000"
                  opacity={0.4}
                  transform={`rotate(${headingDeg} ${shadowX} ${shadowY})`}
                />

                {/* Beetle BEHIND the ball (drawn first) */}
                <Beetle
                  cx={BEETLE_X}
                  cy={BEETLE_Y}
                  rot={headingRad}
                  size={72}
                />

                {/* Dung ball ON TOP, partially occluding beetle front */}
                <g>
                  <circle
                    cx={ballX}
                    cy={ballY}
                    r={BALL_R}
                    fill="url(#ballGrad)"
                    stroke="#2A1C10"
                    strokeWidth={0.9}
                  />
                  {/* Grain speckle */}
                  {[
                    [-7, -5, 1.1],
                    [5, -9, 0.9],
                    [9, 3, 1.0],
                    [-9, 7, 0.9],
                    [2, 10, 0.7],
                    [-4, 0, 0.7],
                    [7, -2, 0.6],
                    [-2, -10, 0.6],
                  ].map(([dx, dy, r], i) => (
                    <circle
                      key={i}
                      cx={ballX + dx}
                      cy={ballY + dy}
                      r={r}
                      fill="#3E2814"
                      opacity={0.75}
                    />
                  ))}
                  {/* Specular */}
                  <ellipse
                    cx={ballX - 7}
                    cy={ballY - 10}
                    rx={5}
                    ry={3}
                    fill="#FFE2BF"
                    opacity={0.55}
                  />
                </g>
              </g>
            );
          })()}
        </g>

        {/* Arena ring + ticks (outside the clip) */}
        <circle
          cx={ARENA_CX}
          cy={ARENA_CY}
          r={ARENA_R}
          fill="none"
          stroke={DUST}
          strokeOpacity={0.55}
          strokeWidth={1.1}
        />
        {TICKS.map((deg, i) => {
          const major = deg % 90 === 0;
          const a = (deg - 90) * (Math.PI / 180); // 0° at top
          const x1 = ARENA_CX + Math.cos(a) * (ARENA_R - (major ? 16 : 7));
          const y1 = ARENA_CY + Math.sin(a) * (ARENA_R - (major ? 16 : 7));
          const x2 = ARENA_CX + Math.cos(a) * ARENA_R;
          const y2 = ARENA_CY + Math.sin(a) * ARENA_R;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={DUST}
              strokeWidth={major ? 1.4 : 0.8}
              strokeOpacity={major ? 0.85 : 0.5}
            />
          );
        })}
        {/* Cardinal labels */}
        {(
          [
            ["N", 0, -1, 0, -8, "middle"],
            ["E", 1, 0, 10, 4, "start"],
            ["S", 0, 1, 0, 14, "middle"],
            ["W", -1, 0, -10, 4, "end"],
          ] as const
        ).map(([label, ux, uy, dx, dy, anchor]) => (
          <text
            key={label}
            x={ARENA_CX + ux * (ARENA_R + 24) + dx}
            y={ARENA_CY + uy * (ARENA_R + 24) + dy}
            textAnchor={anchor}
            fill={DUST}
            fontFamily={inter}
            fontSize={13}
            fontWeight={600}
            letterSpacing={3}
          >
            {label}
          </text>
        ))}

        {/* Heading angle is carried by the Milky Way callout below; no arc here. */}

        {/* Milky Way label leader */}
        {(() => {
          // Place a label above the band, outside the arena-top-right.
          const anchorX = ARENA_CX + MW_UX * (ARENA_R * 0.78);
          const anchorY = ARENA_CY + MW_UY * (ARENA_R * 0.78);
          // Short leader out toward the top-right corner
          const leadX = ARENA_CX + 310;
          const leadY = ARENA_CY - 300;
          const op = interpolate(
            frame,
            [fps * 2.0, fps * 2.8],
            [0, 1],
            {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );
          return (
            <g opacity={op}>
              <line
                x1={anchorX}
                y1={anchorY}
                x2={leadX}
                y2={leadY}
                stroke={MW_CREAM}
                strokeWidth={0.9}
                strokeOpacity={0.55}
              />
              <line
                x1={leadX}
                y1={leadY}
                x2={leadX + 68}
                y2={leadY}
                stroke={MW_CREAM}
                strokeWidth={0.9}
                strokeOpacity={0.55}
              />
              <text
                x={leadX + 76}
                y={leadY - 6}
                fill={MW_CREAM}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3}
              >
                MILKY WAY
              </text>
              <text
                x={leadX + 76}
                y={leadY + 10}
                fill={MW_CREAM}
                fontOpacity={0.6}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2}
                opacity={0.6}
              >
                az ≈ {MW_ANGLE_DEG}° E of N
              </text>
            </g>
          );
        })()}

        {/* Caption strip below the arena */}
        <g
          transform={`translate(80, ${ARENA_CY + ARENA_R + 44})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · ORIENTATION ARENA · Ø 1 M · PLANETARIUM DOME</text>
          <text x={920} textAnchor="end" fill={STAR} opacity={0.85}>
            PATH DRAWN BY A ROLLING BEETLE
          </text>
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 955,
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
            color: STAR,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: INK_TXT, letterSpacing: 5 }}>
            Celestial Navigator
          </span>
        </div>

        <div
          style={{
            color: INK_TXT,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The galaxy's
          <br />
          smallest navigator.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Hidden every bright star inside a planetarium — leaving only the
          soft band of the{" "}
          <span style={{ color: MW_CREAM, fontWeight: 600 }}>Milky Way</span>{" "}
          overhead — and the nocturnal dung beetle{" "}
          <span style={{ color: STAR, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          still rolled its ball in a dead-straight line. The only animal
          known to steer by our galaxy.
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
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
          Compass{" "}
          <span style={{ color: GRAY, margin: "0 2px" }}>=</span>{" "}
          <span style={{ color: MW_CREAM }}>The Milky Way</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
