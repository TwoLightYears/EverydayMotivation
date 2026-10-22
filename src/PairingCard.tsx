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

// Palette — taken directly from the concept's visual brief
const INK = "#070A1C";
const SKY_TOP = "#0C1430";
const SKY_MID = "#1B2749";
const SKY_LOW = "#0A1024";
const STAR = "#E6DFC9";
const GOLD = "#C9A66B";
const GOLD_SOFT = "#9A7D45";
const UMBER = "#4A3B22";
const UMBER_DEEP = "#2A2112";
const GRAY = "#8A8F99";

// ── Deterministic PRNG so star positions are stable ────────────────────────
const mulberry32 = (a: number) => {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Star = {
  x: number;
  y: number;
  r: number;
  base: number;
  twinkleOffset: number;
  twinkleAmp: number;
};

// Milky Way band — a slightly curved vertical strip across the upper 2/3.
// Returns centre-x for a given y, plus a half-width that pinches at the ends.
const bandCenter = (y: number): number => {
  // y runs 0..860. A gentle sinuous arc leaning slightly right at top.
  const t = (y - 60) / 800;
  return 560 + Math.sin(t * 1.4 + 0.6) * 150 - t * 90;
};

const bandHalfWidth = (y: number): number => {
  const t = (y - 60) / 800;
  // Thicker in the middle, pinched at top and bottom edges of band
  const taper = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
  return 180 + 70 * taper;
};

// Pre-compute a bank of stars: dense inside the Milky Way band, sparse outside.
const buildStars = (): Star[] => {
  const rng = mulberry32(20261022);
  const stars: Star[] = [];

  // Dense cluster along the band
  for (let i = 0; i < 420; i++) {
    const y = 50 + rng() * 820;
    const cx = bandCenter(y);
    const hw = bandHalfWidth(y);
    // Normal-ish distribution: sum of two uniforms, scaled
    const u = (rng() + rng() + rng() - 1.5) / 1.5;
    const x = cx + u * hw;
    if (x < 0 || x > 1080) continue;
    const r = 0.5 + Math.pow(rng(), 2.5) * 2.2;
    stars.push({
      x,
      y,
      r,
      base: 0.55 + rng() * 0.45,
      twinkleOffset: rng() * Math.PI * 2,
      twinkleAmp: 0.15 + rng() * 0.35,
    });
  }

  // Field stars across the full upper area
  for (let i = 0; i < 180; i++) {
    const x = rng() * 1080;
    const y = 40 + rng() * 820;
    const cx = bandCenter(y);
    const hw = bandHalfWidth(y);
    // Reject if inside the dense band (we already covered it)
    if (Math.abs(x - cx) < hw * 0.65) continue;
    const r = 0.4 + Math.pow(rng(), 3) * 1.6;
    stars.push({
      x,
      y,
      r,
      base: 0.3 + rng() * 0.35,
      twinkleOffset: rng() * Math.PI * 2,
      twinkleAmp: 0.2 + rng() * 0.5,
    });
  }

  // A handful of brighter beacons with a soft halo (drawn separately)
  for (let i = 0; i < 7; i++) {
    const y = 110 + rng() * 680;
    const cx = bandCenter(y);
    const hw = bandHalfWidth(y);
    const x = cx + (rng() - 0.5) * hw * 1.8;
    stars.push({
      x,
      y,
      r: 2.4 + rng() * 1.4,
      base: 0.95,
      twinkleOffset: rng() * Math.PI * 2,
      twinkleAmp: 0.15,
    });
  }

  return stars;
};

const STARS = buildStars();

// Milky Way dust clouds — many overlapping soft blobs. Each gets its own
// gaussian-blur filter at render time, so overlaps add up into a smooth
// luminous ribbon without any hard edges.
type Dust = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  op: number;
  dark?: boolean;
};
const buildDust = (): Dust[] => {
  const rng = mulberry32(777);
  const out: Dust[] = [];
  // Many bright wisps along the band centre
  for (let y = 20; y <= 890; y += 22) {
    const cx = bandCenter(y);
    const hw = bandHalfWidth(y);
    // Core blob (soft)
    out.push({
      cx,
      cy: y,
      rx: 95 + rng() * 50,
      ry: 55 + rng() * 30,
      rot: (rng() - 0.5) * 50,
      op: 0.055 + rng() * 0.025,
    });
    // Jittered secondaries
    for (let k = 0; k < 2; k++) {
      const jx = (rng() - 0.5) * hw * 1.2;
      out.push({
        cx: cx + jx,
        cy: y + (rng() - 0.5) * 24,
        rx: 50 + rng() * 50,
        ry: 32 + rng() * 24,
        rot: (rng() - 0.5) * 80,
        op: 0.035 + rng() * 0.025,
      });
    }
  }
  // Dark dust lanes threading through, each rotated to a random angle so
  // the overall pattern reads organic rather than striped.
  for (let i = 0; i < 10; i++) {
    const cy = 160 + rng() * 620;
    const cx = bandCenter(cy) + (rng() - 0.5) * 70;
    out.push({
      cx,
      cy,
      rx: 60 + rng() * 90,
      ry: 10 + rng() * 16,
      rot: (rng() - 0.5) * 90,
      op: 0.3 + rng() * 0.15,
      dark: true,
    });
  }
  return out;
};
const DUST = buildDust();

