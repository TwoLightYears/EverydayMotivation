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
const INK = "#07080F";        // deep night sky
const HAZE = "#141A2E";       // midnight-blue haze
const STAR = "#E6DEC0";       // Milky Way cream
const STAR_DIM = "#B9B39B";   // dimmer star cream
const DUNG = "#C79A57";       // warm dung ochre
const DUNG_DARK = "#8A6A3A";  // shadow ochre for ball
const BEETLE = "#A17A3C";     // beetle chitin — lighter than shadow so it reads on dark sky
const RULE = "#7C88A8";       // twilight-steel rule
const RULE_DIM = "#4A5468";   // dim rule

// Deterministic pseudo-random for stars
const rand = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Milky Way band geometry (defined in sky-content coords, w=1080 h=1350)
// Band rotates around this pivot at this angle from horizontal.
const MW_ANGLE_DEG = -22;
const MW_ANGLE_RAD = (MW_ANGLE_DEG * Math.PI) / 180;
const MW_PIVOT = { x: 545, y: 460 };
const MW_HALF_WIDTH = 150; // perpendicular half-thickness at the "solid" core

// Perpendicular distance from a point to the Milky Way centerline.
const perpDist = (x: number, y: number): number => {
  // Centerline vector (cos, sin); perpendicular = (-sin, cos)
  const dx = x - MW_PIVOT.x;
  const dy = y - MW_PIVOT.y;
  return Math.abs(-Math.sin(MW_ANGLE_RAD) * dx + Math.cos(MW_ANGLE_RAD) * dy);
};

// Beetle + ball positioning (in same sky-content coord space).
const HORIZON_Y = 810;
const BEETLE_X = 560;
const BALL_X = 665;
const BALL_R = 42;

// Sight-line rises PERPENDICULAR to the Milky Way axis so it lands
// exactly on the galactic centerline — a visual argument that the
// beetle's heading axis is being measured against the band.
// Perpendicular unit (pointing up-and-left from beetle to band):
const PERP_X = Math.sin(MW_ANGLE_RAD);   // = sin(-22°) ≈ -0.375
const PERP_Y = -Math.cos(MW_ANGLE_RAD);  // = -cos(-22°) ≈ -0.927

const SIGHT_START = { x: BEETLE_X - 8, y: HORIZON_Y - 34 };
// Foot of perpendicular from SIGHT_START onto the Milky Way centerline
const _v = {
  x: SIGHT_START.x - MW_PIVOT.x,
  y: SIGHT_START.y - MW_PIVOT.y,
};
const _axisDot =
  _v.x * Math.cos(MW_ANGLE_RAD) + _v.y * Math.sin(MW_ANGLE_RAD);
const _foot = {
  x: MW_PIVOT.x + _axisDot * Math.cos(MW_ANGLE_RAD),
  y: MW_PIVOT.y + _axisDot * Math.sin(MW_ANGLE_RAD),
};
const SIGHT_END = _foot;
const SIGHT_LEN = Math.hypot(
  SIGHT_END.x - SIGHT_START.x,
  SIGHT_END.y - SIGHT_START.y,
);

// ── Star field ──────────────────────────────────────────────────────────
type Star = {
  x: number;
  y: number;
  r: number;
  o: number;   // base opacity
  tw: number;  // twinkle phase 0..1
  glow: boolean;
};

