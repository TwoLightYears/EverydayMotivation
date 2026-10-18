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

// Palette — grounded in the real colours of a moonless southern sky
// and the beetle's bronze-black elytra.
const INK = "#0A0B14";
const INDIGO = "#1C2340";
const MILKY = "#E8DDB5";
const BRASS = "#D4A574";
const GRAY = "#8A8F99";
const GRID = "#141827";
const GRID_MAJOR = "#1C2234";

// Chart coordinate space (will be scaled into the drafting frame)
const MAP_W = 1080;
const MAP_H = 800;

// Beetle sits in the lower part of the chart; it steers along the
// Milky Way axis (upper-right → lower-left, angle ≈ 118° from +x).
const BEETLE = { x: 335, y: 650 };
const AXIS_ANGLE_DEG = -62; // bearing of Milky Way principal axis, measured from +x (ccw)
const AXIS_RAD = (AXIS_ANGLE_DEG * Math.PI) / 180;

// Deterministic PRNG for star placement (seeded) ─────────────────────────
const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

type Star = { x: number; y: number; r: number; op: number; glow: boolean };
const makeStars = (): Star[] => {
  const rnd = mulberry32(0x5a7b);
  const stars: Star[] = [];
  // Field stars
  for (let i = 0; i < 220; i++) {
    const x = rnd() * MAP_W;
    const y = rnd() * MAP_H;
    const t = rnd();
    const r = t < 0.86 ? 0.6 + rnd() * 0.9 : t < 0.98 ? 1.4 + rnd() * 1.0 : 2.2 + rnd() * 1.2;
    const op = 0.35 + rnd() * 0.55;
    stars.push({ x, y, r, op, glow: r > 2.0 });
  }
  // A denser clump along the galactic axis
  for (let i = 0; i < 220; i++) {
    const u = rnd() - 0.5; // along-axis
    const v = (rnd() - 0.5) * 0.22; // across-axis (narrow)
    const alongX = u * MAP_W * 1.3;
    const alongY = v * MAP_W * 1.3;
    // rotate by AXIS_RAD and translate to centre
    const cx = MAP_W / 2 + Math.cos(AXIS_RAD) * alongX - Math.sin(AXIS_RAD) * alongY;
    const cy = MAP_H / 2 + Math.sin(AXIS_RAD) * alongX + Math.cos(AXIS_RAD) * alongY;
    if (cx < -20 || cx > MAP_W + 20 || cy < -20 || cy > MAP_H + 20) continue;
    const r = 0.5 + rnd() * 0.9;
    stars.push({ x: cx, y: cy, r, op: 0.45 + rnd() * 0.5, glow: false });
  }
  return stars;
};
const STARS = makeStars();

