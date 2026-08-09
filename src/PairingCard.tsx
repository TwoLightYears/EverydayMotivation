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

// ── Palette (from the concept's visual brief) ───────────────────────────
const INK = "#08091A";
const GLOW = "#F1E4B8";
const TWILIGHT = "#2D3350";
const SAND = "#C8935A";
const GRAY = "#7C8496";
const STAR = "#FFFFFF";

// ── Frame layout (1080 × 1350 portrait) ─────────────────────────────────
// Metadata band:  56..90
// Chart frame  :  118..908   (h 790)
// Caption strip:  ~932
// Type block   :  ~972..1275
// Footer       :  1310
const FRAME = { x: 60, y: 118, w: 960, h: 790 };
const SKY_TOP = FRAME.y + 24;
const HORIZON = FRAME.y + FRAME.h - 160; // sand starts here

// ── Milky Way band geometry (in the frame's local coordinate space) ────
// A gentle arch: enters left-middle, peaks upper-centre, exits right-middle.
// Control points chosen so the band's tangent at x = beetleX is nearly
// horizontal — that way the perpendicular is nearly vertical, and the
// beetle's sight-line reads as a clean plumb reading.
const BAND_START = { x: FRAME.x - 40, y: FRAME.y + 430 };
const BAND_CTRL1 = { x: FRAME.x + 240, y: FRAME.y + 40 };
const BAND_CTRL2 = { x: FRAME.x + 720, y: FRAME.y + 40 };
const BAND_END = { x: FRAME.x + FRAME.w + 40, y: FRAME.y + 430 };

// Cubic Bezier evaluator
const bezier = (t: number) => {
  const u = 1 - t;
  const x =
    u * u * u * BAND_START.x +
    3 * u * u * t * BAND_CTRL1.x +
    3 * u * t * t * BAND_CTRL2.x +
    t * t * t * BAND_END.x;
  const y =
    u * u * u * BAND_START.y +
    3 * u * u * t * BAND_CTRL1.y +
    3 * u * t * t * BAND_CTRL2.y +
    t * t * t * BAND_END.y;
  return { x, y };
};
const bezierTangent = (t: number) => {
  const u = 1 - t;
  const dx =
    3 * u * u * (BAND_CTRL1.x - BAND_START.x) +
    6 * u * t * (BAND_CTRL2.x - BAND_CTRL1.x) +
    3 * t * t * (BAND_END.x - BAND_CTRL2.x);
  const dy =
    3 * u * u * (BAND_CTRL1.y - BAND_START.y) +
    6 * u * t * (BAND_CTRL2.y - BAND_CTRL1.y) +
    3 * t * t * (BAND_END.y - BAND_CTRL2.y);
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
};

const BAND_PATH = `M ${BAND_START.x} ${BAND_START.y} C ${BAND_CTRL1.x} ${BAND_CTRL1.y}, ${BAND_CTRL2.x} ${BAND_CTRL2.y}, ${BAND_END.x} ${BAND_END.y}`;

// The beetle sits directly below the galactic core (t ≈ 0.5)
const READ_T = 0.5;
const READ_POINT = bezier(READ_T);
const READ_TANGENT = bezierTangent(READ_T);
const READ_NORMAL = { x: -READ_TANGENT.y, y: READ_TANGENT.x };

// Beetle sits on the sand, directly below the sight target.
// SCALE controls the drawing size of the side-profile beetle.
const BEETLE = { x: READ_POINT.x, y: HORIZON + 62 };
const BEETLE_SCALE = 1.75;

// ── Deterministic PRNG (mulberry32) for star field ──────────────────────
const mulberry = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Background stars: uniform in the sky region
type Star = { x: number; y: number; r: number; a: number; twinkle: number };
const buildBackgroundStars = (): Star[] => {
  const rnd = mulberry(1337);
  const N = 180;
  const stars: Star[] = [];
  for (let i = 0; i < N; i++) {
    const x = FRAME.x + rnd() * FRAME.w;
    const y = SKY_TOP + rnd() * (HORIZON - SKY_TOP - 30);
    const r = 0.4 + Math.pow(rnd(), 3.2) * 1.9;
    const a = 0.25 + rnd() * 0.65;
    const twinkle = rnd();
    stars.push({ x, y, r, a, twinkle });
  }
  return stars;
};

