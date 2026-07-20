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

// Palette — from the visual brief
const INK = "#1A1613";
const INK_DEEP = "#120F0C";
const PARCHMENT = "#F2E4CE";
const PARCHMENT_DIM = "#D9C9AF";
const BRASS = "#B0863C";
const HEART = "#7A3A2A";
const HEART_DEEP = "#5A2A1E";
const WOOD_GRAY = "#8E8676";
const GRAY_DIM = "#645E54";

// Disc geometry (SVG coord space 1080 × 1350)
const CX = 720;
const CY = 500;
const R_PITH = 3.5;
const R_OUTER = 302;

// The tree's age: 4,855 years (Methuselah, dated as of ~2023 by Schulman/Harlan cross-dating).
// Ring 0 = pith (2833 BCE); ring 48 = outer edge (2026 CE); ~100 years per drawn ring.
const N_RINGS = 48;

// Deterministic pseudo-random from a string seed (0..1).
const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

// Marker events pinned to specific years since germination (0 = 2833 BCE).
type Marker = {
  key: string;
  year: string;
  event: string;
  yearsFromPith: number; // 0..4855
  tabY: number; // vertical position of the index card
  dyAtAnchor: number; // small vertical offset so leader tip clears an adjacent ring
};
const MARKERS: Marker[] = [
  {
    key: "germ",
    year: "2833 BCE",
    event: "Germination",
    yearsFromPith: 0,
    tabY: 178,
    dyAtAnchor: -2,
  },
  {
    key: "pyr",
    year: "2560 BCE",
    event: "Great Pyramid of Giza",
    yearsFromPith: 273,
    tabY: 300,
    dyAtAnchor: 6,
  },
  {
    key: "ce",
    year: "1 CE",
    event: "Common Era begins",
    yearsFromPith: 2833,
    tabY: 460,
    dyAtAnchor: 22,
  },
  {
    key: "now",
    year: "2026 CE",
    event: "You are here",
    yearsFromPith: 4858, // matches outer edge
    tabY: 618,
    dyAtAnchor: -32,
  },
];

// Convert years-from-pith to a radial anchor on the disc.
const anchorRadius = (yearsFromPith: number): number =>
  R_PITH + (yearsFromPith / 4855) * (R_OUTER - R_PITH);

// Each marker gets a fixed anchor direction (angle from centre, west-ish).
// Kept in one place so the leaders fan cleanly to the left.
const MARKER_ANGLES: Record<string, number> = {
  germ: 210, // near-pith, so angle mostly ignored
  pyr: 200,
  ce: 165,
  now: 178,
};

const anchorPoint = (m: Marker) => {
  const r = anchorRadius(m.yearsFromPith);
  const th = (MARKER_ANGLES[m.key] * Math.PI) / 180;
  // Standard math angle, y-flipped for SVG.
  const x = CX + Math.cos(th) * r;
  const y = CY - Math.sin(th) * r + m.dyAtAnchor;
  return { x, y };
};

