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
const INK = "#0A0E1F";
const CHART = "#151A30";
const STARLIGHT = "#EDE6C9";
const MW_LAVENDER = "#8677B8";
const OCHRE = "#C99A55";

// Muted derivatives (tints/shades of palette only)
const INK_DEEP = "#060916";
const CHART_EDGE = "#1E2340";
const STAR_DIM = "#A7A186";
const MW_LAVENDER_DEEP = "#5A4E85";
const OCHRE_GLOW = "#E4B872";

// ── Chart geometry ────────────────────────────────────────────────
// Portrait: 1080 × 1350. Sky chart occupies the upper block; text below.
const CHART_BOX = { x: 60, y: 130, w: 960, h: 780 };

// Milky Way band — a soft arc across the chart.
// Two control curves that define an upper and lower boundary; we fill between.
const galacticBand = () => {
  // Sweep from lower-left to upper-right.
  const upper = "M 40 720  C 260 620, 620 300, 940 40";
  const lower = "M 60 780  C 300 700, 700 380, 980 80";
  return { upper, lower };
};

// Star field — deterministic seeded distribution
type Star = { x: number; y: number; r: number; b: number; blink: number };
const rand = (seed: number) => {
  let s = seed * 2654435761;
  return () => {
    s = (s ^ (s >>> 15)) * 2246822519;
    s = (s ^ (s >>> 13)) * 3266489917;
    s = s ^ (s >>> 16);
    return ((s >>> 0) % 100000) / 100000;
  };
};

const buildStars = (): Star[] => {
  const r = rand(20260714);
  const out: Star[] = [];
  // Background dim stars — extra concentration in upper-left and lower-right
  // to prevent visual dead zones outside the Milky Way band.
  for (let i = 0; i < 360; i++) {
    out.push({
      x: r() * 1080,
      y: r() * 800,
      r: 0.4 + r() * 0.9,
      b: 0.3 + r() * 0.45,
      blink: r(),
    });
  }
  // Upper-left cluster
  for (let i = 0; i < 45; i++) {
    out.push({
      x: r() * 380,
      y: r() * 300,
      r: 0.5 + r() * 1.1,
      b: 0.35 + r() * 0.45,
      blink: r(),
    });
  }
  // Lower-right cluster
  for (let i = 0; i < 45; i++) {
    out.push({
      x: 700 + r() * 380,
      y: 450 + r() * 340,
      r: 0.5 + r() * 1.1,
      b: 0.35 + r() * 0.45,
      blink: r(),
    });
  }
  // Milky Way concentrated stars along the band
  for (let i = 0; i < 320; i++) {
    const t = r();
    // Parametric point along the band (matches the arc roughly)
    const bx = 40 + t * 900;
    // Curve: quadratic-ish arc from y=720 down to y=40
    const arcY = 720 - Math.pow(t, 0.85) * 700;
    const perp = (r() - 0.5) * 130; // spread perpendicular
    out.push({
      x: bx + perp * 0.35,
      y: arcY + perp,
      r: 0.5 + r() * 1.6,
      b: 0.55 + r() * 0.45,
      blink: r(),
    });
  }
  // A few bright named-tier stars
  for (let i = 0; i < 14; i++) {
    out.push({
      x: 60 + r() * 900,
      y: 40 + r() * 720,
      r: 1.8 + r() * 1.4,
      b: 0.9,
      blink: r(),
    });
  }
  return out;
};

const STARS = buildStars();

// Milky Way dust puffs — softly clumped ellipses inside the band
type Puff = { x: number; y: number; rx: number; ry: number; rot: number; a: number };
const buildPuffs = (): Puff[] => {
  const r = rand(97531);
  const out: Puff[] = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 24 + r() * 0.02;
    const bx = 40 + t * 900;
    const arcY = 720 - Math.pow(t, 0.85) * 700;
    const perp = (r() - 0.5) * 90;
    out.push({
      x: bx + perp * 0.3,
      y: arcY + perp,
      rx: 60 + r() * 90,
      ry: 22 + r() * 32,
      rot: -55 + (r() - 0.5) * 24,
      a: 0.08 + r() * 0.18,
    });
  }
  return out;
};

const PUFFS = buildPuffs();

