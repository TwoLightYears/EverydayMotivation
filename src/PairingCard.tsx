import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
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
const INK = "#06081A";          // deep night sky ink
const ATMO = "#141A36";         // midnight atmosphere
const MILKY = "#E8DEC2";        // Milky Way cream
const STAR = "#C9A063";         // warm starlight / dung-ball earth
const BEETLE = "#0B0C10";       // beetle carapace
const GRAY = "#7E8291";
const GRAY_DIM = "#4B5064";
const FRAME_LINE = "#242C4A";

// ── Deterministic PRNG for star placement ───────────────────────────────
const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Milky Way geometry ──────────────────────────────────────────────────
// Chart coord space: 1080 × 867 (matches FRAME aspect 960:771 so content
// never clips at the frame edges). A diagonal band crosses the upper 2/3.
const MW_P0 = { x: 60, y: 430 };    // enters lower-left
const MW_P1 = { x: 1020, y: 80 };   // exits upper-right
const MW_DX = MW_P1.x - MW_P0.x;
const MW_DY = MW_P1.y - MW_P0.y;
const MW_LEN = Math.hypot(MW_DX, MW_DY);
// Unit vectors along / perpendicular to the band.
const MW_UX = MW_DX / MW_LEN;
const MW_UY = MW_DY / MW_LEN;
const MW_NX = -MW_UY;
const MW_NY = MW_UX;

// A single bright anchor star on the Milky Way (the beetle's bearing target).
// Chosen a touch above the chart centre so the sightline rakes diagonally.
const ANCHOR_S = 0.52; // position along the band
const ANCHOR = {
  x: MW_P0.x + MW_UX * MW_LEN * ANCHOR_S,
  y: MW_P0.y + MW_UY * MW_LEN * ANCHOR_S,
};

// Beetle position (lower-centre of chart). Its heading is a straight line
// aimed directly at the anchor star — the whole point of the composition.
const BEETLE_POS = { x: 500, y: 750 };

// Dung ball sits just ahead of the beetle along the bearing to ANCHOR.
const BALL_OFFSET = 80;
const BEAR_DX = ANCHOR.x - BEETLE_POS.x;
const BEAR_DY = ANCHOR.y - BEETLE_POS.y;
const BEAR_LEN = Math.hypot(BEAR_DX, BEAR_DY);
const BEAR_UX = BEAR_DX / BEAR_LEN;
const BEAR_UY = BEAR_DY / BEAR_LEN;
const BALL_POS = {
  x: BEETLE_POS.x + BEAR_UX * BALL_OFFSET,
  y: BEETLE_POS.y + BEAR_UY * BALL_OFFSET,
};

// Bearing angle (atan2 of heading vector, measured clockwise from north/up).
// SVG y grows downward, so "up" is -y. Bearing from the +up axis to the
// heading vector, measured clockwise.
const BEARING_RAD = Math.atan2(BEAR_DX, -BEAR_DY);
const BEARING_DEG = (BEARING_RAD * 180) / Math.PI;
const BEARING_LABEL = `${((BEARING_DEG + 360) % 360).toFixed(1)}°`;

// ── Star field ──────────────────────────────────────────────────────────
type Star = {
  x: number;
  y: number;
  r: number;
  a: number;        // opacity
  warm: boolean;    // Milky Way star? (warm tint)
  twinkle: number;  // phase offset
};

