import React, { useMemo } from "react";
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

// ── Palette from the visual brief ─────────────────────────────────────────
const INK = "#070912";
const SKY_DEEP = "#0A0D1C";
const SKY_MID = "#141A34";
const STARLIGHT = "#E9D6A6";
const DUST_WARM = "#C67553";
const DUST_COOL = "#8A6FAE";
const GRAY = "#8A8F99";
const WHITE = "#F5F7FF";
const RETICLE = "#1E2440";
const RETICLE_MAJOR = "#2A3050";

// ── PRNG ──────────────────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Sky map coords (1080 × 800 virtual) ───────────────────────────────────
// The band of the Milky Way runs from upper-left to lower-right.
const MW_A = { x: 120, y: 90 };
const MW_B = { x: 1000, y: 640 };
const HORIZON_Y = 740;

const MW_VX = MW_B.x - MW_A.x;
const MW_VY = MW_B.y - MW_A.y;
const MW_LEN = Math.hypot(MW_VX, MW_VY);
const MW_UX = MW_VX / MW_LEN;
const MW_UY = MW_VY / MW_LEN;
const MW_NX = -MW_UY;
const MW_NY = MW_UX;
const MW_MID = { x: (MW_A.x + MW_B.x) / 2, y: (MW_A.y + MW_B.y) / 2 };
const MW_ANGLE_DEG = (Math.atan2(MW_VY, MW_VX) * 180) / Math.PI;

// ── Stars ─────────────────────────────────────────────────────────────────
type Star = {
  x: number;
  y: number;
  r: number;
  bright: number;
  tw: number;
  hue: "w" | "a" | "b";
};

function makeStars(): Star[] {
  const rng = mulberry32(20260713);
  const stars: Star[] = [];

  // Dense stars along the Milky Way band
  for (let i = 0; i < 380; i++) {
    const t = rng();
    // perpendicular offset — Gaussian-ish, concentrated near band centerline
    const g = (rng() + rng() + rng()) / 3 - 0.5; // ~ [-0.5, 0.5], centered
    const perp = g * 260;
    const cx = MW_A.x + t * MW_VX;
    const cy = MW_A.y + t * MW_VY;
    const x = cx + MW_NX * perp;
    const y = cy + MW_NY * perp;
    if (x < -20 || x > 1100 || y < -20 || y > HORIZON_Y - 8) continue;
    const rr = rng();
    const r = 0.5 + Math.pow(rr, 4) * 3.2;
    const bright = 0.4 + Math.pow(rng(), 1.5) * 0.6;
    const hueRoll = rng();
    const hue: Star["hue"] =
      hueRoll < 0.55 ? "w" : hueRoll < 0.9 ? "a" : "b";
    stars.push({ x, y, r, bright, tw: rng(), hue });
  }

  // Sparse background field
  for (let i = 0; i < 160; i++) {
    const x = rng() * 1080;
    const y = rng() * (HORIZON_Y - 10);
    const r = 0.4 + Math.pow(rng(), 4) * 1.6;
    const bright = 0.25 + rng() * 0.45;
    stars.push({ x, y, r, bright, tw: rng(), hue: "w" });
  }

  // A handful of "bright" hero stars scattered across the sky
  for (let i = 0; i < 14; i++) {
    const x = 60 + rng() * 960;
    const y = 60 + rng() * (HORIZON_Y - 100);
    const r = 1.8 + rng() * 1.2;
    stars.push({ x, y, r, bright: 0.95, tw: rng(), hue: "w" });
  }

  return stars;
}

// ── Nebular dust clouds along the band ────────────────────────────────────
type Cloud = {
  cx: number;
  cy: number;
  r: number;
  o: number;
  warm: boolean;
};
function makeClouds(): Cloud[] {
  const rng = mulberry32(9931);
  const clouds: Cloud[] = [];
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const cx0 = MW_A.x + t * MW_VX;
    const cy0 = MW_A.y + t * MW_VY;
    const perp = (rng() - 0.5) * 70;
    const cx = cx0 + MW_NX * perp;
    const cy = cy0 + MW_NY * perp;
    const r = 130 + rng() * 90;
    const o = 0.14 + rng() * 0.14;
    const warm = rng() < 0.55;
    clouds.push({ cx, cy, r, o, warm });
  }
  return clouds;
}

