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
const INK = "#060915";
const SKY_TOP = "#121A33";
const SKY_BOTTOM = "#080C1C";
const MILKYWAY = "#F2EEDD";
const MILKYWAY_WARM = "#E6D9B0";
const DUNG = "#B8995A";
const DUNG_HILITE = "#D4B870";
const DUNG_SHADOW = "#7A6238";
const GRAY = "#5A6478";
const GRAY_FAINT = "#2E3447";
const BEETLE = "#06080F";

// ── Chart plate (star-chart frame inside the poster) ─────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 700 };

// Horizon y (in frame local coords 0..700)
const HORIZON_Y = 560;
const GROUND_H = FRAME.h - HORIZON_Y;

// Deterministic hash → unit [0,1)
const h01 = (n: number): number => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  phase: number;
};

// Precompute a deterministic star field (coords within the chart plate 960×700).
const buildStars = (): Star[] => {
  const stars: Star[] = [];
  // Background stars — scattered across the sky portion
  for (let i = 0; i < 160; i++) {
    const x = h01(i + 1) * FRAME.w;
    const y = h01(i * 2 + 7) * (HORIZON_Y - 10);
    const r = 0.3 + h01(i * 3 + 11) * 1.1;
    const a = 0.25 + h01(i * 5 + 17) * 0.55;
    const phase = h01(i * 7 + 23);
    stars.push({ x, y, r, a, phase });
  }
  // A few brighter beacons
  for (let i = 0; i < 14; i++) {
    const x = h01(i + 301) * FRAME.w;
    const y = h01(i + 311) * (HORIZON_Y - 30);
    const r = 1.4 + h01(i + 321) * 1.0;
    const a = 0.75 + h01(i + 331) * 0.25;
    const phase = h01(i + 341);
    stars.push({ x, y, r, a, phase });
  }
  return stars;
};

const STARS = buildStars();

// Stars densely packed inside the Milky Way band (band-local coords, we rotate the group).
// Band spans roughly x ∈ [-540, 540], y ∈ [-70, 70] before rotation about chart center.
const BAND_W = 1180;
const BAND_H = 150;
const buildBandStars = (): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < 260; i++) {
    const x = (h01(i + 501) - 0.5) * BAND_W;
    // Weight y toward center of the band for a denser spine.
    const u = h01(i + 601) * 2 - 1;
    const y = (u * u * u) * (BAND_H / 2);
    const r = 0.3 + h01(i + 701) * 1.0;
    const a = 0.35 + h01(i + 801) * 0.6;
    const phase = h01(i + 901);
    stars.push({ x, y, r, a, phase });
  }
  return stars;
};
const BAND_STARS = buildBandStars();

