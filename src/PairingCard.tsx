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

// Palette — from the concept's visual brief
const INK = "#060915";
const INDIGO = "#141A33";
const INDIGO_LO = "#0B1024";
const HAZE = "#AEBCE3";
const STAR = "#F0E5B6";
const BRONZE = "#C78A4A";
const GRAY = "#8A8F99";

// ── Deterministic PRNG so star layout is stable across renders ───────────
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

// ── Galactic band geometry ───────────────────────────────────────────────
// The Milky Way band is a parallelogram band through the top of the frame,
// angled ~22° off horizontal (down-left to up-right). We define its
// centreline as a direction unit vector `U` and perpendicular `N`; stars
// cluster around that line with a dust-lane carved through the middle.
const GALAXY_ANGLE_DEG = -18;
const GALAXY_ANGLE = (GALAXY_ANGLE_DEG * Math.PI) / 180;
const UX = Math.cos(GALAXY_ANGLE);
const UY = Math.sin(GALAXY_ANGLE);
const NX = -UY;
const NY = UX;
// Centreline anchor — passes through this point near the galactic core
const GC = { x: 650, y: 420 };

const projectOnBand = (x: number, y: number) => {
  const dx = x - GC.x;
  const dy = y - GC.y;
  return {
    s: dx * UX + dy * UY, // along-band
    n: dx * NX + dy * NY, // across-band
  };
};

// Dust-lane shape: slight sinusoidal weave along the band
const dustAcross = (s: number) =>
  Math.sin(s / 110) * 7 + Math.sin(s / 44 + 1.3) * 3;

type Star = { x: number; y: number; r: number; a: number; tw: number };
const buildStars = (): Star[] => {
  const rand = mulberry32(13371337);
  const stars: Star[] = [];
  // Background scatter across whole sky area (above horizon)
  for (let i = 0; i < 160; i++) {
    const x = rand() * 1080;
    const y = rand() * 920;
    const r = 0.5 + rand() * 1.1;
    stars.push({ x, y, r, a: 0.25 + rand() * 0.5, tw: rand() });
  }
  // Dense cluster around galactic band
  for (let i = 0; i < 520; i++) {
    const s = (rand() - 0.5) * 1600;
    // Gaussian-ish across-band distribution ±90, with carved dust lane
    const u1 = rand();
    const u2 = rand();
    const g =
      Math.sqrt(-2 * Math.log(Math.max(1e-6, u1))) *
      Math.cos(2 * Math.PI * u2);
    const nOffset = g * 55 + dustAcross(s);
    const x = GC.x + s * UX + nOffset * NX;
    const y = GC.y + s * UY + nOffset * NY;
    if (y < -40 || y > 940 || x < -40 || x > 1120) continue;
    const r = 0.4 + Math.pow(rand(), 2.6) * 2.2;
    const a = 0.45 + rand() * 0.5;
    stars.push({ x, y, r, a, tw: rand() });
  }
  // A handful of bright hero stars
  for (let i = 0; i < 10; i++) {
    const s = (rand() - 0.4) * 1200;
    const nOffset = (rand() - 0.5) * 160 + dustAcross(s);
    const x = GC.x + s * UX + nOffset * NX;
    const y = GC.y + s * UY + nOffset * NY;
    if (y < 20 || y > 900) continue;
    stars.push({ x, y, r: 2.4 + rand() * 1.4, a: 0.95, tw: rand() });
  }
  return stars;
};
const STARS: Star[] = buildStars();

// Dust-cloud blobs — soft radial gradients placed along the band to
// suggest the galactic core and dust/nebular glow.
type Cloud = { x: number; y: number; rx: number; ry: number; op: number };
const buildClouds = (): Cloud[] => {
  const rand = mulberry32(99887766);
  const clouds: Cloud[] = [];
  const positions = [-520, -340, -180, -40, 90, 230, 390, 560];
  positions.forEach((s, i) => {
    const nOffset = (rand() - 0.5) * 40 + dustAcross(s);
    const x = GC.x + s * UX + nOffset * NX;
    const y = GC.y + s * UY + nOffset * NY;
    const rx = 220 + rand() * 160;
    const ry = 80 + rand() * 40;
    // Brighter near the core
    const coreBoost = Math.max(0, 1 - Math.abs(s) / 400);
    const op = 0.08 + coreBoost * 0.14 + (i === 3 ? 0.08 : 0);
    clouds.push({ x, y, rx, ry, op });
  });
  return clouds;
};
const CLOUDS = buildClouds();