// ── Reticle lines ─────────────────────────────────────────────────────────
const RETICLE_H = [80, 220, 360, 500, 640];
const RETICLE_V = [180, 360, 540, 720, 900];

// ── Beetle silhouette ─────────────────────────────────────────────────────
// Side view: beetle walks LEFT-to-RIGHT along the horizon, pushing a ball.
// Real dung beetles push backward with hind legs, so from the side the ball
// trails behind the direction of travel. Beetle facing right, ball behind.
const Beetle: React.FC<{ x: number; y: number; opacity: number }> = ({
  x,
  y,
  opacity,
}) => (
  <g transform={`translate(${x}, ${y}) scale(1.9)`} opacity={opacity}>
    {/* Faint warm glow underneath — starlight rim on the ground */}
    <ellipse cx={0} cy={3} rx={30} ry={3.2} fill={DUST_WARM} opacity={0.28} />

    {/* Dung ball — behind (to the left of) the beetle */}
    <circle cx={-22} cy={-10} r={12.5} fill="#04060E" />
    <circle
      cx={-22}
      cy={-10}
      r={12.5}
      fill="none"
      stroke={DUST_WARM}
      strokeWidth={1.1}
      strokeOpacity={0.75}
    />
    <ellipse cx={-26} cy={-14} rx={3.2} ry={2.2} fill={STARLIGHT} opacity={0.5} />
    <path
      d="M -30 -8 Q -22 -22 -14 -8"
      stroke={DUST_WARM}
      strokeOpacity={0.35}
      strokeWidth={0.6}
      fill="none"
    />

    {/* Beetle body */}
    <ellipse cx={3} cy={-8} rx={11.5} ry={8} fill="#04060E" />
    {/* Pronotum rim (warm starlight highlight) */}
    <path
      d="M -6 -11 Q 3 -15 12 -10"
      stroke={DUST_WARM}
      strokeWidth={1.1}
      strokeOpacity={0.85}
      fill="none"
    />
    {/* Elytra midline */}
    <line
      x1={3}
      y1={-14}
      x2={3}
      y2={-3}
      stroke={DUST_WARM}
      strokeOpacity={0.5}
      strokeWidth={0.7}
    />
    {/* Head */}
    <ellipse cx={13} cy={-6} rx={4.2} ry={3.2} fill="#04060E" />
    {/* Head rim */}
    <path
      d="M 10 -9 Q 14 -10 16 -7"
      stroke={DUST_WARM}
      strokeOpacity={0.7}
      strokeWidth={0.8}
      fill="none"
    />

    {/* Legs (thin dark strokes) */}
    <g stroke="#04060E" strokeWidth={1.4} strokeLinecap="round">
      <line x1={11} y1={-2} x2={15} y2={3} />
      <line x1={3} y1={-1} x2={5} y2={3} />
      <line x1={-5} y1={-3} x2={-10} y2={-5} />
      <line x1={-6} y1={-5} x2={-14} y2={-7} />
    </g>
  </g>
);

