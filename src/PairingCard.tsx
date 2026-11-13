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
const INK = "#070912";
const DEEP = "#101627";
const MILKY = "#F3E7C4";
const STAR = "#C4D4F4";
const BRASS = "#D4A54C";
const BRASS_DIM = "#8A6B2F";
const GRAY = "#8A8F99";

// Deterministic PRNG so the starfield is stable
const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Sky chart geometry (chart is 960 × 740 local, rendered inside FRAME) ──
const MAP_W = 960;
const MAP_H = 740;

// Milky Way axis tilt (degrees); band runs lower-left → upper-right
const MW_ANGLE_DEG = -22;
const MW_ANGLE = (MW_ANGLE_DEG * Math.PI) / 180;
// Bearing from "up" (0, -1) clockwise to the galactic direction (right side)
// = 90° − |tilt| = 68°
const GALACTIC_BEARING_DEG = 90 + MW_ANGLE_DEG; // 68

// Beetle station (the navigator's position) — ring is centered on the
// beetle sitting atop the ball.
const STATION_X = 480;
const STATION_Y = 540;
const RING_R = 158;
const HORIZON_Y = 590;

type Star = { x: number; y: number; r: number; o: number; twinkle: number };

const generateStars = (): Star[] => {
  const rand = mulberry32(17);
  const stars: Star[] = [];
  const total = 260;
  for (let i = 0; i < total; i++) {
    const x = rand() * MAP_W;
    const y = rand() * (HORIZON_Y - 10);
    // Density boost along galactic band: compute perpendicular distance
    const cx = x - MAP_W / 2;
    const cy = y - MAP_H * 0.28;
    const perp = Math.abs(-Math.sin(MW_ANGLE) * cx + Math.cos(MW_ANGLE) * cy);
    const bandFactor = Math.exp(-(perp * perp) / (2 * 90 * 90));
    if (rand() > 0.35 + 0.5 * bandFactor) continue;
    const bright = rand();
    const r = bright < 0.9 ? 0.6 + rand() * 1.1 : 1.6 + rand() * 1.6;
    const o = 0.35 + bright * 0.6;
    stars.push({ x, y, r, o, twinkle: rand() });
  }
  return stars;
};

const STARS = generateStars();

// A few dust-cluster puffs along the galactic axis to give the band structure
const DUST = (() => {
  const rand = mulberry32(53);
  const puffs: { x: number; y: number; r: number; o: number }[] = [];
  const cx = MAP_W / 2;
  const cy = MAP_H * 0.28;
  for (let i = 0; i < 18; i++) {
    const t = (i / 17 - 0.5) * 1.15; // along-band parameter
    const alongX = Math.cos(MW_ANGLE) * t * MAP_W * 0.72;
    const alongY = Math.sin(MW_ANGLE) * t * MAP_W * 0.72;
    const perp = (rand() - 0.5) * 70;
    const perpX = -Math.sin(MW_ANGLE) * perp;
    const perpY = Math.cos(MW_ANGLE) * perp;
    puffs.push({
      x: cx + alongX + perpX,
      y: cy + alongY + perpY,
      r: 60 + rand() * 90,
      o: 0.05 + rand() * 0.1,
    });
  }
  return puffs;
})();

// Azimuth tick marks for the brass ring
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);

// Cardinal labels
const CARDINALS: Array<[number, string]> = [
  [0, "N"],
  [90, "E"],
  [180, "S"],
  [270, "W"],
];