// Dark dust lane polygons — subtract-brightness strokes threaded along the band
const dustLanePath = (offset: number, bend: number) => {
  const pts: string[] = [];
  for (let s = -620; s <= 620; s += 40) {
    const across = offset + Math.sin(s / 130 + bend) * 10;
    const x = GC.x + s * UX + across * NX;
    const y = GC.y + s * UY + across * NY;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return "M " + pts.join(" L ");
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing ──────────────────────────────────────────────────────────
  const skyRise = spring({
    frame,
    fps,
    config: { damping: 200, mass: 2.2, stiffness: 60 },
  });
  const bearingSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 180, mass: 1.4, stiffness: 70 },
  });
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.3, fps * 2.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Beetle inches forward along horizon (slow loop)
  const walkCycle = (frame % (fps * 6)) / (fps * 6);
  const beetleX = 215 + walkCycle * 60;
  const ballRotation = walkCycle * 360 * 1.2;
  const BEETLE_SCALE = 1.9;

  // Twinkle: per-star phase based on tw seed
  const twinkle = (tw: number) => {
    const t = frame / fps;
    return 0.75 + 0.25 * Math.sin(t * (1.3 + tw * 1.6) + tw * 10);
  };

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  // Sky viewport        : 0..920  (SVG map coords 1080 × 920)
  // Horizon strip       : 915..935
  // Type block          : 985..
  const SKY_H = 920;

  // Beetle sits on the horizon line y=915 in sky coords.
  const HORIZON_Y = 915;
  const beetleY = HORIZON_Y;

  // Bearing line: from top of dung ball (the "axle") up through galactic core
  // Ball centre in local coords is (44, -24). Top of ball is (44, -54).
  const bearingStart = {
    x: beetleX + 44 * BEETLE_SCALE,
    y: beetleY + -54 * BEETLE_SCALE,
  };
  const bearingEnd = { x: GC.x - 10, y: GC.y + 30 };
  const bearingLen = Math.hypot(
    bearingEnd.x - bearingStart.x,
    bearingEnd.y - bearingStart.y,
  );
  const bearingDraw = bearingSpring;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 72,
          right: 72,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
          zIndex: 10,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: STAR }}>2026 · 10 · 02</span>
      </div>

      {/* ── Sky SVG ─────────────────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INDIGO} />
            <stop offset="60%" stopColor={INDIGO_LO} />
            <stop offset="100%" stopColor={INK} />
          </linearGradient>

          <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0.26} />
            <stop offset="40%" stopColor={HAZE} stopOpacity={0.16} />
            <stop offset="100%" stopColor={HAZE} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="cloud" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HAZE} stopOpacity={1} />
            <stop offset="80%" stopColor={HAZE} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="horizon-fade" cx="50%" cy="0%" r="60%">
            <stop offset="0%" stopColor={BRONZE} stopOpacity={0.14} />
            <stop offset="100%" stopColor={BRONZE} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="ball-grad" cx="35%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#F0C892" />
            <stop offset="55%" stopColor={BRONZE} />
            <stop offset="100%" stopColor="#5E3A17" />
          </radialGradient>

          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="big-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="34" />
          </filter>

          <clipPath id="sky-clip">
            <rect x={0} y={0} width={1080} height={SKY_H + 2} />
          </clipPath>
        </defs>

        {/* Sky background */}
        <rect x={0} y={0} width={1080} height={SKY_H} fill="url(#sky-grad)" />

        {/* Everything above the horizon lives inside sky-clip, and the whole
             sky parallaxes up during the opening. */}
        <g clipPath="url(#sky-clip)">
          <g
            transform={`translate(0, ${interpolate(
              skyRise,
              [0, 1],
              [40, 0],
            )})`}
            opacity={interpolate(skyRise, [0, 1], [0, 1])}
          >
            {/* Galactic haze clouds (big-blur) */}
            <g filter="url(#big-blur)">
              {CLOUDS.map((c, i) => (
                <ellipse
                  key={`c-${i}`}
                  cx={c.x}
                  cy={c.y}
                  rx={c.rx}
                  ry={c.ry}
                  fill="url(#cloud)"
                  opacity={c.op}
                  transform={`rotate(${GALAXY_ANGLE_DEG} ${c.x} ${c.y})`}
                />
              ))}
            </g>

            {/* Galactic core glow */}
            <g
              transform={`translate(${GC.x}, ${GC.y}) rotate(${GALAXY_ANGLE_DEG})`}
            >
              <ellipse
                cx={0}
                cy={0}
                rx={380}
                ry={120}
                fill="url(#core-glow)"
              />
              <ellipse
                cx={0}
                cy={0}
                rx={160}
                ry={54}
                fill="url(#core-glow)"
                opacity={0.9}
              />
            </g>

            {/* Dust lanes carved through the band — darken.
                 Kept close to the band centreline so they read as galactic
                 dust rather than independent squiggles. */}
            <g
              stroke={INDIGO_LO}
              strokeOpacity={0.85}
              fill="none"
              strokeLinecap="round"
            >
              <path d={dustLanePath(-2, 0)} strokeWidth={11} />
              <path d={dustLanePath(10, 1.1)} strokeWidth={5} opacity={0.6} />
              <path d={dustLanePath(-14, 0.4)} strokeWidth={4} opacity={0.5} />
            </g>

            {/* Stars */}
            {STARS.map((s, i) => {
              const tw = twinkle(s.tw);
              return (
                <circle
                  key={`s-${i}`}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill={STAR}
                  opacity={s.a * tw}
                />
              );
            })}

            {/* Hero stars get cross diffraction spikes */}
            {STARS.filter((s) => s.r > 2.2).map((s, i) => {
              const tw = twinkle(s.tw);
              const spike = 10 + s.r * 2.4;
              return (
                <g
                  key={`h-${i}`}
                  stroke={STAR}
                  strokeOpacity={0.55 * tw}
                  strokeWidth={0.9}
                  filter="url(#soft-glow)"
                >
                  <line
                    x1={s.x - spike}
                    y1={s.y}
                    x2={s.x + spike}
                    y2={s.y}
                  />
                  <line
                    x1={s.x}
                    y1={s.y - spike}
                    x2={s.x}
                    y2={s.y + spike}
                  />
                </g>
              );
            })}
          </g>

          {/* Horizon haze (keeps horizon reading as the ground plane) */}
          <rect
            x={0}
            y={SKY_H - 180}
            width={1080}
            height={200}
            fill="url(#horizon-fade)"
          />
        </g>

        {/* ── Bearing line (navigator's sight-line) ─────────────────── */}
        <g opacity={bearingDraw}>
          {/* Dashed sight-line from beetle up through galactic core */}
          <line
            x1={bearingStart.x}
            y1={bearingStart.y}
            x2={bearingStart.x + (bearingEnd.x - bearingStart.x) * bearingDraw}
            y2={bearingStart.y + (bearingEnd.y - bearingStart.y) * bearingDraw}
            stroke={STAR}
            strokeOpacity={0.55}
            strokeWidth={1}
            strokeDasharray="4 6"
          />
          {/* Tick marks along bearing */}
          {[0.2, 0.4, 0.6, 0.8].map((t, i) => {
            const x = bearingStart.x + (bearingEnd.x - bearingStart.x) * t;
            const y = bearingStart.y + (bearingEnd.y - bearingStart.y) * t;
            const dirX = (bearingEnd.x - bearingStart.x) / bearingLen;
            const dirY = (bearingEnd.y - bearingStart.y) / bearingLen;
            const perpX = -dirY;
            const perpY = dirX;
            const show = bearingDraw > t + 0.05 ? 1 : 0;
            return (
              <line
                key={`tick-${i}`}
                x1={x - perpX * 5}
                y1={y - perpY * 5}
                x2={x + perpX * 5}
                y2={y + perpY * 5}
                stroke={STAR}
                strokeOpacity={0.6 * show}
                strokeWidth={1}
              />
            );
          })}
          {/* Reticle at galactic core end */}
          <g
            transform={`translate(${bearingEnd.x}, ${bearingEnd.y})`}
            opacity={interpolate(bearingDraw, [0.7, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <circle
              r={18}
              fill="none"
              stroke={STAR}
              strokeOpacity={0.75}
              strokeWidth={1}
            />
            <circle
              r={10}
              fill="none"
              stroke={STAR}
              strokeOpacity={0.6}
              strokeWidth={0.8}
            />
            <line x1={-24} y1={0} x2={-12} y2={0} stroke={STAR} strokeOpacity={0.75} strokeWidth={1} />
            <line x1={12} y1={0} x2={24} y2={0} stroke={STAR} strokeOpacity={0.75} strokeWidth={1} />
            <line x1={0} y1={-24} x2={0} y2={-12} stroke={STAR} strokeOpacity={0.75} strokeWidth={1} />
            <line x1={0} y1={12} x2={0} y2={24} stroke={STAR} strokeOpacity={0.75} strokeWidth={1} />
          </g>
          {/* Bearing readout */}
          <g
            transform={`translate(${bearingEnd.x + 36}, ${bearingEnd.y - 24})`}
            opacity={interpolate(bearingDraw, [0.75, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <text
              fill={STAR}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3.2}
              fontWeight={600}
            >
              BEARING
            </text>
            <text
              y={16}
              fill={HAZE}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={2.2}
              fontWeight={500}
            >
              GALACTIC CORE · 342°
            </text>
          </g>
        </g>

        {/* ── Horizon line + survey ticks ───────────────────────────── */}
        <g>
          <line
            x1={60}
            y1={HORIZON_Y}
            x2={1020}
            y2={HORIZON_Y}
            stroke={BRONZE}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          {/* Compass tick marks along horizon */}
          {Array.from({ length: 25 }).map((_, i) => {
            const x = 60 + i * 40;
            const major = i % 5 === 0;
            return (
              <line
                key={`tk-${i}`}
                x1={x}
                y1={HORIZON_Y}
                x2={x}
                y2={HORIZON_Y + (major ? 10 : 5)}
                stroke={BRONZE}
                strokeOpacity={major ? 0.75 : 0.4}
                strokeWidth={1}
              />
            );
          })}
          {/* Compass bearing marks */}
          {[
            { x: 80, label: "W" },
            { x: 540, label: "N" },
            { x: 1000, label: "E" },
          ].map((m) => (
            <text
              key={m.label}
              x={m.x}
              y={HORIZON_Y + 32}
              fill={BRONZE}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
              textAnchor="middle"
            >
              {m.label}
            </text>
          ))}
        </g>

        {/* ── Beetle + dung ball ────────────────────────────────────── */}
        <g
          transform={`translate(${beetleX}, ${beetleY}) scale(${BEETLE_SCALE})`}
          opacity={interpolate(skyRise, [0.1, 0.9], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          {/* Ball — in front of beetle, slightly larger than beetle's body */}
          <g transform={`translate(44, -24)`}>
            <ellipse cx={0} cy={30} rx={28} ry={5} fill="#000" opacity={0.5} />
            <circle cx={0} cy={0} r={30} fill="url(#ball-grad)" />
            <g transform={`rotate(${ballRotation})`}>
              {/* Surface flecks to show rotation */}
              <circle cx={-14} cy={-6} r={3} fill="#8B5A2B" opacity={0.6} />
              <circle cx={9} cy={-13} r={2.2} fill="#8B5A2B" opacity={0.6} />
              <circle cx={13} cy={10} r={2.6} fill="#8B5A2B" opacity={0.55} />
              <circle cx={-8} cy={14} r={1.8} fill="#5E3A17" opacity={0.6} />
              <circle cx={2} cy={2} r={1.6} fill="#5E3A17" opacity={0.6} />
              <path
                d="M -22 2 Q -10 -4 -2 6"
                stroke="#5E3A17"
                strokeOpacity={0.4}
                strokeWidth={1}
                fill="none"
              />
            </g>
            {/* Rim light */}
            <circle
              cx={0}
              cy={0}
              r={30}
              fill="none"
              stroke={STAR}
              strokeOpacity={0.12}
              strokeWidth={1}
            />
          </g>

          {/* Beetle silhouette — classic headstand pose (hind legs up on the
               ball, fore and middle legs on the ground, abdomen high).
               Facing RIGHT (toward the ball). Origin on the horizon under
               the shoulder. Drawn slightly larger and crisper so the
               silhouette reads at thumbnail size. */}
          <g>
            {/* ground shadow */}
            <ellipse cx={-4} cy={2} rx={38} ry={4} fill="#000" opacity={0.6} />

            {/* Legs — drawn FIRST (behind body) so they tuck under the elytra */}
            <g
              stroke="#07040C"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            >
              {/* Hind legs: climb up onto top of ball */}
              <path d="M 10 -22 Q 24 -32 36 -42 Q 42 -46 48 -46" />
              <path d="M 4 -24 Q 16 -36 28 -46 Q 36 -50 44 -48" />
              {/* Middle legs: plant on ground, behind the body */}
              <path d="M -8 -14 Q -14 -4 -10 2 Q -4 4 2 2" />
              {/* Fore legs: dug in, in front of head */}
              <path d="M -22 -16 Q -30 -6 -28 2 Q -22 4 -14 2" />
              <path d="M -26 -14 Q -34 -2 -32 4 Q -26 6 -20 4" />
            </g>

            {/* Elytra (wing cases) — the main body, raised */}
            <path
              d="M -32 -22 Q -38 -8 -26 -4 Q -10 -2 10 -8 Q 20 -12 20 -22 Q 18 -32 2 -34 Q -18 -36 -30 -30 Z"
              fill="#1C1430"
              stroke="#3A2A52"
              strokeWidth={0.8}
            />
            {/* Elytra seam (middle ridge) */}
            <path
              d="M -28 -26 Q -8 -30 12 -18"
              stroke="#070410"
              strokeWidth={0.9}
              fill="none"
            />
            {/* Iridescent sheen on top of elytra */}
            <path
              d="M -24 -29 Q -8 -32 8 -27"
              stroke="#5B4A82"
              strokeOpacity={0.85}
              strokeWidth={1.2}
              fill="none"
            />
            {/* Highlight dot */}
            <ellipse cx={-6} cy={-30} rx={5} ry={1.1} fill="#8A74C2" opacity={0.5} />

            {/* Pronotum (shoulder plate) — darker separation */}
            <path
              d="M 4 -26 Q 18 -24 22 -16 Q 22 -8 12 -6 Q 6 -8 4 -14 Z"
              fill="#120B22"
              stroke="#2A1F3A"
              strokeWidth={0.6}
            />

            {/* Head — lower, pushed under the ball */}
            <path
              d="M 18 -14 Q 30 -12 30 -4 Q 28 2 20 2 Q 12 2 12 -6 Z"
              fill="#07040E"
            />
            {/* Clypeus teeth — the serrated front edge scarabs use to shovel */}
            <g fill="#07040E" stroke="#2A1F3A" strokeWidth={0.4}>
              <path d="M 28 -2 L 34 -4 L 32 -6 L 36 -7 L 33 -9 L 36 -10 L 30 -11 Z" />
            </g>

            {/* Antenna — fan-shaped lamellae (scarab signature) */}
            <g stroke="#07040E" strokeWidth={0.9} fill="#07040E">
              <path d="M 26 -8 Q 32 -14 38 -14" fill="none" />
              <g transform="translate(38 -14) rotate(-10)">
                <rect x={0} y={-2.4} width={5} height={2} rx={0.6} />
                <rect x={5.5} y={-2.4} width={5} height={2} rx={0.6} />
                <rect x={11} y={-2.4} width={4} height={2} rx={0.6} />
              </g>
            </g>

            {/* Faint dirt trail behind the beetle — the dead-straight path.
                 Drawn as a very faint dashed arc running back along horizon. */}
            <g stroke={BRONZE} strokeOpacity={0.3} strokeWidth={1.2} strokeLinecap="round">
              <line x1={-40} y1={4} x2={-120} y2={4} strokeDasharray="2 5" />
              <line x1={-40} y1={6.5} x2={-110} y2={6.5} strokeDasharray="1.5 7" opacity={0.6} />
            </g>
          </g>

        </g>

        {/* Caption strip just below horizon */}
        <g
          transform={`translate(72, ${HORIZON_Y + 56})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={titleSpring}
        >
          <text>FIG. 1 · ESCAPE BEARING FIXED ON GALACTIC BAND</text>
          <text x={1080 - 144} textAnchor="end" fill={STAR} opacity={0.85}>
            SCARABAEUS SATYRUS · S 29°
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 1000,
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
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Celestial Navigator
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 76,
            lineHeight: 0.96,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          A beetle who steers
          <br />
          by the galaxy.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          On moonless nights{" "}
          <span style={{ color: STAR, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          rolls its ball in a dead-straight line by orienting to the diffuse
          band of the Milky Way itself — cap the galactic band alone and the
          beetle's path collapses into aimless spirals.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 42,
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
          <span style={{ color: BRONZE }}>●</span> Dung ball = Compass axle
        </span>
      </div>
    </AbsoluteFill>
  );
};
