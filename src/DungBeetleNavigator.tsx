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

// Palette — drawn from the visual brief.
const INK = "#050812";
const STAR_CREAM = "#F3E6C4";
const GALACTIC_BLUE = "#8FA1C7";
const EARTH = "#C1855B";
const AMBER = "#E9B84A";
const GRAY = "#7A8091";
const FAINT = "#1A1F2C";

// Deterministic PRNG so star positions render identically every frame.
const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Sky geometry ───────────────────────────────────────────────────────────
// Portrait canvas: 1080 × 1350. The sky panel occupies 130..900.
// The Milky Way spine is a straight line tilted by GALACTIC_ANGLE from
// horizontal; every star, bearing mark, and the beetle's course share this
// axis. This is the pairing's central visual argument.
const SKY = { x: 60, y: 130, w: 960, h: 770 };
const GALACTIC_ANGLE_DEG = -32; // rises toward upper-right
const GALACTIC_ANGLE = (GALACTIC_ANGLE_DEG * Math.PI) / 180;
const SIN_G = Math.sin(GALACTIC_ANGLE);
const COS_G = Math.cos(GALACTIC_ANGLE);

// Anchor point roughly at the Milky Way's brightest core within the sky
// panel (upper-third rule; sits well above the beetle's launch point).
const CORE = { x: SKY.x + 640, y: SKY.y + 300 };

// Distance from a point to the galactic spine that passes through CORE.
const perpDist = (x: number, y: number) => {
  return Math.abs(-SIN_G * (x - CORE.x) + COS_G * (y - CORE.y));
};
// Signed distance along the spine (used to fade out at the ends).
const alongDist = (x: number, y: number) => {
  return COS_G * (x - CORE.x) + SIN_G * (y - CORE.y);
};

type Star = {
  x: number;
  y: number;
  r: number;
  a: number; // base alpha
  color: string;
  tw: number; // twinkle phase seed
};

// Pre-compute star field once. Density is higher near the galactic spine.
const buildStars = (): Star[] => {
  const rand = mulberry32(20260729);
  const stars: Star[] = [];

  // Diffuse background field
  const fieldCount = 380;
  for (let i = 0; i < fieldCount; i++) {
    const x = SKY.x + rand() * SKY.w;
    const y = SKY.y + rand() * SKY.h * 0.92; // stay above horizon area
    const d = perpDist(x, y);
    // Skip most stars far from the band to keep the sky calm off-band
    if (d > 240 && rand() > 0.35) continue;
    const dim = rand();
    const r = 0.5 + Math.pow(rand(), 4) * 2.2;
    stars.push({
      x,
      y,
      r,
      a: 0.35 + dim * 0.5,
      color: rand() > 0.85 ? AMBER : rand() > 0.55 ? STAR_CREAM : GALACTIC_BLUE,
      tw: rand() * Math.PI * 2,
    });
  }

  // Dense band along the Milky Way spine
  const bandCount = 520;
  for (let i = 0; i < bandCount; i++) {
    const along = (rand() - 0.5) * 1250;
    const acrossBias = (rand() + rand() + rand()) / 3 - 0.5; // triangular
    const across = acrossBias * 180;
    const x = CORE.x + COS_G * along - SIN_G * across;
    const y = CORE.y + SIN_G * along + COS_G * across;
    if (x < SKY.x - 20 || x > SKY.x + SKY.w + 20) continue;
    if (y < SKY.y - 20 || y > SKY.y + SKY.h - 40) continue;
    const r = 0.4 + Math.pow(rand(), 3) * 2.6;
    stars.push({
      x,
      y,
      r,
      a: 0.55 + rand() * 0.4,
      color: rand() > 0.9 ? AMBER : rand() > 0.35 ? STAR_CREAM : GALACTIC_BLUE,
      tw: rand() * Math.PI * 2,
    });
  }

  // A handful of magnitude-1 anchor stars
  for (let i = 0; i < 12; i++) {
    const along = (rand() - 0.5) * 900;
    const across = (rand() - 0.5) * 260;
    const x = CORE.x + COS_G * along - SIN_G * across;
    const y = CORE.y + SIN_G * along + COS_G * across;
    if (x < SKY.x || x > SKY.x + SKY.w) continue;
    if (y < SKY.y || y > SKY.y + SKY.h - 60) continue;
    stars.push({
      x,
      y,
      r: 2.6 + rand() * 1.6,
      a: 0.95,
      color: rand() > 0.5 ? STAR_CREAM : AMBER,
      tw: rand() * Math.PI * 2,
    });
  }

  return stars;
};
const STARS = buildStars();

