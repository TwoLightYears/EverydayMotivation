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

// Palette — drawn from the real scene (beetle, dung, night sky, Milky Way)
const INK = "#06080F";
const NAVY = "#131A2E";
const NAVY_DEEP = "#0A0F1E";
const AMBER = "#E8CF8E";
const CREAM = "#F3E6B6";
const STAR_BLUE = "#5E7FB0";
const GRAY = "#8A8F99";
const GRID = "#1A2238";
const GRID_MAJOR = "#242D48";

// Page layout
const FRAME = { x: 60, y: 130, w: 960, h: 711 };

// ── Deterministic PRNG ──────────────────────────────────────────────
const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Milky Way band centerline (panel coords, panel = 960 × 711) ─────
// Diagonal from upper-left down to lower-right, clear of the planetarium
// disc (upper-right) so the two instruments don't compete.
const BAND = {
  // In coords relative to the panel's top-left (0..960, 0..711)
  p0: { x: 70, y: 110 },
  p1: { x: 980, y: 690 },
};
const BAND_DX = BAND.p1.x - BAND.p0.x;
const BAND_DY = BAND.p1.y - BAND.p0.y;
const BAND_LEN = Math.hypot(BAND_DX, BAND_DY);
const BAND_NX = -BAND_DY / BAND_LEN;
const BAND_NY = BAND_DX / BAND_LEN;

type Star = {
  x: number;
  y: number;
  r: number;
  base: number; // base brightness 0..1
  color: string;
  twinkle: number; // phase 0..1
  twinkleAmp: number;
  twinkleRate: number;
};

// ── Background star field ───────────────────────────────────────────
const BG_STARS: Star[] = (() => {
  const rnd = mulberry32(42);
  const stars: Star[] = [];
  const count = 240;
  for (let i = 0; i < count; i++) {
    const x = rnd() * 960;
    const y = rnd() * 711;
    // Suppress bg density near the band so the galaxy reads cleanly
    const bx = x - BAND.p0.x;
    const by = y - BAND.p0.y;
    const u = (bx * BAND_DX + by * BAND_DY) / (BAND_LEN * BAND_LEN);
    const perp = Math.abs(bx * BAND_NX + by * BAND_NY);
    const nearBand = u > -0.05 && u < 1.05 && perp < 70;
    if (nearBand && rnd() < 0.55) continue;
    const u2 = rnd();
    const r = u2 < 0.75 ? 0.6 + rnd() * 0.5 : 1.0 + rnd() * 0.8;
    const base = u2 < 0.75 ? 0.25 + rnd() * 0.3 : 0.5 + rnd() * 0.45;
    const colorRoll = rnd();
    const color =
      colorRoll < 0.1
        ? AMBER
        : colorRoll < 0.3
        ? CREAM
        : colorRoll < 0.55
        ? STAR_BLUE
        : "#DDE3ED";
    stars.push({
      x,
      y,
      r,
      base,
      color,
      twinkle: rnd(),
      twinkleAmp: 0.2 + rnd() * 0.25,
      twinkleRate: 0.4 + rnd() * 0.9,
    });
  }
  return stars;
})();

// ── Milky Way band stars (dense along the diagonal) ─────────────────
const BAND_STARS: Star[] = (() => {
  const rnd = mulberry32(1337);
  const stars: Star[] = [];
  const count = 520;
  for (let i = 0; i < count; i++) {
    const t = rnd();
    // Gaussian-ish perpendicular offset using Box-Muller
    const u = rnd();
    const v = rnd();
    const g = Math.sqrt(-2 * Math.log(Math.max(1e-6, u))) * Math.cos(2 * Math.PI * v);
    const perp = g * 36; // sigma 36 px
    const cx = BAND.p0.x + t * BAND_DX;
    const cy = BAND.p0.y + t * BAND_DY;
    const x = cx + perp * BAND_NX;
    const y = cy + perp * BAND_NY;
    if (x < -10 || x > 970 || y < -10 || y > 721) continue;
    const bright = rnd();
    const r = bright < 0.6 ? 0.5 + rnd() * 0.5 : bright < 0.9 ? 0.9 + rnd() * 0.6 : 1.5 + rnd() * 0.9;
    const base = bright < 0.6 ? 0.25 + rnd() * 0.3 : bright < 0.9 ? 0.5 + rnd() * 0.35 : 0.75 + rnd() * 0.25;
    const colorRoll = rnd();
    const color =
      colorRoll < 0.45 ? CREAM : colorRoll < 0.8 ? AMBER : "#FFF1C9";
    stars.push({
      x,
      y,
      r,
      base,
      color,
      twinkle: rnd(),
      twinkleAmp: 0.15 + rnd() * 0.3,
      twinkleRate: 0.4 + rnd() * 1.0,
    });
  }
  return stars;
})();