// Milky Way stars: distributed along the arch, denser near the core
const buildBandStars = (): Star[] => {
  const rnd = mulberry(9021);
  const N = 340;
  const stars: Star[] = [];
  for (let i = 0; i < N; i++) {
    const t = rnd();
    const p = bezier(t);
    const tan = bezierTangent(t);
    const nrm = { x: -tan.y, y: tan.x };
    // Gaussian-ish transverse offset — thicker toward the middle
    const g = (rnd() + rnd() + rnd() + rnd() - 2) / 2; // ~[-1,1]
    const thickness = 46 + 32 * Math.sin(t * Math.PI);
    const off = g * thickness;
    const x = p.x + nrm.x * off;
    const y = p.y + nrm.y * off;
    if (y > HORIZON - 8 || y < SKY_TOP - 4) continue;
    const nearCore = 1 - Math.abs(t - 0.5) * 2;
    const r = 0.5 + Math.pow(rnd(), 2) * (1.6 + nearCore * 1.2);
    const a = 0.35 + rnd() * 0.55 + nearCore * 0.2;
    const twinkle = rnd();
    stars.push({ x, y, r, a: Math.min(1, a), twinkle });
  }
  return stars;
};

// A few named "hero" stars for extra sparkle around the sight-target
const HERO_STARS: { x: number; y: number; r: number }[] = (() => {
  const rnd = mulberry(4711);
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const t = 0.28 + rnd() * 0.44;
    const p = bezier(t);
    const nrm = (() => {
      const tan = bezierTangent(t);
      return { x: -tan.y, y: tan.x };
    })();
    const off = (rnd() - 0.5) * 60;
    out.push({ x: p.x + nrm.x * off, y: p.y + nrm.y * off, r: 2 + rnd() * 1.5 });
  }
  return out;
})();

const BG_STARS = buildBackgroundStars();
const BAND_STARS = buildBandStars();

