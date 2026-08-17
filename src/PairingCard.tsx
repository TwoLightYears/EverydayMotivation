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

// ── Palette (per concept brief) ───────────────────────────────────────
const INK = "#0B0A08";
const CHALK = "#E9D9B4";
const EYE_RED = "#C81E1E";
const AMBER = "#F2A21C";
const BRONZE = "#5B4A2E";
const SOFT = "#8A7E5F"; // muted chalk (secondary type / grid)

const inter = "Inter, system-ui, sans-serif";
const playfair = "'Playfair Display', Georgia, serif";

const fontCss = `
@font-face {
  font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display'; font-style: normal; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display'; font-style: italic; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2');
}
`;

// ─────────────────────────────────────────────────────────────────────
// A stylised Magicicada rendered as a technical illustration.
// Coords are the local viewBox of the <g>: 500 wide × 620 tall.
// ─────────────────────────────────────────────────────────────────────
const Cicada: React.FC<{ reveal: number }> = ({ reveal }) => {
  // reveal in 0..1: draws body → wings → eyes
  const bodyR = Math.min(1, reveal * 1.6);
  const wingR = Math.min(1, Math.max(0, reveal - 0.35) * 2.0);
  const eyeR = Math.min(1, Math.max(0, reveal - 0.75) * 4.0);

  // Wing venation — hand-authored strokes over each wing.
  // Coordinates are relative to the wing origin.
  const forewingR = (
    <g transform="translate(250 200)">
      {/* Wing membrane */}
      <path
        d="M 0 0 C 40 -55, 180 -65, 245 -30 C 275 -12, 265 30, 220 55 C 165 80, 70 70, 20 40 C 0 28, -8 12, 0 0 Z"
        fill={AMBER}
        fillOpacity={0.14 * wingR}
        stroke={AMBER}
        strokeOpacity={0.9 * wingR}
        strokeWidth={1.6}
      />
      {/* Costal margin — thicker */}
      <path
        d="M 0 0 C 40 -55, 180 -65, 245 -30"
        fill="none"
        stroke={AMBER}
        strokeOpacity={wingR}
        strokeWidth={2.4}
      />
      {/* Radial veins */}
      {[
        "M 12 4 L 235 -22",
        "M 14 12 L 240 -10",
        "M 16 20 L 240 8",
        "M 18 28 L 225 28",
        "M 22 36 L 200 46",
        "M 26 42 L 160 58",
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={AMBER}
          strokeOpacity={0.55 * wingR}
          strokeWidth={1.1}
        />
      ))}
      {/* Cross veins — small ticks */}
      {Array.from({ length: 10 }).map((_, i) => {
        const x = 40 + i * 20;
        const y0 = -18 + (i % 2) * 4;
        return (
          <line
            key={i}
            x1={x}
            y1={y0}
            x2={x + 4}
            y2={y0 + 22}
            stroke={AMBER}
            strokeOpacity={0.45 * wingR}
            strokeWidth={0.9}
          />
        );
      })}
    </g>
  );
  const forewingL = (
    <g transform="translate(250 200) scale(-1 1)">
      <path
        d="M 0 0 C 40 -55, 180 -65, 245 -30 C 275 -12, 265 30, 220 55 C 165 80, 70 70, 20 40 C 0 28, -8 12, 0 0 Z"
        fill={AMBER}
        fillOpacity={0.14 * wingR}
        stroke={AMBER}
        strokeOpacity={0.9 * wingR}
        strokeWidth={1.6}
      />
      <path
        d="M 0 0 C 40 -55, 180 -65, 245 -30"
        fill="none"
        stroke={AMBER}
        strokeOpacity={wingR}
        strokeWidth={2.4}
      />
      {[
        "M 12 4 L 235 -22",
        "M 14 12 L 240 -10",
        "M 16 20 L 240 8",
        "M 18 28 L 225 28",
        "M 22 36 L 200 46",
        "M 26 42 L 160 58",
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={AMBER}
          strokeOpacity={0.55 * wingR}
          strokeWidth={1.1}
        />
      ))}
      {Array.from({ length: 10 }).map((_, i) => {
        const x = 40 + i * 20;
        const y0 = -18 + (i % 2) * 4;
        return (
          <line
            key={i}
            x1={x}
            y1={y0}
            x2={x + 4}
            y2={y0 + 22}
            stroke={AMBER}
            strokeOpacity={0.45 * wingR}
            strokeWidth={0.9}
          />
        );
      })}
    </g>
  );

  // Body — thorax + abdomen + head
  const body = (
    <g opacity={bodyR}>
      {/* Abdomen segments */}
      {Array.from({ length: 7 }).map((_, i) => {
        const cy = 300 + i * 26;
        const w = 44 - i * 4;
        return (
          <g key={i}>
            <ellipse
              cx={250}
              cy={cy}
              rx={w}
              ry={12}
              fill="#151310"
              stroke={BRONZE}
              strokeWidth={1}
            />
            <line
              x1={250 - w + 4}
              y1={cy + 6}
              x2={250 + w - 4}
              y2={cy + 6}
              stroke={BRONZE}
              strokeOpacity={0.55}
              strokeWidth={0.8}
            />
          </g>
        );
      })}
      {/* Thorax */}
      <ellipse
        cx={250}
        cy={230}
        rx={62}
        ry={54}
        fill="#151310"
        stroke={BRONZE}
        strokeWidth={1.4}
      />
      {/* Thorax orange chevron (typical Magicicada marking) */}
      <path
        d="M 210 224 Q 250 200 290 224"
        stroke={AMBER}
        strokeOpacity={0.9}
        strokeWidth={2}
        fill="none"
      />
      <path
        d="M 218 240 Q 250 218 282 240"
        stroke={AMBER}
        strokeOpacity={0.55}
        strokeWidth={1.4}
        fill="none"
      />

      {/* Head */}
      <ellipse
        cx={250}
        cy={160}
        rx={54}
        ry={38}
        fill="#0F0D0B"
        stroke={BRONZE}
        strokeWidth={1.2}
      />
      {/* Antennae */}
      <path
        d="M 240 132 C 232 118, 216 116, 208 106"
        stroke={BRONZE}
        strokeWidth={1.1}
        fill="none"
      />
      <path
        d="M 260 132 C 268 118, 284 116, 292 106"
        stroke={BRONZE}
        strokeWidth={1.1}
        fill="none"
      />
      {/* Legs — three per side, faint */}
      {[0, 1, 2].map((i) => {
        const y = 250 + i * 30;
        return (
          <g key={i} stroke={BRONZE} strokeWidth={1.1} fill="none">
            <path d={`M 208 ${y} L 168 ${y + 22} L 150 ${y + 42}`} />
            <path d={`M 292 ${y} L 332 ${y + 22} L 350 ${y + 42}`} />
          </g>
        );
      })}

      {/* Compound eyes */}
      <g opacity={eyeR}>
        <circle
          cx={218}
          cy={158}
          r={14}
          fill={EYE_RED}
          stroke="#2a0606"
          strokeWidth={1.2}
        />
        <circle cx={214} cy={154} r={3} fill="#ff8a8a" opacity={0.9} />
        <circle
          cx={282}
          cy={158}
          r={14}
          fill={EYE_RED}
          stroke="#2a0606"
          strokeWidth={1.2}
        />
        <circle cx={278} cy={154} r={3} fill="#ff8a8a" opacity={0.9} />
      </g>
    </g>
  );

  return (
    <g>
      {/* Wings behind body */}
      {forewingL}
      {forewingR}
      {body}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────
// The proof: a timeline from year 1..34, six rows.
// Row 0: cicada (period 17)  → 2 ticks (17, 34), red, prominent
// Rows 1..5: predator cycles 2, 3, 4, 5, 6 — ticks in bronze
// ─────────────────────────────────────────────────────────────────────
const YEARS = 34;
const CYCLES: { p: number; label: string }[] = [
  { p: 2, label: "PREDATOR · 2-YR CYCLE" },
  { p: 3, label: "PREDATOR · 3-YR CYCLE" },
  { p: 4, label: "PREDATOR · 4-YR CYCLE" },
  { p: 5, label: "PREDATOR · 5-YR CYCLE" },
  { p: 6, label: "PREDATOR · 6-YR CYCLE" },
];

const ProofSheet: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  cursor: number; // 0..1 — year cursor position
}> = ({ x, y, w, h, cursor }) => {
  const rowH = h / (CYCLES.length + 1); // +1 for the cicada row
  const leftPad = 200; // reserve for row labels
  const rightPad = 20;
  const trackW = w - leftPad - rightPad;
  const yearX = (yr: number) => leftPad + (yr / YEARS) * trackW;
  const cursorYear = cursor * YEARS;
  const cursorX = leftPad + cursor * trackW;

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Frame */}
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill="none"
        stroke={BRONZE}
        strokeOpacity={0.55}
        strokeWidth={1}
      />

      {/* Column header — year numerals */}
      <g
        fill={SOFT}
        fontFamily={inter}
        fontSize={11}
        letterSpacing={2}
        fontWeight={500}
      >
        {Array.from({ length: YEARS }, (_, i) => i + 1).map((yr) => {
          const isMajor = yr % 5 === 0 || yr === 17 || yr === 34 || yr === 1;
          if (!isMajor) return null;
          const isKey = yr === 17 || yr === 34;
          return (
            <text
              key={yr}
              x={yearX(yr)}
              y={-8}
              textAnchor="middle"
              fill={isKey ? EYE_RED : SOFT}
              fontWeight={isKey ? 600 : 500}
            >
              {yr}
            </text>
          );
        })}
        <text x={0} y={-8} fill={SOFT}>
          YEAR
        </text>
      </g>

      {/* Vertical grid ticks */}
      {Array.from({ length: YEARS }, (_, i) => i + 1).map((yr) => {
        const gx = yearX(yr);
        const isKey = yr === 17 || yr === 34;
        return (
          <line
            key={yr}
            x1={gx}
            y1={0}
            x2={gx}
            y2={h}
            stroke={isKey ? EYE_RED : BRONZE}
            strokeOpacity={isKey ? 0.35 : 0.15}
            strokeWidth={isKey ? 1 : 0.6}
          />
        );
      })}

      {/* Cicada row (top) */}
      <g transform={`translate(0 ${rowH * 0.5})`}>
        <text
          x={leftPad - 18}
          y={4}
          textAnchor="end"
          fill={EYE_RED}
          fontFamily={inter}
          fontSize={12}
          fontWeight={600}
          letterSpacing={3}
        >
          MAGICICADA · 17-YR
        </text>
        {/* Base track */}
        <line
          x1={leftPad}
          y1={0}
          x2={leftPad + trackW}
          y2={0}
          stroke={EYE_RED}
          strokeOpacity={0.35}
          strokeWidth={1.2}
        />
        {/* Emergence markers at year 17 and 34 */}
        {[17, 34].map((yr) => {
          const lit = cursorYear >= yr - 0.02 ? 1 : 0;
          const px = yearX(yr);
          // Flip the tag inward so the year-34 label doesn't clip the frame.
          const tagRight = yr === 34;
          return (
            <g key={yr} opacity={lit}>
              <circle cx={px} cy={0} r={14} fill={EYE_RED} fillOpacity={0.16} />
              <circle
                cx={px}
                cy={0}
                r={8}
                fill={EYE_RED}
                stroke={CHALK}
                strokeWidth={1.4}
              />
              <text
                x={px + (tagRight ? -16 : 16)}
                y={4}
                textAnchor={tagRight ? "end" : "start"}
                fill={EYE_RED}
                fontFamily={inter}
                fontSize={10}
                fontWeight={700}
                letterSpacing={3}
              >
                EMERGE
              </text>
            </g>
          );
        })}
      </g>

      {/* Predator rows */}
      {CYCLES.map((c, i) => {
        const cy = rowH * (i + 1) + rowH * 0.5;
        const ticks: number[] = [];
        for (let yr = c.p; yr <= YEARS; yr += c.p) ticks.push(yr);
        return (
          <g key={c.p} transform={`translate(0 ${cy})`}>
            <text
              x={leftPad - 18}
              y={4}
              textAnchor="end"
              fill={SOFT}
              fontFamily={inter}
              fontSize={11}
              fontWeight={500}
              letterSpacing={3}
            >
              {c.label}
            </text>
            <line
              x1={leftPad}
              y1={0}
              x2={leftPad + trackW}
              y2={0}
              stroke={BRONZE}
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            {ticks.map((yr) => {
              const px = yearX(yr);
              const lit = cursorYear >= yr - 0.02 ? 1 : 0.18;
              // Highlight in red if this tick coincides with an emergence year
              const coincides = yr === 17 || yr === 34;
              const col = coincides ? EYE_RED : AMBER;
              return (
                <g key={yr} opacity={lit}>
                  <line
                    x1={px}
                    y1={-9}
                    x2={px}
                    y2={9}
                    stroke={col}
                    strokeWidth={coincides ? 2 : 1.4}
                  />
                  <circle cx={px} cy={0} r={2.4} fill={col} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Year cursor */}
      <g>
        <line
          x1={cursorX}
          y1={-6}
          x2={cursorX}
          y2={h + 6}
          stroke={CHALK}
          strokeOpacity={0.7}
          strokeWidth={1}
        />
        <polygon
          points={`${cursorX - 5},${h + 6} ${cursorX + 5},${h + 6} ${cursorX},${
            h + 14
          }`}
          fill={CHALK}
          opacity={0.85}
        />
      </g>

      {/* Bottom conclusion strip */}
      <g transform={`translate(0 ${h + 44})`}>
        <text
          x={0}
          y={0}
          fill={SOFT}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          NO PREDATOR CYCLE OF 2–6 YEARS DIVIDES 17 · PHASE-LOCK IMPOSSIBLE
        </text>
        <text
          x={w}
          y={0}
          textAnchor="end"
          fill={EYE_RED}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
        >
          GCD(17, k) = 1  ∀  k ∈ {"{2,3,4,5,6}"}
        </text>
      </g>
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ────────────────────────────────────────────────────────
  // 0.0s: header appears
  // 0.2s: cicada reveals
  // 1.4s: cursor sweeps across the proof (over ~3.2s)
  // 4.8s: settle; loop
  const cicadaReveal = spring({
    frame: frame - fps * 0.2,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const cursor = interpolate(
    frame,
    [fps * 1.4, fps * 4.6],
    [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(
    frame,
    [fps * 1.1, fps * 2.0],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Page layout (1080 × 1350 portrait)
  // Top band       : 56..80
  // Cicada + "17"  : ~120..640
  // Proof sheet    : ~660..900
  // Title lockup   : 940..
  // Footer         : 1290..
  const HDR_Y = 56;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Subtle chalkboard vignette + faint grid */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="board" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="#141210" />
            <stop offset="100%" stopColor={INK} />
          </radialGradient>
          <pattern
            id="chalkgrid"
            x={0}
            y={0}
            width={54}
            height={54}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 54 0 L 0 0 0 54"
              fill="none"
              stroke={BRONZE}
              strokeOpacity={0.09}
              strokeWidth={1}
            />
          </pattern>
        </defs>
        <rect x={0} y={0} width={1080} height={1350} fill="url(#board)" />
        <rect
          x={60}
          y={110}
          width={960}
          height={820}
          fill="url(#chalkgrid)"
        />
        {/* Frame around illustration + proof zone */}
        <rect
          x={60}
          y={110}
          width={960}
          height={820}
          fill="none"
          stroke={BRONZE}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        {/* Corner marks */}
        {(
          [
            [60, 110, 1, 1],
            [1020, 110, -1, 1],
            [60, 930, 1, -1],
            [1020, 930, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={AMBER} strokeWidth={1.6} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Large "17 · PRIME" numeral, left side */}
        <g transform="translate(120 300)" opacity={Math.min(1, cicadaReveal)}>
          <text
            x={0}
            y={0}
            fill={EYE_RED}
            fontFamily={playfair}
            fontStyle="italic"
            fontWeight={500}
            fontSize={340}
            letterSpacing={-6}
          >
            17
          </text>
          {/* Small tag beneath */}
          <g transform="translate(6 42)">
            <line
              x1={0}
              y1={0}
              x2={140}
              y2={0}
              stroke={EYE_RED}
              strokeWidth={1.4}
            />
            <text
              x={0}
              y={22}
              fill={EYE_RED}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={6}
            >
              PRIME · YEARS
            </text>
            <text
              x={0}
              y={44}
              fill={SOFT}
              fontFamily={inter}
              fontSize={11}
              fontWeight={500}
              letterSpacing={3}
            >
              UNDERGROUND NYMPHAL STAGE
            </text>
          </g>
        </g>

        {/* Cicada, right side */}
        <g transform="translate(490 130)">
          <Cicada reveal={cicadaReveal} />
          {/* Diagram callout to the eye — routed LEFT into the empty gap
              between the "17" numeral and the cicada, so it stays in-frame. */}
          <g
            opacity={Math.max(0, Math.min(1, (cicadaReveal - 0.7) * 3))}
            stroke={EYE_RED}
            fill="none"
            strokeWidth={1}
          >
            <line x1={218} y1={158} x2={140} y2={98} />
            <line x1={140} y1={98} x2={30} y2={98} />
            <text
              x={24}
              y={102}
              textAnchor="end"
              fill={EYE_RED}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
              stroke="none"
            >
              COMPOUND EYE
            </text>
          </g>
          {/* Diagram callout to the wing — routed RIGHT to safe margin. */}
          <g
            opacity={Math.max(0, Math.min(1, (cicadaReveal - 0.55) * 3))}
            stroke={AMBER}
            fill="none"
            strokeWidth={1}
          >
            <line x1={392} y1={220} x2={440} y2={166} />
            <line x1={440} y1={166} x2={528} y2={166} />
            <text
              x={528}
              y={158}
              textAnchor="end"
              fill={AMBER}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
              stroke="none"
            >
              AMBER WING VEIN
            </text>
          </g>
          {/* Species label — sits directly under the cicada. */}
          <text
            x={250}
            y={498}
            textAnchor="middle"
            fill={SOFT}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={22}
            fontWeight={500}
          >
            Magicicada septendecim
          </text>
          {/* Tiny hairline under species name */}
          <line
            x1={180}
            y1={510}
            x2={320}
            y2={510}
            stroke={SOFT}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
          <text
            x={250}
            y={528}
            textAnchor="middle"
            fill={SOFT}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.5}
            fontWeight={500}
          >
            EASTERN N. AMERICA · BROOD X
          </text>
        </g>

        {/* Proof-sheet section title */}
        <g opacity={Math.min(1, Math.max(0, cursor * 3))}>
          <text
            x={90}
            y={676}
            fill={AMBER}
            fontFamily={inter}
            fontSize={12}
            fontWeight={700}
            letterSpacing={5}
          >
            THE PROOF
          </text>
          <line
            x1={90}
            y1={688}
            x2={990}
            y2={688}
            stroke={AMBER}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          <text
            x={90}
            y={708}
            fill={SOFT}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            EMERGENCE (17 YR)  VS.  PREDATOR POPULATION CYCLES (2–6 YR)
          </text>
          <text
            x={990}
            y={708}
            textAnchor="end"
            fill={SOFT}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            YEARS 1 — 34
          </text>
        </g>

        {/* Proof sheet */}
        <g opacity={Math.min(1, Math.max(0, cursor + 0.1))}>
          <ProofSheet x={90} y={750} w={900} h={140} cursor={cursor} />
        </g>
      </svg>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: HDR_Y,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: SOFT,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: EYE_RED }}>2026 · 08 · 17</span>
      </div>

      {/* Title lockup */}
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
            color: EYE_RED,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: SOFT, margin: "0 6px" }}>/</span>
          <span style={{ color: CHALK, letterSpacing: 5 }}>
            Number Theorist
          </span>
        </div>

        <div
          style={{
            color: CHALK,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 92,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The insect that
          <br />
          counts in primes.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#CFC4A6",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Periodical cicadas (<em style={{ color: AMBER, fontStyle: "italic" }}>
            Magicicada
          </em>) surface every{" "}
          <span style={{ color: EYE_RED, fontWeight: 600 }}>13</span> or{" "}
          <span style={{ color: EYE_RED, fontWeight: 600 }}>17</span> years —
          both prime — so no predator with a 2-, 3-, 4-, 5- or 6-year cycle can
          ever phase-lock to the emergence.
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
          color: SOFT,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Yoshimura · Am. Nat. 149 (1997) 112–124</span>
        <span>
          <span style={{ color: EYE_RED }}>●</span> Prime-interval brood defence
        </span>
      </div>
    </AbsoluteFill>
  );
};