const buildStars = (): Star[] => {
  const stars: Star[] = [];
  // Sky rectangle we distribute stars into (in sky-content coords)
  const X0 = 60;
  const X1 = 1020;
  const Y0 = 150;
  const Y1 = 800;

  // Layer 1 — background dust: many faint stars everywhere
  for (let i = 0; i < 520; i++) {
    const x = X0 + rand(i * 1.13) * (X1 - X0);
    const y = Y0 + rand(i * 2.71 + 5) * (Y1 - Y0);
    const d = perpDist(x, y);
    // Slight bias toward band (more density inside)
    const bandBoost = Math.exp(-(d * d) / (2 * 180 * 180));
    if (rand(i + 9000) > 0.35 + bandBoost * 0.4) continue;
    stars.push({
      x,
      y,
      r: 0.4 + rand(i * 3.7) * 0.5,
      o: 0.25 + rand(i * 4.3) * 0.35,
      tw: rand(i * 5.9),
      glow: false,
    });
  }

  // Layer 2 — mid stars, biased toward the band
  for (let i = 0; i < 260; i++) {
    // Sample in band-local coords: u along axis, v perpendicular
    const u = (rand(i * 7.13 + 111) - 0.5) * 1400;
    // Gaussian-ish perpendicular offset with small tails
    const v = (rand(i * 11.7 + 222) - 0.5) * 260;
    const x =
      MW_PIVOT.x + Math.cos(MW_ANGLE_RAD) * u - Math.sin(MW_ANGLE_RAD) * v;
    const y =
      MW_PIVOT.y + Math.sin(MW_ANGLE_RAD) * u + Math.cos(MW_ANGLE_RAD) * v;
    if (x < X0 || x > X1 || y < Y0 || y > Y1) continue;
    stars.push({
      x,
      y,
      r: 0.7 + rand(i * 13.1) * 0.9,
      o: 0.5 + rand(i * 17.3) * 0.45,
      tw: rand(i * 19.7),
      glow: false,
    });
  }

  // Layer 3 — bright anchor stars, some with glow
  for (let i = 0; i < 26; i++) {
    const u = (rand(i * 3.7 + 5001) - 0.5) * 1400;
    const v = (rand(i * 5.11 + 6001) - 0.5) * 220;
    const x =
      MW_PIVOT.x + Math.cos(MW_ANGLE_RAD) * u - Math.sin(MW_ANGLE_RAD) * v;
    const y =
      MW_PIVOT.y + Math.sin(MW_ANGLE_RAD) * u + Math.cos(MW_ANGLE_RAD) * v;
    if (x < X0 || x > X1 || y < Y0 || y > Y1) continue;
    stars.push({
      x,
      y,
      r: 1.6 + rand(i * 7.3) * 1.1,
      o: 0.85 + rand(i * 9.1) * 0.15,
      tw: rand(i * 11.3),
      glow: true,
    });
  }
  return stars;
};

const STARS: Star[] = buildStars();

// Ticks along the Milky Way axis (astronomer's ledger marks)
const AXIS_TICKS = Array.from({ length: 11 }, (_, i) => i - 5);