// ── Beetle in SIDE PROFILE, rolling its ball ────────────────────────────
// Dung beetles roll balls backwards: they push with hind legs while their
// head is down. Here we present a clean iconic silhouette — beetle low on
// the sand, one hind leg on the ball behind it, head-down and forward.
// (x, y) is the beetle's ground contact point (front feet).
const Beetle: React.FC<{ x: number; y: number; scale: number }> = ({
  x,
  y,
  scale,
}) => {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Long shadow across the sand under both beetle and ball */}
      <ellipse cx={2} cy={2} rx={44} ry={3.2} fill="#000" opacity={0.45} />

      {/* Dung ball — behind the beetle (to the right) */}
      <g transform="translate(28, -13)">
        <circle r={15} fill={SAND} />
        <circle
          r={15}
          fill="none"
          stroke="#7C5528"
          strokeWidth={0.9}
          opacity={0.7}
        />
        {/* highlight */}
        <circle cx={-5} cy={-5} r={5.5} fill="#E9BF87" opacity={0.55} />
        {/* dark speckle */}
        <circle cx={4} cy={4} r={2.4} fill="#5C3B18" opacity={0.6} />
        <circle cx={-6} cy={5} r={1.5} fill="#5C3B18" opacity={0.5} />
        <circle cx={6} cy={-3} r={1.1} fill="#5C3B18" opacity={0.55} />
      </g>

      {/* Hind leg reaching back onto the ball */}
      <path
        d="M -2 -8 Q 8 -18 22 -18"
        stroke="#0A0D14"
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M -2 -8 Q 6 -6 22 -8"
        stroke="#0A0D14"
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />

      {/* Elytra (rear body) — dark hump */}
      <path
        d="M -22 -3 Q -20 -22 -2 -18 Q 4 -14 6 -6 L 6 0 L -22 0 Z"
        fill="#0A0D14"
      />
      {/* Elytra highlight (faint teal-blue sheen) */}
      <path
        d="M -18 -13 Q -14 -20 -6 -18"
        stroke="#2A3B58"
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        opacity={0.7}
      />
      {/* Elytra centre seam */}
      <path
        d="M -12 -19 L -8 -2"
        stroke="#000"
        strokeWidth={0.6}
        opacity={0.55}
      />

      {/* Pronotum (bulge behind head) */}
      <path
        d="M -22 -3 Q -28 -14 -22 -14 Q -18 -14 -18 -6 Z"
        fill="#080B12"
      />

      {/* Head — down and forward */}
      <path
        d="M -28 -8 Q -34 -6 -34 -2 Q -34 1 -28 1 Z"
        fill="#080B12"
      />

      {/* Clypeal "rake" — small serrations on the beetle's head */}
      <path
        d="M -34 -1 L -36 -3 M -34 0 L -37 0 M -34 1 L -36 3"
        stroke="#080B12"
        strokeWidth={0.9}
        strokeLinecap="round"
      />

      {/* Legs — three visible in profile: front, middle, back-standing */}
      {/* Front leg (bracing) */}
      <path
        d="M -24 0 Q -28 6 -28 12"
        stroke="#0A0D14"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M -28 12 L -30 14"
        stroke="#0A0D14"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      {/* Middle leg */}
      <path
        d="M -14 0 Q -12 8 -14 14"
        stroke="#0A0D14"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M -14 14 L -16 15"
        stroke="#0A0D14"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      {/* Back leg (planted for push) */}
      <path
        d="M -4 0 Q 2 10 4 14"
        stroke="#0A0D14"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 4 14 L 6 15"
        stroke="#0A0D14"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ──────────────────────────────────────────────────────────
  const starsIn = interpolate(frame, [0, fps * 1.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bandIn = interpolate(frame, [fps * 0.4, fps * 1.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sightGrow = interpolate(frame, [fps * 1.6, fps * 2.6], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const snapshotPulse = interpolate(
    frame,
    [fps * 2.5, fps * 2.85, fps * 3.6],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const bearingGrow = interpolate(frame, [fps * 3.0, fps * 4.3], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const beetleAppear = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sight line target (bright spot on the arch, directly above beetle)
  const sightTargetY = READ_POINT.y;
  const sightBottomY = BEETLE.y - 34; // just above the beetle silhouette
  const sightDrawY = sightBottomY - (sightBottomY - sightTargetY) * sightGrow;

  // "Rolled trail" — a straight line receding into the distance behind the
  // beetle (to the right, since the beetle is rolling to the LEFT — heads
  // point in the direction of travel; ball trails behind on the right).
  // The trail dashes appear ahead of the beetle in perspective (further
  // right), then reveal outward as bearingGrow → 1.
  const TRAIL_START_X = BEETLE.x + 60; // just past the ball
  const TRAIL_END_X = FRAME.x + FRAME.w - 30;
  const trailRevealX =
    TRAIL_START_X + (TRAIL_END_X - TRAIL_START_X) * bearingGrow;

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
        <span style={{ color: GLOW }}>2026 · 08 · 09</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky gradient — deep zenith to dust-warm horizon */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050614" />
            <stop offset="55%" stopColor={INK} />
            <stop offset="100%" stopColor={TWILIGHT} />
          </linearGradient>

          {/* Sand gradient */}
          <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A2C1D" />
            <stop offset="30%" stopColor="#5E4126" />
            <stop offset="100%" stopColor="#6E4B2C" />
          </linearGradient>

          {/* Milky Way glow — 3 stacked blurred bands */}
          <linearGradient id="bandCore" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GLOW} stopOpacity="0.05" />
            <stop offset="30%" stopColor={GLOW} stopOpacity="0.7" />
            <stop offset="50%" stopColor="#FFF3C7" stopOpacity="0.95" />
            <stop offset="70%" stopColor={GLOW} stopOpacity="0.7" />
            <stop offset="100%" stopColor={GLOW} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="bandDust" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B3D66" stopOpacity="0.0" />
            <stop offset="35%" stopColor="#4D4F7A" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#5B5D8C" stopOpacity="0.7" />
            <stop offset="65%" stopColor="#4D4F7A" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3B3D66" stopOpacity="0.0" />
          </linearGradient>

          <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="hardBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="starBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>

          <radialGradient id="corePulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GLOW} stopOpacity="0.9" />
            <stop offset="60%" stopColor={GLOW} stopOpacity="0.2" />
            <stop offset="100%" stopColor={GLOW} stopOpacity="0" />
          </radialGradient>

          <clipPath id="frameClip">
            <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} />
          </clipPath>
        </defs>

        {/* ── Chart frame ─────────────────────────────────────────────── */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#skyGrad)"
        />

        {/* Sand foreground band */}
        <g clipPath="url(#frameClip)">
          <rect
            x={FRAME.x}
            y={HORIZON}
            width={FRAME.w}
            height={FRAME.y + FRAME.h - HORIZON}
            fill="url(#sandGrad)"
          />
          {/* Sand grain speckle */}
          {Array.from({ length: 120 }).map((_, i) => {
            const rnd = mulberry(5000 + i)();
            const rnd2 = mulberry(6000 + i)();
            const x = FRAME.x + rnd * FRAME.w;
            const y = HORIZON + 6 + rnd2 * (FRAME.y + FRAME.h - HORIZON - 6);
            const r = 0.4 + mulberry(7000 + i)() * 1.1;
            return (
              <circle
                key={`grain-${i}`}
                cx={x}
                cy={y}
                r={r}
                fill={mulberry(8000 + i)() > 0.5 ? "#8B6438" : "#3A2A1A"}
                opacity={0.55}
              />
            );
          })}
          {/* Faint horizon line */}
          <line
            x1={FRAME.x}
            y1={HORIZON}
            x2={FRAME.x + FRAME.w}
            y2={HORIZON}
            stroke={SAND}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
          <line
            x1={FRAME.x}
            y1={HORIZON + 1}
            x2={FRAME.x + FRAME.w}
            y2={HORIZON + 1}
            stroke={INK}
            strokeOpacity={0.6}
            strokeWidth={1}
          />
        </g>

        {/* ── Sky: Milky Way ────────────────────────────────────────── */}
        <g clipPath="url(#frameClip)" opacity={bandIn}>
          {/* Outer diffuse dust */}
          <path
            d={BAND_PATH}
            stroke="url(#bandDust)"
            strokeWidth={220}
            fill="none"
            strokeLinecap="round"
            filter="url(#softBlur)"
            opacity={0.9}
          />
          {/* Mid dust lane */}
          <path
            d={BAND_PATH}
            stroke="url(#bandDust)"
            strokeWidth={120}
            fill="none"
            strokeLinecap="round"
            filter="url(#hardBlur)"
            opacity={0.85}
          />
          {/* Bright core */}
          <path
            d={BAND_PATH}
            stroke="url(#bandCore)"
            strokeWidth={54}
            fill="none"
            strokeLinecap="round"
            filter="url(#hardBlur)"
            opacity={0.9}
          />
          {/* Inner bright thread */}
          <path
            d={BAND_PATH}
            stroke="url(#bandCore)"
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
            opacity={0.6}
          />
          {/* Dark rift — thin dark cutout down the middle */}
          <path
            d={BAND_PATH}
            stroke={INK}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            opacity={0.35}
            filter="url(#hardBlur)"
          />
        </g>

        {/* ── Star field: background ──────────────────────────────── */}
        <g clipPath="url(#frameClip)" opacity={starsIn}>
          {BG_STARS.map((s, i) => {
            const tw =
              0.85 +
              0.15 *
                Math.sin((frame / fps) * (0.8 + s.twinkle * 1.6) + s.twinkle * 7);
            return (
              <circle
                key={`bg-${i}`}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill={STAR}
                opacity={s.a * tw}
              />
            );
          })}
        </g>

        {/* Star field: Milky Way stipple */}
        <g clipPath="url(#frameClip)" opacity={bandIn}>
          {BAND_STARS.map((s, i) => {
            const tw =
              0.85 +
              0.15 *
                Math.sin((frame / fps) * (0.6 + s.twinkle * 1.2) + s.twinkle * 5);
            return (
              <circle
                key={`bs-${i}`}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill={STAR}
                opacity={s.a * tw}
              />
            );
          })}
          {/* Hero stars with a soft halo */}
          {HERO_STARS.map((s, i) => (
            <g key={`hero-${i}`}>
              <circle
                cx={s.x}
                cy={s.y}
                r={s.r * 3}
                fill={STAR}
                opacity={0.18}
                filter="url(#starBlur)"
              />
              <circle cx={s.x} cy={s.y} r={s.r} fill={STAR} opacity={0.95} />
            </g>
          ))}
        </g>

        {/* ── Sight line: beetle → snapshot point on band ────────── */}
        <g clipPath="url(#frameClip)">
          {sightGrow > 0 && (
            <>
              {/* Faint dark underlay so the dashed line stays legible
                  where it crosses the bright Milky Way band */}
              <line
                x1={BEETLE.x}
                y1={sightBottomY}
                x2={BEETLE.x}
                y2={sightDrawY}
                stroke={INK}
                strokeWidth={4}
                opacity={0.4}
              />
              <line
                x1={BEETLE.x}
                y1={sightBottomY}
                x2={BEETLE.x}
                y2={sightDrawY}
                stroke={GLOW}
                strokeWidth={1.6}
                strokeDasharray="5 6"
                opacity={0.95}
              />
              {/* Tick at bottom */}
              <line
                x1={BEETLE.x - 7}
                y1={sightBottomY}
                x2={BEETLE.x + 7}
                y2={sightBottomY}
                stroke={GLOW}
                strokeWidth={1.4}
                opacity={0.9}
              />
            </>
          )}

          {/* Snapshot pulse where sight meets band */}
          {snapshotPulse > 0 && (
            <g>
              <circle
                cx={READ_POINT.x}
                cy={READ_POINT.y}
                r={18 + snapshotPulse * 42}
                fill="url(#corePulse)"
                opacity={snapshotPulse}
              />
              <circle
                cx={READ_POINT.x}
                cy={READ_POINT.y}
                r={3 + snapshotPulse * 3}
                fill={STAR}
                opacity={snapshotPulse * 0.95}
              />
              <circle
                cx={READ_POINT.x}
                cy={READ_POINT.y}
                r={30 + snapshotPulse * 30}
                fill="none"
                stroke={GLOW}
                strokeWidth={1}
                opacity={snapshotPulse * 0.7}
              />
            </g>
          )}

          {/* Sight-target crosshair marker + persistent thin ring */}
          {sightGrow > 0.6 && (
            <g
              opacity={interpolate(sightGrow, [0.6, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            >
              <circle
                cx={READ_POINT.x}
                cy={READ_POINT.y}
                r={18}
                fill="none"
                stroke={GLOW}
                strokeWidth={1}
                opacity={0.8}
              />
              <line
                x1={READ_POINT.x - 12}
                y1={READ_POINT.y}
                x2={READ_POINT.x - 5}
                y2={READ_POINT.y}
                stroke={GLOW}
                strokeWidth={1.3}
              />
              <line
                x1={READ_POINT.x + 5}
                y1={READ_POINT.y}
                x2={READ_POINT.x + 12}
                y2={READ_POINT.y}
                stroke={GLOW}
                strokeWidth={1.3}
              />
              <line
                x1={READ_POINT.x}
                y1={READ_POINT.y - 12}
                x2={READ_POINT.x}
                y2={READ_POINT.y - 5}
                stroke={GLOW}
                strokeWidth={1.3}
              />
              <line
                x1={READ_POINT.x}
                y1={READ_POINT.y + 5}
                x2={READ_POINT.x}
                y2={READ_POINT.y + 12}
                stroke={GLOW}
                strokeWidth={1.3}
              />
              {/* Bright bead at center */}
              <circle
                cx={READ_POINT.x}
                cy={READ_POINT.y}
                r={2.4}
                fill={STAR}
                opacity={0.95}
              />
            </g>
          )}
        </g>

        {/* ── Beetle's rolled path — straight-line trail on the sand ── */}
        <g clipPath="url(#frameClip)">
          {bearingGrow > 0 && (
            <>
              {/* Dashed trail — appears to recede along the beetle's true line */}
              <line
                x1={TRAIL_START_X}
                y1={BEETLE.y + 6}
                x2={trailRevealX}
                y2={BEETLE.y + 6}
                stroke={GLOW}
                strokeWidth={1.4}
                strokeDasharray="10 8"
                opacity={0.85}
              />
              {/* Small tick anchors along the trail (way-points) */}
              {[0.25, 0.5, 0.75].map((f, i) => {
                const tx = TRAIL_START_X + (TRAIL_END_X - TRAIL_START_X) * f;
                if (tx > trailRevealX) return null;
                return (
                  <line
                    key={i}
                    x1={tx}
                    y1={BEETLE.y + 1}
                    x2={tx}
                    y2={BEETLE.y + 11}
                    stroke={GLOW}
                    strokeWidth={1.1}
                    opacity={0.7}
                  />
                );
              })}
              {bearingGrow > 0.9 && (
                <text
                  x={TRAIL_END_X - 4}
                  y={BEETLE.y - 8}
                  fill={GLOW}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing={3}
                  textAnchor="end"
                  opacity={0.85}
                >
                  TRUE BEARING · 0.0°
                </text>
              )}
            </>
          )}
        </g>

        {/* ── Beetle ─────────────────────────────────────────────────── */}
        <g
          opacity={beetleAppear}
          transform={`translate(0, ${interpolate(
            beetleAppear,
            [0, 1],
            [10, 0],
          )})`}
        >
          <Beetle x={BEETLE.x} y={BEETLE.y} scale={BEETLE_SCALE} />
        </g>

        {/* ── Chart frame border + tics ──────────────────────────────── */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={GRAY}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        {/* Corner brackets */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={GLOW} strokeWidth={1.5} fill="none" opacity={0.9}>
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Compass rose (top-right of chart) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 60}, ${FRAME.y + 60})`}
          fill={GLOW}
          stroke={GLOW}
          fontFamily={inter}
        >
          <circle
            r={22}
            fill="none"
            stroke={GLOW}
            strokeOpacity={0.4}
            strokeWidth={1}
          />
          <polygon points="0,-18 -4,0 0,-4 4,0" fill={GLOW} opacity={0.95} />
          <polygon
            points="0,18 -4,0 0,4 4,0"
            fill={GLOW}
            opacity={0.35}
            stroke="none"
          />
          <text
            x={0}
            y={-27}
            textAnchor="middle"
            fontSize={11}
            letterSpacing={3}
            fontWeight={600}
            stroke="none"
          >
            N
          </text>
        </g>

        {/* Chart caption strip */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · S. SATYRUS · GALACTIC SIGHTING · KALAHARI, MOONLESS NIGHT</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={GLOW}
            opacity={0.85}
          >
            BAND: MILKY WAY · CORE ALT ≈ 55°
          </text>
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 970,
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
            color: GLOW,
            fontFamily: inter,
            fontSize: 12,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
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
            fontSize: 72,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          Steered by
          <br />
          the galaxy.
        </div>

        <div
          style={{
            marginTop: 22,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 16.5,
            lineHeight: 1.5,
            fontWeight: 400,
            maxWidth: 860,
            opacity: hookOpacity,
          }}
        >
          On moonless Kalahari nights the dung beetle{" "}
          <span style={{ color: GLOW, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          dances a slow 360° atop its ball to snapshot the sky, then rolls in a
          perfectly straight line — steering by the diffuse band of the Milky
          Way itself.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 30,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 10.5,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dacke, Baird, Byrne, Scholtz &amp; Warrant · Curr. Biol. 23 (2013) 298–302</span>
        <span>
          <span style={{ color: SAND }}>●</span> Dung ball
        </span>
      </div>
    </AbsoluteFill>
  );
};
