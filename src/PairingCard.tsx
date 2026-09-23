import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
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

// ── Palette (from the concept's visual brief) ────────────────────────────
const INK = "#0B0E14";
const CREAM = "#E7D9B5";
const AMBER = "#D9A03E";
const EYE = "#C43420";
const OLIVE = "#5D6152";

const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17]);
const YEARS = Array.from({ length: 17 }, (_, i) => i + 1);

// Stylised Magicicada silhouette, drawn in a 400×260 local box (top-down),
// wings swept backward like a resting cicada (tent-form), tighter than a moth.
const CicadaSilhouette: React.FC<{
  opacity: number;
  color: string;
  eye: string;
}> = ({ opacity, color, eye }) => {
  return (
    <g opacity={opacity} transform="translate(0,0)">
      {/* Left forewing — long, tapered, swept back-down */}
      <path
        d="M 198 95
           C 155 92, 100 115, 60 175
           C 45 200, 55 215, 90 218
           C 135 218, 175 175, 200 140
           Z"
        fill={color}
        opacity={0.92}
      />
      {/* Right forewing — mirrored */}
      <path
        d="M 202 95
           C 245 92, 300 115, 340 175
           C 355 200, 345 215, 310 218
           C 265 218, 225 175, 200 140
           Z"
        fill={color}
        opacity={0.92}
      />
      {/* Prominent amber wing venation — the diagnostic cicada wing */}
      <g stroke={AMBER} strokeWidth={1.4} fill="none" opacity={0.85}>
        {/* Left wing veins */}
        <path d="M 198 100 C 165 105, 120 130, 80 190" />
        <path d="M 195 115 C 155 125, 115 155, 95 200" />
        <path d="M 190 128 C 155 140, 120 175, 110 208" />
        <path d="M 195 100 Q 155 145, 140 205" opacity={0.55} />
        {/* Right wing veins */}
        <path d="M 202 100 C 235 105, 280 130, 320 190" />
        <path d="M 205 115 C 245 125, 285 155, 305 200" />
        <path d="M 210 128 C 245 140, 280 175, 290 208" />
        <path d="M 205 100 Q 245 145, 260 205" opacity={0.55} />
      </g>
      {/* Thorax */}
      <ellipse cx={200} cy={108} rx={22} ry={32} fill={color} />
      {/* Abdomen — tapered, showing under the tent of wings */}
      <path
        d="M 182 130
           C 184 175, 192 220, 200 240
           C 208 220, 216 175, 218 130
           Z"
        fill={color}
      />
      {/* Segmentation bands */}
      <g stroke={INK} strokeWidth={1.6} fill="none" opacity={0.65}>
        <path d="M 186 152 Q 200 162 214 152" />
        <path d="M 188 175 Q 200 184 212 175" />
        <path d="M 191 196 Q 200 204 209 196" />
        <path d="M 194 215 Q 200 220 206 215" />
      </g>
      {/* Head — squarer than a moth's */}
      <path
        d="M 178 74
           Q 200 60, 222 74
           Q 222 94, 200 92
           Q 178 94, 178 74 Z"
        fill={color}
      />
      {/* Compound eyes — the diagnostic Magicicada red, set wide */}
      <circle cx={182} cy={76} r={8} fill={eye} />
      <circle cx={218} cy={76} r={8} fill={eye} />
      <circle cx={180} cy={73} r={2.2} fill="#F7E9C6" opacity={0.9} />
      <circle cx={216} cy={73} r={2.2} fill="#F7E9C6" opacity={0.9} />
      {/* Short antennae */}
      <path
        d="M 190 62 Q 186 54 182 50"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 210 62 Q 214 54 218 50"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 17 years tally in the first ~2.4s, primes glow, then 17 releases the
  // hero glyph + cicada + hook. Loop cleanly at the end.
  const startupPad = fps * 0.35;
  const tallyStart = startupPad;
  const tallyDur = fps * 2.4;
  const perTick = tallyDur / YEARS.length; // ~4.2 frames per year at 30fps
  const releaseFrame = tallyStart + tallyDur + fps * 0.15;

  // Small helpers
  const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  // Metadata band and role tag arrivals
  const metaOpacity = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Hero glyph & cicada release
  const releaseT = clamp((frame - releaseFrame) / (fps * 0.9));
  const releaseEase = 1 - Math.pow(1 - releaseT, 3);
  const heroSpring = spring({
    frame: frame - releaseFrame,
    fps,
    config: { damping: 200, mass: 0.9, stiffness: 90 },
  });

  // Hook and role text
  const roleOpacity = interpolate(
    frame,
    [releaseFrame + fps * 0.15, releaseFrame + fps * 0.9],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const titleOpacity = interpolate(
    frame,
    [releaseFrame + fps * 0.35, releaseFrame + fps * 1.1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const hookOpacity = interpolate(
    frame,
    [releaseFrame + fps * 0.7, releaseFrame + fps * 1.5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Ground line / soil glow bloom
  const groundGlow = interpolate(
    frame,
    [releaseFrame, releaseFrame + fps * 0.9],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Layout constants (1080 × 1350 portrait)
  const W = 1080;
  const H = 1350;

  // Left rail
  const RAIL_X = 108;
  const RAIL_TOP = 210;
  const RAIL_BOT = 900;
  const RAIL_SPAN = RAIL_BOT - RAIL_TOP;
  const YEAR_STEP = RAIL_SPAN / (YEARS.length - 1);

  // Hero glyph
  const HERO_CX = 700;
  const HERO_CY = 540;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Subtle radial vignette on background */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="bg-vignette" cx="65%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#131722" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>
          <radialGradient id="soil-glow" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.55} />
            <stop offset="60%" stopColor={EYE} stopOpacity={0.15} />
            <stop offset="100%" stopColor={INK} stopOpacity={0} />
          </radialGradient>
          <filter
            id="amber-glow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id="hero-glow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EYE} />
            <stop offset="100%" stopColor="#8A2312" />
          </linearGradient>
          <clipPath id="hero-clip">
            <path d="M 380 220 L 1020 220 L 1020 900 L 380 900 Z" />
          </clipPath>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill="url(#bg-vignette)" />

        {/* Faint horizontal ground line (soil surface) */}
        <line
          x1={80}
          y1={912}
          x2={1000}
          y2={912}
          stroke={OLIVE}
          strokeOpacity={0.55}
          strokeWidth={1}
        />
        {/* Ground-line ticks (hatching, right of the rail) */}
        <g stroke={OLIVE} strokeOpacity={0.35} strokeWidth={1}>
          {Array.from({ length: 40 }, (_, i) => (
            <line
              key={i}
              x1={80 + i * 23}
              y1={912}
              x2={80 + i * 23 - 8}
              y2={922}
            />
          ))}
        </g>

        {/* Soil glow that rises on release */}
        <rect
          x={0}
          y={720}
          width={W}
          height={220}
          fill="url(#soil-glow)"
          opacity={groundGlow}
        />

        {/* ── Left rail: 17 year ticks ─────────────────────────────── */}
        {/* Rail spine */}
        <line
          x1={RAIL_X}
          y1={RAIL_TOP - 8}
          x2={RAIL_X}
          y2={RAIL_BOT + 8}
          stroke={OLIVE}
          strokeOpacity={0.7}
          strokeWidth={1}
        />
        {/* Rail label */}
        <text
          x={RAIL_X - 14}
          y={RAIL_TOP - 34}
          fill={OLIVE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.2}
          fontWeight={600}
          textAnchor="start"
        >
          YEARS UNDERGROUND
        </text>

        {YEARS.map((n) => {
          const y = RAIL_TOP + (n - 1) * YEAR_STEP;
          const arriveFrame = tallyStart + (n - 1) * perTick;
          const arrive = clamp((frame - arriveFrame) / (perTick * 1.6));
          const arriveEase = 1 - Math.pow(1 - arrive, 3);
          const isPrime = PRIMES.has(n);
          const is17 = n === 17;
          const active = arrive > 0.01;
          const tickLen = isPrime ? 34 : 22;
          const stroke = isPrime ? AMBER : OLIVE;
          const strokeOp = active ? (isPrime ? 0.95 : 0.55) : 0;
          const tickX2 = RAIL_X + tickLen * arriveEase;

          // Prime flash — quick pulse when the tick arrives
          const flashT = clamp(
            (frame - arriveFrame) / (perTick * 1.2),
            0,
            1,
          );
          const flashOp = isPrime
            ? (1 - Math.pow(1 - flashT, 2)) * (1 - flashT) * 0.9
            : 0;

          return (
            <g key={n}>
              {isPrime && (
                <circle
                  cx={RAIL_X}
                  cy={y}
                  r={12 + flashT * 10}
                  fill={is17 ? EYE : AMBER}
                  opacity={flashOp * (is17 ? 1.1 : 0.6)}
                  filter="url(#amber-glow)"
                />
              )}
              <line
                x1={RAIL_X}
                y1={y}
                x2={tickX2}
                y2={y}
                stroke={stroke}
                strokeOpacity={strokeOp}
                strokeWidth={isPrime ? 2.4 : 1.5}
                strokeLinecap="round"
              />
              {/* Year number to the right of long primes only */}
              {isPrime && (
                <text
                  x={tickX2 + 10}
                  y={y + 4}
                  fill={is17 ? EYE : AMBER}
                  fontFamily={inter}
                  fontSize={is17 ? 18 : 15}
                  fontWeight={600}
                  letterSpacing={1.5}
                  opacity={arriveEase}
                >
                  {n}
                </text>
              )}
              {/* Node dot on the rail */}
              <circle
                cx={RAIL_X}
                cy={y}
                r={isPrime ? 3.5 : 2}
                fill={isPrime ? (is17 ? EYE : AMBER) : OLIVE}
                opacity={active ? 1 : 0}
              />
            </g>
          );
        })}

        {/* ── Hero glyph: colossal italic 17 ───────────────────────── */}
        <g
          transform={`translate(${HERO_CX}, ${HERO_CY}) scale(${
            0.94 + heroSpring * 0.06
          })`}
          opacity={releaseEase}
          filter="url(#hero-glow)"
        >
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={playfair}
            fontStyle="italic"
            fontWeight={500}
            fontSize={620}
            fill="url(#hero-fill)"
            style={{ letterSpacing: -18 }}
          >
            17
          </text>
        </g>

        {/* Secondary "13" whisper — upper right, clear of the cicada wing */}
        <g
          transform={`translate(985, 190)`}
          opacity={interpolate(
            frame,
            [tallyStart + perTick * 12, tallyStart + perTick * 14],
            [0, 0.65],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )}
        >
          <text
            x={0}
            y={0}
            textAnchor="end"
            dominantBaseline="middle"
            fontFamily={playfair}
            fontStyle="italic"
            fontWeight={500}
            fontSize={78}
            fill={AMBER}
            style={{ letterSpacing: -2 }}
          >
            13
          </text>
          <text
            x={-4}
            y={46}
            textAnchor="end"
            fontFamily={inter}
            fontSize={9.5}
            fill={AMBER}
            fontWeight={600}
            letterSpacing={2.6}
            opacity={0.9}
          >
            SOUTHERN BROOD
          </text>
        </g>
      </svg>

      {/* ── Cicada silhouette perched on top of the hero glyph ──── */}
      <div
        style={{
          position: "absolute",
          left: HERO_CX - 200,
          top: HERO_CY - 100,
          width: 400,
          height: 260,
          opacity: releaseEase,
          transform: `translateY(${(1 - heroSpring) * 40}px)`,
        }}
      >
        <svg width={400} height={260} viewBox="0 0 400 260">
          <CicadaSilhouette
            opacity={1}
            color={CREAM}
            eye={EYE}
          />
        </svg>
      </div>

      {/* ── Top metadata band ─────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 62,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: OLIVE,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 09 · 23</span>
      </div>

      {/* Little horizontal rule under metadata */}
      <div
        style={{
          position: "absolute",
          top: 96,
          left: 80,
          width: 60,
          height: 1,
          backgroundColor: AMBER,
          opacity: metaOpacity * 0.7,
        }}
      />

      {/* ── Type block (lower-left, asymmetric) ─────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 970,
          right: 80,
          color: CREAM,
        }}
      >
        {/* Role tag */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 5.5,
            color: AMBER,
            fontWeight: 600,
            textTransform: "uppercase",
            opacity: roleOpacity,
          }}
        >
          Magicicada &nbsp;·&nbsp; Cryptographer
        </div>

        {/* Display title */}
        <div
          style={{
            fontFamily: playfair,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 108,
            lineHeight: 1.02,
            color: CREAM,
            marginTop: 18,
            letterSpacing: -1.5,
            opacity: titleOpacity,
            transform: `translateY(${(1 - titleOpacity) * 12}px)`,
          }}
        >
          Coded in Primes.
        </div>

        {/* Hook line */}
        <div
          style={{
            fontFamily: inter,
            fontWeight: 400,
            fontSize: 22,
            lineHeight: 1.42,
            color: CREAM,
            marginTop: 30,
            maxWidth: 820,
            opacity: hookOpacity,
            transform: `translateY(${(1 - hookOpacity) * 10}px)`,
          }}
        >
          Periodical cicadas spend&nbsp;
          <span style={{ color: AMBER, fontWeight: 500 }}>13</span>
          &nbsp;or&nbsp;
          <span style={{ color: EYE, fontWeight: 500 }}>17</span>
          &nbsp;years underground — both prime, so no short-cycle predator
          ever locks onto the brood.
        </div>
      </div>

      {/* ── Footer signature ─────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 44,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: OLIVE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3.5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity * 0.85,
        }}
      >
        <span>Brood X · Magicicada septendecim</span>
        <span>The Prime Cipher</span>
      </div>
    </AbsoluteFill>
  );
};
