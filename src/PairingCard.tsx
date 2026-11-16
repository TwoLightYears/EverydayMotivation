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

// ── Palette — from the concept's visual brief ─────────────────────────
const NIGHT_DEEP = "#040611";
const NIGHT = "#0F1A38";
const HORIZON_BLUE = "#1A2A52";
const DUST = "#D9C089";
const DUST_DEEP = "#8E6F3E";
const STAR = "#EDEAD6";
const STAR_BLUE = "#9FB5DE";
const BRONZE = "#C18B4A";
const BRONZE_HIGH = "#E8BE86";
const GRAY = "#6E7792";
const GRID = "#1D2742";
const INK = "#07090F";

// ── Seeded PRNG so the star field is identical every render ──────────
const makeRand = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= (t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Milky Way axis (sky coords 1080 × 850) ────────────────────────────
// Quadratic Bézier from lower-left, bulging through the galactic-center
// area, exiting upper-right.
type P = { x: number; y: number };
const BAND_FROM: P = { x: -80, y: 780 };
const BAND_CTRL: P = { x: 440, y: 470 };
const BAND_TO: P = { x: 1180, y: 60 };

const bezPoint = (p0: P, p1: P, p2: P, t: number): P => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
};
const bezTangent = (p0: P, p1: P, p2: P, t: number): P => ({
  x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
  y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
});
const bezNormal = (p0: P, p1: P, p2: P, t: number): P => {
  const tan = bezTangent(p0, p1, p2, t);
  const len = Math.hypot(tan.x, tan.y);
  return { x: -tan.y / len, y: tan.x / len };
};
const bezLen = (p0: P, p1: P, p2: P): number => {
  let L = 0;
  let prev = p0;
  for (let i = 1; i <= 64; i++) {
    const q = bezPoint(p0, p1, p2, i / 64);
    L += Math.hypot(q.x - prev.x, q.y - prev.y);
    prev = q;
  }
  return L;
};

const bandPath = `M ${BAND_FROM.x} ${BAND_FROM.y} Q ${BAND_CTRL.x} ${BAND_CTRL.y} ${BAND_TO.x} ${BAND_TO.y}`;

// ── Star field ────────────────────────────────────────────────────────
type Star = { x: number; y: number; r: number; color: string; phase: number; mag: number };
const makeStars = (): Star[] => {
  const rand = makeRand(1729);
  const stars: Star[] = [];
  const target = 360;
  let attempts = 0;
  while (stars.length < target && attempts < 2000) {
    attempts++;
    const inBand = rand() < 0.62;
    let x: number, y: number;
    if (inBand) {
      const t = rand();
      const pt = bezPoint(BAND_FROM, BAND_CTRL, BAND_TO, t);
      const n = bezNormal(BAND_FROM, BAND_CTRL, BAND_TO, t);
      const width = 150 + 70 * Math.sin(t * Math.PI);
      const g = (rand() + rand() + rand() - 1.5) * 0.9; // ~Gaussian
      const d = g * width;
      x = pt.x + n.x * d;
      y = pt.y + n.y * d;
    } else {
      x = rand() * 1120 - 20;
      y = rand() * 700 - 10; // avoid putting stars below horizon
    }
    if (x < -10 || x > 1090 || y < -10 || y > 680) continue;
    const sz = rand();
    let r: number, mag: number;
    if (sz > 0.988) {
      r = 2.8;
      mag = 1.0;
    } else if (sz > 0.95) {
      r = 1.9;
      mag = 0.95;
    } else if (sz > 0.8) {
      r = 1.3;
      mag = 0.82;
    } else if (sz > 0.5) {
      r = 0.85;
      mag = 0.68;
    } else {
      r = 0.55;
      mag = 0.5;
    }
    const col = rand();
    const color = col > 0.9 ? STAR_BLUE : STAR;
    stars.push({ x, y, r, color, phase: rand() * Math.PI * 2, mag });
  }
  return stars;
};
const STARS = makeStars();