// Bearing tick marks for protractor
const BEARING_TICKS = Array.from({ length: 36 }, (_, i) => i * 10);

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (in frames at fps=30)
  // 0.0s  chart & stars fade in
  // 0.4s  Milky Way band fades in
  // 0.9s  heading line begins to draw
  // 1.7s  azimuth needle swings and locks
  // 2.0s  Milky Way band glow pulses once (hook moment)
  // 2.4s  type lockup lands
  // 2.9s  hook paragraph fades in
  const chartFade = interpolate(frame, [0, fps * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const milkyFade = interpolate(frame, [fps * 0.4, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Heading line draw (dash-offset)
  const lineGrow = spring({
    frame: frame - fps * 0.9,
    fps,
    config: { damping: 200, mass: 1.1, stiffness: 55 },
  });

  // Azimuth needle: swings 48° then locks on galactic axis
  const needleSpring = spring({
    frame: frame - fps * 1.7,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 95 },
  });
  const needleRest = -62; // galactic axis bearing
  const needleStart = -14;
  const needleAngle = interpolate(needleSpring, [0, 1], [needleStart, needleRest]);

  // Milky Way "lock" pulse at ~2.0s
  const lockPulse = interpolate(
    frame,
    [fps * 1.95, fps * 2.1, fps * 2.6],
    [0, 1, 0],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Type lockup
  const titleSpring = spring({
    frame: frame - fps * 2.4,
    fps,
    config: { damping: 180, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 2.9, fps * 3.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle twinkle: a slow modulation of a star-subset's opacity
  const tw = (frame / fps) * 2.0;

  // Page layout
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const scale = FRAME.w / MAP_W;

  // Heading line geometry (in MAP coords). Line extends from a point
  // "below" the beetle to the Milky Way centre, along the galactic axis.
  const headingStart = { x: BEETLE.x + Math.cos(AXIS_RAD + Math.PI) * 60, y: BEETLE.y + Math.sin(AXIS_RAD + Math.PI) * 60 };
  const headingEnd = { x: BEETLE.x + Math.cos(AXIS_RAD) * 540, y: BEETLE.y + Math.sin(AXIS_RAD) * 540 };
  const headingLen = Math.hypot(
    headingEnd.x - headingStart.x,
    headingEnd.y - headingStart.y,
  );
  const headingDashOffset = headingLen * (1 - lineGrow);

  // Protractor origin (top-left of chart)
  const PROT = { x: 115, y: 160, r: 92 };

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
        <span style={{ color: BRASS }}>2026 · 10 · 18</span>
      </div>

      {/* Chart */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Chart grid */}
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

          {/* Chart background: top-indigo → ink */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INDIGO} />
            <stop offset="100%" stopColor={INK} />
          </linearGradient>

          {/* Milky Way band gradient — across-axis Gaussian-ish falloff */}
          <linearGradient id="milky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MILKY} stopOpacity={0} />
            <stop offset="35%" stopColor={MILKY} stopOpacity={0.26} />
            <stop offset="50%" stopColor={MILKY} stopOpacity={0.5} />
            <stop offset="65%" stopColor={MILKY} stopOpacity={0.26} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="milkyCore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MILKY} stopOpacity={0} />
            <stop offset="50%" stopColor="#FFF4D4" stopOpacity={0.75} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </linearGradient>
          {/* Along-axis falloff — fades the band at its two ends so it doesn't blow out */}
          <linearGradient id="milkyAlong" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity={1} />
            <stop offset="15%" stopColor="#000" stopOpacity={0} />
            <stop offset="85%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={1} />
          </linearGradient>
          {/* The band itself as a mask, so the along-axis fade is applied via a mask */}
          <mask id="along-mask" maskUnits="userSpaceOnUse" x="-900" y="-220" width="1800" height="440">
            <rect x={-900} y={-220} width={1800} height={440} fill="white" />
            <rect x={-900} y={-220} width={1800} height={440} fill="url(#milkyAlong)" />
          </mask>
          {/* Dust-lane streaks that split the band — the dark central rift */}
          <linearGradient id="milkyRift" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK} stopOpacity={0} />
            <stop offset="50%" stopColor={INK} stopOpacity={0.55} />
            <stop offset="100%" stopColor={INK} stopOpacity={0} />
          </linearGradient>

          {/* Soft radial glow for bright stars */}
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF4D4" stopOpacity={0.9} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </radialGradient>

          {/* Dark sphere (dung ball) gradient */}
          <radialGradient id="ball" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#2B2A2A" />
            <stop offset="60%" stopColor="#111013" />
            <stop offset="100%" stopColor="#060608" />
          </radialGradient>

          {/* Beetle body gradient — bronze iridescence */}
          <linearGradient id="elytra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B5B2E" />
            <stop offset="55%" stopColor="#2A1F10" />
            <stop offset="100%" stopColor="#0B0803" />
          </linearGradient>

          {/* Milky Way clip — a rotated wide band */}
          <clipPath id="galaxy-clip">
            <g transform={`rotate(${AXIS_ANGLE_DEG} ${MAP_W / 2} ${MAP_H / 2})`}>
              <rect x={-400} y={MAP_H / 2 - 220} width={MAP_W + 800} height={440} />
            </g>
          </clipPath>

          {/* Dense star speckle noise for inside the Milky Way band */}
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.92  0 0 0 0 0.87  0 0 0 0 0.71  0 0 0 1.2 -0.6" />
          </filter>

          {/* Mask so stars only paint inside the chart frame */}
          <clipPath id="chart-clip">
            <rect x={0} y={0} width={MAP_W} height={MAP_H} />
          </clipPath>
        </defs>

        {/* Drafting frame fill */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky)"
          opacity={chartFade}
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
          opacity={chartFade * 0.9}
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
          opacity={chartFade * 0.9}
        />

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1F2638"
          strokeWidth={1}
          opacity={chartFade}
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
          <g key={i} stroke={BRASS} strokeWidth={1.5} fill="none" opacity={chartFade}>
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Chart content scaled into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          <g clipPath="url(#chart-clip)">
            {/* Stars — field layer (fade with chartFade) */}
            <g opacity={chartFade}>
              {STARS.map((s, i) => {
                const flicker = s.r > 1.3
                  ? 0.75 + 0.25 * Math.sin(tw + i * 0.37)
                  : 1;
                return s.glow ? (
                  <g key={i}>
                    <circle cx={s.x} cy={s.y} r={s.r * 4} fill="url(#starGlow)" opacity={s.op * 0.6 * flicker} />
                    <circle cx={s.x} cy={s.y} r={s.r} fill="#FFF4D4" opacity={s.op * flicker} />
                  </g>
                ) : (
                  <circle
                    key={i}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={MILKY}
                    opacity={s.op * flicker}
                  />
                );
              })}
            </g>

            {/* Milky Way band — layered gradient + cloud patches + central dust rift.
                Everything is drawn in a band-local coordinate frame (y=0 is the axis),
                then rotated as a whole into the chart. An along-axis mask fades the ends. */}
            <g
              opacity={milkyFade}
              transform={`translate(${MAP_W / 2} ${MAP_H / 2}) rotate(${AXIS_ANGLE_DEG})`}
              mask="url(#along-mask)"
            >
              {/* Wide soft band */}
              <rect x={-900} y={-220} width={1800} height={440} fill="url(#milky)" />
              {/* Bright core strip */}
              <rect
                x={-900}
                y={-70}
                width={1800}
                height={140}
                fill="url(#milkyCore)"
                opacity={0.9 + lockPulse * 0.4}
              />

              {/* Diffuse star-cloud patches along the band */}
              {[
                { cx: -520, cy: -10, rx: 170, ry: 48, op: 0.42 },
                { cx: -300, cy: 18, rx: 140, ry: 38, op: 0.4 },
                { cx: -80, cy: -6, rx: 180, ry: 54, op: 0.5 },
                { cx: 160, cy: 20, rx: 150, ry: 40, op: 0.4 },
                { cx: 400, cy: -4, rx: 160, ry: 46, op: 0.42 },
                { cx: 640, cy: 14, rx: 130, ry: 34, op: 0.35 },
              ].map((p, i) => (
                <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={MILKY} opacity={p.op} />
              ))}

              {/* Core galactic bulge — brightest knot, muted so it doesn't form an "eye" */}
              <ellipse cx={-180} cy={-6} rx={140} ry={38} fill="#FFF4D4" opacity={0.35 + lockPulse * 0.2} />

              {/* Dark dust rift — soft gradient, no hard edges */}
              <rect x={-900} y={-14} width={1800} height={28} fill="url(#milkyRift)" />

              {/* Dense pin-point stars inside the band */}
              {Array.from({ length: 240 }, (_, i) => {
                const r1 = mulberry32(0x3f1 + i)();
                const r2 = mulberry32(0x9ab + i)();
                const r3 = mulberry32(0xcd4 + i)();
                const x = -800 + r1 * 1600;
                const y = -150 + r2 * 300;
                const r = 0.5 + r3 * 1.4;
                return (
                  <circle
                    key={`mb-${i}`}
                    cx={x}
                    cy={y}
                    r={r}
                    fill="#FFF4D4"
                    opacity={0.5 + r3 * 0.45}
                  />
                );
              })}
            </g>

            {/* Celestial equator / reference arc — faint latitude guide */}
            <g opacity={chartFade * 0.35} fill="none" stroke={GRAY} strokeWidth={1}>
              <path d={`M 40 ${MAP_H * 0.78} Q ${MAP_W / 2} ${MAP_H * 0.68} ${MAP_W - 40} ${MAP_H * 0.78}`} strokeDasharray="4 6" />
            </g>

            {/* Heading line — drawn as a dashed track along the galactic axis */}
            <g>
              {/* glow */}
              <line
                x1={headingStart.x}
                y1={headingStart.y}
                x2={headingEnd.x}
                y2={headingEnd.y}
                stroke={BRASS}
                strokeOpacity={0.25}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={headingLen}
                strokeDashoffset={headingDashOffset}
              />
              {/* dashed core — faux dashes via second dasharray; we animate dashoffset for growth */}
              <line
                x1={headingStart.x}
                y1={headingStart.y}
                x2={headingEnd.x}
                y2={headingEnd.y}
                stroke={BRASS}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeDasharray="10 10"
                opacity={lineGrow}
              />
              {/* arrow head at galactic lock point */}
              {lineGrow > 0.6 && (
                <g
                  transform={`translate(${headingEnd.x} ${headingEnd.y}) rotate(${AXIS_ANGLE_DEG})`}
                  opacity={(lineGrow - 0.6) / 0.4}
                >
                  <polygon points="0,0 -16,-7 -16,7" fill={BRASS} />
                </g>
              )}
            </g>

            {/* Heading-fix "lock" ring at the Milky Way axis */}
            {lineGrow > 0.75 && (
              <g
                transform={`translate(${headingEnd.x} ${headingEnd.y})`}
                opacity={(lineGrow - 0.75) / 0.25}
              >
                {/* dark backing disc so the ring reads against the bright core */}
                <circle r={26} fill={INK} opacity={0.55} />
                <circle r={22} fill="none" stroke={BRASS} strokeWidth={1.4} opacity={0.95} />
                <circle r={28 + lockPulse * 14} fill="none" stroke={BRASS} strokeWidth={1} opacity={0.5 * (1 - lockPulse * 0.4)} />
                <circle r={4} fill={BRASS} />
                {/* FIX label chip */}
                <rect x={30} y={-11} width={44} height={22} fill={INK} opacity={0.75} rx={2} />
                <text
                  x={52}
                  y={5}
                  textAnchor="middle"
                  fill={BRASS}
                  fontFamily={inter}
                  fontSize={13}
                  fontWeight={600}
                  letterSpacing={4}
                >
                  FIX
                </text>
              </g>
            )}

            {/* Beetle silhouette with dung ball (hero scale) */}
            <g transform={`translate(${BEETLE.x}, ${BEETLE.y})`} opacity={chartFade}>
              {/* Horizon substrate line under beetle — behind so beetle sits on it */}
              <line x1={-240} y1={64} x2={180} y2={64} stroke={GRAY} strokeOpacity={0.4} strokeWidth={1} />
              <line x1={-240} y1={64} x2={180} y2={64} stroke={GRAY} strokeOpacity={0.15} strokeWidth={1} strokeDasharray="2 4" transform="translate(0 4)" />

              {/* Dung ball (ahead of beetle in pushing direction — i.e. left) */}
              <g transform="translate(-120, 10)">
                <circle r={66} fill="url(#ball)" />
                <circle r={66} fill="none" stroke="#000" strokeWidth={1} opacity={0.7} />
                {/* speckle: scattered flecks + darker craters to read as rough sphere */}
                {[
                  [-16, -22, 2.2], [8, -28, 2.6], [20, 4, 2.0], [-28, 14, 2.8],
                  [4, 28, 2.0], [-8, -4, 1.6], [-34, -6, 2.2], [26, -16, 1.8],
                  [-18, 32, 1.6], [34, 20, 2.0], [12, 16, 1.4], [-6, 44, 1.6],
                  [38, -4, 1.6], [-42, 24, 1.4], [-24, -32, 1.4],
                ].map(([cx, cy, r], i) => (
                  <circle key={i} cx={cx} cy={cy} r={r} fill="#1b1a1a" opacity={0.9} />
                ))}
                {/* subtle rim highlight */}
                <path d="M -50 -32 Q -36 -58 -4 -62" fill="none" stroke="#3a3836" strokeWidth={1.6} strokeOpacity={0.7} />
              </g>

              {/* Beetle — side view, head-down, pushing with rear legs */}
              <g>
                {/* back legs (right side — pushing ball; beetle faces away from ball) */}
                {/* NB: Scarabaeus pushes with hind legs while facing away; beetle head is at RIGHT, ball at LEFT */}
                <path d="M -22 20 Q -46 46 -70 52" fill="none" stroke="#120C06" strokeWidth={3.6} strokeLinecap="round" />
                <path d="M -30 24 Q -52 54 -78 62" fill="none" stroke="#120C06" strokeWidth={3.6} strokeLinecap="round" />
                {/* middle legs */}
                <path d="M 0 28 Q 2 46 -8 60" fill="none" stroke="#120C06" strokeWidth={3.2} strokeLinecap="round" />
                {/* front legs — planted / head-down */}
                <path d="M 36 24 Q 48 42 54 62" fill="none" stroke="#120C06" strokeWidth={3.2} strokeLinecap="round" />
                <path d="M 44 18 Q 60 36 70 58" fill="none" stroke="#120C06" strokeWidth={3.2} strokeLinecap="round" />

                {/* Elytra (back) — oval dome */}
                <path
                  d="M -24 -22 Q 22 -32 56 -8 Q 60 22 36 32 Q -4 36 -28 28 Q -40 12 -36 -4 Z"
                  fill="url(#elytra)"
                  stroke="#000"
                  strokeWidth={0.8}
                />
                {/* Pronotum (thorax shield behind head) */}
                <path
                  d="M 36 -14 Q 64 -10 68 10 Q 64 24 46 24 Q 36 16 36 2 Z"
                  fill="#1a1309"
                  stroke="#000"
                  strokeWidth={0.7}
                />
                {/* Clypeus / head (digging shield) */}
                <path
                  d="M 60 2 Q 80 6 82 22 Q 76 34 60 34 Q 56 20 60 10 Z"
                  fill="#120B04"
                  stroke="#000"
                  strokeWidth={0.6}
                />
                {/* Elytra midline suture */}
                <line x1={-20} y1={-18} x2={44} y2={6} stroke="#000" strokeWidth={0.8} opacity={0.75} />
                {/* bronze highlight along the dome edge */}
                <path
                  d="M -14 -22 Q 18 -32 50 -14"
                  fill="none"
                  stroke="#7a5a2d"
                  strokeOpacity={0.9}
                  strokeWidth={1.4}
                />
                <path
                  d="M -8 -16 Q 16 -24 42 -10"
                  fill="none"
                  stroke="#a37e3a"
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
                {/* small antenna tuft */}
                <path d="M 72 12 Q 82 6 90 10" fill="none" stroke="#120C06" strokeWidth={1.6} strokeLinecap="round" />
              </g>
            </g>

            {/* Beetle label — placed below & to the right of the beetle, away from the band */}
            <g opacity={chartFade * (frame > fps * 1.0 ? 1 : 0)}>
              <line
                x1={BEETLE.x + 70}
                y1={BEETLE.y + 50}
                x2={BEETLE.x + 90}
                y2={BEETLE.y + 90}
                stroke={GRAY}
                strokeWidth={1}
              />
              <line
                x1={BEETLE.x + 90}
                y1={BEETLE.y + 90}
                x2={BEETLE.x + 290}
                y2={BEETLE.y + 90}
                stroke={GRAY}
                strokeWidth={1}
              />
              {/* backing chip for legibility against the dust rift / band */}
              <rect
                x={BEETLE.x + 100}
                y={BEETLE.y + 72}
                width={240}
                height={48}
                fill={INK}
                opacity={0.72}
                rx={2}
              />
              <text
                x={BEETLE.x + 110}
                y={BEETLE.y + 90}
                fill="#D7DCE6"
                fontFamily={inter}
                fontSize={12}
                letterSpacing={3.4}
                fontWeight={600}
              >
                SCARABAEUS SATYRUS
              </text>
              <text
                x={BEETLE.x + 110}
                y={BEETLE.y + 110}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={2.6}
                fontWeight={400}
              >
                dorsal ocelli — galactic polarisation
              </text>
            </g>

            {/* Galactic axis label — set along the band, pushed off-band on the lower-right
                side (the Milky Way runs upper-right to lower-left, so this clears it). */}
            {(() => {
              const alongT = 180;
              const perpT = 190; // perpendicular distance from axis
              const cx = MAP_W / 2 + Math.cos(AXIS_RAD) * alongT + Math.cos(AXIS_RAD + Math.PI / 2) * perpT;
              const cy = MAP_H / 2 + Math.sin(AXIS_RAD) * alongT + Math.sin(AXIS_RAD + Math.PI / 2) * perpT;
              return (
                <g
                  transform={`translate(${cx} ${cy}) rotate(${AXIS_ANGLE_DEG})`}
                  opacity={milkyFade}
                >
                  <text
                    textAnchor="middle"
                    fill={MILKY}
                    fontFamily={inter}
                    fontSize={12}
                    fontWeight={500}
                    letterSpacing={5.5}
                    opacity={0.95}
                  >
                    MILKY WAY · GALACTIC PLANE
                  </text>
                  {/* leader tick back toward the band */}
                  <line x1={0} y1={-14} x2={0} y2={-72} stroke={MILKY} strokeOpacity={0.5} strokeWidth={1} />
                </g>
              );
            })()}

            {/* Protractor (azimuth instrument, top-left) */}
            <g transform={`translate(${PROT.x} ${PROT.y})`} opacity={chartFade}>
              {/* outer ring */}
              <circle r={PROT.r} fill="none" stroke={BRASS} strokeOpacity={0.65} strokeWidth={1.2} />
              <circle r={PROT.r - 8} fill="none" stroke={BRASS} strokeOpacity={0.3} strokeWidth={1} />
              {/* ticks */}
              {BEARING_TICKS.map((deg) => {
                const a = ((deg - 90) * Math.PI) / 180;
                const r1 = PROT.r;
                const r2 = PROT.r - (deg % 30 === 0 ? 14 : 7);
                const x1 = Math.cos(a) * r1;
                const y1 = Math.sin(a) * r1;
                const x2 = Math.cos(a) * r2;
                const y2 = Math.sin(a) * r2;
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={BRASS}
                    strokeOpacity={deg % 30 === 0 ? 0.9 : 0.5}
                    strokeWidth={deg % 90 === 0 ? 1.6 : 1}
                  />
                );
              })}
              {/* cardinal letters */}
              {([
                ["N", 0, -PROT.r + 24],
                ["E", PROT.r - 24, 0],
                ["S", 0, PROT.r - 20],
                ["W", -PROT.r + 24, 0],
              ] as const).map(([t, x, y]) => (
                <text
                  key={t}
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={BRASS}
                  fontFamily={inter}
                  fontSize={13}
                  fontWeight={600}
                  letterSpacing={2}
                >
                  {t}
                </text>
              ))}
              {/* needle */}
              <g transform={`rotate(${needleAngle})`}>
                <polygon points="-5,10 0,-70 5,10" fill={BRASS} />
                <polygon points="-4,10 0,34 4,10" fill="#8A6C40" />
                <circle r={5} fill={INK} stroke={BRASS} strokeWidth={1.5} />
              </g>
              {/* readout */}
              <g transform={`translate(0 ${PROT.r + 32})`}>
                <text
                  textAnchor="middle"
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={4}
                  fontWeight={500}
                >
                  BEARING
                </text>
                <text
                  textAnchor="middle"
                  y={24}
                  fill={BRASS}
                  fontFamily={playfair}
                  fontStyle="italic"
                  fontSize={22}
                  fontWeight={500}
                >
                  {`${((90 + needleAngle + 360) % 360).toFixed(1)}°`}
                </text>
              </g>
            </g>

            {/* Scale bar bottom-right */}
            <g
              transform={`translate(${MAP_W - 190} ${MAP_H - 36})`}
              stroke={GRAY}
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={3}
              fontWeight={500}
              opacity={chartFade}
            >
              <line x1={0} y1={0} x2={120} y2={0} strokeWidth={1.2} />
              <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
              <line x1={60} y1={-3} x2={60} y2={3} strokeWidth={1.2} />
              <line x1={120} y1={-5} x2={120} y2={5} strokeWidth={1.2} />
              <text x={132} y={4} stroke="none">
                10°
              </text>
            </g>
          </g>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · DUNG-BALL TRACK LOCKED TO GALACTIC MERIDIAN</text>
          <text x={FRAME.w} textAnchor="end" fill={BRASS} opacity={0.9}>
            PLANETARIUM CONTROL · DACKE ET AL. 2013
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
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: BRASS,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Celestial Navigator</span>
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
          The beetle who
          <br />
          read the galaxy.
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
          Under a moonless southern sky,{" "}
          <span style={{ color: MILKY, fontWeight: 600 }}>Scarabaeus satyrus</span>{" "}
          rolls its dung ball in a dead-straight line by orienting to the{" "}
          <span style={{ color: BRASS, fontWeight: 600 }}>Milky Way</span> —
          the first invertebrate shown to steer by a galaxy. Black out the band
          in a planetarium and the track collapses to random.
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
          <span style={{ color: BRASS }}>●</span> Compass = Galaxy
        </span>
      </div>
    </AbsoluteFill>
  );
};