// Past position ticks along the straight course
const COURSE_START_X = 110;
const COURSE_END_X = FRAME.w - 70;
const TICK_COUNT = 11;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ──────────────────────────────────────────────────────────
  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Beetle walk: 5-second loop across the course line
  const LOOP = fps * 5;
  const walkT = (frame % LOOP) / LOOP;
  const beetleEase = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const beetleX =
    COURSE_START_X + (COURSE_END_X - COURSE_START_X) * walkT * beetleEase;
  const ballRotation = walkT * 540; // ~1.5 turns across the frame

  // Galactic pulse: cream dot travels from Milky Way band down to the bearing
  // reticle, timed with the walk.
  const pulseLoop = fps * 3;
  const pulseT = ((frame + fps * 0.25) % pulseLoop) / pulseLoop;
  const pulseVisible = pulseT < 0.55 ? 1 : 0;
  const pulseY = interpolate(pulseT, [0, 0.55], [240, HORIZON_Y - 10], {
    extrapolateRight: "clamp",
  });
  const pulseOpacity =
    pulseT < 0.08
      ? pulseT / 0.08
      : pulseT > 0.47
        ? Math.max(0, (0.55 - pulseT) / 0.08)
        : 1;

  // Twinkle factor (shared for all stars; subtle)
  const twinkle = (phase: number) => {
    const t = ((frame / fps + phase * 4) % 2) / 2;
    return 0.75 + 0.25 * Math.sin(t * Math.PI * 2);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ──────────────────────────────────────── */}
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
        <span style={{ color: MILKYWAY_WARM }}>2026 · 10 · 07</span>
      </div>

      {/* ── Main SVG canvas ────────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Night-sky vertical gradient */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY_TOP} />
            <stop offset="60%" stopColor="#0A0F22" />
            <stop offset="100%" stopColor={SKY_BOTTOM} />
          </linearGradient>

          {/* Horizon-line haze */}
          <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY_BOTTOM} stopOpacity="0" />
            <stop offset="100%" stopColor="#1A1203" stopOpacity="0.55" />
          </linearGradient>

          {/* Earth / savanna foreground */}
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B1507" stopOpacity="1" />
            <stop offset="100%" stopColor="#070502" stopOpacity="1" />
          </linearGradient>

          {/* Milky Way band — radial, elongated */}
          <radialGradient id="milky-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MILKYWAY} stopOpacity="0.55" />
            <stop offset="30%" stopColor={MILKYWAY_WARM} stopOpacity="0.35" />
            <stop offset="70%" stopColor={MILKYWAY_WARM} stopOpacity="0.1" />
            <stop offset="100%" stopColor={MILKYWAY} stopOpacity="0" />
          </radialGradient>

          <radialGradient id="milky-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MILKYWAY} stopOpacity="0.25" />
            <stop offset="100%" stopColor={MILKYWAY} stopOpacity="0" />
          </radialGradient>

          {/* Dust lane darkening */}
          <radialGradient id="milky-dust" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SKY_BOTTOM} stopOpacity="0.6" />
            <stop offset="60%" stopColor={SKY_BOTTOM} stopOpacity="0.2" />
            <stop offset="100%" stopColor={SKY_BOTTOM} stopOpacity="0" />
          </radialGradient>

          {/* Dung ball — radial, warm */}
          <radialGradient id="dung" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor={DUNG_HILITE} />
            <stop offset="55%" stopColor={DUNG} />
            <stop offset="100%" stopColor={DUNG_SHADOW} />
          </radialGradient>

          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="star-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="chart-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Chart base sky */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky)"
        />

        <g clipPath="url(#chart-clip)">
          <g transform={`translate(${FRAME.x} ${FRAME.y})`}>
            {/* ── Milky Way band ──────────────────────────────────── */}
            {/* Center of band in local chart coords ≈ (470, 240), tilted. */}
            <g transform={`translate(470 240) rotate(-20)`}>
              {/* Outer soft glow */}
              <ellipse
                cx={0}
                cy={0}
                rx={BAND_W / 2 + 80}
                ry={BAND_H / 2 + 50}
                fill="url(#milky-glow)"
                opacity={0.9}
              />
              {/* Core cream glow */}
              <ellipse
                cx={0}
                cy={0}
                rx={BAND_W / 2}
                ry={BAND_H / 2}
                fill="url(#milky-core)"
              />
              {/* Dust lane sweeping along the band */}
              <ellipse
                cx={0}
                cy={-8}
                rx={BAND_W / 2 - 60}
                ry={14}
                fill="url(#milky-dust)"
                opacity={0.9}
              />
              <ellipse
                cx={-220}
                cy={18}
                rx={200}
                ry={9}
                fill="url(#milky-dust)"
                opacity={0.7}
              />
              <ellipse
                cx={260}
                cy={10}
                rx={160}
                ry={7}
                fill="url(#milky-dust)"
                opacity={0.55}
              />

              {/* Dense stars inside the band */}
              {BAND_STARS.map((s, i) => (
                <circle
                  key={`b-${i}`}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill={MILKYWAY}
                  opacity={s.a * twinkle(s.phase)}
                />
              ))}
            </g>

            {/* ── Background stars ───────────────────────────────── */}
            {STARS.map((s, i) => (
              <circle
                key={`s-${i}`}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill={s.r > 1.3 ? MILKYWAY : "#DDE4F0"}
                opacity={s.a * twinkle(s.phase)}
                filter={s.r > 1.3 ? "url(#star-glow)" : undefined}
              />
            ))}

            {/* Named constellation hint: Scorpius-like asterism in upper-right
                (Scarabaeus satyrus's southern-hemisphere field) */}
            <g
              stroke={GRAY}
              strokeOpacity={0.4}
              strokeWidth={0.8}
              fill="none"
            >
              <path d="M 820 90 L 855 110 L 880 135 L 900 165 L 865 180" />
              <path d="M 855 110 L 840 80" />
            </g>
            {[
              [820, 90],
              [855, 110],
              [880, 135],
              [900, 165],
              [865, 180],
              [840, 80],
            ].map(([x, y], i) => (
              <circle
                key={`c-${i}`}
                cx={x}
                cy={y}
                r={1.6}
                fill={MILKYWAY}
                opacity={0.9}
              />
            ))}
            <text
              x={808}
              y={86}
              fill={GRAY}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.6}
              fontWeight={500}
              opacity={0.9}
              textAnchor="end"
            >
              SCORPIUS
            </text>

            {/* ── Horizon-line haze ──────────────────────────────── */}
            <rect
              x={0}
              y={HORIZON_Y - 80}
              width={FRAME.w}
              height={80}
              fill="url(#haze)"
            />

            {/* ── Ground / savanna wedge ─────────────────────────── */}
            <rect
              x={0}
              y={HORIZON_Y}
              width={FRAME.w}
              height={GROUND_H}
              fill="url(#ground)"
            />
            {/* Horizon crisp line */}
            <line
              x1={0}
              y1={HORIZON_Y}
              x2={FRAME.w}
              y2={HORIZON_Y}
              stroke={GRAY_FAINT}
              strokeWidth={1}
            />
            {/* Fine ground texture dots */}
            {Array.from({ length: 70 }).map((_, i) => {
              const gx = h01(i + 1101) * FRAME.w;
              const gy =
                HORIZON_Y + 6 + h01(i + 1111) * (GROUND_H - 10);
              const gr = 0.4 + h01(i + 1121) * 0.8;
              return (
                <circle
                  key={`g-${i}`}
                  cx={gx}
                  cy={gy}
                  r={gr}
                  fill="#2A1E08"
                  opacity={0.65}
                />
              );
            })}

            {/* ── Cream glow on the ground around the beetle ───── */}
            <radialGradient id="moonlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={MILKYWAY} stopOpacity="0.22" />
              <stop offset="60%" stopColor={MILKYWAY} stopOpacity="0.06" />
              <stop offset="100%" stopColor={MILKYWAY} stopOpacity="0" />
            </radialGradient>
            <ellipse
              cx={beetleX + 50}
              cy={HORIZON_Y + 10}
              rx={240}
              ry={60}
              fill="url(#moonlight)"
            />

            {/* ── Straight-line course path ──────────────────────── */}
            <line
              x1={COURSE_START_X}
              y1={HORIZON_Y - 4}
              x2={COURSE_END_X}
              y2={HORIZON_Y - 4}
              stroke={GRAY}
              strokeOpacity={0.55}
              strokeWidth={1}
              strokeDasharray="2 6"
            />
            {/* Past-position ticks */}
            {Array.from({ length: TICK_COUNT }).map((_, i) => {
              const tx =
                COURSE_START_X +
                (i / (TICK_COUNT - 1)) * (COURSE_END_X - COURSE_START_X);
              const passed = tx <= beetleX;
              return (
                <g key={`tk-${i}`}>
                  <line
                    x1={tx}
                    y1={HORIZON_Y - 8}
                    x2={tx}
                    y2={HORIZON_Y}
                    stroke={passed ? DUNG_HILITE : GRAY}
                    strokeOpacity={passed ? 0.9 : 0.4}
                    strokeWidth={passed ? 1.4 : 1}
                  />
                </g>
              );
            })}
            {/* Course labels */}
            <text
              x={COURSE_START_X}
              y={HORIZON_Y - 22}
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={3}
              fontWeight={500}
              opacity={0.85}
            >
              START
            </text>
            <text
              x={COURSE_END_X}
              y={HORIZON_Y - 22}
              fill={DUNG_HILITE}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={3}
              fontWeight={600}
              opacity={0.95}
              textAnchor="end"
            >
              STRAIGHT · 2.1 M
            </text>

            {/* ── Dung ball + beetle (scaled up for legibility) ──── */}
            {/* Ball — rolled on the horizon */}
            <g transform={`translate(${beetleX + 108} ${HORIZON_Y - 46})`}>
              {/* Soft ground shadow */}
              <ellipse
                cx={0}
                cy={52}
                rx={54}
                ry={9}
                fill="#000"
                opacity={0.55}
              />
              {/* Ball base */}
              <circle cx={0} cy={0} r={48} fill="url(#dung)" />
              {/* Texture: rotating pits — makes the roll visible */}
              <g transform={`rotate(${ballRotation})`}>
                {Array.from({ length: 16 }).map((_, i) => {
                  const a = (i / 16) * Math.PI * 2 + h01(i + 71) * 0.4;
                  const rr0 = 10 + h01(i + 51) * 28;
                  const cx = Math.cos(a) * rr0;
                  const cy = Math.sin(a) * rr0;
                  const rr = 1.6 + h01(i + 61) * 3.2;
                  return (
                    <circle
                      key={`pit-${i}`}
                      cx={cx}
                      cy={cy}
                      r={rr}
                      fill={DUNG_SHADOW}
                      opacity={0.6}
                    />
                  );
                })}
                {/* A couple of strand-like dark marks */}
                {Array.from({ length: 7 }).map((_, i) => {
                  const a = (i / 7) * Math.PI * 2;
                  const x1 = Math.cos(a) * 10;
                  const y1 = Math.sin(a) * 10;
                  const x2 = Math.cos(a + 0.3) * 40;
                  const y2 = Math.sin(a + 0.3) * 40;
                  return (
                    <path
                      key={`s-${i}`}
                      d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + 4} ${
                        (y1 + y2) / 2 - 4
                      } ${x2} ${y2}`}
                      stroke={DUNG_SHADOW}
                      strokeOpacity={0.35}
                      strokeWidth={1.1}
                      fill="none"
                    />
                  );
                })}
              </g>
              {/* Specular highlight (fixed in screen space) */}
              <ellipse
                cx={-16}
                cy={-20}
                rx={14}
                ry={7}
                fill={DUNG_HILITE}
                opacity={0.55}
              />
              <ellipse
                cx={-20}
                cy={-24}
                rx={5}
                ry={2.6}
                fill="#F2E3BA"
                opacity={0.85}
              />
              {/* Rim darkening */}
              <circle
                cx={0}
                cy={0}
                r={48}
                fill="none"
                stroke="#000"
                strokeOpacity={0.5}
                strokeWidth={1.2}
              />
            </g>

            {/* Beetle silhouette — profile, head to the right pushing the ball */}
            <g transform={`translate(${beetleX} ${HORIZON_Y - 20})`}>
              {/* Ground shadow */}
              <ellipse
                cx={-4}
                cy={30}
                rx={38}
                ry={5}
                fill="#000"
                opacity={0.5}
              />
              {/* Far-side legs (behind body) */}
              <g
                stroke={BEETLE}
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
                opacity={0.55}
              >
                <path d="M -24 -2 Q -34 10 -40 24" />
                <path d="M -4 0 Q -2 14 -2 26" />
                <path d="M 18 0 Q 28 14 34 26" />
              </g>
              {/* Elytra (back shell) — larger, slightly tilted */}
              <ellipse cx={-6} cy={-4} rx={32} ry={18} fill={BEETLE} />
              {/* Elytra midline suture */}
              <path
                d="M -36 -4 Q -6 -8 24 -4"
                stroke="#121626"
                strokeOpacity={0.9}
                strokeWidth={1.2}
                fill="none"
              />
              {/* Elytra sheen */}
              <ellipse
                cx={-14}
                cy={-14}
                rx={16}
                ry={3.4}
                fill="#1E2234"
                opacity={0.9}
              />
              <ellipse
                cx={-18}
                cy={-16}
                rx={5}
                ry={1.2}
                fill="#3A4262"
                opacity={0.65}
              />
              {/* Pronotum (thorax) */}
              <ellipse cx={20} cy={-6} rx={14} ry={12} fill={BEETLE} />
              {/* Pronotum sheen */}
              <ellipse
                cx={16}
                cy={-13}
                rx={6}
                ry={1.6}
                fill="#1E2234"
                opacity={0.85}
              />
              {/* Head */}
              <ellipse cx={34} cy={-3} rx={9} ry={8} fill={BEETLE} />
              {/* Characteristic Scarabaeus clypeal "teeth" — a crenellated head fan */}
              <path
                d="M 40 -8 L 46 -11 L 44 -6 L 50 -7 L 46 -3 L 51 -1 L 46 2 L 50 6 L 44 5 L 46 10 L 40 7 Z"
                fill={BEETLE}
              />
              {/* Near-side legs (in front of body) */}
              <g
                stroke={BEETLE}
                strokeWidth={2.4}
                fill="none"
                strokeLinecap="round"
              >
                {/* Hind leg (pushing) — up toward the ball */}
                <path d="M -22 -2 Q -34 2 -38 22" />
                {/* Middle leg */}
                <path d="M -2 2 Q -2 14 -4 28" />
                {/* Front leg (reaching toward the ball) */}
                <path d="M 22 2 Q 30 10 42 24" />
              </g>
              {/* Tiny antenna */}
              <path
                d="M 36 -8 Q 42 -14 46 -16"
                stroke={BEETLE}
                strokeWidth={1.4}
                fill="none"
                strokeLinecap="round"
              />
              <circle cx={47} cy={-16} r={1.8} fill={BEETLE} />
            </g>

            {/* ── Galactic → beetle bearing vector ──────────────── */}
            <g>
              {/* Target cross on the Milky Way band */}
              <g opacity={0.55}>
                <circle
                  cx={beetleX + 6}
                  cy={240}
                  r={10}
                  fill="none"
                  stroke={MILKYWAY}
                  strokeWidth={1}
                />
                <circle
                  cx={beetleX + 6}
                  cy={240}
                  r={2}
                  fill={MILKYWAY}
                />
                <line
                  x1={beetleX - 10}
                  y1={240}
                  x2={beetleX + 22}
                  y2={240}
                  stroke={MILKYWAY}
                  strokeWidth={0.8}
                />
                <line
                  x1={beetleX + 6}
                  y1={224}
                  x2={beetleX + 6}
                  y2={256}
                  stroke={MILKYWAY}
                  strokeWidth={0.8}
                />
              </g>
              {/* Dashed line down to the beetle */}
              <line
                x1={beetleX + 6}
                y1={252}
                x2={beetleX + 6}
                y2={HORIZON_Y - 14}
                stroke={MILKYWAY}
                strokeOpacity={0.42}
                strokeWidth={1}
                strokeDasharray="2 5"
              />
              {/* Vertical bearing annotation along the plumb line */}
              <text
                x={beetleX + 14}
                y={400}
                fill={MILKYWAY_WARM}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3.4}
                fontWeight={600}
                opacity={0.9}
              >
                FIX ON BAND
              </text>
            </g>

            {/* Pulse travelling down the bearing vector */}
            {pulseVisible > 0 && (
              <g opacity={pulseOpacity}>
                <circle
                  cx={beetleX + 6}
                  cy={pulseY}
                  r={9}
                  fill={MILKYWAY}
                  opacity={0.18}
                  filter="url(#soft-glow)"
                />
                <circle cx={beetleX + 6} cy={pulseY} r={2.4} fill={MILKYWAY} />
              </g>
            )}

            {/* ── Bearing reticle (upper-left, locked onto the band) ─ */}
            <g transform={`translate(110 190)`}>
              <circle
                cx={0}
                cy={0}
                r={38}
                fill="none"
                stroke={GRAY}
                strokeOpacity={0.5}
                strokeWidth={1}
              />
              <circle
                cx={0}
                cy={0}
                r={26}
                fill="none"
                stroke={GRAY}
                strokeOpacity={0.3}
                strokeWidth={1}
                strokeDasharray="1 3"
              />
              {/* Tick marks every 30° */}
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * 30 - 90) * (Math.PI / 180);
                const r1 = 34;
                const r2 = i % 3 === 0 ? 28 : 31;
                return (
                  <line
                    key={`r-${i}`}
                    x1={Math.cos(a) * r1}
                    y1={Math.sin(a) * r1}
                    x2={Math.cos(a) * r2}
                    y2={Math.sin(a) * r2}
                    stroke={GRAY}
                    strokeOpacity={0.6}
                    strokeWidth={1}
                  />
                );
              })}
              {/* Needle locked to galactic bearing — matches Milky Way tilt (-20°) */}
              {(() => {
                const a = (-70) * (Math.PI / 180); // bearing of galactic band
                const nx = Math.cos(a) * 32;
                const ny = Math.sin(a) * 32;
                return (
                  <g>
                    <line
                      x1={0}
                      y1={0}
                      x2={nx}
                      y2={ny}
                      stroke={MILKYWAY}
                      strokeWidth={1.6}
                    />
                    <polygon
                      points={`${nx},${ny} ${nx - 5},${ny + 2} ${nx - 3},${ny - 4}`}
                      fill={MILKYWAY}
                      transform={`rotate(-70 ${nx} ${ny})`}
                    />
                  </g>
                );
              })()}
              {/* Center dot */}
              <circle cx={0} cy={0} r={2} fill={DUNG_HILITE} />
              <text
                x={0}
                y={58}
                textAnchor="middle"
                fill={GRAY}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3}
                fontWeight={500}
              >
                GALACTIC · 290°
              </text>
            </g>
          </g>
        </g>

        {/* ── Chart frame overlay ──────────────────────────────────── */}
        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1F2538"
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
          <g key={i} stroke={DUNG_HILITE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* N marker (zenith indicator, top-left) */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">Z</text>
          <line x1={5} y1={6} x2={5} y2={24} stroke={GRAY} strokeWidth={1.2} />
          <polygon points={`2,9 5,2 8,9`} fill={MILKYWAY} />
        </g>

        {/* Scale bar (lower-left of chart) */}
        <g
          transform={`translate(${FRAME.x + 26}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={100} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1.2} />
          <line x1={100} y1={-5} x2={100} y2={5} strokeWidth={1.2} />
          <text x={110} y={4} stroke="none">
            50 CM
          </text>
        </g>

        {/* Caption strip just below the chart */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · GALACTIC COMPASS BEARING, S. SATYRUS</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={MILKYWAY_WARM}
            opacity={0.9}
          >
            MILKY WAY = STRAIGHT-LINE REFERENCE
          </text>
        </g>
      </svg>

      {/* ── Type lockup ──────────────────────────────────────────── */}
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
            [16, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: MILKYWAY_WARM,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Astronomer</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The nocturnal
          <br />
          navigator.
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
          To roll its dung ball in a straight line away from the pile, the
          nocturnal African beetle{" "}
          <span style={{ color: MILKYWAY_WARM, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          uses the diffuse band of the Milky Way itself — not individual stars
          — as a compass. Under a sky with the galaxy blacked out, its paths
          collapse into loops.
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
          <span style={{ color: DUNG_HILITE }}>●</span> Dung ball = Compass head
        </span>
      </div>
    </AbsoluteFill>
  );
};
