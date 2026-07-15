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

// Palette from real Magicicada septendecim coloration
const LOAM = "#0A0806";
const SOIL = "#14100B";
const SOIL_DEEP = "#08060404";
const EYE = "#D93B1E";
const EYE_GLOW = "#F26A4A";
const AMBER = "#E8A83F";
const AMBER_DIM = "#8A6320";
const CREAM = "#F1E3C4";
const BROWN = "#6D4A2A";
const BROWN_DIM = "#3C2A19";
const GRAY = "#7A6E5E";

const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17]);
const isPrime = (n: number): boolean => PRIMES.has(n);

// ────────────────────────────────────────────────────────────
// Cicada icon (adult) — editorial line engraving
// Drawn at native scale ~180px wide, centred at (0,0)
// ────────────────────────────────────────────────────────────
const AdultCicada: React.FC<{ wingsSpread: number }> = ({ wingsSpread }) => {
  // wingsSpread: 0 = folded flat over body, 1 = fully spread ~35deg down
  const wingAngle = 8 + wingsSpread * 28;
  const wingOpacity = 0.55 + wingsSpread * 0.35;

  return (
    <g>
      {/* Legs (6) */}
      <g stroke={BROWN} strokeWidth={1.4} strokeLinecap="round" fill="none">
        <path d="M -8 8  L -22 24  L -18 34" />
        <path d="M 2 10  L -6 28  L 0 38" />
        <path d="M 12 10  L 12 30  L 18 38" />
        <path d="M -8 8  L 6 24  L 2 34" transform="scale(-1,1)" />
        <path d="M 2 10  L -6 28  L 0 38" transform="scale(-1,1)" />
        <path d="M 12 10  L 12 30  L 18 38" transform="scale(-1,1)" />
      </g>

      {/* Wing — right */}
      <g
        opacity={wingOpacity}
        transform={`rotate(${wingAngle}) translate(4, -6)`}
      >
        <path
          d="M 0 0 Q 55 -18 105 -6 Q 118 8 100 26 Q 55 34 12 14 Z"
          fill={AMBER}
          fillOpacity={0.28}
          stroke={AMBER}
          strokeWidth={0.9}
        />
        {/* Wing veins */}
        <g stroke={AMBER} strokeWidth={0.7} fill="none" opacity={0.85}>
          <path d="M 5 2 Q 40 -6 95 4" />
          <path d="M 6 6 Q 45 4 100 14" />
          <path d="M 8 10 Q 50 14 96 22" />
          <path d="M 12 -2 L 90 -4" />
        </g>
      </g>
      {/* Wing — left (mirror) */}
      <g
        opacity={wingOpacity}
        transform={`rotate(${-wingAngle}) translate(-4, -6) scale(-1,1)`}
      >
        <path
          d="M 0 0 Q 55 -18 105 -6 Q 118 8 100 26 Q 55 34 12 14 Z"
          fill={AMBER}
          fillOpacity={0.28}
          stroke={AMBER}
          strokeWidth={0.9}
        />
        <g stroke={AMBER} strokeWidth={0.7} fill="none" opacity={0.85}>
          <path d="M 5 2 Q 40 -6 95 4" />
          <path d="M 6 6 Q 45 4 100 14" />
          <path d="M 8 10 Q 50 14 96 22" />
          <path d="M 12 -2 L 90 -4" />
        </g>
      </g>

      {/* Thorax + abdomen */}
      <ellipse cx={0} cy={12} rx={14} ry={22} fill="#1A130C" stroke={BROWN} strokeWidth={1} />
      {/* Segments */}
      <g stroke={BROWN_DIM} strokeWidth={0.8} fill="none" opacity={0.7}>
        <path d="M -12 18 Q 0 20 12 18" />
        <path d="M -12 24 Q 0 26 12 24" />
        <path d="M -11 30 Q 0 32 11 30" />
      </g>

      {/* Head */}
      <ellipse cx={0} cy={-10} rx={11} ry={9} fill="#0F0A06" stroke={BROWN} strokeWidth={1} />

      {/* Eyes (the iconic red) */}
      <circle cx={-8} cy={-11} r={4.2} fill={EYE} />
      <circle cx={8} cy={-11} r={4.2} fill={EYE} />
      <circle cx={-8} cy={-11} r={4.2} fill="none" stroke={EYE_GLOW} strokeWidth={0.6} opacity={0.9} />
      <circle cx={8} cy={-11} r={4.2} fill="none" stroke={EYE_GLOW} strokeWidth={0.6} opacity={0.9} />
      <circle cx={-8.5} cy={-12} r={1.1} fill={CREAM} opacity={0.4} />
      <circle cx={7.5} cy={-12} r={1.1} fill={CREAM} opacity={0.4} />

      {/* Antennae */}
      <g stroke={BROWN} strokeWidth={0.9} fill="none" strokeLinecap="round">
        <path d="M -5 -18 Q -8 -26 -14 -30" />
        <path d="M 5 -18 Q 8 -26 14 -30" />
      </g>
    </g>
  );
};

