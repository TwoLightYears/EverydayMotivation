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

// Palette — bound to the concept's visual brief
const INK = "#050914";
const STARLIGHT = "#E9E4FF";
const DUST = "#7C7BB4";
const OCHRE = "#C9B681";
const OCHRE_DEEP = "#8F7642";
const GRAY = "#8A8F99";

// Slight variants used only for tonal work — all mixed from the brief palette
const PANEL_TOP = "#0A0F22";
const PANEL_BOT = "#050914";
const GRID = "#0F1428";
const GRID_MAJOR = "#141B33";
const TITLE_INK = "#F4F1FF";

// ── Deterministic pseudo-random ────────────────────────────────────────
const hashSeed = (n: number, salt = 1): number => {
  let x = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  x = x - Math.floor(x);
  return x;
};

// ── Milky Way geometry ─────────────────────────────────────────────────
const PANEL_W = 960;
const PANEL_H = 711;

// Tilt of the galactic band relative to horizontal (band axis).
// Positive = "\" slope (upper-left → lower-right in SVG coords), so a
// beetle in the lower-right can sight up-left toward the core along axis.
const BAND_TILT_DEG = 24;
const BAND_TILT = (BAND_TILT_DEG * Math.PI) / 180;

// Beetle / ball position — bottom-right. The ball sits on the horizon
// line, so the base of the ball tangents the ground plane.
const HORIZON_Y = PANEL_H * 0.86; // = 611.46
const BALL = { x: 720, y: HORIZON_Y - 46, r: 46 };
const BEETLE = { x: BALL.x, y: BALL.y - BALL.r - 4 };

// Galactic-core position — placed exactly on the beetle→bearing axis
// so the arrow lands on the core. bearingEnd math (500 units up-left at
// 24°): (720 - 500·cos24°, BEETLE.y - 500·sin24°) ≈ (263, 312).
const CORE = { x: 263, y: 312 };

// Distance from a point to the band's central axis (perpendicular).
const distToBand = (x: number, y: number): number => {
  const dx = x - CORE.x;
  const dy = y - CORE.y;
  return -Math.sin(BAND_TILT) * dx + Math.cos(BAND_TILT) * dy;
};

// ── Star field ─────────────────────────────────────────────────────────
type Star = {
  x: number;
  y: number;
  r: number;
  base: number;
  twinklePhase: number;
  color: string;
};

const buildStars = (): Star[] => {
  const stars: Star[] = [];
  const total = 340;
  let placed = 0;
  let i = 0;
  while (placed < total && i < total * 8) {
    i++;
    const x = hashSeed(i, 1) * PANEL_W;
    const y = hashSeed(i, 2) * (PANEL_H * 0.9); // avoid horizon zone
    const perp = Math.abs(distToBand(x, y));
    // Density falloff: dense in band, thinner elsewhere but not zero.
    const bandBias = Math.exp(-(perp * perp) / (2 * 130 * 130));
    const accept = hashSeed(i, 3) < 0.28 + 0.72 * bandBias;
    if (!accept) continue;

    const rRoll = hashSeed(i, 4);
    const r =
      rRoll < 0.88
        ? 0.4 + hashSeed(i, 5) * 0.7
        : rRoll < 0.98
        ? 1.0 + hashSeed(i, 6) * 0.9
        : 1.8 + hashSeed(i, 7) * 1.1;

    const base = 0.28 + hashSeed(i, 8) * 0.55 + bandBias * 0.20;
    const twinklePhase = hashSeed(i, 9) * Math.PI * 2;
    const colorRoll = hashSeed(i, 10);
    const color =
      colorRoll < 0.05
        ? OCHRE
        : colorRoll < 0.14
        ? "#D6CFFF"
        : STARLIGHT;

    stars.push({ x, y, r, base: Math.min(1, base), twinklePhase, color });
    placed++;
  }
  return stars;
};

const STARS = buildStars();

// Named bright anchors that punctuate the band.
const BRIGHT_STARS = [
  { x: CORE.x - 40, y: CORE.y + 34, r: 2.6 },
  { x: CORE.x + 220, y: CORE.y + 92, r: 2.4 },
  { x: CORE.x - 190, y: CORE.y - 34, r: 2.2 },
  { x: PANEL_W * 0.82, y: PANEL_H * 0.18, r: 2.0 },
  { x: PANEL_W * 0.12, y: PANEL_H * 0.55, r: 2.0 },
];