// Hairline bearings projected into the sky (azimuth rays)
const HAIRLINES = [10, 30, 50, 68, 86, 110, 130, 150, 170, 190, 210];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const t = frame / fps; // seconds

  // Stars fade-in: each star reveals at a staggered time
  const starPhase = Math.min(1, t / 1.2);

  // Milky Way fade: slides across the band, then fully visible
  const milkyT = Math.min(1, Math.max(0, (t - 0.4) / 1.6));
  const milkyEased = 1 - Math.pow(1 - milkyT, 3);

  // Ring draw-in
  const ringT = Math.min(1, Math.max(0, (t - 1.2) / 1.1));
  const ringEased = 1 - Math.pow(1 - ringT, 3);

  // Hairlines sweep
  const hairT = Math.min(1, Math.max(0, (t - 1.8) / 1.0));
  const hairEased = 1 - Math.pow(1 - hairT, 3);

  // Bearing needle rotation — springs from 0 to GALACTIC_BEARING, settled
  // quickly with modest overshoot.
  const bearingSpring = spring({
    frame: frame - fps * 2.5,
    fps,
    config: { damping: 18, mass: 1.0, stiffness: 100 },
  });
  const bearingAngle = bearingSpring * GALACTIC_BEARING_DEG;

  // Title/role fade
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.4, fps * 2.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Global twinkle oscillation
  const tw = (phase: number) =>
    0.65 + 0.35 * Math.sin((frame / fps) * 2.2 + phase * 7.0);

  // Page layout
  const FRAME = { x: 60, y: 130, w: 960, h: 740 };
  const scale = FRAME.w / MAP_W;

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
        <span style={{ color: BRASS }}>2026 · 11 · 13</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky vignette (deep ink to slightly bluer in the middle) */}
          <radialGradient id="sky-vignette" cx="50%" cy="35%" r="78%">
            <stop offset="0%" stopColor={DEEP} stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Milky Way: a soft gradient that's cream in the center and
              fades to transparent at the edges of the band. */}
          <linearGradient id="mw-perp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MILKY} stopOpacity={0} />
            <stop offset="25%" stopColor={MILKY} stopOpacity={0.05} />
            <stop offset="45%" stopColor={MILKY} stopOpacity={0.18} />
            <stop offset="50%" stopColor={MILKY} stopOpacity={0.28} />
            <stop offset="55%" stopColor={MILKY} stopOpacity={0.18} />
            <stop offset="75%" stopColor={MILKY} stopOpacity={0.05} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="mw-along" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={MILKY} stopOpacity={0.0} />
            <stop offset="30%" stopColor={MILKY} stopOpacity={0.9} />
            <stop offset="55%" stopColor={MILKY} stopOpacity={1} />
            <stop offset="80%" stopColor={MILKY} stopOpacity={0.6} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0.0} />
          </linearGradient>

          {/* Along-the-band reveal mask: a left-to-right wipe */}
          <linearGradient id="mw-wipe" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity={1} />
            <stop
              offset={`${Math.max(0, milkyEased * 100 - 8)}%`}
              stopColor="#fff"
              stopOpacity={1}
            />
            <stop
              offset={`${milkyEased * 100}%`}
              stopColor="#fff"
              stopOpacity={0}
            />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>

          <mask id="mw-reveal">
            <rect
              x={-MAP_W}
              y={-MAP_H}
              width={MAP_W * 3}
              height={MAP_H * 3}
              fill="url(#mw-wipe)"
            />
          </mask>

          <radialGradient id="dust-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MILKY} stopOpacity={0.9} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0.9} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>

          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="softer" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="32" />
          </filter>
          <filter id="brassGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip so everything within the chart stays inside the frame */}
          <clipPath id="chartClip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Sky chart background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky-vignette)"
        />

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1F2636"
          strokeWidth={1}
        />

        {/* Corner crop marks — in brass */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={BRASS} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Chart corner label: PLATE III */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={BRASS}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text>PLATE III</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={11}
          letterSpacing={3}
          textAnchor="end"
        >
          <text>LAT 29°S · MOONLESS</text>
        </g>

        {/* Content clipped to chart frame */}
        <g clipPath="url(#chartClip)">
          <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
            {/* Latitude graticule — very faint ruled arcs */}
            <g stroke="#1A2235" strokeWidth={0.8} fill="none" opacity={0.7}>
              {[120, 240, 360, 480, 600].map((y) => (
                <line key={y} x1={0} y1={y} x2={MAP_W} y2={y} />
              ))}
              {[160, 320, 480, 640, 800].map((x) => (
                <line key={x} x1={x} y1={0} x2={x} y2={HORIZON_Y} />
              ))}
            </g>

            {/* ── Milky Way band ───────────────────────────────── */}
            <g
              opacity={milkyEased}
              transform={`rotate(${MW_ANGLE_DEG}, ${MAP_W / 2}, ${
                MAP_H * 0.32
              })`}
              mask="url(#mw-reveal)"
            >
              {/* Outer soft wash — subtle halo */}
              <rect
                x={-MAP_W * 0.6}
                y={MAP_H * 0.28 - 200}
                width={MAP_W * 2.2}
                height={400}
                fill="url(#mw-perp)"
                filter="url(#softer)"
                opacity={0.3}
              />
              {/* Tighter inner glow — narrow galactic band */}
              <rect
                x={-MAP_W * 0.6}
                y={MAP_H * 0.28 - 70}
                width={MAP_W * 2.2}
                height={140}
                fill="url(#mw-perp)"
                filter="url(#soft)"
                opacity={0.55}
              />
              {/* Along-axis luminance variation — brighter in middle */}
              <rect
                x={-MAP_W * 0.6}
                y={MAP_H * 0.28 - 40}
                width={MAP_W * 2.2}
                height={80}
                fill="url(#mw-along)"
                opacity={0.3}
                filter="url(#soft)"
              />
              {/* Dust clusters along axis — small bright nebular puffs */}
              {DUST.map((d, i) => (
                <circle
                  key={i}
                  cx={d.x}
                  cy={d.y}
                  r={d.r * 0.55}
                  fill="url(#dust-glow)"
                  opacity={d.o * 1.1}
                />
              ))}
            </g>

            {/* Stars */}
            {STARS.map((s, i) => {
              const delay = (i / STARS.length) * 0.9;
              const localT = Math.max(0, starPhase - delay) / (1 - delay);
              const fade = Math.min(1, localT * 2);
              const opacity = fade * s.o * tw(s.twinkle);
              return (
                <g key={i} opacity={opacity}>
                  {s.r > 1.6 && (
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={s.r * 4}
                      fill="url(#star-glow)"
                      opacity={0.6}
                    />
                  )}
                  <circle cx={s.x} cy={s.y} r={s.r} fill={STAR} />
                </g>
              );
            })}

            {/* Horizon line */}
            <g opacity={Math.min(1, Math.max(0, (t - 0.9) * 2))}>
              <line
                x1={0}
                y1={HORIZON_Y}
                x2={MAP_W}
                y2={HORIZON_Y}
                stroke={BRASS_DIM}
                strokeWidth={1}
                strokeDasharray="4 6"
              />
              <text
                x={16}
                y={HORIZON_Y - 10}
                fill={BRASS_DIM}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3}
                fontWeight={500}
              >
                HORIZON
              </text>
            </g>

            {/* Ground wash below horizon */}
            <rect
              x={0}
              y={HORIZON_Y}
              width={MAP_W}
              height={MAP_H - HORIZON_Y}
              fill={INK}
              opacity={0.65}
            />

            {/* ── Azimuth hairlines projected into the sky ───────── */}
            <g opacity={hairEased * 0.55}>
              {HAIRLINES.map((az, i) => {
                const theta = ((az - 90) * Math.PI) / 180; // 0° = up (−90° in math)
                const inner = RING_R + 6;
                const outer = 700;
                const x1 = STATION_X + inner * Math.cos(theta);
                const y1 = STATION_Y + inner * Math.sin(theta);
                const x2 = STATION_X + outer * Math.cos(theta);
                const y2 = STATION_Y + outer * Math.sin(theta);
                const isPrimary = az === GALACTIC_BEARING_DEG;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isPrimary ? BRASS : BRASS_DIM}
                    strokeWidth={isPrimary ? 1.2 : 0.6}
                    strokeDasharray={isPrimary ? "" : "2 6"}
                    opacity={isPrimary ? 0.9 : 0.75}
                  />
                );
              })}
            </g>

            {/* ── Brass azimuth ring ──────────────────────────── */}
            <g>
              {/* Outer and inner ring strokes with dash-draw */}
              {(() => {
                const circ = 2 * Math.PI * RING_R;
                return (
                  <>
                    <circle
                      cx={STATION_X}
                      cy={STATION_Y}
                      r={RING_R}
                      fill="none"
                      stroke={BRASS}
                      strokeWidth={1.4}
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - ringEased)}
                      transform={`rotate(-90, ${STATION_X}, ${STATION_Y})`}
                      filter="url(#brassGlow)"
                    />
                    <circle
                      cx={STATION_X}
                      cy={STATION_Y}
                      r={RING_R - 14}
                      fill="none"
                      stroke={BRASS_DIM}
                      strokeWidth={0.8}
                      strokeDasharray={2 * Math.PI * (RING_R - 14)}
                      strokeDashoffset={
                        2 * Math.PI * (RING_R - 14) * (1 - ringEased)
                      }
                      transform={`rotate(-90, ${STATION_X}, ${STATION_Y})`}
                    />
                  </>
                );
              })()}

              {/* Azimuth tick marks */}
              {TICKS.map((az) => {
                const major = az % 30 === 0;
                const theta = ((az - 90) * Math.PI) / 180;
                const r1 = RING_R - (major ? 14 : 8);
                const r2 = RING_R;
                const x1 = STATION_X + r1 * Math.cos(theta);
                const y1 = STATION_Y + r1 * Math.sin(theta);
                const x2 = STATION_X + r2 * Math.cos(theta);
                const y2 = STATION_Y + r2 * Math.sin(theta);
                return (
                  <line
                    key={az}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={major ? BRASS : BRASS_DIM}
                    strokeWidth={major ? 1.3 : 0.8}
                    opacity={ringEased}
                  />
                );
              })}

              {/* Cardinal labels */}
              {CARDINALS.map(([az, label]) => {
                const theta = ((az - 90) * Math.PI) / 180;
                const r = RING_R + 22;
                const x = STATION_X + r * Math.cos(theta);
                const y = STATION_Y + r * Math.sin(theta) + 4;
                return (
                  <text
                    key={label}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill={BRASS}
                    fontFamily={inter}
                    fontSize={14}
                    fontWeight={600}
                    letterSpacing={2}
                    opacity={ringEased}
                  >
                    {label}
                  </text>
                );
              })}

              {/* Degree numbers at 30° intervals (except cardinals) */}
              {[30, 60, 120, 150, 210, 240, 300, 330].map((az) => {
                const theta = ((az - 90) * Math.PI) / 180;
                const r = RING_R + 20;
                const x = STATION_X + r * Math.cos(theta);
                const y = STATION_Y + r * Math.sin(theta) + 3;
                return (
                  <text
                    key={az}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill={BRASS_DIM}
                    fontFamily={inter}
                    fontSize={9}
                    fontWeight={500}
                    letterSpacing={1.5}
                    opacity={ringEased * 0.9}
                  >
                    {az}°
                  </text>
                );
              })}

              {/* Cross-hair graticule inside ring */}
              <g opacity={ringEased * 0.45}>
                <line
                  x1={STATION_X - RING_R + 20}
                  y1={STATION_Y}
                  x2={STATION_X + RING_R - 20}
                  y2={STATION_Y}
                  stroke={BRASS_DIM}
                  strokeWidth={0.6}
                  strokeDasharray="2 5"
                />
                <line
                  x1={STATION_X}
                  y1={STATION_Y - RING_R + 20}
                  x2={STATION_X}
                  y2={STATION_Y + RING_R - 20}
                  stroke={BRASS_DIM}
                  strokeWidth={0.6}
                  strokeDasharray="2 5"
                />
              </g>
            </g>

            {/* ── Sighting arrow locking onto the galactic axis ─── */}
            {/* Rotates about the beetle's head, points outward only. */}
            <g
              transform={`rotate(${bearingAngle}, ${STATION_X}, ${STATION_Y})`}
              opacity={Math.min(1, Math.max(0, (t - 2.4) * 1.6))}
            >
              {/* Outer glow halo */}
              <line
                x1={STATION_X}
                y1={STATION_Y - 54}
                x2={STATION_X}
                y2={STATION_Y - RING_R - 90}
                stroke={MILKY}
                strokeOpacity={0.35}
                strokeWidth={12}
                strokeLinecap="round"
                filter="url(#soft)"
              />
              {/* Shaft */}
              <line
                x1={STATION_X}
                y1={STATION_Y - 54}
                x2={STATION_X}
                y2={STATION_Y - RING_R - 86}
                stroke={MILKY}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* Arrow tip */}
              <polygon
                points={`${STATION_X},${STATION_Y - RING_R - 108} ${
                  STATION_X - 11
                },${STATION_Y - RING_R - 80} ${STATION_X + 11},${
                  STATION_Y - RING_R - 80
                }`}
                fill={MILKY}
              />
            </g>

            {/* Bearing readout card */}
            <g
              opacity={Math.min(1, Math.max(0, (t - 3.0) * 1.4))}
              transform={`translate(${STATION_X + RING_R + 36}, ${
                STATION_Y - RING_R - 20
              })`}
            >
              <rect
                x={0}
                y={0}
                width={190}
                height={96}
                rx={2}
                fill={INK}
                stroke={BRASS}
                strokeWidth={1.2}
              />
              <text
                x={16}
                y={22}
                fill={BRASS}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3.5}
                fontWeight={600}
              >
                BEARING
              </text>
              <text
                x={16}
                y={38}
                fill={GRAY}
                fontFamily={inter}
                fontSize={9}
                letterSpacing={3}
                fontWeight={500}
              >
                TO GALACTIC PLANE
              </text>
              <text
                x={174}
                y={78}
                textAnchor="end"
                fill={MILKY}
                fontFamily={playfair}
                fontSize={38}
                fontStyle="italic"
                fontWeight={500}
              >
                068°
              </text>
            </g>

            {/* ── Beetle + dung ball atop the station ──────────── */}
            {/* ball */}
            <g>
              {/* contact shadow */}
              <ellipse
                cx={STATION_X + 2}
                cy={HORIZON_Y + 4}
                rx={34}
                ry={4}
                fill={INK}
                opacity={0.95}
              />
              <circle
                cx={STATION_X}
                cy={HORIZON_Y - 22}
                r={26}
                fill="#0A0C14"
                stroke={BRASS_DIM}
                strokeWidth={1.4}
              />
              {/* texture specks on ball */}
              <circle
                cx={STATION_X - 8}
                cy={HORIZON_Y - 28}
                r={6}
                fill="#1A1E2A"
              />
              <circle
                cx={STATION_X + 9}
                cy={HORIZON_Y - 20}
                r={4}
                fill="#1A1E2A"
              />
              <circle
                cx={STATION_X - 2}
                cy={HORIZON_Y - 14}
                r={3}
                fill="#1A1E2A"
              />
              <circle
                cx={STATION_X + 14}
                cy={HORIZON_Y - 30}
                r={2}
                fill="#1A1E2A"
              />
            </g>
            {/* beetle silhouette */}
            <g>
              {/* elytra body */}
              <ellipse
                cx={STATION_X}
                cy={HORIZON_Y - 54}
                rx={19}
                ry={13}
                fill="#0B0E16"
                stroke={BRASS_DIM}
                strokeWidth={1}
              />
              {/* elytra split */}
              <line
                x1={STATION_X}
                y1={HORIZON_Y - 66}
                x2={STATION_X}
                y2={HORIZON_Y - 42}
                stroke={BRASS_DIM}
                strokeWidth={0.7}
                opacity={0.65}
              />
              {/* pronotum / thorax */}
              <ellipse
                cx={STATION_X}
                cy={HORIZON_Y - 66}
                rx={10}
                ry={5}
                fill="#0B0E16"
                stroke={BRASS_DIM}
                strokeWidth={0.7}
              />
              {/* head */}
              <ellipse
                cx={STATION_X}
                cy={HORIZON_Y - 72}
                rx={7}
                ry={4}
                fill="#0B0E16"
                stroke={BRASS_DIM}
                strokeWidth={0.7}
              />
              {/* antennae / sighting */}
              <line
                x1={STATION_X - 5}
                y1={HORIZON_Y - 75}
                x2={STATION_X - 14}
                y2={HORIZON_Y - 82}
                stroke={BRASS}
                strokeWidth={1}
              />
              <line
                x1={STATION_X + 5}
                y1={HORIZON_Y - 75}
                x2={STATION_X + 14}
                y2={HORIZON_Y - 82}
                stroke={BRASS}
                strokeWidth={1}
              />
              <circle
                cx={STATION_X - 14}
                cy={HORIZON_Y - 82}
                r={1.4}
                fill={BRASS}
              />
              <circle
                cx={STATION_X + 14}
                cy={HORIZON_Y - 82}
                r={1.4}
                fill={BRASS}
              />
              {/* legs gripping ball */}
              <line
                x1={STATION_X - 15}
                y1={HORIZON_Y - 50}
                x2={STATION_X - 26}
                y2={HORIZON_Y - 36}
                stroke="#0B0E16"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <line
                x1={STATION_X + 15}
                y1={HORIZON_Y - 50}
                x2={STATION_X + 26}
                y2={HORIZON_Y - 36}
                stroke="#0B0E16"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <line
                x1={STATION_X - 12}
                y1={HORIZON_Y - 44}
                x2={STATION_X - 22}
                y2={HORIZON_Y - 22}
                stroke="#0B0E16"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <line
                x1={STATION_X + 12}
                y1={HORIZON_Y - 44}
                x2={STATION_X + 22}
                y2={HORIZON_Y - 22}
                stroke="#0B0E16"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </g>

            {/* Station call-out: "Observer" */}
            <g opacity={Math.min(1, Math.max(0, (t - 1.7) * 1.5))}>
              <line
                x1={STATION_X - RING_R - 6}
                y1={STATION_Y + 70}
                x2={STATION_X - RING_R - 60}
                y2={STATION_Y + 110}
                stroke={BRASS_DIM}
                strokeWidth={0.8}
              />
              <text
                x={STATION_X - RING_R - 64}
                y={STATION_Y + 124}
                textAnchor="end"
                fill={BRASS_DIM}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3}
                fontWeight={500}
              >
                OBSERVER · 00h00m
              </text>
            </g>
          </g>
        </g>

        {/* Caption strip below the chart */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · ORIENTATION BY GALACTIC PLANE, MOONLESS SKY</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={BRASS}
            opacity={0.9}
          >
            SCARABAEUS SATYRUS · 29°S
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 955,
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
            color: BRASS,
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
            fontSize: 60,
            lineHeight: 1.0,
            letterSpacing: -1.0,
            fontStyle: "italic",
          }}
        >
          A map written
          <br />
          in starlight.
        </div>

        <div
          style={{
            marginTop: 22,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 16,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          On moonless African nights,{" "}
          <span style={{ color: MILKY, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          climbs atop its dung ball, dances once in a circle, then rolls off
          in a straight line — steering by the dim band of the Milky Way. The
          first non-human animal shown to navigate by the galaxy itself.
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
          <span style={{ color: BRASS }}>●</span> Bearing 068° to galactic plane
        </span>
      </div>
    </AbsoluteFill>
  );
};