// Nymph — chunkier, wingless, curled slightly
const NymphCicada: React.FC = () => (
  <g>
    {/* Legs — stubbier, digging */}
    <g stroke={BROWN_DIM} strokeWidth={1.3} strokeLinecap="round" fill="none">
      <path d="M -6 4 L -18 12 L -14 22" />
      <path d="M -6 4 L -12 20 L -6 26" />
      <path d="M 6 4 L 18 12 L 14 22" />
      <path d="M 6 4 L 12 20 L 6 26" />
    </g>
    {/* Body — squat oval, curled forward */}
    <path
      d="M -12 -6 Q -14 12 -6 20 Q 6 22 12 12 Q 14 -6 6 -12 Q -6 -14 -12 -6 Z"
      fill="#241812"
      stroke={BROWN}
      strokeWidth={1}
    />
    {/* Segmentation */}
    <g stroke={BROWN_DIM} strokeWidth={0.6} fill="none" opacity={0.7}>
      <path d="M -10 0 Q 0 3 10 0" />
      <path d="M -10 6 Q 0 9 10 6" />
      <path d="M -8 12 Q 0 15 8 12" />
    </g>
    {/* Head + small eye dots */}
    <ellipse cx={0} cy={-10} rx={8} ry={6} fill="#1A100A" stroke={BROWN} strokeWidth={0.9} />
    <circle cx={-4} cy={-11} r={1.4} fill={EYE} opacity={0.6} />
    <circle cx={4} cy={-11} r={1.4} fill={EYE} opacity={0.6} />
    {/* Digging claws — hint */}
    <path d="M -14 12 L -20 8" stroke={BROWN} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    <path d="M 14 12 L 20 8" stroke={BROWN} strokeWidth={1.2} fill="none" strokeLinecap="round" />
  </g>
);