// A handful of named "hero" stars used as compass cues, including the
// target star the beetle is heading toward.
const TARGET_STAR = { x: 480, y: 360 }; // sits inside the Milky Way band
const HERO_STARS = [
  { ...TARGET_STAR, r: 2.6 },
  { x: 300, y: 215, r: 2.2 },
  { x: 160, y: 325, r: 2.0 },
  { x: 630, y: 465, r: 2.1 },
];

// Beetle anchor (panel coords) — dung ball centre
const BEETLE = { x: 290, y: 630 };
const BALL_R = 38;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = frame / fps;

  // Phased reveals
  const starsIn = interpolate(T, [0.2, 1.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bandIn = interpolate(T, [0.5, 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const discIn = interpolate(T, [1.0, 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const horizonIn = interpolate(T, [1.4, 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beetleIn = interpolate(T, [1.7, 2.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bearingIn = interpolate(T, [2.3, 3.4], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 0.9,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(T, [2.7, 3.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const insetIn = interpolate(T, [3.5, 4.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle live motion after the piece has settled
  const liveT = Math.max(0, T - 2.6);
  const beetleAdvance = Math.min(22, liveT * 4); // px of travel right
  const ballRot = (liveT * 70) % 360;
  const bxNow = BEETLE.x + beetleAdvance;
  const byNow = BEETLE.y;

  // ── Render ───────────────────────────────────────────────────────
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
        <span style={{ color: AMBER }}>2026 · 11 · 21</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Panel background: deep navy with vignette */}
          <radialGradient id="sky-vignette" cx="62%" cy="38%" r="75%">
            <stop offset="0%" stopColor={NAVY} stopOpacity={1} />
            <stop offset="55%" stopColor={NAVY_DEEP} stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Faint grid */}
          <pattern
            id="sky-grid"
            x={FRAME.x}
            y={FRAME.y}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke={GRID}
              strokeWidth={1}
              strokeOpacity={0.55}
            />
          </pattern>
          <pattern
            id="sky-grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 192 0 L 0 0 0 192"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
              strokeOpacity={0.6}
            />
          </pattern>

          {/* Milky Way glow strip (soft wash under the stars) */}
          <linearGradient
            id="band-wash"
            gradientUnits="userSpaceOnUse"
            x1={BAND.p0.x}
            y1={BAND.p0.y}
            x2={BAND.p1.x}
            y2={BAND.p1.y}
          >
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.0} />
            <stop offset="30%" stopColor={AMBER} stopOpacity={0.16} />
            <stop offset="55%" stopColor={CREAM} stopOpacity={0.22} />
            <stop offset="80%" stopColor={AMBER} stopOpacity={0.12} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0.0} />
          </linearGradient>

          <filter id="band-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="22" />
          </filter>

          <filter id="star-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>

          <radialGradient id="ball-fill" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor={CREAM} stopOpacity={1} />
            <stop offset="45%" stopColor={AMBER} stopOpacity={1} />
            <stop offset="100%" stopColor="#6B4A1E" stopOpacity={1} />
          </radialGradient>

          <radialGradient id="target-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CREAM} stopOpacity={0.8} />
            <stop offset="100%" stopColor={CREAM} stopOpacity={0} />
          </radialGradient>

          {/* Clip to the panel so stars/band never escape the frame */}
          <clipPath id="panel-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Panel background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky-grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky-grid-major)"
        />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2B3550"
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

        {/* Azimuth-marker ("AZ") in the top-left of the panel */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">AZ</text>
          <line
            x1={14}
            y1={6}
            x2={14}
            y2={24}
            stroke={GRAY}
            strokeWidth={1.2}
          />
          <polygon points={`11,9 14,2 17,9`} fill={AMBER} />
        </g>

        {/* Scale bar: degrees of arc rather than km */}
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
          <line x1={0} y1={0} x2={110} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={55} y1={-3} x2={55} y2={3} strokeWidth={1.2} />
          <line x1={110} y1={-5} x2={110} y2={5} strokeWidth={1.2} />
          <text x={120} y={4} stroke="none">
            30°
          </text>
        </g>

        {/* === Everything astronomical is clipped to the panel === */}
        <g clipPath="url(#panel-clip)">
          <g transform={`translate(${FRAME.x}, ${FRAME.y})`}>
            {/* Milky Way soft wash */}
            <g opacity={bandIn}>
              <ellipse
                cx={(BAND.p0.x + BAND.p1.x) / 2}
                cy={(BAND.p0.y + BAND.p1.y) / 2}
                rx={BAND_LEN * 0.56}
                ry={85}
                transform={`rotate(${
                  (Math.atan2(BAND_DY, BAND_DX) * 180) / Math.PI
                } ${(BAND.p0.x + BAND.p1.x) / 2} ${(BAND.p0.y + BAND.p1.y) / 2})`}
                fill="url(#band-wash)"
                filter="url(#band-blur)"
              />
            </g>

            {/* Background stars */}
            <g opacity={starsIn}>
              {BG_STARS.map((s, i) => {
                const twinkle =
                  0.85 +
                  s.twinkleAmp *
                    Math.sin(2 * Math.PI * (s.twinkle + T * s.twinkleRate));
                const op = Math.min(1, s.base * twinkle);
                return (
                  <circle
                    key={`bg-${i}`}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={s.color}
                    opacity={op}
                  />
                );
              })}
            </g>

            {/* Milky Way stars */}
            <g opacity={bandIn}>
              {BAND_STARS.map((s, i) => {
                const twinkle =
                  0.85 +
                  s.twinkleAmp *
                    Math.sin(2 * Math.PI * (s.twinkle + T * s.twinkleRate));
                const op = Math.min(1, s.base * twinkle);
                return (
                  <circle
                    key={`mw-${i}`}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={s.color}
                    opacity={op}
                  />
                );
              })}
            </g>

            {/* Hero stars (slightly glowing) */}
            <g opacity={bandIn}>
              {HERO_STARS.map((s, i) => (
                <g key={`hero-${i}`}>
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={s.r * 4}
                    fill={CREAM}
                    opacity={0.14}
                    filter="url(#star-glow)"
                  />
                  <circle cx={s.x} cy={s.y} r={s.r} fill={CREAM} />
                </g>
              ))}
            </g>

            {/* Target-star pulse (gentle breathing) */}
            <g opacity={bearingIn}>
              {(() => {
                const puls = 0.55 + 0.45 * Math.sin(T * 1.6);
                return (
                  <>
                    <circle
                      cx={TARGET_STAR.x}
                      cy={TARGET_STAR.y}
                      r={16 + puls * 4}
                      fill="url(#target-glow)"
                    />
                    <circle
                      cx={TARGET_STAR.x}
                      cy={TARGET_STAR.y}
                      r={3.6}
                      fill="#FFFFFF"
                    />
                    <text
                      x={TARGET_STAR.x + 14}
                      y={TARGET_STAR.y - 10}
                      fill={AMBER}
                      fontFamily={inter}
                      fontSize={10.5}
                      letterSpacing={3.2}
                      fontWeight={600}
                    >
                      GAL. CUE
                    </text>
                  </>
                );
              })()}
            </g>

            {/* ── Planetarium disc (upper-right) ───────────────────── */}
            {/* An instrument overlay: its own dark fill so the sky stars
                don't bleed through its face. Shows bearing cues only. */}
            {(() => {
              const DC = { x: 800, y: 260 };
              const DR = 130;
              // The beetle's measured heading in disc azimuth (0 = N, clockwise)
              const brg = 42;
              const brgRad = (brg * Math.PI) / 180;
              return (
                <g
                  transform={`translate(${DC.x}, ${DC.y})`}
                  opacity={discIn}
                >
                  {/* Dark disc face — layered under the ticks */}
                  <circle
                    r={DR + 4}
                    fill={NAVY_DEEP}
                    fillOpacity={0.75}
                  />
                  {/* Outer ring */}
                  <circle
                    r={DR}
                    fill="none"
                    stroke={GRAY}
                    strokeWidth={1.1}
                    strokeOpacity={0.55}
                  />
                  <circle
                    r={DR - 7}
                    fill="none"
                    stroke={GRAY}
                    strokeWidth={0.7}
                    strokeOpacity={0.3}
                  />
                  <circle
                    r={DR * 0.62}
                    fill="none"
                    stroke={GRAY}
                    strokeWidth={0.5}
                    strokeOpacity={0.2}
                    strokeDasharray="2 5"
                  />
                  {/* Cross-hair */}
                  <line
                    x1={-DR}
                    y1={0}
                    x2={DR}
                    y2={0}
                    stroke={GRAY}
                    strokeOpacity={0.14}
                    strokeWidth={0.5}
                  />
                  <line
                    x1={0}
                    y1={-DR}
                    x2={0}
                    y2={DR}
                    stroke={GRAY}
                    strokeOpacity={0.14}
                    strokeWidth={0.5}
                  />

                  {/* Bearing ticks every 5°, longer at every 30° */}
                  {Array.from({ length: 72 }, (_, i) => {
                    const a = (i * 5 * Math.PI) / 180;
                    const major = i % 6 === 0;
                    const len = major ? 9 : 4.5;
                    const r1 = DR;
                    const r2 = DR + len;
                    return (
                      <line
                        key={`tk-${i}`}
                        x1={Math.sin(a) * r1}
                        y1={-Math.cos(a) * r1}
                        x2={Math.sin(a) * r2}
                        y2={-Math.cos(a) * r2}
                        stroke={major ? AMBER : GRAY}
                        strokeOpacity={major ? 0.85 : 0.5}
                        strokeWidth={major ? 1.1 : 0.7}
                      />
                    );
                  })}

                  {/* Cardinals */}
                  {[
                    { deg: 0, text: "N" },
                    { deg: 90, text: "E" },
                    { deg: 180, text: "S" },
                    { deg: 270, text: "W" },
                  ].map((c) => {
                    const a = (c.deg * Math.PI) / 180;
                    const r = DR + 24;
                    return (
                      <text
                        key={`card-${c.text}`}
                        x={Math.sin(a) * r}
                        y={-Math.cos(a) * r + 4}
                        textAnchor="middle"
                        fill={AMBER}
                        fontFamily={inter}
                        fontSize={12}
                        letterSpacing={3}
                        fontWeight={600}
                      >
                        {c.text}
                      </text>
                    );
                  })}

                  {/* Degree numerals at every 30° (except cardinals) */}
                  {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
                    const a = (deg * Math.PI) / 180;
                    const r = DR + 22;
                    return (
                      <text
                        key={`dg-${deg}`}
                        x={Math.sin(a) * r}
                        y={-Math.cos(a) * r + 3}
                        textAnchor="middle"
                        fill={GRAY}
                        fontFamily={inter}
                        fontSize={9}
                        letterSpacing={2}
                        fontWeight={500}
                      >
                        {deg}
                      </text>
                    );
                  })}

                  {/* Bearing needle — points at the beetle's heading */}
                  {(() => {
                    const rTip = DR - 6;
                    const sx = Math.sin(brgRad);
                    const cy = -Math.cos(brgRad);
                    const tx = sx * rTip;
                    const ty = cy * rTip;
                    const bx = -sx * (DR * 0.35);
                    const by = -cy * (DR * 0.35);
                    const px = -cy;
                    const py = sx;
                    const headBack = 12;
                    const headWide = 6;
                    const h1x = tx - sx * headBack + px * headWide;
                    const h1y = ty - cy * headBack + py * headWide;
                    const h2x = tx - sx * headBack - px * headWide;
                    const h2y = ty - cy * headBack - py * headWide;
                    return (
                      <g>
                        <line
                          x1={bx}
                          y1={by}
                          x2={tx}
                          y2={ty}
                          stroke={AMBER}
                          strokeWidth={1.8}
                        />
                        <polygon
                          points={`${tx},${ty} ${h1x},${h1y} ${h2x},${h2y}`}
                          fill={AMBER}
                        />
                      </g>
                    );
                  })()}

                  {/* Centre pivot */}
                  <circle r={3} fill={INK} stroke={AMBER} strokeWidth={1.2} />

                  {/* Bearing readout */}
                  <text
                    x={0}
                    y={DR + 44}
                    textAnchor="middle"
                    fill={AMBER}
                    fontFamily={inter}
                    fontSize={11}
                    letterSpacing={4}
                    fontWeight={600}
                  >
                    BEARING {brg.toString().padStart(3, "0")}°
                  </text>

                  {/* Disc title */}
                  <text
                    x={0}
                    y={-DR - 28}
                    textAnchor="middle"
                    fill={GRAY}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={4}
                    fontWeight={600}
                  >
                    AZIMUTH DIAL · 23 : 14 LT
                  </text>
                </g>
              );
            })()}

            {/* ── Horizon + beetle silhouette ──────────────────────── */}
            <g>
              {/* Ground wash below horizon — a subtle darker band so the
                  beetle reads against a slightly different value. */}
              <rect
                x={0}
                y={670}
                width={960}
                height={41}
                fill={INK}
                opacity={0.75 * horizonIn}
              />
              {/* Horizon line */}
              <line
                x1={0}
                y1={670}
                x2={960}
                y2={670}
                stroke={AMBER}
                strokeWidth={0.8}
                strokeOpacity={0.55 * horizonIn}
                strokeDasharray="6 7"
              />
              <text
                x={16}
                y={662}
                fill={GRAY}
                opacity={0.7 * horizonIn}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3}
                fontWeight={500}
              >
                HORIZON
              </text>

              {/* Bearing dashed line from beetle up to the target star */}
              {(() => {
                const bx = bxNow + 4;
                const by = byNow - 20; // top of ball
                const tx = TARGET_STAR.x;
                const ty = TARGET_STAR.y;
                const dx = tx - bx;
                const dy = ty - by;
                const len = Math.hypot(dx, dy);
                const ux = dx / len;
                const uy = dy / len;
                const draw = bearingIn * len;
                const drawnTx = bx + ux * draw;
                const drawnTy = by + uy * draw;
                return (
                  <g opacity={bearingIn}>
                    <line
                      x1={bx}
                      y1={by}
                      x2={drawnTx}
                      y2={drawnTy}
                      stroke={AMBER}
                      strokeWidth={1.2}
                      strokeDasharray="3 5"
                    />
                  </g>
                );
              })()}

              {/* Beetle + dung ball */}
              <g opacity={beetleIn}>
                {/* Ball (rotating texture via internal strokes) */}
                <g transform={`translate(${bxNow}, ${byNow})`}>
                  <circle
                    r={BALL_R + 2}
                    fill={INK}
                    opacity={0.55}
                  />
                  <circle r={BALL_R} fill="url(#ball-fill)" />
                  <g
                    transform={`rotate(${ballRot})`}
                    stroke="#8B5E22"
                    strokeWidth={1}
                    fill="none"
                    opacity={0.55}
                  >
                    <path d={`M -${BALL_R * 0.8} -${BALL_R * 0.3} Q 0 -${BALL_R * 0.1}, ${BALL_R * 0.8} -${BALL_R * 0.35}`} />
                    <path d={`M -${BALL_R * 0.7} ${BALL_R * 0.3} Q 0 ${BALL_R * 0.55}, ${BALL_R * 0.75} ${BALL_R * 0.25}`} />
                    <circle cx={-6} cy={-8} r={2} fill="#8B5E22" opacity={0.6} />
                    <circle cx={5} cy={4} r={1.5} fill="#8B5E22" opacity={0.6} />
                    <circle cx={-2} cy={9} r={1.3} fill="#8B5E22" opacity={0.6} />
                  </g>
                  <circle
                    cx={-6}
                    cy={-8}
                    r={5}
                    fill={CREAM}
                    opacity={0.45}
                  />
                </g>

                {/* Beetle body — scaled hero silhouette. In the canonical
                    Scarabaeus pose, the beetle stands head-down on its
                    forelegs and shoves the ball with its hind legs. */}
                {(() => {
                  const cx = bxNow + BALL_R + 36;
                  const cy = byNow + 8;
                  const BODY = "#121623";
                  const BODY_DEEP = "#080B14";
                  return (
                    <g transform={`translate(${cx}, ${cy}) rotate(-14) scale(1.65)`}>
                      {/* Legs */}
                      <g
                        stroke={BODY_DEEP}
                        strokeWidth={2.0}
                        strokeLinecap="round"
                        fill="none"
                      >
                        {/* Mid legs */}
                        <path d="M -8 3 Q -20 12, -26 22" />
                        <path d="M 2 5 Q 4 16, -2 24" />
                        {/* Hind legs — bracing against ground, pushing ball */}
                        <path d="M 14 3 Q 22 12, 26 24" />
                        <path d="M 18 5 Q 28 16, 32 26" />
                        {/* Fore legs — down into the ground, head-down posture */}
                        <path d="M -6 -4 Q -22 0, -30 8" />
                        <path d="M 10 -4 Q 24 -4, 30 2" />
                      </g>
                      {/* Pronotum + head */}
                      <ellipse cx={-14} cy={-2} rx={9} ry={7} fill={BODY} />
                      <ellipse cx={-22} cy={-2} rx={4} ry={3.2} fill={BODY} />
                      {/* Mandibles */}
                      <path
                        d="M -25 -4 L -29 -5"
                        stroke={BODY_DEEP}
                        strokeWidth={1.1}
                        strokeLinecap="round"
                      />
                      <path
                        d="M -25 0 L -29 1"
                        stroke={BODY_DEEP}
                        strokeWidth={1.1}
                        strokeLinecap="round"
                      />
                      {/* Elytra — body ellipse */}
                      <ellipse cx={8} cy={-1} rx={19} ry={13} fill={BODY} />
                      {/* Elytral midline */}
                      <line
                        x1={-5}
                        y1={-1}
                        x2={25}
                        y2={-1}
                        stroke={BODY_DEEP}
                        strokeWidth={0.8}
                      />
                      {/* Specular starlight rim along dorsal edge */}
                      <path
                        d="M -8 -11 Q 10 -17, 25 -6"
                        stroke={CREAM}
                        strokeOpacity={0.95}
                        strokeWidth={1.3}
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Sub-rim amber bounce (dung ball warmth) */}
                      <path
                        d="M -6 -8 Q 10 -13, 22 -3"
                        stroke={AMBER}
                        strokeOpacity={0.75}
                        strokeWidth={0.8}
                        fill="none"
                      />
                      {/* Head rim */}
                      <path
                        d="M -23 -4 Q -18 -6, -14 -6"
                        stroke={CREAM}
                        strokeOpacity={0.55}
                        strokeWidth={0.8}
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Pronotum rim */}
                      <path
                        d="M -17 -7 Q -12 -9, -7 -8"
                        stroke={CREAM}
                        strokeOpacity={0.55}
                        strokeWidth={0.8}
                        fill="none"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })()}

                {/* Ground contact shadow for both ball and beetle */}
                <ellipse
                  cx={bxNow + 20}
                  cy={byNow + BALL_R + 6}
                  rx={BALL_R * 1.8}
                  ry={5}
                  fill={INK}
                  opacity={0.7}
                />

                {/* Beetle species label — inside the horizon ground band */}
                <g
                  opacity={0.9}
                  transform={`translate(${bxNow - 60}, ${byNow + BALL_R + 20})`}
                >
                  <text
                    fill={AMBER}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={3.2}
                    fontWeight={600}
                  >
                    SCARABAEUS SATYRUS
                  </text>
                  <text
                    y={14}
                    fill={GRAY}
                    opacity={0.75}
                    fontFamily={inter}
                    fontSize={9}
                    letterSpacing={2.2}
                    fontWeight={500}
                  >
                    S. AFRICAN DUNG BEETLE
                  </text>
                </g>
              </g>

              {/* Inset — looping-vs-straight path comparison. Placed at
                  lower-right of the panel on open sky, below the disc. */}
              {(() => {
                const IX = 670;
                const IY = 500;
                const IW = 280;
                const IH = 150;
                const COL_W = IW / 2;
                return (
                  <g opacity={insetIn} transform={`translate(${IX}, ${IY})`}>
                    {/* Backing */}
                    <rect
                      width={IW}
                      height={IH}
                      rx={2}
                      fill={NAVY_DEEP}
                      fillOpacity={0.82}
                      stroke={GRAY}
                      strokeOpacity={0.4}
                      strokeWidth={0.9}
                    />
                    {/* Title band */}
                    <text
                      x={12}
                      y={-8}
                      fill={GRAY}
                      fontFamily={inter}
                      fontSize={9.5}
                      letterSpacing={3.2}
                      fontWeight={600}
                    >
                      FIG. a · PATH STRAIGHTNESS r̄
                    </text>

                    {/* Column divider */}
                    <line
                      x1={COL_W}
                      y1={14}
                      x2={COL_W}
                      y2={IH - 14}
                      stroke={GRAY}
                      strokeOpacity={0.25}
                      strokeWidth={0.6}
                    />

                    {/* Left column — CAP ON (looping) */}
                    <g transform="translate(0, 0)">
                      <text
                        x={14}
                        y={22}
                        fill={GRAY}
                        fontFamily={inter}
                        fontSize={9.5}
                        letterSpacing={2.6}
                        fontWeight={600}
                      >
                        CAP ON
                      </text>
                      <text
                        x={14}
                        y={36}
                        fill={GRAY}
                        opacity={0.65}
                        fontFamily={inter}
                        fontSize={8.5}
                        letterSpacing={1.6}
                        fontWeight={500}
                      >
                        no sky cue
                      </text>
                      <g transform="translate(70, 85)">
                        {/* Start marker */}
                        <circle r={2.5} fill={AMBER} />
                        {/* Looping path */}
                        <path
                          d="M 0 0 C -10 -14, -26 -6, -18 10 S 12 14, 10 -2 -4 -18, -14 -10 -6 6, 4 -4"
                          stroke={CREAM}
                          strokeOpacity={0.7}
                          strokeWidth={1.3}
                          fill="none"
                          strokeLinecap="round"
                        />
                      </g>
                      <text
                        x={14}
                        y={IH - 14}
                        fill={GRAY}
                        opacity={0.8}
                        fontFamily={inter}
                        fontSize={9}
                        letterSpacing={2}
                        fontWeight={500}
                      >
                        r̄ = 0.17
                      </text>
                    </g>

                    {/* Right column — CAP OFF (straight) */}
                    <g transform={`translate(${COL_W}, 0)`}>
                      <text
                        x={14}
                        y={22}
                        fill={AMBER}
                        fontFamily={inter}
                        fontSize={9.5}
                        letterSpacing={2.6}
                        fontWeight={600}
                      >
                        CAP OFF
                      </text>
                      <text
                        x={14}
                        y={36}
                        fill={GRAY}
                        opacity={0.65}
                        fontFamily={inter}
                        fontSize={8.5}
                        letterSpacing={1.6}
                        fontWeight={500}
                      >
                        Milky Way visible
                      </text>
                      <g transform="translate(70, 115)">
                        <circle r={2.5} fill={AMBER} />
                        {/* Straight path upward */}
                        <line
                          x1={0}
                          y1={0}
                          x2={0}
                          y2={-60}
                          stroke={CREAM}
                          strokeWidth={1.6}
                        />
                        <polygon
                          points="-4,-54 0,-66 4,-54"
                          fill={CREAM}
                        />
                      </g>
                      <text
                        x={14}
                        y={IH - 14}
                        fill={AMBER}
                        opacity={0.95}
                        fontFamily={inter}
                        fontSize={9}
                        letterSpacing={2}
                        fontWeight={600}
                      >
                        r̄ = 0.86
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>
          </g>
        </g>

        {/* Caption strip just below the panel */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · DUNG-BEETLE HEADING UNDER THE MILKY WAY</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={AMBER}
            opacity={0.85}
          >
            FIRST NON-HUMAN GALACTIC COMPASS
          </text>
        </g>
      </svg>

      {/* Type lockup */}
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
            [16, 0]
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
            Celestial Navigator
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.96,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The beetle that steers
          <br />
          by the galaxy.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Under a planetarium sky,{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          — a nocturnal African dung beetle — rolls its ball in a straight
          line only when the diffuse band of the Milky Way is overhead; the
          first non-human animal documented to navigate by our galaxy.
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
          <span style={{ color: AMBER }}>●</span> Beetle{" "}
          <span style={{ color: GRAY, margin: "0 6px" }}>/</span>
          <span style={{ color: CREAM }}>◇</span> Galactic cue
        </span>
      </div>
    </AbsoluteFill>
  );
};