export const BristleconeArchive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Disc inscribes outward: 0..2.5s.
  const inscribeSpan = fps * 2.5;
  const inscribeProgress = Math.max(0, Math.min(1, frame / inscribeSpan));
  const inscribeEased = 1 - Math.pow(1 - inscribeProgress, 2.5);
  const discRadius = 6 + inscribeEased * (R_OUTER + 12);

  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Each marker fades in after the disc has passed its ring.
  const markerAlpha = (m: Marker) => {
    const rTarget = anchorRadius(m.yearsFromPith);
    const rProgress = (rTarget - 6) / R_OUTER;
    const startFrame = rProgress * inscribeSpan + fps * 0.15;
    return interpolate(frame, [startFrame, startFrame + fps * 0.6], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  // Subtle pulse on the "you are here" outer dot.
  const nowPulse = 0.7 + 0.3 * Math.sin((frame / fps) * 1.8);

  // Frame of the drafting field
  const FRAME = { x: 60, y: 130, w: 960, h: 740 };

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
          color: WOOD_GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: BRASS }}>2026 · 07 · 20</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Warm parchment on the specimen face */}
          <radialGradient id="disc-face" cx="45%" cy="42%" r="65%">
            <stop offset="0%" stopColor={PARCHMENT} />
            <stop offset="60%" stopColor="#E1CDAF" />
            <stop offset="100%" stopColor="#9E8867" />
          </radialGradient>

          {/* Deep vignette at the disc rim */}
          <radialGradient id="disc-rim" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </radialGradient>

          {/* Warm pith glow */}
          <radialGradient id="pith-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HEART} stopOpacity={0.9} />
            <stop offset="100%" stopColor={HEART} stopOpacity={0} />
          </radialGradient>

          {/* Growing clip that reveals the disc outward */}
          <clipPath id="growing-disc">
            <circle cx={CX} cy={CY} r={discRadius} />
          </clipPath>

          {/* Wood-fibre streaks — extremely faint radial noise */}
          <pattern
            id="fibre"
            x="0"
            y="0"
            width="2.4"
            height="2.4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(0)"
          >
            <rect width="2.4" height="2.4" fill="rgba(0,0,0,0)" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="2.4"
              stroke={HEART_DEEP}
              strokeOpacity="0.06"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>

        {/* Faint drafting frame */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill={INK_DEEP}
        />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2A241D"
          strokeWidth={1}
        />
        {/* Corner crop marks in brass */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={BRASS} strokeWidth={1.3} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Specimen stamp — bottom-right, inside the drafting frame, well clear of the disc's east edge */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 28}, ${FRAME.y + FRAME.h - 42})`}
          fill={BRASS}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={600}
          textAnchor="end"
        >
          <text>SPEC. WPN-114</text>
          <text y={20} fill={WOOD_GRAY} fontWeight={500}>
            LAB. TREE-RING RESEARCH · UA
          </text>
        </g>

        {/* Disc plate: subtle deep-shadow halo behind the specimen */}
        <circle
          cx={CX + 4}
          cy={CY + 6}
          r={R_OUTER + 24}
          fill="rgba(0,0,0,0.35)"
          opacity={interpolate(frame, [0, 30], [0, 1], {
            extrapolateRight: "clamp",
          })}
        />

        {/* The specimen: everything clipped to the growing disc */}
        <g clipPath="url(#growing-disc)">
          {/* Wood face */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="url(#disc-face)" />
          {/* Fibre texture */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="url(#fibre)" opacity={0.5} />

          {/* Annual rings */}
          {Array.from({ length: N_RINGS }).map((_, i) => {
            const t = i / (N_RINGS - 1);
            const r = R_PITH + t * (R_OUTER - R_PITH);
            const seed = hashSeed(`ring-${i}`);
            // Rings are darker/thicker near the pith, thinner outward.
            const isCentury = i % 5 === 0 && i > 0;
            const baseW = 1.05 + seed * 0.7 + (1 - t) * 0.5;
            const w = isCentury ? baseW + 0.55 : baseW;
            // Colour bounces gently between heartwood and gray.
            const mix = 0.4 + seed * 0.5;
            const stroke = i < 3
              ? HEART_DEEP
              : i < 10
                ? HEART
                : mix > 0.7
                  ? "#6B3220"
                  : "#4B2418";
            return (
              <circle
                key={`ring-${i}`}
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke={stroke}
                strokeOpacity={0.55 + seed * 0.25}
                strokeWidth={w}
              />
            );
          })}

          {/* Radial hairline (a "crack" you often see on cored discs) */}
          <line
            x1={CX}
            y1={CY}
            x2={CX + R_OUTER * Math.cos((-72 * Math.PI) / 180)}
            y2={CY + R_OUTER * Math.sin((-72 * Math.PI) / 180)}
            stroke={INK_DEEP}
            strokeOpacity={0.35}
            strokeWidth={1.2}
          />

          {/* Warm centre glow */}
          <circle
            cx={CX}
            cy={CY}
            r={22}
            fill="url(#pith-glow)"
          />

          {/* Pith */}
          <circle cx={CX} cy={CY} r={R_PITH} fill={HEART_DEEP} />

          {/* Rim vignette on top of everything */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="url(#disc-rim)" />
        </g>

        {/* Bark boundary — the outermost living ring — bold, brass-hued, so the
            "You are here" terminus reads as the punchline of the disc. */}
        <circle
          cx={CX}
          cy={CY}
          r={R_OUTER - 1}
          fill="none"
          stroke={BRASS}
          strokeOpacity={0.85}
          strokeWidth={2.2}
          strokeDasharray={2 * Math.PI * (R_OUTER - 1)}
          strokeDashoffset={2 * Math.PI * (R_OUTER - 1) * (1 - inscribeEased)}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R_OUTER + 3}
          fill="none"
          stroke={BRASS}
          strokeOpacity={0.25}
          strokeWidth={0.8}
        />

        {/* Elevation stamp above the disc — replaces the old top-left label */}
        <g
          transform={`translate(${CX + R_OUTER + 22}, ${FRAME.y + 44})`}
          fill={WOOD_GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={600}
          textAnchor="end"
          opacity={interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" })}
        >
          <text>WHITE MTNS · CA</text>
          <text y={20} fill={GRAY_DIM} fontWeight={500}>
            ALT. 3,050 M · N 37°22′
          </text>
        </g>

        {/* Index-card annotations, left of the disc */}
        {MARKERS.map((m) => {
          const anchor = anchorPoint(m);
          const alpha = markerAlpha(m);
          const cardX = 96;
          const cardW = 244;
          const cardH = 66;
          const cardY = m.tabY - cardH / 2;
          const leaderStart = cardX + cardW; // right edge of card
          const isNow = m.key === "now";

          return (
            <g key={m.key} opacity={alpha}>
              {/* Leader line: card edge → anchor point */}
              <line
                x1={leaderStart}
                y1={m.tabY}
                x2={anchor.x - 5}
                y2={anchor.y}
                stroke={isNow ? BRASS : WOOD_GRAY}
                strokeOpacity={isNow ? 0.95 : 0.75}
                strokeWidth={isNow ? 1.4 : 1}
              />
              {/* Anchor dot on the ring */}
              <circle
                cx={anchor.x}
                cy={anchor.y}
                r={isNow ? 5.5 : 3.2}
                fill={isNow ? BRASS : PARCHMENT}
                stroke={INK}
                strokeWidth={1}
              />
              {isNow && (
                <>
                  <circle
                    cx={anchor.x}
                    cy={anchor.y}
                    r={11}
                    fill="none"
                    stroke={BRASS}
                    strokeOpacity={0.75 * nowPulse}
                    strokeWidth={1.4}
                  />
                  <circle
                    cx={anchor.x}
                    cy={anchor.y}
                    r={18}
                    fill="none"
                    stroke={BRASS}
                    strokeOpacity={0.35 * nowPulse}
                    strokeWidth={1}
                  />
                </>
              )}

              {/* Card */}
              <rect
                x={cardX}
                y={cardY}
                width={cardW}
                height={cardH}
                fill={isNow ? BRASS : INK_DEEP}
                stroke={isNow ? BRASS : WOOD_GRAY}
                strokeOpacity={isNow ? 1 : 0.5}
                strokeWidth={1}
                rx={0}
              />
              {/* Thin brass tab on the card's left edge — filing-cabinet feel */}
              <rect
                x={cardX - 6}
                y={cardY + cardH / 2 - 14}
                width={6}
                height={28}
                fill={isNow ? INK : BRASS}
              />

              <text
                x={cardX + 16}
                y={cardY + 24}
                fill={isNow ? INK_DEEP : BRASS}
                fontFamily={inter}
                fontSize={12}
                fontWeight={600}
                letterSpacing={3.5}
              >
                {m.year.toUpperCase()}
              </text>
              <text
                x={cardX + 16}
                y={cardY + 48}
                fill={isNow ? INK_DEEP : PARCHMENT}
                fontFamily={inter}
                fontSize={15}
                fontWeight={isNow ? 600 : 500}
                letterSpacing={0.3}
              >
                {m.event}
              </text>
            </g>
          );
        })}

        {/* Caption strip under drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={WOOD_GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · CROSS-SECTION · METHUSELAH · 4,855 ANNUAL RINGS</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={BRASS}
            opacity={0.9}
          >
            EACH RING = ONE YEAR
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 925,
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
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDE4D0", letterSpacing: 5 }}>
            Archivist
          </span>
        </div>

        <div
          style={{
            color: "#F4EEDD",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 92,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The living
          <br />
          archive.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#CDC3B0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Cored in California's White Mountains, the Great Basin bristlecone{" "}
          <span
            style={{
              color: BRASS,
              fontFamily: playfair,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 22,
            }}
          >
            Pinus longaeva
          </span>{" "}
          "Methuselah" is roughly 4,855 years old — each of its annual rings a
          datable record of climate, stretching back before the pyramids.
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
          color: WOOD_GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Schulman · Lab. of Tree-Ring Research · U. of Arizona</span>
        <span>
          <span style={{ color: BRASS }}>●</span> One ring = one year
        </span>
      </div>

      {/* Tiny frame counter, bottom-right of the drafting area, for tuning */}
      {false && (
        <div
          style={{
            position: "absolute",
            top: 830,
            right: 80,
            color: WOOD_GRAY,
            fontFamily: inter,
            fontSize: 10,
          }}
        >
          {frame}/{durationInFrames}
        </div>
      )}
    </AbsoluteFill>
  );
};