// Hand-placed bright "notable" stars near the galactic center.
const TARGET: P = { x: 710, y: 275 };
const NAMED_STARS: { p: P; r: number; alpha?: number }[] = [
  { p: { x: 622, y: 350 }, r: 2.1 },
  { p: { x: 780, y: 215 }, r: 2.0 },
  { p: { x: 548, y: 270 }, r: 1.9 },
  { p: { x: 835, y: 310 }, r: 2.2 },
  { p: { x: 405, y: 430 }, r: 1.9 },
  { p: { x: 905, y: 170 }, r: 2.0 },
  { p: { x: 275, y: 525 }, r: 1.8 },
  { p: { x: 985, y: 240 }, r: 1.7 },
];

// ── Bearing arc from beetle anchor to target star ─────────────────────
const BEETLE_ANCHOR: P = { x: 400, y: 660 };
const BEARING_CTRL: P = { x: 480, y: 465 };
const BEARING_END: P = { x: TARGET.x, y: TARGET.y + 8 };
const BEARING_PATH = `M ${BEETLE_ANCHOR.x} ${BEETLE_ANCHOR.y} Q ${BEARING_CTRL.x} ${BEARING_CTRL.y} ${BEARING_END.x} ${BEARING_END.y}`;
const BEARING_LEN = bezLen(BEETLE_ANCHOR, BEARING_CTRL, BEARING_END);

// Tick positions along the bearing arc (0..1 along t) — like sextant graduations
const BEARING_TICKS: number[] = [0.18, 0.34, 0.5, 0.66, 0.82];