// ── Component ──────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Page layout: 1080 × 1350
  const FRAME = { x: 60, y: 130, w: PANEL_W, h: PANEL_H };

  // Motion
  const skyReveal = interpolate(frame, [0, fps * 1.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const starReveal = interpolate(frame, [fps * 0.3, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bearingProgress = interpolate(
    frame,
    [fps * 1.6, fps * 3.2],
    [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const titleSpring = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.3, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const twinkleT = frame / fps;

  // Rolled-track behind the ball — a straight-line footprint on the
  // ground extending back the way the beetle came, hinting that its
  // path matches the bearing above.
  const trackReveal = interpolate(
    frame,
    [fps * 2.8, fps * 3.8],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Bearing line — from beetle up-left along the band axis toward core.
  // Direction unit vector = (-cos, -sin) of BAND_TILT (points up-left).
  const BEARING_LEN = 500;
  const bearingEnd = {
    x: BEETLE.x - Math.cos(BAND_TILT) * BEARING_LEN,
    y: BEETLE.y - Math.sin(BAND_TILT) * BEARING_LEN,
  };
  const bearingNow = {
    x: BEETLE.x + (bearingEnd.x - BEETLE.x) * bearingProgress,
    y: BEETLE.y + (bearingEnd.y - BEETLE.y) * bearingProgress,
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
        <span style={{ color: OCHRE }}>2026 · 07 · 09</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="panel-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PANEL_TOP} />
            <stop offset="100%" stopColor={PANEL_BOT} />
          </linearGradient>

          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 160 0 L 0 0 0 160"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          {/* Galactic core soft glow */}
          <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STARLIGHT} stopOpacity={0.55} />
            <stop offset="45%" stopColor={DUST} stopOpacity={0.25} />
            <stop offset="100%" stopColor={DUST} stopOpacity={0} />
          </radialGradient>

          {/* Milky Way band — diffuse wash */}
          <radialGradient id="band-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={DUST} stopOpacity={0.22} />
            <stop offset="65%" stopColor={DUST} stopOpacity={0.08} />
            <stop offset="100%" stopColor={DUST} stopOpacity={0} />
          </radialGradient>

          {/* Ball warm gradient */}
          <radialGradient id="ball-fill" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor={OCHRE} />
            <stop offset="55%" stopColor={OCHRE_DEEP} />
            <stop offset="100%" stopColor="#5B4522" />
          </radialGradient>

          <clipPath id="panel-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>

          <radialGradient id="star-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STARLIGHT} stopOpacity={0.75} />
            <stop offset="100%" stopColor={STARLIGHT} stopOpacity={0} />
          </radialGradient>

          {/* Horizon haze */}
          <linearGradient id="horizon-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK} stopOpacity={0} />
            <stop offset="100%" stopColor={INK} stopOpacity={0.85} />
          </linearGradient>
        </defs>

        {/* ── Drafting board panel ─────────────────────────────── */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#panel-bg)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />

        <g clipPath="url(#panel-clip)">
          <g transform={`translate(${FRAME.x}, ${FRAME.y})`}>
            {/* Milky Way band — soft nested washes, no dark lane ellipses */}
            <g
              transform={`rotate(${BAND_TILT_DEG} ${CORE.x} ${CORE.y})`}
              opacity={skyReveal}
            >
              <ellipse
                cx={CORE.x}
                cy={CORE.y}
                rx={880}
                ry={140}
                fill="url(#band-glow)"
              />
              <ellipse
                cx={CORE.x + 20}
                cy={CORE.y - 4}
                rx={620}
                ry={70}
                fill="url(#band-glow)"
                opacity={0.9}
              />
              <ellipse
                cx={CORE.x - 40}
                cy={CORE.y + 6}
                rx={340}
                ry={38}
                fill="url(#band-glow)"
                opacity={0.9}
              />
              {/* Bright galactic core */}
              <ellipse
                cx={CORE.x}
                cy={CORE.y}
                rx={110}
                ry={44}
                fill="url(#core-glow)"
              />
              <ellipse
                cx={CORE.x}
                cy={CORE.y}
                rx={36}
                ry={14}
                fill={STARLIGHT}
                opacity={0.35}
              />
            </g>

            {/* Stars */}
            <g opacity={starReveal}>
              {STARS.map((s, i) => {
                const tw = 0.75 + 0.25 * Math.sin(twinkleT * 1.6 + s.twinklePhase);
                const a = Math.min(1, s.base * tw);
                return (
                  <circle
                    key={i}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={s.color}
                    opacity={a}
                  />
                );
              })}
              {BRIGHT_STARS.map((b, i) => (
                <g key={`bs-${i}`}>
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={b.r * 4}
                    fill="url(#star-halo)"
                    opacity={0.55}
                  />
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={b.r}
                    fill={STARLIGHT}
                  />
                </g>
              ))}
            </g>

            {/* Horizon haze — atmospheric wash near ground */}
            <rect
              x={0}
              y={HORIZON_Y - 100}
              width={PANEL_W}
              height={PANEL_H - HORIZON_Y + 100}
              fill="url(#horizon-haze)"
            />
            <line
              x1={0}
              y1={HORIZON_Y}
              x2={PANEL_W}
              y2={HORIZON_Y}
              stroke={GRAY}
              strokeOpacity={0.28}
              strokeWidth={1}
              strokeDasharray="2 6"
            />

            {/* Rolled-track behind the ball — projected onto ground plane.
                Two thin parallel dashes extending down-right toward the
                right edge, from the ball's base. */}
            <g opacity={trackReveal * 0.75}>
              {[-8, 8].map((offset, i) => {
                const startX = BALL.x + 20;
                const startY = HORIZON_Y + 4 + offset * 0.4;
                const endX = PANEL_W - 20;
                const endY = HORIZON_Y + 10 + offset * 0.5;
                return (
                  <line
                    key={i}
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={OCHRE_DEEP}
                    strokeWidth={1.2}
                    strokeDasharray="4 8"
                    opacity={0.7}
                  />
                );
              })}
            </g>

            {/* Bearing line — from beetle toward galactic core along band axis */}
            <g opacity={Math.min(1, bearingProgress * 1.4)}>
              <line
                x1={BEETLE.x}
                y1={BEETLE.y}
                x2={bearingNow.x}
                y2={bearingNow.y}
                stroke={OCHRE}
                strokeWidth={1.6}
                strokeDasharray="4 6"
              />
              {/* Perpendicular tick marks — polarization axis witnesses */}
              {[0.28, 0.5, 0.72].map((t, i) => {
                const px = BEETLE.x + (bearingEnd.x - BEETLE.x) * t;
                const py = BEETLE.y + (bearingEnd.y - BEETLE.y) * t;
                const on = bearingProgress > t;
                const nx = Math.cos(BAND_TILT + Math.PI / 2);
                const ny = Math.sin(BAND_TILT + Math.PI / 2);
                return (
                  <line
                    key={i}
                    x1={px - nx * 6}
                    y1={py - ny * 6}
                    x2={px + nx * 6}
                    y2={py + ny * 6}
                    stroke={OCHRE}
                    strokeOpacity={on ? 0.85 : 0}
                    strokeWidth={1.4}
                  />
                );
              })}
              {/* Arrow head + label — lands right at galactic core */}
              {bearingProgress > 0.55 && (
                <g
                  opacity={interpolate(
                    bearingProgress,
                    [0.55, 1],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    },
                  )}
                >
                  <g
                    transform={`translate(${bearingEnd.x}, ${bearingEnd.y}) rotate(${
                      BAND_TILT_DEG + 180
                    })`}
                  >
                    <polygon
                      points="0,0 -12,-5 -12,5"
                      fill={OCHRE}
                    />
                  </g>
                </g>
              )}
            </g>

            {/* Dung ball */}
            <g>
              <ellipse
                cx={BALL.x}
                cy={BALL.y + BALL.r * 0.7}
                rx={BALL.r * 1.2}
                ry={BALL.r * 0.22}
                fill={INK}
                opacity={0.9}
              />
              <circle
                cx={BALL.x}
                cy={BALL.y}
                r={BALL.r}
                fill="url(#ball-fill)"
              />
              {Array.from({ length: 18 }).map((_, i) => {
                const a = hashSeed(i + 100, 1) * Math.PI * 2;
                const rr = hashSeed(i + 100, 2) * BALL.r * 0.88;
                const dx = Math.cos(a) * rr;
                const dy = Math.sin(a) * rr;
                return (
                  <circle
                    key={i}
                    cx={BALL.x + dx}
                    cy={BALL.y + dy}
                    r={0.9 + hashSeed(i + 100, 3) * 1.6}
                    fill={OCHRE_DEEP}
                    opacity={0.5}
                  />
                );
              })}
            </g>

            {/* Beetle — perched atop the ball, "dance" pose surveying the sky */}
            <g transform={`translate(${BEETLE.x}, ${BEETLE.y})`}>
              {/* legs */}
              <g
                stroke="#0B0E1E"
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
              >
                <path d="M -9 6 L -20 15" />
                <path d="M -9 0 L -24 3" />
                <path d="M -9 -6 L -20 -12" />
                <path d="M 9 6 L 20 15" />
                <path d="M 9 0 L 24 3" />
                <path d="M 9 -6 L 20 -12" />
              </g>
              {/* body — elytra dome */}
              <ellipse cx={0} cy={2} rx={13} ry={16} fill="#0D1224" />
              <path
                d="M 0 -14 Q 12 -6 12 6 Q 8 16 0 18 Q -8 16 -12 6 Q -12 -6 0 -14 Z"
                fill="#141834"
              />
              {/* elytra seam */}
              <line
                x1={0}
                y1={-13}
                x2={0}
                y2={16}
                stroke="#0A0D1E"
                strokeWidth={1.2}
              />
              {/* iridescence highlight */}
              <ellipse
                cx={-3}
                cy={2}
                rx={2.5}
                ry={7}
                fill={DUST}
                opacity={0.42}
              />
              {/* head */}
              <ellipse cx={0} cy={-16} rx={5} ry={4} fill="#0D1224" />
              {/* front horn / mandibles */}
              <path
                d="M -3 -20 L -1 -22 M 3 -20 L 1 -22"
                stroke="#0D1224"
                strokeWidth={1.6}
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Bearing / heading callout — sits just above arrow tip */}
            <g
              transform={`translate(${bearingEnd.x - 4}, ${bearingEnd.y - 42})`}
              opacity={Math.min(
                1,
                Math.max(0, (bearingProgress - 0.7) * 3.5),
              )}
            >
              <line
                x1={0}
                y1={16}
                x2={0}
                y2={30}
                stroke={OCHRE}
                strokeOpacity={0.8}
                strokeWidth={1}
              />
              <text
                fontFamily={inter}
                fontSize={12}
                letterSpacing={3.4}
                fontWeight={600}
                fill={OCHRE}
                textAnchor="middle"
              >
                HEADING
              </text>
              <text
                y={14}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={1.8}
                fontWeight={500}
                fill={GRAY}
                textAnchor="middle"
              >
                ∥ Milky Way polarization
              </text>
            </g>
          </g>
        </g>

        {/* Drafting frame border + corner marks */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1B2138"
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
          <g key={i} stroke={OCHRE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate identifier — top-left inside frame */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={11}
          letterSpacing={3}
        >
          <text>PLATE · III</text>
          <text y={16} opacity={0.7}>
            SCARABAEUS SATYRUS
          </text>
        </g>

        {/* Site & sky stamp — top-right inside frame */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 24}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={11}
          letterSpacing={3}
          textAnchor="end"
        >
          <text>VREDEFORT · 26.9° S</text>
          <text y={16} opacity={0.7}>
            NEW MOON · 03:14 SAST
          </text>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · HEADING VECTOR ALIGNED TO GALACTIC MERIDIAN</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={OCHRE}
            opacity={0.9}
          >
            POLARIZATION COMPASS · MILKY WAY
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 918,
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
            color: OCHRE,
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
            color: TITLE_INK,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The beetle
          <br />
          that steers by
          <br />
          the galaxy.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          On moonless African nights,{" "}
          <span style={{ color: OCHRE, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          rolls its dung ball in a dead-straight line by reading the faint
          polarization pattern of the Milky Way — the first non-human
          animal shown to use the galaxy itself as a compass.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 40,
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
        <span>Dacke et al. · Current Biology 23:4 (2013) 298–300</span>
        <span>
          <span style={{ color: OCHRE }}>●</span> Bearing = galactic N
        </span>
      </div>
    </AbsoluteFill>
  );
};