export const CicadaCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Year progression: 0 → 17 over ~4.2s, spring-eased ──
  const totalYearFrames = fps * 4.2;
  const yearProgress = spring({
    frame,
    fps,
    config: { damping: 60, mass: 3.2, stiffness: 40 },
    durationInFrames: Math.round(totalYearFrames),
  });
  const currentYearF = yearProgress * 17; // fractional

  // Title spring
  const titleSpring = spring({
    frame: frame - fps * 0.15,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.6, fps * 2.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const roleOpacity = interpolate(frame, [fps * 0.1, fps * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Emergence — happens as year crosses 17
  const emergence = Math.max(0, Math.min(1, (currentYearF - 16.4) / 0.6));
  // Wing unfurl continues a beat after emergence
  const wingUnfurl = Math.max(
    0,
    Math.min(1, (currentYearF - 16.8) / 0.6),
  );

  // Terminal pulse on primes once we've settled
  const settled = currentYearF > 16.95 ? 1 : 0;
  const pulsePhase = ((frame - fps * 5) / (fps * 2.4)) * Math.PI * 2;
  const primePulse = settled * (0.5 + 0.5 * Math.sin(pulsePhase));

  // ── Layout constants (1080 × 1350 portrait) ──────────────
  const FRAME = { x: 60, y: 132, w: 960, h: 730 };
  const SURFACE_Y = FRAME.y + 76;
  const BOTTOM_Y = FRAME.y + FRAME.h - 40;

  // Number-column geometry
  const COL_X = FRAME.x + 210; // centre of the year numbers
  const HERO_Y = SURFACE_Y - 22; // year 17 sits ABOVE the surface line
  const NUM_TOP = SURFACE_Y + 110; // year 16 row centre (below headers)
  const NUM_BOT = BOTTOM_Y - 24;  // year 1 row centre
  const yFor = (year: number) =>
    year === 17
      ? HERO_Y
      : NUM_TOP + ((16 - year) / 15) * (NUM_BOT - NUM_TOP);

  // Cicada column X (right side)
  const CIC_X = FRAME.x + 780;
  // Middle-column arithmetic callout X
  const MID_X = FRAME.x + 505;

  return (
    <AbsoluteFill style={{ backgroundColor: LOAM, fontFamily: inter }}>
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
        <span style={{ color: AMBER }}>2026 · 07 · 15</span>
      </div>

      {/* Illustration frame */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="soil-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F0B08" />
            <stop offset="20%" stopColor="#120D08" />
            <stop offset="100%" stopColor="#080604" />
          </linearGradient>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E0A06" />
            <stop offset="100%" stopColor="#161009" />
          </linearGradient>
          <radialGradient id="eye-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EYE} stopOpacity={0.55} />
            <stop offset="100%" stopColor={EYE} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="emerge-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
          <pattern
            id="soil-tex"
            x={0}
            y={0}
            width={9}
            height={9}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={2} cy={3} r={0.4} fill={BROWN_DIM} opacity={0.6} />
            <circle cx={6} cy={7} r={0.3} fill={BROWN_DIM} opacity={0.5} />
          </pattern>
        </defs>

        {/* Sky (thin band above surface) */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={SURFACE_Y - FRAME.y}
          fill="url(#sky-grad)"
        />

        {/* Soil column (main) */}
        <rect
          x={FRAME.x}
          y={SURFACE_Y}
          width={FRAME.w}
          height={FRAME.y + FRAME.h - SURFACE_Y}
          fill="url(#soil-grad)"
        />
        <rect
          x={FRAME.x}
          y={SURFACE_Y}
          width={FRAME.w}
          height={FRAME.y + FRAME.h - SURFACE_Y}
          fill="url(#soil-tex)"
        />

        {/* Surface line — earth horizon */}
        <line
          x1={FRAME.x}
          y1={SURFACE_Y}
          x2={FRAME.x + FRAME.w}
          y2={SURFACE_Y}
          stroke={BROWN}
          strokeWidth={1.4}
          opacity={0.75}
        />
        <line
          x1={FRAME.x}
          y1={SURFACE_Y + 3}
          x2={FRAME.x + FRAME.w}
          y2={SURFACE_Y + 3}
          stroke={BROWN_DIM}
          strokeWidth={0.6}
          opacity={0.5}
          strokeDasharray="6 8"
        />

        {/* Inner frame border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#241A10"
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
          <g key={i} stroke={AMBER} strokeWidth={1.4} fill="none" opacity={0.9}>
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Above-ground / below-ground labels near horizon */}
        <g fontFamily={inter} fontSize={10} letterSpacing={3.6} fontWeight={500} fill={GRAY}>
          <text x={FRAME.x + 16} y={SURFACE_Y - 14}>ABOVE · SURFACE</text>
          <text x={FRAME.x + 16} y={SURFACE_Y + 22}>
            BELOW · SUBTERRANEAN
          </text>
        </g>

        {/* Two vertical rules — bracket the middle callout column */}
        <line
          x1={FRAME.x + 400}
          y1={SURFACE_Y + 70}
          x2={FRAME.x + 400}
          y2={BOTTOM_Y + 10}
          stroke={BROWN}
          strokeWidth={1}
          opacity={0.65}
        />
        <line
          x1={FRAME.x + 620}
          y1={SURFACE_Y + 70}
          x2={FRAME.x + 620}
          y2={BOTTOM_Y + 10}
          stroke={BROWN}
          strokeWidth={1}
          opacity={0.65}
        />

        {/* Column header (over the number column) */}
        <g
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.6}
          fontWeight={500}
          fill={GRAY}
          opacity={roleOpacity}
        >
          <text x={COL_X - 108} y={SURFACE_Y + 52}>YEAR · N</text>
          <text x={COL_X + 128} y={SURFACE_Y + 52} textAnchor="end">
            PRIME?
          </text>
        </g>
        <line
          x1={COL_X - 110}
          y1={SURFACE_Y + 60}
          x2={COL_X + 130}
          y2={SURFACE_Y + 60}
          stroke={BROWN_DIM}
          strokeWidth={0.8}
          opacity={0.7 * roleOpacity}
        />

        {/* ── Year rows ─────────────────────────────────────── */}
        {Array.from({ length: 17 }, (_, i) => 17 - i).map((year) => {
          const y = yFor(year);
          const passed = currentYearF >= year - 0.05;
          const active = currentYearF >= year - 0.4;
          const prime = isPrime(year);
          const isHero = year === 17;

          // Reveal easing per row
          const reveal = interpolate(currentYearF, [year - 0.6, year + 0.05], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Row visual states
          const numColor = isHero
            ? AMBER
            : prime
              ? EYE
              : passed
                ? CREAM
                : BROWN;
          const numOpacity = isHero
            ? 0.55 + 0.45 * reveal
            : passed
              ? 1
              : 0.55;
          const numSize = isHero ? 56 : prime ? 28 : 24;
          const numWeight = isHero ? 500 : prime ? 600 : 400;
          const numFont = isHero ? playfair : inter;

          const rowGlow =
            prime && passed
              ? 0.35 + 0.25 * (isHero ? 0 : primePulse)
              : 0;
          const heroGlow =
            isHero && passed
              ? 0.35 + 0.25 * primePulse
              : 0;

          const tagX = COL_X + 128;
          return (
            <g key={year} opacity={active ? 1 : 0.35}>
              {/* Row rule (short tick on left) — skip for hero (it sits above surface) */}
              {!isHero && (
                <line
                  x1={COL_X - 108}
                  y1={y}
                  x2={COL_X - 88}
                  y2={y}
                  stroke={passed ? BROWN : BROWN_DIM}
                  strokeWidth={0.8}
                  opacity={0.9}
                />
              )}

              {/* Halo behind prime */}
              {(rowGlow > 0 || heroGlow > 0) && (
                <circle
                  cx={COL_X}
                  cy={y - (isHero ? 4 : 6)}
                  r={isHero ? 76 : 26}
                  fill={isHero ? "url(#emerge-glow)" : "url(#eye-glow)"}
                  opacity={isHero ? heroGlow : rowGlow}
                />
              )}

              {/* Year number */}
              <text
                x={COL_X}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily={numFont}
                fontSize={numSize}
                fontWeight={numWeight}
                fill={numColor}
                opacity={numOpacity}
                fontStyle={isHero ? "italic" : "normal"}
                letterSpacing={isHero ? -2 : 0.5}
              >
                {year}
              </text>

              {/* Right-side prime tag — hero gets a wider offset */}
              {isHero ? (
                <g
                  opacity={numOpacity}
                  transform={`translate(${COL_X + 62}, ${y + 4})`}
                >
                  <text
                    x={0}
                    y={-6}
                    fontFamily={inter}
                    fontSize={11}
                    letterSpacing={4}
                    fontWeight={600}
                    fill={AMBER}
                  >
                    PRIME · EMERGENCE
                  </text>
                  <text
                    x={0}
                    y={14}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={3}
                    fontWeight={500}
                    fill={GRAY}
                  >
                    17 YEARS UNDERGROUND
                  </text>
                </g>
              ) : (
                <text
                  x={tagX}
                  y={y + 4}
                  textAnchor="end"
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={3.2}
                  fontWeight={500}
                  fill={prime ? EYE : BROWN_DIM}
                  opacity={passed ? 0.95 : 0.4}
                >
                  {prime ? "PRIME" : "—"}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Middle callout: the prime-brood arithmetic ─────── */}
        <g
          opacity={interpolate(currentYearF, [11, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
          transform={`translate(${MID_X}, ${SURFACE_Y + 220})`}
        >
          <text
            x={0}
            y={0}
            textAnchor="middle"
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.6}
            fontWeight={500}
            fill={GRAY}
          >
            PRIME BROODS
          </text>
          <text
            x={0}
            y={80}
            textAnchor="middle"
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={72}
            fontWeight={500}
            fill={EYE}
            letterSpacing={-1}
          >
            13
          </text>
          <text
            x={0}
            y={132}
            textAnchor="middle"
            fontFamily={inter}
            fontSize={22}
            fontWeight={400}
            fill={BROWN}
          >
            ×
          </text>
          <text
            x={0}
            y={200}
            textAnchor="middle"
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={72}
            fontWeight={500}
            fill={AMBER}
            letterSpacing={-1}
          >
            17
          </text>
          <line
            x1={-46}
            y1={228}
            x2={46}
            y2={228}
            stroke={BROWN}
            strokeWidth={0.9}
            opacity={0.9}
          />
          <text
            x={0}
            y={266}
            textAnchor="middle"
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.6}
            fontWeight={500}
            fill={GRAY}
          >
            COEMERGE EVERY
          </text>
          <text
            x={0}
            y={318}
            textAnchor="middle"
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={54}
            fontWeight={500}
            fill={CREAM}
            letterSpacing={-0.6}
          >
            221 YR
          </text>
        </g>

        {/* Downward arrow at bottom of column — "waiting" */}
        <g
          opacity={interpolate(currentYearF, [0.5, 2], [0, 0.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          <line
            x1={COL_X}
            y1={NUM_BOT + 26}
            x2={COL_X}
            y2={NUM_BOT + 60}
            stroke={BROWN}
            strokeWidth={1.2}
          />
          <polygon
            points={`${COL_X - 4},${NUM_BOT + 56} ${COL_X + 4},${NUM_BOT + 56} ${COL_X},${NUM_BOT + 64}`}
            fill={BROWN}
          />
        </g>

        {/* ── Right column: soil-depth axis to the far right ─── */}
        <g stroke={BROWN} strokeWidth={0.8} opacity={0.55}>
          {[0.08, 0.28, 0.5, 0.72, 0.94].map((f, i) => {
            const y = SURFACE_Y + (BOTTOM_Y - SURFACE_Y) * f;
            return (
              <line
                key={i}
                x1={FRAME.x + FRAME.w - 60}
                y1={y}
                x2={FRAME.x + FRAME.w - 42}
                y2={y}
              />
            );
          })}
          {/* axis line */}
          <line
            x1={FRAME.x + FRAME.w - 42}
            y1={SURFACE_Y + (BOTTOM_Y - SURFACE_Y) * 0.08}
            x2={FRAME.x + FRAME.w - 42}
            y2={SURFACE_Y + (BOTTOM_Y - SURFACE_Y) * 0.94}
          />
        </g>
        <text
          x={FRAME.x + FRAME.w - 36}
          y={SURFACE_Y + (BOTTOM_Y - SURFACE_Y) * 0.08 + 4}
          fontFamily={inter}
          fontSize={9}
          letterSpacing={3}
          fill={GRAY}
          opacity={0.7}
        >
          0
        </text>
        <text
          x={FRAME.x + FRAME.w - 36}
          y={SURFACE_Y + (BOTTOM_Y - SURFACE_Y) * 0.94 + 4}
          fontFamily={inter}
          fontSize={9}
          letterSpacing={3}
          fill={GRAY}
          opacity={0.7}
        >
          −45 CM
        </text>
        <text
          x={FRAME.x + FRAME.w - 26}
          y={SURFACE_Y + (BOTTOM_Y - SURFACE_Y) * 0.5}
          fontFamily={inter}
          fontSize={9}
          letterSpacing={4}
          fill={GRAY}
          opacity={0.55}
          transform={`rotate(90, ${FRAME.x + FRAME.w - 26}, ${SURFACE_Y + (BOTTOM_Y - SURFACE_Y) * 0.5})`}
        >
          DEPTH
        </text>

        {/* Nymph — deep underground, always visible, fades on emerge */}
        <g
          transform={`translate(${CIC_X - 30}, ${BOTTOM_Y - 90})`}
          opacity={1 - emergence * 0.65}
        >
          <NymphCicada />
          {/* small chamber outline */}
          <ellipse
            cx={0}
            cy={4}
            rx={38}
            ry={30}
            fill="none"
            stroke={BROWN_DIM}
            strokeWidth={0.8}
            strokeDasharray="3 4"
            opacity={0.6}
          />
        </g>

        {/* Tunnel — a faint path from nymph up to surface, revealed as we near emergence */}
        <path
          d={`M ${CIC_X - 30} ${BOTTOM_Y - 90}
              C ${CIC_X - 54} ${BOTTOM_Y - 220},
                ${CIC_X - 12} ${BOTTOM_Y - 380},
                ${CIC_X} ${SURFACE_Y + 10}`}
          stroke={BROWN}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          opacity={interpolate(currentYearF, [12, 16.6], [0, 0.55], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
          strokeDasharray="1 6"
        />

        {/* Emerging shell (exuvia) at the surface — appears just before adult */}
        <g
          transform={`translate(${CIC_X}, ${SURFACE_Y + 22})`}
          opacity={interpolate(currentYearF, [16.55, 16.9], [0, 0.85], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          <path
            d="M -12 -4 Q -14 8 -6 14 Q 6 16 12 8 Q 14 -4 6 -10 Q -6 -12 -12 -4 Z"
            fill="none"
            stroke={BROWN}
            strokeWidth={1}
            opacity={0.85}
          />
          <path
            d="M 0 -10 L 0 -2"
            stroke={BROWN}
            strokeWidth={0.8}
            opacity={0.9}
          />
        </g>

        {/* Adult cicada — emerges just above the surface at year 17 */}
        {emergence > 0 && (
          <g
            transform={`translate(${CIC_X}, ${
              SURFACE_Y + 32 - emergence * 40
            })`}
            opacity={emergence}
          >
            {/* Ambient glow */}
            <circle cx={0} cy={0} r={110} fill="url(#emerge-glow)" />
            <AdultCicada wingsSpread={wingUnfurl} />
          </g>
        )}

        {/* Nymph caption — right of the nymph, short so it clears the axis */}
        <g
          transform={`translate(${CIC_X + 60}, ${BOTTOM_Y - 96})`}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
          fill={GRAY}
        >
          <line
            x1={-8}
            y1={-4}
            x2={-40}
            y2={-4}
            stroke={BROWN}
            strokeWidth={0.8}
          />
          <text x={0} y={0}>NYMPH · YR 1–17</text>
          <text x={0} y={16} fill={BROWN}>ROOTS</text>
        </g>

        {/* Adult caption — one clean line below the surface, right of the wing */}
        <g
          transform={`translate(${CIC_X + 88}, ${SURFACE_Y + 66})`}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
          fill={GRAY}
          opacity={interpolate(currentYearF, [16.5, 17], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          <line
            x1={-8}
            y1={-4}
            x2={-52}
            y2={-32}
            stroke={AMBER}
            strokeWidth={0.7}
          />
          <text x={0} y={0} fill={AMBER}>ADULT · YR 17</text>
          <text x={0} y={16} fill={BROWN}>MASS EMERGENCE</text>
        </g>

        {/* Caption strip below the frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>
            FIG. 1 · 17-YEAR NYMPH → SYNCHRONIZED EMERGENCE
          </text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={AMBER}
            opacity={0.9}
          >
            NEXT COEMERGENCE WITH 13-YR BROOD · +221 YR
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 924,
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
            color: AMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
            opacity: roleOpacity,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Prime Number Mathematician
          </span>
        </div>

        <div
          style={{
            color: "#F4EAD1",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The seventeen-year
          <br />
          number theorist.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#D8CFB8",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          <span style={{ color: EYE, fontWeight: 600 }}>
            Magicicada septendecim
          </span>{" "}
          waits underground for exactly 17 years — a prime — before mass-emerging
          in broods. No predator whose population cycles at 2, 3, 4, 5, or 6 years
          can lock into a prime schedule; its 13-year sibling brood overlaps only
          once every {" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>221 years</span>.
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
        <span>Yoshimura · Am. Naturalist 149 (1997) 112–124</span>
        <span>
          <span style={{ color: EYE }}>●</span> Prime year
          <span style={{ margin: "0 10px", color: BROWN }}>·</span>
          <span style={{ color: AMBER }}>●</span> Emergence
        </span>
      </div>

      {/* Silence unused vars in strict TS setups */}
      <div style={{ display: "none" }}>{SOIL}{SOIL_DEEP}{AMBER_DIM}{durationInFrames}</div>
    </AbsoluteFill>
  );
};