// ── Beetle silhouette ────────────────────────────────────────────────
// Scarabaeus satyrus in the characteristic rolling stance: head-down,
// rear-up, front legs on the ground, back legs pressed against the ball.
// Origin: ground-contact point. Positive x = forward (toward the ball).
const Beetle: React.FC = () => {
  return (
    <g>
      {/* Ball of dung (to the right, touching the beetle) */}
      <circle
        cx={26}
        cy={-22}
        r={22}
        fill="#16100A"
        stroke={BRONZE}
        strokeWidth={1.3}
      />
      {/* ball moonlight catch on upper-left */}
      <path
        d="M 10 -32 Q 18 -40 26 -42"
        stroke={BRONZE_HIGH}
        strokeWidth={1.3}
        fill="none"
        opacity={0.5}
        strokeLinecap="round"
      />
      {/* ball dimples — rough texture */}
      <circle cx={32} cy={-14} r={1.8} fill="#000" opacity={0.55} />
      <circle cx={36} cy={-28} r={1.4} fill="#000" opacity={0.5} />
      <circle cx={22} cy={-12} r={1.2} fill="#000" opacity={0.5} />
      <circle cx={26} cy={-34} r={1.3} fill="#000" opacity={0.5} />
      <circle cx={16} cy={-22} r={1.1} fill="#000" opacity={0.45} />

      {/* Legs — three pairs, radiating from the body.
          Back legs grip the ball; front legs plant on the ground. */}
      <g stroke={BRONZE} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.9}>
        {/* back pair pressing the ball */}
        <path d="M -8 -14 Q 2 -10 10 -8" />
        <path d="M -8 -22 Q 2 -28 12 -34" opacity={0.75} />
        {/* middle pair — stance legs on ground */}
        <path d="M -16 -12 Q -14 -4 -12 2" />
        <path d="M -16 -26 Q -18 -32 -20 -36" opacity={0.75} />
        {/* front pair — reaching the ground ahead of the head */}
        <path d="M -28 -12 Q -30 -4 -31 2" />
        <path d="M -28 -24 Q -32 -30 -36 -34" opacity={0.75} />
      </g>

      {/* Elytra (wing covers) — the hero shape */}
      <ellipse
        cx={-14}
        cy={-20}
        rx={19}
        ry={12}
        fill="#0C0907"
        stroke={BRONZE}
        strokeWidth={1.3}
      />
      {/* Elytral midline suture */}
      <line
        x1={-30}
        y1={-20}
        x2={4}
        y2={-20}
        stroke={BRONZE}
        strokeWidth={0.6}
        opacity={0.8}
      />
      {/* Pronotum — the shield-shaped section in front of the elytra */}
      <ellipse
        cx={-30}
        cy={-18}
        rx={8}
        ry={8}
        fill="#0C0907"
        stroke={BRONZE}
        strokeWidth={1.2}
      />
      {/* Head — tucked under, as in the pushing stance */}
      <ellipse
        cx={-38}
        cy={-15}
        rx={5}
        ry={4.5}
        fill="#0C0907"
        stroke={BRONZE}
        strokeWidth={1}
      />
      {/* Rim highlight catching starlight along the back of the elytra */}
      <path
        d="M -29 -29 Q -14 -34 4 -26"
        stroke={BRONZE_HIGH}
        strokeWidth={0.9}
        fill="none"
        opacity={0.9}
      />
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timings ──────────────────────────────────────────────────────────
  const skyFade = interpolate(frame, [0, fps * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bandFade = interpolate(frame, [fps * 0.3, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beetleFade = interpolate(frame, [fps * 0.9, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bearingSpring = spring({
    frame: frame - fps * 1.5,
    fps,
    config: { damping: 70, mass: 1.3, stiffness: 55 },
    durationInFrames: fps * 2,
  });
  const reticleOpen = interpolate(bearingSpring, [0.75, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 1.8,
    fps,
    config: { damping: 200, mass: 0.85 },
  });
  const hookFade = interpolate(frame, [fps * 2.3, fps * 3.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout ──────────────────────────────────────────────────────
  // Top metadata band   : 56
  // Chart frame         : 130 .. 890   (w 960, h 760)
  // Type block          : 930 ..
  // Footer              : 1290
  const FRAME = { x: 60, y: 130, w: 960, h: 760 };
  const SKY_W = 1080;
  const SKY_H = 850;
  const scale = FRAME.w / SKY_W; // 0.889
  // (SKY_H * scale = 755.6; chart h is 760 so we leave a few px of bottom padding)

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
        <span style={{ color: DUST }}>2026 · 11 · 16</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={NIGHT_DEEP} />
            <stop offset="0.55" stopColor={NIGHT} />
            <stop offset="1" stopColor={HORIZON_BLUE} />
          </linearGradient>

          <radialGradient id="target-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={STAR} stopOpacity={0.55} />
            <stop offset="55%" stopColor={STAR} stopOpacity={0.12} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>

          {/* Clip everything inside the chart frame so the Milky Way, dust
              lanes and glows don't bleed onto the outer page. */}
          <clipPath id="chart-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Chart ground: dark panel */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky-grad)"
        />

        {/* Inner chart border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1B2238"
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
          <g key={i} stroke={BRONZE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Chart content in scaled sky coords — clipped to chart frame */}
        <g clipPath="url(#chart-clip)">
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* ── Milky Way band ───────────────────────────────────────── */}
          <g opacity={bandFade}>
            <path
              d={bandPath}
              stroke={DUST}
              strokeOpacity={0.035}
              strokeWidth={360}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={bandPath}
              stroke={DUST}
              strokeOpacity={0.06}
              strokeWidth={240}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={bandPath}
              stroke={DUST}
              strokeOpacity={0.1}
              strokeWidth={150}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={bandPath}
              stroke={DUST}
              strokeOpacity={0.17}
              strokeWidth={75}
              fill="none"
              strokeLinecap="round"
            />
            {/* Dust lanes (darker cutout along the band) */}
            <path
              d={`M -30 760 Q 420 500 820 230`}
              stroke={NIGHT_DEEP}
              strokeOpacity={0.6}
              strokeWidth={28}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M 60 740 Q 480 480 1100 110`}
              stroke={NIGHT_DEEP}
              strokeOpacity={0.32}
              strokeWidth={16}
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* ── Faint RA/Dec grid lines, very subtle ─────────────────── */}
          <g stroke={GRID} strokeWidth={0.6} opacity={0.5 * skyFade} fill="none">
            {[135, 270, 405, 540].map((y) => (
              <line key={`h-${y}`} x1={40} y1={y} x2={1040} y2={y} strokeDasharray="2 10" />
            ))}
            {[200, 400, 600, 800].map((x) => (
              <line key={`v-${x}`} x1={x} y1={60} x2={x} y2={660} strokeDasharray="2 10" />
            ))}
          </g>

          {/* ── Field stars ──────────────────────────────────────────── */}
          <g opacity={skyFade}>
            {STARS.map((s, i) => {
              const tw = 0.78 + 0.22 * Math.sin(frame * 0.07 + s.phase);
              return (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill={s.color}
                  opacity={s.mag * tw}
                />
              );
            })}
            {/* Named/bright stars with soft haloes */}
            {NAMED_STARS.map((s, i) => {
              const tw = 0.85 + 0.15 * Math.sin(frame * 0.05 + i * 1.3);
              return (
                <g key={`n-${i}`}>
                  <circle
                    cx={s.p.x}
                    cy={s.p.y}
                    r={s.r * 4}
                    fill={STAR}
                    opacity={0.09 * tw}
                  />
                  <circle cx={s.p.x} cy={s.p.y} r={s.r} fill={STAR} opacity={tw} />
                </g>
              );
            })}

            {/* The target — brighter halo (always present), with a shimmering
                outer glow once the reticle has begun opening. */}
            <circle
              cx={TARGET.x}
              cy={TARGET.y}
              r={54}
              fill="url(#target-halo)"
              opacity={0.55 + 0.2 * reticleOpen}
            />
            <circle cx={TARGET.x} cy={TARGET.y} r={3.6} fill={STAR} />
            <circle
              cx={TARGET.x}
              cy={TARGET.y}
              r={6.2}
              fill="none"
              stroke={STAR}
              strokeOpacity={0.35 + 0.3 * reticleOpen}
              strokeWidth={0.8}
            />
          </g>

          {/* ── Horizon line + degree ticks ──────────────────────────── */}
          <g opacity={skyFade}>
            <line
              x1={30}
              y1={680}
              x2={1050}
              y2={680}
              stroke="#3A476B"
              strokeWidth={1.3}
            />
            {Array.from({ length: 21 }, (_, i) => 30 + i * 51).map((x, i) => {
              const tall = i % 5 === 0;
              return (
                <line
                  key={`tk-${i}`}
                  x1={x}
                  y1={680}
                  x2={x}
                  y2={tall ? 696 : 688}
                  stroke={tall ? GRAY : "#2A3454"}
                  strokeWidth={tall ? 1 : 0.8}
                />
              );
            })}
            {/* Cardinal letters under the ticks */}
            {[
              { x: 30, l: "W" },
              { x: 540, l: "N" },
              { x: 1050, l: "E" },
            ].map((c, i) => (
              <text
                key={`c-${i}`}
                x={c.x}
                y={716}
                textAnchor="middle"
                fill={GRAY}
                fontFamily={inter}
                fontSize={12}
                letterSpacing={3.5}
                fontWeight={600}
              >
                {c.l}
              </text>
            ))}
          </g>

          {/* ── Bearing arc from beetle to target star ──────────────── */}
          <g opacity={beetleFade}>
            {/* Soft outer glow */}
            <path
              d={BEARING_PATH}
              stroke={BRONZE}
              strokeWidth={8}
              fill="none"
              strokeOpacity={0.1}
              strokeLinecap="round"
              strokeDasharray={BEARING_LEN}
              strokeDashoffset={BEARING_LEN * (1 - bearingSpring)}
            />
            {/* Faint guide (fully drawn after reveal) */}
            <path
              d={BEARING_PATH}
              stroke={BRONZE}
              strokeWidth={0.7}
              fill="none"
              strokeOpacity={0.3 * bearingSpring}
              strokeLinecap="round"
            />
            {/* Primary sightline — revealed via dash-offset */}
            <path
              d={BEARING_PATH}
              stroke={BRONZE_HIGH}
              strokeWidth={1.4}
              fill="none"
              strokeOpacity={0.9}
              strokeLinecap="round"
              strokeDasharray={BEARING_LEN}
              strokeDashoffset={BEARING_LEN * (1 - bearingSpring)}
            />
            {/* Graduated ticks along the bearing — appear as the line reaches them */}
            {BEARING_TICKS.map((tT, i) => {
              const alpha = Math.max(
                0,
                Math.min(1, (bearingSpring - tT) * 6),
              );
              if (alpha <= 0) return null;
              const p = bezPoint(BEETLE_ANCHOR, BEARING_CTRL, BEARING_END, tT);
              const n = bezNormal(BEETLE_ANCHOR, BEARING_CTRL, BEARING_END, tT);
              const a = { x: p.x + n.x * 5, y: p.y + n.y * 5 };
              const b = { x: p.x - n.x * 5, y: p.y - n.y * 5 };
              return (
                <line
                  key={`bt-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={BRONZE_HIGH}
                  strokeWidth={1.2}
                  opacity={alpha}
                />
              );
            })}
          </g>

          {/* ── Reticle on the target star ───────────────────────────── */}
          <g
            transform={`translate(${TARGET.x} ${TARGET.y})`}
            opacity={reticleOpen}
          >
            {(() => {
              const R = 26 - 4 * reticleOpen; // closes slightly as it locks
              const gap = 8;
              return (
                <g stroke={BRONZE_HIGH} strokeWidth={1.3} fill="none">
                  {/* Four crosshair arms */}
                  <line x1={-R} y1={0} x2={-gap} y2={0} />
                  <line x1={gap} y1={0} x2={R} y2={0} />
                  <line x1={0} y1={-R} x2={0} y2={-gap} />
                  <line x1={0} y1={gap} x2={0} y2={R} />
                  {/* Circle */}
                  <circle cx={0} cy={0} r={R - 7} strokeOpacity={0.9} />
                  {/* Small graduation ticks on the circle */}
                  {[0, 90, 180, 270].map((deg) => {
                    const rad = (deg * Math.PI) / 180;
                    const r1 = R - 7;
                    const r2 = R - 11;
                    return (
                      <line
                        key={deg}
                        x1={Math.cos(rad) * r1}
                        y1={Math.sin(rad) * r1}
                        x2={Math.cos(rad) * r2}
                        y2={Math.sin(rad) * r2}
                        strokeWidth={1}
                      />
                    );
                  })}
                </g>
              );
            })()}
            {/* Backing plate so the label stays legible over the Milky Way */}
            <rect
              x={26}
              y={-30}
              width={178}
              height={36}
              rx={2}
              fill={NIGHT_DEEP}
              opacity={0.78 * reticleOpen}
              stroke={BRONZE}
              strokeWidth={0.6}
              strokeOpacity={0.5 * reticleOpen}
            />
            <text
              x={34}
              y={-15}
              fill={BRONZE_HIGH}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3.5}
              opacity={reticleOpen}
            >
              GALACTIC CORE
            </text>
            <text
              x={34}
              y={-1}
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              fontWeight={500}
              letterSpacing={2.5}
              opacity={reticleOpen}
            >
              AZ 352° · ALT 54°
            </text>
          </g>

          {/* ── Beetle (and shadow nub at horizon) ──────────────────── */}
          <g
            transform={`translate(${BEETLE_ANCHOR.x} ${BEETLE_ANCHOR.y + 0}) scale(1.35)`}
            opacity={beetleFade}
          >
            {/* small shadow puddle on ground */}
            <ellipse
              cx={5}
              cy={6}
              rx={38}
              ry={3.5}
              fill="#000"
              opacity={0.55}
            />
            <Beetle />
          </g>
        </g>
        </g>

        {/* ── Caption strip just below the chart frame ───────────────── */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>
            FIG. 1 · S. SATYRUS SIGHTING MILKY WAY POLARISATION, MOONLESS SKY
          </text>
          <text x={FRAME.w} textAnchor="end" fill={DUST} opacity={0.85}>
            STRAIGHT-LINE ROLL
          </text>
        </g>
      </svg>

      {/* ── Type lockup ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 935,
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
            color: DUST,
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
            Celestial Navigator
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
          }}
        >
          The beetle who
          <br />
          steers by the galaxy.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookFade,
          }}
        >
          On moonless nights, the African dung beetle{" "}
          <span style={{ color: DUST, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          rolls its ball in a straight line by orienting to the polarisation
          pattern of the Milky Way itself — the first animal known to use the
          galaxy as a compass.
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
          <span style={{ color: BRONZE }}>●</span> Scarabaeus = Dung Beetle
        </span>
      </div>
    </AbsoluteFill>
  );
};