// ── Corner marks (crosshair style) ────────────────────────────────────────
type Corner = readonly [number, number, -1 | 1, -1 | 1];
const CORNER_LEN = 22;
const CornerMarks: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}> = ({ x, y, w, h, color }) => {
  const corners: Corner[] = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  return (
    <g stroke={color} strokeWidth={1.4} fill="none">
      {corners.map(([cx, cy, sx, sy], i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={cx + sx * CORNER_LEN} y2={cy} />
          <line x1={cx} y1={cy} x2={cx} y2={cy + sy * CORNER_LEN} />
        </g>
      ))}
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stars = useMemo(() => makeStars(), []);
  const clouds = useMemo(() => makeClouds(), []);

  // ── Animation phases ─────────────────────────────────────────────────
  const skyIn = interpolate(frame, [0, 22], [0, 1], {
    extrapolateRight: "clamp",
  });
  const dustIn = interpolate(frame, [10, 55], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const starsIn = interpolate(frame, [8, 45], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const bearingIn = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 200, mass: 0.8, stiffness: 90 },
  });

  // Beetle path — walks slowly across the horizon, centered on the map
  const beetleT = interpolate(frame, [fps * 2.0, fps * 4.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beetleTe = beetleT < 0.5
    ? 2 * beetleT * beetleT
    : 1 - Math.pow(-2 * beetleT + 2, 2) / 2;
  const beetleX = 340 + beetleTe * 200;
  const beetleY = HORIZON_Y - 10;

  // Bearing target sits ON the galactic core — the brightest patch of the band.
  // The readout is the beetle's LOCKED walking heading (what Dacke measures) —
  // a fixed value regardless of frame, since a straight-line roll = constant bearing.
  const bearingTarget = { x: 490, y: 340 };
  const bearingAngleDeg = 42;

  // Title / hook motion
  const titleSpring = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.3, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Layout (1080 × 1350) ─────────────────────────────────────────────
  const FRAME_X = 60;
  const FRAME_Y = 130;
  const FRAME_W = 960;
  const FRAME_H = 711;
  const MAP_W = 1080;
  const scale = FRAME_W / MAP_W;

  // Twinkle helper (very small amplitude, phase-dispersed)
  const twinkle = (tw: number) => {
    const phase = tw * Math.PI * 2 + (frame / fps) * (0.35 + tw * 0.9);
    return 0.75 + 0.25 * Math.sin(phase);
  };

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
        <span style={{ color: STARLIGHT }}>2026 · 07 · 13</span>
      </div>

      {/* Sky panel */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="sky-bg" cx="55%" cy="30%" r="85%">
            <stop offset="0%" stopColor={SKY_MID} stopOpacity={1} />
            <stop offset="45%" stopColor={SKY_DEEP} stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="horizon-glow" x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor={DUST_WARM} stopOpacity={0} />
            <stop offset="100%" stopColor={DUST_WARM} stopOpacity={0.32} />
          </linearGradient>

          <radialGradient id="warm-cloud" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={DUST_WARM} stopOpacity={0.9} />
            <stop offset="60%" stopColor={DUST_WARM} stopOpacity={0.3} />
            <stop offset="100%" stopColor={DUST_WARM} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="cool-cloud" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={DUST_COOL} stopOpacity={0.85} />
            <stop offset="60%" stopColor={DUST_COOL} stopOpacity={0.25} />
            <stop offset="100%" stopColor={DUST_COOL} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="core-cloud" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STARLIGHT} stopOpacity={0.65} />
            <stop offset="55%" stopColor={STARLIGHT} stopOpacity={0.16} />
            <stop offset="100%" stopColor={STARLIGHT} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={WHITE} stopOpacity={0.55} />
            <stop offset="100%" stopColor={WHITE} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="bearing-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STARLIGHT} stopOpacity={0.65} />
            <stop offset="100%" stopColor={STARLIGHT} stopOpacity={0} />
          </radialGradient>

          <filter id="dust-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={22} />
          </filter>

          <clipPath id="sky-clip">
            <rect x={FRAME_X} y={FRAME_Y} width={FRAME_W} height={FRAME_H} />
          </clipPath>
        </defs>

        {/* Sky background */}
        <rect
          x={FRAME_X}
          y={FRAME_Y}
          width={FRAME_W}
          height={FRAME_H}
          fill="url(#sky-bg)"
        />

        {/* Sky content — clipped to the panel */}
        <g clipPath="url(#sky-clip)">
          <g
            transform={`translate(${FRAME_X}, ${FRAME_Y}) scale(${scale})`}
          >
            {/* Faint RA/Dec reticle */}
            <g stroke={RETICLE} strokeWidth={0.6} opacity={0.7}>
              {RETICLE_H.map((y) => (
                <line key={`h${y}`} x1={0} y1={y} x2={1080} y2={y} />
              ))}
              {RETICLE_V.map((x) => (
                <line key={`v${x}`} x1={x} y1={0} x2={x} y2={HORIZON_Y} />
              ))}
              {/* Emphasised central meridian */}
              <line
                x1={540}
                y1={0}
                x2={540}
                y2={HORIZON_Y}
                stroke={RETICLE_MAJOR}
                strokeWidth={0.9}
              />
            </g>

            {/* Reticle tick labels (declination + RA) */}
            <g
              fill={GRAY}
              fontFamily={inter}
              fontSize={11}
              fontWeight={500}
              letterSpacing={2.2}
              opacity={0.45}
            >
              {[
                { y: 80, t: "+60°" },
                { y: 220, t: "+30°" },
                { y: 360, t: "  0°" },
                { y: 500, t: "-30°" },
                { y: 640, t: "-60°" },
              ].map((r) => (
                <text key={r.t} x={14} y={r.y - 4}>
                  {r.t}
                </text>
              ))}
              {[
                { x: 180, t: "18H" },
                { x: 360, t: "19H" },
                { x: 540, t: "20H" },
                { x: 720, t: "21H" },
                { x: 900, t: "22H" },
              ].map((r) => (
                <text
                  key={r.t}
                  x={r.x + 6}
                  y={HORIZON_Y - 10}
                >
                  {r.t}
                </text>
              ))}
            </g>

            {/* Nebular dust band — big soft ellipse under everything */}
            <g opacity={dustIn}>
              <ellipse
                cx={MW_MID.x}
                cy={MW_MID.y}
                rx={MW_LEN / 2}
                ry={110}
                fill={STARLIGHT}
                fillOpacity={0.09}
                transform={`rotate(${MW_ANGLE_DEG} ${MW_MID.x} ${MW_MID.y})`}
                filter="url(#dust-blur)"
              />
              {/* Nebular clouds along the band */}
              {clouds.map((c, i) => (
                <ellipse
                  key={i}
                  cx={c.cx}
                  cy={c.cy}
                  rx={c.r * 1.15}
                  ry={c.r * 0.75}
                  fill={
                    c.warm ? "url(#warm-cloud)" : "url(#cool-cloud)"
                  }
                  opacity={c.o}
                  transform={`rotate(${MW_ANGLE_DEG} ${c.cx} ${c.cy})`}
                />
              ))}
              {/* Galactic core — brightest patch */}
              <ellipse
                cx={480}
                cy={340}
                rx={200}
                ry={130}
                fill="url(#core-cloud)"
                transform={`rotate(${MW_ANGLE_DEG} 480 340)`}
              />
            </g>

            {/* Stars */}
            <g opacity={starsIn}>
              {stars.map((s, i) => {
                const tw = twinkle(s.tw);
                const fill =
                  s.hue === "w"
                    ? WHITE
                    : s.hue === "a"
                      ? STARLIGHT
                      : DUST_COOL;
                const isHero = s.r > 1.7;
                return (
                  <g key={i}>
                    {isHero && (
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r={s.r * 4.2}
                        fill="url(#hero-glow)"
                        opacity={s.bright * tw * 0.8}
                      />
                    )}
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={s.r}
                      fill={fill}
                      opacity={s.bright * tw}
                    />
                  </g>
                );
              })}
            </g>

            {/* Horizon airglow */}
            <rect
              x={0}
              y={HORIZON_Y - 46}
              width={1080}
              height={46}
              fill="url(#horizon-glow)"
              opacity={0.9}
            />
            {/* Horizon line */}
            <line
              x1={0}
              y1={HORIZON_Y}
              x2={1080}
              y2={HORIZON_Y}
              stroke={DUST_WARM}
              strokeOpacity={0.4}
              strokeWidth={0.9}
            />
            {/* Dark savanna ground */}
            <rect
              x={0}
              y={HORIZON_Y}
              width={1080}
              height={800 - HORIZON_Y}
              fill="#04060C"
            />
            {/* Subtle grass texture — soft warm dots */}
            {Array.from({ length: 40 }).map((_, i) => {
              const rng = mulberry32(700 + i);
              const gx = rng() * 1080;
              const gy = HORIZON_Y + 4 + rng() * 40;
              return (
                <circle
                  key={i}
                  cx={gx}
                  cy={gy}
                  r={0.7}
                  fill={DUST_WARM}
                  opacity={0.15 + rng() * 0.15}
                />
              );
            })}

            {/* Bearing line — from beetle up to the "fixed" bright star */}
            <g opacity={bearingIn}>
              {/* Dashed bearing line */}
              <line
                x1={beetleX}
                y1={beetleY - 10}
                x2={bearingTarget.x}
                y2={bearingTarget.y}
                stroke={DUST_WARM}
                strokeWidth={1.4}
                strokeOpacity={0.95}
                strokeDasharray="4 7"
                strokeLinecap="round"
              />
              {/* Concentric target rings on the core star */}
              <circle
                cx={bearingTarget.x}
                cy={bearingTarget.y}
                r={22}
                fill="none"
                stroke={DUST_WARM}
                strokeWidth={1}
                strokeOpacity={0.55}
              />
              <circle
                cx={bearingTarget.x}
                cy={bearingTarget.y}
                r={11}
                fill="none"
                stroke={DUST_WARM}
                strokeWidth={1.1}
                strokeOpacity={0.85}
              />
              {/* Bright locked star */}
              <circle
                cx={bearingTarget.x}
                cy={bearingTarget.y}
                r={4.5}
                fill={WHITE}
              />
              <circle
                cx={bearingTarget.x}
                cy={bearingTarget.y}
                r={2}
                fill={STARLIGHT}
              />

              {/* Leader out to a clean label in the dark sky */}
              {(() => {
                const lx = bearingTarget.x + 130;
                const ly = bearingTarget.y - 100;
                const lx2 = lx + 96;
                return (
                  <g>
                    <line
                      x1={bearingTarget.x + 18}
                      y1={bearingTarget.y - 14}
                      x2={lx}
                      y2={ly}
                      stroke={DUST_WARM}
                      strokeWidth={1}
                      strokeOpacity={0.75}
                    />
                    <line
                      x1={lx}
                      y1={ly}
                      x2={lx2}
                      y2={ly}
                      stroke={DUST_WARM}
                      strokeWidth={1}
                      strokeOpacity={0.75}
                    />
                    <g
                      transform={`translate(${lx + 6}, ${ly - 22})`}
                      fill={DUST_WARM}
                      fontFamily={inter}
                      fontWeight={600}
                      letterSpacing={2.8}
                    >
                      <text fontSize={11}>GALACTIC CORE</text>
                      <text
                        y={16}
                        fill={STARLIGHT}
                        fontWeight={500}
                        fontSize={11}
                        letterSpacing={2.4}
                        opacity={0.95}
                      >
                        BEARING · {String(Math.abs(bearingAngleDeg)).padStart(3, "0")}°
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>

            {/* Beetle */}
            <Beetle x={beetleX} y={beetleY} opacity={interpolate(frame, [fps * 0.9, fps * 1.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />

            {/* Beetle track — subtle dotted trail behind the beetle */}
            <g opacity={bearingIn * 0.55}>
              {Array.from({ length: 20 }).map((_, i) => {
                const tx = 320 + i * 12;
                if (tx > beetleX - 50) return null;
                return (
                  <circle
                    key={i}
                    cx={tx}
                    cy={HORIZON_Y + 4}
                    r={1}
                    fill={DUST_WARM}
                    opacity={0.55}
                  />
                );
              })}
            </g>
          </g>
        </g>

        {/* Corner marks */}
        <CornerMarks
          x={FRAME_X}
          y={FRAME_Y}
          w={FRAME_W}
          h={FRAME_H}
          color={DUST_WARM}
        />

        {/* Thin inner border */}
        <rect
          x={FRAME_X + 0.5}
          y={FRAME_Y + 0.5}
          width={FRAME_W - 1}
          height={FRAME_H - 1}
          fill="none"
          stroke="#1B2140"
          strokeWidth={1}
        />

        {/* Field notebook labels — top-left of frame */}
        <g
          transform={`translate(${FRAME_X + 24}, ${FRAME_Y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          fontWeight={500}
          letterSpacing={3}
        >
          <text>PLATE I · S. SATYRUS · KALAHARI · 22:40 SAST</text>
        </g>
        <g
          transform={`translate(${FRAME_X + FRAME_W - 24}, ${FRAME_Y + 30})`}
          fill={STARLIGHT}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={3.2}
          textAnchor="end"
        >
          <text>NEW MOON · CLEAR</text>
        </g>

        {/* Caption strip below frame */}
        <g
          transform={`translate(${FRAME_X}, ${FRAME_Y + FRAME_H + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · BEETLE LOCKS BEARING TO GALACTIC BAND</text>
          <text
            x={FRAME_W}
            textAnchor="end"
            fill={DUST_WARM}
            opacity={0.9}
          >
            STRAIGHT-LINE ROLL SUSTAINED
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
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [16, 0]
          )}px)`,
        }}
      >
        <div
          style={{
            color: STARLIGHT,
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
            Astronomer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          Steers by
          <br />
          starlight.
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
          On moonless nights the dung beetle{" "}
          <span style={{ color: STARLIGHT, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          fixes its bearing on the diffuse band of the Milky Way itself —
          the first non‑human animal shown to navigate by the entire
          galaxy.
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
          <span style={{ color: DUST_WARM }}>●</span> Star = Bearing lock
        </span>
      </div>
    </AbsoluteFill>
  );
};