// A curved core-lane inside the Milky Way, drawn as several stacked ellipses.
const CORE_LANES = [
  { rx: 520, ry: 68, opacity: 0.06 },
  { rx: 430, ry: 46, opacity: 0.09 },
  { rx: 340, ry: 30, opacity: 0.13 },
  { rx: 230, ry: 18, opacity: 0.18 },
  { rx: 140, ry: 10, opacity: 0.22 },
];

// Horizon parameters
const HORIZON_Y = SKY.y + SKY.h - 46;
const BEETLE = { x: SKY.x + 205, y: HORIZON_Y - 4 };
// The bearing line goes from the beetle up along the galactic axis
// (i.e. exactly parallel to the Milky Way spine). Length chosen so it
// terminates inside the bright core, arguing the pairing.
const BEARING_LEN = 640;
const BEARING_END = {
  x: BEETLE.x + COS_G * BEARING_LEN,
  y: BEETLE.y + SIN_G * BEARING_LEN,
};

export const DungBeetleNavigator: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Time-based orchestration ─────────────────────────────────────────
  const skyOpacity = interpolate(frame, [0, fps * 1.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bandOpacity = interpolate(frame, [fps * 0.3, fps * 1.7], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bearingProgress = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const beetleProgress = interpolate(frame, [fps * 2.2, fps * 5.5], [0, 34], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 1.8,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 2.4, fps * 3.4], [0, 1], {
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
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 07 · 29</span>
      </div>

      {/* Sky + horizon + beetle */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Deep space vignette */}
          <radialGradient id="sky-vignette" cx="60%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#0A1024" stopOpacity={1} />
            <stop offset="55%" stopColor="#070B1A" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Milky Way band gradient: cream core → dusty blue → transparent */}
          <linearGradient id="mw-perp" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={GALACTIC_BLUE} stopOpacity={0} />
            <stop offset="35%" stopColor={GALACTIC_BLUE} stopOpacity={0.22} />
            <stop offset="50%" stopColor={STAR_CREAM} stopOpacity={0.36} />
            <stop offset="65%" stopColor={GALACTIC_BLUE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={GALACTIC_BLUE} stopOpacity={0} />
          </linearGradient>

          {/* Along-axis mask so the band fades at both ends */}
          <linearGradient id="mw-along" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000" stopOpacity={0} />
            <stop offset="15%" stopColor="#fff" stopOpacity={1} />
            <stop offset="60%" stopColor="#fff" stopOpacity={1} />
            <stop offset="100%" stopColor="#000" stopOpacity={0} />
          </linearGradient>
          <mask id="mw-mask">
            <rect
              x={-800}
              y={-140}
              width={2400}
              height={280}
              fill="url(#mw-along)"
            />
          </mask>

          {/* Horizon glow */}
          <linearGradient id="horizon-glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={INK} stopOpacity={0} />
            <stop offset="55%" stopColor={EARTH} stopOpacity={0.12} />
            <stop offset="100%" stopColor={EARTH} stopOpacity={0.24} />
          </linearGradient>

          {/* Star glow */}
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR_CREAM} stopOpacity={0.9} />
            <stop offset="100%" stopColor={STAR_CREAM} stopOpacity={0} />
          </radialGradient>

          {/* Amber magnitude-star glow */}
          <radialGradient id="amber-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.65} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Sky panel background */}
        <rect
          x={SKY.x}
          y={SKY.y}
          width={SKY.w}
          height={SKY.h}
          fill="url(#sky-vignette)"
          opacity={skyOpacity}
        />

        {/* Thin frame border for architectural feel */}
        <rect
          x={SKY.x + 0.5}
          y={SKY.y + 0.5}
          width={SKY.w - 1}
          height={SKY.h - 1}
          fill="none"
          stroke="#161C2E"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [SKY.x, SKY.y, 1, 1],
            [SKY.x + SKY.w, SKY.y, -1, 1],
            [SKY.x, SKY.y + SKY.h, 1, -1],
            [SKY.x + SKY.w, SKY.y + SKY.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={AMBER} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Clip the sky panel so stars/band never bleed */}
        <g clipPath="url(#sky-clip)">
          <clipPath id="sky-clip">
            <rect
              x={SKY.x}
              y={SKY.y}
              width={SKY.w}
              height={SKY.h}
            />
          </clipPath>

          {/* ── Milky Way band ────────────────────────────────────── */}
          <g
            opacity={bandOpacity}
            transform={`translate(${CORE.x} ${CORE.y}) rotate(${GALACTIC_ANGLE_DEG})`}
          >
            {/* Broad outer wash */}
            <rect
              x={-700}
              y={-160}
              width={1400}
              height={320}
              fill="url(#mw-perp)"
              mask="url(#mw-mask)"
            />
            {/* Denser mid wash */}
            <rect
              x={-560}
              y={-90}
              width={1120}
              height={180}
              fill="url(#mw-perp)"
              opacity={0.55}
              mask="url(#mw-mask)"
            />
            {/* Core lanes */}
            {CORE_LANES.map((l, i) => (
              <ellipse
                key={i}
                cx={0}
                cy={0}
                rx={l.rx}
                ry={l.ry}
                fill={STAR_CREAM}
                opacity={l.opacity}
                filter="url(#soft-blur)"
              />
            ))}
            {/* Broken dark dust lanes — small irregular chips instead of a
                single bar, so it reads as organic occlusion, not a rule. */}
            {[
              { cx: -280, cy: -3, rx: 42, ry: 3.5, o: 0.35 },
              { cx: -190, cy: 1, rx: 30, ry: 2.5, o: 0.28 },
              { cx: -110, cy: -2, rx: 55, ry: 3, o: 0.4 },
              { cx: -20, cy: 2, rx: 38, ry: 3.5, o: 0.42 },
              { cx: 60, cy: -1, rx: 50, ry: 3, o: 0.38 },
              { cx: 150, cy: 2, rx: 34, ry: 2.5, o: 0.3 },
              { cx: 230, cy: -2, rx: 46, ry: 3, o: 0.32 },
              { cx: 320, cy: 1, rx: 28, ry: 2, o: 0.24 },
            ].map((d, i) => (
              <ellipse
                key={`dust-${i}`}
                cx={d.cx}
                cy={d.cy}
                rx={d.rx}
                ry={d.ry}
                fill={INK}
                opacity={d.o}
                filter="url(#soft-blur)"
              />
            ))}
          </g>

          {/* ── Stars ────────────────────────────────────────────── */}
          {STARS.map((s, i) => {
            const twinkle =
              0.85 +
              0.15 * Math.sin((frame / fps) * 2.1 + s.tw + i * 0.017);
            const op = s.a * skyOpacity * twinkle;
            const isBig = s.r > 2.2;
            return (
              <g key={i}>
                {isBig && (
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={s.r * 5}
                    fill={
                      s.color === AMBER ? "url(#amber-glow)" : "url(#star-glow)"
                    }
                    opacity={op * 0.85}
                  />
                )}
                <circle cx={s.x} cy={s.y} r={s.r} fill={s.color} opacity={op} />
                {isBig && (
                  <g stroke={s.color} strokeWidth={0.6} opacity={op * 0.75}>
                    <line
                      x1={s.x - s.r * 4.5}
                      y1={s.y}
                      x2={s.x + s.r * 4.5}
                      y2={s.y}
                    />
                    <line
                      x1={s.x}
                      y1={s.y - s.r * 4.5}
                      x2={s.x}
                      y2={s.y + s.r * 4.5}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Horizon glow + savannah silhouette ──────────────── */}
          <rect
            x={SKY.x}
            y={HORIZON_Y - 130}
            width={SKY.w}
            height={130}
            fill="url(#horizon-glow)"
            opacity={skyOpacity}
          />
          {/* Silhouette: gently undulating savannah */}
          <path
            d={`
              M ${SKY.x} ${HORIZON_Y}
              C ${SKY.x + 140} ${HORIZON_Y - 6},
                ${SKY.x + 260} ${HORIZON_Y - 10},
                ${SKY.x + 380} ${HORIZON_Y - 4}
              C ${SKY.x + 520} ${HORIZON_Y + 2},
                ${SKY.x + 640} ${HORIZON_Y - 14},
                ${SKY.x + 760} ${HORIZON_Y - 8}
              C ${SKY.x + 860} ${HORIZON_Y - 3},
                ${SKY.x + 940} ${HORIZON_Y - 12},
                ${SKY.x + SKY.w} ${HORIZON_Y - 6}
              L ${SKY.x + SKY.w} ${SKY.y + SKY.h}
              L ${SKY.x} ${SKY.y + SKY.h}
              Z
            `}
            fill={INK}
            opacity={skyOpacity}
          />
          {/* Thin warm rim on the horizon */}
          <path
            d={`
              M ${SKY.x} ${HORIZON_Y}
              C ${SKY.x + 140} ${HORIZON_Y - 6},
                ${SKY.x + 260} ${HORIZON_Y - 10},
                ${SKY.x + 380} ${HORIZON_Y - 4}
              C ${SKY.x + 520} ${HORIZON_Y + 2},
                ${SKY.x + 640} ${HORIZON_Y - 14},
                ${SKY.x + 760} ${HORIZON_Y - 8}
              C ${SKY.x + 860} ${HORIZON_Y - 3},
                ${SKY.x + 940} ${HORIZON_Y - 12},
                ${SKY.x + SKY.w} ${HORIZON_Y - 6}
            `}
            fill="none"
            stroke={EARTH}
            strokeOpacity={0.55}
            strokeWidth={0.8}
            opacity={skyOpacity}
          />

          {/* ── Bearing line (beetle → Milky Way core) ──────────── */}
          {(() => {
            const p = Math.max(0, Math.min(1, bearingProgress));
            const ex = BEETLE.x + (BEARING_END.x - BEETLE.x) * p;
            const ey = BEETLE.y + (BEARING_END.y - BEETLE.y) * p;
            return (
              <g opacity={0.75 * skyOpacity}>
                <line
                  x1={BEETLE.x}
                  y1={BEETLE.y}
                  x2={ex}
                  y2={ey}
                  stroke={AMBER}
                  strokeWidth={1}
                  strokeDasharray="3 6"
                  strokeLinecap="round"
                />
                {p > 0.15 && (
                  <>
                    {/* Tick marks along the line */}
                    {[0.25, 0.5, 0.75].map((t) => {
                      if (t > p) return null;
                      const tx = BEETLE.x + (BEARING_END.x - BEETLE.x) * t;
                      const ty = BEETLE.y + (BEARING_END.y - BEETLE.y) * t;
                      const px = -SIN_G;
                      const py = COS_G;
                      return (
                        <line
                          key={t}
                          x1={tx - px * 5}
                          y1={ty - py * 5}
                          x2={tx + px * 5}
                          y2={ty + py * 5}
                          stroke={AMBER}
                          strokeWidth={1.1}
                          opacity={0.75}
                        />
                      );
                    })}
                    {/* Angle label near the mid-point */}
                    {p > 0.6 && (
                      <text
                        x={BEETLE.x + (BEARING_END.x - BEETLE.x) * 0.5 + 22}
                        y={BEETLE.y + (BEARING_END.y - BEETLE.y) * 0.5 - 8}
                        fill={AMBER}
                        fontFamily={inter}
                        fontSize={10}
                        letterSpacing={3}
                        fontWeight={600}
                        opacity={interpolate(p, [0.6, 0.95], [0, 0.9], {
                          extrapolateRight: "clamp",
                        })}
                      >
                        BEARING · 032°
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })()}

          {/* ── Beetle silhouette ───────────────────────────────── */}
          {(() => {
            const bx = BEETLE.x + beetleProgress;
            const by = BEETLE.y;
            const ballR = 9;
            const bodyW = 12;
            const bodyH = 8;
            return (
              <g opacity={skyOpacity}>
                {/* faint straight track trailing behind */}
                <line
                  x1={SKY.x + 40}
                  y1={by + 2}
                  x2={bx - ballR - 8}
                  y2={by + 2}
                  stroke={EARTH}
                  strokeWidth={0.6}
                  strokeDasharray="1 4"
                  opacity={0.5}
                />
                {/* dung ball */}
                <circle
                  cx={bx}
                  cy={by - ballR + 1}
                  r={ballR}
                  fill={EARTH}
                />
                <circle
                  cx={bx - 2.5}
                  cy={by - ballR - 1}
                  r={2}
                  fill="#8E5F3E"
                />
                {/* beetle body (behind ball, pushing) */}
                <ellipse
                  cx={bx + ballR + bodyW / 2}
                  cy={by - bodyH / 2}
                  rx={bodyW / 2}
                  ry={bodyH / 2}
                  fill="#1A0F09"
                />
                {/* back legs */}
                <line
                  x1={bx + ballR + bodyW * 0.9}
                  y1={by - 3}
                  x2={bx + ballR + bodyW * 1.5}
                  y2={by + 1}
                  stroke="#1A0F09"
                  strokeWidth={1.1}
                />
                <line
                  x1={bx + ballR + bodyW * 0.6}
                  y1={by - 4}
                  x2={bx + ballR + bodyW * 1.1}
                  y2={by + 1}
                  stroke="#1A0F09"
                  strokeWidth={1.1}
                />
                {/* front legs (against ball) */}
                <line
                  x1={bx + ballR + 1}
                  y1={by - 4}
                  x2={bx + 2}
                  y2={by - 1}
                  stroke="#1A0F09"
                  strokeWidth={1.1}
                />
                {/* label for the beetle — small caps callout */}
                <line
                  x1={bx + ballR + bodyW + 6}
                  y1={by - 4}
                  x2={bx + ballR + bodyW + 46}
                  y2={by - 22}
                  stroke={EARTH}
                  strokeWidth={0.8}
                />
                <text
                  x={bx + ballR + bodyW + 50}
                  y={by - 22}
                  fill={EARTH}
                  fontFamily={inter}
                  fontSize={9.5}
                  letterSpacing={3}
                  fontWeight={600}
                >
                  S. SATYRUS
                </text>
              </g>
            );
          })()}
        </g>

        {/* Panel labels — sit outside the star field */}
        <g
          transform={`translate(${SKY.x + 22}, ${SKY.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10.5}
          letterSpacing={3.4}
          fontWeight={500}
        >
          <text>PLATE III · SOUTHERN SAVANNAH, MOONLESS</text>
        </g>
        <g
          transform={`translate(${SKY.x + SKY.w - 22}, ${SKY.y + 30})`}
          fill={STAR_CREAM}
          fontFamily={inter}
          fontSize={10.5}
          letterSpacing={3.4}
          fontWeight={500}
          textAnchor="end"
        >
          <text>MILKY WAY · GAL. CORE</text>
        </g>

        {/* Caption strip just below the sky panel */}
        <g
          transform={`translate(${SKY.x}, ${SKY.y + SKY.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · BEARING HELD BY S. SATYRUS UNDER STARLIGHT ALONE</text>
          <text
            x={SKY.w}
            textAnchor="end"
            fill={AMBER}
            opacity={0.85}
          >
            COURSE ∥ GALACTIC AXIS
          </text>
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 968,
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
            marginBottom: 20,
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
            lineHeight: 0.98,
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
            marginTop: 26,
            color: "#C6C9D2",
            fontFamily: inter,
            fontSize: 18.5,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          On moonless nights, the African ball-rolling beetle{" "}
          <span style={{ color: STAR_CREAM, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          holds a perfectly straight course by orienting to the diffuse light
          of the Milky Way — the first invertebrate ever proven to steer by
          our galaxy.
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
          <span style={{ color: EARTH }}>●</span> Ball-rolling · S. satyrus
        </span>
      </div>
    </AbsoluteFill>
  );
};