const makeStars = (): Star[] => {
  const stars: Star[] = [];
  const rand = mulberry32(20261028);

  // 1) Milky Way dense band — stars clustered along a Gaussian cross-section.
  for (let i = 0; i < 420; i++) {
    const s = rand();
    const g = (rand() + rand() + rand() - 1.5) * 36; // ~N(0, σ=~20)
    const cx = MW_P0.x + MW_UX * MW_LEN * s + MW_NX * g;
    const cy = MW_P0.y + MW_UY * MW_LEN * s + MW_NY * g;
    const inside = cx > 70 && cx < 1010 && cy > 60 && cy < 840;
    if (!inside) continue;
    const nearness = Math.exp(-(g * g) / (2 * 22 * 22));
    const r = 0.5 + rand() * 1.4 + nearness * 0.9;
    stars.push({
      x: cx,
      y: cy,
      r,
      a: 0.35 + 0.6 * nearness + 0.1 * rand(),
      warm: rand() < 0.55,
      twinkle: rand() * Math.PI * 2,
    });
  }

  // 2) Sparse field across the rest of the chart.
  for (let i = 0; i < 90; i++) {
    const cx = 80 + rand() * 920;
    const cy = 70 + rand() * 760;
    stars.push({
      x: cx,
      y: cy,
      r: 0.4 + rand() * 1.0,
      a: 0.25 + rand() * 0.35,
      warm: rand() < 0.2,
      twinkle: rand() * Math.PI * 2,
    });
  }

  // 3) A few "named" bright stars for anchor-star peers.
  const brights = [
    { x: 220, y: 180, r: 2.6 },
    { x: 790, y: 220, r: 2.2 },
    { x: 150, y: 520, r: 1.9 },
    { x: 920, y: 480, r: 2.0 },
    { x: 650, y: 110, r: 2.3 },
    { x: 380, y: 300, r: 2.1 },
  ];
  for (const b of brights) {
    stars.push({
      x: b.x,
      y: b.y,
      r: b.r,
      a: 0.95,
      warm: true,
      twinkle: rand() * Math.PI * 2,
    });
  }

  return stars;
};

const STARS = makeStars();

// ── Beetle silhouette (top-down) ────────────────────────────────────────
// Drawn facing +heading. Origin at the thorax centre; +y points to tail.
// We'll rotate the whole group so +heading aligns with the bearing to the
// anchor star.
const Beetle: React.FC<{ fill: string; glow: string }> = ({ fill, glow }) => {
  // Legs: 3 pairs. Angles are measured from the body's forward direction
  // (−y in local space). Values are in degrees from forward.
  const legs = [
    { a: 55, len: 24, foot: 7 },  // front
    { a: 105, len: 28, foot: 8 }, // middle
    { a: 150, len: 30, foot: 8 }, // hind (sweeping back)
  ];
  return (
    <g>
      {/* Subtle shadow halo */}
      <ellipse cx={0} cy={0} rx={28} ry={18} fill={glow} opacity={0.35} />

      {/* Legs — mirrored pairs */}
      {legs.flatMap((l, i) =>
        [-1, 1].map((sx) => {
          const ar = (l.a * Math.PI) / 180;
          const bx = Math.sin(ar) * sx * 10;
          const by = -Math.cos(ar) * 10 + 2;
          const tx = Math.sin(ar) * sx * (10 + l.len);
          const ty = -Math.cos(ar) * (10 + l.len) + 4;
          return (
            <g key={`${i}-${sx}`}>
              <path
                d={`M ${bx} ${by} Q ${bx + sx * 4} ${by + 4} ${tx} ${ty}`}
                stroke={fill}
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
              />
              <circle cx={tx} cy={ty} r={l.foot * 0.35} fill={fill} />
            </g>
          );
        })
      )}

      {/* Abdomen (elytra) */}
      <ellipse cx={0} cy={2} rx={11} ry={16} fill={fill} />
      {/* Elytral suture (centre line) */}
      <line
        x1={0}
        y1={-13}
        x2={0}
        y2={17}
        stroke="#1A1C24"
        strokeWidth={1}
        opacity={0.6}
      />
      {/* Pronotum */}
      <ellipse cx={0} cy={-12} rx={9} ry={6} fill={fill} />
      {/* Head */}
      <ellipse cx={0} cy={-20} rx={5.8} ry={4.2} fill={fill} />
      {/* Clypeal "rake" — Scarabaeus has a notched, flared clypeus */}
      <path
        d={`M -5.5 -22 L -3 -25 L -1.5 -23 L 0 -25 L 1.5 -23 L 3 -25 L 5.5 -22 Z`}
        fill={fill}
      />

      {/* Faint carapace highlight */}
      <ellipse
        cx={-2.2}
        cy={-2}
        rx={2.6}
        ry={6.5}
        fill="#1E2130"
        opacity={0.55}
      />
    </g>
  );
};