// ── Beetle silhouette (hand-drawn SVG path, viewBox 100×60) ────────────────
// Dorsal view of a scarab: broad trapezoidal pronotum at top with the small
// clypeus (head shield) peeking out, then wide oval elytra below.
// The whole figure sits inside y: 2..58 so the viewBox is 100×60.

// Elytra: wide oval that pinches a touch at the top where it meets the pronotum.
const BEETLE_ELYTRA_D =
  "M 50 20 " +
  "C 70 20 80 28 80 40 " +
  "C 80 52 68 60 50 60 " +
  "C 32 60 20 52 20 40 " +
  "C 20 28 30 20 50 20 Z";

// Pronotum: broad, FLAT shield behind the head. Low, trapezoidal.
const BEETLE_PRONOTUM_D =
  "M 24 24 " +
  "C 26 18 32 14 50 14 " +
  "C 68 14 74 18 76 24 " +
  "C 70 26 60 27 50 27 " +
  "C 40 27 30 26 24 24 Z";

// Clypeus / head shield — a smooth low lobe just peeking out above pronotum.
const BEETLE_HEAD_D =
  "M 42 14 " +
  "C 42 10 44 9 50 9 " +
  "C 56 9 58 10 58 14 Z";

// Antennae — tiny stalks ending in a clubbed tip, splayed forward.
// Drawn in beetle-local coords.
type Antenna = { stalk: string; club: [number, number] };
const BEETLE_ANTENNAE: Antenna[] = [
  { stalk: "M 46 11 C 42 9 38 7 34 6", club: [33, 5] },
  { stalk: "M 54 11 C 58 9 62 7 66 6", club: [67, 5] },
];

// Dividing midline on elytra (the suture between the two wing covers).
const BEETLE_SUTURE_D = "M 50 22 L 50 58";