// Bearing line — anchored at the beetle, up through the galactic band
const BEETLE = { x: 780, y: 620 };
const BEARING_TARGET = { x: 430, y: 55 };
const BEETLE_SCALE = 1.85;

// Compute unit vector from beetle to target (for the beam)
const bdx = BEARING_TARGET.x - BEETLE.x;
const bdy = BEARING_TARGET.y - BEETLE.y;
const blen = Math.hypot(bdx, bdy);
const bux = bdx / blen;
const buy = bdy / blen;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing
  const openSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1 },
  });
  const ringSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 180, mass: 1.1 },
  });
  const ringRot = interpolate(ringSpring, [0, 1], [-9, 0]);

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

  // Beam pulse (down the bearing line onto the beetle)
  const beamCycle = (frame % (fps * 3.2)) / (fps * 3.2);
  const beamHead = interpolate(beamCycle, [0, 1], [0, 1]);

  // Beetle inches forward along the bearing line very slightly (a few px, looped)
  const rollCycle = (frame % (fps * 5)) / (fps * 5);
  const rollOffset = interpolate(rollCycle, [0, 1], [0, -14]);
  const beetleX = BEETLE.x + bux * rollOffset;
  const beetleY = BEETLE.y + buy * rollOffset;
  const ballX = beetleX + 22 + bux * 4;
  const ballY = beetleY + 6 + buy * 4;

  return (
    <AbsoluteFill style={{ backgroundColor: INK_DEEP, fontFamily: inter }}>
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
          color: STAR_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: OCHRE }}>2026 · 07 · 14</span>
      </div>

      {/* Sky chart panel */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Milky Way band gradient (perpendicular to sweep direction) */}
          <linearGradient
            id="mw-band"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={MW_LAVENDER} stopOpacity={0.0} />
            <stop offset="45%" stopColor={MW_LAVENDER} stopOpacity={0.42} />
            <stop offset="55%" stopColor={MW_LAVENDER} stopOpacity={0.42} />
            <stop offset="100%" stopColor={MW_LAVENDER} stopOpacity={0.0} />
          </linearGradient>

          {/* Chart background — subtle vertical vignette */}
          <linearGradient id="chart-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK} />
            <stop offset="60%" stopColor={CHART} />
            <stop offset="100%" stopColor={INK} />
          </linearGradient>

          {/* Star glow */}
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STARLIGHT} stopOpacity={0.9} />
            <stop offset="100%" stopColor={STARLIGHT} stopOpacity={0} />
          </radialGradient>

          {/* Dung ball glow */}
          <radialGradient id="ball-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={OCHRE_GLOW} stopOpacity={0.55} />
            <stop offset="100%" stopColor={OCHRE_GLOW} stopOpacity={0} />
          </radialGradient>

          {/* Milky Way soft puff */}
          <radialGradient id="mw-puff" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MW_LAVENDER} stopOpacity={0.8} />
            <stop offset="100%" stopColor={MW_LAVENDER} stopOpacity={0} />
          </radialGradient>

          {/* Chart clip so nothing spills outside the panel */}
          <clipPath id="chart-clip">
            <rect
              x={CHART_BOX.x}
              y={CHART_BOX.y}
              width={CHART_BOX.w}
              height={CHART_BOX.h}
              rx={2}
            />
          </clipPath>

          {/* Soft blur for the band */}
          <filter id="mw-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="18" />
          </filter>

          <filter id="star-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Chart panel background */}
        <rect
          x={CHART_BOX.x}
          y={CHART_BOX.y}
          width={CHART_BOX.w}
          height={CHART_BOX.h}
          fill="url(#chart-bg)"
        />

        {/* Inner border */}
        <rect
          x={CHART_BOX.x + 0.5}
          y={CHART_BOX.y + 0.5}
          width={CHART_BOX.w - 1}
          height={CHART_BOX.h - 1}
          fill="none"
          stroke={CHART_EDGE}
          strokeWidth={1}
        />

        {/* Corner ticks */}
        {(
          [
            [CHART_BOX.x, CHART_BOX.y, 1, 1],
            [CHART_BOX.x + CHART_BOX.w, CHART_BOX.y, -1, 1],
            [CHART_BOX.x, CHART_BOX.y + CHART_BOX.h, 1, -1],
            [CHART_BOX.x + CHART_BOX.w, CHART_BOX.y + CHART_BOX.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={OCHRE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Sky content: coord space 1080 × 800 mapped into CHART_BOX */}
        <g clipPath="url(#chart-clip)">
          <g
            transform={`translate(${CHART_BOX.x}, ${CHART_BOX.y}) scale(${
              CHART_BOX.w / 1080
            }, ${CHART_BOX.h / 800})`}
          >
            {/* Milky Way band — filled area between two curves, blurred */}
            <g opacity={0.78 * openSpring} filter="url(#mw-blur)">
              {(() => {
                const d = `M 40 720 C 260 620, 620 300, 940 40 L 980 80 C 700 380, 300 700, 60 780 Z`;
                return <path d={d} fill="url(#mw-band)" />;
              })()}
            </g>
            {/* Milky Way central spine — a brighter, narrower ribbon so the
                galactic core is legible as a spine, not just a haze */}
            <g opacity={0.55 * openSpring} filter="url(#mw-blur)">
              <path
                d="M 60 750 C 300 660, 640 340, 950 55"
                stroke={STARLIGHT}
                strokeWidth={26}
                strokeLinecap="round"
                strokeOpacity={0.35}
                fill="none"
              />
              <path
                d="M 70 748 C 300 660, 640 340, 950 55"
                stroke={STARLIGHT}
                strokeWidth={9}
                strokeLinecap="round"
                strokeOpacity={0.55}
                fill="none"
              />
            </g>

            {/* Milky Way dust puffs */}
            <g opacity={0.9 * openSpring}>
              {PUFFS.map((p, i) => (
                <g
                  key={`puff-${i}`}
                  transform={`translate(${p.x}, ${p.y}) rotate(${p.rot})`}
                >
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={p.rx}
                    ry={p.ry}
                    fill="url(#mw-puff)"
                    opacity={p.a}
                  />
                </g>
              ))}
            </g>

            {/* Stars */}
            <g>
              {STARS.map((s, i) => {
                // Twinkle: slow, subtle. Each star has its own phase.
                const phase = s.blink * Math.PI * 2;
                const tw =
                  0.7 +
                  0.3 *
                    Math.sin(
                      (frame / (fps * (1.6 + s.blink * 2.2))) * Math.PI * 2 +
                        phase,
                    );
                const op = s.b * tw;
                return (
                  <g key={`s-${i}`}>
                    {s.r > 1.4 && (
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r={s.r * 3.2}
                        fill="url(#star-glow)"
                        opacity={op * 0.55}
                      />
                    )}
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={s.r}
                      fill={STARLIGHT}
                      opacity={op}
                    />
                  </g>
                );
              })}
            </g>

            {/* Bearing line — thin dashed line from beetle up through the MW */}
            <g opacity={openSpring}>
              <line
                x1={BEETLE.x}
                y1={BEETLE.y}
                x2={BEARING_TARGET.x}
                y2={BEARING_TARGET.y}
                stroke={OCHRE}
                strokeOpacity={0.35}
                strokeWidth={1.2}
                strokeDasharray="4 6"
              />
              {/* Beam pulse — a bright segment traveling down the line */}
              {(() => {
                const segLen = 220;
                const startT = beamHead;
                const endT = Math.min(1, beamHead + segLen / blen);
                const sx = BEETLE.x + bdx * startT;
                const sy = BEETLE.y + bdy * startT;
                const ex = BEETLE.x + bdx * endT;
                const ey = BEETLE.y + bdy * endT;
                const fade =
                  1 -
                  Math.abs(beamCycle - 0.5) * 1.6; // brightest mid-cycle
                return (
                  <line
                    x1={sx}
                    y1={sy}
                    x2={ex}
                    y2={ey}
                    stroke={STARLIGHT}
                    strokeOpacity={Math.max(0, fade) * 0.75}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                );
              })()}
              {/* Cross-tick at the target star */}
              <g
                stroke={OCHRE}
                strokeWidth={1.3}
                opacity={openSpring}
              >
                <line
                  x1={BEARING_TARGET.x - 10}
                  y1={BEARING_TARGET.y}
                  x2={BEARING_TARGET.x + 10}
                  y2={BEARING_TARGET.y}
                />
                <line
                  x1={BEARING_TARGET.x}
                  y1={BEARING_TARGET.y - 10}
                  x2={BEARING_TARGET.x}
                  y2={BEARING_TARGET.y + 10}
                />
                <circle
                  cx={BEARING_TARGET.x}
                  cy={BEARING_TARGET.y}
                  r={16}
                  fill="none"
                  stroke={OCHRE}
                  strokeOpacity={0.6}
                />
              </g>
              {/* Bearing readout label — placed at ~40% along the line, offset perpendicular */}
              {(() => {
                const mt = 0.42;
                const lx = BEETLE.x + bdx * mt;
                const ly = BEETLE.y + bdy * mt;
                // Perpendicular offset (to the right of the line as drawn)
                const nx = -buy;
                const ny = bux;
                const off = 22;
                const tx = lx + nx * off;
                const ty = ly + ny * off;
                return (
                  <g opacity={openSpring}>
                    {/* Small tick where readout attaches */}
                    <line
                      x1={lx}
                      y1={ly}
                      x2={tx - nx * 4}
                      y2={ty - ny * 4}
                      stroke={OCHRE}
                      strokeWidth={1}
                      strokeOpacity={0.65}
                    />
                    <text
                      x={tx}
                      y={ty}
                      fill={OCHRE}
                      fontFamily={inter}
                      fontSize={12}
                      fontWeight={600}
                      letterSpacing={3.2}
                    >
                      BEARING · 344°
                    </text>
                  </g>
                );
              })()}
            </g>

            {/* Astrolabe ring — brass compass rose centered on the beetle.
                Rotated -20° via ringRot; cardinals sit clear of the beetle body. */}
            <g
              transform={`translate(${BEETLE.x}, ${BEETLE.y}) rotate(${ringRot})`}
              opacity={openSpring}
            >
              {/* Outer + inner ring */}
              <circle
                cx={0}
                cy={0}
                r={160}
                fill="none"
                stroke={OCHRE}
                strokeOpacity={0.5}
                strokeWidth={1.2}
              />
              <circle
                cx={0}
                cy={0}
                r={144}
                fill="none"
                stroke={OCHRE}
                strokeOpacity={0.28}
                strokeWidth={1}
              />
              {/* Ticks — every 10°, longer every 30° */}
              {Array.from({ length: 36 }).map((_, i) => {
                const a = (i * 10 * Math.PI) / 180;
                const major = i % 3 === 0;
                const r1 = major ? 132 : 138;
                const r2 = 160;
                return (
                  <line
                    key={`t-${i}`}
                    x1={Math.sin(a) * r1}
                    y1={-Math.cos(a) * r1}
                    x2={Math.sin(a) * r2}
                    y2={-Math.cos(a) * r2}
                    stroke={OCHRE}
                    strokeOpacity={major ? 0.7 : 0.35}
                    strokeWidth={major ? 1.4 : 0.8}
                  />
                );
              })}
              {/* Cardinal letters — offset to sit outside the ring so they never fight the beetle */}
              {[
                { l: "N", a: 0 },
                { l: "E", a: 90 },
                { l: "S", a: 180 },
                { l: "W", a: 270 },
              ].map(({ l, a }) => {
                const rad = (a * Math.PI) / 180;
                const rr = 178;
                return (
                  <text
                    key={l}
                    x={Math.sin(rad) * rr}
                    y={-Math.cos(rad) * rr + 4}
                    textAnchor="middle"
                    fill={OCHRE_GLOW}
                    fontFamily={inter}
                    fontSize={13}
                    fontWeight={600}
                    letterSpacing={2}
                    transform={`rotate(${-ringRot} ${Math.sin(rad) * rr} ${
                      -Math.cos(rad) * rr
                    })`}
                  >
                    {l}
                  </text>
                );
              })}
            </g>

            {/* Beetle + ball group — inches forward, drawn in local space,
                scaled up as a whole so the actor of the composition reads clearly.
                Scarabaeus rolls the ball BACKWARDS with hind legs — head down,
                rear elevated — hence beetle is on the LEFT of the ball, pushing
                right into the bearing line. */}
            <g
              transform={`translate(${beetleX}, ${beetleY}) scale(${BEETLE_SCALE})`}
              opacity={openSpring}
            >
              {/* Ball outer glow — big warm halo */}
              <circle cx={26} cy={2} r={64} fill="url(#ball-glow)" />
              {/* Dung ball */}
              <circle
                cx={26}
                cy={2}
                r={22}
                fill={OCHRE}
                stroke={INK_DEEP}
                strokeWidth={1.4}
              />
              {/* Ball texture flecks */}
              <circle cx={20} cy={-4} r={2.4} fill={OCHRE_GLOW} opacity={0.85} />
              <circle cx={30} cy={7} r={1.6} fill={OCHRE_GLOW} opacity={0.55} />
              <circle cx={22} cy={9} r={1.1} fill={INK_DEEP} opacity={0.4} />

              {/* Beetle body — head DOWN (facing left), rear UP (pushing ball right).
                  Kept graphic: two flat shapes for the body, then legs.
                  No detached horn paths — they read as debris at this scale. */}
              <g fill={INK_DEEP} stroke={STARLIGHT} strokeWidth={0.5}>
                {/* Elytra (back shell) — single dome */}
                <path
                  d="M -6 -14
                     C -32 -14, -42 0, -34 14
                     C -26 24, -8 22, 4 12
                     C 10 4, 8 -12, -6 -14 Z"
                />
                {/* Pronotum ridge — subtle segment line */}
                <path
                  d="M -14 -13
                     C -22 -14, -28 -8, -24 -2
                     C -16 -4, -10 -8, -8 -12 Z"
                  fill="#0F1428"
                  stroke="none"
                />
                {/* Head — small, forward-low, integrated with body */}
                <path
                  d="M -30 12
                     C -38 12, -40 20, -34 22
                     C -28 22, -25 16, -28 12 Z"
                />
              </g>
              {/* Legs — six clean strokes, pushing motion */}
              <g
                stroke={INK_DEEP}
                strokeWidth={2.4}
                strokeLinecap="round"
                fill="none"
              >
                {/* Hind legs against ball (right side, curled) */}
                <path d="M 2 8 L 14 20" />
                <path d="M 8 2 L 20 10" />
                {/* Middle legs — planted */}
                <path d="M -14 16 L -18 28" />
                <path d="M -20 14 L -26 24" />
                {/* Front legs — reaching down/forward */}
                <path d="M -30 20 L -36 28" />
                <path d="M -33 16 L -40 20" />
              </g>
              {/* Shell highlight — thin C, sells the domed carapace */}
              <path
                d="M -22 -8 C -16 -12, -10 -12, -8 -10"
                stroke={STARLIGHT}
                strokeOpacity={0.4}
                strokeWidth={0.8}
                fill="none"
              />
            </g>

            {/* Ground shadow line at the beetle */}
            <line
              x1={BEETLE.x - 150}
              y1={BEETLE.y + 60}
              x2={BEETLE.x + 130}
              y2={BEETLE.y + 60}
              stroke={STAR_DIM}
              strokeOpacity={0.18}
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          </g>
        </g>

        {/* Chart caption strip */}
        <g
          transform={`translate(${CHART_BOX.x}, ${CHART_BOX.y + CHART_BOX.h + 22})`}
          fill={STAR_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · MOONLESS ORIENTATION TRIAL, S. SATYRUS</text>
          <text x={CHART_BOX.w} textAnchor="end" fill={OCHRE} opacity={0.9}>
            HEADING FIXED ON MILKY WAY
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 975,
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
            color: OCHRE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: STAR_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: STARLIGHT, letterSpacing: 5 }}>
            Celestial Navigator
          </span>
        </div>

        <div
          style={{
            color: STARLIGHT,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The beetle that reads
          <br />
          the Milky Way.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C9C4AC",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          On moonless nights the African ball-roller{" "}
          <span style={{ color: OCHRE_GLOW, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          holds a straight course by fixing its heading on the diffuse light
          stripe of our galaxy — the first insect ever shown to navigate by
          the Milky Way.
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
          color: STAR_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dacke et al. · Current Biology 23 (2013) 298–300</span>
        <span>
          <span style={{ color: OCHRE }}>●</span> Dung ball = Cargo
        </span>
      </div>
    </AbsoluteFill>
  );
};