const DungBall: React.FC<{ cx: number; cy: number; r: number }> = ({
  cx,
  cy,
  r,
}) => {
  return (
    <g>
      <defs>
        <radialGradient
          id="ball-grad"
          cx="35%"
          cy="30%"
          r="80%"
        >
          <stop offset="0%" stopColor="#BE945F" />
          <stop offset="55%" stopColor="#8E6A33" />
          <stop offset="100%" stopColor="#3A2810" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r + 4} fill={STAR} opacity={0.08} />
      <circle cx={cx} cy={cy} r={r} fill="url(#ball-grad)" />
      {/* Clumpy pock marks for a dung-ball texture */}
      {[
        [-6, -4, 2.2],
        [3, -6, 1.6],
        [6, 2, 1.8],
        [-2, 5, 2],
        [-7, 2, 1.3],
        [1, 1, 1.1],
      ].map(([dx, dy, pr], i) => (
        <circle
          key={i}
          cx={cx + (dx as number)}
          cy={cy + (dy as number)}
          r={pr as number}
          fill="#5E4320"
          opacity={0.35}
        />
      ))}
      {/* Rim darken */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#3C2A13"
        strokeWidth={1}
        opacity={0.75}
      />
    </g>
  );
};

// ── Main composition ────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase progress — milky way fades in over the first second;
  // bearing line draws itself from ~0.9s to ~1.9s; title at 0.4s;
  // hook at ~1.3s.
  const skySpring = spring({
    frame,
    fps,
    config: { damping: 220, mass: 1.2 },
    durationInFrames: fps * 1.5,
  });

  const bearingDraw = interpolate(
    frame,
    [fps * 0.9, fps * 1.9],
    [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const anchorPulse = Math.max(
    0,
    Math.min(1, (frame - fps * 1.6) / (fps * 0.4))
  );

  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.3, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gentle twinkle: a slow sinusoidal shimmer across the sparse field.
  const twinklePhase = (frame / fps) * 1.4;

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  // Top metadata band : 0..110
  // Chart frame       : 130..901 (h 771, w 960) — chart coords 1080×940
  // Title lockup      : ~955..
  // Hook              : ~1130..
  // Footer            : 1280..
  const FRAME = { x: 60, y: 130, w: 960, h: 771 };
  const CHART_W = 1080;
  const CHART_H = 867;              // matches FRAME aspect (960/771)
  const scale = FRAME.w / CHART_W;  // = FRAME.h / CHART_H ≈ 0.889

  // Beetle rotation so its forward axis matches the bearing.
  const beetleRot = BEARING_DEG; // SVG rotate is clockwise from +x? No — it's clockwise, measured in degrees. Local "forward" is −y (i.e. 0° already points up), so a rotation of BEARING_DEG rotates up→bearing.

  // Bearing line endpoints: from BEETLE_POS straight through ANCHOR, extended
  // slightly beyond so the dashed line "sights" past the star.
  const BEAR_START = BEETLE_POS;
  const BEAR_END = {
    x: ANCHOR.x + BEAR_UX * 36,
    y: ANCHOR.y + BEAR_UY * 36,
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
        <span style={{ color: STAR }}>2026 · 10 · 28</span>
      </div>

      {/* Chart frame + sky */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Deep sky vignette — darker at edges than at centre */}
          <radialGradient id="sky-vignette" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor={ATMO} stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Milky Way band — soft, elliptical halo (radial, so it fades
              naturally at both ends and across the perpendicular) */}
          <radialGradient id="mw-band" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MILKY} stopOpacity={0.26} />
            <stop offset="55%" stopColor={MILKY} stopOpacity={0.08} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </radialGradient>

          {/* Brighter galactic-core blob, nearer the top-right end */}
          <radialGradient id="mw-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MILKY} stopOpacity={0.38} />
            <stop offset="60%" stopColor={MILKY} stopOpacity={0.08} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </radialGradient>

          {/* Star glow */}
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MILKY} stopOpacity={0.65} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="star-glow-warm" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0.7} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>

          {/* Dust-lane darkening along the Milky Way (a subtle break) */}
          <radialGradient id="mw-dust" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={INK} stopOpacity={0.55} />
            <stop offset="100%" stopColor={INK} stopOpacity={0} />
          </radialGradient>

          <clipPath id="chart-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Base: sky vignette inside the chart frame */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky-vignette)"
        />

        {/* Chart content, scaled 1080×940 → FRAME */}
        <g clipPath="url(#chart-clip)">
          <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
            {/* Milky Way broad band — one long elliptical halo along the
                galactic axis, with a brighter clump near the galactic core */}
            <g opacity={skySpring}>
              {(() => {
                const bandAngle =
                  (Math.atan2(MW_UY, MW_UX) * 180) / Math.PI;
                const mid = {
                  x: (MW_P0.x + MW_P1.x) / 2,
                  y: (MW_P0.y + MW_P1.y) / 2,
                };
                // Galactic-core blob a bit toward the upper end.
                const coreT = 0.62;
                const core = {
                  x: MW_P0.x + MW_UX * MW_LEN * coreT,
                  y: MW_P0.y + MW_UY * MW_LEN * coreT,
                };
                return (
                  <g>
                    {/* Main soft band halo */}
                    <ellipse
                      cx={mid.x}
                      cy={mid.y}
                      rx={MW_LEN * 0.52}
                      ry={55}
                      transform={`rotate(${bandAngle} ${mid.x} ${mid.y})`}
                      fill="url(#mw-band)"
                    />
                    {/* Secondary wider haze */}
                    <ellipse
                      cx={mid.x}
                      cy={mid.y}
                      rx={MW_LEN * 0.5}
                      ry={110}
                      transform={`rotate(${bandAngle} ${mid.x} ${mid.y})`}
                      fill="url(#mw-band)"
                      opacity={0.5}
                    />
                    {/* Galactic-core bulge */}
                    <ellipse
                      cx={core.x}
                      cy={core.y}
                      rx={160}
                      ry={70}
                      transform={`rotate(${bandAngle} ${core.x} ${core.y})`}
                      fill="url(#mw-core)"
                    />
                  </g>
                );
              })()}
              {/* Dust lane — a thin dark ellipse that darkens the core-adjacent
                  strip just below the band centre line */}
              {(() => {
                const bandAngle =
                  (Math.atan2(MW_UY, MW_UX) * 180) / Math.PI;
                const mid = {
                  x: (MW_P0.x + MW_P1.x) / 2 + MW_NX * 6,
                  y: (MW_P0.y + MW_P1.y) / 2 + MW_NY * 6,
                };
                return (
                  <ellipse
                    cx={mid.x}
                    cy={mid.y}
                    rx={MW_LEN * 0.38}
                    ry={6}
                    transform={`rotate(${bandAngle} ${mid.x} ${mid.y})`}
                    fill="url(#mw-dust)"
                  />
                );
              })()}
            </g>

            {/* Star field */}
            <g opacity={skySpring}>
              {STARS.map((s, i) => {
                const tw = 0.75 + 0.25 * Math.sin(twinklePhase + s.twinkle);
                return (
                  <g key={i}>
                    {s.r > 1.6 && (
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r={s.r * 3.2}
                        fill={
                          s.warm
                            ? "url(#star-glow-warm)"
                            : "url(#star-glow)"
                        }
                        opacity={s.a * 0.7 * tw}
                      />
                    )}
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={s.r}
                      fill={s.warm ? STAR : MILKY}
                      opacity={s.a * tw}
                    />
                  </g>
                );
              })}
            </g>

            {/* Anchor star — the beetle's bearing target */}
            <g opacity={skySpring}>
              <circle
                cx={ANCHOR.x}
                cy={ANCHOR.y}
                r={14 + anchorPulse * 3}
                fill="url(#star-glow-warm)"
                opacity={0.9}
              />
              <circle
                cx={ANCHOR.x}
                cy={ANCHOR.y}
                r={3.6 + anchorPulse * 0.6}
                fill={MILKY}
              />
              {/* Four-pointed starburst */}
              <g
                stroke={MILKY}
                strokeWidth={1.1}
                strokeLinecap="round"
                opacity={0.85}
              >
                <line
                  x1={ANCHOR.x}
                  y1={ANCHOR.y - 10 - anchorPulse * 4}
                  x2={ANCHOR.x}
                  y2={ANCHOR.y - 22 - anchorPulse * 6}
                />
                <line
                  x1={ANCHOR.x}
                  y1={ANCHOR.y + 10 + anchorPulse * 4}
                  x2={ANCHOR.x}
                  y2={ANCHOR.y + 22 + anchorPulse * 6}
                />
                <line
                  x1={ANCHOR.x - 10 - anchorPulse * 4}
                  y1={ANCHOR.y}
                  x2={ANCHOR.x - 22 - anchorPulse * 6}
                  y2={ANCHOR.y}
                />
                <line
                  x1={ANCHOR.x + 10 + anchorPulse * 4}
                  y1={ANCHOR.y}
                  x2={ANCHOR.x + 22 + anchorPulse * 6}
                  y2={ANCHOR.y}
                />
              </g>
            </g>

            {/* Anchor star annotation — leader out to upper-left of anchor
                (the chart's clear sky above the galactic band). */}
            <g
              opacity={interpolate(
                frame,
                [fps * 1.7, fps * 2.3],
                [0, 1],
                { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
              )}
              fontFamily={inter}
              fill={STAR}
              fontSize={14}
              fontWeight={600}
              letterSpacing={3.5}
            >
              <line
                x1={ANCHOR.x - 24}
                y1={ANCHOR.y - 10}
                x2={ANCHOR.x - 110}
                y2={ANCHOR.y - 100}
                stroke={STAR}
                strokeWidth={1.1}
              />
              <line
                x1={ANCHOR.x - 110}
                y1={ANCHOR.y - 100}
                x2={ANCHOR.x - 260}
                y2={ANCHOR.y - 100}
                stroke={STAR}
                strokeWidth={1.1}
              />
              {/* Small backing swatch so text stays legible against stars */}
              <rect
                x={ANCHOR.x - 254}
                y={ANCHOR.y - 130}
                width={248}
                height={56}
                fill={INK}
                opacity={0.55}
                rx={2}
              />
              <text
                x={ANCHOR.x - 240}
                y={ANCHOR.y - 108}
                letterSpacing={3.5}
              >
                FIX
              </text>
              <text
                x={ANCHOR.x - 240}
                y={ANCHOR.y - 86}
                fill={GRAY}
                fontSize={12}
                letterSpacing={2.6}
                fontWeight={500}
              >
                MILKY WAY · GALACTIC BAND
              </text>
            </g>

            {/* Bearing sightline — grows from beetle up through the anchor */}
            <g>
              {/* Faint ghost of the full path (visible from the start) */}
              <line
                x1={BEAR_START.x}
                y1={BEAR_START.y}
                x2={BEAR_END.x}
                y2={BEAR_END.y}
                stroke={STAR}
                strokeWidth={0.8}
                strokeDasharray="2 8"
                opacity={0.18}
              />
              {/* The drawing dashed line itself */}
              {bearingDraw > 0 && (
                <line
                  x1={BEAR_START.x}
                  y1={BEAR_START.y}
                  x2={
                    BEAR_START.x + (BEAR_END.x - BEAR_START.x) * bearingDraw
                  }
                  y2={
                    BEAR_START.y + (BEAR_END.y - BEAR_START.y) * bearingDraw
                  }
                  stroke={STAR}
                  strokeWidth={1.8}
                  strokeDasharray="9 7"
                  strokeLinecap="round"
                  opacity={0.95}
                />
              )}
              {/* Bearing dot at the current drawing tip */}
              {bearingDraw > 0.02 && bearingDraw < 0.995 && (
                <circle
                  cx={BEAR_START.x + (BEAR_END.x - BEAR_START.x) * bearingDraw}
                  cy={BEAR_START.y + (BEAR_END.y - BEAR_START.y) * bearingDraw}
                  r={3.2}
                  fill={MILKY}
                />
              )}
            </g>

            {/* Horizon ground indication beneath the beetle */}
            <g>
              <line
                x1={100}
                y1={830}
                x2={980}
                y2={830}
                stroke="#30385A"
                strokeWidth={1}
                strokeDasharray="2 6"
              />
              <text
                x={100}
                y={852}
                fill={GRAY}
                fontFamily={inter}
                fontSize={13}
                letterSpacing={3}
                fontWeight={500}
              >
                HORIZON · KALAHARI
              </text>
              <text
                x={980}
                y={852}
                textAnchor="end"
                fill={GRAY}
                fontFamily={inter}
                fontSize={13}
                letterSpacing={3}
                fontWeight={500}
              >
                23°S  22°E
              </text>
            </g>

            {/* Beetle + ball — scaled up so the organism reads from a glance */}
            <g
              transform={`translate(${BEETLE_POS.x}, ${BEETLE_POS.y}) rotate(${beetleRot}) scale(1.9)`}
            >
              <Beetle fill={BEETLE} glow={STAR} />
            </g>
            <DungBall cx={BALL_POS.x} cy={BALL_POS.y} r={22} />

            {/* Beetle annotation (left-side bracket) */}
            <g
              opacity={interpolate(
                frame,
                [fps * 1.9, fps * 2.5],
                [0, 1],
                { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
              )}
              fontFamily={inter}
              fill={MILKY}
              fontSize={14}
              fontWeight={600}
              letterSpacing={3.5}
            >
              <line
                x1={BEETLE_POS.x - 42}
                y1={BEETLE_POS.y - 6}
                x2={BEETLE_POS.x - 150}
                y2={BEETLE_POS.y - 70}
                stroke={MILKY}
                strokeWidth={1.1}
              />
              <line
                x1={BEETLE_POS.x - 150}
                y1={BEETLE_POS.y - 70}
                x2={BEETLE_POS.x - 260}
                y2={BEETLE_POS.y - 70}
                stroke={MILKY}
                strokeWidth={1.1}
              />
              <text
                x={BEETLE_POS.x - 250}
                y={BEETLE_POS.y - 78}
              >
                S. SATYRUS
              </text>
              <text
                x={BEETLE_POS.x - 250}
                y={BEETLE_POS.y - 56}
                fill={GRAY}
                fontSize={12}
                letterSpacing={2.6}
                fontWeight={500}
              >
                HEADING {BEARING_LABEL}
              </text>
            </g>
          </g>
        </g>

        {/* Chart frame border + crop marks */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={FRAME_LINE}
          strokeWidth={1}
        />
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={STAR} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* N compass marker, upper-left of frame */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">N</text>
          <line
            x1={5}
            y1={6}
            x2={5}
            y2={24}
            stroke={GRAY}
            strokeWidth={1.2}
          />
          <polygon points={`2,9 5,2 8,9`} fill={STAR} />
        </g>

        {/* Caption strip just below the chart frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 24})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · MOONLESS NIGHT, KALAHARI ·  22:00 LST</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={STAR}
            opacity={0.9}
          >
            BEARING FIXED TO GALACTIC BAND
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 960,
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
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Astronomer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The beetle that
          <br />
          reads the galaxy.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 890,
            opacity: hookOpacity,
          }}
        >
          On moonless Kalahari nights, the dung beetle{" "}
          <span style={{ color: STAR, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          rolls its ball in a dead-straight line by orienting to the diffuse
          band of the Milky Way — the first non-human animal shown to take a
          bearing from the galaxy.
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
          <span style={{ color: STAR }}>●</span> Dung ball = Prize
        </span>
      </div>
    </AbsoluteFill>
  );
};