// Small compass rose (top-left of sky frame)
const CompassRose: React.FC<{ cx: number; cy: number; r: number }> = ({
  cx,
  cy,
  r,
}) => {
  const pts = [0, 90, 180, 270];
  return (
    <g stroke={RULE_DIM} strokeWidth={1} fill="none">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.7} strokeOpacity={0.6} />
      {pts.map((deg, i) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * (r * 0.85);
        const y1 = cy + Math.sin(rad) * (r * 0.85);
        const x2 = cx + Math.cos(rad) * (r * 1.1);
        const y2 = cy + Math.sin(rad) * (r * 1.1);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {/* North arrow pointing up, ochre */}
      <polygon
        points={`${cx},${cy - r * 1.15} ${cx - 5},${cy - r * 0.85} ${cx + 5},${
          cy - r * 0.85
        }`}
        fill={DUNG}
        stroke="none"
      />
      <text
        x={cx}
        y={cy - r * 1.35}
        textAnchor="middle"
        fill={DUNG}
        fontFamily={inter}
        fontSize={10}
        fontWeight={600}
        letterSpacing={3}
        stroke="none"
      >
        N
      </text>
    </g>
  );
};

// Beetle silhouette rolling its ball, side view.
// Origin at the beetle body center; ball to the right of the beetle.
const Beetle: React.FC = () => {
  const body = BEETLE;
  const highlight = "#5A4A2A";
  // Body drawn around origin (0,0); front leg to right; hind legs braced up on ball
  return (
    <g>
      {/* Ground shadow beneath ball */}
      <ellipse
        cx={BALL_X}
        cy={HORIZON_Y + 4}
        rx={BALL_R + 6}
        ry={4}
        fill="#000"
        opacity={0.55}
      />
      {/* Dung ball */}
      <defs>
        <radialGradient id="ball-grad" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#E5B978" />
          <stop offset="55%" stopColor={DUNG} />
          <stop offset="100%" stopColor={DUNG_DARK} />
        </radialGradient>
        <radialGradient id="ball-shine" cx="30%" cy="28%" r="20%">
          <stop offset="0%" stopColor="#FFF3D8" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#FFF3D8" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle
        cx={BALL_X}
        cy={HORIZON_Y - BALL_R + 1}
        r={BALL_R}
        fill="url(#ball-grad)"
      />
      {/* Tiny stipple pieces */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = rand(i * 3.1 + 91) * Math.PI * 2;
        const rr = rand(i * 5.7 + 17) * (BALL_R - 5);
        const cx = BALL_X + Math.cos(a) * rr;
        const cy = HORIZON_Y - BALL_R + 1 + Math.sin(a) * rr;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={0.6 + rand(i * 2.3) * 1.4}
            fill={DUNG_DARK}
            opacity={0.55}
          />
        );
      })}
      <circle
        cx={BALL_X}
        cy={HORIZON_Y - BALL_R + 1}
        r={BALL_R}
        fill="url(#ball-shine)"
      />
      <circle
        cx={BALL_X}
        cy={HORIZON_Y - BALL_R + 1}
        r={BALL_R}
        fill="none"
        stroke={DUNG_DARK}
        strokeWidth={0.8}
        opacity={0.6}
      />

      {/* Beetle body: head-down, forelegs on ground, hind legs braced on ball.
          The beetle is to the LEFT of the ball, tilted head-down, back
          arching down toward the ground, hind legs reaching up-and-right
          to grip the top of the ball. Front-facing = left, so the beetle
          rolls the ball to the RIGHT by pushing it backwards. */}
      {(() => {
        const bx = BEETLE_X;
        const by = HORIZON_Y - 22;
        return (
          <g>
            {/* Forelegs braced on ground (leftmost) */}
            <path
              d={`M ${bx - 30} ${by + 6} Q ${bx - 42} ${by + 14} ${bx - 46} ${HORIZON_Y}`}
              stroke={body}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M ${bx - 22} ${by + 8} Q ${bx - 32} ${by + 18} ${bx - 36} ${HORIZON_Y}`}
              stroke={body}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
            {/* Middle legs */}
            <path
              d={`M ${bx - 8} ${by + 10} Q ${bx - 14} ${by + 20} ${bx - 18} ${HORIZON_Y}`}
              stroke={body}
              strokeWidth={2.2}
              strokeLinecap="round"
              fill="none"
            />
            {/* Hind legs reaching UP onto the ball */}
            <path
              d={`M ${bx + 12} ${by + 2} Q ${bx + 22} ${by - 6} ${bx + 30} ${by - 18}`}
              stroke={body}
              strokeWidth={2.6}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M ${bx + 16} ${by + 8} Q ${bx + 28} ${by + 4} ${bx + 38} ${by - 8}`}
              stroke={body}
              strokeWidth={2.6}
              strokeLinecap="round"
              fill="none"
            />

            {/* Body — elongated dome tilted head-down (front lower on left) */}
            <g transform={`translate(${bx} ${by}) rotate(-14)`}>
              {/* Elytra dome */}
              <path
                d={`M -32 4 Q -34 -12 -14 -14 Q 6 -16 22 -12 Q 30 -8 30 4 Z`}
                fill={body}
              />
              {/* Highlight on top of elytra */}
              <path
                d={`M -24 -6 Q -10 -12 12 -11 Q 22 -10 24 -6`}
                stroke={highlight}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
              {/* Elytra midline */}
              <line
                x1={-24}
                y1={0}
                x2={26}
                y2={2}
                stroke="#1A140A"
                strokeWidth={0.9}
                opacity={0.5}
              />
              {/* Pronotum (thorax shield) */}
              <path
                d={`M -30 4 Q -34 -8 -22 -13 Q -12 -14 -10 -6 Q -12 4 -18 5 Z`}
                fill="#3E3627"
              />
              {/* Head (leftmost) */}
              <ellipse cx={-36} cy={2} rx={7} ry={5.5} fill={body} />
              {/* Clypeus (front of head — small notches) */}
              <path
                d={`M -42 0 L -44 3 L -42 5`}
                stroke="#1A140A"
                strokeWidth={0.8}
                fill="none"
              />
              {/* Antenna hint */}
              <line
                x1={-40}
                y1={-2}
                x2={-46}
                y2={-6}
                stroke="#1A140A"
                strokeWidth={0.9}
                strokeLinecap="round"
              />
            </g>
          </g>
        );
      })()}
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing
  const sightSpring = spring({
    frame: frame - fps * 1.0,
    fps,
    config: { damping: 22, mass: 1.2, stiffness: 90 },
  });
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const skyIn = interpolate(frame, [0, fps * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  const sightProgress = sightSpring; // 0..1 for length draw
  const sightCurrent = {
    x: SIGHT_START.x + (SIGHT_END.x - SIGHT_START.x) * sightProgress,
    y: SIGHT_START.y + (SIGHT_END.y - SIGHT_START.y) * sightProgress,
  };

  // Sky frame
  const FRAME = { x: 60, y: 130, w: 960, h: 760 };

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
          color: RULE,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: DUNG }}>2026 · 07 · 07</span>
      </div>

      {/* Sky panel */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky background gradient */}
          <radialGradient
            id="sky-grad"
            cx="52%"
            cy="42%"
            r="78%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={HAZE} stopOpacity={1} />
            <stop offset="65%" stopColor="#0B0D18" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Milky Way band gradient — perpendicular to axis */}
          <linearGradient id="mw-grad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0} />
            <stop offset="30%" stopColor={STAR} stopOpacity={0.09} />
            <stop offset="50%" stopColor={STAR} stopOpacity={0.28} />
            <stop offset="70%" stopColor={STAR} stopOpacity={0.09} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="mw-core" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0} />
            <stop offset="42%" stopColor={STAR} stopOpacity={0.05} />
            <stop offset="50%" stopColor="#FFF7DA" stopOpacity={0.24} />
            <stop offset="58%" stopColor={STAR} stopOpacity={0.05} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </linearGradient>

          {/* Horizon glow */}
          <linearGradient id="horizon-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={HAZE} stopOpacity={0} />
            <stop offset="100%" stopColor="#1A1710" stopOpacity={0.7} />
          </linearGradient>

          {/* Star glow filter */}
          <filter id="star-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>

          {/* Clip for the sky frame */}
          <clipPath id="sky-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Sky background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky-grad)"
        />

        <g clipPath="url(#sky-clip)" opacity={skyIn}>
          {/* Milky Way band — outer haze */}
          <g
            transform={`rotate(${MW_ANGLE_DEG} ${MW_PIVOT.x} ${MW_PIVOT.y})`}
          >
            <rect
              x={MW_PIVOT.x - 900}
              y={MW_PIVOT.y - MW_HALF_WIDTH}
              width={1800}
              height={MW_HALF_WIDTH * 2}
              fill="url(#mw-grad)"
              filter="url(#star-glow)"
            />
            <rect
              x={MW_PIVOT.x - 900}
              y={MW_PIVOT.y - 70}
              width={1800}
              height={140}
              fill="url(#mw-core)"
            />
            {/* Dust lanes */}
            {[
              { off: -18, w: 6, op: 0.25 },
              { off: 6, w: 4, op: 0.18 },
              { off: 26, w: 8, op: 0.22 },
              { off: -46, w: 4, op: 0.12 },
            ].map((d, i) => (
              <rect
                key={i}
                x={MW_PIVOT.x - 900}
                y={MW_PIVOT.y + d.off}
                width={1800}
                height={d.w}
                fill={INK}
                opacity={d.op}
              />
            ))}
          </g>

          {/* Stars */}
          {STARS.map((s, i) => {
            const twPhase =
              (Math.sin((frame / fps) * 1.3 + s.tw * 6.28) + 1) / 2;
            const op = s.o * (0.75 + twPhase * 0.35);
            return (
              <g key={i}>
                {s.glow && (
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={s.r * 3}
                    fill={STAR}
                    opacity={op * 0.25}
                    filter="url(#star-glow)"
                  />
                )}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill={s.glow ? "#FFF6DA" : STAR_DIM}
                  opacity={op}
                />
              </g>
            );
          })}

          {/* Galactic-plane axis: subtle centerline */}
          <g
            transform={`rotate(${MW_ANGLE_DEG} ${MW_PIVOT.x} ${MW_PIVOT.y})`}
            opacity={0.35}
          >
            <line
              x1={MW_PIVOT.x - 460}
              y1={MW_PIVOT.y}
              x2={MW_PIVOT.x + 460}
              y2={MW_PIVOT.y}
              stroke={RULE}
              strokeWidth={0.6}
              strokeDasharray="2 6"
            />
            {AXIS_TICKS.map((k) => (
              <line
                key={k}
                x1={MW_PIVOT.x + k * 70}
                y1={MW_PIVOT.y - 6}
                x2={MW_PIVOT.x + k * 70}
                y2={MW_PIVOT.y + 6}
                stroke={RULE}
                strokeWidth={0.8}
              />
            ))}
          </g>

          {/* Faint horizon warmth */}
          <rect
            x={FRAME.x}
            y={HORIZON_Y - 90}
            width={FRAME.w}
            height={110}
            fill="url(#horizon-grad)"
          />
        </g>

        {/* Frame border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={RULE_DIM}
          strokeWidth={1}
          opacity={0.7}
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
          <g key={i} stroke={DUNG} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Compass rose — top-left of sky frame (safely away from band core) */}
        <CompassRose cx={FRAME.x + 90} cy={FRAME.y + 90} r={30} />
        <text
          x={FRAME.x + 90}
          y={FRAME.y + 148}
          textAnchor="middle"
          fill={RULE}
          fontFamily={inter}
          fontSize={9.5}
          fontWeight={500}
          letterSpacing={2.6}
        >
          FIELD COMPASS
        </text>

        {/* Right annotation — bracket pointing along the Milky Way band */}
        <g
          fill={RULE}
          stroke={RULE}
          fontFamily={inter}
          fontSize={10.5}
          fontWeight={500}
          letterSpacing={2.4}
        >
          <line
            x1={FRAME.x + FRAME.w - 32}
            y1={220}
            x2={FRAME.x + FRAME.w - 32}
            y2={420}
            strokeWidth={1}
          />
          <line
            x1={FRAME.x + FRAME.w - 32}
            y1={220}
            x2={FRAME.x + FRAME.w - 44}
            y2={220}
            strokeWidth={1}
          />
          <line
            x1={FRAME.x + FRAME.w - 32}
            y1={420}
            x2={FRAME.x + FRAME.w - 44}
            y2={420}
            strokeWidth={1}
          />
          <text
            x={FRAME.x + FRAME.w - 32}
            y={212}
            textAnchor="end"
            fill={RULE}
            stroke="none"
            letterSpacing={2.8}
            fontSize={9.5}
          >
            ONLY LIGHT SOURCE
          </text>
          <text
            x={FRAME.x + FRAME.w - 32}
            y={438}
            textAnchor="end"
            fill={RULE}
            stroke="none"
            letterSpacing={2.8}
            fontSize={9.5}
          >
            THE GALACTIC BAND
          </text>
        </g>

        {/* Horizon line */}
        <line
          x1={FRAME.x + 6}
          y1={HORIZON_Y}
          x2={FRAME.x + FRAME.w - 6}
          y2={HORIZON_Y}
          stroke={RULE}
          strokeWidth={1.2}
          strokeDasharray="2 5"
          opacity={0.85}
        />
        <text
          x={FRAME.x + 20}
          y={HORIZON_Y - 8}
          fill={RULE}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          HORIZON
        </text>

        {/* Ground heading vector: small arrow ahead of the ball
            showing the beetle's rolling direction (right) */}
        <g stroke={DUNG} fill={DUNG} strokeWidth={1.2} strokeLinecap="round">
          <line
            x1={BALL_X + BALL_R + 8}
            y1={HORIZON_Y + 22}
            x2={BALL_X + BALL_R + 88}
            y2={HORIZON_Y + 22}
          />
          <polygon
            points={`${BALL_X + BALL_R + 84},${HORIZON_Y + 17} ${BALL_X + BALL_R + 94},${HORIZON_Y + 22} ${BALL_X + BALL_R + 84},${HORIZON_Y + 27}`}
            stroke="none"
          />
          <text
            x={BALL_X + BALL_R + 100}
            y={HORIZON_Y + 26}
            fill={DUNG}
            stroke="none"
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={2.8}
          >
            HEADING
          </text>
        </g>

        {/* Sight-line rising from beetle, perpendicular to the galactic
            band; when fully drawn, its tip lands exactly on the band's
            centerline — the visual argument that the beetle is fixing
            its heading against the Milky Way's axis. */}
        <g>
          <line
            x1={SIGHT_START.x}
            y1={SIGHT_START.y}
            x2={sightCurrent.x}
            y2={sightCurrent.y}
            stroke={DUNG}
            strokeWidth={1.6}
            strokeDasharray="5 5"
            opacity={0.95}
          />
          {/* Aiming reticle at sight tip once mostly drawn */}
          {sightProgress > 0.85 && (
            <g
              transform={`translate(${SIGHT_END.x} ${SIGHT_END.y})`}
              opacity={interpolate(
                sightProgress,
                [0.85, 1],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              )}
            >
              {/* Reticle glow */}
              <circle
                cx={0}
                cy={0}
                r={26}
                fill={DUNG}
                opacity={0.18}
                filter="url(#star-glow)"
              />
              <circle
                cx={0}
                cy={0}
                r={16}
                fill={INK}
                opacity={0.55}
              />
              <circle
                cx={0}
                cy={0}
                r={14}
                fill="none"
                stroke={DUNG}
                strokeWidth={1.6}
              />
              <line
                x1={-20}
                y1={0}
                x2={-8}
                y2={0}
                stroke={DUNG}
                strokeWidth={1.4}
              />
              <line
                x1={8}
                y1={0}
                x2={20}
                y2={0}
                stroke={DUNG}
                strokeWidth={1.4}
              />
              <line
                x1={0}
                y1={-20}
                x2={0}
                y2={-8}
                stroke={DUNG}
                strokeWidth={1.4}
              />
              <line
                x1={0}
                y1={8}
                x2={0}
                y2={20}
                stroke={DUNG}
                strokeWidth={1.4}
              />

              {/* Leader to left, then callout text (safely inside frame) */}
              <line
                x1={-14}
                y1={0}
                x2={-70}
                y2={0}
                stroke={DUNG}
                strokeWidth={1}
              />
              <line
                x1={-70}
                y1={0}
                x2={-110}
                y2={-16}
                stroke={DUNG}
                strokeWidth={1}
              />
              <text
                x={-116}
                y={-26}
                textAnchor="end"
                fill={DUNG}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3.4}
              >
                COMPASS FIX
              </text>
              <text
                x={-116}
                y={-11}
                textAnchor="end"
                fill={RULE}
                fontFamily={inter}
                fontSize={9.5}
                fontWeight={500}
                letterSpacing={2.6}
              >
                REFERENCE · GALACTIC BAND
              </text>
            </g>
          )}
        </g>

        {/* Beetle + ball */}
        <Beetle />

        {/* Beetle label */}
        <g opacity={interpolate(frame, [fps * 0.6, fps * 1.2], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}>
          <line
            x1={BEETLE_X - 30}
            y1={HORIZON_Y - 4}
            x2={BEETLE_X - 90}
            y2={HORIZON_Y + 40}
            stroke={RULE}
            strokeWidth={1}
          />
          <text
            x={BEETLE_X - 96}
            y={HORIZON_Y + 44}
            textAnchor="end"
            fill={RULE}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={2.8}
          >
            SCARABAEUS SATYRUS
          </text>
          <text
            x={BEETLE_X - 96}
            y={HORIZON_Y + 58}
            textAnchor="end"
            fill={RULE_DIM}
            fontFamily={inter}
            fontSize={9}
            fontWeight={500}
            letterSpacing={2.4}
          >
            OBSERVER · 22 MM
          </text>
        </g>

        {/* Caption strip just below the sky frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={RULE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 3 · MOONLESS SKY · CAPE PROV., SOUTH AFRICA</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={DUNG}
            opacity={0.9}
          >
            HEADING LOCK VIA MILKY WAY
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
            color: DUNG,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: RULE, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Astronomer</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The beetle who
          <br />
          reads the galaxy.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          On moonless nights,{" "}
          <span style={{ color: DUNG, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          rolls its ball in a perfectly straight line by orienting to the
          diffuse light band of the Milky Way — the first non-human animal
          shown to navigate by the galaxy itself.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 42,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: RULE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dacke et al. · Current Biology 23 (2013) 298–300</span>
        <span>
          <span style={{ color: DUNG }}>●</span> Ball ≈ 40× beetle mass
        </span>
      </div>
    </AbsoluteFill>
  );
};