// Six legs, three per side — tiny femurs curving to tibiae and tarsi.
// All strokes drawn in beetle local coords.
const BEETLE_LEG_PATHS = [
  // Front legs (shortest, forward-reaching)
  "M 34 14 C 24 14 16 20 10 28",
  "M 66 14 C 76 14 84 20 90 28",
  // Mid legs
  "M 28 30 C 18 32 10 38 6 46",
  "M 72 30 C 82 32 90 38 94 46",
  // Hind legs (longest, splayed back)
  "M 32 50 C 22 54 14 60 10 66",
  "M 68 50 C 78 54 86 60 90 66",
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timeline ──────────────────────────────────────────────────────────
  // 0–0.6s  → sky fades in
  // 0.4–1.4 → stars + milky way reveal
  // 0.8–1.6 → beetle + ball settle in
  // 1.4–3.6 → bearing reticle sweeps once (slow spring)
  // 2.0 →    → title + role spring, hook fades
  // all     → gentle star twinkle on loop
  const skyFade = interpolate(frame, [0, fps * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  const starsIn = interpolate(frame, [fps * 0.4, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const beetleIn = spring({
    frame: frame - fps * 0.8,
    fps,
    config: { damping: 180, mass: 0.9, stiffness: 110 },
  });

  const titleIn = spring({
    frame: frame - fps * 2.0,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOp = interpolate(frame, [fps * 2.4, fps * 3.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bearing reticle — one slow sweep from +40° to 0° (locks to Milky Way)
  const sweepSpring = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 220, mass: 1.4, stiffness: 36 },
  });
  const bearingDeg = interpolate(sweepSpring, [0, 1], [40, 0]);

  // Twinkle base phase (loops smoothly)
  const twinklePhase = (frame / fps) * 2.3;

  // ── Layout anchors (1080 × 1350 canvas) ───────────────────────────────
  // Sky area:        0 .. 920
  // Horizon strip:   920 .. 960
  // Text block:      1000 ..
  // Footer:          1290 ..
  const SKY_H = 920;

  // Beetle anchors
  const BALL_CX = 540;
  const BALL_CY = 858; // sits on the horizon
  const BALL_R = 76;
  const BEETLE_W = 230;
  const BEETLE_H = 140;
  const BEETLE_CX = BALL_CX;
  const BEETLE_CY = BALL_CY - BALL_R - BEETLE_H / 2 + 24;

  // Bearing line origin (top of beetle)
  const BEARING_ORIGIN_Y = BEETLE_CY - BEETLE_H / 2 - 4;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ───────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 54,
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
          zIndex: 3,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: GOLD }}>2026 · 10 · 22</span>
      </div>

      {/* ── Sky + beetle (SVG) ──────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY_TOP} />
            <stop offset="55%" stopColor={SKY_MID} />
            <stop offset="100%" stopColor={SKY_LOW} />
          </linearGradient>

          <radialGradient id="band-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0.14} />
            <stop offset="60%" stopColor={STAR} stopOpacity={0.04} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="star-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0.6} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="horizon-haze" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.07} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="ball-grad" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.9} />
            <stop offset="35%" stopColor="#8E6E36" />
            <stop offset="100%" stopColor={UMBER_DEEP} />
          </radialGradient>

          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D1226" />
            <stop offset="100%" stopColor={INK} />
          </linearGradient>

          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          <filter id="soft-big" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>

          {/* Band filters — large region so strokes blur softly past 1080x920 */}
          <filter
            id="band-blur"
            x="-100%"
            y="-20%"
            width="300%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="60" />
          </filter>
          <filter
            id="band-blur-med"
            x="-100%"
            y="-20%"
            width="300%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="30" />
          </filter>
          <filter
            id="band-blur-small"
            x="-100%"
            y="-20%"
            width="300%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        {/* Sky gradient */}
        <rect
          x={0}
          y={0}
          width={1080}
          height={SKY_H}
          fill="url(#sky)"
          opacity={skyFade}
        />

        {/* Milky Way — many individually-blurred ellipses, each one its own
            soft blob. The sum is a smooth luminous ribbon. */}
        <g opacity={starsIn}>
          {DUST.map((d, i) => (
            <ellipse
              key={`dust-${i}`}
              cx={d.cx}
              cy={d.cy}
              rx={d.rx}
              ry={d.ry}
              fill={d.dark ? SKY_LOW : STAR}
              opacity={d.op}
              filter="url(#band-blur-small)"
              transform={`rotate(${d.rot} ${d.cx} ${d.cy})`}
            />
          ))}
        </g>

        {/* Stars */}
        <g opacity={starsIn}>
          {STARS.map((s, i) => {
            const tw =
              s.base +
              Math.sin(twinklePhase + s.twinkleOffset) * s.twinkleAmp;
            const op = Math.max(0.1, Math.min(1, tw));
            return (
              <circle
                key={`st-${i}`}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill={STAR}
                opacity={op}
              />
            );
          })}
          {/* Bright beacons: add a soft halo */}
          {STARS.filter((s) => s.r > 2.2).map((s, i) => (
            <circle
              key={`halo-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.r * 3.2}
              fill="url(#star-halo)"
              opacity={0.55}
            />
          ))}
        </g>

        {/* Horizon haze */}
        <rect
          x={0}
          y={SKY_H - 180}
          width={1080}
          height={200}
          fill="url(#horizon-haze)"
          opacity={skyFade}
        />

        {/* Ground strip */}
        <rect
          x={0}
          y={SKY_H}
          width={1080}
          height={40}
          fill="url(#ground)"
          opacity={skyFade}
        />
        <line
          x1={60}
          y1={SKY_H + 0.5}
          x2={1020}
          y2={SKY_H + 0.5}
          stroke={GOLD_SOFT}
          strokeWidth={0.75}
          opacity={0.35 * skyFade}
        />

        {/* ── Bearing reticle ─────────────────────────────────────── */}
        {(() => {
          // Milky Way axis near the beetle, measured by sampling band centres.
          // Rotation is applied to the whole reticle around the beetle.
          const op = Math.max(0, Math.min(1, (beetleIn - 0.4) * 2.2));
          const lineLen = 820;
          const theta = (bearingDeg * Math.PI) / 180;

          // Tick marks every 10° either side
          const ticks: React.ReactNode[] = [];
          for (let d = -40; d <= 40; d += 10) {
            if (d === 0) continue;
            const r = (d * Math.PI) / 180;
            const major = d % 20 === 0;
            const tickLen = major ? 22 : 12;
            // Ticks placed at distance 420 from origin, perpendicular to that bearing
            const dist = 460;
            const bx = BEETLE_CX + Math.sin(r) * dist;
            const by = BEARING_ORIGIN_Y - Math.cos(r) * dist;
            // Perpendicular direction (rotate 90°)
            const px = Math.cos(r);
            const py = Math.sin(r);
            ticks.push(
              <g key={`tk-${d}`}>
                <line
                  x1={bx - px * tickLen * 0.5}
                  y1={by - py * tickLen * 0.5}
                  x2={bx + px * tickLen * 0.5}
                  y2={by + py * tickLen * 0.5}
                  stroke={GOLD}
                  strokeOpacity={major ? 0.55 : 0.3}
                  strokeWidth={major ? 1.2 : 0.8}
                />
                {major && (
                  <text
                    x={bx + px * (tickLen * 0.5 + 10)}
                    y={by + py * (tickLen * 0.5 + 10) + 4}
                    textAnchor="middle"
                    fill={GOLD}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={2}
                    fontWeight={500}
                    opacity={0.6}
                  >
                    {d > 0 ? `+${d}°` : `${d}°`}
                  </text>
                )}
              </g>,
            );
          }

          return (
            <g opacity={op * skyFade}>
              {/* Arc guide at radius 460 from beetle, spanning ±45° */}
              <path
                d={(() => {
                  const pts: string[] = [];
                  for (let d = -45; d <= 45; d += 2) {
                    const r = (d * Math.PI) / 180;
                    const dist = 460;
                    const bx = BEETLE_CX + Math.sin(r) * dist;
                    const by = BEARING_ORIGIN_Y - Math.cos(r) * dist;
                    pts.push(`${bx},${by}`);
                  }
                  return "M " + pts.join(" L ");
                })()}
                stroke={GOLD}
                strokeOpacity={0.22}
                strokeWidth={1}
                fill="none"
                strokeDasharray="2 5"
              />

              {ticks}

              {/* Bearing line itself (rotates during sweep) */}
              <line
                x1={BEETLE_CX}
                y1={BEARING_ORIGIN_Y}
                x2={BEETLE_CX + Math.sin(theta) * lineLen}
                y2={BEARING_ORIGIN_Y - Math.cos(theta) * lineLen}
                stroke={GOLD}
                strokeOpacity={0.55}
                strokeWidth={1.4}
              />
              {/* Thin glow doubling */}
              <line
                x1={BEETLE_CX}
                y1={BEARING_ORIGIN_Y}
                x2={BEETLE_CX + Math.sin(theta) * lineLen}
                y2={BEARING_ORIGIN_Y - Math.cos(theta) * lineLen}
                stroke={STAR}
                strokeOpacity={0.18}
                strokeWidth={6}
                filter="url(#soft)"
              />

              {/* Target cross at the top where the bearing meets the band */}
              {(() => {
                const tx = BEETLE_CX + Math.sin(theta) * (lineLen - 60);
                const ty = BEARING_ORIGIN_Y - Math.cos(theta) * (lineLen - 60);
                return (
                  <g stroke={GOLD} strokeWidth={1.3} fill="none" opacity={0.75}>
                    <circle cx={tx} cy={ty} r={14} />
                    <line x1={tx - 22} y1={ty} x2={tx - 6} y2={ty} />
                    <line x1={tx + 6} y1={ty} x2={tx + 22} y2={ty} />
                    <line x1={tx} y1={ty - 22} x2={tx} y2={ty - 6} />
                    <line x1={tx} y1={ty + 6} x2={tx} y2={ty + 22} />
                  </g>
                );
              })()}

              {/* Milky Way axis callout — anchored near the TOP of the band
                  where the bearing arrow meets the stripe. */}
              {(() => {
                const topY = 170;
                const topX = bandCenter(topY);
                return (
                  <g
                    fontFamily={inter}
                    fontSize={11}
                    fontWeight={600}
                    letterSpacing={3.5}
                    fill={GOLD}
                    opacity={0.78}
                  >
                    <line
                      x1={topX + 40}
                      y1={topY}
                      x2={topX + 140}
                      y2={topY}
                      stroke={GOLD}
                      strokeOpacity={0.5}
                      strokeWidth={1}
                    />
                    <circle
                      cx={topX + 40}
                      cy={topY}
                      r={2.5}
                      fill={GOLD}
                    />
                    <text x={topX + 148} y={topY + 4}>
                      GALACTIC AXIS
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })()}

        {/* ── Beetle + ball ───────────────────────────────────────── */}
        {(() => {
          const op = Math.max(0, Math.min(1, beetleIn));
          const dropY = interpolate(beetleIn, [0, 1], [26, 0]);
          return (
            <g opacity={op} transform={`translate(0, ${dropY})`}>
              {/* Ground shadow under the ball */}
              <ellipse
                cx={BALL_CX}
                cy={BALL_CY + BALL_R - 2}
                rx={BALL_R + 10}
                ry={10}
                fill={INK}
                opacity={0.7}
              />
              <ellipse
                cx={BALL_CX}
                cy={BALL_CY + BALL_R + 2}
                rx={BALL_R + 24}
                ry={6}
                fill="#000"
                opacity={0.35}
                filter="url(#soft)"
              />

              {/* Dung ball */}
              <circle
                cx={BALL_CX}
                cy={BALL_CY}
                r={BALL_R}
                fill="url(#ball-grad)"
              />
              {/* Ball texture — small flecks */}
              {(() => {
                const rng = mulberry32(42);
                const flecks: React.ReactNode[] = [];
                for (let i = 0; i < 40; i++) {
                  const a = rng() * Math.PI * 2;
                  const rr = Math.sqrt(rng()) * (BALL_R - 6);
                  const fx = BALL_CX + Math.cos(a) * rr;
                  const fy = BALL_CY + Math.sin(a) * rr * 0.92 - 4;
                  flecks.push(
                    <circle
                      key={`fleck-${i}`}
                      cx={fx}
                      cy={fy}
                      r={0.6 + rng() * 1.4}
                      fill={UMBER_DEEP}
                      opacity={0.5}
                    />,
                  );
                }
                return flecks;
              })()}
              {/* Specular highlight */}
              <ellipse
                cx={BALL_CX - 20}
                cy={BALL_CY - 24}
                rx={22}
                ry={14}
                fill={GOLD}
                opacity={0.22}
                filter="url(#soft)"
              />

              {/* Beetle on top of ball */}
              <g
                transform={`translate(${BEETLE_CX - BEETLE_W / 2}, ${
                  BEETLE_CY - BEETLE_H / 2
                }) scale(${BEETLE_W / 100}, ${BEETLE_H / 60})`}
              >
                {/* Legs behind */}
                {BEETLE_LEG_PATHS.map((d, i) => (
                  <path
                    key={`leg-${i}`}
                    d={d}
                    stroke={UMBER_DEEP}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                  />
                ))}
                {/* Elytra */}
                <path d={BEETLE_ELYTRA_D} fill={UMBER_DEEP} />
                <path
                  d={BEETLE_ELYTRA_D}
                  fill="none"
                  stroke={UMBER}
                  strokeWidth={0.9}
                  opacity={0.9}
                />
                {/* Suture (midline between elytra) */}
                <path
                  d={BEETLE_SUTURE_D}
                  stroke={INK}
                  strokeWidth={1.3}
                  opacity={0.85}
                />
                {/* Pronotum */}
                <path d={BEETLE_PRONOTUM_D} fill={UMBER_DEEP} />
                <path
                  d={BEETLE_PRONOTUM_D}
                  stroke={UMBER}
                  strokeWidth={0.7}
                  fill="none"
                  opacity={0.8}
                />
                {/* Head */}
                <path d={BEETLE_HEAD_D} fill={UMBER_DEEP} />
                {/* Antennae */}
                {BEETLE_ANTENNAE.map((a, i) => (
                  <g key={`ant-${i}`}>
                    <path
                      d={a.stalk}
                      stroke={UMBER_DEEP}
                      strokeWidth={1.1}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={a.club[0]}
                      cy={a.club[1]}
                      r={1.6}
                      fill={UMBER_DEEP}
                    />
                  </g>
                ))}
                {/* Warm sheen on elytra */}
                <ellipse
                  cx={50}
                  cy={32}
                  rx={16}
                  ry={5}
                  fill={GOLD}
                  opacity={0.14}
                />
                <ellipse
                  cx={50}
                  cy={14}
                  rx={10}
                  ry={2.5}
                  fill={GOLD}
                  opacity={0.14}
                />
              </g>

              {/* Tiny label pointing at the beetle */}
              <g
                transform={`translate(${BEETLE_CX - 260}, ${BEETLE_CY + 6})`}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                fontWeight={500}
                letterSpacing={3}
                opacity={0.9}
              >
                <text x={0} y={0}>
                  S. SATYRUS
                </text>
                <text x={0} y={16} opacity={0.75}>
                  ≈ 2 CM
                </text>
                <line
                  x1={125}
                  y1={-4}
                  x2={225}
                  y2={-4}
                  stroke={GRAY}
                  strokeOpacity={0.4}
                  strokeWidth={0.8}
                />
              </g>
            </g>
          );
        })()}

        {/* ── Caption strip below sky ─────────────────────────────── */}
        <g
          transform={`translate(80, ${SKY_H + 70})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={skyFade}
        >
          <text>FIG. 1 · ORIENTATION DANCE UNDER THE MILKY WAY</text>
          <text x={920} textAnchor="end" fill={GOLD} opacity={0.85}>
            BEARING LOCKED TO GALACTIC AXIS
          </text>
        </g>
      </svg>

      {/* ── Type lockup (lower-left) ─────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1010,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
          zIndex: 2,
        }}
      >
        <div
          style={{
            color: GOLD,
            fontFamily: inter,
            fontSize: 13,
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
            fontSize: 82,
            lineHeight: 0.98,
            letterSpacing: -1.3,
            fontStyle: "italic",
          }}
        >
          Steering by
          <br />
          the galaxy.
        </div>

        <div
          style={{
            marginTop: 24,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOp,
          }}
        >
          Under an African night sky,{" "}
          <span style={{ color: GOLD, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          rolls its dung ball in a dead-straight line by sighting the
          polarized stripe of the Milky Way itself — the first non-human
          animal shown to navigate by the galaxy.
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          zIndex: 2,
        }}
      >
        <span>Dacke et al. · Current Biology 23 (2013) 298–300</span>
        <span>
          <span style={{ color: GOLD }}>●</span> Dung Ball = Compass Stand
        </span>
      </div>

      {/* keep durationInFrames referenced so TS doesn't trim it */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
